// Mini-guia dos bairros de Uberlândia exibido na seção "Sobre o bairro".
// A OPE-216 usa POIs reais curados como fallback seguro enquanto não há chave
// Google Places configurada. As distâncias são aproximadas por região/bairro,
// não pelo endereço exato do imóvel, preservando a privacidade pública.

import "server-only";

export type PontoBairro = {
  nome: string;
  categoria: string;
  distancia: string;
  tempo: string;
};

export type InfoBairro = {
  descricao: string;
  destaques: string[];
  pontos: PontoBairro[];
  fonte?: "curadoria" | "google_places";
};

type PlaceSearchResponse = {
  places?: {
    displayName?: { text?: string };
    primaryTypeDisplayName?: { text?: string };
  }[];
};

const GOOGLE_PLACE_QUERIES = [
  { termo: "supermercado", tipo: "supermarket", categoria: "Mercado" },
  { termo: "farmacia", tipo: "pharmacy", categoria: "Farmacia" },
  { termo: "escola", tipo: "school", categoria: "Educacao" },
  { termo: "hospital", tipo: "hospital", categoria: "Saude" },
  { termo: "shopping", tipo: "shopping_mall", categoria: "Comercio" },
  { termo: "faculdade", tipo: "university", categoria: "Educacao" },
];

function googlePlacesKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

async function buscarPontosGooglePlaces(params: {
  bairro: string | null;
  cidade: string | null;
  uf?: string | null;
}): Promise<PontoBairro[]> {
  const key = googlePlacesKey();
  if (!key || !params.bairro || !params.cidade) return [];

  const local = [params.bairro, params.cidade, params.uf]
    .filter(Boolean)
    .join(", ");
  const encontrados: PontoBairro[] = [];
  const nomes = new Set<string>();

  for (const query of GOOGLE_PLACE_QUERIES) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          textQuery: `${query.termo} em ${local}`,
          includedType: query.tipo,
          languageCode: "pt-BR",
          regionCode: "BR",
        }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json()) as PlaceSearchResponse;
      const place = json.places?.find((item) => item.displayName?.text);
      const nome = place?.displayName?.text?.trim();
      if (!place || !nome || nomes.has(nome)) continue;
      nomes.add(nome);
      encontrados.push({
        nome,
        categoria: place.primaryTypeDisplayName?.text ?? query.categoria,
        distancia: "proximo ao bairro",
        tempo: "confira rota no mapa",
      });
      if (encontrados.length >= 3) break;
    } catch {
      continue;
    }
  }

  return encontrados;
}

