// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../../lib/autorizacao";
// importa o acesso ao armazenamento
import { obterAmbiente } from "../../../../worker/ambiente";

// devolve um arquivo guardado no armazenamento
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chave: string }> },
) {
  // verifica se o armazenamento está disponível
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return new Response("Arquivo indisponível.", { status: 503 });
  // busca o arquivo pela chave recebida
  const { chave } = await params;
  const objeto = await bucket.get(chave);
  if (!objeto) return new Response("Arquivo não encontrado.", { status: 404 });

  // anexos explicitamente privados exigem a mesma sessão do painel
  const privado = objeto.customMetadata?.visibilidade === "privada";
  if (privado) {
    const { resposta } = await exigirAdministradorApi();
    if (resposta) return resposta;
  }

  // copia os metadados e configura o cache do arquivo
  const cabecalhos = new Headers();
  objeto.writeHttpMetadata(cabecalhos);
  cabecalhos.set("etag", objeto.httpEtag);
  cabecalhos.set("cache-control", privado ? "private, no-store" : "public, max-age=3600");
  cabecalhos.set("x-content-type-options", "nosniff");
  const nomeOriginal = objeto.customMetadata?.nomeOriginal?.replace(/[\r\n"\\]/g, "-") || "arquivo";
  cabecalhos.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(nomeOriginal)}`);
  return new Response(objeto.body, { headers: cabecalhos });
}

// altera a visibilidade de um arquivo já associado a um registro
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ chave: string }> },
) {
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return Response.json({ erro: "Armazenamento indisponível." }, { status: 503 });

  const corpo = await request.json() as { visibilidade?: unknown };
  if (corpo.visibilidade !== "publica" && corpo.visibilidade !== "privada") {
    return Response.json({ erro: "Escolha visibilidade pública ou privada." }, { status: 400 });
  }
  const { chave } = await params;
  const objeto = await bucket.get(chave);
  if (!objeto) return Response.json({ erro: "Arquivo não encontrado." }, { status: 404 });
  // materializa o conteúdo antes de substituir os metadados do mesmo objeto
  const conteudo = await objeto.arrayBuffer();
  await bucket.put(chave, conteudo, {
    httpMetadata: objeto.httpMetadata,
    customMetadata: { ...objeto.customMetadata, visibilidade: corpo.visibilidade },
  });
  return Response.json({ chave, visibilidade: corpo.visibilidade });
}

// exclui um arquivo do armazenamento
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chave: string }> },
) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;
  // verifica se o armazenamento está disponível
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return Response.json({ erro: "Armazenamento indisponível." }, { status: 503 });
  // remove o arquivo pela chave recebida
  const { chave } = await params;
  await bucket.delete(chave);
  return Response.json({ removido: true });
}
