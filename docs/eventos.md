# Central de eventos e eventos internos

O Portal GECEP possui uma central pública em `/eventos`. Ela reúne os próximos eventos, o que está acontecendo, interclasses em andamento, próximos jogos e reuniões ou atas recentes. A central não possui agenda escrita no código: os cartões são montados a partir do banco D1.

## Onde acessar

- Central pública: `/eventos`;
- Eventos internos: `/eventos/internos`;
- Página de um evento: `/eventos/internos/[slug]`;
- Endereço antigo preservado: `/calendario`, que encaminha para os eventos internos;
- Administração: `/painel` → `Eventos internos`;
- API pública: `GET /api/eventos`;
- API administrativa: a mesma rota com `todos=1` e os métodos de escrita, sempre com sessão.

“Evento interno” aqui significa uma atividade realizada no colégio ou organizada pelo GECEP. Reuniões entre membros do GECEP ficam na área própria de reuniões.

## Como cadastrar um evento

1. Entre em `/login` e abra o painel.
2. Escolha `Eventos internos`.
3. Clique em `Novo evento`.
4. Informe título e data inicial. Complete somente os dados confirmados: subtítulo, categoria, descrição, horário, local, turno, público, organização, programação e orientações.
5. Envie a capa, imagens ou documentos, se existirem. Imagens aceitas são PNG, JPG e WebP; documentos também podem ser PDF; o limite é 10 MB por arquivo.
6. Escolha a situação separadamente da publicação. Um evento pode estar adiado e ainda ser um rascunho, por exemplo.
7. Use `Salvar rascunho` para revisar ou `Salvar e publicar` quando a informação puder aparecer no portal.

O endereço público amigável é criado a partir do título. Campos vazios não aparecem na página pública.

## Situações e arquivo

- `Próximo`: atividade confirmada que ainda não começou;
- `Em andamento`: atividade acontecendo;
- `Encerrado`: atividade concluída;
- `Adiado`: a realização foi postergada;
- `Cancelado`: a atividade não será realizada;
- `Arquivado`: registro histórico retirado das listas atuais.

Use arquivamento para preservar registros. Não exclua um evento que já possua documentos ou referência histórica. A listagem pública permite consultar encerrados e o arquivo por ano.

## Duplicar e alterar um evento

O botão `Duplicar` prepara uma cópia em rascunho. Revise datas, título, anexos e situação antes de salvar. A cópia não é publicada automaticamente.

Ao alterar datas ou local, salve o registro normalmente. A data da última atualização é atualizada pelo servidor e aparece na página detalhada quando publicada.

## Dados e segurança

Os eventos ficam em `eventos_internos`, e os anexos em `documentos_eventos`. Rascunhos, observações internas e registros inativos não fazem parte da resposta pública. Textos são exibidos pelo React como texto, sem executar HTML enviado pelo formulário. URLs aceitam somente caminhos internos ou HTTP(S).

Uploads têm a assinatura binária conferida. Anexos privados exigem sessão administrativa até que sua visibilidade seja alterada explicitamente.

## Migração, testes e publicação

Depois de receber uma versão com mudança de banco:

```bash
npm run db:migrate:local
npm run typecheck
npm run lint
npm run build
npm test
npm run test:local
```

Em uma instalação nova, aplique as migrações **antes de iniciar o portal pela primeira vez**. O inicializador de compatibilidade também cria tabelas com `IF NOT EXISTS`; bancos locais antigos que foram abertos antes de existir o ledger do Wrangler podem, portanto, já ter `conteudos` sem que a migração `0000` esteja registrada. Se o Wrangler informar `table conteudos already exists`, não apague `.wrangler` nem dados reais: faça backup, confira o schema e adote uma base nova para desenvolvimento ou reconcilie o ledger com acompanhamento técnico. A cadeia `0000` a `0004` deve ser validada em uma base vazia antes de qualquer publicação.

Para gerar uma migração após uma alteração futura em `db/schema.ts`, use `npm run db:generate` e revise o SQL antes de aplicá-lo. Para publicar, configure o banco D1 e o bucket R2 reais, aplique `npm run db:migrate:remote` e só então execute `npm run deploy`.

Não use o identificador D1 de exemplo de `wrangler.jsonc` em produção. `ADMIN_PASSWORD` e `SESSION_SECRET` devem ser segredos do ambiente, nunca valores escritos no repositório.

Veja também [Interclasses](interclasses.md), [Reuniões e atas](reunioes-e-atas.md) e [Representantes](representantes.md).
