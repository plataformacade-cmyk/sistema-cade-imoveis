# Engines - Cade Imoveis

Este arquivo consolida a auditoria tecnica do projeto e deve ser o primeiro mapa para qualquer proxima manutencao. A regra local em `AGENTS.md` continua valendo: antes de escrever codigo neste repo, leia os guias relevantes em `node_modules/next/dist/docs/`, porque o projeto usa Next.js 16.

Ultima auditoria: 2026-07-02.

## Visao do Produto

Cade Imoveis e um marketplace imobiliario transacional focado em Uberlandia/MG. A plataforma cobre a jornada de compra, venda e locacao: vitrine publica, cadastro de imoveis, demonstracao de interesse, conversa, proposta, visita, documentos, contrato, comissao, notificacoes e suporte.

As superficies principais sao:

- Site publico e SEO: `/`, `/plataforma`, `/plataforma/imoveis/[id]`, `/imoveis-em/[bairro]`, `/blog`, `/como-funciona`, `/sobre`, `/termos`, `/privacidade`.
- Autenticacao e onboarding: `/login`, `/cadastro`, `/cadastro/completar`, `/recuperar-senha`, `/auth/callback`.
- Painel autenticado: `/painel`, `/painel/imoveis`, `/painel/negocios`, `/painel/mensagens`, `/painel/visitas`, `/painel/notificacoes`, `/painel/configuracoes`.
- Painel admin: `/painel/usuarios`, `/painel/corretores`, `/painel/observabilidade`, `/painel/suporte`.

## Stack

- Next.js 16.2.9 com App Router, `proxy.ts` e Server Components por padrao.
- React 19.2.4, TypeScript strict, Tailwind CSS 4.
- shadcn/Base UI, lucide-react, sonner, motion, recharts.
- Supabase para Postgres, Auth, Storage e RLS.
- Vercel para deploy.
- OpenAI opcional para suporte e geracao de conteudo.
- Ideogram opcional para capas do agente de conteudo.

## Comandos

No Windows, prefira `npm.cmd` quando estiver no PowerShell:

```bash
npm.cmd ci
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd audit
```

O `node_modules` nao deve ser versionado. Se ele nao existir, rode `npm.cmd ci` antes de consultar a documentacao local do Next.

## Variaveis de Ambiente

Use `.env.example` como template e `docs/secrets.md` como inventario canonico da `OPE-208`.

Obrigatorias para o app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Obrigatoria apenas para operacoes server-side privilegiadas:

- `SUPABASE_SERVICE_ROLE_KEY`: usada hoje para convite administrativo em `actions/usuarios.ts`.

Opcionais:

- `OPENAI_API_KEY`: habilita respostas por modelo no suporte e texto real no agente de conteudo.
- `OPENAI_MODELO_SUPORTE`: modelo do suporte, fallback atual `gpt-4o-mini`.
- `OPENAI_MODELO`: modelo do agente de conteudo, fallback atual `gpt-5`.
- `IDEOGRAM_API_KEY`: habilita geracao real de capas no agente de conteudo.
- `NEXT_PUBLIC_SENTRY_DSN` e `RESEND_API_KEY`: planejadas/pendentes conforme docs de deploy.

Aliases locais usados por scripts:

- `SUPA_URL`: alias de `NEXT_PUBLIC_SUPABASE_URL`.
- `ANON`: alias de `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SROLE`: alias de `SUPABASE_SERVICE_ROLE_KEY`.

Futuras para Hermes/marketing:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `HERMES_API_URL`
- `HERMES_API_TOKEN`
- `PERPLEXITY_API_KEY`
- `HIGGSFIELD_API_KEY`

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, tokens GitHub, tokens Supabase, `HERMES_API_TOKEN` ou chaves de providers em Client Components, rotas publicas ou bundle do navegador.

## Estrutura

- `app/`: rotas App Router, layouts, pages, route handlers, metadata, sitemap, robots e partes colocalizadas por feature.
- `actions/`: Server Actions para mutacoes de auth, imoveis, negocios, mensagens, propostas, visitas, documentos, contrato, comissao, usuarios, corretores, configuracoes e suporte.
- `components/`: UI compartilhada, shell do painel, componentes publicos e widget de suporte.
- `lib/`: Supabase server/client/session, auth, logs, SEO, contrato e suporte.
- `supabase/migrations/`: schema, policies, funcoes, triggers e buckets.
- `scripts/`: agente de conteudo, seeds e smoke flows.
- `public/`: assets da marca, imagens institucionais, blog, videos hero, icones e `llms.txt`.
- `docs/`: documentacao de arquitetura.

## Arquitetura Next.js

- Pages e layouts sao Server Components por padrao.
- Client Components usam `"use client"` apenas onde ha estado, eventos, browser APIs ou upload.
- Em Next.js 16, `params` e `searchParams` sao promises nas pages dinamicas; o codigo ja segue esse padrao.
- `proxy.ts` substitui middleware e fica na raiz. Ele apenas atualiza a sessao Supabase e redireciona usuarios sem login para `/login` quando acessam `/painel`.
- Route handlers existentes: `/api/suporte` e `/auth/callback`.
- Evite inicializar SDKs com segredo no escopo de modulo. Inicialize dentro de funcoes server-side, como ja acontece com o service role em `convidarUsuario`.

## Auth e Papeis

`lib/auth.ts` expoe `getSessao()`, que retorna usuario, `papel`, `isAdmin` e `anuncia`.

Papeis globais:

- `cliente`: busca imoveis, conversa, propostas, visitas e pode iniciar onboarding para anunciar.
- `proprietario`: anuncia os proprios imoveis.
- `corretor`: anuncia carteira e participa de negocios.
- `admin`: ve administracao, usuarios, corretores, suporte e observabilidade.

