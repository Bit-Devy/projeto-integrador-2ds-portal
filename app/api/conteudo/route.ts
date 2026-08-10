// importa o acesso direto ao banco
import { getD1 } from "../../../db";
// importa a preparação das tabelas
import { garantirBanco } from "../../../db/inicializar";
// importa os tipos de conteúdo
import type { TipoConteudo } from "../../conteudo/tipos";
// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";

// lista os tipos aceitos pela api
const tiposPermitidos: TipoConteudo[] = [
  "membros",
  "eventos",
  "noticias",
  "projetos",
  "documentos",
  "movimentos",
];

// lista os campos obrigatórios de cada tipo
const camposObrigatorios: Record<TipoConteudo, string[]> = {
  membros: ["nome", "cargo", "diretoria"],
  eventos: ["titulo", "data", "horario", "local", "categoria", "descricao"],
  noticias: ["titulo", "data", "categoria", "resumo"],
  projetos: ["titulo", "categoria", "estado", "texto"],
  documentos: ["titulo", "categoria", "tipo", "texto", "link"],
  movimentos: ["descricao", "data", "tipo", "categoria", "valor"],
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
      const { resposta } = await exigirAdministradorApi();
      if (resposta) return resposta;
    }

    // monta a consulta pública ou privada
    const filtro = mostrarTodos
      ? "SELECT * FROM conteudos WHERE tipo = ?"
      : "SELECT * FROM conteudos WHERE tipo = ? AND publicado = 1";
    // executa a consulta com o tipo informado
    const consulta = `${filtro} ${ordemMaisRecente}`;
    const resultado = await getD1().prepare(consulta).bind(tipo).all<LinhaConteudo>();

    return Response.json({ itens: resultado.results.map(formatarLinha) });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// cria um novo conteúdo
export async function POST(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara e valida os dados recebidos
    await garantirBanco();
    const corpo = await lerCorpo(request);
    const titulo = obterTitulo(corpo.tipo, corpo.dados);
    // salva o conteúdo e devolve a linha criada
    const resultado = await getD1()
      .prepare("INSERT INTO conteudos (tipo, titulo, dados_json, publicado) VALUES (?, ?, ?, ?) RETURNING *")
      .bind(corpo.tipo, titulo, JSON.stringify(corpo.dados), corpo.publicado ? 1 : 0)
      .first<LinhaConteudo>();

    return Response.json({ item: resultado ? formatarLinha(resultado) : null }, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// atualiza um conteúdo existente
export async function PUT(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara o banco e lê o identificador
    await garantirBanco();
    const dadosRecebidos = await request.json() as Record<string, unknown>;
    const id = Number(dadosRecebidos.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Registro inválido.");
    // valida o restante do conteúdo
    const corpo = validarCorpo(dadosRecebidos);
    const titulo = obterTitulo(corpo.tipo, corpo.dados);
    // atualiza o registro e sua data de alteração
    const resultado = await getD1()
      .prepare(`UPDATE conteudos
        SET tipo = ?, titulo = ?, dados_json = ?, publicado = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ? RETURNING *`)
      .bind(corpo.tipo, titulo, JSON.stringify(corpo.dados), corpo.publicado ? 1 : 0, id)
      .first<LinhaConteudo>();

    // informa quando o registro não existe
    if (!resultado) return Response.json({ erro: "Registro não encontrado." }, { status: 404 });
    return Response.json({ item: formatarLinha(resultado) });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// exclui um conteúdo
export async function DELETE(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara o banco e valida o identificador
    await garantirBanco();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("Registro inválido.");
    // remove o registro pelo identificador
    await getD1().prepare("DELETE FROM conteudos WHERE id = ?").bind(id).run();
    return Response.json({ removido: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// lê e valida o corpo da chamada
async function lerCorpo(request: Request) {
  // converte o json em objeto antes da validação
  return validarCorpo(await request.json() as Record<string, unknown>);
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
  const titulo = obterTitulo(tipo, dados);
  if (!titulo || titulo.length > 180) throw new Error("Informe um título válido.");

  // encontra os campos obrigatórios vazios
  const ausentes = camposObrigatorios[tipo].filter((campo) => dados[campo] === "" || dados[campo] === undefined || dados[campo] === null);
  if (ausentes.length) throw new Error(`Preencha os campos obrigatórios: ${ausentes.join(", ")}.`);
  // valida os dados próprios das movimentações
  if (tipo === "movimentos") {
    if (!["entrada", "saida"].includes(String(dados.tipo))) throw new Error("Escolha entrada ou saída.");
    if (!Number.isFinite(Number(dados.valor)) || Number(dados.valor) < 0) throw new Error("Informe um valor válido.");
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
  // muda os nomes dos campos para o formato do portal
  return {
    id: linha.id,
    tipo: linha.tipo,
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
  // usa erro de entrada ou erro interno conforme a mensagem
  const mensagem = erro instanceof Error ? erro.message : "Não foi possível concluir a operação.";
  const status = /inválid|informe|preencha/i.test(mensagem) ? 400 : 500;
  if (status === 500) {
    console.error("Erro na API de conteúdo:", erro);
    return Response.json({ erro: "Não foi possível concluir a operação de conteúdo." }, { status });
  }
  return Response.json({ erro: mensagem }, { status });
}
