-- OPE-233: fluxo cartorial operacional para compra e venda.

create table if not exists "public"."negocio_cartorial_fluxos" (
  "id" uuid primary key default gen_random_uuid(),
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "servico_juridico_contratacao_id" uuid references "public"."servicos_juridicos_contratacoes"("id") on delete set null,
  "modo" text not null default 'externo'
    check ("modo" in ('servico_cade', 'externo')),
  "status" text not null default 'pendente'
    check (
      "status" in (
        'pendente',
        'documentos_cartorio',
        'minuta',
        'itbi_custas',
        'pendencias',
        'agendado',
        'escritura',
        'registro',
        'matricula_atualizada',
        'concluido',
        'cancelado'
      )
    ),
  "cartorio_nome" text,
  "cartorio_link" text,
  "agendamento_em" timestamptz,
  "agendamento_link" text,
  "itbi_valor" numeric(14, 2),
  "custas_valor" numeric(14, 2),
  "observacoes" text,
  "confirmacao_operacional" text,
  "iniciado_por" uuid references "public"."usuarios"("id"),
  "concluido_por" uuid references "public"."usuarios"("id"),
  "iniciado_em" timestamptz not null default now(),
  "concluido_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "negocio_cartorial_fluxos_negocio_key" unique ("negocio_id"),
  constraint "negocio_cartorial_valores_nao_negativos"
    check (
      ("itbi_valor" is null or "itbi_valor" >= 0)
      and ("custas_valor" is null or "custas_valor" >= 0)
    )
);

create index if not exists "negocio_cartorial_fluxos_status_idx"
  on "public"."negocio_cartorial_fluxos" ("status", "atualizado_em" desc);

drop trigger if exists "negocio_cartorial_fluxos_set_atualizado_em"
  on "public"."negocio_cartorial_fluxos";
create trigger "negocio_cartorial_fluxos_set_atualizado_em"
  before update on "public"."negocio_cartorial_fluxos"
  for each row execute function "public"."set_atualizado_em"();

create table if not exists "public"."negocio_cartorial_pendencias" (
  "id" uuid primary key default gen_random_uuid(),
  "fluxo_id" uuid not null references "public"."negocio_cartorial_fluxos"("id") on delete cascade,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "titulo" text not null,
  "descricao" text,
  "responsavel_papel" text not null default 'operacao'
    check (
      "responsavel_papel" in (
        'comprador',
        'proprietario',
        'corretor',
        'admin',
        'operacao'
      )
    ),
  "responsavel_id" uuid references "public"."usuarios"("id"),
  "prazo_em" date,
  "status" text not null default 'aberta'
    check ("status" in ('aberta', 'em_andamento', 'resolvida', 'cancelada')),
  "observacao" text,
  "criado_por" uuid references "public"."usuarios"("id"),
  "resolvido_por" uuid references "public"."usuarios"("id"),
  "resolvido_em" timestamptz,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now()
);

create index if not exists "negocio_cartorial_pendencias_fluxo_idx"
  on "public"."negocio_cartorial_pendencias" ("fluxo_id", "status", "prazo_em");
create index if not exists "negocio_cartorial_pendencias_negocio_idx"
  on "public"."negocio_cartorial_pendencias" ("negocio_id", "status");

drop trigger if exists "negocio_cartorial_pendencias_set_atualizado_em"
  on "public"."negocio_cartorial_pendencias";
create trigger "negocio_cartorial_pendencias_set_atualizado_em"
  before update on "public"."negocio_cartorial_pendencias"
  for each row execute function "public"."set_atualizado_em"();

create table if not exists "public"."negocio_cartorial_anexos" (
  "id" uuid primary key default gen_random_uuid(),
  "fluxo_id" uuid not null references "public"."negocio_cartorial_fluxos"("id") on delete cascade,
  "pendencia_id" uuid references "public"."negocio_cartorial_pendencias"("id") on delete cascade,
  "negocio_id" uuid not null references "public"."negocios"("id") on delete cascade,
  "arquivo_url" text not null,
  "arquivo_nome" text,
  "descricao" text,
  "enviado_por" uuid not null references "public"."usuarios"("id"),
  "criado_em" timestamptz not null default now(),
  constraint "negocio_cartorial_anexos_arquivo_key" unique ("arquivo_url")
);

