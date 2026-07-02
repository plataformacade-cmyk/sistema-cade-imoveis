create table if not exists "public"."negocio_followups_externos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "fluxo_id" uuid not null references "public"."negocio_contato_externo_fluxos"("id") on delete cascade,
  "tipo" text not null,
  "prazo_em" timestamp with time zone not null,
  "status" text not null default 'pendente',
  "resultado" text,
  "observacao" text,
  "responsavel_id" uuid references "public"."usuarios"("id") on delete set null,
  "respondido_por" uuid references "public"."usuarios"("id") on delete set null,
  "respondido_em" timestamp with time zone,
  "criado_em" timestamp with time zone not null default now(),
  "atualizado_em" timestamp with time zone not null default now(),
  constraint "followups_externos_tipo_check"
    check ("tipo" in ('dia_7', 'dia_30', 'dia_45')),
  constraint "followups_externos_status_check"
    check ("status" in ('pendente', 'respondido', 'cancelado')),
  constraint "followups_externos_resultado_check"
    check ("resultado" is null or "resultado" in ('fechou', 'travou', 'quer_apoio', 'sem_resposta', 'encerrar')),
  constraint "followups_externos_resposta_check"
    check (
      ("status" = 'pendente' and "resultado" is null and "respondido_por" is null and "respondido_em" is null)
      or ("status" = 'cancelado')
      or ("status" = 'respondido' and "resultado" is not null and "respondido_por" is not null and "respondido_em" is not null)
    ),
  constraint "followups_externos_fluxo_tipo_key" unique ("fluxo_id", "tipo"),
  constraint "followups_externos_fluxo_negocio_fkey"
    foreign key ("fluxo_id", "negocio_id")
    references "public"."negocio_contato_externo_fluxos"("id", "negocio_id")
    on delete cascade
);

create index if not exists "followups_externos_negocio_status_prazo_idx"
  on "public"."negocio_followups_externos" ("negocio_id", "status", "prazo_em");

create index if not exists "followups_externos_status_prazo_idx"
  on "public"."negocio_followups_externos" ("status", "prazo_em");

create index if not exists "followups_externos_responsavel_idx"
  on "public"."negocio_followups_externos" ("responsavel_id")
  where "responsavel_id" is not null;

drop trigger if exists "followups_externos_set_atualizado_em"
  on "public"."negocio_followups_externos";
create trigger "followups_externos_set_atualizado_em"
  before update on "public"."negocio_followups_externos"
  for each row execute function "public"."set_atualizado_em"();

create or replace function "public"."followup_externo_guard_update"()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.negocio_id is distinct from old.negocio_id
    or new.fluxo_id is distinct from old.fluxo_id
    or new.tipo is distinct from old.tipo
    or new.prazo_em is distinct from old.prazo_em
    or new.criado_em is distinct from old.criado_em then
    raise exception 'Campos estruturais do follow-up externo nao podem ser alterados.';
  end if;

  if old.status <> 'pendente' then
    raise exception 'Follow-up externo encerrado nao pode ser alterado.';
  end if;

  return new;
end;
$$;

revoke all on function "public"."followup_externo_guard_update"() from public;
revoke all on function "public"."followup_externo_guard_update"() from anon;
revoke all on function "public"."followup_externo_guard_update"() from authenticated;
grant execute on function "public"."followup_externo_guard_update"() to service_role;

drop trigger if exists "followup_externo_guard_update_trigger"
  on "public"."negocio_followups_externos";
create trigger "followup_externo_guard_update_trigger"
  before update on "public"."negocio_followups_externos"
  for each row execute function "public"."followup_externo_guard_update"();

create or replace function "public"."contato_externo_criar_followups"()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_em timestamp with time zone;
begin
  if new.status = 'liberado' and old.status is distinct from 'liberado' then
    base_em := coalesce(new.liberado_em, now());

    insert into public.negocio_followups_externos ("negocio_id", "fluxo_id", "tipo", "prazo_em")
    values
      (new.negocio_id, new.id, 'dia_7', base_em + interval '7 days'),
      (new.negocio_id, new.id, 'dia_30', base_em + interval '30 days'),
      (new.negocio_id, new.id, 'dia_45', base_em + interval '45 days')
    on conflict ("fluxo_id", "tipo") do nothing;

    insert into public.logs_estruturados ("evento", "severidade", "entidade_id", "payload")
    values (
      'followup_externo_criado',
      'info',
      new.negocio_id,
      jsonb_build_object('fluxo_id', new.id, 'origem', 'trigger')
    );
  end if;

  return new;
