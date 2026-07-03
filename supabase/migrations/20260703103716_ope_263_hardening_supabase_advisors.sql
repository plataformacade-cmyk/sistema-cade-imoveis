-- OPE-263: hardening dos advisors Supabase de seguranca e performance.

create schema if not exists "private";

revoke all on schema "private" from public;
grant usage on schema "private" to anon, authenticated, service_role;

create or replace function "private"."is_admin"()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from "public"."admins" a
    where a."usuario_id" = (select auth.uid())
  );
$$;

create or replace function "private"."tem_papel_no_negocio"("neg_id" uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from "public"."papeis_negocio" p
    where p."negocio_id" = "neg_id"
      and p."usuario_id" = (select auth.uid())
      and p."ativo"
  );
$$;

create or replace function "private"."demonstrar_interesse_impl"("p_imovel_id" uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_proprietario uuid;
  v_status text;
  v_negocio_id uuid;
  v_existente uuid;
begin
  if v_uid is null then
    raise exception 'nao_autenticado';
  end if;

  select "proprietario_id", "status"
    into v_proprietario, v_status
  from "public"."imoveis"
  where "id" = p_imovel_id;

  if v_proprietario is null then
    raise exception 'imovel_inexistente';
  end if;

  if v_status <> 'ativo' then
    raise exception 'imovel_indisponivel';
  end if;

  if v_proprietario = v_uid then
    raise exception 'eh_proprietario';
  end if;

  select n."id"
    into v_existente
  from "public"."negocios" n
  join "public"."papeis_negocio" p on p."negocio_id" = n."id"
  where n."imovel_id" = p_imovel_id
    and p."usuario_id" = v_uid
    and p."papel" = 'comprador'
  limit 1;

  if v_existente is not null then
    return v_existente;
  end if;

  insert into "public"."negocios" ("imovel_id", "status", "criado_por")
  values (p_imovel_id, 'qualificacao', v_uid)
  returning "id" into v_negocio_id;

  insert into "public"."papeis_negocio" ("negocio_id", "usuario_id", "papel")
  values
    (v_negocio_id, v_uid, 'comprador'),
    (v_negocio_id, v_proprietario, 'proprietario');

  insert into "public"."conversas" ("negocio_id")
  values (v_negocio_id);

  return v_negocio_id;
end;
$$;

create or replace function "public"."demonstrar_interesse"("p_imovel_id" uuid)
returns uuid
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'nao_autenticado';
  end if;

  return "private"."demonstrar_interesse_impl"("p_imovel_id");
end;
$$;

create or replace function "public"."imoveis_busca_trigger"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new."busca" := to_tsvector(
    'portuguese',
    coalesce(new."logradouro", '') || ' ' ||
    coalesce(new."bairro", '') || ' ' ||
    coalesce(new."cidade", '') || ' ' ||
    coalesce(new."tipo", '')
  );

  return new;
end;
$$;

-- Mantem meu_papel sem privilegio elevado; a funcao nao e usada por policies.
create or replace function "public"."meu_papel"()
returns text
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (
      select u."papel"
      from "public"."usuarios" u
      where u."id" = (select auth.uid())
    ),
    'cliente'
  );
$$;

grant execute on function "private"."is_admin"() to anon, authenticated, service_role;
grant execute on function "private"."tem_papel_no_negocio"(uuid) to anon, authenticated, service_role;
grant execute on function "private"."demonstrar_interesse_impl"(uuid) to authenticated, service_role;

revoke all on function "public"."is_admin"() from public, anon, authenticated;
revoke all on function "public"."tem_papel_no_negocio"(uuid) from public, anon, authenticated;
revoke all on function "public"."meu_papel"() from public, anon, authenticated;
revoke all on function "public"."demonstrar_interesse"(uuid) from public, anon;
grant execute on function "public"."demonstrar_interesse"(uuid) to authenticated, service_role;

revoke all on function "public"."suporte_bump_conversa"() from public, anon, authenticated;
revoke all on function "public"."suporte_notif_escalada"() from public, anon, authenticated;
revoke all on function "public"."suporte_notif_resposta"() from public, anon, authenticated;

do $$
declare
  pol record;
  role_list text;
  original_qual text;
  original_check text;
  new_qual text;
  new_check text;
  ddl text;
