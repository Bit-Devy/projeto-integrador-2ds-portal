// reúne os formatos aceitos na biblioteca
const formatos: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  txt: "text/plain", csv: "text/csv", doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet", odp: "application/vnd.oasis.opendocument.presentation",
};

// confere o nome o tipo e o conteúdo antes de guardar um arquivo
export function tipoArquivoValido(nome: string, declarado: string, bytes: Uint8Array) {
  const extensao = nome.toLowerCase().split(".").pop() || "";
  const tipo = formatos[extensao];
  if (!tipo) throw new Error("Envie PDF, imagem, documento, planilha, apresentação, CSV ou TXT.");
  if (declarado && declarado !== tipo && declarado !== "application/octet-stream" && !(extensao === "csv" && ["text/plain", "application/vnd.ms-excel"].includes(declarado)) && !(["docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(extensao) && declarado === "application/zip")) throw new Error("O tipo do arquivo não corresponde à extensão.");
  const comeca = (assinatura: number[]) => assinatura.every((valor, indice) => bytes[indice] === valor);
  const texto = new TextDecoder().decode(bytes);
  let valido = false;
  if (extensao === "pdf") valido = texto.startsWith("%PDF-");
  if (extensao === "png") valido = comeca([137, 80, 78, 71, 13, 10, 26, 10]);
  if (["jpg", "jpeg"].includes(extensao)) valido = comeca([255, 216, 255]);
  if (extensao === "webp") valido = texto.slice(0, 4) === "RIFF" && texto.slice(8, 12) === "WEBP";
  if (["doc", "xls", "ppt"].includes(extensao)) valido = comeca([208, 207, 17, 224, 161, 177, 26, 225]);
  if (["docx", "xlsx", "pptx"].includes(extensao)) valido = comeca([80, 75, 3, 4]) && texto.includes("[Content_Types].xml") && texto.includes(({ docx: "word/document.xml", xlsx: "xl/workbook.xml", pptx: "ppt/presentation.xml" } as Record<string, string>)[extensao]);
  if (["odt", "ods", "odp"].includes(extensao)) valido = comeca([80, 75, 3, 4]) && texto.includes("mimetype") && texto.includes(tipo);
  if (["csv", "txt"].includes(extensao)) {
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); valido = !bytes.includes(0); } catch { valido = false; }
  }
  if (!valido) throw new Error("O conteúdo do arquivo não corresponde ao formato informado.");
  return tipo;
}
