# Secrets e ambientes - Cade Imoveis

Ultima revisao: 2026-07-02.

Este documento e o inventario canonico de variaveis para a `OPE-208`. Ele nao deve conter valores reais. Registre evidencias sempre com valores mascarados.

## Ambientes

- Local: `.env.local`, ignorado pelo Git.
- Vercel Development/Preview/Production: Environment Variables do projeto Vercel.
- GitHub Actions: repository secrets em `plataformacade-cmyk/sistema-cade-imoveis`.
- Supabase/Google OAuth: configuracao no dashboard Supabase e Google Cloud, nao em variavel Next.js.

## Matriz de secrets

| Variavel | Onde configurar | Obrigatoria agora | Observacao |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | local, Vercel dev/preview/prod | Sim | URL publica do projeto Supabase `qrhiftyvfsftyvjubmkl`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local, Vercel dev/preview/prod | Sim | Chave publica anon. Pode ir ao browser, mas ainda deve ser tratada como configuracao. |
| `SUPABASE_SERVICE_ROLE_KEY` | local, Vercel server env | Sim para admin | Server-only. Usada por `actions/usuarios.ts`. Nunca usar em Client Component. |
| `SUPA_URL` | local | Sim para scripts | Alias legado para `NEXT_PUBLIC_SUPABASE_URL` em scripts locais. |
| `ANON` | local | Sim para smoke | Alias legado para `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `SROLE` | local | Sim para seeds/smoke | Alias legado para `SUPABASE_SERVICE_ROLE_KEY`. |
| `SUPABASE_ACCESS_TOKEN` | local/operacao | Sim para CLI/API | PAT usado para Supabase Management API e CLI. Nao e variavel de runtime do app. |
| `GITHUB_TOKEN` | local/operacao | Sim para operacao | Token local para GitHub CLI/API quando necessario. |
| `GH_TOKEN` | local/operacao | Sim para operacao | Alias reconhecido pelo `gh`. |
| `OPENAI_API_KEY` | local, GitHub Actions, Vercel | Sim para conteudo real/suporte IA | Sem ela, suporte cai no FAQ e agente de conteudo roda em dry-run. |
| `OPENAI_MODELO_SUPORTE` | local, Vercel | Nao | Default atual: `gpt-4o-mini`. |
| `OPENAI_MODELO` | local, GitHub Actions | Nao | Default atual do agente: `gpt-5`. |
| `IDEOGRAM_API_KEY` | local, GitHub Actions | Sim para capa real | Workflow atual consome essa chave. |
| `ANTHROPIC_API_KEY` | Supabase Vault, local, Vercel, Hermes server | Sim para Hermes | Chave Anthropic validada sem expor valor; usada pelo servico externo. |
| `ANTHROPIC_MODEL` | Supabase Vault, local, Vercel, Hermes server | Sim para Hermes | Default atual: `claude-sonnet-5`. |
| `HERMES_API_URL` | Supabase Vault, local, Vercel | Sim para Hermes | URL do servico Hermes. Atual: `https://hermes.187.77.35.11.sslip.io`. |
| `HERMES_API_TOKEN` | Supabase Vault, local, Vercel, Hermes server | Sim para Hermes | Token service-to-service para Hermes. |
| `PERPLEXITY_API_KEY` | local, GitHub Actions/Hermes | Futuro | Entra quando `OPE-240` migrar pesquisa do agente. |
| `HIGGSFIELD_API_KEY` | local, GitHub Actions/Hermes | Futuro | Entra quando `OPE-240` migrar imagens. |
| `NEXT_PUBLIC_SENTRY_DSN` | local, Vercel | Planejado | Publica por natureza, mas sem implementacao runtime hoje. |
| `RESEND_API_KEY` | local, Vercel | Planejado | E-mail transacional ainda nao implementado. |

## Estado auditado em 2026-07-02

- `.env.local` foi regularizado com Supabase URL, anon key, service role e aliases locais sem expor valores.
- O projeto Supabase `qrhiftyvfsftyvjubmkl` esta visivel via Supabase Management API usando `SUPABASE_ACCESS_TOKEN`.
- A Supabase CLI funciona via `npx.cmd supabase@latest` e o projeto local foi linkado a `qrhiftyvfsftyvjubmkl`.
- `gh auth status` tem login ativo. O token do keyring retorna HTTP 403 para repository secrets, mas `GH_TOKEN` do `.env.local` lista secrets sem erro.
- `OPENAI_API_KEY` e `IDEOGRAM_API_KEY` foram configuradas no GitHub Actions em 2026-07-02.
- O workflow manual `28599556553` confirmou `OPENAI_API_KEY: ***`, `IDEOGRAM_API_KEY: ***` e `Modo: PRODUCAO (chaves configuradas)`. Nao gerou artigo porque a pauta estava vazia.
- A Vercel CLI funciona via `npx.cmd vercel@latest` e esta autenticada como `joaolucasuccelidev-1076`.
- O projeto Vercel `joaolucasucceli/sistema-cade-imoveis` foi criado e linkado em `.vercel/project.json`.
- O projeto Vercel esta com preset `Next.js`, root `.`, Node.js `24.x` e build padrao `npm run build`.
- `vercel env ls --scope joaolucasucceli` lista as variaveis do app em Development, Preview e Production sem expor valores.
- Variaveis sensiveis ficam como `Sensitive` em Production/Preview. Em Development, a Vercel CLI nao aceita `--sensitive`, entao elas aparecem como encrypted/non-sensitive para permitir `vercel dev`.
- O repo GitHub ainda nao ficou conectado ao projeto Vercel. `vercel link --repo --yes` detectou o repo, mas nao selecionou projeto em modo nao interativo; a API publica rejeitou `gitRepository`. Fazer pelo dashboard Vercel > Project Settings > Git ou pelo fluxo de importacao da GitHub App.
- Supabase Auth foi atualizado para `site_url=https://sistema-cade-imoveis.vercel.app` e allow-list: `http://localhost:3000/**`, `http://127.0.0.1:3000/**`, `https://sistema-cade-imoveis.vercel.app/**`, `https://*-joaolucasucceli.vercel.app/**`.
- Google OAuth no Supabase foi habilitado com credencial do Google Cloud: `external_google_enabled=true`, client id presente e client secret presente.
- Smoke OAuth validado: `/auth/v1/authorize?provider=google` retorna redirect para `accounts.google.com` com `state`.

## Checklist para concluir OPE-208

1. Conectar o repo GitHub ao projeto Vercel pelo dashboard/GitHub App.
2. Manter validacao periodica de `vercel env ls` sem valores.
3. Conferir se Preview deve mesmo usar Supabase de producao enquanto nao houver ambiente isolado.
4. Manter `OPENAI_API_KEY` e `IDEOGRAM_API_KEY` configuradas no GitHub Actions; rotacionar se houver exposicao.
5. Validar login Google pelo navegador usando uma conta real e confirmar retorno para `/auth/callback`.
6. Rodar build e smoke local.
7. Rodar workflow manual controlado com pauta pendente quando quiser validar publicacao real de artigo.

## Comandos de validacao

```bash
npm.cmd run secrets:check
npm.cmd run build
gh secret list --repo plataformacade-cmyk/sistema-cade-imoveis
npx.cmd vercel@latest whoami
npx.cmd supabase@latest projects list --output json
```
