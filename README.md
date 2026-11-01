# Portal do GECEP

Código completo do portal do Grêmio Estudantil do Colégio Estadual do Paraná.

O projeto possui páginas públicas, calendário, notícias, projetos, equipe, documentos, transparência, formulários, painel administrativo, banco de dados e envio de arquivos.

Para desenvolver, execute `npm run dev`. Para executar a versão compilada,
use `npm run build` e depois `npm run start`, disponível em
`http://127.0.0.1:3000`. Outra porta pode ser escolhida com
`npm run start -- --port 4173`.

O `start` usa o runtime Cloudflare local com o banco D1 e os arquivos R2 de
`.wrangler/state`, os mesmos usados no desenvolvimento. Configure
`ADMIN_PASSWORD` e `SESSION_SECRET` no arquivo `.dev.vars`.
Para testar as APIs, login, operações do painel e arquivos nesse modo, execute
`npm run test:start`.
