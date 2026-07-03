import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE, slugBairro } from "@/lib/seo";
import { POSTS } from "./blog/_posts";
import { PERFIS_LISTA } from "./como-funciona/_perfis";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${SITE.url}${p}`;
  const hoje = "2026-06-16";

  const estaticas: MetadataRoute.Sitemap = [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/plataforma"), changeFrequency: "daily", priority: 0.9 },
    { url: u("/como-funciona"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/sobre"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/blog"), changeFrequency: "daily", priority: 0.7 },
    { url: u("/termos"), changeFrequency: "yearly", priority: 0.2 },
    { url: u("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const perfis: MetadataRoute.Sitemap = PERFIS_LISTA.map((p) => ({
    url: u(`/como-funciona/${p.slug}`),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const artigos: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: u(`/blog/${p.slug}`),
    lastModified: p.atualizado ?? p.data,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Imóveis ativos + páginas programáticas por bairro (do banco).
  let imoveis: MetadataRoute.Sitemap = [];
  let bairros: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("imoveis")
      .select("id, bairro, atualizado_em")
      .eq("status", "ativo");
    const linhas = data ?? [];
    imoveis = linhas.map((i) => ({
      url: u(`/plataforma/imoveis/${i.id}`),
      lastModified: (i.atualizado_em ?? hoje).slice(0, 10),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    const setBairros = new Set<string>();
    for (const i of linhas) if (i.bairro) setBairros.add(i.bairro as string);
    bairros = Array.from(setBairros).map((b) => ({
      url: u(`/imoveis-em/${slugBairro(b)}`),
      changeFrequency: "daily",
      priority: 0.7,
    }));
  } catch {
    // Sem banco: ainda servimos o resto do sitemap.
  }

  return [...estaticas, ...perfis, ...artigos, ...bairros, ...imoveis];
}
