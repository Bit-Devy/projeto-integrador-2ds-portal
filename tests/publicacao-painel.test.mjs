// testa o histórico com o servidor e um banco descartável
import test from "node:test";
import assert from "node:assert/strict";
import { abrirPortalMemoria } from "./apoio/portal-memoria.mjs";
import { calendarioVazio } from "../app/servicos/calendario.ts";

async function json(resposta) {
  return (await resposta).json();
}

test("interclasses, eventos e reuniões só podem ser excluídos antes da primeira publicação", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, sqlite } = portal;
  const casos = [
    [
      "interclasses",
      "campeonatos",
      {
        nome: "Campeonato de teste",
        modalidade: "futsal",
        participantes: [{ nome: "1A" }, { nome: "1B" }],
      },
    ],
    ["eventos", "eventos_internos", { titulo: "Evento de teste", dataInicial: "2026-11-16" }],
    [
      "reunioes",
      "reunioes",
      { titulo: "Reunião de teste", tipo: "representantes", data: "2026-11-16" },
    ],
  ];
  try {
    for (const [rota, tabela, dados] of casos) {
      const api = `/api/${rota}`;
      const rascunho = (
        await json(chamar(api, { method: "POST", corpo: { dados }, esperado: 201 }))
      ).item;
      const exclusao = `${api}?id=${rascunho.id}&acao=excluir`;
      assert.equal(rascunho.jaPublicado, false);
      if (rota === "interclasses")
        await chamar(api, {
          method: "POST",
          corpo: { acao: "duplicar", id: rascunho.id },
          esperado: 400,
        });
      await chamar(exclusao, { method: "DELETE" });
      assert.equal(
        sqlite.prepare(`SELECT id FROM ${tabela} WHERE id = ?`).get(rascunho.id),
        undefined,
      );

      const novo = (await json(chamar(api, { method: "POST", corpo: { dados }, esperado: 201 })))
        .item;
      await chamar(api, { method: "PUT", corpo: { id: novo.id, dados: { publicado: true } } });
      await chamar(`${api}/${novo.id}`, { jar: new Map() });
      await chamar(`${api}?id=${novo.id}&acao=excluir`, { method: "DELETE", esperado: 409 });
      await chamar(`${api}?id=${novo.id}&acao=arquivar`, { method: "DELETE" });
      await chamar(`${api}/${novo.id}`, { jar: new Map(), esperado: 404 });
      await chamar(`${api}?id=${novo.id}&acao=excluir`, { method: "DELETE", esperado: 409 });
      assert.equal(
        sqlite.prepare(`SELECT ja_publicado FROM ${tabela} WHERE id = ?`).get(novo.id).ja_publicado,
        1,
      );
    }
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    await portal.fechar();
  }
});

test("complementos privados podem ser excluídos e o histórico publicado continua protegido", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar, sqlite } = portal;
  try {
    const { item: reuniao } = await json(
      chamar("/api/reunioes", {
        method: "POST",
        esperado: 201,
        corpo: {
          dados: { titulo: "Reunião com votação", tipo: "representantes", data: "2026-11-16" },
        },
      }),
    );
    const dados = {
      titulo: "Decisão fictícia",
      pergunta: "Qual opção?",
      publicado: true,
      interno: false,
      opcoes: [{ texto: "Grupo A" }, { texto: "Grupo B" }],
    };
    const criarVotacao = () =>
      json(
        chamar("/api/reunioes", {
          method: "POST",
          esperado: 201,
          corpo: { entidade: "votacoes", reuniaoId: reuniao.id, dados },
        }),
      );
    const { item: privada } = await criarVotacao();
    await chamar(`/api/reunioes?entidade=votacoes&id=${privada.id}&acao=excluir`, {
      method: "DELETE",
    });
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) total FROM opcoes_votacao_reuniao").get().total,
      0,
    );

    const { item: publica } = await criarVotacao();
    await chamar("/api/reunioes", {
      method: "PUT",
      corpo: { id: reuniao.id, dados: { publicado: true } },
    });
    const rota = `/api/reunioes?entidade=votacoes&id=${publica.id}`;
    await chamar(`${rota}&acao=excluir`, { method: "DELETE", esperado: 409 });
    await chamar(`${rota}&acao=arquivar`, { method: "DELETE" });
    await chamar(`${rota}&acao=excluir`, { method: "DELETE", esperado: 409 });
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) total FROM opcoes_votacao_reuniao").get().total,
      2,
    );
  } finally {
    await portal.fechar();
  }
});

