-- OPE-225: alerta operacional para reincidencia de tentativa de contato externo.

create or replace function "public"."chat_alertar_reincidencia_contato"()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_total_24h integer;
  v_eh_anunciante boolean;
begin
  if new."usuario_id" is null then
    return new;
  end if;

  select exists (
    select 1
    from "public"."papeis_negocio" p
    where p."negocio_id" = new."negocio_id"
      and p."usuario_id" = new."usuario_id"
      and p."ativo" = true
      and p."papel" in ('proprietario', 'corretor', 'admin')
  )
  into v_eh_anunciante;

  if not coalesce(v_eh_anunciante, false) then
    return new;
  end if;

  select count(*)
  into v_total_24h
  from "public"."chat_tentativas_contato" t
  where t."negocio_id" = new."negocio_id"
    and t."usuario_id" = new."usuario_id"
    and t."criado_em" >= now() - interval '24 hours';

  -- Alerta apenas na primeira reincidencia do periodo, para nao gerar spam.
  if v_total_24h <> 2 then
    return new;
  end if;

  insert into "public"."logs_estruturados" (
    "evento",
    "severidade",
    "usuario_id",
    "entidade_id",
    "payload"
  )
  values (
    'contato_externo_reincidente',
    'warn',
    new."usuario_id",
    new."negocio_id",
    jsonb_build_object(
      'tentativa_id', new."id",
      'conversa_id', new."conversa_id",
      'entidade_tipo', new."entidade_tipo",
      'motivos', new."motivos",
      'origem', new."origem",
      'janela', '24h',
      'total_24h', v_total_24h
    )
  );

  insert into "public"."notificacoes" (
    "usuario_id",
    "tipo",
    "titulo",
    "corpo",
    "link"
  )
  select
    a."usuario_id",
    'sistema',
    'Tentativa recorrente de contato externo',
    'Um anunciante ou corretor tentou compartilhar contato fora da plataforma mais de uma vez no mesmo negocio.',
    '/painel/observabilidade?evento=contato_externo_reincidente'
  from "public"."admins" a
  where a."usuario_id" is not null;

  return new;
end;
$$;

drop trigger if exists "trg_chat_alertar_reincidencia_contato"
on "public"."chat_tentativas_contato";

create trigger "trg_chat_alertar_reincidencia_contato"
after insert on "public"."chat_tentativas_contato"
for each row
execute function "public"."chat_alertar_reincidencia_contato"();

revoke all on function "public"."chat_alertar_reincidencia_contato"()
from public, anon, authenticated;
