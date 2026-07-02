create or replace function "public"."cnpj_valido"("valor" text)
returns boolean
language plpgsql
immutable
set search_path to 'public', 'pg_temp'
as $$
declare
  cnpj text;
  soma integer;
  digito integer;
  i integer;
  pesos integer[];
begin
  cnpj := regexp_replace(coalesce(valor, ''), '[^0-9]', '', 'g');

  if length(cnpj) <> 14 or cnpj ~ '^([0-9])\1{13}$' then
    return false;
  end if;

  pesos := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma := 0;
  for i in 1..12 loop
    soma := soma + substring(cnpj from i for 1)::integer * pesos[i];
  end loop;

  digito := 11 - (soma % 11);
  if digito >= 10 then
    digito := 0;
  end if;

  if digito <> substring(cnpj from 13 for 1)::integer then
    return false;
  end if;

  pesos := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma := 0;
  for i in 1..13 loop
    soma := soma + substring(cnpj from i for 1)::integer * pesos[i];
  end loop;

  digito := 11 - (soma % 11);
  if digito >= 10 then
    digito := 0;
  end if;

  return digito = substring(cnpj from 14 for 1)::integer;
end;
$$;

create table if not exists "public"."vendedor_empresas" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "cnpj" text not null,
  "razao_social" text,
  "nome_fantasia" text,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "vendedor_empresas_cnpj_valido" check ("public"."cnpj_valido"("cnpj")),
  constraint "vendedor_empresas_usuario_cnpj_key" unique ("usuario_id", "cnpj")
);

create table if not exists "public"."negocio_vendedor_declaracoes" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "vendedor_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "possui_empresa" boolean not null,
  "observacoes" text,
  "declarado_por" uuid references "public"."usuarios"("id") on delete set null,
  "declarado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "negocio_vendedor_declaracoes_key"
    unique ("negocio_id", "vendedor_id")
);

create table if not exists "public"."negocio_vendedor_empresas" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "vendedor_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "vendedor_empresa_id" uuid not null references "public"."vendedor_empresas"("id") on delete cascade,
  "ativo" boolean not null default true,
  "criado_por" uuid references "public"."usuarios"("id") on delete set null,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "negocio_vendedor_empresas_key"
    unique ("negocio_id", "vendedor_empresa_id")
);

create index if not exists "vendedor_empresas_usuario_idx"
  on "public"."vendedor_empresas" ("usuario_id");

create index if not exists "negocio_vendedor_declaracoes_negocio_idx"
  on "public"."negocio_vendedor_declaracoes" ("negocio_id", "vendedor_id");

create index if not exists "negocio_vendedor_empresas_negocio_idx"
  on "public"."negocio_vendedor_empresas" ("negocio_id", "vendedor_id")
  where "ativo";

create index if not exists "negocio_vendedor_empresas_empresa_idx"
  on "public"."negocio_vendedor_empresas" ("vendedor_empresa_id")
  where "ativo";

alter table "public"."documentos"
  add column if not exists "vendedor_empresa_id" uuid
    references "public"."vendedor_empresas"("id") on delete restrict;

create index if not exists "documentos_vendedor_empresa_idx"
  on "public"."documentos" ("negocio_id", "vendedor_empresa_id")
  where "vendedor_empresa_id" is not null;

drop trigger if exists "vendedor_empresas_set_atualizado_em"
  on "public"."vendedor_empresas";
create trigger "vendedor_empresas_set_atualizado_em"
  before update on "public"."vendedor_empresas"
  for each row execute function "public"."set_atualizado_em"();

drop trigger if exists "negocio_vendedor_declaracoes_set_atualizado_em"
  on "public"."negocio_vendedor_declaracoes";
create trigger "negocio_vendedor_declaracoes_set_atualizado_em"
  before update on "public"."negocio_vendedor_declaracoes"
  for each row execute function "public"."set_atualizado_em"();

drop trigger if exists "negocio_vendedor_empresas_set_atualizado_em"
  on "public"."negocio_vendedor_empresas";
create trigger "negocio_vendedor_empresas_set_atualizado_em"
  before update on "public"."negocio_vendedor_empresas"
  for each row execute function "public"."set_atualizado_em"();

