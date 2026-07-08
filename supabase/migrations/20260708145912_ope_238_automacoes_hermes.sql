-- OPE-238: automacoes Hermes v1.
--
-- A tabela registra execucoes idempotentes por chave unica. Ela evita alertas
-- duplicados quando o job manual for reexecutado e deixa trilha auditavel para
-- suporte recorrente, negocios travados, comparacao de preco e saude do sistema.

create table if not exists "public"."hermes_automacoes_execucoes" (
  "id" uuid primary key default gen_random_uuid(),
  "chave" text not null,
  "tipo" text not null,
  "alvo_tipo" text,
  "alvo_id" uuid,
  "status" text not null default 'executada',
  "resumo" text,
  "payload" jsonb not null default '{}'::jsonb,
  "criado_em" timestamp with time zone not null default now(),
  "atualizado_em" timestamp with time zone not null default now(),
  constraint "hermes_automacoes_execucoes_chave_key" unique ("chave"),
  constraint "hermes_automacoes_execucoes_tipo_check"
    check ("tipo" in (
      'suporte_tema_recorrente',
      'negocio_travado_followup',
      'preco_bairro_alerta',
      'saude_sistema_alerta',
      'job_manual'
    )),
  constraint "hermes_automacoes_execucoes_status_check"
    check ("status" in ('executada', 'ignorada', 'erro'))
);

create index if not exists "hermes_automacoes_execucoes_tipo_criado_idx"
  on "public"."hermes_automacoes_execucoes" ("tipo", "criado_em" desc);

create index if not exists "hermes_automacoes_execucoes_alvo_idx"
  on "public"."hermes_automacoes_execucoes" ("alvo_tipo", "alvo_id");

drop trigger if exists "hermes_automacoes_execucoes_set_atualizado_em"
  on "public"."hermes_automacoes_execucoes";
create trigger "hermes_automacoes_execucoes_set_atualizado_em"
  before update on "public"."hermes_automacoes_execucoes"
  for each row execute function "public"."set_atualizado_em"();

alter table "public"."hermes_automacoes_execucoes" enable row level security;

revoke all on table "public"."hermes_automacoes_execucoes" from anon;
revoke all on table "public"."hermes_automacoes_execucoes" from authenticated;
grant select on table "public"."hermes_automacoes_execucoes" to authenticated;
grant select, insert, update, delete on table "public"."hermes_automacoes_execucoes" to service_role;

drop policy if exists "hermes automacoes admin le" on "public"."hermes_automacoes_execucoes";
create policy "hermes automacoes admin le"
  on "public"."hermes_automacoes_execucoes"
  for select
  to authenticated
  using ((select "private"."is_admin"()));
