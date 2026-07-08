-- OPE-254: fila de handoff humano/comercial para leads nao engajados.
--
-- Hermes cria itens quando identifica negocios travados. Admins e corretores
-- ativos do negocio operam a fila, registrando assumido, tentativa e resultado.

create table if not exists "public"."negocio_handoffs_humanos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "automacao_execucao_id" uuid references "public"."hermes_automacoes_execucoes"("id") on delete set null,
  "origem" text not null default 'hermes_negocio_travado',
  "motivo" text not null,
  "contexto" jsonb not null default '{}'::jsonb,
  "prioridade" text not null default 'normal',
  "status" text not null default 'aberto',
  "responsavel_id" uuid references "public"."usuarios"("id") on delete set null,
  "assumido_em" timestamp with time zone,
  "resultado" text,
  "observacao" text,
  "parar_cadencia" boolean not null default false,
  "concluido_em" timestamp with time zone,
  "criado_em" timestamp with time zone not null default now(),
  "atualizado_em" timestamp with time zone not null default now(),
  constraint "negocio_handoffs_origem_check"
    check ("origem" in ('hermes_negocio_travado', 'followup_externo', 'manual')),
  constraint "negocio_handoffs_prioridade_check"
    check ("prioridade" in ('baixa', 'normal', 'alta')),
  constraint "negocio_handoffs_status_check"
    check ("status" in ('aberto', 'em_atendimento', 'concluido', 'cancelado')),
  constraint "negocio_handoffs_resultado_check"
    check (
      "resultado" is null
      or "resultado" in (
        'contato_realizado',
        'sem_resposta',
        'quer_apoio',
        'reagendar',
        'parar_cadencia',
        'perdido'
      )
    ),
  constraint "negocio_handoffs_conclusao_check"
    check (
      ("status" in ('aberto', 'em_atendimento') and "concluido_em" is null)
      or ("status" in ('concluido', 'cancelado'))
    )
);

create index if not exists "negocio_handoffs_fila_idx"
  on "public"."negocio_handoffs_humanos" ("status", "prioridade", "criado_em");

create index if not exists "negocio_handoffs_negocio_idx"
  on "public"."negocio_handoffs_humanos" ("negocio_id", "criado_em" desc);

create unique index if not exists "negocio_handoffs_um_aberto_por_negocio_idx"
  on "public"."negocio_handoffs_humanos" ("negocio_id")
  where "status" in ('aberto', 'em_atendimento');

drop trigger if exists "negocio_handoffs_set_atualizado_em"
  on "public"."negocio_handoffs_humanos";
create trigger "negocio_handoffs_set_atualizado_em"
  before update on "public"."negocio_handoffs_humanos"
  for each row execute function "public"."set_atualizado_em"();

alter table "public"."negocio_handoffs_humanos" enable row level security;

revoke all on table "public"."negocio_handoffs_humanos" from anon;
revoke all on table "public"."negocio_handoffs_humanos" from authenticated;
grant select, update on table "public"."negocio_handoffs_humanos" to authenticated;
grant select, insert, update, delete on table "public"."negocio_handoffs_humanos" to service_role;

drop policy if exists "handoffs humanos admin/corretor leem"
  on "public"."negocio_handoffs_humanos";
create policy "handoffs humanos admin/corretor leem"
  on "public"."negocio_handoffs_humanos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_handoffs_humanos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('corretor', 'admin')
    )
  );

drop policy if exists "handoffs humanos admin/corretor atualizam"
  on "public"."negocio_handoffs_humanos";
create policy "handoffs humanos admin/corretor atualizam"
  on "public"."negocio_handoffs_humanos"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_handoffs_humanos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('corretor', 'admin')
    )
  )
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_handoffs_humanos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('corretor', 'admin')
    )
  );