create or replace function "public"."vendedor_empresas_normalizar"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.cnpj := regexp_replace(coalesce(new.cnpj, ''), '[^0-9]', '', 'g');

  if not public.cnpj_valido(new.cnpj) then
    raise exception 'cnpj_invalido';
  end if;

  new.razao_social := nullif(btrim(new.razao_social), '');
  new.nome_fantasia := nullif(btrim(new.nome_fantasia), '');
  return new;
end;
$$;

drop trigger if exists "vendedor_empresas_normalizar_trigger"
  on "public"."vendedor_empresas";
create trigger "vendedor_empresas_normalizar_trigger"
  before insert or update on "public"."vendedor_empresas"
  for each row execute function "public"."vendedor_empresas_normalizar"();

create or replace function "public"."negocio_vendedor_declaracoes_validar"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if not exists (
    select 1
    from public.papeis_negocio p
    where p.negocio_id = new.negocio_id
      and p.usuario_id = new.vendedor_id
      and p.papel = 'proprietario'
      and p.ativo
  ) then
    raise exception 'vendedor_nao_participa_negocio';
  end if;

  new.observacoes := nullif(btrim(new.observacoes), '');
  if new.declarado_por is null then
    new.declarado_por := auth.uid();
  end if;
  if tg_op = 'UPDATE' then
    new.declarado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists "negocio_vendedor_declaracoes_validar_trigger"
  on "public"."negocio_vendedor_declaracoes";
create trigger "negocio_vendedor_declaracoes_validar_trigger"
  before insert or update on "public"."negocio_vendedor_declaracoes"
  for each row execute function "public"."negocio_vendedor_declaracoes_validar"();

create or replace function "public"."negocio_vendedor_empresas_validar"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if not exists (
    select 1
    from public.papeis_negocio p
    where p.negocio_id = new.negocio_id
      and p.usuario_id = new.vendedor_id
      and p.papel = 'proprietario'
      and p.ativo
  ) then
    raise exception 'vendedor_nao_participa_negocio';
  end if;

  if not exists (
    select 1
    from public.vendedor_empresas ve
    where ve.id = new.vendedor_empresa_id
      and ve.usuario_id = new.vendedor_id
  ) then
    raise exception 'empresa_nao_pertence_ao_vendedor';
  end if;

  if new.criado_por is null then
    new.criado_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists "negocio_vendedor_empresas_validar_trigger"
  on "public"."negocio_vendedor_empresas";
create trigger "negocio_vendedor_empresas_validar_trigger"
  before insert or update on "public"."negocio_vendedor_empresas"
  for each row execute function "public"."negocio_vendedor_empresas_validar"();

create or replace function "public"."documentos_sync_checklist"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  item record;
  negocio_tipo text;
  eh_certidao_empresa boolean;
begin
  if tg_op = 'UPDATE' then
    if new.negocio_id is distinct from old.negocio_id
      or new.enviado_por is distinct from old.enviado_por
      or new.arquivo_url is distinct from old.arquivo_url
      or new.checklist_item_id is distinct from old.checklist_item_id
      or new.vendedor_empresa_id is distinct from old.vendedor_empresa_id then
      raise exception 'documento_campos_imutaveis';
    end if;
  end if;

  if new.checklist_item_id is not null then
    select *
      into item
      from public.documentos_checklist_itens
     where id = new.checklist_item_id
       and ativo = true;

    if not found then
      raise exception 'checklist_item_invalido';
    end if;

    select coalesce(tipo, 'venda')
      into negocio_tipo
      from public.negocios
     where id = new.negocio_id;

    if negocio_tipo is null then
      raise exception 'negocio_invalido';
    end if;

    if item.tipo_negocio not in ('ambos', negocio_tipo) then
      raise exception 'checklist_item_nao_aplicavel';
    end if;

    eh_certidao_empresa := item.codigo like 'empresa_%';

    if eh_certidao_empresa and new.vendedor_empresa_id is null then
      raise exception 'certidao_empresa_exige_cnpj';
    end if;

    if new.vendedor_empresa_id is not null and not eh_certidao_empresa then
      raise exception 'empresa_apenas_em_certidao_empresarial';
    end if;

    if new.vendedor_empresa_id is not null and not exists (
      select 1
      from public.negocio_vendedor_empresas nve
      where nve.negocio_id = new.negocio_id
        and nve.vendedor_empresa_id = new.vendedor_empresa_id
        and nve.ativo
    ) then
      raise exception 'empresa_nao_vinculada_ao_negocio';
    end if;

    new.tipo_doc := item.codigo;
    new.perfil := item.perfil;
  elsif new.vendedor_empresa_id is not null then
    raise exception 'empresa_exige_item_checklist';
  end if;

  if new.status = 'reprovado' and nullif(btrim(coalesce(new.motivo_reprovacao, '')), '') is null then
    raise exception 'motivo_reprovacao_obrigatorio';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('verificado', 'reprovado') then
      new.revisado_por := coalesce(new.revisado_por, auth.uid());
      new.revisado_em := coalesce(new.revisado_em, now());
    else
      new.revisado_por := null;
      new.revisado_em := null;
      new.motivo_reprovacao := null;
    end if;
  end if;

  if new.status <> 'reprovado' then
    new.motivo_reprovacao := null;
  end if;

  return new;
