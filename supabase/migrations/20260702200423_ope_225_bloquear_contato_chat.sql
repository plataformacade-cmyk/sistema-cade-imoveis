-- OPE-225: bloqueia troca de contato no chat da negociacao.

create table if not exists "public"."chat_tentativas_contato" (
  "id" uuid primary key default gen_random_uuid(),
  "conversa_id" uuid references "public"."conversas"("id") on delete set null,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "usuario_id" uuid references "public"."usuarios"("id") on delete set null,
  "entidade_tipo" text not null
    check ("entidade_tipo" in ('mensagem', 'proposta', 'visita')),
  "motivos" text[] not null,
  "texto_mascarado" text not null,
  "origem" text not null
    check ("origem" in ('server_action', 'db_trigger')),
  "criado_em" timestamptz not null default now()
);

create index if not exists "chat_tentativas_contato_negocio_idx"
  on "public"."chat_tentativas_contato" ("negocio_id", "criado_em" desc);

create index if not exists "chat_tentativas_contato_usuario_idx"
  on "public"."chat_tentativas_contato" ("usuario_id", "criado_em" desc);

alter table "public"."chat_tentativas_contato" enable row level security;

drop policy if exists "chat tentativas admin le" on "public"."chat_tentativas_contato";
create policy "chat tentativas admin le"
on "public"."chat_tentativas_contato"
for select
to authenticated
using ("public"."is_admin"());

drop policy if exists "chat tentativas participante cria" on "public"."chat_tentativas_contato";
create policy "chat tentativas participante cria"
on "public"."chat_tentativas_contato"
for insert
to authenticated
with check (
  "usuario_id" = (select auth.uid())
  and (
    "public"."is_admin"()
    or "public"."tem_papel_no_negocio"("negocio_id")
  )
  and (
    "conversa_id" is null
    or exists (
      select 1
      from "public"."conversas" c
      where c."id" = "chat_tentativas_contato"."conversa_id"
        and c."negocio_id" = "chat_tentativas_contato"."negocio_id"
    )
  )
);

grant select, insert on table "public"."chat_tentativas_contato" to "authenticated";
grant all on table "public"."chat_tentativas_contato" to "service_role";

create or replace function "public"."chat_contato_motivos"(p_text text)
returns text[]
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_text text := coalesce(p_text, '');
  v_norm text;
  v_motivos text[] := array[]::text[];
begin
  v_norm := lower(v_text);
  v_norm := translate(
    v_norm,
    'áàãâäéèêëíìîïóòõôöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'
  );

  if v_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' then
    v_motivos := array_append(v_motivos, 'email');
  end if;

  if v_text ~* '(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)' then
    v_motivos := array_append(v_motivos, 'whatsapp_link');
  end if;

  if v_norm ~ '\b((me\s+)?chama|manda|envia|passa|me\s+manda).{0,24}(zap|whats|whatsapp|wpp|telefone|contato)\b'
    or v_norm ~ '\b(zap|whats|whatsapp|wpp).{0,24}(me\s+chama|manda|envia|numero|telefone|contato)\b'
    or v_norm ~ '\btratar.{0,24}(fora|por\s+fora)\b'
    or v_norm ~ '\b(fora\s+da\s+plataforma|por\s+fora)\b'
  then
    v_motivos := array_append(v_motivos, 'convite_externo');
  end if;

  if v_text ~* '(\+?55[\s().-]*)?(\(?[1-9][0-9]\)?[\s().-]*)?9?[0-9]{4}[\s.-]?[0-9]{4}' then
    v_motivos := array_append(v_motivos, 'telefone');
  end if;

  return v_motivos;
end;
$$;

create or replace function "public"."chat_mascarar_contato"(p_text text)
returns text
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_text text := coalesce(p_text, '');
begin
  v_text := regexp_replace(
    v_text,
    '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}',
    '[contato removido]',
    'gi'
  );
  v_text := regexp_replace(
    v_text,
    '(https?://)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)/\S+',
    '[contato removido]',
    'gi'
  );
  v_text := regexp_replace(
    v_text,
    '(\+?55[\s().-]*)?(\(?[1-9][0-9]\)?[\s().-]*)?9?[0-9]{4}[\s.-]?[0-9]{4}',
    '[contato removido]',
    'gi'
  );

  if length(v_text) > 500 then
    v_text := left(v_text, 497) || '...';
  end if;

  return v_text;
end;
$$;

create or replace function "public"."chat_registrar_tentativa_contato"(
  p_conversa_id uuid,
  p_negocio_id uuid,
  p_usuario_id uuid,
  p_entidade_tipo text,
  p_motivos text[],
  p_texto text,
  p_origem text
)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_usuario uuid := coalesce(p_usuario_id, (select auth.uid()));
  v_texto_mascarado text := "public"."chat_mascarar_contato"(p_texto);
