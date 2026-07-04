-- OPE-252: prestadores e assinantes cartoriais.

create table if not exists "public"."prestadores_cartoriais" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "tipo" text not null default 'despachante'
    check ("tipo" in ('tabeliao', 'despachante', 'assinante_cartorial', 'agente_cartorial', 'juridico', 'outro')),
  "nome_exibicao" text not null,
  "documento" text,
  "registro_profissional" text,
  "empresa" text,
  "telefone" text,
  "email" text,
  "cidades_atuacao" text[] not null default '{}'::text[],
  "documentos_qualificacao" text,
  "status" text not null default 'pendente'
    check ("status" in ('pendente', 'aprovado', 'reprovado', 'suspenso')),
  "observacoes_admin" text,
  "aprovado_por" uuid references "public"."usuarios"("id"),
  "aprovado_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "prestadores_cartoriais_usuario_key" unique ("usuario_id")
);

create index if not exists "prestadores_cartoriais_status_idx"
  on "public"."prestadores_cartoriais" ("status", "atualizado_em" desc);

drop trigger if exists "prestadores_cartoriais_set_atualizado_em"
  on "public"."prestadores_cartoriais";
create trigger "prestadores_cartoriais_set_atualizado_em"
  before update on "public"."prestadores_cartoriais"
  for each row execute function "public"."set_atualizado_em"();

create table if not exists "public"."negocio_cartorial_prestadores" (
  "id" uuid primary key default gen_random_uuid(),
  "fluxo_id" uuid not null references "public"."negocio_cartorial_fluxos"("id") on delete cascade,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "prestador_id" uuid not null references "public"."prestadores_cartoriais"("id") on delete cascade,
  "papel_operacional" text not null default 'despachante'
    check ("papel_operacional" in ('tabeliao', 'despachante', 'assinante_cartorial', 'agente_cartorial', 'juridico', 'outro')),
  "status" text not null default 'ativo'
    check ("status" in ('ativo', 'removido', 'concluido')),
  "observacoes" text,
  "atribuido_por" uuid references "public"."usuarios"("id"),
  "removido_por" uuid references "public"."usuarios"("id"),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now()
);

create index if not exists "negocio_cartorial_prestadores_fluxo_idx"
  on "public"."negocio_cartorial_prestadores" ("fluxo_id", "status", "criado_em" desc);
create index if not exists "negocio_cartorial_prestadores_negocio_idx"
  on "public"."negocio_cartorial_prestadores" ("negocio_id", "status");
create unique index if not exists "negocio_cartorial_prestadores_ativo_key"
  on "public"."negocio_cartorial_prestadores" ("fluxo_id", "prestador_id")
  where "status" = 'ativo';

drop trigger if exists "negocio_cartorial_prestadores_set_atualizado_em"
  on "public"."negocio_cartorial_prestadores";
create trigger "negocio_cartorial_prestadores_set_atualizado_em"
  before update on "public"."negocio_cartorial_prestadores"
  for each row execute function "public"."set_atualizado_em"();

create or replace function "public"."prestador_cartorial_status_guard"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new."status" = 'aprovado' then
    if old."status" is distinct from 'aprovado' then
      new."aprovado_em" := coalesce(new."aprovado_em", now());
    end if;
  else
    new."aprovado_em" := null;
    new."aprovado_por" := null;
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_prestador_cartorial_status_guard"
  on "public"."prestadores_cartoriais";
create trigger "trg_prestador_cartorial_status_guard"
  before update on "public"."prestadores_cartoriais"
  for each row execute function "public"."prestador_cartorial_status_guard"();

create or replace function "public"."cartorial_prestadores_before_write"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_negocio_id uuid;
  v_status text;