end;
$$;

revoke all on function "public"."documentos_sync_checklist"() from public;
revoke all on function "public"."documentos_sync_checklist"() from anon;
revoke all on function "public"."documentos_sync_checklist"() from authenticated;
grant execute on function "public"."documentos_sync_checklist"() to service_role;

alter table "public"."vendedor_empresas" enable row level security;
alter table "public"."negocio_vendedor_declaracoes" enable row level security;
alter table "public"."negocio_vendedor_empresas" enable row level security;

drop policy if exists "vendedor_empresas_select"
  on "public"."vendedor_empresas";
create policy "vendedor_empresas_select"
  on "public"."vendedor_empresas"
  for select
  using (
    public.is_admin()
    or usuario_id = auth.uid()
    or exists (
      select 1
      from public.negocio_vendedor_empresas nve
      where nve.vendedor_empresa_id = vendedor_empresas.id
        and nve.ativo
        and public.tem_papel_no_negocio(nve.negocio_id)
    )
    or exists (
      select 1
      from public.papeis_negocio p_vendedor
      join public.papeis_negocio p_corretor
        on p_corretor.negocio_id = p_vendedor.negocio_id
      where p_vendedor.usuario_id = vendedor_empresas.usuario_id
        and p_vendedor.papel = 'proprietario'
        and p_vendedor.ativo
        and p_corretor.usuario_id = auth.uid()
        and p_corretor.papel = 'corretor'
        and p_corretor.ativo
    )
  );

drop policy if exists "vendedor_empresas_insert"
  on "public"."vendedor_empresas";
create policy "vendedor_empresas_insert"
  on "public"."vendedor_empresas"
  for insert
  with check (
    public.is_admin()
    or usuario_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p_vendedor
      join public.papeis_negocio p_corretor
        on p_corretor.negocio_id = p_vendedor.negocio_id
      where p_vendedor.usuario_id = vendedor_empresas.usuario_id
        and p_vendedor.papel = 'proprietario'
        and p_vendedor.ativo
        and p_corretor.usuario_id = auth.uid()
        and p_corretor.papel = 'corretor'
        and p_corretor.ativo
    )
  );

drop policy if exists "vendedor_empresas_update"
  on "public"."vendedor_empresas";
create policy "vendedor_empresas_update"
  on "public"."vendedor_empresas"
  for update
  using (
    public.is_admin()
    or usuario_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p_vendedor
      join public.papeis_negocio p_corretor
        on p_corretor.negocio_id = p_vendedor.negocio_id
      where p_vendedor.usuario_id = vendedor_empresas.usuario_id
        and p_vendedor.papel = 'proprietario'
        and p_vendedor.ativo
        and p_corretor.usuario_id = auth.uid()
        and p_corretor.papel = 'corretor'
        and p_corretor.ativo
    )
  )
  with check (
    public.is_admin()
    or usuario_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p_vendedor
      join public.papeis_negocio p_corretor
        on p_corretor.negocio_id = p_vendedor.negocio_id
      where p_vendedor.usuario_id = vendedor_empresas.usuario_id
        and p_vendedor.papel = 'proprietario'
        and p_vendedor.ativo
        and p_corretor.usuario_id = auth.uid()
        and p_corretor.papel = 'corretor'
        and p_corretor.ativo
    )
  );

