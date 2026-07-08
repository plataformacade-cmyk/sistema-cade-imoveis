-- OPE-239: provider WhatsApp para Hermes.
--
-- Baseia a integracao em consentimento explicito, opt-out e auditoria de
-- envios. Credenciais reais do provider ficam fora do banco e fora do Git.

create table if not exists "public"."whatsapp_consentimentos" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "telefone_e164" text not null,
  "opt_in" boolean not null default false,
  "opt_out" boolean not null default false,
  "origem" text not null default 'manual',
  "criado_em" timestamp with time zone not null default now(),
  "atualizado_em" timestamp with time zone not null default now(),
  constraint "whatsapp_consentimentos_usuario_key" unique ("usuario_id"),
  constraint "whatsapp_consentimentos_telefone_check"
    check ("telefone_e164" ~ '^\+[1-9][0-9]{7,14}$')
);

create index if not exists "whatsapp_consentimentos_opt_idx"
  on "public"."whatsapp_consentimentos" ("opt_in", "opt_out", "atualizado_em" desc);

drop trigger if exists "whatsapp_consentimentos_set_atualizado_em"
  on "public"."whatsapp_consentimentos";
create trigger "whatsapp_consentimentos_set_atualizado_em"
  before update on "public"."whatsapp_consentimentos"
  for each row execute function "public"."set_atualizado_em"();

alter table "public"."whatsapp_consentimentos" enable row level security;

revoke all on table "public"."whatsapp_consentimentos" from anon;
revoke all on table "public"."whatsapp_consentimentos" from authenticated;
grant select, insert, update on table "public"."whatsapp_consentimentos" to authenticated;
grant select, insert, update, delete on table "public"."whatsapp_consentimentos" to service_role;

drop policy if exists "whatsapp consentimentos usuario le" on "public"."whatsapp_consentimentos";
create policy "whatsapp consentimentos usuario le"
  on "public"."whatsapp_consentimentos"
  for select
  to authenticated
  using (
    "usuario_id" = (select auth.uid())
    or (select "private"."is_admin"())
  );

drop policy if exists "whatsapp consentimentos usuario cria" on "public"."whatsapp_consentimentos";
create policy "whatsapp consentimentos usuario cria"
  on "public"."whatsapp_consentimentos"
  for insert
  to authenticated
  with check (
    "usuario_id" = (select auth.uid())
    or (select "private"."is_admin"())
  );

drop policy if exists "whatsapp consentimentos usuario atualiza" on "public"."whatsapp_consentimentos";
create policy "whatsapp consentimentos usuario atualiza"
  on "public"."whatsapp_consentimentos"
  for update
  to authenticated
  using (
    "usuario_id" = (select auth.uid())
    or (select "private"."is_admin"())
  )
  with check (
    "usuario_id" = (select auth.uid())
    or (select "private"."is_admin"())
  );

create table if not exists "public"."whatsapp_envios" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid references "public"."usuarios"("id") on delete set null,
  "telefone_mascarado" text not null,
  "provider" text not null default 'meta_cloud',
  "template" text not null,
  "status" text not null,
  "provider_message_id" text,
  "erro_codigo" text,
  "payload" jsonb not null default '{}'::jsonb,
  "criado_em" timestamp with time zone not null default now(),
  constraint "whatsapp_envios_status_check"
    check ("status" in (
      'dry_run',
      'enviado',
      'falha',
      'bloqueado_opt_in',
      'bloqueado_opt_out',
      'provider_nao_configurado'
    ))
);

create index if not exists "whatsapp_envios_usuario_criado_idx"
  on "public"."whatsapp_envios" ("usuario_id", "criado_em" desc);
create index if not exists "whatsapp_envios_template_status_idx"
  on "public"."whatsapp_envios" ("template", "status", "criado_em" desc);

alter table "public"."whatsapp_envios" enable row level security;

revoke all on table "public"."whatsapp_envios" from anon;
revoke all on table "public"."whatsapp_envios" from authenticated;
grant select on table "public"."whatsapp_envios" to authenticated;
grant select, insert, update, delete on table "public"."whatsapp_envios" to service_role;

drop policy if exists "whatsapp envios admin le" on "public"."whatsapp_envios";
create policy "whatsapp envios admin le"
  on "public"."whatsapp_envios"
  for select
  to authenticated
  using ((select "private"."is_admin"()));
