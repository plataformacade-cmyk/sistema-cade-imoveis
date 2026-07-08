-- OPE-224 hardening: repescagem deve ser operada por RPCs transacionais.
--
-- A entrega inicial permitia update direto de `negocio_repescagens` para
-- qualquer participante ativo via Data API. Esta migration remove o update
-- amplo e centraliza as mutacoes em funcoes autenticadas com checagem de papel.

revoke insert, update on table "public"."negocio_repescagens" from authenticated;
grant select on table "public"."negocio_repescagens" to authenticated;

drop policy if exists "repescagens operador cria"
  on "public"."negocio_repescagens";

drop policy if exists "repescagens participantes atualizam permitido"
  on "public"."negocio_repescagens";

create or replace function "public"."marcar_negocio_perdido_com_repescagem"(
  "p_negocio_id" uuid,
  "p_motivo_perda" text default null,
  "p_aceita_similares" boolean default true
)
returns table ("message" text, "aceita_similares" boolean)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_status text;
  v_pode_operar boolean;
  v_comprador_id uuid;
  v_proxima_tentativa timestamptz;
begin
  if v_usuario is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1
    from "public"."papeis_negocio" p
    where p."negocio_id" = p_negocio_id
      and p."usuario_id" = v_usuario
      and p."ativo"
      and p."papel" in ('proprietario', 'corretor', 'admin')
  ) or (select "private"."is_admin"())
  into v_pode_operar;

  if not coalesce(v_pode_operar, false) then
    raise exception 'sem_permissao';
  end if;

  select n."status"
    into v_status
  from "public"."negocios" n
  where n."id" = p_negocio_id
  for update;

  if not found then
    raise exception 'negocio_nao_encontrado';
  end if;

  if v_status in ('concluido', 'perdido') then
    raise exception 'negocio_encerrado';
  end if;

  select p."usuario_id"
    into v_comprador_id
  from "public"."papeis_negocio" p
  where p."negocio_id" = p_negocio_id
    and p."papel" = 'comprador'
    and p."ativo"
  order by p."criado_em" asc
  limit 1;

  v_proxima_tentativa := now() + interval '1 day';

  insert into "public"."negocio_repescagens" (
    "negocio_id",
    "comprador_id",
    "criado_por",
    "motivo_perda",
    "origem",
    "status",
    "aceita_similares",
    "parar_cadencia",
    "proxima_tentativa_em",
    "encerrado_em"
  )
  values (
    p_negocio_id,
    v_comprador_id,
    v_usuario,
    nullif(left(coalesce(p_motivo_perda, ''), 800), ''),
    'manual',
    'pendente',
    coalesce(p_aceita_similares, false),
    not coalesce(p_aceita_similares, false),
    case when coalesce(p_aceita_similares, false) then v_proxima_tentativa else null end,
    case when coalesce(p_aceita_similares, false) then null else now() end
  )
  on conflict ("negocio_id") do update
    set "comprador_id" = excluded."comprador_id",
        "criado_por" = excluded."criado_por",
        "motivo_perda" = excluded."motivo_perda",
        "origem" = excluded."origem",
        "status" = excluded."status",
        "aceita_similares" = excluded."aceita_similares",
        "parar_cadencia" = excluded."parar_cadencia",
        "proxima_tentativa_em" = excluded."proxima_tentativa_em",
        "encerrado_em" = excluded."encerrado_em",
        "automacao_execucao_id" = null,
        "atualizado_em" = now();

  update "public"."negocios"
    set "status" = 'perdido',
        "atualizado_em" = now()
  where "id" = p_negocio_id;

  return query
    select
      case
        when coalesce(p_aceita_similares, false)
          then 'Negocio perdido e repescagem agendada.'
        else 'Negocio perdido e cadencia encerrada.'
      end,
      coalesce(p_aceita_similares, false);
end;
$$;

create or replace function "public"."registrar_resposta_repescagem"(
  "p_repescagem_id" uuid,
  "p_negocio_id" uuid,
  "p_resposta_lead" text default null,
  "p_aceita_similares" boolean default true,
  "p_parar_cadencia" boolean default false
)
returns table ("message" text, "parar_cadencia" boolean)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_pode_responder boolean;
  v_repescagem_id uuid;
begin
  if v_usuario is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1
    from "public"."papeis_negocio" p
    where p."negocio_id" = p_negocio_id
      and p."usuario_id" = v_usuario
      and p."ativo"
      and p."papel" in ('comprador', 'proprietario', 'corretor', 'admin')
  ) or (select "private"."is_admin"())
  into v_pode_responder;

  if not coalesce(v_pode_responder, false) then
    raise exception 'sem_permissao';
  end if;

  select r."id"
    into v_repescagem_id
  from "public"."negocio_repescagens" r
  where r."id" = p_repescagem_id
    and r."negocio_id" = p_negocio_id
  for update;

  if not found then
    raise exception 'repescagem_nao_encontrada';
  end if;

  update "public"."negocio_repescagens"
    set "resposta_lead" = nullif(left(coalesce(p_resposta_lead, ''), 1200), ''),
        "aceita_similares" = coalesce(p_aceita_similares, false),
        "parar_cadencia" = coalesce(p_parar_cadencia, false),
        "status" = case
          when coalesce(p_parar_cadencia, false) then 'encerrado'
          else 'respondido'
        end,
        "proxima_tentativa_em" = case
          when coalesce(p_parar_cadencia, false) then null
          else now() + interval '3 days'
        end,
        "encerrado_em" = case
          when coalesce(p_parar_cadencia, false) then now()
          else null
        end,
        "atualizado_em" = now()
  where "id" = v_repescagem_id;

  return query
    select
      case
        when coalesce(p_parar_cadencia, false) then 'Cadencia encerrada.'
        else 'Resposta registrada.'
      end,
      coalesce(p_parar_cadencia, false);
end;
$$;

revoke all on function "public"."marcar_negocio_perdido_com_repescagem"(uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function "public"."registrar_resposta_repescagem"(uuid, uuid, text, boolean, boolean)
  from public, anon, authenticated;

grant execute on function "public"."marcar_negocio_perdido_com_repescagem"(uuid, text, boolean)
  to authenticated;
grant execute on function "public"."registrar_resposta_repescagem"(uuid, uuid, text, boolean, boolean)
  to authenticated;
