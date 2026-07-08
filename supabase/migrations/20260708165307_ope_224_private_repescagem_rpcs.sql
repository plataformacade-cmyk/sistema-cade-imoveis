-- OPE-224 hardening complementar:
-- wrappers publicos devem ser SECURITY INVOKER; a implementacao que altera
-- tabelas protegidas fica no schema private, fora da Data API.

alter function "public"."marcar_negocio_perdido_com_repescagem"(uuid, text, boolean)
  rename to "marcar_negocio_perdido_com_repescagem_impl";

alter function "public"."marcar_negocio_perdido_com_repescagem_impl"(uuid, text, boolean)
  set schema "private";

alter function "private"."marcar_negocio_perdido_com_repescagem_impl"(uuid, text, boolean)
  set search_path = public, private;

alter function "public"."registrar_resposta_repescagem"(uuid, uuid, text, boolean, boolean)
  rename to "registrar_resposta_repescagem_impl";

alter function "public"."registrar_resposta_repescagem_impl"(uuid, uuid, text, boolean, boolean)
  set schema "private";

alter function "private"."registrar_resposta_repescagem_impl"(uuid, uuid, text, boolean, boolean)
  set search_path = public, private;

revoke all on function "private"."marcar_negocio_perdido_com_repescagem_impl"(uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function "private"."registrar_resposta_repescagem_impl"(uuid, uuid, text, boolean, boolean)
  from public, anon, authenticated;

grant usage on schema "private" to authenticated;
grant execute on function "private"."marcar_negocio_perdido_com_repescagem_impl"(uuid, text, boolean)
  to authenticated;
grant execute on function "private"."registrar_resposta_repescagem_impl"(uuid, uuid, text, boolean, boolean)
  to authenticated;

create or replace function "public"."marcar_negocio_perdido_com_repescagem"(
  "p_negocio_id" uuid,
  "p_motivo_perda" text default null,
  "p_aceita_similares" boolean default true
)
returns table ("message" text, "aceita_similares" boolean)
language sql
security invoker
set search_path = public, private
as $$
  select *
  from "private"."marcar_negocio_perdido_com_repescagem_impl"(
    p_negocio_id,
    p_motivo_perda,
    p_aceita_similares
  );
$$;

create or replace function "public"."registrar_resposta_repescagem"(
  "p_repescagem_id" uuid,
  "p_negocio_id" uuid,
  "p_resposta_lead" text default null,
  "p_aceita_similares" boolean default true,
  "p_parar_cadencia" boolean default false
)
returns table ("message" text, "parar_cadencia" boolean)
language sql
security invoker
set search_path = public, private
as $$
  select *
  from "private"."registrar_resposta_repescagem_impl"(
    p_repescagem_id,
    p_negocio_id,
    p_resposta_lead,
    p_aceita_similares,
    p_parar_cadencia
  );
$$;

revoke all on function "public"."marcar_negocio_perdido_com_repescagem"(uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function "public"."registrar_resposta_repescagem"(uuid, uuid, text, boolean, boolean)
  from public, anon, authenticated;

grant execute on function "public"."marcar_negocio_perdido_com_repescagem"(uuid, text, boolean)
  to authenticated;
grant execute on function "public"."registrar_resposta_repescagem"(uuid, uuid, text, boolean, boolean)
  to authenticated;
