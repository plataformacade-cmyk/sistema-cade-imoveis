create table if not exists "public"."servicos_juridicos_contratacoes" (
  "id" uuid primary key default gen_random_uuid(),
  "imovel_id" uuid references "public"."imoveis"("id") on delete cascade,
  "negocio_id" uuid references "public"."negocios"("id") on delete cascade,
  "contratante_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "tipo_negocio" text not null
    check ("tipo_negocio" in ('venda', 'locacao')),
  "pacote" text not null
    check ("pacote" in (
      'contrato_locacao',
      'contrato_compra_venda',
      'juridico_cartorial_venda',
      'analise_documental'
    )),
  "origem" text not null
    check ("origem" in (
      'cadastro_imovel',
      'edicao_imovel',
      'proposta_aceita',
      'documentos',
      'contrato'
    )),
  "status" text not null default 'contratado'
    check ("status" in (
      'contratado',
      'em_atendimento',
      'cancelado',
      'concluido'
    )),
  "aceito_em" timestamptz not null default now(),
  "aceito_por" uuid not null references "public"."usuarios"("id") on delete cascade,
  "termo_resumo" text not null,
  "observacoes" text,
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  constraint "servicos_juridicos_tem_alvo"
    check ("imovel_id" is not null or "negocio_id" is not null)
);

create index if not exists "servicos_juridicos_imovel_idx"
  on "public"."servicos_juridicos_contratacoes" ("imovel_id", "status");

create index if not exists "servicos_juridicos_negocio_idx"
  on "public"."servicos_juridicos_contratacoes" ("negocio_id", "status");

create index if not exists "servicos_juridicos_contratante_idx"
  on "public"."servicos_juridicos_contratacoes" ("contratante_id", "criado_em" desc);

create unique index if not exists "servicos_juridicos_imovel_ativo_key"
  on "public"."servicos_juridicos_contratacoes" ("imovel_id")
  where "imovel_id" is not null
    and "status" in ('contratado', 'em_atendimento');

create unique index if not exists "servicos_juridicos_negocio_ativo_key"
  on "public"."servicos_juridicos_contratacoes" ("negocio_id")
  where "negocio_id" is not null
    and "status" in ('contratado', 'em_atendimento');

drop trigger if exists "servicos_juridicos_set_atualizado_em"
  on "public"."servicos_juridicos_contratacoes";
create trigger "servicos_juridicos_set_atualizado_em"
  before update on "public"."servicos_juridicos_contratacoes"
  for each row execute function "public"."set_atualizado_em"();

create or replace function "public"."servicos_juridicos_validar"()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_imovel_id uuid;
  v_tipo_negocio text;
begin
  if new.negocio_id is not null then
    select n.imovel_id, coalesce(n.tipo, 'venda')
      into v_imovel_id, v_tipo_negocio
      from public.negocios n
     where n.id = new.negocio_id;

    if v_imovel_id is null then
      raise exception 'negocio_invalido';
    end if;

    if new.imovel_id is null then
      new.imovel_id := v_imovel_id;
    elsif new.imovel_id <> v_imovel_id then
      raise exception 'imovel_nao_pertence_ao_negocio';
    end if;

    new.tipo_negocio := v_tipo_negocio;
  end if;

  if new.pacote = 'contrato_locacao' and new.tipo_negocio <> 'locacao' then
    raise exception 'pacote_exige_locacao';
  end if;

  if new.pacote in ('contrato_compra_venda', 'juridico_cartorial_venda')
    and new.tipo_negocio <> 'venda' then
    raise exception 'pacote_exige_venda';
  end if;

  new.observacoes := nullif(btrim(new.observacoes), '');
  new.termo_resumo := nullif(btrim(new.termo_resumo), '');
  if new.termo_resumo is null then
    raise exception 'termo_resumo_obrigatorio';
  end if;

  if tg_op = 'UPDATE' then
    if new.imovel_id is distinct from old.imovel_id
      or (
        old.negocio_id is not null
        and new.negocio_id is distinct from old.negocio_id
      )
      or new.contratante_id is distinct from old.contratante_id
      or new.aceito_por is distinct from old.aceito_por
      or new.aceito_em is distinct from old.aceito_em then
      raise exception 'servico_juridico_campos_imutaveis';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists "servicos_juridicos_validar_trigger"
  on "public"."servicos_juridicos_contratacoes";
create trigger "servicos_juridicos_validar_trigger"
  before insert or update on "public"."servicos_juridicos_contratacoes"
  for each row execute function "public"."servicos_juridicos_validar"();

alter table "public"."servicos_juridicos_contratacoes" enable row level security;

drop policy if exists "servicos_juridicos_select"
  on "public"."servicos_juridicos_contratacoes";
create policy "servicos_juridicos_select"
  on "public"."servicos_juridicos_contratacoes"
  for select
  using (
    public.is_admin()
    or contratante_id = auth.uid()
    or exists (
      select 1
      from public.imoveis i
      where i.id = servicos_juridicos_contratacoes.imovel_id
        and i.proprietario_id = auth.uid()
    )
    or (
      negocio_id is not null
      and public.tem_papel_no_negocio(negocio_id)
    )
  );

drop policy if exists "servicos_juridicos_insert"
  on "public"."servicos_juridicos_contratacoes";
create policy "servicos_juridicos_insert"
  on "public"."servicos_juridicos_contratacoes"
  for insert
  with check (
    contratante_id = auth.uid()
    and aceito_por = auth.uid()
    and (
      public.is_admin()
      or (
        servicos_juridicos_contratacoes.negocio_id is null
        and exists (
        select 1
        from public.imoveis i
        where i.id = servicos_juridicos_contratacoes.imovel_id
          and i.proprietario_id = auth.uid()
        )
      )
      or (
        servicos_juridicos_contratacoes.negocio_id is not null
        and exists (
        select 1
        from public.papeis_negocio p
        where p.negocio_id = servicos_juridicos_contratacoes.negocio_id
          and p.usuario_id = auth.uid()
          and p.ativo
          and p.papel in ('proprietario', 'corretor', 'admin')
        )
      )
    )
  );

drop policy if exists "servicos_juridicos_update_operacional"
  on "public"."servicos_juridicos_contratacoes";
create policy "servicos_juridicos_update_operacional"
  on "public"."servicos_juridicos_contratacoes"
  for update
  using (
    public.is_admin()
    or (
      negocio_id is null
      and contratante_id = auth.uid()
    )
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = servicos_juridicos_contratacoes.negocio_id
        and p.usuario_id = auth.uid()
        and p.ativo
        and p.papel in ('corretor', 'admin')
    )
  )
  with check (
    public.is_admin()
    or (
      negocio_id is null
      and contratante_id = auth.uid()
    )
    or exists (
      select 1
      from public.papeis_negocio p
      where p.negocio_id = servicos_juridicos_contratacoes.negocio_id
        and p.usuario_id = auth.uid()
        and p.ativo
        and p.papel in ('corretor', 'admin')
    )
  );

revoke all on table "public"."servicos_juridicos_contratacoes" from anon;
grant select, insert, update on table "public"."servicos_juridicos_contratacoes" to authenticated;
grant all on table "public"."servicos_juridicos_contratacoes" to service_role;
