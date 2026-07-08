# Decisao de copy: proposta

## Decisao

A copy publica do fluxo comercial permanece como **proposta** e **contraproposta**.

## Motivo

Nas reunioes foram cogitadas alternativas como "eu quero", "eu topo" ou "lance", mas nenhuma foi fechada como nomenclatura definitiva. Para evitar ambiguidade juridica e preservar clareza operacional em venda e locacao, a plataforma mantem:

- **Enviar proposta** para a primeira oferta formal de valor e condicoes.
- **Fazer contraproposta** para uma nova condicao enviada em resposta.
- **Aceitar** e **Recusar** como acoes de resposta.

## Contrato tecnico

O schema interno continua usando `propostas`, `proposta`, `contraproposta` e os eventos `proposta_enviada` e `proposta_respondida`.

Uma eventual mudanca futura deve alterar apenas rotulos de interface e documentacao, sem mudar historico, metricas, eventos ou tabelas.
