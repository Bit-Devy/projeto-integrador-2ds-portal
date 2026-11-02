// consulta o arquivo atual sem guardar uma versão antiga em cache
import { listarDocumentosOficiais } from "../../../arquivos/documentos-oficiais";

export async function GET(request: Request, { params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  const documento = (await listarDocumentosOficiais()).find((item) => item.chave === chave);
  if (!documento) return new Response("Documento não encontrado.", { status: 404 });
  return new Response(null, { status: 302, headers: { location: new URL(documento.arquivoUrl, request.url).href, "cache-control": "no-store" } });
}
