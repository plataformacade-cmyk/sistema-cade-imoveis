alter table "public"."suporte_conversas"
  add column if not exists "negocio_id" uuid references "public"."negocios"("id") on delete set null,
  add column if not exists "tipo" text not null default 'geral',
  add column if not exists "origem_negocio" text,
  add column if not exists "contexto_snapshot" jsonb not null default '{}'::jsonb;

do $$ begin
  alter table "public"."suporte_conversas"
    add constraint "suporte_conversas_tipo_check"
    check ("tipo" in ('geral', 'pos_conclusao'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table "public"."suporte_conversas"
    add constraint "suporte_conversas_origem_negocio_check"
    check (
      "origem_negocio" is null
      or "origem_negocio" in ('servico_cade', 'externo', 'cartorial', 'manual')
    );
exception when duplicate_object then null; end $$;

create index if not exists "suporte_conversas_negocio_idx"
  on "public"."suporte_conversas" ("negocio_id", "atualizado_em" desc)
  where "negocio_id" is not null;

create index if not exists "suporte_conversas_tipo_status_idx"
  on "public"."suporte_conversas" ("tipo", "status", "atualizado_em" desc);

create or replace function "public"."suporte_conversas_guard_update"()
returns trigger
language plpgsql
set search_path to 'public','private','pg_temp'
as $$
begin
  if (select private.is_admin()) then
    return new;
  end if;

  if new.usuario_id is distinct from old.usuario_id
    or new.negocio_id is distinct from old.negocio_id
    or new.tipo is distinct from old.tipo
    or new.origem_negocio is distinct from old.origem_negocio
    or new.contexto_snapshot is distinct from old.contexto_snapshot
    or new.papel is distinct from old.papel
    or new.assunto is distinct from old.assunto
    or new.atendente_id is distinct from old.atendente_id then
    raise exception 'metadados do suporte nao podem ser alterados pelo usuario';
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_suporte_conversas_guard_update"
  on "public"."suporte_conversas";
create trigger "trg_suporte_conversas_guard_update"
  before update on "public"."suporte_conversas"
  for each row execute function "public"."suporte_conversas_guard_update"();

drop policy if exists "suporte_conv_select" on "public"."suporte_conversas";
drop policy if exists "suporte_conv_insert" on "public"."suporte_conversas";
drop policy if exists "suporte_conv_update" on "public"."suporte_conversas";
drop policy if exists "suporte_msg_select" on "public"."suporte_mensagens";
drop policy if exists "suporte_msg_insert" on "public"."suporte_mensagens";

create policy "suporte_conv_select"
  on "public"."suporte_conversas"
  for select
  to authenticated
  using (
    (select private.is_admin())
    or "usuario_id" = (select auth.uid())
  );

create policy "suporte_conv_insert"
  on "public"."suporte_conversas"
  for insert
  to authenticated
  with check (
    "usuario_id" = (select auth.uid())
    and (
      (
        "tipo" = 'geral'
        and "negocio_id" is null
      )
      or (
        "tipo" = 'pos_conclusao'
        and "negocio_id" is not null
        and exists (
          select 1
          from "public"."negocios" n
          where n.id = "suporte_conversas"."negocio_id"
            and n.status = 'concluido'
        )
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p.negocio_id = "suporte_conversas"."negocio_id"
            and p.usuario_id = (select auth.uid())
            and p.ativo is true
            and p.papel in ('comprador', 'proprietario')
        )
      )
    )
  );

create policy "suporte_conv_update"
  on "public"."suporte_conversas"
  for update
  to authenticated
  using (
    (select private.is_admin())
    or "usuario_id" = (select auth.uid())
  )
  with check (
    (select private.is_admin())
    or "usuario_id" = (select auth.uid())
  );

create policy "suporte_msg_select"
  on "public"."suporte_mensagens"
  for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
      from "public"."suporte_conversas" c
      where c.id = "conversa_id"
        and c.usuario_id = (select auth.uid())
    )
  );

create policy "suporte_msg_insert"
  on "public"."suporte_mensagens"
  for insert
  to authenticated
  with check (
    (select private.is_admin())
    or exists (
      select 1
      from "public"."suporte_conversas" c
      where c.id = "conversa_id"
        and c.usuario_id = (select auth.uid())
    )
  );

revoke all on table "public"."suporte_conversas" from anon;
revoke all on table "public"."suporte_mensagens" from anon;
revoke all on table "public"."suporte_conversas" from authenticated;
revoke all on table "public"."suporte_mensagens" from authenticated;
grant select, insert, update on table "public"."suporte_conversas" to authenticated;
grant select, insert on table "public"."suporte_mensagens" to authenticated;
grant all on table "public"."suporte_conversas" to service_role;
grant all on table "public"."suporte_mensagens" to service_role;
