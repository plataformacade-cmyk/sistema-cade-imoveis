# Pautas reais para conteudo

A OPE-241 adiciona uma fila de pauta baseada em duvidas reais, sem depender do Hermes.

## Arquivos

- `scripts/pauta-reais.mjs`: coleta sinais, sanitiza dados pessoais, agrupa temas e revisa sugestoes.
- `scripts/pautas-reais.json`: fila de sugestoes em revisao, aprovadas ou descartadas.
- `scripts/pauta-conteudo.json`: pauta publicavel consumida pelo agente de conteudo.

## Fluxo operacional

1. Gerar sugestoes a partir de suporte e negociacao:

   ```bash
   node scripts/pauta-reais.mjs gerar
   ```

2. Revisar a fila:

   ```bash
   node scripts/pauta-reais.mjs listar
   ```

3. Aprovar uma sugestao:

   ```bash
   node scripts/pauta-reais.mjs aprovar --id real-exemplo
   ```

   A aprovacao adiciona o tema em `scripts/pauta-conteudo.json` com `publicado:false` e metadados de origem, persona e intencao.

4. Descartar uma sugestao:

   ```bash
   node scripts/pauta-reais.mjs descartar --id real-exemplo
   ```

5. Rodar o agente:

   ```bash
   node scripts/agente-conteudo.mjs --quantos 1
   ```

## Sanitizacao

O script remove ou mascara antes de salvar evidencias:

- e-mails;
- telefones;
- CPF;
- CNPJ;
- URLs.

As sugestoes guardam apenas trechos curtos e sanitizados, suficientes para justificar a pauta sem expor lead, comprador, proprietario ou detalhes sensiveis.

## Teste sem banco

Para testar o fluxo sem depender de dados reais:

```bash
node scripts/pauta-reais.mjs gerar --fixture
node scripts/pauta-reais.mjs listar
node scripts/pauta-reais.mjs aprovar --id real-quais-documentos-sao-pedidos-para-alugar-um-imovel-em-uberlandia
node scripts/agente-conteudo.mjs --quantos 1 --validar-pauta
```

Em producao, o fluxo deve ser usado com revisao humana antes da publicacao. Hermes podera futuramente alimentar esta mesma fila, mas nao e requisito desta v1.

Para testes automatizados sem alterar os arquivos reais, use `PAUTAS_REAIS_PATH` e `PAUTA_CONTEUDO_PATH` apontando para arquivos temporarios.
