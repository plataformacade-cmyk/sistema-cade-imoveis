# OPE-233 - Fluxo cartorial

O fluxo cartorial v1 cobre venda apos contrato validado. A etapa usa
`negocio_cartorial_fluxos`, `negocio_cartorial_pendencias` e
`negocio_cartorial_anexos`, alem dos itens `cartorio_*` do checklist de
documentos.

O operador registra cartorio, agendamento, ITBI/custas, pendencias, escritura,
registro e matricula final. A conclusao move o negocio para `concluido` somente
quando nao houver pendencias abertas e existir matricula final verificada ou
confirmacao operacional registrada.

Locacao, Hermes, API de cartorio, prestadores externos e pagamento online ficam
fora desta v1.
