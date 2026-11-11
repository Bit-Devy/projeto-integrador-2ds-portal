// mantém os registros de cada gestão separados por ano
import { tiposComAno, anoDoRegistro } from "../../conteudo/ciclos";
import { anoDoPortal } from "../../conteudo/periodos";
// importa o acesso direto ao banco
import { getD1 } from "../../../db";
// importa a preparação das tabelas
import { garantirBanco } from "../../../db/inicializar";
// importa os tipos de conteúdo
import type { TipoConteudo } from "../../conteudo/tipos";
// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { ErroJsonInvalido, lerObjetoJson } from "../../lib/corpo-json";
// valida os botões e protege os documentos que têm uma versão central
import { paginasPublicadas, caminhoInterno } from "../../conteudo/paginas";

// importa o arquivo do painel e a confirmação de senha
import { consultarNoticiasPainel, prepararNoticia } from "../../conteudo/noticias-gestao";
import { validarArquivosDoCargo } from "../../arquivos/acesso";
import { areaRestrita, recursoConteudo } from "../../lib/cargos";
import { areaPermitida, escolherArea, erroArea } from "../../lib/areas-registros";
import { obterUsuarioPainel } from "../../lib/sessao";
import { validarSenhaAdministrativa } from "../../lib/sessao";
import { consumirTentativa, identificarNavegador, guardarNavegador, limparTentativasLogin } from "../../lib/limites";
// mantém as vagas publicadas da equipe ligadas aos cargos do estatuto
import { condicaoVagaLivre, prepararMembroEquipe } from "../../conteudo/equipe";
// valida e protege as publicações das páginas modulares
import { validarServico } from "../../servicos/validacao";
import { moduloAtivo, obterModulos } from "../../servicos/banco";
import type { ModuloPortal } from "../../servicos/tipos";

// lista os tipos aceitos pela api
const tiposPermitidos: TipoConteudo[] = [
  "agenda", "cardapios", "oportunidades",
  "membros",
  "eventos",
  "noticias",
  "projetos",
  "documentos",
  "movimentos",
  "canais",
];

// lista os campos obrigatórios de cada tipo
const camposObrigatorios: Record<TipoConteudo, string[]> = {
  agenda: ["titulo", "data", "modalidade", "descricao"],
  cardapios: ["titulo", "data", "categoria", "turno", "descricao"],
  oportunidades: ["titulo", "categoria", "organizacao", "local", "escolaridade", "requisitos", "descricao", "data", "situacao", "link", "fonte"],
  membros: ["nome", "diretoria"],
  eventos: ["titulo", "data", "horario", "local", "categoria", "descricao"],
  noticias: ["titulo", "data", "categoria", "resumo"],
  projetos: ["titulo", "categoria", "estado", "texto"],
  documentos: ["titulo", "categoria", "tipo", "texto", "link"],
  movimentos: ["descricao", "data", "tipo", "categoria", "valor"],
  canais: ["titulo", "descricao", "link"],
};

// define o formato de uma linha de conteúdo do banco
type LinhaConteudo = {
  id: number;
  tipo: TipoConteudo;
  titulo: string;
  dados_json: string;
  publicado: number;
  criado_em: string;
  atualizado_em: string;
};

