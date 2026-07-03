drop policy if exists "suporte_conv_insert" on "public"."suporte_conversas";

create policy "suporte_conv_insert"
  on "public"."suporte_conversas"
  for insert
  to authenticated
  with check (
    "usuario_id" = (select auth.uid())
    and (
      (
        "tipo" = 'geral'
        and "negocio_id" is null
      )
      or (
        "tipo" = 'pos_conclusao'
        and "negocio_id" is not null
        and exists (
          select 1
          from "public"."negocios" n
          where n.id = "suporte_conversas"."negocio_id"
            and n.status = 'concluido'
        )
        and exists (
          select 1
          from "public"."papeis_negocio" p
          where p.negocio_id = "suporte_conversas"."negocio_id"
            and p.usuario_id = (select auth.uid())
            and p.ativo is true
            and p.papel in ('comprador', 'proprietario')
        )
      )
    )
  );
