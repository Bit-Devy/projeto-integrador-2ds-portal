// importa a criação de pastas
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
// importa a execução de programas
import { spawn } from "node:child_process";
// importa a montagem de caminhos
import { join } from "node:path";

// separa o comando dos seus argumentos
const [comandoRecebido, ...argumentosRecebidos] = process.argv.slice(2);
const iniciarCompilado = comandoRecebido === "start";
const comando = iniciarCompilado ? "vite" : comandoRecebido;
const arquivoSegredos = join(process.cwd(), ".dev.vars");
const portaInformada = argumentosRecebidos.some((argumento) => argumento === "--port" || argumento.startsWith("--port="));
const argumentos = iniciarCompilado ? [
  "preview", "--host", "127.0.0.1",
  ...(portaInformada ? [] : ["--port", "3000"]),
  ...argumentosRecebidos,
] : argumentosRecebidos;
// exige um comando para continuar
if (!comando) {
  console.error("Informe o comando que deve ser executado.");
  process.exit(1);
}

// guarda os caminhos usados pela execução local
const raiz = process.cwd();
if (iniciarCompilado && !existsSync(join(raiz, "dist/server/wrangler.json"))) {
  console.error("Execute npm run build antes de npm run start.");
  process.exit(1);
}
// A prévia Cloudflare lê os segredos junto do worker compilado.
if (iniciarCompilado && existsSync(arquivoSegredos)) {
  copyFileSync(arquivoSegredos, join(raiz, "dist/server/.dev.vars"));
}
const pastaTemporaria = join(raiz, ".wrangler");
const pastaConfiguracao = join(pastaTemporaria, "config");
const pastaRegistro = join(pastaTemporaria, "registry");
const pastaLogs = join(pastaTemporaria, "logs");

// cria as pastas de apoio quando necessário
[pastaTemporaria, pastaConfiguracao, pastaRegistro, pastaLogs].forEach((pasta) => {
  mkdirSync(pasta, { recursive: true });
});

// escolhe o nome correto do programa para o sistema
const nomeExecutavel = process.platform === "win32" ? `${comando}.cmd` : comando;
// encontra o programa instalado no projeto
const executavel = join(raiz, "node_modules", ".bin", nomeExecutavel);

// inicia o programa com as pastas locais
const processo = spawn(executavel, argumentos, {
  cwd: raiz,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    HOME: pastaTemporaria,
    XDG_CONFIG_HOME: pastaConfiguracao,
    MINIFLARE_REGISTRY_PATH: pastaRegistro,
    WRANGLER_LOG_PATH: join(pastaLogs, "wrangler.log"),
    WRANGLER_WRITE_LOGS: "false",
  },
});

// evita encerrar o programa mais de uma vez
let encerrando = false;
// repassa os sinais de encerramento ao programa
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => {
    // ignora sinais repetidos
    if (encerrando) return;
    encerrando = true;
    processo.kill(sinal);
  });
}

// mostra erros ao iniciar o programa
processo.on("error", (erro) => {
  console.error(`Não foi possível iniciar ${comando}:`, erro.message);
  process.exit(1);
});

// devolve o mesmo resultado do programa
processo.on("exit", (codigo, sinal) => {
  // usa o código normal quando ele existe
  if (codigo !== null) process.exit(codigo);
  // transforma o sinal em um código conhecido
  process.exit(sinal === "SIGINT" ? 130 : 143);
});
