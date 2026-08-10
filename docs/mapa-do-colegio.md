# Mapa do Colégio

O Mapa do Colégio é um guia público de localização e ensalamento do Portal GECEP. Ele permite descobrir onde uma turma ou atividade acontece e pesquisar uma sala ou espaço institucional por número ou nome.

O arquivo de referência de 2026 contém uma tabela de ensalamento, mas não contém uma planta baixa. Por isso, a primeira versão apresenta resultados textuais verificáveis. Uma imagem ou planta verdadeira pode ser associada posteriormente a cada local pelo painel.

## Onde acessar

- Página pública: `/mapa-do-colegio`;
- Menu público: `Mais` → `Mapa do Colégio`;
- Administração: entre em `/login`, abra `/painel` e escolha `Mapa e ensalamento`;
- API pública, somente leitura: `GET /api/mapa`;
- API administrativa: `GET /api/mapa?todos=1` e os métodos `POST`, `PUT` e `DELETE` de `/api/mapa`.

Na área pública, os três filtros de turma devem ser preenchidos na ordem: turno, tipo e turma ou atividade. Em `Outro`, a primeira pesquisa também oferece os espaços especiais comprovados no PDF, como laboratórios, DANCEP, Coro e SRM - DI / AHSD. Esses locais aparecem em todos os turnos do filtro apenas para serem encontrados; isso não afirma que funcionem ou tenham atividade em determinado turno. A pesquisa de local aceita número ou nome e seus filtros são opcionais.

Detalhes complementares como descrição, instruções de chegada, observações, acessibilidade, funcionamento e datas de validade só aparecem ao visitante quando foram cadastrados.

## Como os dados estão organizados

Os conteúdos do mapa não ficam fixos dentro do componente React. Eles são persistidos no banco D1/SQLite em quatro tabelas relacionadas.

### `categorias_mapa`

Guarda os tipos que aparecem nos filtros. Há categorias para atividades e para locais. Assim, novos tipos podem ser adicionados pelo painel sem alterar o código da página.

Exemplos iniciais de atividade são aula regular, curso técnico, idiomas, atividade extracurricular e outro. Exemplos de local são sala de aula, laboratório, biblioteca, auditório, setor administrativo, espaço esportivo e outro.

### `locais_colegio`

Guarda salas e espaços. Entre os campos disponíveis estão:

- nome, número e nome alternativo;
- tipo, ala, andar, bloco, setor e corredor;
- ponto de referência, descrição e instruções de chegada;
- observações, acessibilidade e funcionamento;
- URL de imagem ou mapa relacionado;
- ordem, estado ativo/inativo e publicação/rascunho;
- datas de criação e atualização.

O número é texto, e não um número matemático, porque existem salas como `113B`, `213C` e `311A`.

### `turmas_atividades`

Guarda a identidade pesquisável de cada turma ou atividade:

- nome e versão normalizada para busca;
- apelidos;
- turno e tipo;
- curso, série/ano e turma;
- descrição e observações próprias;
- período de validade;
- ordem, estado ativo/inativo e publicação/rascunho.

Uma atividade com o mesmo rótulo em turnos diferentes é representada por um registro para cada turno. Isso evita confundir, por exemplo, duas turmas que usam o mesmo código de manhã e à noite.

### `ensalamentos`

Relaciona uma turma ou atividade a um local. Esse relacionamento separado é o que permite trocar uma turma de sala sem apagar sua descrição e também manter mais de um uso da mesma sala.

Cada ensalamento guarda:

- a turma ou atividade;
- a sala ou local, que pode ficar vazio enquanto ainda não foi definido;
- turno e tipo;
- observações que valem somente para esse vínculo;
- início e fim de validade;
- ordem, estado ativo/inativo e publicação/rascunho;
- datas de criação e atualização.

Uma observação cadastrada no local aparece em todas as pesquisas daquele local. Uma observação cadastrada no ensalamento aparece apenas no resultado daquele vínculo.

## Carga inicial de 2026

A carga inicial está em `db/dados-mapa-2026.ts` e foi transcrita do arquivo `ensalamento_2026_definitivo_referencia.pdf`, página 1, com hash SHA-256:

```text
fe7c105aa2c50dcf51ab1ff7a30812e99dcf9b5b767ccc3ec22ccc54b29b7e6b
```

Ela contém:

- 67 salas ou locais;
- 100 combinações distintas de turma/atividade e turno;
- 112 ensalamentos: 45 de manhã, 45 à tarde e 22 à noite.

Por decisão administrativa posterior à transcrição, todos os rótulos de turma ou atividade do ensalamento inicial, exceto `CELEM` e `Reforço`, aparecem em `Aula regular`. `CELEM` permanece em idiomas e `Reforço` permanece em `Outro`. A migração `0003_reclassificar_mapa_2026.sql` aplica a mesma correção aos bancos que já tinham recebido a primeira versão da carga.

A carga usa chaves estáveis e um marcador no banco. Executá-la novamente não cria duplicatas nem sobrescreve ajustes posteriores feitos no painel.

O PDF não informa bloco, corredor, referência, instruções, acessibilidade, horários, imagens ou observações. Esses campos foram deixados vazios. As siglas que o documento não explica também não receberam nomes completos inventados. Consulte `docs/pendencias-mapa-do-colegio.md` antes de completar esses dados.

O PDF não precisa ser alterado para trocar uma sala. Depois da primeira carga, o banco e o painel são a fonte operacional.

## Como executar a carga inicial