create index if not exists "negocio_cartorial_anexos_fluxo_idx"
  on "public"."negocio_cartorial_anexos" ("fluxo_id", "criado_em" desc);
create index if not exists "negocio_cartorial_anexos_pendencia_idx"
  on "public"."negocio_cartorial_anexos" ("pendencia_id", "criado_em" desc);

create or replace function "public"."cartorial_pendencias_before_write"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_negocio_id uuid;
begin
  select f."negocio_id"
    into v_negocio_id
  from "public"."negocio_cartorial_fluxos" f
  where f."id" = new."fluxo_id";

  if v_negocio_id is null then
    raise exception 'fluxo_cartorial_inexistente';
  end if;

  if new."negocio_id" is distinct from v_negocio_id then
    raise exception 'pendencia_cartorial_negocio_inconsistente';
  end if;

  if new."status" in ('resolvida', 'cancelada') and new."resolvido_em" is null then
    new."resolvido_em" := now();
  end if;

  if new."status" not in ('resolvida', 'cancelada') then
    new."resolvido_por" := null;
    new."resolvido_em" := null;
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_cartorial_pendencias_before_write"
  on "public"."negocio_cartorial_pendencias";
create trigger "trg_cartorial_pendencias_before_write"
  before insert or update on "public"."negocio_cartorial_pendencias"
  for each row execute function "public"."cartorial_pendencias_before_write"();

create or replace function "public"."cartorial_anexos_before_insert"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_negocio_id uuid;
  v_fluxo_id uuid;
begin
  select f."negocio_id"
    into v_negocio_id
  from "public"."negocio_cartorial_fluxos" f
  where f."id" = new."fluxo_id";

  if v_negocio_id is null then
    raise exception 'fluxo_cartorial_inexistente';
  end if;

  if new."negocio_id" is distinct from v_negocio_id then
    raise exception 'anexo_cartorial_negocio_inconsistente';
  end if;

  if new."pendencia_id" is not null then
    select p."fluxo_id", p."negocio_id"
      into v_fluxo_id, v_negocio_id
    from "public"."negocio_cartorial_pendencias" p
    where p."id" = new."pendencia_id";

    if v_fluxo_id is null
      or v_fluxo_id is distinct from new."fluxo_id"
      or v_negocio_id is distinct from new."negocio_id" then
      raise exception 'anexo_cartorial_pendencia_inconsistente';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists "trg_cartorial_anexos_before_insert"
  on "public"."negocio_cartorial_anexos";
create trigger "trg_cartorial_anexos_before_insert"
  before insert on "public"."negocio_cartorial_anexos"
  for each row execute function "public"."cartorial_anexos_before_insert"();

alter table "public"."negocio_cartorial_fluxos" enable row level security;
alter table "public"."negocio_cartorial_pendencias" enable row level security;
alter table "public"."negocio_cartorial_anexos" enable row level security;

drop policy if exists "cartorial_fluxos_participantes_leem"
  on "public"."negocio_cartorial_fluxos";
drop policy if exists "cartorial_fluxos_operador_insere"
  on "public"."negocio_cartorial_fluxos";
drop policy if exists "cartorial_fluxos_operador_atualiza"
  on "public"."negocio_cartorial_fluxos";

create policy "cartorial_fluxos_participantes_leem"
  on "public"."negocio_cartorial_fluxos"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or (select "private"."tem_papel_no_negocio"("negocio_id"))
  );

create policy "cartorial_fluxos_operador_insere"
  on "public"."negocio_cartorial_fluxos"
  for insert
  to authenticated
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_fluxos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

create policy "cartorial_fluxos_operador_atualiza"
  on "public"."negocio_cartorial_fluxos"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_fluxos"."negocio_id"
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
      where p."negocio_id" = "negocio_cartorial_fluxos"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

drop policy if exists "cartorial_pendencias_participantes_leem"
  on "public"."negocio_cartorial_pendencias";
drop policy if exists "cartorial_pendencias_operador_insere"
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
  );

