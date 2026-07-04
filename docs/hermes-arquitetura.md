# Hermes - arquitetura e contrato inicial

Ultima revisao: 2026-07-04.

Hermes e o servico externo de IA da Cade Imoveis. Ele roda fora do app Next.js,
no VPS Hostinger, e recebe chamadas service-to-service do app principal.

## Infraestrutura atual

- Host: VPS Hostinger `187.77.35.11`.
- Runtime: Node.js 22.
- Deploy path: `/opt/hermes/current`.
- Env path: `/etc/hermes/hermes.env`.
- Processo: `hermes.service` via systemd.
- Reverse proxy: Nginx.
- Healthcheck publico: `GET https://hermes.187.77.35.11.sslip.io/healthz`.

## Secrets

Valores reais nao devem ser versionados nem escritos em docs.

- `ANTHROPIC_API_KEY`: chave Anthropic usada apenas pelo Hermes.
- `ANTHROPIC_MODEL`: modelo padrao. Atual: `claude-sonnet-5`.
- `HERMES_API_TOKEN`: token Bearer entre app principal e Hermes.
- `HERMES_API_URL`: URL base HTTPS consumida pelo app principal.

Copias operacionais ficam no Supabase Vault e no arquivo `/etc/hermes/hermes.env`
do servidor. O app Next.js deve receber somente `HERMES_API_URL` e
`HERMES_API_TOKEN` no runtime.

## Autenticacao

Toda rota interna do Hermes, exceto `/healthz`, exige:

```http
Authorization: Bearer <HERMES_API_TOKEN>
Content-Type: application/json
```

O token deve ser comparado em tempo constante no servidor. Logs nunca devem
registrar o token, a chave Anthropic nem prompts completos com dados sensiveis.

## Contrato v1

### GET `/healthz`

Resposta 200:

```json
{
  "ok": true,
  "service": "hermes",
  "stage": "ready",
  "startedAt": "2026-07-04T18:00:00.000Z",
  "anthropicConfigured": true,
  "model": "claude-sonnet-5"
}
```

### POST `/v1/support/respond`

Entrada:

```json
{
  "papel": "cliente",
  "pergunta": "Como agendo uma visita?",
  "historico": [
    { "autor": "usuario", "corpo": "Oi" },
    { "autor": "assistente", "corpo": "Como posso ajudar?" }
  ],
  "systemPrompt": "prompt server-side montado pelo app principal"
}
```

Saida 200:

```json
{
  "ok": true,
  "resposta": "Voce agenda a visita dentro da negociacao...",
  "sugereAtendente": false,
  "modo": "hermes",
  "model": "claude-sonnet-5",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 40
  }
}
```

Erros esperados:

- `401 unauthorized`: token ausente ou invalido.
- `400 missing_required_fields`: payload sem `pergunta` ou `systemPrompt`.
- `502 anthropic_error`: erro do provider, sem expor segredo.
- `503 anthropic_not_configured`: chave ausente no servidor.

## Integracao com o app

`lib/suporte/agente.ts` deve tentar Hermes quando `HERMES_API_URL` e
`HERMES_API_TOKEN` estiverem presentes. Se Hermes falhar, o app mantem fallback
para OpenAI e, em ultimo caso, FAQ local. A indisponibilidade do Hermes nao pode
derrubar o widget de suporte.

## Proximas extensoes

- Camada segura de contexto para negocios, visitas, propostas e metricas.
- Jobs de follow-up e repescagem.
- Provider WhatsApp.
- Fila de handoff humano/comercial.
- Social seller/DM Instagram.
