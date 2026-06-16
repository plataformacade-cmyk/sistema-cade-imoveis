-- Sprint 4 — fechamento: campos de negócio, documentos, contratos, comissões.
-- Aditiva. Aplicar com `supabase db push`.

-- Campos de fechamento em negocios
alter table "public"."negocios" add column if not exists "tipo" text
  check ("tipo" is null or "tipo" in ('venda','locacao'));
alter table "public"."negocios" add column if not exists "forma_pagamento" text
  check ("forma_pagamento" is null or "forma_pagamento" in ('a_vista','fgts','financiamento'));
alter table "public"."negocios" add column if not exists "escritura_publica" boolean not null default false;
alter table "public"."negocios" add column if not exists "tipo_garantia" text
  check ("tipo_garantia" is null or "tipo_garantia" in ('fiador','caucao','seguro_fianca','titulo_capitalizacao'));
alter table "public"."negocios" add column if not exists "prazo_meses" integer;

-- Documentos da due diligence / análise de crédito (manual no MVP)
create table if not exists "public"."documentos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "tipo_doc" text not null,
  "arquivo_url" text not null,
  "enviado_por" uuid references "public"."usuarios"("id"),
  "status" text not null default 'pendente'
    check ("status" in ('pendente','recebido','verificado','reprovado')),
  "criado_em" timestamptz not null default now()
);

-- Contratos (PDF gerado + assinatura manual no MVP)
create table if not exists "public"."contratos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "tipo" text,
  "url_pdf" text,
  "status" text not null default 'rascunho'
    check ("status" in ('rascunho','gerado','assinado')),
  "gerado_em" timestamptz,
  "assinado_em" timestamptz,
  "criado_em" timestamptz not null default now()
);

-- Comissões (parametrizada; informativa no MVP)
create table if not exists "public"."comissoes" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "percentual" numeric,
  "base_calculo" numeric,
  "valor" numeric,
  "pagador" text not null default 'proprietario',
  "split" jsonb not null default '{"captador_pct":50,"vendedor_pct":50}'::jsonb,
  "criado_em" timestamptz not null default now()
);

alter table "public"."documentos" enable row level security;
alter table "public"."contratos" enable row level security;
alter table "public"."comissoes" enable row level security;

create policy "documentos participante" on "public"."documentos" for all
  using ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"))
  with check ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"));
create policy "contratos participante" on "public"."contratos" for all
  using ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"))
  with check ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"));
create policy "comissoes participante" on "public"."comissoes" for all
  using ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"))
  with check ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"));
