-- OPE-227: checklist versionavel de documentos por perfil/tipo de negocio.
-- Mantem documentos antigos funcionando e adiciona uma fonte canonica para
-- comprador, vendedor, imovel e contrato/minuta.

create table if not exists "public"."documentos_checklist_itens" (
  "id" uuid primary key default gen_random_uuid(),
  "tipo_negocio" text not null
    check ("tipo_negocio" in ('venda', 'locacao', 'ambos')),
  "perfil" text not null
    check ("perfil" in ('comprador', 'vendedor', 'imovel', 'contrato_minuta')),
  "codigo" text not null,
  "titulo" text not null,
  "descricao" text not null default '',
  "obrigatorio" boolean not null default true,
  "etapa" text not null default 'documentos',
  "ordem" integer not null default 0,
  "ativo" boolean not null default true,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "documentos_checklist_codigo_formato"
    check ("codigo" ~ '^[a-z0-9_]+$'),
  constraint "documentos_checklist_tipo_perfil_codigo_key"
    unique ("tipo_negocio", "perfil", "codigo")
);

create index if not exists "documentos_checklist_ativos_idx"
  on "public"."documentos_checklist_itens" ("tipo_negocio", "perfil", "ordem")
  where "ativo";

drop trigger if exists "documentos_checklist_set_atualizado_em"
  on "public"."documentos_checklist_itens";
create trigger "documentos_checklist_set_atualizado_em"
  before update on "public"."documentos_checklist_itens"
  for each row execute function "public"."set_atualizado_em"();

alter table "public"."documentos"
  add column if not exists "checklist_item_id" uuid
    references "public"."documentos_checklist_itens"("id") on delete restrict,
  add column if not exists "perfil" text
    check ("perfil" is null or "perfil" in ('comprador', 'vendedor', 'imovel', 'contrato_minuta')),
  add column if not exists "revisado_por" uuid
    references "public"."usuarios"("id"),
  add column if not exists "revisado_em" timestamptz,
  add column if not exists "motivo_reprovacao" text;

create index if not exists "documentos_checklist_item_idx"
  on "public"."documentos" ("checklist_item_id");
create index if not exists "documentos_negocio_perfil_idx"
  on "public"."documentos" ("negocio_id", "perfil", "tipo_doc");

create or replace function "public"."documentos_sync_checklist"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  item record;
  negocio_tipo text;
begin
  if tg_op = 'UPDATE' then
    if old.negocio_id is distinct from new.negocio_id
      or old.enviado_por is distinct from new.enviado_por
      or old.arquivo_url is distinct from new.arquivo_url
      or old.checklist_item_id is distinct from new.checklist_item_id then
      raise exception 'Campos imutaveis do documento nao podem ser alterados';
    end if;
  end if;

  if new.checklist_item_id is not null then
    select *
      into item
      from public.documentos_checklist_itens
     where id = new.checklist_item_id
       and ativo = true;

    if not found then
      raise exception 'Item de checklist invalido ou inativo';
    end if;

    select coalesce(n.tipo, 'venda')
      into negocio_tipo
      from public.negocios n
     where n.id = new.negocio_id;

    if negocio_tipo is null then
      raise exception 'Negocio nao encontrado para documento';
    end if;

    if item.tipo_negocio <> 'ambos' and item.tipo_negocio <> negocio_tipo then
      raise exception 'Item de checklist nao se aplica ao tipo do negocio';
    end if;

    new.tipo_doc := item.codigo;
    new.perfil := item.perfil;
  end if;

  if new.status = 'reprovado' and coalesce(nullif(btrim(new.motivo_reprovacao), ''), '') = '' then
    raise exception 'Motivo de reprovacao e obrigatorio';
  end if;

  if tg_op = 'UPDATE'
     and new.status in ('verificado', 'reprovado')
     and old.status is distinct from new.status then
    new.revisado_por := coalesce(new.revisado_por, auth.uid());
    new.revisado_em := coalesce(new.revisado_em, now());
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

drop trigger if exists "documentos_sync_checklist_trigger"
  on "public"."documentos";
create trigger "documentos_sync_checklist_trigger"
  before insert or update on "public"."documentos"
  for each row execute function "public"."documentos_sync_checklist"();

alter table "public"."documentos_checklist_itens" enable row level security;

drop policy if exists "documentos checklist autenticado le"
  on "public"."documentos_checklist_itens";
drop policy if exists "documentos checklist admin gerencia"
  on "public"."documentos_checklist_itens";

create policy "documentos checklist autenticado le"
  on "public"."documentos_checklist_itens"
  for select
  to authenticated
  using ("ativo" = true);