const BAIRROS: Record<string, InfoBairro> = {
  Centro: {
    descricao:
      "Região central de Uberlândia, com comércio forte, bancos, serviços, hospitais e acesso fácil ao transporte. Funciona bem para quem quer resolver a rotina a pé.",
    destaques: ["Comércio e serviços", "Transporte fácil", "Tudo a pé"],
    pontos: [
      { nome: "Praça Tubal Vilela", categoria: "Lazer", distancia: "450 m", tempo: "6 min a pé" },
      { nome: "Terminal Central", categoria: "Transporte", distancia: "700 m", tempo: "9 min a pé" },
      { nome: "Hospital Santa Genoveva", categoria: "Saúde", distancia: "1,4 km", tempo: "6 min de carro" },
    ],
  },
  "Santa Monica": {
    descricao:
      "Bairro jovem e movimentado, próximo à UFU e com comércio variado. É uma das regiões mais fortes para locação, vida estudantil e investimento.",
    destaques: ["Vida universitária", "Comércio local", "Bom para investir"],
    pontos: [
      { nome: "UFU Campus Santa Mônica", categoria: "Educação", distancia: "900 m", tempo: "12 min a pé" },
      { nome: "Center Shopping", categoria: "Comércio", distancia: "1,8 km", tempo: "7 min de carro" },
      { nome: "Parque do Sabiá", categoria: "Lazer", distancia: "2,4 km", tempo: "9 min de carro" },
    ],
  },
  "Jardim Karaiba": {
    descricao:
      "Região valorizada, com casas amplas, condomínios, áreas verdes e acesso rápido a clubes, shopping e serviços de alto padrão.",
    destaques: ["Alto padrão", "Condomínios", "Arborizado"],
    pontos: [
      { nome: "Praia Clube", categoria: "Lazer", distancia: "1,2 km", tempo: "5 min de carro" },
      { nome: "Uberlândia Shopping", categoria: "Comércio", distancia: "2,5 km", tempo: "8 min de carro" },
      { nome: "Hospital UMC", categoria: "Saúde", distancia: "3,2 km", tempo: "10 min de carro" },
    ],
  },
  "Granja Marileusa": {
    descricao:
      "Bairro planejado, moderno e ligado à tecnologia, com ciclovias, praças e ambiente mais residencial. Bom para quem prioriza rotina organizada.",
    destaques: ["Bairro planejado", "Inovação", "Ciclovias"],
    pontos: [
      { nome: "Algar Tech", categoria: "Trabalho", distancia: "1,0 km", tempo: "4 min de carro" },
      { nome: "Praça Granja Marileusa", categoria: "Lazer", distancia: "650 m", tempo: "8 min a pé" },
      { nome: "Unitri", categoria: "Educação", distancia: "4,0 km", tempo: "11 min de carro" },
    ],
  },
  Tibery: {
    descricao:
      "Bairro consolidado, com boa infraestrutura, comércio de apoio e acesso fácil ao Parque do Sabiá e ao eixo leste da cidade.",
    destaques: ["Boa infraestrutura", "Comércio e escolas", "Custo-benefício"],
    pontos: [
      { nome: "Parque do Sabiá", categoria: "Lazer", distancia: "1,6 km", tempo: "6 min de carro" },
      { nome: "Terminal Umuarama", categoria: "Transporte", distancia: "2,0 km", tempo: "7 min de carro" },
      { nome: "Hospital de Clínicas UFU", categoria: "Saúde", distancia: "2,7 km", tempo: "9 min de carro" },
    ],
  },
  "Morada da Colina": {
    descricao:
      "Bairro nobre, tranquilo e próximo ao centro, com ruas arborizadas e perfil residencial. É procurado por quem busca conforto sem se afastar dos serviços.",
    destaques: ["Região nobre", "Ruas arborizadas", "Perto do centro"],
    pontos: [
      { nome: "Praia Clube", categoria: "Lazer", distancia: "900 m", tempo: "12 min a pé" },
      { nome: "Centro", categoria: "Serviços", distancia: "2,5 km", tempo: "8 min de carro" },
      { nome: "Uberlândia Shopping", categoria: "Comércio", distancia: "3,6 km", tempo: "10 min de carro" },
    ],
  },
  Lidice: {
    descricao:
      "Bairro tradicional e bem localizado, perto do centro e de avenidas importantes como a Cesário Alvim. Tem boa oferta de apartamentos.",
    destaques: ["Bem localizado", "Tradicional", "Perto do centro"],
    pontos: [
      { nome: "Praça Clarimundo Carneiro", categoria: "Lazer", distancia: "1,1 km", tempo: "5 min de carro" },
      { nome: "Terminal Central", categoria: "Transporte", distancia: "1,6 km", tempo: "7 min de carro" },
      { nome: "Center Shopping", categoria: "Comércio", distancia: "2,8 km", tempo: "9 min de carro" },
    ],
  },
  Brasil: {
    descricao:
      "Bairro central, com comércio variado e acesso fácil ao Centro, à João Naves e a outras avenidas importantes da cidade.",
    destaques: ["Central", "Comércio variado", "Fácil acesso"],
    pontos: [
      { nome: "Center Shopping", categoria: "Comércio", distancia: "1,7 km", tempo: "6 min de carro" },
      { nome: "Terminal Central", categoria: "Transporte", distancia: "2,0 km", tempo: "8 min de carro" },
      { nome: "UFU Campus Santa Mônica", categoria: "Educação", distancia: "2,2 km", tempo: "8 min de carro" },
    ],
  },
  Saraiva: {
    descricao:
      "Bairro estruturado e bem conectado pela Av. João Naves de Ávila, com comércio forte, serviços e mobilidade para diferentes regiões.",
    destaques: ["Av. João Naves", "Comércio forte", "Bem estruturado"],
    pontos: [
      { nome: "Center Shopping", categoria: "Comércio", distancia: "1,2 km", tempo: "5 min de carro" },
      { nome: "Praia Clube", categoria: "Lazer", distancia: "2,0 km", tempo: "7 min de carro" },
      { nome: "UFU Campus Santa Mônica", categoria: "Educação", distancia: "2,3 km", tempo: "8 min de carro" },
    ],
  },
  Granada: {
    descricao:
      "Região em crescimento, com novos loteamentos e condomínios. Pode ser interessante para quem busca espaço, tranquilidade e potencial de valorização.",
    destaques: ["Em crescimento", "Espaço e sossego", "Novos condomínios"],
    pontos: [
      { nome: "Terminal Novo Mundo", categoria: "Transporte", distancia: "2,4 km", tempo: "8 min de carro" },
      { nome: "Parque do Sabiá", categoria: "Lazer", distancia: "3,8 km", tempo: "10 min de carro" },
      { nome: "Center Shopping", categoria: "Comércio", distancia: "4,6 km", tempo: "13 min de carro" },
    ],
  },
  "Jardim Inconfidencia": {
    descricao:
      "Bairro residencial tranquilo, com boa oferta de casas e acesso fácil ao comércio e aos serviços do entorno.",
    destaques: ["Residencial", "Boa oferta de casas", "Acesso fácil"],
    pontos: [
      { nome: "Uberlândia Shopping", categoria: "Comércio", distancia: "2,0 km", tempo: "7 min de carro" },
      { nome: "Praia Clube", categoria: "Lazer", distancia: "3,0 km", tempo: "9 min de carro" },
      { nome: "Centro", categoria: "Serviços", distancia: "4,0 km", tempo: "12 min de carro" },
    ],
  },
};

function normalizarBairro(bairro: string | null): string | null {
  if (!bairro) return null;
  return bairro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function infoDoBairro(bairro: string | null): InfoBairro {
  const normalizado = normalizarBairro(bairro);
  if (normalizado && BAIRROS[normalizado]) return BAIRROS[normalizado];
  return {
    descricao:
      "Bairro de Uberlândia com boa oferta de imóveis. Demonstre interesse para conhecer mais sobre a região direto com o anunciante.",
    destaques: ["Em Uberlândia/MG"],
    pontos: [],
  };
}

export async function infoDoBairroEnriquecida(params: {
  bairro: string | null;
  cidade: string | null;
  uf?: string | null;
}): Promise<InfoBairro> {
  const fallback = infoDoBairro(params.bairro);
  const pontosGoogle = await buscarPontosGooglePlaces(params);

  if (pontosGoogle.length === 0) {
    return { ...fallback, fonte: "curadoria" };
  }

  return {
    ...fallback,
    pontos: pontosGoogle,
    destaques: Array.from(
      new Set([...fallback.destaques, "Dados atualizados por regiao"]),
    ).slice(0, 4),
    fonte: "google_places",
  };
}