test("calendário escolar preserva versões publicadas e permite apagar rascunhos", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  const calendario = calendarioVazio(2027, "anual");
  const rota = "/api/calendario?ano=2027&modalidade=anual";
  try {
    await chamar("/api/calendario", { method: "PUT", corpo: { calendario } });
    await chamar(rota, { method: "DELETE" });
    await chamar("/api/calendario", {
      method: "PUT",
      corpo: { calendario: { ...calendario, publicado: true } },
    });
    const { item } = await json(
      chamar("/api/calendario", { method: "PUT", corpo: { calendario } }),
    );
    assert.equal(item.jaPublicado, true);
    await chamar(rota, { method: "DELETE", esperado: 409 });
    assert.equal(
      (await json(chamar("/api/calendario"))).itens.some((item) => item.ano === 2027),
      false,
    );
  } finally {
    await portal.fechar();
  }
});

test("a retirada de uma notícia preserva o anexo e cadastros operacionais continuam removíveis", async () => {
  const portal = await abrirPortalMemoria();
  const { chamar } = portal;
  try {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF5sAAAAASUVORK5CYII=",
      "base64",
    );
    const formulario = new FormData();
    formulario.append("arquivo", new File([png], "teste.png", { type: "image/png" }));
    const arquivo = await json(
      chamar("/api/arquivos", { method: "POST", arquivo: formulario, esperado: 201 }),
    );
    const titulo = "Notícia com anexo preservado";
    const { item } = await json(
      chamar("/api/conteudo", {
        method: "POST",
        esperado: 201,
        corpo: {
          tipo: "noticias",
          publicado: true,
          dados: {
            titulo,
            categoria: "Teste",
            data: "2026-11-16",
            resumo: "Teste de publicação",
            imagemUrl: arquivo.url,
            imagemAlt: "Imagem fictícia",
            creditoImagem: "GECEP",
          },
        },
      }),
    );
    await chamar(arquivo.url, { jar: new Map() });
    await chamar("/api/conteudo", { method: "PUT", corpo: { id: item.id, acao: "arquivar" } });
    await chamar(arquivo.url, { jar: new Map(), esperado: 401 });
    await chamar(arquivo.url, { method: "DELETE", esperado: 409 });
    await chamar(`/api/conteudo?id=${item.id}`, { method: "DELETE", esperado: 409 });
    const { item: cardapio } = await json(
      chamar("/api/conteudo", {
        method: "POST",
        esperado: 201,
        corpo: {
          tipo: "cardapios",
          publicado: true,
          dados: {
            titulo: "Prato fictício",
            categoria: "merenda",
            data: "2026-11-16",
            turno: "manha",
            descricao: "Composição fictícia",
          },
        },
      }),
    );
    await chamar(`/api/conteudo?id=${cardapio.id}`, { method: "DELETE" });
    const { item: sala } = await json(
      chamar("/api/mapa", {
        method: "POST",
        esperado: 201,
        corpo: {
          entidade: "locais",
          dados: {
            nome: "Sala temporária 01",
            ala: "Par",
            tipo: "sala_aula",
            ativo: true,
            publicado: true,
          },
        },
      }),
    );
    await chamar(`/api/mapa?entidade=locais&id=${sala.id}`, { method: "DELETE" });
  } finally {
    await portal.fechar();
  }
});
