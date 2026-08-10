// importa as verificações de administrador e origem
import { exigirAdministradorApi, origemValida } from "../../lib/autorizacao";
// importa o acesso ao armazenamento
import { obterAmbiente } from "../../../worker/ambiente";

// relaciona os formatos aceitos às suas extensões
const tiposPermitidos = new Map([
  ["application/pdf", ["pdf"]],
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/webp", ["webp"]],
]);

// recebe e guarda um novo arquivo
export async function POST(request: Request) {
  // exige uma chamada válida de administrador
  if (!origemValida(request)) return Response.json({ erro: "Origem inválida." }, { status: 403 });
  const { resposta } = await exigirAdministradorApi();
  if (resposta) return resposta;

  // verifica se o armazenamento está disponível
  const bucket = obterAmbiente().BUCKET;
  if (!bucket) return Response.json({ erro: "O armazenamento de arquivos não está configurado." }, { status: 503 });

  // lê e valida o arquivo recebido
  const formulario = await request.formData();
  const arquivo = formulario.get("arquivo");
  if (!(arquivo instanceof File)) return Response.json({ erro: "Escolha um arquivo." }, { status: 400 });
  if (!tiposPermitidos.has(arquivo.type)) return Response.json({ erro: "Envie PDF, PNG, JPG ou WebP." }, { status: 400 });
  if (arquivo.size > 10 * 1024 * 1024) return Response.json({ erro: "O arquivo deve ter no máximo 10 MB." }, { status: 400 });
  if (arquivo.size === 0) return Response.json({ erro: "O arquivo está vazio." }, { status: 400 });

  // confere extensão e assinatura para não confiar apenas no tipo declarado pelo navegador
  const extensao = arquivo.name.toLowerCase().split(".").pop() ?? "";
  if (!tiposPermitidos.get(arquivo.type)?.includes(extensao)) {
    return Response.json({ erro: "A extensão do arquivo não corresponde ao formato informado." }, { status: 400 });
  }
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!assinaturaValida(bytes, arquivo.type)) {
    return Response.json({ erro: "O conteúdo do arquivo não corresponde a PDF, PNG, JPG ou WebP válido." }, { status: 400 });
  }

  // novos fluxos podem manter anexos privados; a ausência preserva o comportamento público legado
  const visibilidade = String(formulario.get("visibilidade") ?? "publica") === "privada" ? "privada" : "publica";

  // cria uma chave segura e única para o arquivo
  const nomeSeguro = arquivo.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
  const chave = `${Date.now()}-${crypto.randomUUID()}-${nomeSeguro || "arquivo"}`;
  // salva o arquivo com seus metadados
  await bucket.put(chave, bytes, {
    httpMetadata: { contentType: arquivo.type },
    customMetadata: { nomeOriginal: arquivo.name, visibilidade },
  });

  // devolve o endereço do arquivo salvo
  return Response.json({ chave, url: `/api/arquivos/${encodeURIComponent(chave)}`, nome: arquivo.name, visibilidade }, { status: 201 });
}

// reconhece as assinaturas mínimas dos formatos permitidos
function assinaturaValida(bytes: Uint8Array, tipo: string) {
  if (tipo === "application/pdf") return textoAscii(bytes, 0, 5) === "%PDF-";
  if (tipo === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((byte, indice) => bytes[indice] === byte);
  }
  if (tipo === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (tipo === "image/webp") return textoAscii(bytes, 0, 4) === "RIFF" && textoAscii(bytes, 8, 4) === "WEBP";
  return false;
}

// lê um pequeno trecho ASCII sem transformar o arquivo inteiro em texto
function textoAscii(bytes: Uint8Array, inicio: number, tamanho: number) {
  return String.fromCharCode(...bytes.slice(inicio, inicio + tamanho));
}
