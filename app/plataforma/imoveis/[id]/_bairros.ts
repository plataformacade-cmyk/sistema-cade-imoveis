// Mini-guia dos bairros de Uberlândia (conteúdo editorial da Cadê) exibido na
// seção "Sobre o bairro" da página de imóvel. Chave = nome do bairro como
// gravado no banco. Sem match → fallback genérico.

export type InfoBairro = { descricao: string; destaques: string[] };

const BAIRROS: Record<string, InfoBairro> = {
  Centro: {
    descricao:
      "O coração de Uberlândia, com comércio forte, bancos, serviços e hospitais a poucos passos. Ideal para quem valoriza praticidade e mobilidade no dia a dia.",
    destaques: ["Comércio e serviços", "Transporte fácil", "Tudo a pé"],
  },
  "Santa Mônica": {
    descricao:
      "Bairro jovem e movimentado, próximo à Universidade Federal. Tem comércio variado e é uma das melhores regiões para quem pensa em alugar ou investir.",
    destaques: ["Vida universitária", "Comércio local", "Ótimo p/ investir"],
  },
  "Jardim Karaíba": {
    descricao:
      "Um dos bairros mais valorizados da cidade: condomínios fechados, áreas verdes, comércio de alto padrão e muita tranquilidade.",
    destaques: ["Alto padrão", "Condomínios fechados", "Seguro e arborizado"],
  },
  "Granja Marileusa": {
    descricao:
      "Bairro planejado e moderno, referência em qualidade de vida, tecnologia e sustentabilidade. Ciclovias, espaços abertos e clima de cidade do futuro.",
    destaques: ["Bairro planejado", "Inovação", "Ciclovias e áreas verdes"],
  },
  Tibery: {
    descricao:
      "Bairro consolidado, com boa infraestrutura, comércio e escolas. Um equilíbrio interessante entre preço e estrutura para famílias.",
    destaques: ["Boa infraestrutura", "Comércio e escolas", "Custo-benefício"],
  },
  "Morada da Colina": {
    descricao:
      "Bairro nobre e tranquilo, pertinho do centro, com casas amplas e ruas arborizadas. Procurado por quem busca conforto e sossego.",
    destaques: ["Região nobre", "Ruas arborizadas", "Próximo ao centro"],
  },
  Lídice: {
    descricao:
      "Bairro tradicional e bem localizado, perto do centro e de avenidas importantes como a Cesário Alvim. Boa oferta de apartamentos.",
    destaques: ["Bem localizado", "Tradicional", "Perto do centro"],
  },
  Brasil: {
    descricao:
      "Bairro central, com comércio variado e fácil acesso ao centro e às principais avenidas da cidade.",
    destaques: ["Central", "Comércio variado", "Fácil acesso"],
  },
  Saraiva: {
    descricao:
      "Bairro nobre e bem estruturado, cortado pela Av. João Naves de Ávila, com forte comércio, serviços e ótima localização.",
    destaques: ["Av. João Naves", "Comércio forte", "Bem estruturado"],
  },
  Granada: {
    descricao:
      "Região em crescimento, com novos loteamentos e condomínios. Boa opção para quem busca espaço, tranquilidade e valorização.",
    destaques: ["Em crescimento", "Espaço e sossego", "Novos condomínios"],
  },
  "Jardim Inconfidência": {
    descricao:
      "Bairro residencial tranquilo, com boa oferta de casas e acesso fácil ao comércio e aos serviços do entorno.",
    destaques: ["Residencial tranquilo", "Boa oferta de casas", "Acesso fácil"],
  },
};

export function infoDoBairro(bairro: string | null): InfoBairro {
  if (bairro && BAIRROS[bairro]) return BAIRROS[bairro];
  return {
    descricao:
      "Bairro de Uberlândia com boa oferta de imóveis. Demonstre interesse para conhecer mais sobre a região direto com o anunciante.",
    destaques: ["Em Uberlândia/MG"],
  };
}
