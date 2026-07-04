# Plano de tráfego pago - Cadê Imóveis

Data: 2026-07-04  
Linear: OPE-244

## Objetivo

Criar um plano inicial para campanhas pagas do Cadê Imóveis com operador humano, separando alcance, engajamento e conversão sem automatizar orçamento, lances ou ativação de campanha.

## Fontes de plataforma consultadas

- Meta for Business - objetivos de campanha: https://www.facebook.com/business/ads/ad-objectives
- Meta Business Help - orçamentos diários: https://www.facebook.com/business/help/190490051321426
- Meta Business Help - orçamentos de campanha/conjunto: https://www.facebook.com/business/help/214319341922580
- Google Ads Help - metas de conversão: https://support.google.com/google-ads/answer/10995103
- Google Ads Help - conversões na web: https://support.google.com/google-ads/answer/16560108
- Google Ads Help - orçamento diário médio: https://support.google.com/google-ads/answer/6385083

## Regra central

Nenhuma automação pode:

- criar campanha com gasto real;
- aumentar orçamento;
- alterar objetivo;
- trocar público;
- publicar criativo;
- ativar DM/WhatsApp em massa;
- desligar ou religar campanhas sem operador.

Toda decisão financeira exige operador humano identificado.

## Funil inicial recomendado

### 1. Alcance local

Objetivo: apresentar a marca Cadê Imóveis em Uberlândia.

Canais:

- Meta Ads com objetivo de reconhecimento/alcance.
- Google Display/YouTube apenas se houver criativo e acompanhamento humano.

Públicos:

- Uberlândia e raio operacional aprovado.
- Pessoas com interesse em imóveis, mudança, aluguel, investimento e bairros específicos.

Criativos:

- Marca Cadê.
- Benefício: buscar, anunciar e negociar em uma plataforma.
- Prova de produto: vitrine, chat, documentos e negociação.

Métrica principal:

- alcance;
- frequência;
- custo por mil impressões;
- tráfego qualificado para `/plataforma`.

Critério de corte:

- frequência alta sem tráfego;
- CTR muito baixo frente ao benchmark interno;
- comentários negativos recorrentes;
- gasto acima do limite diário aprovado.

### 2. Engajamento e tráfego

Objetivo: levar visitantes para vitrine, bairro, blog e detalhe de imóvel.

Canais:

- Meta Ads com objetivo de tráfego ou engajamento.
- Google Search para buscas imobiliárias locais.

Rotas de destino:

- `/plataforma`
- `/imoveis-em/[bairro]`
- páginas de blog por bairro/guia
- detalhe público de imóvel ativo

Eventos a medir:

- visualização de detalhe do imóvel;
- clique em "Tenho interesse";
- cadastro iniciado;
- interesse concluído.

Critério de aceite:

- URLs não expõem endereço sensível;
- campanha usa UTMs padronizadas;
- lead que chega por anúncio passa pelo mesmo fluxo seguro de interesse/cadastro.

### 3. Conversão

Objetivo: gerar lead comprador/locatário e proprietário anunciante.

Canais:

- Google Search para intenção ativa.
- Meta Leads ou tráfego para cadastro apenas com operador.

Conversões candidatas:

- `interesse_registrado`;
- `cadastro_concluido`;
- `imovel_criado`;
- `clique_interesse`;
- `contato_externo_liberado` apenas como métrica de fundo, não otimização inicial.

Critério de aceite:

- conversões configuradas e testadas antes de otimizar campanha;
- evento primário definido pelo operador;
- eventos secundários não distorcem otimização;
- orçamento inicial aprovado.

## UTMs padrão

Use sempre:

```text
utm_source=meta|google
utm_medium=paid_social|paid_search|display
utm_campaign=cade_[objetivo]_[bairro-ou-publico]_[aaaamm]
utm_content=[criativo]_[variacao]
utm_term=[palavra-chave] (Google Search)
```

Exemplo:

```text
https://sistema-cade-imoveis.vercel.app/plataforma?utm_source=meta&utm_medium=paid_social&utm_campaign=cade_trafego_uberlandia_202607&utm_content=home_v1
```

## Orçamento e controle

Antes de ativar:

- orçamento diário aprovado;
- orçamento total do teste aprovado;
- data de início e fim;
- limite de perda aceitável;
- responsável por pausar;
- rotina de revisão diária nos primeiros dias.

Observações:

- Meta pode variar entrega diária dentro das regras da plataforma.
- Google trabalha com orçamento diário médio ao longo do mês.
- Por isso, o operador deve acompanhar gasto real e não confiar apenas em automação.

## Checklist antes de ativar campanha

- Conta de anúncios correta.
- Pixel/tag/conversões configurados quando aplicável.
- UTMs nos links.
- Página de destino carregando.
- Página mobile revisada.
- Copy revisada por humano.
- Criativo aprovado.
- Orçamento aprovado.
- Público revisado.
- Objetivo correto.
- Plano de pausa definido.
- Nenhum segredo ou contato sensível no criativo.

## Rotina de acompanhamento

Primeiras 72 horas:

- checar gasto diariamente;
- checar CTR, CPC/CPM e conversões;
- pausar criativo com comentário negativo ou performance muito ruim;
- não aumentar orçamento automaticamente.

Depois:

- revisão 2 a 3 vezes por semana;
- relatório simples por campanha;
- aprendizado registrado no Linear ou documento de marketing.

## Responsabilidades

| Item | Responsável |
| --- | --- |
| Aprovar orçamento | João/time |
| Criar campanha | Operador humano |
| Revisar copy/criativo | João/time |
| Verificar conversões | Operador humano + técnico |
| Pausar campanha | Operador humano |
| Sugerir pauta/copy | IA, com revisão |
| Alterar orçamento | Humano autorizado |

## Próximas tasks técnicas possíveis

- Criar eventos de conversão formalizados para Ads.
- Integrar Web Analytics/Speed Insights se aprovado.
- Criar dashboard simples de UTMs e conversões.
- Criar checklist de QA de campanha no painel admin.

## Fora de escopo

- Hermes/social seller.
- DM automática no Instagram.
- WhatsApp marketing.
- Gestão automática de orçamento.
- Compra de mídia sem operador humano.