create policy "documentos checklist admin gerencia"
  on "public"."documentos_checklist_itens"
  for all
  to authenticated
  using ("public"."is_admin"())
  with check ("public"."is_admin"());

drop policy if exists "documentos participante" on "public"."documentos";
drop policy if exists "documentos participantes leem" on "public"."documentos";
drop policy if exists "documentos participante cria proprio" on "public"."documentos";
drop policy if exists "documentos revisor atualiza status" on "public"."documentos";

create policy "documentos participantes leem"
  on "public"."documentos"
  for select
  to authenticated
  using (
    "public"."is_admin"()
    or "public"."tem_papel_no_negocio"("negocio_id")
  );

create policy "documentos participante cria proprio"
  on "public"."documentos"
  for insert
  to authenticated
  with check (
    "enviado_por" = auth.uid()
    and (
      "public"."is_admin"()
      or "public"."tem_papel_no_negocio"("negocio_id")
    )
  );

create policy "documentos revisor atualiza status"
  on "public"."documentos"
  for update
  to authenticated
  using (
    "public"."is_admin"()
    or exists (
      select 1
        from "public"."papeis_negocio" p
       where p."negocio_id" = "documentos"."negocio_id"
         and p."usuario_id" = auth.uid()
         and p."ativo" = true
         and p."papel" = 'corretor'
    )
  )
  with check (
    "public"."is_admin"()
    or exists (
      select 1
        from "public"."papeis_negocio" p
       where p."negocio_id" = "documentos"."negocio_id"
         and p."usuario_id" = auth.uid()
         and p."ativo" = true
         and p."papel" = 'corretor'
    )
  );

revoke all on table "public"."documentos_checklist_itens"
  from anon, authenticated;
grant select on table "public"."documentos_checklist_itens" to authenticated;
grant all on table "public"."documentos_checklist_itens" to service_role;

revoke all on table "public"."documentos" from anon;
grant select, insert, update on table "public"."documentos" to authenticated;
grant all on table "public"."documentos" to service_role;

drop policy if exists "documentos-negocio acesso autenticado"
  on storage.objects;
drop policy if exists "documentos-negocio upload prefixo usuario"
  on storage.objects;
drop policy if exists "documentos-negocio leitura participante"
  on storage.objects;

create policy "documentos-negocio upload prefixo usuario"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documentos-negocio'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "documentos-negocio leitura participante"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos-negocio'
    and exists (
      select 1
        from "public"."documentos" d
       where d."arquivo_url" = storage.objects.name
         and (
          "public"."is_admin"()
          or "public"."tem_papel_no_negocio"(d."negocio_id")
         )
    )
  );

insert into "public"."documentos_checklist_itens"
  ("tipo_negocio", "perfil", "codigo", "titulo", "descricao", "obrigatorio", "etapa", "ordem")
