# Portal do GECEP

Site do Grêmio Estudantil do Colégio Estadual do Paraná para informar, organizar atividades e receber a participação dos estudantes.

## Como rodar

1. Instale o Node.js 22.13 ou superior e execute `npm install` na pasta do projeto
2. Se o arquivo `.dev.vars` ainda não existir, copie `.dev.vars.example` para esse nome e configure `ADMIN_PASSWORD` e `SESSION_SECRET` com valores próprios
3. Execute `npm run dev` e abra o endereço informado no terminal, normalmente `http://127.0.0.1:5173`

O banco D1 e os arquivos R2 funcionam localmente em `.wrangler/state`. As tabelas e os dados iniciais são preparados pelo portal. Preserve essa pasta para manter os cadastros e arquivos locais.

Para executar a versão compilada, use `npm run build` e depois `npm run start`. O endereço padrão é `http://127.0.0.1:3000`.

## Funções do site

- **Início:** apresentação do grêmio, atalhos, notícias em destaque e próximos eventos
- **O GECEP e gestão:** história, objetivos, organização e integrantes do grêmio
- **CRT e representantes:** explicação da representação estudantil e consulta dos representantes de turma
- **Notícias:** publicações, busca por assunto e leitura das notícias ou fontes relacionadas
- **Projetos:** apresentação das iniciativas estudantis e seus estados de andamento
- **Eventos e calendário:** consulta de atividades, datas e programações publicadas
- **Interclasses:** campeonatos, participantes, fases, chaves, partidas, placares e resultados
- **Reuniões e atas:** pautas, registros, presenças, votações e documentos publicados pela gestão
- **Mapa do colégio:** pesquisa de salas, espaços, turmas e atividades com filtros de turno e tipo
- **Transparência:** consulta de receitas, despesas, categorias e comprovantes, com valores demonstrativos durante o desenvolvimento
- **Estatuto e documentos:** acesso às normas e aos arquivos públicos do grêmio
- **Sugestões e contato:** envio de ideias, demandas, propostas e relatos com protocolo de recebimento
- **Acessibilidade:** A+ amplia levemente os textos em um único nível; A restaura o tamanho normal
- **Painel da gestão:** cadastro, edição e publicação de conteúdos, administração de mensagens, eventos, interclasses, reuniões, representantes, mapa e envio de arquivos

## Uso básico

Acesse `/painel` e entre com a senha definida em `ADMIN_PASSWORD`. Cadastre ou edite os itens nas áreas do painel e use a opção de publicação para disponibilizá-los aos estudantes. Rascunhos e informações internas ficam na área administrativa.

Nos formulários, a opção de preservar identidade pede confirmação e desativa nome, turma e contato. Esses dados não acompanham o envio anônimo, e a gestão não poderá responder diretamente. Evite incluir dados pessoais no texto da mensagem.

Sugestões e contato compartilham o limite de três envios por hora em cada navegador. No login, cinco erros exigem uma espera de 15 minutos; mais cinco erros bloqueiam o navegador por 24 horas. Uma entrada correta reinicia o contador.
