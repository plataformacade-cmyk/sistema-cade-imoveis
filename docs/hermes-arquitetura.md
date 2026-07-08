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
- `CADE_APP_URL`: URL base HTTPS do app principal, usada pelo Hermes para buscar contexto.
- `CADE_APP_CONTEXT_TOKEN`: token Bearer opcional para contexto; se ausente, o Hermes usa `HERMES_API_TOKEN`.

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
  "systemPrompt": "prompt server-side montado pelo app principal",
  "contexto": {
    "escopo": "suporte",
    "id": "00000000-0000-4000-8000-000000000000",
    "limiteMensagens": 20
  }
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

### POST `/v1/automations/run`

Executa manualmente a primeira leva de automacoes Hermes. A chamada e
idempotente no app principal por chave unica diaria/alvo.

Entrada:

```json
{
  "job": "todos",
  "dryRun": false
}
```

### POST `/v1/whatsapp/send`

Encaminha uma solicitacao de WhatsApp para o app principal, que valida
consentimento/opt-out, registra auditoria e usa Meta Cloud API quando as
credenciais estiverem configuradas.

Entrada:

```json
{
  "template": "cade_suporte_humano",
  "usuarioId": "00000000-0000-4000-8000-000000000000",
  "telefone": "+5534999999999",
  "variaveis": ["Nome", "Resumo"],
  "dryRun": true,
  "teste": true
}
```

Sem `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN`, a resposta esperada e
`provider_not_configured`, sem tentar envio real.

Jobs aceitos:

- `todos`
- `suporte_temas`
- `negocios_travados`
- `precos_bairro`
- `saude_sistema`

Saida 200:

```json
{
  "ok": true,
  "job": "todos",
  "dryRun": false,
  "resumo": {
    "total": 4,
    "novos": 2,
    "duplicados_ignorados": 2
  },
  "resultados": []
}
```

## Integracao com o app

`lib/suporte/agente.ts` deve tentar Hermes quando `HERMES_API_URL` e
`HERMES_API_TOKEN` estiverem presentes. Se Hermes falhar, o app mantem fallback
para OpenAI e, em ultimo caso, FAQ local. A indisponibilidade do Hermes nao pode
derrubar o widget de suporte.

## Camada segura de contexto

O app principal expoe apenas um endpoint interno para o Hermes:

```http
POST /api/hermes/contexto
Authorization: Bearer <HERMES_API_TOKEN>
Content-Type: application/json
```

Escopos aceitos:

- `sistema`: contadores operacionais agregados, sem dados pessoais.
- `imovel`: dados publicos/operacionais do imovel, sem logradouro, numero, complemento, CEP ou coordenadas.
- `metricas_imovel`: metricas agregadas 7/30 dias, sem eventos brutos ou identificacao de visitante.
- `negocio`: estado do negocio, visitas, propostas, qualificacao resumida e mensagens mascaradas.
- `suporte`: conversa de suporte e mensagens recentes, com contatos mascarados.

O endpoint usa service role apenas no servidor Next.js, nunca no client, e registra
`hermes_contexto_lido`/`hermes_contexto_negado` em `logs_estruturados`.

## Automacoes Hermes v1

O app principal tambem expoe:

```http
POST /api/hermes/automacoes
Authorization: Bearer <HERMES_API_TOKEN>
Content-Type: application/json
```

Essa rota executa jobs manuais com idempotencia em
`hermes_automacoes_execucoes`:

- temas recorrentes de suporte nos ultimos 7 dias;
- negocios travados sem atualizacao ha mais de 3 dias;
- comparacao inicial de preco por bairro/tipo/operacao, com alerta para desvio acima de 25%;
- saude do sistema baseada em contadores operacionais.

Alertas novos geram notificacao interna para admins e logs
`hermes_automacao_executada`/`hermes_alerta_criado`.

## Proximas extensoes

- Jobs com cron dedicado e repescagem conversacional.
- Webhook inbound do WhatsApp, leitura de opt-out por mensagem e envio real apos WABA/templates.
- Fila de handoff humano/comercial.
- Social seller/DM Instagram.
