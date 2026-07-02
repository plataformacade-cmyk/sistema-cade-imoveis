-- OPE-230: fluxo auditavel para seguir sem servico juridico contratado.

alter table "public"."negocios"
  drop constraint if exists "negocios_status_check";

alter table "public"."negocios"
  add constraint "negocios_status_check"
  check (
    "status" in (
      'qualificacao',
      'visita',
      'proposta',
      'documentos',
      'contrato',
      'cartorial',
      'acompanhamento_externo',
      'concluido',
      'perdido'
    )
  );

create table if not exists "public"."negocio_contato_externo_fluxos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "status" text not null default 'pendente'
    check ("status" in ('pendente', 'liberado', 'recusado')),
  "solicitado_por" uuid not null references "public"."usuarios"("id") on delete cascade,
  "termo_resumo" text not null,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  "liberado_em" timestamptz,
  "recusado_em" timestamptz,
  constraint "contato_externo_fluxo_negocio_key" unique ("negocio_id"),
  constraint "contato_externo_fluxo_id_negocio_key" unique ("id", "negocio_id")
);

create index if not exists "contato_externo_fluxos_status_idx"
  on "public"."negocio_contato_externo_fluxos" ("status", "criado_em" desc);

drop trigger if exists "contato_externo_fluxos_set_atualizado_em"
  on "public"."negocio_contato_externo_fluxos";
create trigger "contato_externo_fluxos_set_atualizado_em"
  before update on "public"."negocio_contato_externo_fluxos"
  for each row execute function "public"."set_atualizado_em"();

create table if not exists "public"."negocio_contato_externo_aceites" (
  "id" uuid primary key default gen_random_uuid(),
  "fluxo_id" uuid not null references "public"."negocio_contato_externo_fluxos"("id") on delete cascade,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "papel" text not null check ("papel" in ('comprador', 'proprietario')),
  "decisao" text not null check ("decisao" in ('aceitou', 'recusou')),
  "termo_resumo" text not null,
  "criado_em" timestamptz not null default now(),
  constraint "contato_externo_aceite_unico"
    unique ("negocio_id", "usuario_id", "papel"),
  constraint "contato_externo_aceite_fluxo_negocio"
    foreign key ("fluxo_id", "negocio_id")
    references "public"."negocio_contato_externo_fluxos"("id", "negocio_id")
    on delete cascade
);

create index if not exists "contato_externo_aceites_negocio_idx"
  on "public"."negocio_contato_externo_aceites" ("negocio_id", "papel", "decisao");

create or replace function "public"."contato_externo_sync_fluxo"()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tem_comprador boolean := false;
  v_tem_proprietario boolean := false;
begin
  if new.decisao = 'recusou' then
    update public.negocio_contato_externo_fluxos
       set status = 'recusado',
           recusado_em = coalesce(recusado_em, now())
     where id = new.fluxo_id
       and status = 'pendente';
    return new;
  end if;

  select exists (
    select 1
      from public.negocio_contato_externo_aceites a
      join public.papeis_negocio p
        on p.negocio_id = a.negocio_id
       and p.usuario_id = a.usuario_id
       and p.papel = a.papel
       and p.ativo
     where a.negocio_id = new.negocio_id
       and a.papel = 'comprador'
       and a.decisao = 'aceitou'
  ) into v_tem_comprador;

  select exists (
    select 1
      from public.negocio_contato_externo_aceites a
      join public.papeis_negocio p
        on p.negocio_id = a.negocio_id
       and p.usuario_id = a.usuario_id
       and p.papel = a.papel
       and p.ativo
     where a.negocio_id = new.negocio_id
       and a.papel = 'proprietario'
       and a.decisao = 'aceitou'
  ) into v_tem_proprietario;

  if v_tem_comprador and v_tem_proprietario then
    update public.negocio_contato_externo_fluxos
       set status = 'liberado',
           liberado_em = coalesce(liberado_em, now())
     where id = new.fluxo_id
       and status = 'pendente';

    update public.negocios
       set status = 'acompanhamento_externo'
     where id = new.negocio_id
       and status not in ('concluido', 'perdido');
  end if;

  return new;
end;
$$;