begin
  select f."negocio_id"
    into v_negocio_id
  from "public"."negocio_cartorial_fluxos" f
  where f."id" = new."fluxo_id";

  if v_negocio_id is null then
    raise exception 'fluxo_cartorial_inexistente';
  end if;

  if new."negocio_id" is distinct from v_negocio_id then
    raise exception 'prestador_cartorial_negocio_inconsistente';
  end if;

  select p."status"
    into v_status
  from "public"."prestadores_cartoriais" p
  where p."id" = new."prestador_id";

  if v_status is distinct from 'aprovado' then
    raise exception 'prestador_cartorial_nao_aprovado';
  end if;

  if new."status" = 'removido' and new."removido_por" is null then
    new."removido_por" := (select auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_cartorial_prestadores_before_write"
  on "public"."negocio_cartorial_prestadores";
create trigger "trg_cartorial_prestadores_before_write"
  before insert or update on "public"."negocio_cartorial_prestadores"
  for each row execute function "public"."cartorial_prestadores_before_write"();

create or replace function "private"."prestador_cartorial_vinculado"("neg_id" uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
  select exists (
    select 1
    from "public"."negocio_cartorial_prestadores" v
    join "public"."prestadores_cartoriais" p on p."id" = v."prestador_id"
    where v."negocio_id" = "neg_id"
      and v."status" = 'ativo'
      and p."status" = 'aprovado'
      and p."usuario_id" = (select auth.uid())
  );
$$;

revoke all on function "public"."prestador_cartorial_status_guard"()
  from public, anon, authenticated;
revoke all on function "public"."cartorial_prestadores_before_write"()
  from public, anon, authenticated;
revoke all on function "private"."prestador_cartorial_vinculado"(uuid)
  from public, anon, authenticated;
grant execute on function "private"."prestador_cartorial_vinculado"(uuid)
  to authenticated, service_role;

alter table "public"."prestadores_cartoriais" enable row level security;
alter table "public"."negocio_cartorial_prestadores" enable row level security;

drop policy if exists "prestadores_cartoriais_acesso"
  on "public"."prestadores_cartoriais";
drop policy if exists "prestadores_cartoriais_cria_proprio"
  on "public"."prestadores_cartoriais";
drop policy if exists "prestadores_cartoriais_atualiza"
  on "public"."prestadores_cartoriais";

create policy "prestadores_cartoriais_acesso"
  on "public"."prestadores_cartoriais"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or "usuario_id" = (select auth.uid())
    or exists (
      select 1
      from "public"."negocio_cartorial_prestadores" v
      where v."prestador_id" = "prestadores_cartoriais"."id"
        and v."status" = 'ativo'
        and (select "private"."tem_papel_no_negocio"(v."negocio_id"))
    )
  );

create policy "prestadores_cartoriais_cria_proprio"
  on "public"."prestadores_cartoriais"
  for insert
  to authenticated
  with check (
    "usuario_id" = (select auth.uid())
    and "status" = 'pendente'
  );

create policy "prestadores_cartoriais_atualiza"
  on "public"."prestadores_cartoriais"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or "usuario_id" = (select auth.uid())
  )
  with check (
    (select "private"."is_admin"())
    or (
      "usuario_id" = (select auth.uid())
      and "status" = 'pendente'
    )
  );

drop policy if exists "cartorial_prestadores_acesso"
  on "public"."negocio_cartorial_prestadores";
drop policy if exists "cartorial_prestadores_operador_insere"
  on "public"."negocio_cartorial_prestadores";
drop policy if exists "cartorial_prestadores_operador_atualiza"
  on "public"."negocio_cartorial_prestadores";

create policy "cartorial_prestadores_acesso"
  on "public"."negocio_cartorial_prestadores"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
    or exists (
      select 1
      from "public"."prestadores_cartoriais" p
      where p."id" = "negocio_cartorial_prestadores"."prestador_id"
        and p."usuario_id" = (select auth.uid())
        and p."status" = 'aprovado'
    )
  );

create policy "cartorial_prestadores_operador_insere"
  on "public"."negocio_cartorial_prestadores"
  for insert
  to authenticated
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_prestadores"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

create policy "cartorial_prestadores_operador_atualiza"
  on "public"."negocio_cartorial_prestadores"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_prestadores"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  )
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_prestadores"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

