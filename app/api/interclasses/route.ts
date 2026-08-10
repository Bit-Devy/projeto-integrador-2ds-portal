import {
  arquivarCampeonato,
  arquivarAtualizacaoCampeonato,
  arquivarDocumentoCampeonato,
  arquivarFaseCampeonato,
  arquivarParticipanteCampeonato,
  arquivarPartidaCampeonato,
  atualizarCampeonato,
  atualizarAtualizacaoCampeonato,
  atualizarDocumentoCampeonato,
  atualizarFaseCampeonato,
  atualizarParticipanteCampeonato,
  atualizarPartidaCampeonato,
  criarAtualizacaoCampeonato,
  criarCampeonato,
  criarDocumentoCampeonato,
  criarFaseCampeonato,
  criarParticipanteCampeonato,
  criarPartidaCampeonato,
  definirCampeaoCampeonato,
  duplicarCampeonato,
  gerarChaveCampeonato,
  listarCampeonatos,
  obterCampeonato,
  obterDocumentoParaSincronizacao,
  registrarResultadoPartida,
} from "../../eventos/banco";
import { booleano, dadosDoCorpo, ErroEventos, objetoRecebido } from "../../eventos/validacao";
import {
  lerObjeto,
  prepararEscrita,
  prepararLeitura,
  responderErroEventos,
  sincronizarArquivosDoEvento,
  sincronizarVisibilidadeArquivo,
} from "../eventos/apoio";

export async function GET(request: Request) {
  try {
    const { parametros, todos, bloqueio } = await prepararLeitura(request);
    if (bloqueio) return bloqueio;
    return Response.json(await listarCampeonatos(parametros, todos), {
      headers: { "cache-control": todos ? "private, no-store" : "public, max-age=30" },
    });
  } catch (erro) {
    return responderErroEventos(erro, "GET /api/interclasses");
  }
}

export async function POST(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.acao === "duplicar") {
      const item = await duplicarCampeonato(corpo.id);
      await sincronizarArquivosDoEvento(item.item, { documentos: item.documentos });
      return Response.json({ item }, { status: 201 });
    }
    const entidade = String(corpo.entidade ?? "");
    const campeonatoId = corpo.campeonatoId ?? corpo.id;
    if (entidade === "participantes") return Response.json({ item: await criarParticipanteCampeonato(campeonatoId, corpo.dados) }, { status: 201 });
    if (entidade === "fases") return Response.json({ item: await criarFaseCampeonato(campeonatoId, corpo.dados) }, { status: 201 });
    if (entidade === "partidas") return Response.json({ item: await criarPartidaCampeonato(campeonatoId, corpo.dados) }, { status: 201 });
    if (entidade === "documentos") {
      const dados = objetoRecebido(corpo.dados);
      const item = await criarDocumentoCampeonato(campeonatoId, dados);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item }, { status: 201 });
    }
    if (entidade === "atualizacoes") return Response.json({ item: await criarAtualizacaoCampeonato(campeonatoId, corpo.dados) }, { status: 201 });
    if (entidade) throw new ErroEventos("Escolha uma área válida do campeonato.");
    const item = await criarCampeonato(dadosDoCorpo(corpo));
    await sincronizarArquivosDoEvento(item);
    return Response.json({ item }, { status: 201 });
  } catch (erro) {
    return responderErroEventos(erro, "POST /api/interclasses");
  }
}