1. Aplique as migrações do banco.
2. Inicie o portal.
3. Abra `/mapa-do-colegio` ou consulte `/api/mapa`.

Durante a primeira consulta, `garantirBanco()` verifica as tabelas e executa a carga uma única vez. O mesmo inicializador atende a prévia local e o ambiente publicado.

## Como cadastrar uma sala ou local

1. Entre no painel e abra `Mapa e ensalamento`.
2. Selecione `Locais e salas`.
3. Clique em `Novo local`.
4. Preencha pelo menos o nome, o tipo e a ala. A ala possui somente as opções `Par`, `Ímpar` e `Fora do prédio`.
5. Informe somente localizações confirmadas. Os demais campos ainda desconhecidos podem ficar vazios.
6. Marque `Local ativo` e `Publicar no portal` quando a informação estiver pronta.
7. Clique em `Salvar registro`.

Para associar uma imagem verdadeira, cole uma URL ou use o envio de imagem. A página pública só mostra a imagem quando ela estiver cadastrada.

## Como cadastrar uma turma ou atividade

1. Abra a aba `Turmas e atividades`.
2. Clique em `Nova turma ou atividade`.
3. Informe nome, turno e tipo.
4. Cadastre apelidos separados por vírgulas ou linhas quando houver outras formas conhecidas de pesquisa.
5. Preencha curso, série, descrição, observações e validade apenas quando forem confirmados.
6. Salve o registro.
7. Abra `Ensalamentos` e crie o vínculo com a sala.

O nome normalizado pode ficar vazio no formulário. O servidor gera a forma usada pela busca. Por exemplo, `3º J`, `3° J`, `3 J`, `3J` e `terceiro J` são tratados como variações equivalentes.

## Como trocar uma turma de sala

1. Abra `Ensalamentos`.
2. Pesquise a turma.
3. Clique em `Editar` no vínculo correto.
4. Escolha a nova sala no campo `Sala ou local`.
5. Ajuste observação e validade, se necessário.
6. Salve.

Para preservar um histórico com períodos distintos, encerre o vínculo antigo preenchendo sua data final e crie um novo ensalamento com a nova sala e a data inicial. Não é necessário excluir a turma.

## Como adicionar observações

- Para uma informação permanente do espaço, edite o registro em `Locais e salas` e use `Observações deste local`.
- Para uma informação própria da turma, edite `Turmas e atividades`.
- Para algo que vale apenas naquela combinação de turma, sala e período, edite `Ensalamentos`.

Essa separação impede que uma observação específica de uma turma apareça indevidamente em todos os usos da sala.

## Tipos configuráveis

A aba `Tipos cadastrados` permite adicionar, editar, ordenar e desativar opções de atividade ou local. O código deve usar letras sem acento, números e sublinhado, como `curso_livre`. O nome exibido pode conter espaços e acentos.

Não exclua um tipo ainda usado por registros. Prefira desativá-lo até que os registros relacionados sejam atualizados.

## Exportação e importação JSON

O botão `Exportar JSON` baixa uma cópia dos quatro conjuntos de dados do mapa. Guarde esse arquivo antes de mudanças em massa.

O botão `Importar JSON` aceita arquivos de até 2 MB e pede confirmação. A importação usa modo de mesclagem: ela não apaga registros ausentes do arquivo. O servidor valida formato, quantidades, textos, datas, IDs e relacionamentos antes de gravar.

Uma cópia exportada pode conter IDs usados para reconstruir os vínculos entre turmas e locais. Não edite esses IDs manualmente sem compreender os relacionamentos.

## Migrações

Para gerar uma nova migração depois de alterar `db/schema.ts`:

```bash
npm run db:generate
```

Para aplicar as migrações no banco local:

```bash
npm run db:migrate:local
```

Para aplicar no banco remoto configurado no Cloudflare:

```bash
npm run db:migrate:remote
```

Revise o arquivo SQL gerado antes de aplicá-lo em produção e faça uma exportação dos dados quando a mudança envolver registros existentes.

## Testes e verificação

Os comandos disponíveis são:

```bash
npm run lint
npm run build
npm test
npm run test:local
```

`npm test` já executa uma nova compilação antes dos testes de Node. `npm run test:local` inicia o servidor local, usa D1 e verifica fluxos HTTP, login e APIs; ele precisa das variáveis locais descritas em `.dev.vars.example`.

Como o projeto não possui uma ferramenta de navegador como Playwright, o comportamento visual em celular deve também ser conferido manualmente:

1. abra o menu hambúrguer;
2. toque em `Mais` para abrir e fechar o submenu;
3. abra a página do mapa;
4. faça uma busca de turma e outra por sala;
5. navegue pelos controles usando Tab, Enter, Espaço e Escape;
6. teste contraste e fonte maior.

## Segurança e publicação

`GET /api/mapa` devolve somente categorias ativas e registros ativos, publicados e vigentes. Um ensalamento público só é retornado quando a turma e o local relacionados também podem ser publicados.

As consultas administrativas e toda criação, edição, exclusão ou importação exigem a sessão administrativa existente. Escritas também verificam a origem da requisição e usam parâmetros vinculados no SQLite.

Para publicar:

1. aplique as migrações remotas;
2. confirme `DB`, `BUCKET`, `ADMIN_PASSWORD` e `SESSION_SECRET` no ambiente, sem colocá-los no código;
3. execute os testes;
4. publique com `npm run deploy`;
5. confira a página pública e o painel no endereço final.

Erros internos da API não devem incluir consultas, segredos ou detalhes do banco na resposta ao visitante.
