-- OPE-217: protege endereco exato dos imoveis na Data API publica.
--
-- A vitrine publica passa a ser renderizada server-side com DTO seguro.
-- No Data API, anon nao pode mais consultar public.imoveis diretamente, e
-- authenticated so le imoveis quando for admin, proprietario ou participante
-- ativo de um negocio vinculado ao imovel.

revoke all on table "public"."imoveis" from anon;

grant select, insert, update, delete on table "public"."imoveis" to authenticated;
grant select, insert, update, delete on table "public"."imoveis" to service_role;

drop policy if exists "imoveis_select" on "public"."imoveis";
drop policy if exists "imoveis vitrine publica" on "public"."imoveis";

create policy "imoveis_select"
  on "public"."imoveis"
  for select
  to authenticated
  using (
    (select "private"."is_admin"())
    or "proprietario_id" = (select auth.uid())
    or exists (
      select 1
      from "public"."negocios" n
      join "public"."papeis_negocio" p on p."negocio_id" = n."id"
      where n."imovel_id" = "imoveis"."id"
        and p."usuario_id" = (select auth.uid())
        and p."ativo"
    )
  );
