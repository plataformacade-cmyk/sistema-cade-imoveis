-- OPE-223: formaliza proposta/contraproposta dentro do chat do negocio.

alter table "public"."mensagens"
  drop constraint if exists "mensagens_tipo_check";

alter table "public"."mensagens"
  add constraint "mensagens_tipo_check"
  check (
    "tipo" in (
      'texto',
      'visita_sugerida',
      'visita_confirmada',
      'visita_recusada',
      'proposta_enviada',
      'contraproposta_enviada',
      'proposta_aceita',
      'proposta_recusada'
    )
  );

drop policy if exists "propostas autor cria" on "public"."propostas";
create policy "propostas participante cria"
on "public"."propostas"
for insert
to authenticated
with check (
  "autor_id" = (select auth.uid())
  and (
    "public"."is_admin"()
    or "public"."tem_papel_no_negocio"("negocio_id")
  )
);

drop policy if exists "propostas participante responde" on "public"."propostas";
create policy "propostas participante responde"
on "public"."propostas"
for update
to authenticated
using (
  (
    "public"."is_admin"()
    or "public"."tem_papel_no_negocio"("negocio_id")
  )
  and "status" in ('enviada', 'contraproposta')
  and "autor_id" <> (select auth.uid())
)
with check (
  (
    "public"."is_admin"()
    or "public"."tem_papel_no_negocio"("negocio_id")
  )
  and "status" in ('aceita', 'recusada')
  and "autor_id" <> (select auth.uid())
);

create or replace function "public"."propostas_proteger_campos_formais"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
begin
  if new."negocio_id" is distinct from old."negocio_id"
    or new."autor_id" is distinct from old."autor_id"
    or new."valor" is distinct from old."valor"
    or new."condicoes" is distinct from old."condicoes"
    or new."criado_em" is distinct from old."criado_em"
  then
    raise exception 'campos formais da proposta nao podem ser alterados';
  end if;

  if old."status" is distinct from new."status" then
    if old."status" not in ('enviada', 'contraproposta')
      or new."status" not in ('aceita', 'recusada')
    then
      raise exception 'transicao de status de proposta invalida';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_propostas_proteger_campos_formais" on "public"."propostas";
create trigger "trg_propostas_proteger_campos_formais"
before update on "public"."propostas"
for each row
execute function "public"."propostas_proteger_campos_formais"();

create or replace function "public"."promover_negocio_proposta"()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
begin
  if TG_OP = 'INSERT' then
    update "public"."negocios"
    set "status" = 'proposta'
    where "id" = new."negocio_id"
      and "status" in ('qualificacao', 'visita');

    return new;
  end if;

  if old."status" is distinct from new."status" and new."status" = 'aceita' then
    update "public"."negocios"
    set "status" = 'documentos'
    where "id" = new."negocio_id"
      and "status" in ('qualificacao', 'visita', 'proposta');
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_promover_negocio_proposta_insert" on "public"."propostas";
create trigger "trg_promover_negocio_proposta_insert"
after insert on "public"."propostas"
for each row
execute function "public"."promover_negocio_proposta"();

drop trigger if exists "trg_promover_negocio_proposta_update" on "public"."propostas";
create trigger "trg_promover_negocio_proposta_update"
after update of "status" on "public"."propostas"
for each row
execute function "public"."promover_negocio_proposta"();

create or replace function "public"."notif_proposta_evento"()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_actor uuid;
  v_conversa uuid;
  v_titulo text;
  v_corpo text;
begin
  if TG_OP = 'INSERT' then
    v_actor := new."autor_id";
    v_titulo := case new."status"
      when 'contraproposta' then 'Nova contraproposta'
      else 'Nova proposta'
    end;
    v_corpo := 'Voce recebeu uma proposta em uma negociacao.';
  elsif old."status" is distinct from new."status" then
    v_actor := auth.uid();
    v_titulo := case new."status"
      when 'aceita' then 'Proposta aceita'
      when 'recusada' then 'Proposta recusada'
      else 'Proposta atualizada'
    end;
    v_corpo := 'Uma proposta da negociacao foi atualizada.';
  else
    return new;
  end if;

  select c."id" into v_conversa
  from "public"."conversas" c
  where c."negocio_id" = new."negocio_id"
  order by c."criado_em" asc
  limit 1;

  perform "public"."notificar"(
    p."usuario_id",
    'proposta',
    v_titulo,
    v_corpo,
    coalesce('/painel/mensagens/' || v_conversa, '/painel/negocios/' || new."negocio_id")
  )
  from "public"."papeis_negocio" p
  where p."negocio_id" = new."negocio_id"
    and p."ativo"
    and (v_actor is null or p."usuario_id" <> v_actor);

  return new;
end;
$$;

drop trigger if exists "trg_notif_proposta" on "public"."propostas";
create trigger "trg_notif_proposta"
after insert or update of "status" on "public"."propostas"
for each row
execute function "public"."notif_proposta_evento"();

revoke all on function "public"."propostas_proteger_campos_formais"() from public, anon, authenticated;
revoke all on function "public"."promover_negocio_proposta"() from public, anon, authenticated;
revoke all on function "public"."notif_proposta_evento"() from public, anon, authenticated;