revoke all on function "public"."contato_externo_sync_fluxo"() from public;
revoke all on function "public"."contato_externo_sync_fluxo"() from anon;
revoke all on function "public"."contato_externo_sync_fluxo"() from authenticated;
grant execute on function "public"."contato_externo_sync_fluxo"() to service_role;

drop trigger if exists "contato_externo_sync_fluxo_trigger"
  on "public"."negocio_contato_externo_aceites";
create trigger "contato_externo_sync_fluxo_trigger"
  after insert on "public"."negocio_contato_externo_aceites"
  for each row execute function "public"."contato_externo_sync_fluxo"();

alter table "public"."negocio_contato_externo_fluxos" enable row level security;
alter table "public"."negocio_contato_externo_aceites" enable row level security;

drop policy if exists "contato externo fluxos participantes leem"
  on "public"."negocio_contato_externo_fluxos";
create policy "contato externo fluxos participantes leem"
  on "public"."negocio_contato_externo_fluxos"
  for select
  to authenticated
  using (
    public.is_admin()
    or public.tem_papel_no_negocio(negocio_id)
  );

drop policy if exists "contato externo fluxos participante cria"
  on "public"."negocio_contato_externo_fluxos";
create policy "contato externo fluxos participante cria"
  on "public"."negocio_contato_externo_fluxos"
  for insert
  to authenticated
  with check (
    solicitado_por = (select auth.uid())
    and public.tem_papel_no_negocio(negocio_id)
    and exists (
      select 1
        from public.negocios n
       where n.id = negocio_contato_externo_fluxos.negocio_id
         and n.status in (
           'documentos',
           'contrato',
           'cartorial',
           'acompanhamento_externo'
         )
         and not exists (
           select 1
             from public.servicos_juridicos_contratacoes s
            where s.status in ('contratado', 'em_atendimento')
              and (
                s.negocio_id = negocio_contato_externo_fluxos.negocio_id
                or s.imovel_id = n.imovel_id
              )
         )
    )
  );

drop policy if exists "contato externo aceites participantes leem"
  on "public"."negocio_contato_externo_aceites";
create policy "contato externo aceites participantes leem"
  on "public"."negocio_contato_externo_aceites"
  for select
  to authenticated
  using (
    public.is_admin()
    or public.tem_papel_no_negocio(negocio_id)
  );

drop policy if exists "contato externo aceites participante cria proprio"
  on "public"."negocio_contato_externo_aceites";
create policy "contato externo aceites participante cria proprio"
  on "public"."negocio_contato_externo_aceites"
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
        from public.negocio_contato_externo_fluxos f
       where f.id = negocio_contato_externo_aceites.fluxo_id
         and f.negocio_id = negocio_contato_externo_aceites.negocio_id
         and f.status = 'pendente'
         and exists (
           select 1
             from public.negocios n
            where n.id = f.negocio_id
              and n.status in (
                'documentos',
                'contrato',
                'cartorial',
                'acompanhamento_externo'
              )
              and not exists (
                select 1
                  from public.servicos_juridicos_contratacoes s
                 where s.status in ('contratado', 'em_atendimento')
                   and (
                     s.negocio_id = f.negocio_id
                     or s.imovel_id = n.imovel_id
                   )
              )
         )
    )
    and exists (
      select 1
        from public.papeis_negocio p
       where p.negocio_id = negocio_contato_externo_aceites.negocio_id
         and p.usuario_id = (select auth.uid())
         and p.papel = negocio_contato_externo_aceites.papel
         and p.papel in ('comprador', 'proprietario')
         and p.ativo
    )
  );

revoke all on table "public"."negocio_contato_externo_fluxos" from anon;
revoke all on table "public"."negocio_contato_externo_fluxos" from authenticated;
grant select, insert on table "public"."negocio_contato_externo_fluxos" to authenticated;
grant all on table "public"."negocio_contato_externo_fluxos" to service_role;

revoke all on table "public"."negocio_contato_externo_aceites" from anon;
revoke all on table "public"."negocio_contato_externo_aceites" from authenticated;
grant select, insert on table "public"."negocio_contato_externo_aceites" to authenticated;
grant all on table "public"."negocio_contato_externo_aceites" to service_role;
