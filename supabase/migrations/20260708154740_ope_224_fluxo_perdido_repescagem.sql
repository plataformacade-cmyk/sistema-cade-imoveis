-- OPE-224: fluxo de perdido e repescagem de lead.
--
-- Quando um negocio vira perdido, a plataforma preserva motivo, sugestoes de
-- imoveis similares e estado da cadencia. Hermes opera a repescagem de forma
-- idempotente; o lead pode responder ou pedir parada.

alter table "public"."hermes_automacoes_execucoes"
  drop constraint if exists "hermes_automacoes_execucoes_tipo_check";

alter table "public"."hermes_automacoes_execucoes"
  add constraint "hermes_automacoes_execucoes_tipo_check"
  check ("tipo" in (
    'suporte_tema_recorrente',
    'negocio_travado_followup',
    'lead_repescagem_followup',
    'preco_bairro_alerta',
    'saude_sistema_alerta',
    'job_manual'
  ));

alter table "public"."negocio_handoffs_humanos"
  drop constraint if exists "negocio_handoffs_origem_check";

alter table "public"."negocio_handoffs_humanos"
  add constraint "negocio_handoffs_origem_check"
  check ("origem" in (
    'hermes_negocio_travado',
    'hermes_repescagem',
    'followup_externo',
    'manual'
  ));

create table if not exists "public"."negocio_repescagens" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "comprador_id" uuid references "public"."usuarios"("id") on delete set null,
  "criado_por" uuid references "public"."usuarios"("id") on delete set null,
  "motivo_perda" text,
  "origem" text not null default 'manual',
  "status" text not null default 'pendente',
  "aceita_similares" boolean,
  "resposta_lead" text,
  "parar_cadencia" boolean not null default false,
  "tentativas" integer not null default 0,
  "proxima_tentativa_em" timestamp with time zone,
  "ultima_tentativa_em" timestamp with time zone,
  "imoveis_recomendados" jsonb not null default '[]'::jsonb,
  "automacao_execucao_id" uuid references "public"."hermes_automacoes_execucoes"("id") on delete set null,
  "encerrado_em" timestamp with time zone,
  "criado_em" timestamp with time zone not null default now(),
  "atualizado_em" timestamp with time zone not null default now(),
  constraint "negocio_repescagens_negocio_unique" unique ("negocio_id"),
  constraint "negocio_repescagens_origem_check"
    check ("origem" in ('manual', 'status_select', 'hermes', 'handoff')),
  constraint "negocio_repescagens_status_check"
    check ("status" in ('pendente', 'em_cadencia', 'respondido', 'encerrado')),
  constraint "negocio_repescagens_tentativas_check" check ("tentativas" >= 0),
  constraint "negocio_repescagens_resposta_lead_len"
    check ("resposta_lead" is null or char_length("resposta_lead") <= 1200),
  constraint "negocio_repescagens_motivo_len"
    check ("motivo_perda" is null or char_length("motivo_perda") <= 800)
);

create index if not exists "negocio_repescagens_fila_idx"
  on "public"."negocio_repescagens" ("status", "parar_cadencia", "proxima_tentativa_em");

create index if not exists "negocio_repescagens_comprador_idx"
  on "public"."negocio_repescagens" ("comprador_id", "criado_em" desc);

drop trigger if exists "negocio_repescagens_set_atualizado_em"
  on "public"."negocio_repescagens";
create trigger "negocio_repescagens_set_atualizado_em"
  before update on "public"."negocio_repescagens"
  for each row execute function "public"."set_atualizado_em"();

create or replace function "public"."negocio_repescagem_sync_encerramento"()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new."parar_cadencia" = true and new."status" <> 'encerrado' then
    new."status" := 'encerrado';
    new."encerrado_em" := coalesce(new."encerrado_em", now());
    new."proxima_tentativa_em" := null;
  end if;

  if new."status" = 'encerrado' and new."encerrado_em" is null then
    new."encerrado_em" := now();
  end if;

  return new;
end;
$$;

revoke all on function "public"."negocio_repescagem_sync_encerramento"() from public;
revoke all on function "public"."negocio_repescagem_sync_encerramento"() from anon;
revoke all on function "public"."negocio_repescagem_sync_encerramento"() from authenticated;

drop trigger if exists "negocio_repescagens_sync_encerramento"
  on "public"."negocio_repescagens";
create trigger "negocio_repescagens_sync_encerramento"
  before insert or update on "public"."negocio_repescagens"
  for each row execute function "public"."negocio_repescagem_sync_encerramento"();

alter table "public"."negocio_repescagens" enable row level security;

revoke all on table "public"."negocio_repescagens" from anon;
revoke all on table "public"."negocio_repescagens" from authenticated;
grant select, insert, update on table "public"."negocio_repescagens" to authenticated;
grant select, insert, update, delete on table "public"."negocio_repescagens" to service_role;

drop policy if exists "repescagens participantes leem"
  on "public"."negocio_repescagens";
create policy "repescagens participantes leem"
  on "public"."negocio_repescagens"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_repescagens"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
    )
  );

drop policy if exists "repescagens operador cria"
  on "public"."negocio_repescagens";
create policy "repescagens operador cria"
  on "public"."negocio_repescagens"
  for insert
  to authenticated
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_repescagens"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('proprietario', 'corretor', 'admin')
    )
  );

drop policy if exists "repescagens participantes atualizam permitido"
  on "public"."negocio_repescagens";
create policy "repescagens participantes atualizam permitido"
  on "public"."negocio_repescagens"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_repescagens"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
    )
  )
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_repescagens"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
    )
  );