revoke all on table "public"."prestadores_cartoriais" from anon, authenticated;
grant select, insert, update on table "public"."prestadores_cartoriais" to authenticated;
grant all on table "public"."prestadores_cartoriais" to service_role;

revoke all on table "public"."negocio_cartorial_prestadores" from anon, authenticated;
grant select, insert, update on table "public"."negocio_cartorial_prestadores" to authenticated;
grant all on table "public"."negocio_cartorial_prestadores" to service_role;

alter table "public"."negocio_cartorial_pendencias"
  drop constraint if exists "negocio_cartorial_pendencias_responsavel_papel_check";
alter table "public"."negocio_cartorial_pendencias"
  add constraint "negocio_cartorial_pendencias_responsavel_papel_check"
  check (
    "responsavel_papel" in (
      'comprador',
      'proprietario',
      'corretor',
      'admin',
      'operacao',
      'prestador'
    )
  );

drop policy if exists "negocios_select" on "public"."negocios";
create policy "negocios_select"
  on "public"."negocios"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("id"))
    or (select "private"."prestador_cartorial_vinculado"("id"))
  );

drop policy if exists "cartorial_fluxos_participantes_leem"
  on "public"."negocio_cartorial_fluxos";
create policy "cartorial_fluxos_participantes_leem"
  on "public"."negocio_cartorial_fluxos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
    or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
  );

drop policy if exists "cartorial_pendencias_participantes_leem"
  on "public"."negocio_cartorial_pendencias";
drop policy if exists "cartorial_pendencias_operador_atualiza"
  on "public"."negocio_cartorial_pendencias";

create policy "cartorial_pendencias_participantes_leem"
  on "public"."negocio_cartorial_pendencias"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
    or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
  );

create policy "cartorial_pendencias_operador_atualiza"
  on "public"."negocio_cartorial_pendencias"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_pendencias"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  )
  with check (
    (select "private"."is_admin"())
    or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_pendencias"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

drop policy if exists "cartorial_anexos_participantes_leem"
  on "public"."negocio_cartorial_anexos";
drop policy if exists "cartorial_anexos_participante_insere"
  on "public"."negocio_cartorial_anexos";

create policy "cartorial_anexos_participantes_leem"
  on "public"."negocio_cartorial_anexos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
    or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
  );

create policy "cartorial_anexos_participante_insere"
  on "public"."negocio_cartorial_anexos"
  for insert
  to authenticated
  with check (
    "enviado_por" = (select auth.uid())
    and (
      (select "private"."is_admin"())
      or (select "private"."tem_papel_no_negocio"("negocio_id"))
      or (select "private"."prestador_cartorial_vinculado"("negocio_id"))
    )
  );

drop policy if exists "documentos participantes leem"
  on "public"."documentos";
create policy "documentos participantes leem"
  on "public"."documentos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
    or (
      "tipo_doc" like 'cartorio_%'
      and (select "private"."prestador_cartorial_vinculado"("negocio_id"))
    )
  );

drop policy if exists "documentos-negocio leitura participante"
  on storage.objects;
create policy "documentos-negocio leitura participante"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos-negocio'
    and (
      exists (
        select 1
          from "public"."documentos" d
         where d."arquivo_url" = storage.objects.name
           and (
            (select "private"."is_admin"())
            or (select "private"."tem_papel_no_negocio"(d."negocio_id"))
            or (
              d."tipo_doc" like 'cartorio_%'
              and (select "private"."prestador_cartorial_vinculado"(d."negocio_id"))
            )
           )
      )
      or exists (
        select 1
          from "public"."negocio_cartorial_anexos" a
         where a."arquivo_url" = storage.objects.name
           and (
            (select "private"."is_admin"())
            or (select "private"."tem_papel_no_negocio"(a."negocio_id"))
            or (select "private"."prestador_cartorial_vinculado"(a."negocio_id"))
           )
      )
    )
  );
