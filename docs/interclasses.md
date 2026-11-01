# Interclasses

## Como criar um interclasse

No painel, abra **Eventos → Interclasses e campeonatos → Novo campeonato**.
Preencha nome, edição, período, descrição, local e premiação. Na mesma etapa,
selecione um esporte da lista e informe categoria, turno e regulamento.
Esportes de registros antigos continuam disponíveis para edição.

Em **Turmas**, cole todas as turmas, separadas por espaços ou linhas
(`6A 9B 1J 2DS 3C`). Vírgulas e ponto e vírgula também separam entradas.
O nome cadastrado aceita apenas a série (6 a 9 ou 1 a 3), seguida de uma a
três letras. Letras minúsculas são convertidas para maiúsculas. Entradas
fora do padrão aparecem destacadas e bloqueiam a inclusão de todo o lote.
Confira os nomes identificados e clique em **Adicionar turmas**. Cada nome
é incluído na lista de participantes com nome de exibição e apelido vazios;
a chave usa o nome cadastrado quando não há um nome de exibição.
Os campos individuais continuam disponíveis: preencha o nome cadastrado,
nome exibido e apelido opcionais e pressione **Enter** para incluir a turma.
Entradas repetidas são rejeitadas. O limite é de 128 turmas por campeonato.

## Gerar uma chave

Selecione **Mata-mata simples → Sortear chave inicial**. O painel salva o
rascunho e sorteia os confrontos. Cada rodada tem folga apenas quando o número
de turmas é ímpar, sempre com um único avanço direto. Por exemplo, seis turmas
começam com três jogos reais; depois, entre os três vencedores, um avança direto
à final e os outros dois jogam a semifinal. O cartão indica esse caminho, sem
criar jogos vazios para completar uma potência de dois.
A ordem de cadastro não determina os adversários. O botão **Sortear novamente**
também está disponível em **Chaves e jogos**.

Opcionalmente, ative **Impedir confrontos entre séries muito distantes** e
escolha a diferença máxima desejada de um, dois ou três anos. A sequência escolar é
6º, 7º, 8º, 9º, 1º, 2º, 3º; portanto, 9A e 1J têm um ano de diferença,
enquanto 1J e 3C têm dois. A comparação usa o nome cadastrado, mesmo quando
há nome de exibição ou apelido. A regra fica salva no campeonato. O sorteio
agrupa caminhos de séries próximas para adiar os encontros distantes. Ela não
impede o campeonato de continuar: quando não houver adversários próximos
suficientes, os confrontos distantes necessários serão criados. Se restarem
apenas turmas do 8º ano e do 3º do médio, elas poderão se enfrentar. Nas edições
manuais da primeira rodada, só são aceitos os encontros distantes inevitáveis.

Na prévia, arraste uma turma da primeira fase para outra posição para trocá-las.
No celular ou teclado, selecione a posição de origem e depois a de destino.
As trocas são salvas imediatamente, incluindo a atualização das folgas.
Uma troca que deixe um jogo sem nenhuma turma é rejeitada.
Com a regra de séries ativa, trocas que antecipem encontros distantes evitáveis
também são rejeitadas.
Depois de começar um jogo ou registrar resultado, use o editor do jogo:
as trocas por arraste são desativadas para preservar os resultados.

Use **Abrir em tela cheia** para explorar e editar a mesma chave, incluindo
trocas, detalhes e resultados. Ao sair pelo botão ou por **Escape**, as alterações
são mantidas, assim como a busca, o zoom e a posição de navegação. Trocas são
salvas imediatamente; detalhes e resultados usam o botão de salvar do jogo.

A organização visual segue os vínculos até a final, mesmo quando a ordem
de cadastro dos jogos é diferente. Os confrontos que alimentam um jogo ficam
juntos, e o destino fica centralizado entre eles. Folgas atravessam as fases
puladas pelo espaço livre, sem passar por dentro de outros cartões.
Os atalhos de fase também centralizam os jogos na altura da janela.
O painel e a página pública usam o mesmo desenho, sem mudar o sorteio salvo.

