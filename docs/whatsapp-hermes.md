# WhatsApp Hermes - provider e operacao v1

Ultima revisao: 2026-07-08.

## Decisao

Provider escolhido para a v1: **Meta WhatsApp Cloud API**.

Motivos:

- e o caminho oficial da WhatsApp Business Platform;
- evita dependencia inicial de BSP enquanto o volume e baixo;
- tem sandbox/test number para validacao controlada;
- templates, opt-in, webhooks e status ficam dentro do ecossistema Meta.

Referencias consultadas:

- Meta WhatsApp Business Platform: https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- Meta Cloud API Get Started: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- Meta opt-in: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in
- Templates: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview

## Variaveis

Valores reais nao devem ser documentados.

- `WHATSAPP_PROVIDER=meta_cloud`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_GRAPH_API_VERSION` (default: `v23.0`)
- `WHATSAPP_TEST_TO`

## Templates iniciais

Nomes planejados no WhatsApp Manager:

- `cade_interesse_novo`
- `cade_visita_confirmada`
- `cade_documentos_pendentes`
- `cade_followup_dia_7`
- `cade_suporte_humano`

Todos devem ser criados como templates transacionais/utility, com linguagem
`pt_BR`, sem marketing ou promessa comercial.

## Consentimento e opt-out

Banco:

- `whatsapp_consentimentos`: fonte de opt-in/opt-out por usuario.
- `whatsapp_envios`: auditoria de tentativas, sem telefone aberto.

Regras:

- envio para usuario exige `opt_in=true` e `opt_out=false`;
- envio de teste so pode usar `WHATSAPP_TEST_TO`;
- logs armazenam telefone mascarado;
- a palavra de opt-out e webhook inbound ainda ficam para a proxima fase, quando o webhook Meta estiver configurado.

## Endpoints internos

App principal:

```http
POST /api/hermes/whatsapp/enviar
Authorization: Bearer <HERMES_API_TOKEN>
Content-Type: application/json
```

Hermes:

```http
POST /v1/whatsapp/send
Authorization: Bearer <HERMES_API_TOKEN>
Content-Type: application/json
```

Payload:

```json
{
  "template": "cade_suporte_humano",
  "usuarioId": "uuid-opcional",
  "telefone": "+5534999999999",
  "variaveis": ["Nome", "Resumo"],
  "dryRun": true,
  "teste": true
}
```

## Bloqueio atual

Envio real ainda depende de:

1. WABA/numero configurado no Meta Business;
2. `WHATSAPP_PHONE_NUMBER_ID`;
3. `WHATSAPP_ACCESS_TOKEN`;
4. templates aprovados;
5. numero controlado em `WHATSAPP_TEST_TO`.

Enquanto isso nao existir, o comportamento correto e falha controlada
`provider_not_configured`, com registro em `whatsapp_envios`.
