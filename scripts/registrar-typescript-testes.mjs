// registra o suporte aos arquivos tipados antes de iniciar os testes
import { register } from "node:module";
register("./lib/typescript-testes.mjs", import.meta.url);