create policy "cartorial_pendencias_operador_insere"
  on "public"."negocio_cartorial_pendencias"
  for insert
  to authenticated
  with check (
    (select "private"."is_admin"())
    or exists (
      select 1
      from "public"."papeis_negocio" p
      where p."negocio_id" = "negocio_cartorial_pendencias"."negocio_id"
        and p."usuario_id" = (select auth.uid())
        and p."papel" in ('corretor', 'admin')
        and p."ativo"
    )
  );

create policy "cartorial_pendencias_operador_atualiza"
  on "public"."negocio_cartorial_pendencias"
  for update
  to authenticated
  using (
    (select "private"."is_admin"())
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
    )
  );

revoke all on table "public"."negocio_cartorial_fluxos" from anon, authenticated;
grant select, insert, update on table "public"."negocio_cartorial_fluxos" to authenticated;
grant all on table "public"."negocio_cartorial_fluxos" to service_role;

revoke all on table "public"."negocio_cartorial_pendencias" from anon, authenticated;
grant select, insert, update on table "public"."negocio_cartorial_pendencias" to authenticated;
grant all on table "public"."negocio_cartorial_pendencias" to service_role;

revoke all on table "public"."negocio_cartorial_anexos" from anon, authenticated;
grant select, insert on table "public"."negocio_cartorial_anexos" to authenticated;
grant all on table "public"."negocio_cartorial_anexos" to service_role;

revoke all on function "public"."cartorial_pendencias_before_write"()
  from public, anon, authenticated;
revoke all on function "public"."cartorial_anexos_before_insert"()
  from public, anon, authenticated;

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
           )
      )
      or exists (
        select 1
          from "public"."negocio_cartorial_anexos" a
         where a."arquivo_url" = storage.objects.name
           and (
            (select "private"."is_admin"())
            or (select "private"."tem_papel_no_negocio"(a."negocio_id"))
           )
      )
    )
  );

insert into "public"."documentos_checklist_itens"
  ("tipo_negocio", "perfil", "codigo", "titulo", "descricao", "obrigatorio", "etapa", "ordem")
values
  ('venda', 'imovel', 'cartorio_matricula_previa', 'Matricula atualizada para cartorio', 'Matricula recente usada para conferencia final antes de minuta, escritura ou registro.', true, 'cartorial', 110),
  ('venda', 'imovel', 'cartorio_certidao_onus_reais', 'Certidao de onus reais', 'Certidao emitida pelo registro de imoveis para identificar onus, gravames ou restricoes.', true, 'cartorial', 120),
  ('venda', 'contrato_minuta', 'cartorio_minuta_escritura', 'Minuta de escritura ou titulo registravel', 'Minuta enviada pelo cartorio, banco ou operacao para conferencia das partes.', true, 'minuta', 130),
  ('venda', 'comprador', 'cartorio_guia_itbi', 'Guia de ITBI', 'Guia ou documento de arrecadacao do imposto de transmissao.', true, 'itbi_custas', 140),
  ('venda', 'comprador', 'cartorio_comprovante_itbi', 'Comprovante de pagamento do ITBI', 'Comprovante de quitacao do ITBI antes do registro.', true, 'itbi_custas', 150),
  ('venda', 'comprador', 'cartorio_comprovante_custas', 'Comprovante de custas cartoriais', 'Comprovante de pagamento de escritura, registro ou emolumentos aplicaveis.', true, 'itbi_custas', 160),
  ('venda', 'contrato_minuta', 'cartorio_escritura_assinada', 'Escritura assinada ou titulo equivalente', 'Escritura publica assinada ou contrato com forca de titulo registravel, conforme o caso.', true, 'escritura', 170),
  ('venda', 'imovel', 'cartorio_protocolo_registro', 'Protocolo de registro', 'Protocolo de entrada no Cartorio de Registro de Imoveis.', true, 'registro', 180),
  ('venda', 'imovel', 'cartorio_matricula_atualizada_final', 'Matricula atualizada final', 'Matricula atualizada comprovando o registro da transferencia ou confirmacao operacional equivalente.', true, 'matricula_atualizada', 190)
on conflict ("tipo_negocio", "perfil", "codigo") do update
set "titulo" = excluded."titulo",
    "descricao" = excluded."descricao",
    "obrigatorio" = excluded."obrigatorio",
    "etapa" = excluded."etapa",
    "ordem" = excluded."ordem",
    "ativo" = true,
    "atualizado_em" = now();