begin
  if p_negocio_id is null or v_usuario is null or coalesce(array_length(p_motivos, 1), 0) = 0 then
    return;
  end if;

  insert into "public"."chat_tentativas_contato" (
    "conversa_id",
    "negocio_id",
    "usuario_id",
    "entidade_tipo",
    "motivos",
    "texto_mascarado",
    "origem"
  )
  values (
    p_conversa_id,
    p_negocio_id,
    v_usuario,
    p_entidade_tipo,
    p_motivos,
    v_texto_mascarado,
    p_origem
  );

  insert into "public"."logs_estruturados" (
    "evento",
    "severidade",
    "usuario_id",
    "entidade_id",
    "payload"
  )
  values (
    'mensagem_contato_bloqueado',
    'warn',
    v_usuario,
    p_negocio_id,
    jsonb_build_object(
      'conversa_id', p_conversa_id,
      'entidade_tipo', p_entidade_tipo,
      'motivos', p_motivos,
      'origem', p_origem
    )
  );
end;
$$;

create or replace function "public"."chat_bloquear_contato_mensagens"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_motivos text[];
  v_negocio uuid;
begin
  if coalesce(new."tipo", 'texto') <> 'texto' then
    return new;
  end if;

  v_motivos := "public"."chat_contato_motivos"(new."corpo");
  if coalesce(array_length(v_motivos, 1), 0) = 0 then
    return new;
  end if;

  select c."negocio_id" into v_negocio
  from "public"."conversas" c
  where c."id" = new."conversa_id";

  perform "public"."chat_registrar_tentativa_contato"(
    new."conversa_id",
    v_negocio,
    new."autor_id",
    'mensagem',
    v_motivos,
    new."corpo",
    'db_trigger'
  );

  return null;
end;
$$;

drop trigger if exists "trg_chat_bloquear_contato_mensagens" on "public"."mensagens";
create trigger "trg_chat_bloquear_contato_mensagens"
before insert on "public"."mensagens"
for each row
execute function "public"."chat_bloquear_contato_mensagens"();

create or replace function "public"."chat_bloquear_contato_propostas"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_motivos text[];
  v_conversa uuid;
begin
  if new."condicoes" is null then
    return new;
  end if;

  v_motivos := "public"."chat_contato_motivos"(new."condicoes");
  if coalesce(array_length(v_motivos, 1), 0) = 0 then
    return new;
  end if;

  select c."id" into v_conversa
  from "public"."conversas" c
  where c."negocio_id" = new."negocio_id"
  order by c."criado_em" asc
  limit 1;

  perform "public"."chat_registrar_tentativa_contato"(
    v_conversa,
    new."negocio_id",
    new."autor_id",
    'proposta',
    v_motivos,
    new."condicoes",
    'db_trigger'
  );

  if TG_OP = 'INSERT' then
    return null;
  end if;

  return old;
end;
$$;

drop trigger if exists "trg_chat_bloquear_contato_propostas" on "public"."propostas";
create trigger "trg_chat_bloquear_contato_propostas"
before insert or update of "condicoes" on "public"."propostas"
for each row
execute function "public"."chat_bloquear_contato_propostas"();

create or replace function "public"."chat_bloquear_contato_visitas"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_motivos text[];
  v_conversa uuid;
  v_usuario uuid;
begin
  if new."negocio_id" is null or new."observacoes" is null then
    return new;
  end if;

  v_motivos := "public"."chat_contato_motivos"(new."observacoes");
  if coalesce(array_length(v_motivos, 1), 0) = 0 then
    return new;
  end if;

  select c."id" into v_conversa
  from "public"."conversas" c
  where c."negocio_id" = new."negocio_id"
  order by c."criado_em" asc
  limit 1;

  v_usuario := coalesce((select auth.uid()), new."solicitante_id");

  perform "public"."chat_registrar_tentativa_contato"(
    v_conversa,
    new."negocio_id",
    v_usuario,
    'visita',
    v_motivos,
    new."observacoes",
    'db_trigger'
  );

  if TG_OP = 'INSERT' then
    return null;
  end if;

  return old;
end;
$$;

drop trigger if exists "trg_chat_bloquear_contato_visitas" on "public"."visitas";
create trigger "trg_chat_bloquear_contato_visitas"
before insert or update of "observacoes" on "public"."visitas"
for each row
execute function "public"."chat_bloquear_contato_visitas"();

revoke all on function "public"."chat_contato_motivos"(text) from public, anon, authenticated;
revoke all on function "public"."chat_mascarar_contato"(text) from public, anon, authenticated;
revoke all on function "public"."chat_registrar_tentativa_contato"(uuid, uuid, uuid, text, text[], text, text) from public, anon, authenticated;
revoke all on function "public"."chat_bloquear_contato_mensagens"() from public, anon, authenticated;
revoke all on function "public"."chat_bloquear_contato_propostas"() from public, anon, authenticated;
revoke all on function "public"."chat_bloquear_contato_visitas"() from public, anon, authenticated;
