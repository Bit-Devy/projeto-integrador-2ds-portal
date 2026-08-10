# Pendências do Mapa do Colégio

Este documento registra somente informações que não podem ser confirmadas com segurança no arquivo de referência. Campos ausentes devem permanecer vazios até serem preenchidos ou confirmados pela administração.

## Fonte analisada

- Arquivo: `ensalamento_2026_definitivo_referencia.pdf`
- SHA-256: `fe7c105aa2c50dcf51ab1ff7a30812e99dcf9b5b767ccc3ec22ccc54b29b7e6b`
- Quantidade de páginas: 1
- Título impresso: “ENSALAMENTO GERAL 2026”
- Data e hora impressas: `04/02/2026 17:17:19`
- Data de criação informada nos metadados: `04/02/2026 17:17:19 -03:00`

O PDF contém uma tabela de ensalamento organizada por andar, Ala Par e Ala Ímpar. Ele não contém planta baixa, mapa gráfico, SVG ou imagem dos corredores. Portanto, nenhuma planta visual, caminho ou posição espacial deve ser inventada a partir desse documento.

A extração verificou 67 salas ou locais numerados e 112 usos por turno: 45 de manhã, 45 à tarde e 22 à noite. Existem 83 rótulos literais distintos e 100 combinações distintas de rótulo e turno.

## Pendências de confirmação

| Página do PDF | Informação | Motivo da dúvida | O que precisa ser confirmado manualmente |
| --- | --- | --- | --- |
| 1 | “Cordenação do CELEM”, sala 303 | O PDF traz literalmente “Cordenação”, sem o segundo “o”. Pode ser um erro ortográfico da fonte. | Confirmar se o nome público correto é “Coordenação do CELEM”. Se corrigido, convém manter a grafia original como alias de busca. |
| 1 | “Cordenação de História”, sala 305 | O mesmo possível erro ortográfico aparece novamente. | Confirmar se o nome público correto é “Coordenação de História”. Se corrigido, convém manter a grafia original como alias de busca. |
| 1 | Siglas `PD`, `DS`, `TT`, `TE`, `SB` e `PAV` | O PDF mostra códigos como `2PD`, `3DS`, `1TT`, `4TE`, `1SB` e `3PAV`, mas não apresenta suas expansões nem declara a qual curso cada um pertence. | Informar o nome completo de cada curso ou modalidade e confirmar quais devem ser classificados como curso técnico. |
| 1 | Siglas `CELEM` e `CURCEP` | Os nomes aparecem em células de turno, mas não são expandidos no PDF. O pedido da funcionalidade associa CELEM a idiomas, porém o documento não informa idioma, curso ou turma específica. | Confirmar o nome público, o tipo de atividade e, se necessário, como distinguir idiomas, cursos ou grupos diferentes. |
| 1 | `PAV` sem número, na sala 113B à noite | Não está claro se é uma atividade genérica, uma turma ou a mesma modalidade representada por códigos como `1PAV` e `3PAV`. | Confirmar o nome, tipo e relação, se houver, entre `PAV`, `1PAV`, `3PAV` e o “Laboratório de PAV” da sala 318. |
| 1 | `Reforço`, nas salas 114 e 116 de manhã e à tarde | O documento não identifica série, disciplina, curso ou grupos diferentes. | Confirmar o tipo da atividade e como distinguir os dois atendimentos simultâneos, caso sejam grupos diferentes. |
| 1 | `DANCEP`, sala 302, e `INFOCEP`, sala 304 | Os textos ocupam células mescladas dos três turnos, como ocorre com nomes de locais, mas também podem representar projetos ou atividades. | Confirmar se são nomes permanentes dos locais, atividades, setores ou ocupações em horário específico. |
| 1 | Siglas `DANCEP`, `INFOCEP`, `SRM`, `DI` e `AHSD` | O PDF não apresenta os nomes completos ou uma categoria administrativa. | Informar os nomes oficiais, aliases desejados e os tipos de local ou atividade. |
| 1 | Salas com texto em célula mesclada | A célula mesclada não comprova que o local funciona nos três turnos. | Confirmar horários e turnos de funcionamento antes de publicar essa informação. |
| 1 | Atividades simultâneas com o mesmo rótulo e turno | CELEM aparece em duas salas de manhã e em cinco salas à tarde e à noite; CURCEP aparece em duas salas à tarde; Reforço aparece em duas salas de manhã e à tarde. O PDF não fornece identificadores de grupo. | Confirmar se cada ocorrência é uma turma separada ou se uma única atividade utiliza várias salas simultaneamente. |
| 1 | Período de validade | O título informa apenas o ano de 2026. Não existem datas inicial e final do ensalamento. | Confirmar as datas de início e fim. Até lá, manter os campos de validade vazios e registrar somente o ano de referência. |
| 1 | Traços nas células de turno | Os traços indicam ausência de ensalamento na tabela, mas não esclarecem se a sala está livre, indisponível ou sem informação. | Confirmar o significado operacional antes de exibir disponibilidade ao público. Não importar os traços como turma ou atividade. |
| 1 | Nome próprio das salas que só possuem número e ensalamento | Para 45 salas, o PDF informa o número e os usos, mas não um nome separado. | Confirmar se devem ser apresentadas apenas como “Sala 114”, “Sala 214” etc. Esse rótulo genérico não deve ser confundido com um nome oficial cadastrado. |
| 1 | Biblioteca, auditório, secretaria, quadra e outros locais institucionais | Esses locais não aparecem no PDF. | Cadastrar manualmente número, ala, andar, descrição e demais informações quando forem conhecidos. |
| 1 | Ala, bloco, setor, corredor, referências e caminhos | O PDF informa somente “Ala Par”, “Ala Ímpar” e os três andares. Não existem Ala A/B, bloco, corredor, referência ou instrução de percurso. | Manter os campos ausentes vazios até confirmação administrativa. |
| 1 | Descrição, observações, acessibilidade, horários e imagens | Nenhum desses campos consta no documento. | Preencher exclusivamente pelo painel administrativo com dados confirmados. |
| 1 | Relações sugeridas apenas pela repetição de uma sigla | Exemplos: `PAV` e “Laboratório de PAV”; códigos `TE` e “Sala de Pranchetas - TE”; CELEM e “Cordenação do CELEM”. A repetição textual não declara uma relação de uso. | Confirmar cada vínculo antes de relacionar automaticamente uma turma ou atividade ao local. |

## Correção de exemplos ilustrativos

O exemplo “3º J na sala 214” apresentado na solicitação não corresponde ao ensalamento do PDF e não deve ser usado como dado inicial.

Na página 1, os dados verificáveis são:

- `3J`: sala 216, Ala Par, 2º andar, turno da manhã;
- sala 214: `3I` pela manhã e `1I` à tarde, sem ensalamento noturno informado;
- `1J`: sala 130, Ala Par, 1º andar, turno da tarde.

O documento não usa “Ala B”. As únicas alas informadas são “Ala Par” e “Ala Ímpar”.

## Cuidados para a carga inicial

- Os números `113B`, `113C`, `213B`, `213C` e `311A` devem ser armazenados como texto.
- As letras `I` e `O` em rótulos como `3I`, `1I`, `2I`, `3O`, `1O` e `2O` são letras no texto interno do PDF, não os algarismos `1` e `0`.
- Campos não presentes na fonte devem permanecer nulos ou vazios.
- A carga não deve expandir siglas por suposição.
- A execução repetida da carga não deve duplicar registros nem sobrescrever mudanças posteriores feitas no painel administrativo.
- Após a carga inicial, o banco e o painel administrativo devem ser a fonte operacional dos dados.