begin
  for pol in
    select *
    from pg_policies
    where "schemaname" in ('public', 'storage')
  loop
    original_qual := pol."qual";
    original_check := pol."with_check";
    new_qual := original_qual;
    new_check := original_check;

    if new_qual is not null then
      new_qual := replace(new_qual, 'public.is_admin()', '(select private.is_admin())');
      new_qual := replace(new_qual, 'is_admin()', '(select private.is_admin())');
      new_qual := replace(new_qual, 'public.tem_papel_no_negocio', 'tem_papel_no_negocio');
      new_qual := regexp_replace(new_qual, 'tem_papel_no_negocio\(([^()]*)\)', '(select private.tem_papel_no_negocio(\1))', 'g');
      new_qual := regexp_replace(new_qual, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
    end if;

    if new_check is not null then
      new_check := replace(new_check, 'public.is_admin()', '(select private.is_admin())');
      new_check := replace(new_check, 'is_admin()', '(select private.is_admin())');
      new_check := replace(new_check, 'public.tem_papel_no_negocio', 'tem_papel_no_negocio');
      new_check := regexp_replace(new_check, 'tem_papel_no_negocio\(([^()]*)\)', '(select private.tem_papel_no_negocio(\1))', 'g');
      new_check := regexp_replace(new_check, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
    end if;

    if new_qual is distinct from original_qual or new_check is distinct from original_check then
      select string_agg(
        case
          when r = 'public' then 'public'
          else quote_ident(r)
        end,
        ', '
      )
        into role_list
      from unnest(pol."roles") as r;

      execute format('drop policy %I on %I.%I', pol."policyname", pol."schemaname", pol."tablename");

      ddl := format(
        'create policy %I on %I.%I as %s for %s to %s',
        pol."policyname",
        pol."schemaname",
        pol."tablename",
        pol."permissive",
        pol."cmd",
        role_list
      );

      if pol."cmd" <> 'INSERT' and new_qual is not null then
        ddl := ddl || ' using (' || new_qual || ')';
      end if;

      if pol."cmd" <> 'SELECT' and new_check is not null then
        ddl := ddl || ' with check (' || new_check || ')';
      end if;

      execute ddl;
    end if;
  end loop;
end;
$$;

-- Consolidacao de policies permissivas duplicadas que geravam advisors de performance.
drop policy if exists "corretores admin" on "public"."corretores";
drop policy if exists "corretores leitura" on "public"."corretores";
create policy "corretores leitura"
  on "public"."corretores"
  for select
  to public
  using (true);
create policy "corretores admin insere"
  on "public"."corretores"
  for insert
  to authenticated
  with check ((select "private"."is_admin"()));
create policy "corretores admin atualiza"
  on "public"."corretores"
  for update
  to authenticated
  using ((select "private"."is_admin"()))
  with check ((select "private"."is_admin"()));
create policy "corretores admin remove"
  on "public"."corretores"
  for delete
  to authenticated
  using ((select "private"."is_admin"()));

drop policy if exists "imobiliarias admin" on "public"."imobiliarias";
drop policy if exists "imobiliarias leitura" on "public"."imobiliarias";
create policy "imobiliarias leitura"
  on "public"."imobiliarias"
  for select
  to public
  using (true);
create policy "imobiliarias admin insere"
  on "public"."imobiliarias"
  for insert
  to authenticated
  with check ((select "private"."is_admin"()));
create policy "imobiliarias admin atualiza"
  on "public"."imobiliarias"
  for update
  to authenticated
  using ((select "private"."is_admin"()))
  with check ((select "private"."is_admin"()));
create policy "imobiliarias admin remove"
  on "public"."imobiliarias"
  for delete
  to authenticated
  using ((select "private"."is_admin"()));

drop policy if exists "imoveis vitrine publica" on "public"."imoveis";
drop policy if exists "imoveis_select" on "public"."imoveis";
create policy "imoveis_select"
  on "public"."imoveis"
  for select
  to public
  using (
    "status" = 'ativo'
    or (select "private"."is_admin"())
    or "proprietario_id" = (select auth.uid())
  );

drop policy if exists "documentos checklist admin gerencia" on "public"."documentos_checklist_itens";
drop policy if exists "documentos checklist autenticado le" on "public"."documentos_checklist_itens";
create policy "documentos checklist autenticado le"
  on "public"."documentos_checklist_itens"
  for select
  to authenticated
  using ("ativo" = true or (select "private"."is_admin"()));
create policy "documentos checklist admin insere"
  on "public"."documentos_checklist_itens"
  for insert
  to authenticated
  with check ((select "private"."is_admin"()));
create policy "documentos checklist admin atualiza"
  on "public"."documentos_checklist_itens"
  for update
  to authenticated
  using ((select "private"."is_admin"()))
  with check ((select "private"."is_admin"()));
create policy "documentos checklist admin remove"
  on "public"."documentos_checklist_itens"
  for delete
  to authenticated
  using ((select "private"."is_admin"()));

drop policy if exists "termos versoes admin gerencia" on "public"."termos_versoes";
drop policy if exists "termos versoes publicas le" on "public"."termos_versoes";
create policy "termos versoes publicas le"
  on "public"."termos_versoes"
  for select
  to anon, authenticated
  using (
    ("ativo" = true and "publicado_em" <= now())
    or (select "private"."is_admin"())
  );
create policy "termos versoes admin insere"
  on "public"."termos_versoes"
  for insert
  to authenticated
  with check ((select "private"."is_admin"()));
create policy "termos versoes admin atualiza"
  on "public"."termos_versoes"
  for update
  to authenticated
  using ((select "private"."is_admin"()))
  with check ((select "private"."is_admin"()));
create policy "termos versoes admin remove"
  on "public"."termos_versoes"
  for delete
  to authenticated
  using ((select "private"."is_admin"()));

-- Buckets publicos nao precisam de SELECT amplo em storage.objects para URL publica.
drop policy if exists "leitura publica imovel-fotos" on "storage"."objects";
drop policy if exists "leitura publica usuario-avatares" on "storage"."objects";
drop policy if exists "upload autenticado fotos e avatares" on "storage"."objects";