values
  ('venda', 'comprador', 'comprador_rg_cpf', 'RG e CPF do comprador', 'Documento de identificacao de quem assina a compra.', true, 'documentos', 10),
  ('venda', 'comprador', 'comprador_estado_civil', 'Comprovante de estado civil', 'Certidao de casamento, nascimento, uniao estavel ou averbacoes aplicaveis.', true, 'documentos', 20),
  ('venda', 'comprador', 'comprador_comprovante_renda', 'Comprovante de renda', 'Comprovante de renda para analise de credito, financiamento ou capacidade de pagamento.', false, 'documentos', 30),
  ('venda', 'comprador', 'comprador_comprovante_endereco', 'Comprovante de endereco', 'Comprovante recente para cadastro e minuta.', true, 'documentos', 40),
  ('venda', 'comprador', 'comprador_fgts_financiamento', 'Documentos de FGTS ou financiamento', 'Extrato FGTS, carta de credito ou dados do financiamento quando aplicavel.', false, 'documentos', 50),

  ('venda', 'vendedor', 'vendedor_rg_cpf', 'RG e CPF do vendedor', 'Documento de identificacao do proprietario vendedor e conjuge quando aplicavel.', true, 'documentos', 10),
  ('venda', 'vendedor', 'vendedor_estado_civil', 'Comprovante de estado civil do vendedor', 'Certidao e regime de bens para validar assinatura e outorga.', true, 'documentos', 20),
  ('venda', 'vendedor', 'vendedor_certidoes_pessoais', 'Certidoes pessoais do vendedor', 'Certidoes civeis, trabalhistas, fiscais e federais conforme checklist juridico.', true, 'documentos', 30),
  ('venda', 'vendedor', 'vendedor_dados_bancarios_sinal', 'Dados bancarios para sinal', 'Dados para pagamento de sinal ou identificacao de recebimento, quando aplicavel.', false, 'contrato', 40),

  ('venda', 'imovel', 'imovel_matricula_atualizada', 'Matricula atualizada do imovel', 'Matricula recente emitida pelo cartorio de registro de imoveis.', true, 'documentos', 10),
  ('venda', 'imovel', 'imovel_iptu_certidao', 'IPTU e certidao municipal', 'Cadastro municipal, guia ou certidao negativa de debitos municipais.', true, 'documentos', 20),
  ('venda', 'imovel', 'imovel_condominio_quitacao', 'Quitacao de condominio', 'Declaracao ou comprovante de regularidade condominial, quando houver condominio.', false, 'documentos', 30),
  ('venda', 'imovel', 'imovel_habite_se', 'Habite-se ou documento equivalente', 'Documento de regularidade construtiva quando aplicavel.', false, 'documentos', 40),

  ('venda', 'contrato_minuta', 'minuta_dados_partes', 'Dados completos das partes', 'Nome, CPF/CNPJ, estado civil, endereco e qualificacao para minuta.', true, 'contrato', 10),
  ('venda', 'contrato_minuta', 'minuta_forma_pagamento', 'Forma de pagamento e prazos', 'Valor, sinal, financiamento, FGTS, parcelas, vencimentos e condicoes.', true, 'contrato', 20),
  ('venda', 'contrato_minuta', 'minuta_comprovante_sinal', 'Comprovante de sinal', 'Comprovante de Pix/transferencia do sinal quando houver.', false, 'contrato', 30),

  ('locacao', 'comprador', 'locatario_rg_cpf', 'RG e CPF do locatario', 'Documento de identificacao de quem assina a locacao.', true, 'documentos', 10),
  ('locacao', 'comprador', 'locatario_comprovante_renda_3m', 'Comprovantes de renda dos ultimos 3 meses', 'Holerites, extratos ou documentos equivalentes para analise cadastral.', true, 'documentos', 20),
  ('locacao', 'comprador', 'locatario_comprovante_residencia', 'Comprovante de residencia atual', 'Comprovante recente para cadastro do locatario.', true, 'documentos', 30),
  ('locacao', 'comprador', 'locatario_ficha_cadastral', 'Ficha cadastral do locatario', 'Dados cadastrais, ocupacao, contatos e declaracoes necessarias.', true, 'documentos', 40),
  ('locacao', 'comprador', 'locatario_documentos_garantia', 'Documentos da garantia escolhida', 'Documentos do fiador, caucao, seguro-fianca ou titulo de capitalizacao.', true, 'documentos', 50),

  ('locacao', 'vendedor', 'locador_rg_cpf', 'RG e CPF do locador', 'Documento de identificacao do proprietario locador.', true, 'documentos', 10),
  ('locacao', 'vendedor', 'locador_comprovante_propriedade', 'Comprovante de propriedade', 'Matricula, escritura ou documento que comprove legitimidade para locar.', true, 'documentos', 20),
  ('locacao', 'vendedor', 'locador_dados_bancarios_aluguel', 'Dados bancarios para aluguel', 'Dados para recebimento de aluguel e encargos.', true, 'contrato', 30),

  ('locacao', 'imovel', 'locacao_imovel_matricula', 'Matricula ou cadastro do imovel', 'Identificacao do imovel para contrato de locacao.', true, 'documentos', 10),
  ('locacao', 'imovel', 'locacao_imovel_iptu', 'IPTU do imovel', 'Dados municipais e responsabilidade por encargos.', true, 'documentos', 20),
  ('locacao', 'imovel', 'locacao_vistoria_entrada', 'Vistoria de entrada', 'Laudo, fotos ou video do estado do imovel no inicio da locacao.', true, 'documentos', 30),

  ('locacao', 'contrato_minuta', 'locacao_dados_contrato', 'Dados para contrato de locacao', 'Prazo, valor, reajuste, vencimento, encargos e regras principais.', true, 'contrato', 10),
  ('locacao', 'contrato_minuta', 'locacao_garantia', 'Garantia de locacao', 'Tipo de garantia selecionada e documentos vinculados.', true, 'contrato', 20),
  ('locacao', 'contrato_minuta', 'locacao_prazo_valores', 'Prazo e valores da locacao', 'Prazo em meses, aluguel, condominio, IPTU, multa e reajuste.', true, 'contrato', 30)
on conflict ("tipo_negocio", "perfil", "codigo") do update
set "titulo" = excluded."titulo",
    "descricao" = excluded."descricao",
    "obrigatorio" = excluded."obrigatorio",
    "etapa" = excluded."etapa",
    "ordem" = excluded."ordem",
    "ativo" = true,
    "atualizado_em" = now();
