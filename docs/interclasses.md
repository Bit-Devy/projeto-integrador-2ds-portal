# Interclasses e campeonatos

A área pública `/eventos/interclasses` lista edições futuras, em andamento, encerradas, adiadas ou canceladas. Cada campeonato possui uma página própria com visão geral, chave, jogos, classificação quando aplicável e regulamento/documentos. Cada partida publicada também possui página própria.

## Onde acessar

- Lista pública: `/eventos/interclasses`;
- Campeonato: `/eventos/interclasses/[slug]`;
- Partida: `/eventos/interclasses/[campeonato]/jogos/[jogo]`;
- Administração: `/painel` → `Interclasses e campeonatos`;
- APIs: `/api/interclasses` e suas rotas de campeonato, partidas e ações administrativas.

Situação e fase atual são campos diferentes. `Em andamento` descreve o campeonato; `Quartas de final`, por exemplo, descreve a fase.

## Como criar um interclasse

1. No painel, abra `Interclasses e campeonatos` e clique em `Novo campeonato`.
2. Preencha a primeira etapa com nome, edição ou ano, modalidade, categoria, turno, datas e descrição.
3. Escolha a situação e mantenha `Rascunho` enquanto prepara a estrutura.
4. Cadastre organização, local, regulamento, observações e documentos confirmados.
5. Salve o campeonato antes de adicionar participantes.

O formato inicial recomendado é `Mata-mata simples`. Use `Chave personalizada` quando os confrontos e avanços não seguirem uma eliminação direta. Os formatos de grupos e pontos corridos estão previstos no modelo; só use as guias que o painel disponibilizar para a edição.

## Participantes

1. Abra o campeonato salvo e vá para a etapa `Participantes`.
2. Clique em `Adicionar participante`.
3. Escolha uma turma cadastrada quando houver vínculo ou informe o nome de exibição da equipe.
4. Defina a posição inicial se a ordem da chave for importante.
5. Repita até completar a edição.

Uma edição possui seus próprios participantes. Arquivar ou renomear uma turma atual não apaga os nomes preservados nas partidas antigas. O servidor impede equipe duplicada no mesmo campeonato e confronto da equipe contra ela mesma.

## Gerar uma chave de mata-mata

1. Confirme a ordem dos participantes.
2. Escolha `Mata-mata simples`.
3. Clique em `Gerar chave`.
4. Revise a prévia: fases, confrontos, classificações automáticas e caminho até a final.
5. Ajuste confrontos, datas, horários e locais, se necessário.
6. Publique a chave somente depois da revisão.

A geração cria elementos reais no banco, não uma imagem. Em quantidades que não são potência de dois, podem existir classificações automáticas. A interface pública explica textualmente quem avançou.

Para uma chave personalizada, crie fases e jogos manualmente e indique, quando necessário, a próxima partida e a posição A ou B que receberá o vencedor.

## Registrar um resultado

1. Abra a partida no painel e clique em `Registrar resultado`.
2. Confira os dois participantes.
3. Informe placar e vencedor. O vencedor precisa ser um dos participantes.
4. Para W.O., escolha a forma `W.O.`; placar numérico não é obrigatório.
5. Escolha se o placar pode ser publicado.
6. Salve.

Na chave eliminatória, o vencedor é encaminhado à próxima partida configurada. O banco registra o resultado anterior, o novo resultado e o impacto do avanço.

## Corrigir um resultado

1. Abra novamente a partida e clique em `Corrigir resultado`.
2. Informe o motivo da correção.
3. Se a mudança atingir uma partida posterior já preenchida, leia a lista de impactos mostrada pelo painel.
4. Confirme conscientemente a alteração ou cancele e corrija primeiro a estrutura da chave.

Uma correção nunca altera silenciosamente jogos posteriores. O servidor responde com conflito antes da confirmação quando encontra resultados ou participantes descendentes. As mudanças aceitas são gravadas juntas e ficam no histórico de resultados.

## Adiar, cancelar e criar jogos

- `Editar partida` altera participantes, rodada, data, hora, local, informações e observações;
- `Adicionar jogo` cria um confronto manual em uma fase;
- `Adiar` preserva a data anterior no histórico e permite deixar a nova data em aberto;
- `Cancelar` mantém a partida para consulta, sem definir vencedor;
- `Data a definir` informa claramente que ainda não existe programação confirmada.

## Encerrar um campeonato

1. Confirme os resultados e a final.
2. Registre o campeão a partir de um participante da edição.
3. Altere a situação para `Encerrado`.
4. Revise fase atual, último resultado, documentos e observações públicas.
5. Publique a edição.

O campeão é preservado com o nome histórico. Duplicar uma edição copia apenas sua estrutura e informações reutilizáveis; resultados, campeão e presenças não são copiados.

## Estrutura do banco

As tabelas principais são `campeonatos`, `participantes_campeonato`, `fases_campeonato`, `partidas`, `historico_resultados_partida` e `campeoes_campeonato`. Documentos e notícias curtas usam `documentos_campeonato` e `atualizacoes_campeonato`. Chaves estrangeiras usam exclusão restrita e registros usados historicamente são arquivados.

Os comandos de migração, teste e publicação estão em [Central de eventos](eventos.md#migração-testes-e-publicação).
