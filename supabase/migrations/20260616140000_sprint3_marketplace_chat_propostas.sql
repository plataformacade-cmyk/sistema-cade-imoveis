-- Sprint 3 — marketplace (slug + busca full-text), chat in-app, propostas.
-- Aditiva. Aplicar com `supabase db push`.

-- Slug + busca full-text em imoveis
alter table "public"."imoveis" add column if not exists "slug" text;
create unique index if not exists "imoveis_slug_key" on "public"."imoveis" ("slug");
alter table "public"."imoveis" add column if not exists "busca" tsvector;
create index if not exists "imoveis_busca_idx" on "public"."imoveis" using gin ("busca");

create or replace function "public"."imoveis_busca_trigger"() returns trigger
language plpgsql as $$
begin
  new.busca := to_tsvector('portuguese',
    coalesce(new.logradouro,'') || ' ' || coalesce(new.bairro,'') || ' ' ||
    coalesce(new.cidade,'') || ' ' || coalesce(new.tipo,''));
  return new;
end; $$;

create trigger "imoveis_busca_update" before insert or update on "public"."imoveis"
  for each row execute function "public"."imoveis_busca_trigger"();

-- Chat in-app
create table if not exists "public"."conversas" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid references "public"."negocios"("id") on delete cascade,
  "criado_em" timestamptz not null default now()
);
create table if not exists "public"."mensagens" (
  "id" uuid primary key default gen_random_uuid(),
  "conversa_id" uuid not null references "public"."conversas"("id") on delete cascade,
  "autor_id" uuid not null references "public"."usuarios"("id"),
  "corpo" text not null,
  "lida_em" timestamptz,
  "criado_em" timestamptz not null default now()
);

-- Propostas / contrapropostas
create table if not exists "public"."propostas" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "autor_id" uuid not null references "public"."usuarios"("id"),
  "valor" numeric not null,
  "condicoes" text,
  "status" text not null default 'enviada'
    check ("status" in ('enviada','aceita','recusada','contraproposta')),
  "criado_em" timestamptz not null default now()
);

alter table "public"."conversas" enable row level security;
alter table "public"."mensagens" enable row level security;
alter table "public"."propostas" enable row level security;

create policy "conversas participante" on "public"."conversas" for select
  using ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"));
create policy "conversas cria" on "public"."conversas" for insert to authenticated with check (true);

create policy "mensagens participante le" on "public"."mensagens" for select
  using ("public"."is_admin"() or exists (
    select 1 from "public"."conversas" c
    where c."id" = "conversa_id" and "public"."tem_papel_no_negocio"(c."negocio_id")));
create policy "mensagens autor cria" on "public"."mensagens" for insert to authenticated
  with check ("autor_id" = "auth"."uid"());

create policy "propostas participante le" on "public"."propostas" for select
  using ("public"."is_admin"() or "public"."tem_papel_no_negocio"("negocio_id"));
create policy "propostas autor cria" on "public"."propostas" for insert to authenticated
  with check ("autor_id" = "auth"."uid"());
