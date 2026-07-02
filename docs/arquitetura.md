# Arquitetura — Cadê Imóveis

Marketplace imobiliário transacional (estilo QuintoAndar) de Uberlândia/MG. Venda e locação, do anúncio ao contrato, com conversa dentro da plataforma.

Stack: **Next.js 16** (App Router, SSR/SSG) · **Supabase** (Postgres + Auth + Storage + RLS) · **Vercel** (deploy) · **Tailwind 4 + shadcn (Base UI)**.

## 1. Papéis (papel global em `usuarios.papel`)

| Papel | Quem é | Vê no painel |
|---|---|---|
| **cliente** | quem busca/tem interesse (cadastro público nasce assim) | Dashboard, Negociações, Visitas, Configurações + CTA "Anunciar imóvel" |
| **proprietario** | anuncia os próprios imóveis | + Meus imóveis |
| **corretor** | anuncia carteira (tem CRECI) | + Meus imóveis |
| **admin** | equipe Cadê | + Usuários, Corretores, Observabilidade |

Regras: o menu do painel filtra por papel; páginas admin têm **guard server-side** (redirect). Segurança real vem do **RLS** (abaixo), não só do menu.

## 2. Modelo de dados (principais tabelas + relações)

```
auth.users 1—1 usuarios (papel)
              ├─ 1—1 perfis
              ├─ 1—N imoveis (proprietario_id)          imoveis 1—N (fotos[], caracteristicas jsonb, endereco, status)
              ├─ 1—1 corretores (creci)                 imoveis N—1 imobiliarias (opcional)
              └─ N—N negocios via papeis_negocio
negocios (imovel_id, status: qualificacao|visita|proposta|documentos|contrato|cartorial|concluido|perdido)
   ├─ papeis_negocio (usuario_id, papel: proprietario|comprador|corretor|admin)  ← multi-papel canônico
   ├─ conversas 1—N mensagens (autor_id, corpo, lida_em)
   ├─ propostas (autor_id, valor, status: enviada|aceita|recusada|contraproposta)
   ├─ visitas (solicitante_id, data_hora, status, canal)
   └─ documentos / garantia / contrato (Sprint 4)
logs_estruturados (observabilidade)   ·   admins (is_admin)
```

## 3. Segurança (RLS — quem vê o quê)

- `imoveis`: SELECT = `is_admin() OR proprietario_id = auth.uid()` no painel; **vitrine pública** lê `status='ativo'` por policy separada.
- `negocios`/`conversas`/`mensagens`/`propostas`/`visitas`: `is_admin() OR tem_papel_no_negocio(id)` — só quem participa do negócio vê.
- `usuarios`: `is_admin() OR id = auth.uid()` (cada um só se vê).
- Funções `SECURITY DEFINER`: `is_admin()`, `tem_papel_no_negocio()`, `meu_papel()`, `demonstrar_interesse()`.

## 4. Fluxos

**Cadastro/auth:** signup público → `handle_new_user` cria `usuarios` (papel=cliente) + `perfis`. Confirmação de e-mail DESLIGADA → loga direto. Erros traduzidos para PT.

**Jornada transacional (o coração):**
```
busca (vitrine) → imóvel → "Tenho interesse"
   → demonstrar_interesse(): cria negocio + papeis_negocio(comprador) + conversa
   → conversa (mensagens) entre comprador e proprietário/corretor
   → proposta / contraproposta
   → visita (agenda)
   → fechamento: documentos + garantia + contrato + comissão
```
Notificação para os DOIS lados (quem tem interesse e quem recebe) — **a fazer** (ver §6).

## 5. SEO/GEO/AEO (ser achado pelo Google e recomendado pelas IAs)

- JSON-LD: `RealEstateAgent`+`WebSite` (layout), `RealEstateListing`+`Offer` (imóvel), `BlogPosting`+`Person`+`FAQPage`+`Breadcrumb` (artigo), `FAQPage` (como-funciona), `CollectionPage` (bairro).
- `robots.ts` (libera bots de citação, bloqueia CCBot/Bytespider), `sitemap.ts` (páginas+artigos+imóveis+bairros), `llms.txt`.
- **Programmatic SEO**: `/imoveis-em/[bairro]` (uma página citável por bairro).
- Conteúdo: resposta-primeiro, dados, FAQ, frescor (`dateModified`). Base: pesquisa do vault `06-pesquisas/2026-06-13-busca-com-ia-como-ser-recomendado`.

## 6. Agente de conteúdo do blog (automático)

```
GitHub Actions (cron 3x/dia)
   → scripts/agente-conteudo.mjs
        → pauta-conteudo.json (fila de temas)
        → OpenAI (texto SEO/GEO)  [chave = secret]
        → Ideogram (imagem de capa) [chave = secret]
        → grava app/blog/_artigos/<slug>.ts + regenera index
   → git commit + push → Vercel publica (SSG)
```
Blog é **file-based/SSG** (melhor p/ SEO; IA não roda JS). Detalhe em `scripts/AGENTE-CONTEUDO.md`.

## 6.1 Secrets e ambientes

O inventario canonico de variaveis fica em `docs/secrets.md`; o template sem valores fica em `.env.example`.

Regras:

- Valores reais ficam em `.env.local`, Vercel Environment Variables, GitHub Actions Secrets ou dashboards externos.
- `SUPABASE_SERVICE_ROLE_KEY` e tokens de operacao nunca podem ser expostos como `NEXT_PUBLIC_*`.
- O workflow de conteudo atual so sai de dry-run quando `OPENAI_API_KEY` e `IDEOGRAM_API_KEY` existem no GitHub Actions.
- Hermes, Perplexity e Higgsfield estao mapeados como variaveis futuras ate as tasks especificas alterarem o runtime.

## 7. Pendências priorizadas (próximas)

1. **Painel "board" por perfil** (cliente: Negociações como kanban — interesse → conversa → proposta → visita; clicar abre imóvel + histórico). Onboarding pós-cadastro.
2. **Notificações** para os dois lados (novo interesse, nova mensagem, proposta) — tabela `notificacoes` + badge no painel + e-mail (Resend).
3. **Dashboard-01 (shadcn)** no painel + **ícones animados** — próximos ajustes de UI.
4. **Externos:** Google OAuth, Resend, domínio, identidade final (Fernando), termos (Luiz).
