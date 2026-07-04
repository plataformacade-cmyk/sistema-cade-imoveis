-- OPE-251: jornada de locacao ponta a ponta.

alter table "public"."imoveis"
  add column if not exists "tipo_negocio" text;

update "public"."imoveis"
set "tipo_negocio" = 'venda'
where "tipo_negocio" is null;

alter table "public"."imoveis"
  alter column "tipo_negocio" set default 'venda',
  alter column "tipo_negocio" set not null;

alter table "public"."imoveis"
  drop constraint if exists "imoveis_tipo_negocio_check";

alter table "public"."imoveis"
  add constraint "imoveis_tipo_negocio_check"
  check ("tipo_negocio" in ('venda', 'locacao'));

create index if not exists "imoveis_tipo_negocio_status_idx"
  on "public"."imoveis" ("tipo_negocio", "status");

alter table "public"."propostas"
  add column if not exists "tipo_negocio" text,
  add column if not exists "tipo_garantia" text,
  add column if not exists "prazo_meses" integer,
  add column if not exists "reajuste_indice" text,
  add column if not exists "dia_vencimento" integer,
  add column if not exists "encargos" text;

update "public"."propostas" p
set "tipo_negocio" = coalesce(n."tipo", i."tipo_negocio", 'venda')
from "public"."negocios" n
left join "public"."imoveis" i on i."id" = n."imovel_id"
where p."negocio_id" = n."id"
  and p."tipo_negocio" is null;

alter table "public"."propostas"
  drop constraint if exists "propostas_tipo_negocio_check",
  drop constraint if exists "propostas_tipo_garantia_check",
  drop constraint if exists "propostas_prazo_meses_check",
  drop constraint if exists "propostas_dia_vencimento_check";

alter table "public"."propostas"
  add constraint "propostas_tipo_negocio_check"
  check ("tipo_negocio" is null or "tipo_negocio" in ('venda', 'locacao')),
  add constraint "propostas_tipo_garantia_check"
  check (
    "tipo_garantia" is null
    or "tipo_garantia" in ('fiador', 'caucao', 'seguro_fianca', 'titulo_capitalizacao')
  ),
  add constraint "propostas_prazo_meses_check"
  check ("prazo_meses" is null or "prazo_meses" > 0),
  add constraint "propostas_dia_vencimento_check"
  check ("dia_vencimento" is null or ("dia_vencimento" >= 1 and "dia_vencimento" <= 31));

create index if not exists "propostas_tipo_negocio_idx"
  on "public"."propostas" ("tipo_negocio");

alter table "public"."negocios"
  add column if not exists "reajuste_indice" text,
  add column if not exists "dia_vencimento" integer,
  add column if not exists "encargos" text;

update "public"."negocios" n
set "tipo" = coalesce(n."tipo", i."tipo_negocio", 'venda')
from "public"."imoveis" i
where n."imovel_id" = i."id"
  and n."tipo" is null;

alter table "public"."negocios"
  drop constraint if exists "negocios_dia_vencimento_check",
  drop constraint if exists "negocios_prazo_meses_check";

alter table "public"."negocios"
  add constraint "negocios_dia_vencimento_check"
  check ("dia_vencimento" is null or ("dia_vencimento" >= 1 and "dia_vencimento" <= 31)),
  add constraint "negocios_prazo_meses_check"
  check ("prazo_meses" is null or "prazo_meses" > 0);

create or replace function "private"."demonstrar_interesse_impl"("p_imovel_id" uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_proprietario uuid;
  v_status text;
  v_tipo_negocio text;
  v_negocio_id uuid;
  v_existente uuid;
begin
  if v_uid is null then
    raise exception 'nao_autenticado';
  end if;

  select "proprietario_id", "status", coalesce("tipo_negocio", 'venda')
    into v_proprietario, v_status, v_tipo_negocio
  from "public"."imoveis"
  where "id" = p_imovel_id;

  if v_proprietario is null then
    raise exception 'imovel_inexistente';
  end if;

  if v_status <> 'ativo' then
    raise exception 'imovel_indisponivel';
  end if;

  if v_proprietario = v_uid then
    raise exception 'eh_proprietario';
  end if;

  select n."id"
    into v_existente
  from "public"."negocios" n
  join "public"."papeis_negocio" p on p."negocio_id" = n."id"
  where n."imovel_id" = p_imovel_id
    and p."usuario_id" = v_uid
    and p."papel" = 'comprador'
  limit 1;

  if v_existente is not null then
    return v_existente;
  end if;

  insert into "public"."negocios" ("imovel_id", "tipo", "status", "criado_por")
  values (p_imovel_id, v_tipo_negocio, 'qualificacao', v_uid)
  returning "id" into v_negocio_id;

  insert into "public"."papeis_negocio" ("negocio_id", "usuario_id", "papel")
  values
    (v_negocio_id, v_uid, 'comprador'),
    (v_negocio_id, v_proprietario, 'proprietario');

  insert into "public"."conversas" ("negocio_id")
  values (v_negocio_id);

  return v_negocio_id;
end;
$$;

revoke all on function "private"."demonstrar_interesse_impl"(uuid) from public, anon;
grant execute on function "private"."demonstrar_interesse_impl"(uuid) to authenticated, service_role;

create or replace function "public"."imoveis_busca_trigger"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new."busca" := to_tsvector(
    'portuguese',
    coalesce(new."logradouro", '') || ' ' ||
    coalesce(new."bairro", '') || ' ' ||
    coalesce(new."cidade", '') || ' ' ||
    coalesce(new."tipo", '') || ' ' ||
    coalesce(new."tipo_negocio", '')
  );
  return new;
end;
$$;