// lista os conteúdos de um tipo
export async function GET(request: Request) {
  try {
    // prepara o banco e lê os parâmetros da busca
    await garantirBanco();
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo") as TipoConteudo | null;
    const mostrarTodos = url.searchParams.get("todos") === "1";

    // valida o tipo solicitado
    if (!tipo || !tiposPermitidos.includes(tipo)) {
      return Response.json({ erro: "Tipo de conteúdo inválido." }, { status: 400 });
    }

    // exige administrador para mostrar rascunhos
    if (mostrarTodos) {
      const { acesso, resposta } = await exigirAdministradorApi(recursoConteudo(tipo), false);
      if (resposta) return resposta;
      const area = areaRestrita(acesso.usuario!.cargo);
      if (area) url.searchParams.set("areaResponsavel", area);
      else url.searchParams.delete("areaResponsavel");
    }

    if (tipo === "noticias" && mostrarTodos && url.searchParams.has("visao")) {
      const resultado = await consultarNoticiasPainel(url.searchParams);
      return Response.json({ itens: resultado.linhas.map((linha) => formatarLinha(linha as LinhaConteudo)), pagina: resultado.pagina, total: resultado.total }, { headers: { "cache-control": "private, no-store" } });
    }

    // monta a consulta pública ou privada
    const area = mostrarTodos && ["noticias", "projetos", "documentos", "eventos", "agenda", "cardapios", "oportunidades"].includes(tipo) ? url.searchParams.get("areaResponsavel") : null;
    const filtro = mostrarTodos
      ? "SELECT * FROM conteudos WHERE tipo = ?"
      : "SELECT * FROM conteudos WHERE tipo = ? AND publicado = 1";
    // executa a consulta com o tipo informado
    const anoRecebido = url.searchParams.get("ano") || (!mostrarTodos && tiposComAno.includes(tipo) ? String(anoDoPortal()) : null);
    const ano = anoRecebido === "todos" ? null : anoRecebido;
    if (ano && ano !== "todos" && !/^(19|20|21)\d{2}$/.test(ano)) throw new Error("Informe um ano válido.");
    // usa a data da publicação para consultar um ano sem apagar o histórico
    const colunaAno = ["projetos", "membros"].includes(tipo) ? "CAST(COALESCE(json_extract(dados_json, '$.ano'), substr(criado_em, 1, 4)) AS TEXT)" : "substr(COALESCE(NULLIF(json_extract(dados_json, '$.data'), ''), json_extract(dados_json, '$.dataDocumento')), 1, 4)";
    const consulta = `${filtro}${area ? " AND json_extract(dados_json, '$.areaResponsavel') = ?" : ""}${ano ? ` AND ${colunaAno} = ?` : ""} ${ordemMaisRecente}`;
    const resultado = await getD1().prepare(consulta).bind(tipo, ...(area ? [area] : []), ...(ano ? [ano] : [])).all<LinhaConteudo>();

    let itens = resultado.results.map(formatarLinha);
    if (!mostrarTodos && ["agenda", "cardapios", "oportunidades"].includes(tipo)) {
      const modulos = await obterModulos();
      const modulo = ({ agenda: "calendario", cardapios: "cantina", oportunidades: "estagios" } as const)[tipo as "agenda" | "cardapios" | "oportunidades"];
      if (!moduloAtivo(modulos, modulo)) return Response.json({ erro: "Esta página está desativada." }, { status: 404 });
      if (tipo === "cardapios") itens = itens.filter((item) => moduloAtivo(modulos, String(item.dados.categoria) as ModuloPortal));
      if (tipo === "agenda") {
        const destinos = new Set((await paginasPublicadas()).map((pagina) => pagina.url));
        itens = itens.map((item) => ({ ...item, dados: { ...item.dados, paginaUrl: destinos.has(String(item.dados.paginaUrl)) ? item.dados.paginaUrl : "" } }));
      }
    }
    return Response.json({ itens }, { headers: { "cache-control": "no-store" } });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// cria um novo conteúdo
export async function POST(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = await obterUsuarioPainel();
  if (!usuario) return Response.json({ erro: "Entre no painel para realizar esta ação." }, { status: 401 });

  try {
    // prepara e valida os dados recebidos
    await garantirBanco();
    const corpo = await lerCorpo(request);
    const { resposta: bloqueio } = await exigirAdministradorApi(recursoConteudo(corpo.tipo));
    if (bloqueio) return bloqueio;
    corpo.dados.areaResponsavel = escolherArea(usuario, corpo.dados.areaResponsavel);
    await validarArquivosDoCargo(corpo.dados, usuario);
    if (corpo.tipo === "noticias") prepararNoticia(corpo.dados, corpo.publicado);
    if (corpo.tipo === "membros") await prepararMembroEquipe(corpo.dados, corpo.publicado);
    if (corpo.publicado) await validarBotoes(corpo.tipo, corpo.dados);
    if (corpo.tipo === "documentos" && corpo.dados.documentoOficial) throw new ErroJsonInvalido("Use a aba Estatuto e Regimento para alterar os PDFs oficiais.");
    const titulo = obterTitulo(corpo.tipo, corpo.dados);
    // salva o conteúdo e devolve a linha criada
    const resultado = await getD1()
      .prepare(`INSERT INTO conteudos (tipo, titulo, dados_json, publicado) SELECT ?, ?, ?, ? WHERE ${condicaoVagaLivre} RETURNING *`)
      .bind(corpo.tipo, titulo, JSON.stringify(corpo.dados), corpo.publicado ? 1 : 0, corpo.tipo, corpo.publicado ? 1 : 0, JSON.stringify(corpo.dados), -1, JSON.stringify(corpo.dados), JSON.stringify(corpo.dados), JSON.stringify(corpo.dados))
      .first<LinhaConteudo>();

    if (!resultado) throw new ErroJsonInvalido("A vaga mudou durante o salvamento. Recarregue a Equipe e confira quem está publicado.");
    return Response.json({ item: resultado ? formatarLinha(resultado) : null }, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// atualiza um conteúdo existente
export async function PUT(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = await obterUsuarioPainel();
  if (!usuario) return Response.json({ erro: "Entre no painel para realizar esta ação." }, { status: 401 });

  try {
    // prepara o banco e lê o identificador
    await garantirBanco();
    const dadosRecebidos = await lerObjetoJson(request);
    const id = Number(dadosRecebidos.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Registro inválido.");
    // valida o restante do conteúdo
    const corpo = validarCorpo(dadosRecebidos);
    const anterior = await getD1().prepare("SELECT * FROM conteudos WHERE id = ?").bind(id).first<LinhaConteudo>();
    const { resposta: bloqueio } = await exigirAdministradorApi(recursoConteudo(corpo.tipo));
    if (bloqueio) return bloqueio;
    const areaAnterior = anterior ? JSON.parse(anterior.dados_json).areaResponsavel || "geral" : "geral";
    if (anterior && corpo.tipo !== "movimentos" && !areaPermitida(usuario, areaAnterior)) return erroArea();
    corpo.dados.areaResponsavel = escolherArea(usuario, corpo.dados.areaResponsavel, areaAnterior);
    await validarArquivosDoCargo(corpo.dados, usuario);
    if (anterior && anterior.tipo !== corpo.tipo) throw new ErroJsonInvalido("Não é possível mudar o tipo deste registro.");
    if (corpo.tipo === "noticias") prepararNoticia(corpo.dados, corpo.publicado, anterior || undefined);
    if (corpo.tipo === "membros") await prepararMembroEquipe(corpo.dados, corpo.publicado, id);
    await protegerDocumentoOficial(id);
    if (corpo.publicado) await validarBotoes(corpo.tipo, corpo.dados);
    if (corpo.tipo === "documentos" && corpo.dados.documentoOficial) throw new ErroJsonInvalido("Use a aba Estatuto e Regimento para alterar os PDFs oficiais.");
    const titulo = obterTitulo(corpo.tipo, corpo.dados);
    // atualiza o registro e sua data de alteração
    const resultado = await getD1()
      .prepare(`UPDATE conteudos
        SET tipo = ?, titulo = ?, dados_json = CASE WHEN tipo = 'noticias' THEN
          json_set(?, '$.jaPublicada', json(CASE WHEN publicado = 1 OR json_extract(dados_json, '$.jaPublicada') = 1 OR ? = 1 THEN 'true' ELSE 'false' END)) ELSE ? END,
          publicado = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ? AND ${condicaoVagaLivre} RETURNING *`)
      .bind(corpo.tipo, titulo, JSON.stringify(corpo.dados), corpo.publicado ? 1 : 0, JSON.stringify(corpo.dados), corpo.publicado ? 1 : 0, id, corpo.tipo, corpo.publicado ? 1 : 0, JSON.stringify(corpo.dados), id, JSON.stringify(corpo.dados), JSON.stringify(corpo.dados), JSON.stringify(corpo.dados))
      .first<LinhaConteudo>();

    // informa quando o registro não existe
    if (!resultado) return Response.json({ erro: anterior ? "A vaga mudou durante o salvamento. Recarregue a Equipe e confira quem está publicado." : "Registro não encontrado." }, { status: anterior ? 409 : 404 });
    return Response.json({ item: formatarLinha(resultado) });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// exclui um conteúdo
export async function DELETE(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = await obterUsuarioPainel();
  if (!usuario) return Response.json({ erro: "Entre no painel para realizar esta ação." }, { status: 401 });

  try {
    // prepara o banco e valida o identificador
    await garantirBanco();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("Registro inválido.");
    // exige novamente a senha se a notícia já passou pelo portal
    let senhaConfirmada = false;
    const registro = await getD1().prepare("SELECT * FROM conteudos WHERE id = ?").bind(id).first<LinhaConteudo>();
    if (registro) {
      const { resposta: bloqueio } = await exigirAdministradorApi(recursoConteudo(registro.tipo));
      if (bloqueio) return bloqueio;
      if (registro.tipo !== "movimentos" && !areaPermitida(usuario, JSON.parse(registro.dados_json).areaResponsavel || "geral")) return erroArea();
    }
    if (registro?.tipo === "noticias" && (registro.publicado || JSON.parse(registro.dados_json).jaPublicada)) {
      const corpo = await lerObjetoJson(request);
      const navegador = identificarNavegador(request);
      const tentativa = await consumirTentativa("login", navegador);
      if (!tentativa.permitido) return guardarNavegador(Response.json({ erro: "Aguarde antes de tentar confirmar a senha novamente." }, { status: 429 }), request, navegador);
      if (!await validarSenhaAdministrativa(String(corpo.senha || ""))) return guardarNavegador(Response.json({ erro: "Senha incorreta. A notícia foi mantida." }, { status: 403 }), request, navegador);
      await limparTentativasLogin(navegador);
      senhaConfirmada = true;
    }
    // remove o registro pelo identificador
    await protegerDocumentoOficial(id);
    const removido = await getD1().prepare("DELETE FROM conteudos WHERE id = ? AND (tipo <> 'noticias' OR (publicado = 0 AND COALESCE(json_extract(dados_json, '$.jaPublicada'), 0) = 0) OR ? = 1)").bind(id, senhaConfirmada ? 1 : 0).run();
    if (registro && !removido.meta.changes) return Response.json({ erro: "A notícia mudou durante a operação. Recarregue e confirme a exclusão novamente." }, { status: 409 });
    return Response.json({ removido: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// impede alterações paralelas que deixariam o leitor com um pdf diferente
async function protegerDocumentoOficial(id: number) {
  const oficial = await getD1().prepare("SELECT id FROM conteudos WHERE id = ? AND tipo = 'documentos' AND json_extract(dados_json, '$.documentoOficial') IS NOT NULL").bind(id).first();
  if (oficial) throw new ErroJsonInvalido("Use a aba Estatuto e Regimento para atualizar este documento.");
}

// confere os endereços antes de publicar os botões opcionais
async function validarBotoes(tipo: TipoConteudo, dados: Record<string, unknown>) {
  if (tipo === "agenda" && dados.paginaUrl && !(await paginasPublicadas()).some((pagina) => pagina.url === dados.paginaUrl)) throw new ErroJsonInvalido("Escolha uma página ou jogo que exista e esteja publicado no portal.");
  if (tipo !== "noticias") return;
  if (dados.botaoInternoAtivo) {
    const endereco = caminhoInterno(String(dados.botaoInternoUrl || ""));
    if (!endereco || !(await paginasPublicadas()).some((pagina) => pagina.url === `${endereco.pathname}${endereco.hash}`)) throw new ErroJsonInvalido("Escolha uma página pública válida para o botão do portal.");
  }
  if (dados.botaoExternoAtivo && !/^https?:\/\//.test(String(dados.botaoExternoUrl || ""))) throw new ErroJsonInvalido("Informe um endereço completo para o botão externo.");
}

// lê e valida o corpo da chamada
async function lerCorpo(request: Request) {
  // converte o json em objeto antes da validação
  return validarCorpo(await lerObjetoJson(request));
}

// valida os dados de um conteúdo
function validarCorpo(corpo: Record<string, unknown>) {
  // confirma o tipo e o formato dos dados
  const tipo = corpo.tipo as TipoConteudo;
  if (!tiposPermitidos.includes(tipo)) throw new Error("Tipo de conteúdo inválido.");
  if (!corpo.dados || typeof corpo.dados !== "object" || Array.isArray(corpo.dados)) {
    throw new Error("Preencha os dados do registro.");
  }

  // limpa os campos e encontra o título principal
  const dados = limparObjeto(corpo.dados as Record<string, unknown>);
  if (tipo === "agenda" && String((corpo.dados as Record<string, unknown>).paginaUrl || "").trim() && !dados.paginaUrl) throw new ErroJsonInvalido("Escolha um endereço interno válido para o compromisso.");
  validarServico(tipo, dados);
  if (tiposComAno.includes(tipo)) { if (dados.ano !== undefined && dados.ano !== "" && (!Number.isInteger(Number(dados.ano)) || Number(dados.ano) < 1900 || Number(dados.ano) > 2199)) throw new ErroJsonInvalido("Informe um ano válido."); dados.ano = anoDoRegistro(dados); }
  const titulo = obterTitulo(tipo, dados);
  if (!titulo || titulo.length > 180) throw new Error("Informe um título válido.");

  // encontra os campos obrigatórios vazios
  const rascunhoNoticia = tipo === "noticias" && corpo.publicado === false;
  if (rascunhoNoticia && !dados.data) dados.data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const ausentes = (rascunhoNoticia ? ["titulo"] : camposObrigatorios[tipo]).filter((campo) => dados[campo] === "" || dados[campo] === undefined || dados[campo] === null);
  if (ausentes.length) throw new Error(`Preencha os campos obrigatórios: ${ausentes.join(", ")}.`);
  if (["noticias", "movimentos", "eventos"].includes(tipo) || (tipo === "documentos" && dados.dataDocumento)) {
    const data = String(tipo === "documentos" ? dados.dataDocumento : dados.data);
    const instante = new Date(`${data}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(instante.getTime()) || instante.toISOString().slice(0, 10) !== data) {
      throw new Error("Informe uma data válida para a publicação.");
    }
  }
  // valida os dados próprios das movimentações
  if (tipo === "movimentos") {
    // impede que o antigo aviso seja ativado por uma chamada direta
    if (dados.exemplo) throw new Error("Campo exemplo inválido para movimentações.");
    delete dados.exemplo;
    if (!["entrada", "saida"].includes(String(dados.tipo))) throw new Error("Escolha entrada ou saída.");
    if (!Number.isFinite(Number(dados.valor)) || Number(dados.valor) < 0) throw new Error("Informe um valor válido.");
  }
  if (tipo === "noticias" && !rascunhoNoticia && dados.imagemUrl && (!dados.imagemAlt || !dados.creditoImagem)) {
    throw new Error("Informe a descrição e o crédito da imagem.");
  }

  // devolve somente os dados aceitos
  return {
    tipo,
    dados,
    publicado: corpo.publicado !== false,
  };
}

// limpa os valores enviados no objeto
function limparObjeto(objeto: Record<string, unknown>) {
  // percorre cada campo e mantém somente valores simples
  return Object.fromEntries(
    Object.entries(objeto).map(([chave, valor]) => {
      if (typeof valor === "string") {
        // limita textos e protege campos de endereço
        const texto = valor.trim().slice(0, 12000);
        if (/url|link|contato/i.test(chave)) return [chave, limparLink(texto)];
        return [chave, texto];
      }
      if (typeof valor === "number" || typeof valor === "boolean") return [chave, valor];
      return [chave, ""];
    }),
  );
}

// aceita somente links internos ou endereços web
function limparLink(link: string) {
  if (!link) return "";
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  try {
    // verifica se o protocolo do endereço é permitido
    const url = new URL(link);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

// escolhe o campo usado como título
function obterTitulo(tipo: TipoConteudo, dados: Record<string, unknown>) {
  if (tipo === "membros") return String(dados.nome ?? "").trim();
  if (tipo === "movimentos") return String(dados.descricao ?? "").trim();
  return String(dados.titulo ?? "").trim();
}

// transforma uma linha do banco em resposta da api
function formatarLinha(linha: LinhaConteudo) {
  // tenta recuperar os dados guardados em json
  let dados: Record<string, unknown> = {};
  try {
    dados = JSON.parse(linha.dados_json) as Record<string, unknown>;
  } catch {
    dados = {};
  }
  if (tiposComAno.includes(linha.tipo)) dados.ano = anoDoRegistro(dados, linha.criado_em);
  // retira a opção antiga também dos registros já existentes
  if (linha.tipo === "movimentos") delete dados.exemplo;
  // muda os nomes dos campos para o formato do portal
  return {
    id: linha.id,
    tipo: linha.tipo,
    ano: anoDoRegistro(dados, linha.criado_em),
    arquivadoAno: tiposComAno.includes(linha.tipo) && anoDoRegistro(dados, linha.criado_em) !== anoDoPortal(),
    titulo: linha.titulo,
    dados,
    publicado: Boolean(linha.publicado),
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

// ordena pela data do conteúdo ou pela data de criação
const ordemMaisRecente = `ORDER BY COALESCE(
  NULLIF(json_extract(dados_json, '$.data'), ''),
  NULLIF(json_extract(dados_json, '$.dataDocumento'), ''),
  criado_em
) DESC, criado_em DESC, id DESC`;

// transforma erros em respostas da api
function respostaErro(erro: unknown) {
  if (erro instanceof ErroJsonInvalido) return Response.json({ erro: erro.message }, { status: 400 });
  // usa erro de entrada ou erro interno conforme a mensagem
  const mensagem = erro instanceof Error ? erro.message : "Não foi possível concluir a operação.";
  const status = /inválid|informe|preencha/i.test(mensagem) ? 400 : 500;
  if (status === 500) {
    console.error("Erro na API de conteúdo:", erro);
    return Response.json({ erro: "Não foi possível concluir a operação de conteúdo." }, { status });
  }
  return Response.json({ erro: mensagem }, { status });
}
