-- OPE-221: consolidar policies de visitas para reduzir warnings de RLS.

drop policy if exists "visitas admin" on "public"."visitas";
drop policy if exists "visitas solicitante le" on "public"."visitas";
drop policy if exists "visitas solicitante cria avulsa" on "public"."visitas";
drop policy if exists "visitas participante le" on "public"."visitas";
drop policy if exists "visitas anunciante sugere" on "public"."visitas";
drop policy if exists "visitas comprador responde" on "public"."visitas";
drop policy if exists "visitas anunciante reagenda" on "public"."visitas";

create policy "visitas acesso leitura"
on "public"."visitas"
for select
using (
  is_admin()
  or "solicitante_id" = (select auth.uid())
  or (
    "negocio_id" is not null
    and tem_papel_no_negocio("negocio_id")
  )
);

create policy "visitas cria autorizada"
on "public"."visitas"
for insert
to authenticated
with check (
  is_admin()
  or (
    "solicitante_id" = (select auth.uid())
    and (
      "negocio_id" is null
      or (
        "negocio_id" is not null
        and "imovel_id" = (
          select n."imovel_id"
          from "public"."negocios" n
          where n."id" = "visitas"."negocio_id"
        )
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('proprietario', 'corretor', 'admin')
        )
      )
    )
  )
);

create policy "visitas atualiza autorizada"
on "public"."visitas"
for update
to authenticated
using (
  is_admin()
  or (
    "negocio_id" is not null
    and (
      (
        "status" in ('solicitada', 'aguardando_confirmacao', 'reagendada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('comprador', 'admin')
        )
      )
      or exists (
        select 1
        from "public"."papeis_negocio" p
        where p."negocio_id" = "visitas"."negocio_id"
          and p."usuario_id" = (select auth.uid())
          and p."ativo"
          and p."papel" in ('proprietario', 'corretor', 'admin')
      )
    )
  )
)
with check (
  is_admin()
  or (
    "negocio_id" is not null
    and (
      (
        "status" in ('confirmada', 'cancelada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('comprador', 'admin')
        )
      )
      or (
        "status" in ('aguardando_confirmacao', 'reagendada', 'cancelada')
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p."negocio_id" = "visitas"."negocio_id"
            and p."usuario_id" = (select auth.uid())
            and p."ativo"
            and p."papel" in ('proprietario', 'corretor', 'admin')
        )
      )
    )
  )
);
