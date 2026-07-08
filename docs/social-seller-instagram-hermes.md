# Social seller e DM Instagram via Hermes

Documento da OPE-253. O objetivo e definir o escopo seguro para um futuro
social seller no Instagram sem ativar automacao de envio antes de credenciais,
permissoes e teste controlado.

## Decisao de provider

Provider planejado: Meta Instagram Messaging API.

Fontes oficiais consultadas em 2026-07-08:

- Instagram Messaging: https://developers.facebook.com/documentation/business-messaging/instagram-messaging
- Overview: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/overview
- Send Message: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/send-message
- Human Agent: https://developers.facebook.com/docs/features-reference/human-agent/
- Platform policy: https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy

## Escopo v1

Hermes pode ajudar em conversas organicas iniciadas pelo usuario, sempre dentro
da janela permitida pela Meta e com handoff humano quando houver sinal comercial
sensivel.

Permitido na v1:

- responder perguntas frequentes sobre compra, venda, aluguel e anuncios;
- qualificar demanda basica e sugerir links da plataforma;
- direcionar para imoveis, cadastro, anuncio e suporte humano;
- registrar resumo operacional da conversa sem guardar segredo ou token;
- criar handoff humano quando houver lead quente, duvida juridica, proposta,
  negociacao de valor, tentativa de contato externo ou pedido para parar.

Fora do escopo v1:

- iniciar DM frio sem acao previa do usuario;
- responder fora da janela permitida sem tag/recurso aprovado pela Meta;
- prometer assessoria juridica ou financeira automatizada;
- manipular orcamento, lances, campanhas ou criativos de trafego pago;
- publicar comentarios ou DMs em massa;
- enviar contato direto de compradores/proprietarios fora dos fluxos formais.

## Regras operacionais

- Janela padrao: Hermes deve considerar a janela de resposta de 24 horas apos
  mensagem do usuario.
- Human Agent: se conversa precisar de humano alem da janela padrao, usar apenas
  quando o app tiver permissao/recurso aprovado e dentro do prazo permitido.
- Opt-out: mensagens como "parar", "nao quero", "remover" ou equivalentes devem
  encerrar a cadencia e criar registro operacional.
- Frequencia: no maximo uma resposta automatizada por mensagem recebida; sem
  sequencia ativa sem novo gatilho do usuario.
- Handoff: qualquer intencao transacional forte deve ir para operador/corretor.
- Privacidade: logs guardam IGSID, status, motivo e resumo sanitizado; nao
  guardar token, telefone, e-mail aberto, documentos ou endereco completo.

## Credenciais e permissoes pendentes

Variaveis planejadas:

- `INSTAGRAM_PROVIDER=meta_instagram_messaging`
- `INSTAGRAM_PAGE_ID`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_VERIFY_TOKEN`
- `INSTAGRAM_GRAPH_API_VERSION`
- `INSTAGRAM_TEST_IGSID`

Checklist Meta:

- Conta Instagram profissional Business ou Creator.
- Pagina Facebook vinculada ao Instagram.
- App Meta com produto/permissoes de Instagram Messaging.
- Webhook configurado para eventos de mensagem.
- Token com permissoes revisadas/aprovadas para producao.
- Usuario/IGSID de teste controlado.
- Revisao de politica da Messenger Platform e Instagram Messaging API.

## Arquitetura planejada

Entrada:

```text
Instagram DM/Webhook -> Hermes -> contexto seguro Cadê -> resposta ou handoff
```

Componentes:

- Hermes recebe webhook/evento do provider.
- Hermes valida assinatura do webhook e origem.
- Hermes consulta contexto publico/seguro quando necessario.
- Hermes decide: resposta automatica curta, link da plataforma ou handoff humano.
- Handoff reutiliza a fila `negocio_handoffs_humanos` quando houver negocio
  relacionado; caso contrario cria atendimento comercial futuro a ser modelado.

## Teste controlado antes de envio real

Antes de ativar producao:

1. configurar credenciais em ambiente restrito;
2. cadastrar `INSTAGRAM_TEST_IGSID`;
3. receber webhook de uma conta teste;
4. responder uma mensagem simples dentro da janela de 24h;
5. testar pedido de opt-out;
6. testar handoff humano;
7. validar logs sem tokens ou dados sensiveis;
8. confirmar que nenhuma acao de midia paga foi executada.

## Estado atual

Em 2026-07-08, nao ha credenciais Meta/Instagram configuradas no projeto. A OPE-253
fica entregue como discovery tecnico e governanca operacional. Implementacao de
envio real deve abrir nova task quando as credenciais e permissoes existirem.
