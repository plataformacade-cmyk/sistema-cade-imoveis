-- Chat de suporte: agente dentro da plataforma (widget no canto inferior direito)
-- que atende TODOS os perfis. Cada usuário tem suas conversas; o assistente
-- responde na hora e, quando precisa, escala para um humano (admin) que
-- responde pelo painel. Notificações fecham o laço para os dois lados.

create table if not exists "public"."suporte_conversas" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  -- papel do usuário no momento da abertura (snapshot p/ o atendente entender o contexto)
  "papel" text not null default 'cliente',
  "assunto" text,
  "status" text not null default 'ativa'
    check ("status" in ('ativa','aguardando_humano','resolvida')),
  "atendente_id" uuid references "public"."usuarios"("id") on delete set null,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now()
);
create index if not exists "suporte_conversas_usuario_idx"
  on "public"."suporte_conversas" ("usuario_id", "atualizado_em" desc);
create index if not exists "suporte_conversas_status_idx"
  on "public"."suporte_conversas" ("status", "atualizado_em" desc);

create table if not exists "public"."suporte_mensagens" (
  "id" uuid primary key default gen_random_uuid(),
  "conversa_id" uuid not null references "public"."suporte_conversas"("id") on delete cascade,
  -- quem falou: o usuário, o assistente (IA) ou um atendente humano
  "autor" text not null check ("autor" in ('usuario','assistente','humano')),
  "autor_id" uuid references "public"."usuarios"("id") on delete set null,
  "corpo" text not null,
  "criado_em" timestamptz not null default now()
);
create index if not exists "suporte_mensagens_conversa_idx"
  on "public"."suporte_mensagens" ("conversa_id", "criado_em");

alter table "public"."suporte_conversas" enable row level security;
alter table "public"."suporte_mensagens" enable row level security;

-- Conversas: o dono vê/abre/atualiza a sua; admin vê e atende todas.
do $$ begin
  create policy "suporte_conv_select" on "public"."suporte_conversas"
    for select using ("public"."is_admin"() or "usuario_id" = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "suporte_conv_insert" on "public"."suporte_conversas"
    for insert with check ("usuario_id" = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "suporte_conv_update" on "public"."suporte_conversas"
    for update using ("public"."is_admin"() or "usuario_id" = auth.uid())
    with check ("public"."is_admin"() or "usuario_id" = auth.uid());
exception when duplicate_object then null; end $$;

-- Mensagens: visíveis para o dono da conversa e para admin; o usuário só
-- insere na própria conversa, o admin (humano) insere em qualquer uma.
do $$ begin
  create policy "suporte_msg_select" on "public"."suporte_mensagens"
    for select using (
      "public"."is_admin"() or exists (
        select 1 from "public"."suporte_conversas" c
        where c.id = "conversa_id" and c.usuario_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "suporte_msg_insert" on "public"."suporte_mensagens"
    for insert with check (
      "public"."is_admin"() or exists (
        select 1 from "public"."suporte_conversas" c
        where c.id = "conversa_id" and c.usuario_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- Toda nova mensagem mantém atualizado_em em dia (ordena a fila do atendente).
create or replace function "public"."suporte_bump_conversa"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  update public.suporte_conversas set atualizado_em = now() where id = new.conversa_id;
  return new;
end; $$;
drop trigger if exists "trg_suporte_bump" on "public"."suporte_mensagens";
create trigger "trg_suporte_bump" after insert on "public"."suporte_mensagens"
  for each row execute function "public"."suporte_bump_conversa"();

-- Atendente humano respondeu → avisa o usuário (sino do painel).
create or replace function "public"."suporte_notif_resposta"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_dono uuid;
begin
  if new.autor <> 'humano' then return new; end if;
  select usuario_id into v_dono from public.suporte_conversas where id = new.conversa_id;
  if v_dono is not null then
    perform public.notificar(v_dono, 'sistema',
      'O suporte respondeu',
      'Um atendente respondeu sua conversa no chat de suporte.',
      '/painel');
  end if;
  return new;
end; $$;
drop trigger if exists "trg_suporte_notif_resposta" on "public"."suporte_mensagens";
create trigger "trg_suporte_notif_resposta" after insert on "public"."suporte_mensagens"
  for each row execute function "public"."suporte_notif_resposta"();

-- Conversa escalada para humano → avisa TODOS os admins.
create or replace function "public"."suporte_notif_escalada"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if new.status = 'aguardando_humano'
     and (old.status is distinct from 'aguardando_humano') then
    perform public.notificar(a.usuario_id, 'sistema',
      'Novo chamado de suporte',
      'Um usuário pediu atendimento humano no chat de suporte.',
      '/painel/suporte')
    from public.admins a;
  end if;
  return new;
end; $$;
drop trigger if exists "trg_suporte_notif_escalada" on "public"."suporte_conversas";
create trigger "trg_suporte_notif_escalada" after update on "public"."suporte_conversas"
  for each row execute function "public"."suporte_notif_escalada"();

grant all on table "public"."suporte_conversas" to "anon","authenticated","service_role";
grant all on table "public"."suporte_mensagens" to "anon","authenticated","service_role";
