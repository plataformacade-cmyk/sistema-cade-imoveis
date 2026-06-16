-- Buckets de storage do Cadê Imóveis (S1.2)
-- Policies finas por papel/participação serão refinadas em S1.7 (fotos),
-- S2.9 (avatares) e S4.2 (documentos do negócio).

insert into storage.buckets (id, name, public)
values
  ('imovel-fotos',       'imovel-fotos',       true),
  ('usuario-avatares',   'usuario-avatares',   true),
  ('documentos-negocio', 'documentos-negocio', false)
on conflict (id) do nothing;

-- Leitura pública dos buckets públicos
create policy "leitura publica imovel-fotos"
  on storage.objects for select
  using ( bucket_id = 'imovel-fotos' );

create policy "leitura publica usuario-avatares"
  on storage.objects for select
  using ( bucket_id = 'usuario-avatares' );

-- Upload por usuário autenticado (refinar por dono/papel em S1.7 / S2.9)
create policy "upload autenticado fotos e avatares"
  on storage.objects for insert to authenticated
  with check ( bucket_id in ('imovel-fotos', 'usuario-avatares') );

-- Documentos do negócio: privados; por ora só autenticado
-- (refinar por participação no negócio via tem_papel_no_negocio em S4.2)
create policy "documentos-negocio acesso autenticado"
  on storage.objects for all to authenticated
  using ( bucket_id = 'documentos-negocio' )
  with check ( bucket_id = 'documentos-negocio' );