O cadastro publico nasce como `cliente`. O onboarding em `/cadastro/completar` promove para `proprietario` quando o usuario escolhe anunciar.

## Supabase e Modelo de Dados

Tabelas centrais:

- Identidade: `usuarios`, `perfis`, `admins`.
- Catalogo: `imoveis`, `imobiliarias`, `corretores`.
- Transacao: `negocios`, `papeis_negocio`, `conversas`, `mensagens`, `propostas`, `visitas`.
- Fechamento: `documentos`, `contratos`, `comissoes`.
- Operacao: `notificacoes`, `logs_estruturados`.
- Suporte: `suporte_conversas`, `suporte_mensagens`.

Funcoes e triggers importantes:

- `handle_new_user`: cria `usuarios` e `perfis` no signup.
- `is_admin`, `meu_papel`, `tem_papel_no_negocio`: base de autorizacao/RLS.
- `demonstrar_interesse`: cria negocio, papeis e conversa de forma RLS-safe.
- Triggers de notificacao para interesse, mensagens, propostas e suporte.

Buckets:

- `imovel-fotos`: publico para fotos de anuncios.
- `usuario-avatares`: publico para avatares.
- `documentos-negocio`: privado; use signed URL para leitura.

Seguranca real vem de RLS. O menu e guards server-side melhoram UX, mas nao substituem policies.

## Fluxos Principais

1. Busca publica: `/plataforma` filtra `imoveis` ativos por busca, tipo, bairro, quartos e valor.
2. Detalhe do imovel: `/plataforma/imoveis/[id]` mostra apenas `status = ativo`, JSON-LD, mapa, bairro, relacionados e CTA de interesse.
3. Interesse: `actions/interesse.ts` chama RPC `demonstrar_interesse`, registra eventos e abre a jornada no painel.
4. Negociacao: `/painel/negocios` e `/painel/negocios/[id]` reune status, participantes, conversa e propostas.
5. Mensagens: `actions/mensagens.ts` garante conversa e insere mensagens com RLS.
6. Visitas: `actions/visitas.ts` agenda, muda status e reagenda.
7. Documentos: upload client-side para `documentos-negocio`, persistencia server-side em `actions/documentos.ts`, leitura por signed URL.
8. Contrato: `actions/contratos.ts` gera contrato e aplica a regra de escritura publica para venda acima de 30 salarios minimos.
9. Comissao: `actions/comissoes.ts` valida split captador/vendedor e calcula valor.
10. Suporte: widget global chama `/api/suporte`; usa FAQ local sem chave e modelo OpenAI quando configurado.

## Conteudo e SEO

O blog e file-based/SSG. Cada artigo vive em `app/blog/_artigos/*.ts` e `app/blog/_posts.ts` resolve autor e tempo de leitura. Hoje ha 33 artigos.

O agente de conteudo em `scripts/agente-conteudo.mjs`:

- Le `scripts/pauta-conteudo.json`.
- Gera texto via OpenAI quando ha chave.
- Gera capa via Ideogram quando ha chave.
- Escreve artigo em `app/blog/_artigos`.
- Regenera `app/blog/_artigos/index.ts`.
- O workflow `.github/workflows/agente-conteudo.yml` agenda a execucao e commita o resultado.

SEO/GEO/AEO:

- `lib/seo.ts` gera JSON-LD de organizacao, site, breadcrumbs, FAQ, artigos e imoveis.
- `app/sitemap.ts` inclui paginas estaticas, perfis, artigos, bairros programaticos e imoveis ativos.
- `app/robots.ts` libera rotas publicas e bloqueia `/painel` e `/api`.
- `public/llms.txt` resume a plataforma para crawlers e IAs.

## Regras de Implementacao

- Leia `AGENTS.md` e a documentacao local do Next antes de alterar codigo.
- Mantenha dados sensiveis no server. Client Components podem usar apenas envs `NEXT_PUBLIC_*`.
- Use `createClient()` de `lib/supabase/server` em Server Components, Server Actions e route handlers.
- Use `lib/supabase/client` apenas em componentes client-side.
- Preserve RLS como fonte de autorizacao. Ao criar mutacao que usuario comum nao pode fazer diretamente, prefira RPC `SECURITY DEFINER` bem validada.
- Depois de mutacoes, use `revalidatePath` para as rotas impactadas.
- Registre eventos relevantes com `registrarEvento`, sem deixar logging derrubar a operacao principal.
- Para arquivos privados, grave path no banco e gere signed URL no server.
- Para UI do painel, mantenha densidade operacional; para publico, preserve SEO, JSON-LD e acessibilidade.
- Nao aplique `npm audit fix --force` sem revisar. O audit atual aponta PostCSS transitivo via Next; a correcao sugerida pelo npm e downgrade major invalido para este projeto.

## Pendencias e Riscos Conhecidos

- `README.md` ainda esta no template do create-next-app; `engines.md` e `docs/arquitetura.md` sao a referencia tecnica real por enquanto.
- `SITE.url` em `lib/seo.ts` ainda aponta para a URL Vercel provisoria. Atualize quando o dominio final entrar.
- `npm audit` em 2026-07-02 reportou 2 vulnerabilidades moderadas: `postcss < 8.5.10` transitivo em `next`. Monitorar patch de Next compatível em vez de aceitar downgrade sugerido.
- Google OAuth depende de credenciais externas configuradas no Supabase.
- E-mail transacional e Sentry aparecem como planejados, mas nao estao implementados no runtime.
- Os testes automatizados sao limitados a lint/build/scripts; nao ha suite unit/e2e versionada.
