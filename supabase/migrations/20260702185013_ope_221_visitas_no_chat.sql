-- OPE-221: integra sugestao/confirmacao de visita ao chat do negocio.

alter table "public"."mensagens"
  add column if not exists "tipo" text not null default 'texto',
  add column if not exists "metadata" jsonb not null default '{}'::jsonb;

alter table "public"."mensagens"
  drop constraint if exists "mensagens_tipo_check";

alter table "public"."mensagens"
  add constraint "mensagens_tipo_check"
  check (
    "tipo" in (
      'texto',
      'visita_sugerida',
      'visita_confirmada',
      'visita_recusada'
    )
  );

create index if not exists "mensagens_tipo_idx"
  on "public"."mensagens" ("tipo");

drop policy if exists "conversas cria" on "public"."conversas";
create policy "conversas participante cria" on "public"."conversas"
  for insert to authenticated
  with check (
    "negocio_id" is not null
    and "public"."tem_papel_no_negocio"("negocio_id")
  );

drop policy if exists "mensagens autor cria" on "public"."mensagens";
create policy "mensagens participante cria" on "public"."mensagens"
  for insert to authenticated
  with check (
    "autor_id" = (select auth.uid())
    and exists (
      select 1
      from "public"."conversas" c
      where c."id" = "mensagens"."conversa_id"
        and c."negocio_id" is not null
        and "public"."tem_papel_no_negocio"(c."negocio_id")
    )
  );

drop policy if exists "visitas solicitante cria" on "public"."visitas";
create policy "visitas solicitante cria avulsa" on "public"."visitas"
  for insert to authenticated
  with check (
    "solicitante_id" = (select auth.uid())
    and "negocio_id" is null
  );

create policy "visitas participante le" on "public"."visitas"
  for select to authenticated
  using (
    "public"."is_admin"()
    or "solicitante_id" = (select auth.uid())
    or (
      "negocio_id" is not null
      and "public"."tem_papel_no_negocio"("negocio_id")
    )
  );

create policy "visitas anunciante sugere" on "public"."visitas"
  for insert to authenticated
  with check (
    "solicitante_id" = (select auth.uid())
    and "negocio_id" is not null
    and "imovel_id" = (
      select n."imovel_id"
      from "public"."negocios" n
      where n."id" = "visitas"."negocio_id"
    )
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "visitas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('proprietario', 'corretor', 'admin')
    )
  );

create policy "visitas comprador responde" on "public"."visitas"
  for update to authenticated
  using (
    "negocio_id" is not null
    and "status" in ('solicitada', 'aguardando_confirmacao', 'reagendada')
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "visitas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('comprador', 'admin')
    )
  )
  with check (
    "negocio_id" is not null
    and "status" in ('confirmada', 'cancelada')
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "visitas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('comprador', 'admin')
    )
  );

create policy "visitas anunciante reagenda" on "public"."visitas"
  for update to authenticated
  using (
    "negocio_id" is not null
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "visitas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('proprietario', 'corretor', 'admin')
    )
  )
  with check (
    "negocio_id" is not null
    and "status" in ('aguardando_confirmacao', 'reagendada', 'cancelada')
    and exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "visitas"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
        and p."papel" in ('proprietario', 'corretor', 'admin')
    )
  );

create or replace function "public"."notif_nova_mensagem"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_neg uuid;
begin
  if coalesce(new.tipo, 'texto') <> 'texto' then
    return new;
  end if;

  select c.negocio_id into v_neg from public.conversas c where c.id = new.conversa_id;
  if v_neg is null then return new; end if;
  perform public.notificar(p.usuario_id, 'mensagem',
    'Nova mensagem', 'Voce recebeu uma nova mensagem em uma negociacao.',
    '/painel/negocios/'||v_neg)
  from public.papeis_negocio p
  where p.negocio_id = v_neg and p.ativo and p.usuario_id <> new.autor_id;
  return new;
end; $$;

create or replace function "public"."notif_visita_evento"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_actor uuid := auth.uid();
  v_conversa uuid;
  v_titulo text;
  v_corpo text;
begin
  if new.negocio_id is null then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_titulo := 'Visita sugerida';
    v_corpo := 'Uma visita foi sugerida na negociacao.';
  elsif old.status is distinct from new.status then
    v_titulo := case new.status
      when 'confirmada' then 'Visita confirmada'
      when 'cancelada' then 'Visita recusada'
      when 'reagendada' then 'Visita reagendada'
      when 'realizada' then 'Visita realizada'
      else 'Visita atualizada'
    end;
    v_corpo := 'A visita da negociacao foi atualizada.';
  else
    return new;
  end if;

  select c.id into v_conversa
  from public.conversas c
  where c.negocio_id = new.negocio_id
  order by c.criado_em asc
  limit 1;

  perform public.notificar(p.usuario_id, 'visita',
    v_titulo, v_corpo,
    coalesce('/painel/mensagens/'||v_conversa, '/painel/negocios/'||new.negocio_id))
  from public.papeis_negocio p
  where p.negocio_id = new.negocio_id
    and p.ativo
    and (v_actor is null or p.usuario_id <> v_actor);

  return new;
end; $$;

drop trigger if exists "trg_notif_visita" on "public"."visitas";
create trigger "trg_notif_visita" after insert or update of status on "public"."visitas"
  for each row execute function "public"."notif_visita_evento"();

revoke all on function "public"."notif_visita_evento"() from public, anon, authenticated;
revoke all on function "public"."notif_nova_mensagem"() from public, anon, authenticated;
revoke all on function "public"."notif_nova_proposta"() from public, anon, authenticated;
revoke all on function "public"."notif_novo_interesse"() from public, anon, authenticated;
revoke all on function "public"."notificar"(uuid, text, text, text, text) from public, anon, authenticated;
