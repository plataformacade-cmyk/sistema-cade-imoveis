-- OPE-222: visita realizada promove o negocio para a etapa de proposta.

drop policy if exists "visitas atualiza autorizada" on "public"."visitas";

create policy "visitas atualiza autorizada"
on "public"."visitas"
for update
to authenticated
using (
  is_admin()
  or (
    "negocio_id" is not null
    and (
      (
        "status" in ('solicitada', 'aguardando_confirmacao', 'reagendada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('comprador', 'admin')
        )
      )
      or exists (
        select 1
        from "public"."papeis_negocio" p
        where p."negocio_id" = "visitas"."negocio_id"
          and p."usuario_id" = (select auth.uid())
          and p."ativo"
          and p."papel" in ('proprietario', 'corretor', 'admin')
      )
    )
  )
)
with check (
  is_admin()
  or (
    "negocio_id" is not null
    and (
      (
        "status" in ('confirmada', 'cancelada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('comprador', 'admin')
        )
      )
      or (
        "status" in ('aguardando_confirmacao', 'reagendada', 'cancelada', 'realizada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('proprietario', 'corretor', 'admin')
        )
      )
    )
  )
);

create or replace function "public"."promover_negocio_visita_realizada"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
begin
  if new."negocio_id" is null then
    return new;
  end if;

  if old."status" is not distinct from new."status" then
    return new;
  end if;

  if new."status" <> 'realizada' then
    return new;
  end if;

  update "public"."negocios"
  set "status" = 'proposta'
  where "id" = new."negocio_id"
    and "status" in ('qualificacao', 'visita');

  return new;
end;
$$;

drop trigger if exists "trg_promover_negocio_visita_realizada" on "public"."visitas";
create trigger "trg_promover_negocio_visita_realizada"
after update of "status" on "public"."visitas"
for each row
execute function "public"."promover_negocio_visita_realizada"();

revoke all on function "public"."promover_negocio_visita_realizada"() from public, anon, authenticated;