drop policy if exists "negocio_vendedor_declaracoes_select"
  on "public"."negocio_vendedor_declaracoes";
create policy "negocio_vendedor_declaracoes_select"
  on "public"."negocio_vendedor_declaracoes"
  for select
  using (public.is_admin() or public.tem_papel_no_negocio(negocio_id));

drop policy if exists "negocio_vendedor_declaracoes_insert"
  on "public"."negocio_vendedor_declaracoes";
create policy "negocio_vendedor_declaracoes_insert"
  on "public"."negocio_vendedor_declaracoes"
  for insert
  with check (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_declaracoes.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  );

drop policy if exists "negocio_vendedor_declaracoes_update"
  on "public"."negocio_vendedor_declaracoes";
create policy "negocio_vendedor_declaracoes_update"
  on "public"."negocio_vendedor_declaracoes"
  for update
  using (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_declaracoes.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  )
  with check (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_declaracoes.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  );

drop policy if exists "negocio_vendedor_empresas_select"
  on "public"."negocio_vendedor_empresas";
create policy "negocio_vendedor_empresas_select"
  on "public"."negocio_vendedor_empresas"
  for select
  using (public.is_admin() or public.tem_papel_no_negocio(negocio_id));

drop policy if exists "negocio_vendedor_empresas_insert"
  on "public"."negocio_vendedor_empresas";
create policy "negocio_vendedor_empresas_insert"
  on "public"."negocio_vendedor_empresas"
  for insert
  with check (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_empresas.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  );

drop policy if exists "negocio_vendedor_empresas_update"
  on "public"."negocio_vendedor_empresas";
create policy "negocio_vendedor_empresas_update"
  on "public"."negocio_vendedor_empresas"
  for update
  using (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_empresas.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  )
  with check (
    public.is_admin()
    or vendedor_id = auth.uid()
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = negocio_vendedor_empresas.negocio_id
        and p.usuario_id = auth.uid()
        and p.papel = 'corretor'
        and p.ativo
    )
  );

revoke all on table "public"."vendedor_empresas" from anon;
revoke all on table "public"."negocio_vendedor_declaracoes" from anon;
revoke all on table "public"."negocio_vendedor_empresas" from anon;

grant select, insert, update on table "public"."vendedor_empresas" to authenticated;
grant select, insert, update on table "public"."negocio_vendedor_declaracoes" to authenticated;
grant select, insert, update on table "public"."negocio_vendedor_empresas" to authenticated;

grant all on table "public"."vendedor_empresas" to service_role;
grant all on table "public"."negocio_vendedor_declaracoes" to service_role;
grant all on table "public"."negocio_vendedor_empresas" to service_role;

insert into "public"."documentos_checklist_itens"
  ("tipo_negocio", "perfil", "codigo", "titulo", "descricao", "obrigatorio", "etapa", "ordem")
values
  (
    'venda',
    'vendedor',
    'empresa_cnd_federal_divida_ativa',
    'Certidao federal e divida ativa da empresa',
    'CND Receita Federal/PGFN da empresa vinculada ao vendedor.',
    true,
    'documentos_empresa',
    60
  ),
  (
    'venda',
    'vendedor',
    'empresa_certidao_trabalhista',
    'Certidao trabalhista da empresa',
    'Certidao de debitos trabalhistas da empresa vinculada ao vendedor.',
    true,
    'documentos_empresa',
    70
  ),
  (
    'venda',
    'vendedor',
    'empresa_certidao_civel_fiscal',
    'Certidoes civeis e fiscais da empresa',
    'Certidoes civeis, fiscais ou forenses aplicaveis a empresa do vendedor.',
    true,
    'documentos_empresa',
    80
  )
on conflict ("tipo_negocio", "perfil", "codigo") do update set
  "titulo" = excluded."titulo",
  "descricao" = excluded."descricao",
  "obrigatorio" = excluded."obrigatorio",
  "etapa" = excluded."etapa",
  "ordem" = excluded."ordem",
  "ativo" = true,
  "atualizado_em" = now();
