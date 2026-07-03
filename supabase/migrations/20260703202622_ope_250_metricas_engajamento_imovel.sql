-- OPE-250: metricas de engajamento por imovel.
--
-- Eventos brutos minimos ficam disponiveis apenas para admin/service_role.
-- Proprietarios e corretores recebem somente agregados calculados no servidor.

create table if not exists "public"."imovel_engajamento_eventos" (
  "id" uuid primary key default gen_random_uuid(),
  "imovel_id" uuid not null references "public"."imoveis"("id") on delete cascade,
  "usuario_id" uuid references "public"."usuarios"("id") on delete set null,
  "visitante_hash" text,
  "tipo" text not null,
  "origem" text,
  "referrer_host" text,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "duracao_ms" integer,
  "metadata" jsonb not null default '{}'::jsonb,
  "criado_em" timestamp with time zone not null default now(),
  constraint "imovel_engajamento_eventos_tipo_check"
    check ("tipo" = any (array[
      'visualizacao_detalhe'::text,
      'tempo_visualizacao'::text,
      'clique_interesse'::text,
      'interesse_registrado'::text,
      'compartilhamento'::text
    ])),
  constraint "imovel_engajamento_eventos_duracao_check"
    check ("duracao_ms" is null or ("duracao_ms" >= 0 and "duracao_ms" <= 86400000)),
  constraint "imovel_engajamento_eventos_visitante_hash_check"
    check ("visitante_hash" is null or length("visitante_hash") <= 128)
);

create index if not exists "idx_imovel_engajamento_imovel_criado"
  on "public"."imovel_engajamento_eventos" ("imovel_id", "criado_em" desc);

create index if not exists "idx_imovel_engajamento_tipo"
  on "public"."imovel_engajamento_eventos" ("tipo");

create index if not exists "idx_imovel_engajamento_referrer"
  on "public"."imovel_engajamento_eventos" ("referrer_host");

create index if not exists "idx_imovel_engajamento_visitante"
  on "public"."imovel_engajamento_eventos" ("visitante_hash");

alter table "public"."imovel_engajamento_eventos" enable row level security;

revoke all on table "public"."imovel_engajamento_eventos" from anon;
revoke all on table "public"."imovel_engajamento_eventos" from authenticated;

grant select on table "public"."imovel_engajamento_eventos" to authenticated;
grant select, insert, update, delete on table "public"."imovel_engajamento_eventos" to service_role;

drop policy if exists "imovel engajamento admin le" on "public"."imovel_engajamento_eventos";
create policy "imovel engajamento admin le"
  on "public"."imovel_engajamento_eventos"
  for select
  to authenticated
  using ((select "private"."is_admin"()));
