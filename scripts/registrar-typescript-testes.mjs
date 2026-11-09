// registra os carregadores na mesma execução usando a api atual do node
import * as modulos from "node:module";
import * as carregadores from "./lib/typescript-testes.mjs";

// mantém o suporte às versões antigas já aceitas pelo projeto
if (typeof modulos.registerHooks === "function") modulos.registerHooks(carregadores);
else modulos.register("./lib/typescript-testes-legado.mjs", import.meta.url);
