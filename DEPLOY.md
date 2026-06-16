# Deploy & Setup — Cadê Imóveis

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TS strict · Tailwind 4 · shadcn (Base UI) · Supabase (Postgres+Auth+Storage) · Vercel.

## Variáveis de ambiente (Vercel + `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://qrhiftyvfsftyvjubmkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # cofre: Cadê — Supabase (anon)
SUPABASE_SERVICE_ROLE_KEY=...            # idem (service_role) — só server
# Sprint 2+: NEXT_PUBLIC_SENTRY_DSN, ANTHROPIC_API_KEY, OPENAI_API_KEY, RESEND_API_KEY
```

## Banco (migrations versionadas em `supabase/migrations/`)
- `*_remote_schema.sql` — 7 tabelas + RLS (capturado do banco).
- `*_storage_buckets.sql` — buckets `imovel-fotos`, `usuario-avatares`, `documentos-negocio`.

**Aplicar buckets no banco** (necessário pro upload de fotos funcionar):
```
SUPABASE_ACCESS_TOKEN=<cofre: Cadê — Supabase> supabase db push
```
> Aditivo (só cria buckets/policies). Sem isso o upload de fotos falha; o resto do painel funciona.

## Deploy na Vercel
1. Conectar o repo `plataformacade-cmyk/sistema-cade-imoveis` ao projeto Vercel (conta Cadê) — deploy = git push.
2. Configurar as env vars acima no projeto Vercel.
3. Preview automático a cada push; produção (`cadeimoveis.com`) só após domínio (Fernando) + gate do Halan.

## Para o Claude Code botar no ar autonomamente
Adicionar em `~/joao-lucas-ucceli/.claude/settings.local.json` → `permissions.allow`:
```
"Bash(supabase db push:*)",
"Bash(supabase migration list:*)",
"Bash(npx vercel:*)",
"Bash(vercel:*)"
```
(O Claude não pode se auto-conceder essas — proteção anti-auto-modificação.)

## Status (Sprint 1 — MVP Fase 0)
✅ Auth (email/senha + Google pronto) · painel (sidebar/dashboard/erros) · CRUD usuários/imóveis/negócios · observabilidade · tema laranja+dark · build verde.
⏳ Pendente de autorização: `db push` (buckets) + deploy Vercel.
⏳ Pendente externo: credencial Google OAuth (Google Cloud do Cadê) · domínio (Fernando) · gate de deploy de produção (Halan).
