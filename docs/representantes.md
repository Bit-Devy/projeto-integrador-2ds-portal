# Representantes de turma

A página `/representantes` permite procurar a representação publicada das turmas sem divulgar telefone, e-mail pessoal, endereço, dados de login ou observações internas.

## Busca pública

O visitante pode pesquisar por nome ou turma e filtrar por turno, nível de ensino, ano/série, turma e função. A normalização remove diferenças simples de acento, caixa, espaços e símbolos ordinais. Por isso, quando a turma foi cadastrada corretamente, `3º J`, `3° J`, `3 J` e `3J` produzem a mesma busca.

Os resultados aparecem primeiro em cartões. `Ver tabela completa de representantes` abre a tabela ordenável por turma, turno ou nome. Em telas estreitas, a tabela possui rolagem horizontal controlada e mantém cabeçalhos sem reduzir o texto até ficar ilegível.

## Onde acessar

- Página pública: `/representantes`;
- Menu: `Mais` → `Representantes`;
- Administração: `/painel` → `Representantes`;
- API pública e administrativa: `/api/representantes`; a visão administrativa exige sessão.

## Como cadastrar um representante

1. Entre no painel e abra `Representantes`.
2. Clique em `Novo representante`.
3. Informe nome, nível de ensino, ano ou série, turma, turno e função.
4. Se necessário, use um nome de exibição público diferente do nome administrativo.
5. Informe início e fim do mandato.
6. Complete a observação pública e a observação interna nos campos corretos.
7. Mantenha como rascunho até revisar; depois marque como ativo e publicado.

Funções disponíveis inicialmente: titular, vice-representante, suplente e outra função. Os valores internos são normalizados pelo servidor, e os rótulos completos aparecem na interface.

## Como trocar o representante de uma turma

1. Localize o representante anterior.
2. Preencha o fim do mandato e arquive ou desative o registro. Não o exclua.
3. Crie um novo registro para a mesma turma com o início do novo mandato.
4. Publique o novo registro depois de revisar possíveis duplicações.

Esse procedimento preserva as presenças de reuniões antigas, pois cada presença guarda um retrato do nome, turma, turno, nível e função na data em que a lista foi criada.

## Filtros administrativos e revisão

O painel permite busca por nome/turma e filtros de turno, nível, ano e função. Há visões auxiliares para possíveis duplicações e turmas cadastradas sem representante ativo. Uma duplicação é apenas um aviso: confirme mandato e função antes de arquivar qualquer registro.

Registros usados historicamente têm exclusão restrita. Prefira arquivamento lógico. A API pública seleciona campos um a um e nunca inclui `observacao_interna` nem outras informações privadas.

## Importação e exportação

Quando a opção estiver disponível no painel, a importação deve passar por validação, prévia e confirmação. Nunca use uma importação para apagar registros que não aparecem no arquivo. Antes de mudanças em massa, exporte uma cópia e confira turma, turno, função e período de mandato.

## Estrutura do banco

Os dados atuais e históricos ficam em `representantes`. Os campos `nome_normalizado` e `turma_normalizada` e seus índices tornam a busca tolerante às variações. `presencas_reuniao` guarda os retratos históricos, sem depender dos valores atuais.

Os comandos de migração, teste e publicação estão em [Central de eventos](eventos.md#migração-testes-e-publicação).
