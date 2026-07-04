# Conteudo social institucional

A OPE-242 cria uma estrutura inicial para transformar temas do blog em pecas sociais revisaveis, sem publicacao automatica e sem Hermes.

## Tipos de peca

- `noticia`: post informativo curto para Instagram, Telegram e YouTube Community.
- `carrossel`: 6 a 8 slides em formato 4:5 para Instagram/TikTok/Telegram.
- `design`: arte estatica com headline, subtitulo, CTA e brief visual.
- `roteiro-avatar`: roteiro curto para avatar/video. O avatar do Fernando fica bloqueado ate haver consentimento formal, ativo aprovado e ferramenta externa configurada.

## Status

- `rascunho`: gerado pelo script, ainda nao aprovado.
- `aprovado`: liberado por revisao humana.
- `publicado`: publicado fora do app, com URL de evidencia registrada.

## Comandos

Gerar carrossel a partir de um artigo:

```bash
node scripts/social-conteudo.mjs gerar --tipo carrossel --slug alugar-ou-comprar-como-decidir
```

Gerar noticia:

```bash
node scripts/social-conteudo.mjs gerar --tipo noticia --slug alugar-ou-comprar-como-decidir
```

Listar pecas:

```bash
node scripts/social-conteudo.mjs listar
```

Aprovar uma peca:

```bash
node scripts/social-conteudo.mjs aprovar --id social-carrossel-alugar-ou-comprar-como-decidir
```

Registrar publicacao:

```bash
node scripts/social-conteudo.mjs publicar --id social-carrossel-alugar-ou-comprar-como-decidir --url https://instagram.com/p/exemplo
```

## Arquivos

- `scripts/social-conteudo.mjs`: gerador e fluxo de status.
- `scripts/social-conteudo.json`: fila revisavel das pecas.
- `docs/marketing-organico-vs-pago.md`: separacao entre organic/IA e trafego pago com operador humano.

## Limites da v1

- Nao publica automaticamente em Instagram, TikTok, YouTube ou Telegram.
- Nao gera video/avatar de Fernando sem consentimento e ativo externo.
- Nao controla verba, campanha ou impulsionamento.
- Hermes podera futuramente alimentar ou distribuir estas pecas, mas nao e requisito desta entrega.
