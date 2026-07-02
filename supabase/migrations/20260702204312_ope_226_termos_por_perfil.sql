-- OPE-226: termos versionados por perfil e historico de aceites.

create table if not exists "public"."termos_versoes" (
  "id" uuid primary key default gen_random_uuid(),
  "perfil" text not null
    check ("perfil" in ('comprador', 'proprietario', 'corretor', 'admin')),
  "versao" text not null,
  "titulo" text not null,
  "conteudo" text not null,
  "ativo" boolean not null default true,
  "obrigatorio" boolean not null default true,
  "publicado_em" timestamptz not null default now(),
  "criado_em" timestamptz not null default now(),
  "atualizado_em" timestamptz not null default now(),
  unique ("perfil", "versao")
);

create unique index if not exists "termos_versoes_perfil_ativo_idx"
  on "public"."termos_versoes" ("perfil")
  where "ativo" and "obrigatorio";

create table if not exists "public"."termos_aceites" (
  "id" uuid primary key default gen_random_uuid(),
  "usuario_id" uuid not null references "public"."usuarios"("id") on delete cascade,
  "termo_versao_id" uuid not null references "public"."termos_versoes"("id") on delete restrict,
  "perfil" text not null
    check ("perfil" in ('comprador', 'proprietario', 'corretor', 'admin')),
  "versao" text not null,
  "origem" text not null default 'web',
  "aceito_em" timestamptz not null default now(),
  unique ("usuario_id", "termo_versao_id")
);

create index if not exists "termos_aceites_usuario_idx"
  on "public"."termos_aceites" ("usuario_id", "aceito_em" desc);

create index if not exists "termos_aceites_perfil_idx"
  on "public"."termos_aceites" ("perfil", "versao");

alter table "public"."termos_versoes" enable row level security;
alter table "public"."termos_aceites" enable row level security;

drop policy if exists "termos versoes publicas le" on "public"."termos_versoes";
create policy "termos versoes publicas le"
on "public"."termos_versoes"
for select
to anon, authenticated
using ("ativo" and "publicado_em" <= now());

drop policy if exists "termos versoes admin gerencia" on "public"."termos_versoes";
create policy "termos versoes admin gerencia"
on "public"."termos_versoes"
for all
to authenticated
using ("public"."is_admin"())
with check ("public"."is_admin"());

drop policy if exists "termos aceites usuario le" on "public"."termos_aceites";
create policy "termos aceites usuario le"
on "public"."termos_aceites"
for select
to authenticated
using ("public"."is_admin"() or "usuario_id" = (select auth.uid()));

drop policy if exists "termos aceites usuario cria" on "public"."termos_aceites";
create policy "termos aceites usuario cria"
on "public"."termos_aceites"
for insert
to authenticated
with check (
  "usuario_id" = (select auth.uid())
  and exists (
    select 1
    from "public"."termos_versoes" tv
    where tv."id" = "termos_aceites"."termo_versao_id"
      and tv."perfil" = "termos_aceites"."perfil"
      and tv."versao" = "termos_aceites"."versao"
      and tv."ativo"
      and tv."publicado_em" <= now()
  )
);

grant select on table "public"."termos_versoes" to anon, authenticated;
grant all on table "public"."termos_versoes" to service_role;
grant select, insert on table "public"."termos_aceites" to authenticated;
grant all on table "public"."termos_aceites" to service_role;

drop trigger if exists "set_atualizado_em_termos_versoes" on "public"."termos_versoes";
create trigger "set_atualizado_em_termos_versoes"
before update on "public"."termos_versoes"
for each row execute function "public"."set_atualizado_em"();

insert into "public"."termos_versoes" (
  "perfil",
  "versao",
  "titulo",
  "conteudo",
  "ativo",
  "obrigatorio"
)
values
  (
    'comprador',
    '2026-07-v1',
    'Termos do comprador',
    'Ao buscar ou demonstrar interesse em um imovel na Cade Imoveis, voce concorda em usar a plataforma para conduzir a negociacao, manter as conversas dentro do ambiente seguro e respeitar as regras de privacidade. A Cade intermedia a conexao entre interessados, proprietarios, corretores e prestadores, mas documentos, proposta, contrato e etapas externas podem exigir validacao propria. O uso de dados pessoais segue a Politica de Privacidade e a LGPD.',
    true,
    true
  ),
  (
    'proprietario',
    '2026-07-v1',
    'Termos do proprietario anunciante',
    'Ao anunciar um imovel na Cade Imoveis, voce declara que tem autorizacao para divulgar o imovel, que as informacoes fornecidas sao verdadeiras e que mantera negociacoes e registros relevantes dentro da plataforma. Voce concorda em nao burlar o fluxo de contato, em respeitar compradores e corretores e em fornecer documentos quando o negocio avancar. A Cade pode apoiar a negociacao, mas nao substitui a verificacao juridica definitiva.',
    true,
    true
  ),
  (
    'corretor',
    '2026-07-v1',
    'Termos do corretor parceiro',
    'Ao atuar como corretor na Cade Imoveis, voce declara possuir autorizacao profissional aplicavel, inclusive CRECI quando exigido, e concorda em conduzir atendimento, visitas, propostas e registros de forma transparente dentro da plataforma. Voce deve respeitar as regras de privacidade, evitar bypass de contato e manter as informacoes do negocio atualizadas para auditoria e acompanhamento.',
    true,
    true
  ),
  (
    'admin',
    '2026-07-v1',
    'Termos administrativos',
    'Ao operar a administracao da Cade Imoveis, voce concorda em acessar apenas dados necessarios, preservar sigilo operacional, registrar decisoes relevantes e seguir as regras internas de privacidade, seguranca e auditoria. Acoes administrativas podem afetar usuarios, imoveis, negocios e documentos e devem ser executadas com finalidade legitima.',
    true,
    true
  )
on conflict ("perfil", "versao") do update
set
  "titulo" = excluded."titulo",
  "conteudo" = excluded."conteudo",
  "ativo" = excluded."ativo",
  "obrigatorio" = excluded."obrigatorio";
