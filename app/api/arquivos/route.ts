// importa a sessão o armazenamento e os vínculos de publicação
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
import { obterAmbiente } from "../../../worker/ambiente";
import { garantirBanco } from "../../../db/inicializar";
import { getD1 } from "../../../db";
import { consultaReferenciaPublica } from "../../arquivos/publicacao";
import { tipoArquivoValido } from "../../arquivos/formatos";

// lista a biblioteca somente para quem entrou no painel
export async function GET(request: Request) {
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return Response.json({ erro: "Armazenamento indisponível." }, { status: 503 });
  await garantirBanco();
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const lista = await bucket.list({ limit: 30, cursor, include: ["httpMetadata", "customMetadata"] });
  const referencias = lista.objects.length ? await getD1().batch(lista.objects.map((item) => consultaReferenciaPublica(item.key))) : [];
  return Response.json({ itens: lista.objects.map((item, indice) => ({
    chave: item.key, url: `/api/arquivos/${encodeURIComponent(item.key)}`,
    nome: item.customMetadata?.nomeOriginal || item.key, tipo: item.httpMetadata?.contentType || "application/octet-stream",
    tamanho: item.size, enviadoEm: item.uploaded.toISOString(), publico: Boolean(referencias[indice]?.results.length),
  })), cursor: lista.truncated ? lista.cursor : null }, { headers: { "cache-control": "private, no-store" } });
}

// recebe arquivos privados que poderão ser usados em uma publicação depois
export async function POST(request: Request) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return Response.json({ erro: "O armazenamento de arquivos não está configurado." }, { status: 503 });
  const formulario = await request.formData();
  const arquivo = formulario.get("arquivo");
  if (!(arquivo instanceof File)) return Response.json({ erro: "Escolha um arquivo." }, { status: 400 });
  if (arquivo.size > 10 * 1024 * 1024) return Response.json({ erro: "O arquivo deve ter no máximo 10 MB." }, { status: 400 });
  if (arquivo.size === 0) return Response.json({ erro: "O arquivo está vazio." }, { status: 400 });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let tipo: string;
  try { tipo = tipoArquivoValido(arquivo.name, arquivo.type, bytes); }
  catch (erro) { return Response.json({ erro: erro instanceof Error ? erro.message : "Arquivo inválido." }, { status: 400 }); }
  const nomeSeguro = arquivo.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
  const chave = `${Date.now()}-${crypto.randomUUID()}-${nomeSeguro || "arquivo"}`;
  await bucket.put(chave, bytes, {
    httpMetadata: { contentType: tipo },
    customMetadata: { nomeOriginal: arquivo.name, visibilidade: "privada" },
  });
  return Response.json({ chave, url: `/api/arquivos/${encodeURIComponent(chave)}`, nome: arquivo.name, visibilidade: "privada" }, { status: 201 });
}