export async function PUT(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const corpo = await lerObjeto(request);
    if (corpo.acao === "gerar_chave") {
      return Response.json(await gerarChaveCampeonato(corpo.id, booleano(corpo.confirmar, false)));
    }
    if (corpo.acao === "registrar_resultado") {
      try {
        return Response.json(await registrarResultadoPartida(
          corpo.partidaId,
          corpo.dados,
          booleano(corpo.confirmarImpacto, false),
          String(corpo.motivo ?? ""),
        ));
      } catch (erro) {
        if (erro instanceof ErroEventos && erro.status === 409) {
          return Response.json(
            { erro: erro.message, exigeConfirmacao: true, impacto: erro.detalhes },
            { status: 409 },
          );
        }
        throw erro;
      }
    }
    if (corpo.acao === "definir_campeao") {
      return Response.json({ item: await definirCampeaoCampeonato(corpo.id, corpo.participanteId) });
    }
    const entidade = String(corpo.entidade ?? "");
    if (entidade === "participantes") {
      const dados = objetoRecebido(corpo.dados);
      if (dados.ativo === false) return Response.json(await arquivarParticipanteCampeonato(corpo.id));
      return Response.json({ item: await atualizarParticipanteCampeonato(corpo.id, dados) });
    }
    if (entidade === "fases") return Response.json({ item: await atualizarFaseCampeonato(corpo.id, corpo.dados) });
    if (entidade === "partidas") {
      const dados = objetoRecebido(corpo.dados ?? corpo);
      try {
        return Response.json({ item: await atualizarPartidaCampeonato(
          corpo.id,
          dados,
          booleano(corpo.confirmarImpacto ?? dados.confirmarImpacto, false),
          String(corpo.motivo ?? dados.motivo ?? ""),
        ) });
      } catch (erro) {
        if (erro instanceof ErroEventos && erro.status === 409) {
          return Response.json(
            { erro: erro.message, exigeConfirmacao: true, impacto: erro.detalhes },
            { status: 409 },
          );
        }
        throw erro;
      }
    }
    if (entidade === "documentos") {
      const dados = objetoRecebido(corpo.dados);
      const anterior = await obterDocumentoParaSincronizacao("campeonato", corpo.id);
      const item = await atualizarDocumentoCampeonato(corpo.id, dados);
      await sincronizarVisibilidadeArquivo(anterior);
      await sincronizarVisibilidadeArquivo(item);
      return Response.json({ item });
    }
    if (entidade === "atualizacoes") {
      return Response.json({ item: await atualizarAtualizacaoCampeonato(corpo.id, corpo.dados) });
    }
    if (entidade) throw new ErroEventos("Escolha uma área editável válida do campeonato.");
    const anterior = await obterCampeonato(String(corpo.id ?? ""), true);
    const item = await atualizarCampeonato(corpo.id, dadosDoCorpo(corpo));
    const atual = await obterCampeonato(String(corpo.id ?? ""), true);
    await sincronizarArquivosDoEvento(
      anterior.item, { documentos: anterior.documentos },
      atual.item, { documentos: atual.documentos },
    );
    return Response.json({ item });
  } catch (erro) {
    return responderErroEventos(erro, "PUT /api/interclasses");
  }
}

export async function DELETE(request: Request) {
  const bloqueio = await prepararEscrita(request);
  if (bloqueio) return bloqueio;
  try {
    const parametros = new URL(request.url).searchParams;
    const id = parametros.get("id");
    const entidade = parametros.get("entidade");
    if (entidade === "participantes") return Response.json(await arquivarParticipanteCampeonato(id));
    if (entidade === "fases") return Response.json(await arquivarFaseCampeonato(id));
    if (entidade === "partidas") return Response.json(await arquivarPartidaCampeonato(id));
    if (entidade === "documentos") {
      const anterior = await obterDocumentoParaSincronizacao("campeonato", id);
      const resposta = await arquivarDocumentoCampeonato(id);
      await sincronizarVisibilidadeArquivo(anterior);
      return Response.json(resposta);
    }
    if (entidade === "atualizacoes") return Response.json(await arquivarAtualizacaoCampeonato(id));
    if (entidade) throw new ErroEventos("Escolha uma área válida do campeonato.");
    const anterior = await obterCampeonato(String(id ?? ""), true);
    const resposta = await arquivarCampeonato(id);
    await sincronizarArquivosDoEvento(anterior.item, { documentos: anterior.documentos });
    return Response.json(resposta);
  } catch (erro) {
    return responderErroEventos(erro, "DELETE /api/interclasses");
  }
}
