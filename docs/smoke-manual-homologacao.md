# Suite de smoke manual - Cadê Imóveis

Data-base: 2026-07-04  
Linear: OPE-247

Esta suite complementa o smoke técnico `scripts/smoke-fluxos.mjs`. O objetivo é validar, em produção ou preview controlado, que as jornadas principais continuam funcionando para pessoas reais, com evidência simples e sem expor dados sensíveis.

## Pré-condições

- Produção publicada na Vercel.
- `npm.cmd run build`, `npm.cmd run lint` e `npm.cmd run secrets:check` verdes.
- Supabase Auth Google ativo.
- Pelo menos um imóvel ativo de venda e um de locação.
- Contas de teste:
  - comprador/locatário;
  - proprietário/locador;
  - corretor ou admin;
  - usuário externo sem vínculo com negócio.
- Evidências permitidas:
  - URL da tela;
  - horário do teste;
  - status final;
  - prints sem token, sem cookie, sem segredo e sem dados pessoais reais.

## Smoke 1 - Vitrine pública e privacidade

1. Abrir `/plataforma`.
2. Abrir detalhe de imóvel ativo.
3. Conferir que bairro, cidade, preço, fotos e CTA aparecem.
4. Conferir que logradouro, número, complemento, CEP e coordenada exata não aparecem para anônimo.
5. Conferir que "Sobre o bairro" mostra POIs reais quando o bairro estiver mapeado.
6. Conferir que o mapa público usa localização aproximada.

Aceite: página carrega sem erro, imóvel é entendível para decisão inicial e endereço sensível não aparece.

## Smoke 2 - Cadastro, Google OAuth e CTA de anúncio

1. Na home, clicar em "Anunciar imóvel".
2. Confirmar que o cadastro preserva a intenção de anúncio.
3. Criar conta por e-mail ou Google.
4. Aceitar termos pendentes quando solicitado.
5. Confirmar redirecionamento para o fluxo de proprietário e `/painel/imoveis/novo`.

Aceite: usuário que quer anunciar não cai no wizard de busca.

## Smoke 3 - Interesse sem login

1. Como anônimo, abrir imóvel ativo.
2. Clicar em "Tenho interesse".
3. Confirmar redirect para login/cadastro com `next` interno.
4. Entrar com comprador.
5. Confirmar que o negócio criado é do imóvel original.
6. Repetir o clique no mesmo imóvel com o mesmo usuário.

Aceite: não perde `imovel_id` e clique duplicado reaproveita o negócio existente.

## Smoke 4 - Chat, visita e proposta

1. Abrir conversa do negócio como proprietário/corretor.
2. Sugerir visita pelo chat.
3. Confirmar como comprador.
4. Marcar visita como realizada como proprietário/corretor/admin.
5. Enviar proposta ou contraproposta pelo chat.
6. Aceitar proposta como participante diferente do autor.

Aceite: cards aparecem no chat, status do negócio avança para `visita`, depois `proposta`, depois `documentos`.

## Smoke 5 - Bloqueio de contato

1. No chat, tentar enviar telefone, e-mail, link `wa.me` e frase pedindo WhatsApp.
2. Repetir em condição de proposta.
3. Repetir em observação de visita.
4. Conferir observabilidade/admin.

Aceite: mensagem não é publicada, aviso educativo aparece e tentativa fica registrada de forma mascarada.

## Smoke 6 - Documentos, CNPJ e certidões

1. Abrir documentos do negócio.
2. Conferir checklist por comprador, vendedor, imóvel e contrato/minuta.
3. Enviar documento como participante.
4. Reprovar documento como admin/corretor com motivo.
5. Declarar vendedor sem empresa.
6. Cadastrar CNPJ válido para vendedor e vincular ao negócio.
7. Anexar certidões empresariais por CNPJ.

Aceite: checklist muda por perfil, arquivo privado abre só para participante autorizado e certidão fica ligada ao CNPJ correto.

## Smoke 7 - Serviço jurídico Cadê

1. No cadastro/edição do imóvel, escolher pacote jurídico.
2. Confirmar contratação vinculada ao imóvel.
3. Após proposta aceita, abrir negócio/documentos/contrato.
4. Contratar serviço jurídico pelo negócio se ainda não houver ativo.
5. Atualizar status operacional como admin/corretor.

