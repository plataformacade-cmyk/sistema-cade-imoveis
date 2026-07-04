create table if not exists "public"."negocio_qualificacoes" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "comprador_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "respostas" jsonb not null default '{}'::jsonb,
  "resumo" text not null,
  "temperatura" text not null default 'morno'
    check ("temperatura" in ('frio', 'morno', 'quente')),
  "origem" text not null default 'pos_interesse'
    check ("origem" in ('pos_interesse', 'manual', 'admin')),
  "concluida_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "negocio_qualificacoes_negocio_comprador_key"
    unique ("negocio_id", "comprador_id")
);

create unique index if not exists "negocio_qualificacoes_negocio_unico_idx"
  on "public"."negocio_qualificacoes" ("negocio_id");
create index if not exists "negocio_qualificacoes_comprador_idx"
  on "public"."negocio_qualificacoes" ("comprador_id", "criado_em" desc);
create index if not exists "negocio_qualificacoes_temperatura_idx"
  on "public"."negocio_qualificacoes" ("temperatura", "criado_em" desc);

drop trigger if exists "negocio_qualificacoes_set_atualizado_em"
  on "public"."negocio_qualificacoes";
create trigger "negocio_qualificacoes_set_atualizado_em"
  before update on "public"."negocio_qualificacoes"
  for each row execute function "public"."set_atualizado_em"();

alter table "public"."negocio_qualificacoes" enable row level security;

revoke all on table "public"."negocio_qualificacoes" from anon;
revoke all on table "public"."negocio_qualificacoes" from authenticated;
grant select, insert, update on table "public"."negocio_qualificacoes" to authenticated;
grant all on table "public"."negocio_qualificacoes" to service_role;

drop policy if exists "negocio_qualificacoes_select" on "public"."negocio_qualificacoes";
create policy "negocio_qualificacoes_select"
on "public"."negocio_qualificacoes"
for select
to authenticated
using (
  (select "private"."is_admin"())
  or (select "private"."tem_papel_no_negocio"("negocio_id"))
);

drop policy if exists "negocio_qualificacoes_insert" on "public"."negocio_qualificacoes";
create policy "negocio_qualificacoes_insert"
on "public"."negocio_qualificacoes"
for insert
to authenticated
with check (
  (
    "comprador_id" = (select auth.uid())
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_qualificacoes"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" = 'comprador'
        and p."ativo" = true
    )
  )
  or (select "private"."is_admin"())
);

drop policy if exists "negocio_qualificacoes_update" on "public"."negocio_qualificacoes";
create policy "negocio_qualificacoes_update"
on "public"."negocio_qualificacoes"
for update
to authenticated
using (
  (
    "comprador_id" = (select auth.uid())
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_qualificacoes"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" = 'comprador'
        and p."ativo" = true
    )
  )
  or (select "private"."is_admin"())
)
with check (
  (
    "comprador_id" = (select auth.uid())
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_qualificacoes"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" = 'comprador'
        and p."ativo" = true
    )
  )
  or (select "private"."is_admin"())
);
