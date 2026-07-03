-- OPE-263: complemento para remover chamadas diretas restantes de auth.uid() em RLS.

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
      and (
        coalesce("qual", '') like '%auth.uid()%'
        or coalesce("with_check", '') like '%auth.uid()%'
      )
  loop
    original_qual := pol."qual";
    original_check := pol."with_check";
    new_qual := original_qual;
    new_check := original_check;

    if new_qual is not null then
      new_qual := replace(new_qual, '= auth.uid()', '= (select auth.uid())');
      new_qual := replace(new_qual, '<> auth.uid()', '<> (select auth.uid())');
      new_qual := replace(new_qual, '= (auth.uid())', '= (select auth.uid())');
      new_qual := replace(new_qual, '(auth.uid())::text', '((select auth.uid()))::text');
    end if;

    if new_check is not null then
      new_check := replace(new_check, '= auth.uid()', '= (select auth.uid())');
      new_check := replace(new_check, '<> auth.uid()', '<> (select auth.uid())');
      new_check := replace(new_check, '= (auth.uid())', '= (select auth.uid())');
      new_check := replace(new_check, '(auth.uid())::text', '((select auth.uid()))::text');
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