Aceite: contratação formal aparece no imóvel e no negócio, com status e logs.

## Smoke 8 - Fluxo sem serviço contratado

1. Em negócio sem serviço jurídico ativo, abrir card "Seguir sem serviço Cadê".
2. Aceitar como comprador.
3. Aceitar como proprietário.
4. Confirmar liberação de contato no card formal.
5. Confirmar que o chat continua bloqueando contato.

Aceite: contato só aparece após aceite dos dois lados e negócio vai para `acompanhamento_externo`.

## Smoke 9 - Follow-up externo 7/30/45

1. Liberar contato externo.
2. Conferir fila operacional de follow-ups para admin/corretor.
3. Registrar resultado `travou`, `quer_apoio` ou `sem_resposta`.
4. Registrar resultado `fechou`.
5. Repetir com outro fluxo e registrar `encerrar`.

Aceite: follow-ups não duplicam; `fechou` conclui o negócio; `encerrar` marca como perdido.

## Smoke 10 - Contrato, assinatura e Pix

1. Com proposta aceita e documentos suficientes, gerar contrato.
2. Confirmar criação de versão.
3. Assinar como comprador.
4. Assinar como proprietário.
5. Anexar comprovante Pix/sinal quando venda exigir.
6. Validar ou reprovar contrato como admin/corretor.

Aceite: contrato só fica assinado após assinaturas obrigatórias, comprovante fica privado e status avança corretamente.

## Smoke 11 - Cartorial de venda

1. Iniciar cartorial em venda com contrato validado.
2. Registrar cartório, link/agendamento, ITBI/custas e pendências.
3. Enviar evidência de pendência como participante.
4. Resolver pendência como admin/corretor.
5. Tentar concluir com pendência aberta.
6. Concluir após matrícula final verificada ou confirmação operacional.

Aceite: locação não entra no cartorial; venda concluída move negócio para `concluido`.

## Smoke 12 - Prestadores/assinantes cartoriais

1. Cadastrar prestador.
2. Admin aprovar cadastro.
3. Vincular prestador ao fluxo cartorial.
4. Registrar atuação e evidência.
5. Conferir auditoria.

Aceite: prestador só fica disponível após aprovação e ações relevantes são auditáveis.

## Smoke 13 - Locação ponta a ponta

1. Cadastrar imóvel como locação.
2. Conferir vitrine com valor mensal e badge de locação.
3. Demonstrar interesse.
4. Enviar proposta com garantia, prazo, reajuste e vencimento.
5. Aceitar proposta e enviar documentos de locação.
6. Gerar e assinar contrato de locação.

Aceite: locação não exige Pix/sinal nem cartorial, e pode concluir após contrato validado.

## Smoke 14 - Métricas de engajamento do imóvel

1. Abrir detalhe público do imóvel.
2. Permanecer tempo suficiente para registrar visualização/tempo quando possível.
3. Clicar em "Tenho interesse".
4. Abrir painel do proprietário.
5. Conferir agregados de 7/30 dias.

Aceite: proprietário vê apenas dados agregados, sem lead individual, e imóvel sem evento não quebra a tela.

## Smoke 15 - Suporte pós-conclusão

1. Abrir negócio `concluido` como comprador ou proprietário.
2. Criar ticket pós-conclusão.
3. Abrir painel de suporte como admin.
4. Responder, resolver, reabrir ou escalar.
5. Tentar acessar ticket com usuário externo.

Aceite: ticket fica ligado ao negócio, admin vê contexto e usuário externo não enxerga.

## Smoke 16 - Regressão pública mínima

1. `/login` retorna 200.
2. `/cadastro` retorna 200.
3. `/plataforma` retorna 200.
4. `/termos` retorna 200.
5. `/painel/negocios` sem sessão redireciona para login e não retorna 500.
6. Vercel logs sem erro após o teste.

Aceite: produção permanece navegável após cada deploy.

## Registro de execução

Use este formato no comentário da task ou documento de homologação:

```text
Data/hora:
Ambiente:
Deploy:
Responsável:
Fluxos executados:
Resultado:
Pendências:
Evidências:
```
