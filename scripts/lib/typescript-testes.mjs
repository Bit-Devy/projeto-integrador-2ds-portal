// importa a leitura do código e o compilador já instalado no projeto
import { readFileSync } from "node:fs";
import ts from "typescript";

// permite testar os arquivos tipados mesmo em versões do node sem esse suporte
export function load(url, contexto, proximo) {
  if (!/\.tsx?(\?|$)/.test(url)) return proximo(url, contexto);
  const origem = readFileSync(new URL(url), "utf8");
  const resultado = ts.transpileModule(origem, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    fileName: new URL(url).pathname,
  });
  return { format: "module", source: resultado.outputText, shortCircuit: true };
}

// encontra os caminhos sem extensão usados pelo código do portal
export function resolve(nome, contexto, proximo) {
  if (nome === ".") return proximo("./index.ts", contexto);
  try { return proximo(nome, contexto); }
  catch (erro) {
    if (!(nome.startsWith(".") && ["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(erro.code))) throw erro;
    for (const sufixo of [".ts", "/index.ts"]) {
      try { return proximo(nome + sufixo, contexto); } catch { /* tenta o próximo caminho */ }
    }
    throw erro;
  }
}
