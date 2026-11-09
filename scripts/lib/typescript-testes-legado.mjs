// mantém o carregamento nas versões antigas do node que ainda não possuem a nova api
export { load } from "./typescript-testes.mjs";

// aguarda a resolução antiga para poder tentar os caminhos sem extensão
export async function resolve(nome, contexto, proximo) {
  if (nome === ".") return proximo("./index.ts", contexto);
  try { return await proximo(nome, contexto); }
  catch (erro) {
    if (!(nome.startsWith(".") && ["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(erro.code))) throw erro;
    for (const sufixo of [".ts", "/index.ts"]) {
      try { return await proximo(nome + sufixo, contexto); } catch { /* tenta o próximo caminho */ }
    }
    throw erro;
  }
}
