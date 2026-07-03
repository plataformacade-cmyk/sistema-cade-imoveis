-- OPE-232: contrato versionado, assinatura interna e comprovante Pix formal.

alter table "public"."contratos"
  add column if not exists "versao" integer not null default 1,
  add column if not exists "arquivo_url" text,
  add column if not exists "arquivo_nome" text,
  add column if not exists "gerado_por" uuid references "public"."usuarios"("id"),
  add column if not exists "revisado_por" uuid references "public"."usuarios"("id"),
  add column if not exists "revisado_em" timestamptz,
  add column if not exists "motivo_reprovacao" text,
  add column if not exists "termo_resumo" text,
  add column if not exists "atualizado_em" timestamptz not null default now();

with numerados as (
  select
    "id",
    row_number() over (
      partition by "negocio_id"
      order by coalesce("gerado_em", "criado_em"), "id"
    ) as rn
  from "public"."contratos"
)
update "public"."contratos" c
set "versao" = n.rn
from numerados n
where c."id" = n."id";

alter table "public"."contratos"
  drop constraint if exists "contratos_status_check";

alter table "public"."contratos"
  add constraint "contratos_status_check"
  check (
    "status" in (
      'rascunho',
      'gerado',
      'pendente_assinaturas',
      'assinado',
      'validado',
      'reprovado',
      'cancelado'
    )
  );

create unique index if not exists "contratos_negocio_versao_key"
  on "public"."contratos" ("negocio_id", "versao");

create index if not exists "contratos_negocio_status_idx"
  on "public"."contratos" ("negocio_id", "status");

create or replace function "public"."contratos_before_update"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if old."negocio_id" is distinct from new."negocio_id"
    or old."versao" is distinct from new."versao"
    or old."gerado_por" is distinct from new."gerado_por"
    or old."criado_em" is distinct from new."criado_em" then
    raise exception 'contrato_campos_imutaveis';
  end if;

  if new."status" = 'reprovado'
    and coalesce(trim(new."motivo_reprovacao"), '') = '' then
    raise exception 'contrato_motivo_reprovacao_obrigatorio';
  end if;

  new."atualizado_em" := now();
  return new;
end;
$$;

drop trigger if exists "trg_contratos_before_update" on "public"."contratos";
create trigger "trg_contratos_before_update"
before update on "public"."contratos"
for each row
execute function "public"."contratos_before_update"();

create table if not exists "public"."contrato_assinaturas" (
  "id" uuid primary key default gen_random_uuid(),
  "contrato_id" uuid not null references "public"."contratos"("id") on delete cascade,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "papel" text not null check ("papel" in ('comprador', 'proprietario')),
  "versao" integer not null,
  "termo_resumo" text,
  "ip_hash" text,
  "user_agent" text,
  "assinado_em" timestamptz not null default now(),
  "criado_em" timestamptz not null default now(),
  constraint "contrato_assinaturas_unica"
    unique ("contrato_id", "usuario_id", "papel")
);

create index if not exists "contrato_assinaturas_negocio_idx"
  on "public"."contrato_assinaturas" ("negocio_id");

create index if not exists "contrato_assinaturas_usuario_idx"
  on "public"."contrato_assinaturas" ("usuario_id");

create or replace function "public"."contrato_assinaturas_before_insert"()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_negocio_id uuid;
  v_versao integer;
  v_status text;
begin
  select c."negocio_id", c."versao", c."status"
    into v_negocio_id, v_versao, v_status
  from "public"."contratos" c
  where c."id" = new."contrato_id";

  if v_negocio_id is null then
    raise exception 'contrato_inexistente';
  end if;

  if new."negocio_id" is distinct from v_negocio_id
    or new."versao" is distinct from v_versao then
    raise exception 'contrato_assinatura_inconsistente';
  end if;

  if v_status not in ('gerado', 'pendente_assinaturas') then
    raise exception 'contrato_status_nao_assinavel';
  end if;

  if not exists (
    select 1
    from "public"."papeis_negocio" p
    where p."negocio_id" = new."negocio_id"
      and p."usuario_id" = new."usuario_id"
      and p."papel" = new."papel"
      and p."ativo"
  ) then
    raise exception 'usuario_sem_papel_para_assinar';
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_contrato_assinaturas_before_insert"
  on "public"."contrato_assinaturas";
create trigger "trg_contrato_assinaturas_before_insert"
before insert on "public"."contrato_assinaturas"
for each row
execute function "public"."contrato_assinaturas_before_insert"();

alter table "public"."contrato_assinaturas" enable row level security;

drop policy if exists "contratos participante" on "public"."contratos";
drop policy if exists "contratos participantes leem" on "public"."contratos";
drop policy if exists "contratos operador insere" on "public"."contratos";
drop policy if exists "contratos operador atualiza" on "public"."contratos";

create policy "contratos participantes leem"
  on "public"."contratos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
  );

create policy "contratos operador insere"
  on "public"."contratos"
  for insert
  to authenticated
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "contratos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('proprietario', 'corretor', 'admin')
        and p."ativo"
    )
  );

create policy "contratos operador atualiza"
  on "public"."contratos"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "contratos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('proprietario', 'corretor', 'admin')
        and p."ativo"
    )
  )
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "contratos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('proprietario', 'corretor', 'admin')
        and p."ativo"
    )
  );

drop policy if exists "contrato assinaturas participantes leem"
  on "public"."contrato_assinaturas";
drop policy if exists "contrato assinaturas participante assina"
  on "public"."contrato_assinaturas";

create policy "contrato assinaturas participantes leem"
  on "public"."contrato_assinaturas"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
  );

create policy "contrato assinaturas participante assina"
  on "public"."contrato_assinaturas"
  for insert
  to authenticated
  with check (
    "usuario_id" = (select auth.uid())
    and "papel" in ('comprador', 'proprietario')
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "contrato_assinaturas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" = "contrato_assinaturas"."papel"
        and p."ativo"
    )
  );

revoke all on table "public"."contratos" from anon, authenticated;
grant select, insert, update on table "public"."contratos" to authenticated;
grant all on table "public"."contratos" to service_role;

revoke all on table "public"."contrato_assinaturas" from anon, authenticated;
grant select, insert on table "public"."contrato_assinaturas" to authenticated;
grant all on table "public"."contrato_assinaturas" to service_role;

revoke all on function "public"."contratos_before_update"() from public, anon, authenticated;
revoke all on function "public"."contrato_assinaturas_before_insert"() from public, anon, authenticated;
