# Deploy & Setup - Cade Imoveis

## Stack

Next.js 16 (App Router, Turbopack), React 19, TS strict, Tailwind 4, shadcn/Base UI, Supabase (Postgres/Auth/Storage/RLS) e Vercel.

## Variaveis de ambiente

Use `.env.example` como template e `docs/secrets.md` como inventario canonico. Nunca versionar valores reais.

Obrigatorias para runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Atuais para suporte/conteudo real:

- `OPENAI_API_KEY`
- `OPENAI_MODELO_SUPORTE`
- `OPENAI_MODELO`
- `IDEOGRAM_API_KEY`

Futuras/bloqueadoras para Hermes e marketing:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `HERMES_API_URL`
- `HERMES_API_TOKEN`
- `PERPLEXITY_API_KEY`
- `HIGGSFIELD_API_KEY`

Arquivos e regras:

- `.env.local`: segredos locais; ignorado pelo Git.
- `.env.example`: template vazio; versionado.
- `.vercel/`: link local do projeto Vercel; ignorado pelo Git.
- `SUPABASE_SERVICE_ROLE_KEY`, tokens GitHub/Supabase e chaves de providers nunca podem virar `NEXT_PUBLIC_*`.

## Banco

Migrations versionadas em `supabase/migrations/`:

- `*_remote_schema.sql`: schema + RLS capturado do banco.
- `*_storage_buckets.sql`: buckets `imovel-fotos`, `usuario-avatares`, `documentos-negocio`.

Aplicar migrations/buckets quando a Supabase CLI estiver disponivel:

```bash
SUPABASE_ACCESS_TOKEN=<valor-mascarado> supabase db push
```

## Deploy na Vercel

1. Projeto Vercel: `joaolucasucceli/sistema-cade-imoveis`.
2. Link local: `.vercel/project.json` com project id `prj_YLTxk1gEGIKNHj3byBu47eTOWWBs`.
3. Configurar env vars por escopo: Development, Preview e Production.
4. Rodar `vercel env ls` e registrar apenas nomes/escopos, nunca valores.
5. Preview automatico a cada push; producao (`cadeimoveis.com`) so apos dominio e gate operacional.

Auditoria OPE-208 em 2026-07-02:

- `npx.cmd vercel@latest` funciona e esta autenticado como `joaolucasuccelidev-1076`.
- O projeto `sistema-cade-imoveis` foi criado e linkado no time `joaolucasucceli`.
- Preset confirmado: `Next.js`, root `.`, Node.js `24.x`, build padrao `npm run build`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODELO_SUPORTE`, `OPENAI_MODELO` e `IDEOGRAM_API_KEY` foram configuradas em Development, Preview e Production.
- Production/Preview usam variaveis sensiveis onde aplicavel. Development usa encrypted/non-sensitive porque a Vercel CLI nao permite `--sensitive` nesse escopo.
- Pendente: conectar o repo GitHub `plataformacade-cmyk/sistema-cade-imoveis` ao projeto Vercel pelo dashboard/GitHub App. A CLI `vercel link --repo --yes` nao selecionou projeto em modo nao interativo, e a API publica rejeitou atualizar `gitRepository`.

## GitHub Actions

O workflow `.github/workflows/agente-conteudo.yml` esta ativo. Ele precisa destes repository secrets para sair do dry-run atual:

- `OPENAI_API_KEY`
- `IDEOGRAM_API_KEY`

Auditoria OPE-208 em 2026-07-02:

- `OPENAI_API_KEY` e `IDEOGRAM_API_KEY` foram configuradas no GitHub Actions em 2026-07-02.
- O workflow manual `28599556553` confirmou secrets mascarados e `Modo: PRODUCAO (chaves configuradas)`.
- Nao houve publicacao porque a pauta estava vazia.
- O token GitHub do keyring retornou HTTP 403 para secrets, mas `GH_TOKEN` do `.env.local` conseguiu listar secrets.

## Supabase e Google OAuth

Projeto Supabase esperado: `qrhiftyvfsftyvjubmkl`.

Callbacks minimos para Google OAuth:

- `http://localhost:3000/auth/callback`
- URL de preview Vercel com `/auth/callback`
- dominio final com `/auth/callback`

Auditoria OPE-208 em 2026-07-02:

- `SUPABASE_ACCESS_TOKEN` local consegue enxergar o projeto via Supabase Management API.
- `npx.cmd supabase@latest` funciona.
- O projeto local foi linkado a `qrhiftyvfsftyvjubmkl`.
- `site_url` cloud foi atualizado para `https://sistema-cade-imoveis.vercel.app`.
- Redirect allow-list cloud: `http://localhost:3000/**`, `http://127.0.0.1:3000/**`, `https://sistema-cade-imoveis.vercel.app/**`, `https://*-joaolucasucceli.vercel.app/**`.
- Google OAuth esta ativo no Supabase: `external_google_enabled=true`, client id presente e client secret presente.
- Smoke OAuth validado: endpoint authorize do Supabase retorna redirect para `accounts.google.com` com `state`.

## Validacao

Checklist minimo para concluir OPE-208:

- `npm.cmd run build` verde.
- `npm.cmd run secrets:check` verde para secrets obrigatorios locais.
- Smoke local Supabase client/Auth sem imprimir segredos.
- `gh secret list` funcionando e mostrando pelo menos `OPENAI_API_KEY` e `IDEOGRAM_API_KEY`.
- Workflow manual controlado confirmando producao ou dry-run explicito.
- `vercel env ls` funcionando e listando apenas nomes/escopos.
- Google OAuth Provider ativo no Supabase e smoke de redirect para Google validado.
- Comentario final na `OPE-208` com valores mascarados.
