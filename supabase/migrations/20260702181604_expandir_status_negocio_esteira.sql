-- OPE-220: expande negocios.status para a esteira comercial real.
-- Mapeamento legado:
-- aberto -> qualificacao
-- em_negociacao -> visita
-- fechado -> concluido
-- cancelado -> perdido

alter table "public"."negocios"
  drop constraint if exists "negocios_status_check";

update "public"."negocios"
set "status" = case "status"
  when 'aberto' then 'qualificacao'
  when 'em_negociacao' then 'visita'
  when 'fechado' then 'concluido'
  when 'cancelado' then 'perdido'
  else "status"
end
where "status" in ('aberto', 'em_negociacao', 'fechado', 'cancelado');

alter table "public"."negocios"
  alter column "status" set default 'qualificacao';

alter table "public"."negocios"
  add constraint "negocios_status_check"
  check (
    "status" in (
      'qualificacao',
      'visita',
      'proposta',
      'documentos',
      'contrato',
      'cartorial',
      'concluido',
      'perdido'
    )
  );

create or replace function "public"."demonstrar_interesse"("p_imovel_id" uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_proprietario uuid;
  v_status text;
  v_negocio_id uuid;
  v_existente uuid;
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;

  select proprietario_id, status into v_proprietario, v_status
  from imoveis where id = p_imovel_id;

  if v_proprietario is null then raise exception 'imovel_inexistente'; end if;
  if v_status <> 'ativo' then raise exception 'imovel_indisponivel'; end if;
  if v_proprietario = v_uid then raise exception 'eh_proprietario'; end if;

  select n.id into v_existente
  from negocios n
  join papeis_negocio p on p.negocio_id = n.id
  where n.imovel_id = p_imovel_id and p.usuario_id = v_uid and p.papel = 'comprador'
  limit 1;
  if v_existente is not null then return v_existente; end if;

  insert into negocios (imovel_id, status, criado_por)
  values (p_imovel_id, 'qualificacao', v_uid)
  returning id into v_negocio_id;

  insert into papeis_negocio (negocio_id, usuario_id, papel)
  values (v_negocio_id, v_uid, 'comprador'),
         (v_negocio_id, v_proprietario, 'proprietario');

  insert into conversas (negocio_id) values (v_negocio_id);

  return v_negocio_id;
end; $$;

grant execute on function "public"."demonstrar_interesse"(uuid) to authenticated;
