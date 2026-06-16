-- Correção de RLS (bugs achados na revisão): vitrine pública + fluxo "tenho interesse".

-- 1) Leitura pública dos imóveis publicados (status 'ativo') — a vitrine /plataforma.
drop policy if exists "imoveis vitrine publica" on "public"."imoveis";
create policy "imoveis vitrine publica" on "public"."imoveis"
  for select to anon, authenticated
  using ("status" = 'ativo');

-- 2) "Tenho interesse": um comprador comum (não-admin) precisa criar negócio +
--    papéis + conversa. As policies de insert são admin-only, então encapsulamos
--    num SECURITY DEFINER seguro (valida tudo no servidor do banco).
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

  -- evita duplicar
  select n.id into v_existente
  from negocios n
  join papeis_negocio p on p.negocio_id = n.id
  where n.imovel_id = p_imovel_id and p.usuario_id = v_uid and p.papel = 'comprador'
  limit 1;
  if v_existente is not null then return v_existente; end if;

  insert into negocios (imovel_id, status, criado_por)
  values (p_imovel_id, 'aberto', v_uid)
  returning id into v_negocio_id;

  insert into papeis_negocio (negocio_id, usuario_id, papel)
  values (v_negocio_id, v_uid, 'comprador'),
         (v_negocio_id, v_proprietario, 'proprietario');

  insert into conversas (negocio_id) values (v_negocio_id);

  return v_negocio_id;
end; $$;

grant execute on function "public"."demonstrar_interesse"(uuid) to authenticated;
