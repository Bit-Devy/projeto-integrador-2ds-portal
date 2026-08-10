# Reuniões, atas e presenças

A página `/eventos/reunioes` apresenta somente reuniões publicadas. Existem dois tipos: reunião com representantes de turma e reunião interna do GECEP. Cada página possui guias compartilháveis para resumo, presenças e ata/documentos.

## Onde acessar

- Lista pública: `/eventos/reunioes`;
- Reunião: `/eventos/reunioes/[slug]?guia=resumo`;
- Presenças: a mesma página com `guia=presencas`;
- Ata e documentos: a mesma página com `guia=documentos`;
- Administração: `/painel` → `Reuniões, atas e presenças`;
- APIs: `/api/reunioes` e as rotas relacionadas à reunião.

Atualizar a página preserva a guia escolhida porque a guia faz parte da URL.

## Como criar uma reunião

1. Abra a área administrativa e clique em `Nova reunião`.
2. Escolha `Reunião com representantes` ou `Reunião interna do GECEP`.
3. Preencha título, data, horário, local, turno, níveis de ensino e responsáveis.
4. Cadastre pauta, resumo, discussões, decisões, propostas e encaminhamentos somente quando existirem.
5. Salve como rascunho.

Para reuniões internas, a pauta e as observações internas permanecem privadas. Nada interno se torna público por estar preenchido: cada documento, item ou votação possui controle próprio de publicação.

## Tarefas, propostas e moções

Na reunião salva, use `Adicionar item` e escolha o tipo. Uma tarefa pode ter título, descrição, responsáveis e prazo. Itens estruturados ficam ligados à reunião correta e podem ser publicados individualmente.

## Como registrar presenças

Para uma reunião de representantes:

1. Abra a guia administrativa `Presenças`.
2. Clique em `Gerar lista de representantes`.
3. Antes de gerar, filtre por nível, turno, ano/série ou turma, se a reunião não envolver todos.
4. Revise a prévia e confirme.
5. Use seleção em massa para marcar todos como presentes, ausentes, ausência justificada ou não se aplica.
6. Corrija exceções diretamente na tabela.
7. Clique em `Salvar presenças`.

Cada linha copia nome, turma, turno, nível e função naquele momento. Trocar o representante atual depois não modifica a lista antiga. Para reunião interna, membros podem ser adicionados diretamente sem vincular um representante de turma.

As observações internas da presença não aparecem na API pública. A quantidade de participantes só aparece quando a gestão habilita essa publicação.

## Como publicar uma ata ou documento

1. Abra a reunião e a seção `Ata e documentos`.
2. Escreva o resumo ou a ata no próprio sistema para que o visitante entenda o básico sem baixar arquivo.
3. Clique em `Adicionar documento`.
4. Informe título, tipo, descrição, data e ordem.
5. Envie PDF/imagem ou informe um link HTTP(S) autorizado.
6. Marque o documento como público somente depois de revisar seu conteúdo.
7. Publique a reunião.

Arquivos enviados como privados exigem a sessão administrativa mesmo que alguém possua a URL. Excluir um anexo não apaga a reunião nem a ata escrita. Prefira desativar o vínculo e só remova o objeto do armazenamento depois de verificar suas referências.

## Como adicionar uma votação

1. Abra `Votações` na reunião salva.
2. Informe título, pergunta ou proposta e contexto.
3. Adicione as opções com o total agregado de votos de cada uma.
4. Informe abstenções, resultado, decisão final e observação.
5. Escolha explicitamente se a votação é pública.

O sistema publica totais e resultado, não votos individuais. Uma votação marcada como interna é excluída da resposta pública mesmo dentro de uma reunião publicada.

## Duplicar, cancelar e arquivar

- `Duplicar reunião` copia a estrutura, mas nunca copia presenças;
- `Adiar` mantém o registro e permite informar a nova programação;
- `Cancelar` publica o cancelamento sem apagar pauta ou histórico;
- `Arquivar` retira a reunião das listas atuais e preserva ata, documentos e presenças.

## Estrutura do banco

As reuniões usam `reunioes`, `itens_reuniao`, `votacoes_reuniao`, `opcoes_votacao_reuniao`, `documentos_reuniao` e `presencas_reuniao`. As presenças possuem vínculo opcional com `representantes` e campos de retrato histórico obrigatórios.

Os comandos de migração, teste e publicação estão em [Central de eventos](eventos.md#migração-testes-e-publicação).
