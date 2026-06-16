export type Post = {
  slug: string;
  titulo: string;
  resumo: string;
  capa: string;
  capaAlt: string;
  categoria: string;
  data: string; // ISO yyyy-mm-dd
  autor: string;
  /** Parágrafos do conteúdo. Strings que começam com "## " viram subtítulos. */
  conteudo: string[];
};

export const POSTS: Post[] = [
  {
    slug: "como-financiar-seu-primeiro-imovel-em-uberlandia",
    titulo: "Como financiar seu primeiro imóvel em Uberlândia",
    resumo:
      "Do FGTS ao Minha Casa Minha Vida: um guia direto para quem quer sair do aluguel e comprar o primeiro imóvel na cidade.",
    capa: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Casal comemorando a compra do primeiro imóvel",
    categoria: "Financiamento",
    data: "2026-06-10",
    autor: "Equipe Cadê",
    conteudo: [
      "Comprar o primeiro imóvel é um dos passos mais importantes da vida — e também um dos que mais geram dúvidas. A boa notícia é que, com planejamento, sair do aluguel em Uberlândia está mais acessível do que muita gente imagina.",
      "## Entenda quanto você pode pagar",
      "Antes de olhar imóveis, olhe para o seu orçamento. A regra de bolso é que a parcela do financiamento não passe de 30% da renda mensal. Some sua renda familiar, subtraia os gastos fixos e veja o que sobra com folga.",
      "## Use o FGTS a seu favor",
      "Se você tem carteira assinada há pelo menos três anos, pode usar o saldo do FGTS como entrada ou para abater o valor financiado. Isso reduz a parcela e, muitas vezes, é o empurrão que faltava para fechar negócio.",
      "## Conheça o Minha Casa Minha Vida",
      "O programa oferece juros menores e subsídios para famílias dentro das faixas de renda. Em Uberlândia, vários empreendimentos se enquadram — vale conversar com o banco para simular antes de decidir.",
      "## Compare as condições dos bancos",
      "Cada instituição tem taxas, prazos e exigências diferentes. Simule em pelo menos três bancos e compare o Custo Efetivo Total (CET), não só a taxa de juros divulgada na propaganda.",
      "Com o financiamento aprovado, é hora da melhor parte: encontrar o imóvel certo. Use os filtros da Cadê por bairro e faixa de preço e converse direto com quem anuncia para tirar todas as dúvidas.",
    ],
  },
  {
    slug: "documentacao-para-comprar-imovel-o-checklist-completo",
    titulo: "Documentação para comprar imóvel: o checklist completo",
    resumo:
      "Evite surpresas na hora de fechar negócio. Veja quais documentos do imóvel e do vendedor você precisa conferir antes de assinar.",
    capa: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Documentos e contrato sobre uma mesa",
    categoria: "Documentação",
    data: "2026-06-05",
    autor: "Equipe Cadê",
    conteudo: [
      "Fechar a compra de um imóvel sem conferir a documentação é como dirigir de olhos fechados. Um pequeno cuidado nessa etapa evita dores de cabeça enormes lá na frente.",
      "## Documentos do imóvel",
      "Peça a matrícula atualizada no Cartório de Registro de Imóveis — ela conta toda a história do bem e revela penhoras, hipotecas ou disputas. Confira também a certidão negativa de débitos do IPTU e, se for apartamento, a declaração de quitação do condomínio.",
      "## Documentos do vendedor",
      "Solicite certidões negativas em nome do vendedor (ações cíveis, trabalhistas e federais). Elas mostram se existe algum processo que possa, no futuro, recair sobre o imóvel comprado.",
      "## A escritura e o registro",
      "A escritura é lavrada em cartório e formaliza a venda. Mas atenção: só com o registro da escritura na matrícula é que o imóvel passa oficialmente a ser seu. Não pule essa etapa.",
      "## Quando contar com um especialista",
      "Se a documentação parecer confusa, vale o investimento em um advogado ou despachante imobiliário. O custo é pequeno perto da segurança de fechar um negócio limpo.",
      "Na Cadê, incentivamos a transparência total: quanto mais clara a informação no anúncio, mais tranquila é a negociação para os dois lados.",
    ],
  },
  {
    slug: "os-melhores-bairros-para-morar-em-uberlandia",
    titulo: "Os melhores bairros para morar em Uberlândia",
    resumo:
      "Do agito do Centro à tranquilidade do Granja Marileusa: um panorama dos bairros para você encontrar o que combina com o seu estilo de vida.",
    capa: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Vista aérea de bairro residencial",
    categoria: "Bairros",
    data: "2026-05-28",
    autor: "Equipe Cadê",
    conteudo: [
      "Uberlândia é uma cidade que cresceu rápido e bem, com bairros para todos os perfis. Escolher onde morar é tão importante quanto escolher o imóvel — afinal, é a vizinhança que vai fazer parte do seu dia a dia.",
      "## Centro: praticidade e movimento",
      "Quem gosta de ter tudo por perto se sente em casa no Centro. Comércio, bancos, serviços e transporte facilitam a rotina de quem prioriza a praticidade.",
      "## Santa Mônica: vida universitária",
      "Próximo à Universidade Federal, o Santa Mônica é jovem, cheio de comércio e com boas opções de aluguel. Ótimo para estudantes e jovens profissionais.",
      "## Jardim Karaíba: sofisticação e segurança",
      "Um dos bairros mais valorizados da cidade, reúne condomínios fechados, áreas verdes e tranquilidade. Procurado por famílias que buscam conforto e segurança.",
      "## Granja Marileusa: o novo polo de inovação",
      "Planejado e moderno, o Granja Marileusa virou referência em qualidade de vida e tecnologia. Espaços abertos, ciclovias e um clima de cidade do futuro.",
      "Seja qual for o seu estilo, a Cadê tem anúncios em mais de 60 bairros. Use o filtro por região e descubra o cantinho perfeito para você.",
    ],
  },
  {
    slug: "alugar-ou-comprar-como-decidir",
    titulo: "Alugar ou comprar? Como tomar a decisão certa",
    resumo:
      "Não existe resposta única. Veja os pontos que realmente importam para decidir entre alugar e comprar no seu momento de vida.",
    capa: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Pessoa analisando finanças e planejando",
    categoria: "Dicas",
    data: "2026-05-20",
    autor: "Equipe Cadê",
    conteudo: [
      "Alugar ou comprar? É uma das perguntas mais comuns — e a resposta depende muito mais do seu momento de vida do que de uma fórmula mágica.",
      "## A favor de alugar",
      "Alugar dá flexibilidade. Se você ainda não sabe onde quer se fixar, está mudando de cidade ou prefere não comprometer uma reserva agora, o aluguel mantém suas opções abertas.",
      "## A favor de comprar",
      "Comprar é construir patrimônio. Cada parcela paga vira seu, você pode reformar à vontade e fica livre dos reajustes anuais do aluguel. Para quem tem estabilidade, costuma valer a pena no longo prazo.",
      "## Faça as contas com honestidade",
      "Compare a parcela do financiamento com o valor do aluguel, mas inclua tudo: IPTU, condomínio, manutenção e o custo de oportunidade da entrada. Os números costumam clarear a decisão.",
      "## Pense no seu horizonte",
      "Se você pretende ficar no imóvel por muitos anos, comprar tende a compensar. Para horizontes curtos, alugar costuma ser mais inteligente.",
      "Qualquer que seja sua escolha, na Cadê você encontra imóveis para alugar e para comprar — e fala direto com quem anuncia.",
    ],
  },
  {
    slug: "5-dicas-para-anunciar-seu-imovel-e-vender-rapido",
    titulo: "5 dicas para anunciar seu imóvel e vender mais rápido",
    resumo:
      "Boas fotos, descrição honesta e preço justo. Veja como fazer seu anúncio se destacar e atrair as pessoas certas.",
    capa: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Sala de estar bem iluminada e organizada",
    categoria: "Dicas",
    data: "2026-05-12",
    autor: "Equipe Cadê",
    conteudo: [
      "Anunciar um imóvel é como montar uma vitrine: os primeiros segundos decidem se a pessoa para para olhar ou segue em frente. Algumas atitudes simples fazem toda a diferença.",
      "## 1. Capriche nas fotos",
      "Fotos de qualidade são o maior atrativo de um anúncio. Aproveite a luz natural, mantenha os ambientes arrumados e mostre cada cômodo com clareza. Evite fotos escuras ou tortas.",
      "## 2. Escreva uma descrição honesta",
      "Conte o que o imóvel tem de melhor, mas seja transparente sobre tudo. Uma descrição realista atrai pessoas realmente interessadas e evita visitas frustradas.",
      "## 3. Defina um preço justo",
      "Pesquise imóveis parecidos na mesma região para chegar a um valor coerente. Preço fora da realidade afasta interessados; preço justo acelera a negociação.",
      "## 4. Destaque os diferenciais",
      "Garagem coberta, área de lazer, proximidade de escolas ou transporte: pequenos detalhes podem ser exatamente o que a pessoa procura. Não deixe de mencioná-los.",
      "## 5. Responda rápido",
      "Quem demonstra interesse quer resposta. Estar disponível e atencioso transmite confiança e acelera o fechamento.",
      "Pronto para colocar seu imóvel para a cidade ver? Cadastre seu anúncio na Cadê e fale com gente realmente interessada.",
    ],
  },
  {
    slug: "tendencias-do-mercado-imobiliario-de-uberlandia-em-2026",
    titulo: "Tendências do mercado imobiliário de Uberlândia em 2026",
    resumo:
      "Valorização, novos polos e o que esperar dos preços. Um olhar sobre para onde o mercado da cidade está caminhando.",
    capa: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    capaAlt: "Skyline de prédios modernos na cidade",
    categoria: "Mercado",
    data: "2026-05-03",
    autor: "Equipe Cadê",
    conteudo: [
      "Uberlândia segue como uma das cidades mais dinâmicas do Triângulo Mineiro, e o mercado imobiliário acompanha esse ritmo. Entender as tendências ajuda quem quer comprar, vender ou investir a tomar decisões melhores.",
      "## Novos polos de desenvolvimento",
      "Regiões planejadas como o Granja Marileusa puxam a valorização e atraem moradores que buscam qualidade de vida, tecnologia e infraestrutura moderna.",
      "## Demanda por imóveis compactos",
      "Apartamentos menores e bem localizados ganham espaço, impulsionados por jovens profissionais e pelo público universitário. Praticidade virou prioridade.",
      "## Sustentabilidade e bem-estar",
      "Áreas verdes, espaços de convivência e construções eficientes pesam cada vez mais na decisão. Morar bem hoje é também morar com qualidade de vida.",
      "## O digital no centro da busca",
      "A jornada começa online. Plataformas transparentes, com boas fotos e contato direto, viraram o ponto de partida de quem procura imóvel — e essa é exatamente a proposta da Cadê.",
      "Seja para morar ou investir, acompanhar essas tendências coloca você um passo à frente. E quando estiver pronto, a Cadê está aqui para conectar você ao imóvel certo.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
