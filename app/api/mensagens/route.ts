// importa o acesso direto ao banco
import { getD1 } from "../../../db";
// importa a preparação das tabelas
import { garantirBanco } from "../../../db/inicializar";
// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";

// define o formato de uma mensagem no banco
type LinhaMensagem = {
  id: number;
  nome: string;
  turma: string;
  assunto: string;
  titulo: string;
  mensagem: string;
  tipo_contato: string | null;
  contato: string | null;
  anonimo: number;
  status: string;
  criado_em: string;
};

// define os estados contatos e tamanho da página
const estados = ["nova", "em_analise", "respondida", "arquivada"];
const tiposContato = ["whatsapp", "telefone", "email", "instagram", "outro"];
const mensagensPorPagina = 6;

// lista as mensagens para o painel
export async function GET(request: Request) {
  // exige um administrador conectado
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara o banco e lê os filtros
    await garantirBanco();
    const parametrosUrl = new URL(request.url).searchParams;
    const arquivadas = parametrosUrl.get("arquivadas") === "1";
    const busca = normalizarBusca(parametrosUrl.get("busca"));
    const paginaSolicitada = inteiroPositivo(parametrosUrl.get("pagina"));
    // cria a condição de mensagens arquivadas ou ativas
    const condicoes = [arquivadas ? "status = 'arquivada'" : "status <> 'arquivada'"];
    const parametros: string[] = [];

    // adiciona a busca por protocolo
    if (busca) {
      condicoes.push("UPPER('GECEP-' || substr(criado_em, 1, 4) || '-' || printf('%05d', id)) LIKE ?");
      parametros.push(`%${busca}%`);
    }

    // conta o total de mensagens encontradas
    const d1 = getD1();
    const onde = condicoes.join(" AND ");
    const consultaTotal = d1.prepare(`SELECT COUNT(*) AS total FROM mensagens WHERE ${onde}`);
    const registroTotal = parametros.length
      ? await consultaTotal.bind(...parametros).first<{ total: number }>()
      : await consultaTotal.first<{ total: number }>();
    // calcula os dados da página atual
    const total = Number(registroTotal?.total ?? 0);
    const totalPaginas = Math.max(1, Math.ceil(total / mensagensPorPagina));
    const pagina = Math.min(paginaSolicitada, totalPaginas);
    const deslocamento = (pagina - 1) * mensagensPorPagina;

    // busca somente as mensagens da página
    const resultado = await d1
      .prepare(`SELECT * FROM mensagens WHERE ${onde} ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...parametros, mensagensPorPagina, deslocamento)
      .all<LinhaMensagem>();
    return Response.json({
      mensagens: resultado.results.map(formatarMensagem),
      pagina,
      total,
      totalPaginas,
      porPagina: mensagensPorPagina,
    });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// recebe uma nova mensagem de participação
export async function POST(request: Request) {
  // bloqueia chamadas de outra origem
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });

  try {
    // prepara o banco e lê o corpo recebido
    await garantirBanco();
    const corpo = await request.json() as Record<string, unknown>;

    // campo escondido para bloquear robôs simples
    if (String(corpo.site ?? "").trim()) return new Response(null, { status: 204 });

    // limpa e limita todos os campos
    const nome = texto(corpo.nome, 100);
    const turma = texto(corpo.turma, 60);
    const assunto = texto(corpo.assunto, 80);
    const titulo = texto(corpo.titulo, 160);
    const mensagem = texto(corpo.mensagem, 5000);
    const tipoContato = texto(corpo.tipoContato, 20).toLowerCase();
    const contato = texto(corpo.contato, 200);
    const anonimo = corpo.anonimo === true;

    // confirma os campos obrigatórios
    if (!nome || !turma || !assunto || !titulo || mensagem.length < 10) {
      return Response.json({ erro: "Preencha todos os campos e detalhe um pouco mais a mensagem." }, { status: 400 });
    }

    // valida o contato opcional
    const erroContato = validarContato(tipoContato, contato);
    if (erroContato) return Response.json({ erro: erroContato }, { status: 400 });

    // salva a mensagem e devolve seu protocolo
    const resultado = await getD1()
      .prepare(`INSERT INTO mensagens (nome, turma, assunto, titulo, mensagem, tipo_contato, contato, anonimo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, criado_em`)
      .bind(nome, turma, assunto, titulo, mensagem, tipoContato || null, contato || null, anonimo ? 1 : 0)
      .first<{ id: number; criado_em: string }>();

    const protocolo = formatarProtocolo(resultado?.id ?? 0, resultado?.criado_em);
    return Response.json({ enviado: true, protocolo, criadoEm: resultado?.criado_em }, { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// altera o estado de uma mensagem
export async function PUT(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara o banco e lê os dados recebidos
    await garantirBanco();
    const corpo = await request.json() as { id?: number; status?: string };
    // valida o identificador e o novo estado
    const id = Number(corpo.id);
    const status = String(corpo.status ?? "");
    if (!Number.isInteger(id) || !estados.includes(status)) {
      return Response.json({ erro: "Dados inválidos." }, { status: 400 });
    }
    // atualiza o estado da mensagem
    await getD1().prepare("UPDATE mensagens SET status = ? WHERE id = ?").bind(status, id).run();
    return Response.json({ atualizado: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// exclui uma mensagem
export async function DELETE(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  try {
    // prepara o banco e valida o identificador
    await garantirBanco();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ erro: "Mensagem inválida." }, { status: 400 });
    // remove a mensagem pelo identificador
    await getD1().prepare("DELETE FROM mensagens WHERE id = ?").bind(id).run();
    return Response.json({ removido: true });
  } catch (erro) {
    return respostaErro(erro);
  }
}

// transforma um valor em texto curto
function texto(valor: unknown, limite: number) {
  return String(valor ?? "").trim().slice(0, limite);
}

// transforma uma linha do banco em resposta da api
function formatarMensagem(linha: LinhaMensagem) {
  return {
    id: linha.id,
    nome: linha.nome,
    turma: linha.turma,
    assunto: linha.assunto,
    titulo: linha.titulo,
    mensagem: linha.mensagem,
    protocolo: formatarProtocolo(linha.id, linha.criado_em),
    tipoContato: linha.tipo_contato ?? "",
    contato: linha.contato ?? "",
    anonimo: Boolean(linha.anonimo),
    status: linha.status,
    criadoEm: linha.criado_em,
  };
}

// cria o protocolo com ano e identificador
function formatarProtocolo(id: number, criadoEm?: string) {
  const anoCriacao = criadoEm?.match(/^\d{4}/)?.[0];
  const ano = anoCriacao ?? String(new Date().getFullYear());
  return `GECEP-${ano}-${String(id).padStart(5, "0")}`;
}

// limpa o texto usado para buscar um protocolo
function normalizarBusca(valor: string | null) {
  // mantém somente letras números e traços
  return String(valor ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

// transforma a página recebida em número positivo
function inteiroPositivo(valor: string | null) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

// valida o meio de contato informado
function validarContato(tipo: string, contato: string) {
  if (!tipo && !contato) return "";
  if (!tiposContato.includes(tipo)) return "Escolha um tipo de contato válido.";
  if (!contato) return "Informe o meio de contato ou selecione “Não informar”.";

  // valida o formato de cada tipo de contato
  if (tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    return "Informe um endereço de e-mail válido.";
  }
  if ((tipo === "whatsapp" || tipo === "telefone") && !/^\d{10,11}$/.test(contato.replace(/\D/g, ""))) {
    return "Informe um telefone com DDD e 10 ou 11 dígitos.";
  }
  if (tipo === "instagram" && !/^@[A-Za-z0-9._]{1,30}$/.test(contato)) {
    return "Informe um usuário válido do Instagram, como @usuario.";
  }
  return "";
}

// transforma erros em respostas da api
function respostaErro(erro: unknown) {
  console.error("Erro na API de mensagens:", erro);
  return Response.json({ erro: "Não foi possível concluir a operação." }, { status: 500 });
}
