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
- **Notícias:** publicações com foto, descrição da imagem, crédito, fonte e texto completo, com busca e arquivo por ano
- **Projetos:** apresentação das iniciativas estudantis e seus estados de andamento
- **Eventos e calendário:** consulta de atividades, datas e programações publicadas
- **Interclasses:** campeonatos, participantes, fases, chaves, partidas, placares e resultados
- **Reuniões e atas:** pautas, registros, presenças, votações e documentos publicados pela gestão
- **Salas:** cadastro simples de turmas e salas físicas, com vínculo opcional ao ensalamento e confirmação ao substituir uma ocupação
- **Mapa do colégio:** pesquisa de salas, espaços, turmas e atividades com filtros de turno e tipo
- **Transparência:** receitas, despesas, categorias e comprovantes, com totais separados por ano e consulta do histórico
- **Estatuto e documentos:** acesso às normas e aos arquivos públicos do grêmio
- **Sugestões:** envio de ideias, demandas, propostas e relatos com protocolo, apenas em `/sugestoes`
- **Contato:** atalhos para atendimento presencial, Instagram, canal do WhatsApp e sugestões; os três destinos externos são editáveis no painel
- **Acessibilidade:** A+ amplia levemente os textos em um único nível; A restaura o tamanho normal
- **Painel da gestão:** cadastro, edição e publicação de conteúdos, administração de mensagens, eventos, interclasses, reuniões, representantes, mapa e envio de arquivos

## Uso básico

Acesse `/painel` e entre com a senha definida em `ADMIN_PASSWORD`. Cadastre ou edite os itens nas áreas do painel e use a opção de publicação para disponibilizá-los aos estudantes. Rascunhos e informações internas ficam na área administrativa. Para cadastrar um representante, publique primeiro uma turma ativa no menu Salas. O nível, a série e o turno do representante são preenchidos a partir dessa turma.

Nos formulários, a opção de preservar identidade pede confirmação e desativa nome, turma e contato. Esses dados não acompanham o envio anônimo, e a gestão não poderá responder diretamente. Evite incluir dados pessoais no texto da mensagem.

Sugestões têm o limite de três envios por hora em cada navegador. No login, cinco erros exigem uma espera de 15 minutos; mais cinco erros bloqueiam o navegador por 24 horas. Uma entrada correta reinicia o contador.

O ano inicial acompanha o calendário. Use o seletor de ano para consultar o histórico ou preparar 2027 e os próximos períodos. Eventos, reuniões e interclasses também aceitam datas e edições futuras. Informe as datas de início e fim dos mandatos; representantes encerrados ou futuros não aparecem como atuais. Ao renovar as turmas, ajuste a validade no painel e cadastre as novas sem apagar os registros anteriores.

Os lançamentos financeiros locais ainda são fictícios por escolha durante o desenvolvimento. Antes do uso público, substitua-os pelos registros reais, complete os integrantes e horários e configure D1, R2 e segredos de produção. O banco local não é enviado automaticamente na publicação.

Para conferir o projeto, execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run test:start`. Os testes de integração criam registros temporários e depois os excluem ou arquivam.
