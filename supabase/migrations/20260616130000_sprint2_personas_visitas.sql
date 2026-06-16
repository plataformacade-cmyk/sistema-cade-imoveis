-- Sprint 2 — personas (corretor/imobiliária), visitas (máquina de estados) e LGPD.
-- Aditiva: não altera tabelas/dados existentes. Aplicar com `supabase db push`.

-- LGPD em usuarios
alter table "public"."usuarios" add column if not exists "termos_aceitos_em" timestamptz;
alter table "public"."usuarios" add column if not exists "anonimizado_em" timestamptz;

-- Imobiliárias (PJ com CRECI próprio)
create table if not exists "public"."imobiliarias" (
  "id" uuid primary key default gen_random_uuid(),
  "nome" text not null,
  "cnpj" text,
  "creci_pj" text,
  "responsavel_tecnico_id" uuid references "public"."usuarios"("id"),
  "criado_em" timestamptz not null default now()
);

-- Corretores (PF com CRECI — obrigatório por lei)
create table if not exists "public"."corretores" (
  "usuario_id" uuid primary key references "public"."usuarios"("id") on delete cascade,
  "creci" text not null,
  "creci_uf" text,
  "imobiliaria_id" uuid references "public"."imobiliarias"("id"),
  "criado_em" timestamptz not null default now()
);

-- Visitas (máquina de estados)
create table if not exists "public"."visitas" (
  "id" uuid primary key default gen_random_uuid(),
  "imovel_id" uuid not null references "public"."imoveis"("id") on delete cascade,
  "negocio_id" uuid references "public"."negocios"("id") on delete set null,
  "solicitante_id" uuid not null references "public"."usuarios"("id"),
  "data_hora" timestamptz not null,
  "status" text not null default 'solicitada'
    check ("status" in ('solicitada','aguardando_confirmacao','confirmada','realizada','cancelada','reagendada','nao_compareceu')),
  "canal" text not null default 'presencial' check ("canal" in ('presencial','video')),
  "observacoes" text,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now()
);

-- RLS
alter table "public"."imobiliarias" enable row level security;
alter table "public"."corretores" enable row level security;
alter table "public"."visitas" enable row level security;

create policy "imobiliarias admin" on "public"."imobiliarias" for all
  using ("public"."is_admin"()) with check ("public"."is_admin"());
create policy "imobiliarias leitura" on "public"."imobiliarias" for select using (true);

create policy "corretores admin" on "public"."corretores" for all
  using ("public"."is_admin"()) with check ("public"."is_admin"());
create policy "corretores leitura" on "public"."corretores" for select using (true);

create policy "visitas admin" on "public"."visitas" for all
  using ("public"."is_admin"()) with check ("public"."is_admin"());
create policy "visitas solicitante le" on "public"."visitas" for select
  using ("solicitante_id" = "auth"."uid"());
create policy "visitas solicitante cria" on "public"."visitas" for insert to authenticated
  with check ("solicitante_id" = "auth"."uid"());

create trigger "set_atualizado_em_visitas" before update on "public"."visitas"
  for each row execute function "public"."set_atualizado_em"();