Os botões **Editar fase** permitem ajustar nome, ordem, tipo e visibilidade.
A chave personalizada permite adicionar fases e jogos e configurar o destino
do vencedor no editor. A geração automática atende ao mata-mata simples.
Gerar novamente arquiva a estrutura anterior e exige publicar a nova chave.

## Registrar um resultado

Nas edições ativas e publicadas, use **Atualizar interclasse** na visão geral.
Clique em um jogo na chave, preencha os placares e confira o vencedor sugerido.
Em empate ou W.O., escolha quem avançou. Ajuste data, horário, local e resumo;
**Mais informações do jogo** reúne os demais campos opcionais.
Esse menu preserva as turmas e os caminhos da chave. As folgas mantêm seu
avanço automático, e jogos futuros permitem informar a agenda antes de
conhecer os adversários. O botão **Enviar** salva e publica a atualização,
mostra uma confirmação verde e retorna à visão geral. Não há rascunho nesse menu.

Abra um jogo na chave. No pop-up, ajuste turmas, fase, agenda, local, situação,
placar, vencedor, forma da vitória, resumo, destaques e observações. Marque
a visibilidade do jogo e do placar conforme desejado. Em W.O., informe o
vencedor sem inventar um placar. Ao concluir, o vencedor avança automaticamente.

## Corrigir um resultado

Abra o jogo concluído e informe o motivo. O servidor registra o histórico e
analisa as partidas posteriores. Se houver impacto, o painel apresenta a
confirmação antes de aplicar a correção e limpar resultados incompatíveis.

## Revisar e publicar

Confira a prévia em **Revisar e publicar**. Marque a chave e os jogos,
depois use **Salvar e publicar campeonato**. Publicar a chave libera as fases e partidas
ativas como uma unidade; depois, jogos individuais podem ficar em rascunho.
Documentos e atualizações têm controles de publicação próprios.
Observações internas ficam restritas ao administrador.

Ao publicar, o painel mostra uma janela verde com confirmação e volta à visão
geral. **Salvar rascunho** também volta à lista, com uma confirmação azul de
que a edição foi salva sem publicar. Em uma edição já publicada, essa ação
da etapa final também retira o campeonato do portal; **Salvar alterações**
preserva a publicação. O salvamento feito durante a geração
da chave mantém você no editor para continuar a criação.
Por padrão, a visão geral mostra edições ativas; use **Exibir → Arquivados**
para consultar o histórico.

Na página pública, os campeonatos em andamento aparecem primeiro, com esporte,
categoria e turmas. Ao abrir, a chave permite rolagem, arraste do fundo,
zoom, atalhos de fase e busca por turma. Cada jogo abre os detalhes em pop-up;
Escape fecha a janela e devolve o foco ao jogo. As páginas individuais dos
jogos continuam disponíveis para compartilhar links.

## Banco e validação

As migrações `0005_long_blob.sql` e `0006_redundant_sir_ram.sql` acrescentam
a premiação e o limite opcional de séries sem remover registros.
Em uma base gerenciada desde o início pelo Drizzle, execute
`npm run db:migrate:local` antes de iniciar a nova versão.
O inicializador também reconhece bases de prévia criadas automaticamente e
adiciona as colunas ausentes. Se o histórico local de migrações estiver vazio e
as tabelas já existirem, não reaplique a migração inicial sobre essa base:
use o inicializador da prévia ou uma base isolada para validar as migrações.

Execute `npm run typecheck`, `npm run lint`, `npm run build` e
`npm run test:local`. O teste HTTP cobre cadastro em lote, duplicatas, geração,
troca de posições, aproximação de séries, cadastro inválido, encontros inevitáveis,
folgas em rodadas posteriores, correção do caminho direto, avanço de vencedores e privacidade.
Os testes do domínio conferem todas as quantidades entre duas e 128 turmas.
