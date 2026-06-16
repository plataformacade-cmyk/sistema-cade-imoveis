-- Papel GLOBAL do usuário (faltava — só existia admin×resto e papel por-negócio).
-- Define a experiência do painel por perfil: cliente, proprietario, corretor, admin.
-- cliente = quem busca/tem interesse (não gerencia anúncios nem vê admin).

alter table "public"."usuarios"
  add column if not exists "papel" text not null default 'cliente';

do $$ begin
  alter table "public"."usuarios"
    add constraint "usuarios_papel_check"
    check ("papel" = any (array['cliente','proprietario','corretor','admin']));
exception when duplicate_object then null; end $$;

-- O signup público cria sempre um CLIENTE (a menos que venha papel no metadata).
create or replace function "public"."handle_new_user"() returns "trigger"
    language "plpgsql" security definer
    set "search_path" to 'public', 'pg_temp'
    as $$
begin
  insert into public.usuarios (id, email, nome, avatar_url, papel)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(nullif(new.raw_user_meta_data->>'papel',''), 'cliente')
  )
  on conflict (id) do nothing;

  insert into public.perfis (usuario_id)
  values (new.id)
  on conflict (usuario_id) do nothing;

  return new;
end;
$$;

-- Papel do usuário logado (conveniência p/ app e policies).
create or replace function "public"."meu_papel"() returns text
    language "sql" stable security definer
    set "search_path" to 'public', 'pg_temp'
    as $$
  select coalesce((select u.papel from public.usuarios u where u.id = auth.uid()), 'cliente');
$$;

-- Backfill: quem está na tabela admins vira papel 'admin'.
update "public"."usuarios" u
  set "papel" = 'admin'
  where exists (select 1 from public.admins a where a.usuario_id = u.id)
    and u.papel <> 'admin';