end;
$$;

revoke all on function "public"."contato_externo_criar_followups"() from public;
revoke all on function "public"."contato_externo_criar_followups"() from anon;
revoke all on function "public"."contato_externo_criar_followups"() from authenticated;
grant execute on function "public"."contato_externo_criar_followups"() to service_role;

drop trigger if exists "contato_externo_criar_followups_trigger"
  on "public"."negocio_contato_externo_fluxos";
create trigger "contato_externo_criar_followups_trigger"
  after update of "status" on "public"."negocio_contato_externo_fluxos"
  for each row execute function "public"."contato_externo_criar_followups"();

create or replace function "public"."followup_externo_sync_negocio"()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'respondido' and old.status is distinct from 'respondido' then
    if new.resultado = 'fechou' then
      update public.negocios
         set status = 'concluido'
       where id = new.negocio_id
         and status not in ('concluido', 'perdido');
    elsif new.resultado = 'encerrar' then
      update public.negocios
         set status = 'perdido'
       where id = new.negocio_id
         and status not in ('concluido', 'perdido');
    end if;
  end if;

  return new;
end;
$$;

revoke all on function "public"."followup_externo_sync_negocio"() from public;
revoke all on function "public"."followup_externo_sync_negocio"() from anon;
revoke all on function "public"."followup_externo_sync_negocio"() from authenticated;
grant execute on function "public"."followup_externo_sync_negocio"() to service_role;

drop trigger if exists "followup_externo_sync_negocio_trigger"
  on "public"."negocio_followups_externos";
create trigger "followup_externo_sync_negocio_trigger"
  after update of "status", "resultado" on "public"."negocio_followups_externos"
  for each row execute function "public"."followup_externo_sync_negocio"();

insert into "public"."negocio_followups_externos" ("negocio_id", "fluxo_id", "tipo", "prazo_em")
select
  f.negocio_id,
  f.id,
  etapas.tipo,
  coalesce(f.liberado_em, f.atualizado_em, f.criado_em, now()) + etapas.intervalo
from "public"."negocio_contato_externo_fluxos" f
cross join (
  values
    ('dia_7'::text, interval '7 days'),
    ('dia_30'::text, interval '30 days'),
    ('dia_45'::text, interval '45 days')
) as etapas(tipo, intervalo)
where f.status = 'liberado'
on conflict ("fluxo_id", "tipo") do nothing;

alter table "public"."negocio_followups_externos" enable row level security;

drop policy if exists "followups externos admin/corretor leem"
  on "public"."negocio_followups_externos";
create policy "followups externos admin/corretor leem"
  on "public"."negocio_followups_externos"
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
        from public.papeis_negocio p
       where p.negocio_id = negocio_followups_externos.negocio_id
         and p.usuario_id = (select auth.uid())
         and p.ativo = true
         and p.papel in ('corretor', 'admin')
    )
  );

drop policy if exists "followups externos admin/corretor atualizam"
  on "public"."negocio_followups_externos";
create policy "followups externos admin/corretor atualizam"
  on "public"."negocio_followups_externos"
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
        from public.papeis_negocio p
       where p.negocio_id = negocio_followups_externos.negocio_id
         and p.usuario_id = (select auth.uid())
         and p.ativo = true
         and p.papel in ('corretor', 'admin')
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
        from public.papeis_negocio p
       where p.negocio_id = negocio_followups_externos.negocio_id
         and p.usuario_id = (select auth.uid())
         and p.ativo = true
         and p.papel in ('corretor', 'admin')
    )
  );

revoke all on table "public"."negocio_followups_externos" from anon;
revoke all on table "public"."negocio_followups_externos" from authenticated;
grant select, update on table "public"."negocio_followups_externos" to authenticated;
grant all on table "public"."negocio_followups_externos" to service_role;
