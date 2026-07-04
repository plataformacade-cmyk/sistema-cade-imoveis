# Agente de conteúdo automático — Blog Cadê Imóveis

Produz artigos de blog otimizados para **SEO + GEO/AEO** (ranquear no Google e ser citado/recomendado pelas IAs) e publica sozinho, na frequência que você definir (hoje: **3x/dia**).

## Como funciona (visão de 1 minuto)

1. Uma **pauta** de temas mora em [`scripts/pauta-conteudo.json`](./pauta-conteudo.json).
2. O **GitHub Action** [`agente-conteudo.yml`](../.github/workflows/agente-conteudo.yml) roda 3x/dia, chama `scripts/agente-conteudo.mjs`.
3. O script: gera o **texto** (OpenAI) já no formato SEO/GEO (resposta-primeiro, dados, FAQ, links internos), gera a **imagem de capa** (Ideogram), grava um arquivo `app/blog/_artigos/<slug>.ts` e regenera o índice.
4. Faz **commit + push** → a Vercel publica automaticamente. O artigo entra no blog, no `sitemap.xml` e com JSON-LD (Article + FAQPage) prontos.

> Por que GitHub Action e não cron na Vercel: função serverless da Vercel é read-only (não escreve arquivo no repo). O Action escreve e dá commit — e o blog continua 100% estático (melhor para SEO e para as IAs, que não rodam JavaScript).

## ⚠️ O que falta (você faz quando quiser ligar)

As chaves de API estão como **placeholder**. Sem elas, o script roda em **dry-run** (cria um artigo de exemplo, sem chamar API nem gastar). Para ligar de verdade:

1. **OpenAI** — pegue a chave em platform.openai.com.
2. **Ideogram** — pegue a chave em ideogram.ai (API).
3. No GitHub do projeto: **Settings → Secrets and variables → Actions → New repository secret**, crie:
   - `OPENAI_API_KEY`
   - `IDEOGRAM_API_KEY`
4. (Opcional) ajuste o modelo em `OPENAI_MODELO` dentro do script.

Pronto. No próximo horário, o agente publica de verdade.

## Rodar na mão (teste)

```bash
# dry-run (sem chaves, sem custo) — gera 1 artigo de exemplo
node scripts/agente-conteudo.mjs --quantos 1

# com chaves (produção)
OPENAI_API_KEY=sk-... IDEOGRAM_API_KEY=... node scripts/agente-conteudo.mjs --quantos 3
```

## Mexer na pauta

Edite `scripts/pauta-conteudo.json` e adicione `{ "tema": "...", "publicado": false }`. O agente pega os `publicado:false` mais antigos primeiro e marca como `true` ao publicar.

Tambem existe uma fila revisavel de pautas reais:

```bash
node scripts/pauta-reais.mjs gerar
node scripts/pauta-reais.mjs listar
node scripts/pauta-reais.mjs aprovar --id real-exemplo
```

O agente ignora itens com `status:"revisao"` ou `status:"descartada"`. Somente pautas aprovadas ou pautas manuais sem status entram na publicacao.

Para validar a fila sem gerar artigo:

```bash
node scripts/agente-conteudo.mjs --validar-pauta
```

## Reaproveitar em social

Use `scripts/social-conteudo.mjs` para transformar um artigo em carrossel, noticia, design estatico ou roteiro/avatar. O script gera rascunhos em `scripts/social-conteudo.json`; nada e publicado automaticamente.
