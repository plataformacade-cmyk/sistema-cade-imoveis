-- Notificações para os DOIS lados (pedido do João):
-- novo interesse → notifica o proprietário; nova mensagem/proposta → notifica
-- o outro lado do negócio. Tudo via gatilho SECURITY DEFINER (não depende do app).

create table if not exists "public"."notificacoes" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "tipo" text not null check ("tipo" in ('interesse','mensagem','proposta','visita','sistema')),
  "titulo" text not null,
  "corpo" text,
  "link" text,
  "lida" boolean not null default false,
  "criado_em" timestamptz not null default now()
);
create index if not exists "notificacoes_usuario_idx"
  on "public"."notificacoes" ("usuario_id", "lida", "criado_em" desc);

alter table "public"."notificacoes" enable row level security;

do $$ begin
  create policy "notif_select" on "public"."notificacoes"
    for select using ("usuario_id" = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notif_update" on "public"."notificacoes"
    for update using ("usuario_id" = auth.uid()) with check ("usuario_id" = auth.uid());
exception when duplicate_object then null; end $$;

-- Helper: cria uma notificação (não notifica o próprio autor da ação).
create or replace function "public"."notificar"(
  p_usuario uuid, p_tipo text, p_titulo text, p_corpo text, p_link text
) returns void language sql security definer set search_path to 'public','pg_temp' as $$
  insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
  select p_usuario, p_tipo, p_titulo, p_corpo, p_link
  where p_usuario is not null;
$$;

-- Novo interesse (papel comprador criado) → avisa o dono do imóvel.
create or replace function "public"."notif_novo_interesse"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_dono uuid; v_bairro text;
begin
  if new.papel <> 'comprador' then return new; end if;
  select i.proprietario_id, i.bairro into v_dono, v_bairro
  from public.negocios n join public.imoveis i on i.id = n.imovel_id
  where n.id = new.negocio_id;
  if v_dono is not null and v_dono <> new.usuario_id then
    perform public.notificar(v_dono, 'interesse',
      'Novo interesse no seu imóvel',
      coalesce('Alguém demonstrou interesse no imóvel em '||v_bairro||'.','Você recebeu um novo interesse.'),
      '/painel/negocios/'||new.negocio_id);
  end if;
  return new;
end; $$;

drop trigger if exists "trg_notif_interesse" on "public"."papeis_negocio";
create trigger "trg_notif_interesse" after insert on "public"."papeis_negocio"
  for each row execute function "public"."notif_novo_interesse"();

-- Nova mensagem → avisa os outros participantes do negócio.
create or replace function "public"."notif_nova_mensagem"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_neg uuid;
begin
  select c.negocio_id into v_neg from public.conversas c where c.id = new.conversa_id;
  if v_neg is null then return new; end if;
  perform public.notificar(p.usuario_id, 'mensagem',
    'Nova mensagem', 'Você recebeu uma nova mensagem em uma negociação.',
    '/painel/negocios/'||v_neg)
  from public.papeis_negocio p
  where p.negocio_id = v_neg and p.ativo and p.usuario_id <> new.autor_id;
  return new;
end; $$;

drop trigger if exists "trg_notif_mensagem" on "public"."mensagens";
create trigger "trg_notif_mensagem" after insert on "public"."mensagens"
  for each row execute function "public"."notif_nova_mensagem"();

-- Nova proposta → avisa os outros participantes.
create or replace function "public"."notif_nova_proposta"() returns trigger
  language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  perform public.notificar(p.usuario_id, 'proposta',
    'Nova proposta', 'Você recebeu uma proposta em uma negociação.',
    '/painel/negocios/'||new.negocio_id)
  from public.papeis_negocio p
  where p.negocio_id = new.negocio_id and p.ativo and p.usuario_id <> new.autor_id;
  return new;
end; $$;

drop trigger if exists "trg_notif_proposta" on "public"."propostas";
create trigger "trg_notif_proposta" after insert on "public"."propostas"
  for each row execute function "public"."notif_nova_proposta"();
