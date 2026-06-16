export type Autor = {
  nome: string;
  bio: string;
  avatar: string; // Unsplash de pessoa
};

export type Post = {
  slug: string;
  titulo: string;
  resumo: string;
  capa: string;
  capaAlt: string;
  categoria: string;
  tags: string[];
  data: string; // ISO yyyy-mm-dd
  autor: Autor;
  /** Minutos de leitura. Calculado a partir do conteúdo (~200 palavras/min). */
  tempoLeitura: number;
  /** Parágrafos do conteúdo. Strings que começam com "## " viram subtítulos. */
  conteudo: string[];
};

const AUTORES: Record<string, Autor> = {
  redacao: {
    nome: "Redação Cadê",
    bio: "O time de conteúdo da Cadê Imóveis acompanha de perto o mercado de Uberlândia e traduz o que importa em guias práticos, diretos e sem juridiquês.",
    avatar: "/logo-cade.svg",
  },
  marina: {
    nome: "Marina Teixeira",
    bio: "Especialista em crédito imobiliário, ajuda famílias a saírem do aluguel há mais de dez anos. Escreve sobre financiamento, FGTS e planejamento de compra.",
    avatar: "/blog/autores/marina.webp",
  },
  rafael: {
    nome: "Rafael Andrade",
    bio: "Corretor e consultor de mercado em Uberlândia. Conhece bairro por bairro da cidade e gosta de explicar o que está por trás dos números.",
    avatar: "/blog/autores/rafael.webp",
  },
  juliana: {
    nome: "Juliana Mendes",
    bio: "Advogada imobiliária. Defende que um bom negócio começa com a documentação em dia e adora desburocratizar contrato para quem não é da área.",
    avatar: "/blog/autores/juliana.webp",
  },
};

/** Conta palavras e estima minutos de leitura (~200 palavras/min, mínimo 1). */
function calcularTempoLeitura(conteudo: string[]): number {
  const palavras = conteudo
    .join(" ")
    .replace(/^##\s+/gm, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

const POSTS_BASE: Omit<Post, "tempoLeitura">[] = [
  {
    slug: "como-financiar-seu-primeiro-imovel-em-uberlandia",
    titulo: "Como financiar seu primeiro imóvel em Uberlândia",
    resumo:
      "Do FGTS ao Minha Casa Minha Vida: um guia completo para quem quer sair do aluguel e comprar o primeiro imóvel na cidade sem se perder no caminho.",
    capa: "/blog/financiamento.webp",
    capaAlt: "Casal comemorando a compra do primeiro imóvel",
    categoria: "Financiamento",
    tags: ["FGTS", "Minha Casa Minha Vida", "primeiro imóvel", "crédito", "entrada"],
    data: "2026-06-10",
    autor: AUTORES.marina,
    conteudo: [
      "Comprar o primeiro imóvel é um dos passos mais importantes da vida — e também um dos que mais geram dúvidas. A boa notícia é que, com um pouco de planejamento, sair do aluguel em Uberlândia está mais acessível do que muita gente imagina. Neste guia, a gente percorre o caminho inteiro: de quanto você pode pagar até a assinatura do contrato.",
      "## Comece pelo seu orçamento, não pelo imóvel",
      "O erro mais comum é se apaixonar por um imóvel antes de saber quanto ele cabe no bolso. Inverta a ordem. A regra de bolso é que a parcela do financiamento não passe de 30% da renda mensal da família. Some toda a renda, subtraia os gastos fixos (contas, escola, transporte, dívidas) e veja com clareza o que sobra com folga — não o limite no sufoco.",
      "Esse número, multiplicado pelo prazo e ajustado pelos juros, define a faixa de imóveis que faz sentido para você. Buscar dentro dela poupa frustração e acelera a aprovação no banco.",
      "## Use o FGTS a seu favor",
      "Se você tem carteira assinada há pelo menos três anos (somando todos os contratos), pode usar o saldo do FGTS como parte da entrada ou para abater o valor financiado. Para imóveis residenciais urbanos avaliados dentro do teto do programa, é um dos recursos mais poderosos à disposição — e, muitas vezes, é o empurrão que faltava para fechar negócio.",
      "Vale conferir as condições: o imóvel precisa ser para moradia, estar na cidade onde você trabalha ou mora, e você não pode ter outro financiamento ativo pelo sistema. Um gerente consegue simular isso em minutos.",
      "## Conheça o Minha Casa Minha Vida",
      "O programa oferece juros reduzidos e, dependendo da faixa de renda, subsídios que diminuem o valor financiado. Em Uberlândia, vários empreendimentos se enquadram — tanto na planta quanto prontos. A faixa de renda define a taxa e o tamanho do desconto, então o primeiro passo é descobrir em qual delas você está.",
      "## Compare o CET, não só a taxa da propaganda",
      "Cada banco tem taxas, prazos e exigências diferentes. Simule em pelo menos três instituições e compare o Custo Efetivo Total (CET), que junta juros, seguros e tarifas. É comum uma taxa de juros baixa esconder um CET alto por causa de seguros caros. O CET é o número honesto.",
      "## Junte a documentação antes de precisar dela",
      "Banco gosta de papel em ordem. Tenha à mão RG, CPF, comprovante de renda, comprovante de residência e a carteira de trabalho. Quanto mais rápido você entrega, mais rápido sai a aprovação — e, num mercado aquecido, agilidade fecha negócio.",
      "Com o financiamento pré-aprovado, é hora da melhor parte: encontrar o imóvel certo. Use os filtros da Cadê por bairro e faixa de preço e converse direto com quem anuncia para tirar todas as dúvidas antes de visitar.",
    ],
  },
  {
    slug: "documentacao-para-comprar-imovel-o-checklist-completo",
    titulo: "Documentação para comprar imóvel: o checklist completo",
    resumo:
      "Evite surpresas na hora de fechar negócio. Veja, item por item, quais documentos do imóvel e do vendedor você precisa conferir antes de assinar.",
    capa: "/blog/documentacao.webp",
    capaAlt: "Documentos e contrato sobre uma mesa de madeira",
    categoria: "Comprar",
    tags: ["documentação", "matrícula", "cartório", "escritura", "segurança"],
    data: "2026-06-05",
    autor: AUTORES.juliana,
    conteudo: [
      "Fechar a compra de um imóvel sem conferir a documentação é como dirigir de olhos fechados. Um pequeno cuidado nessa etapa evita dores de cabeça enormes — e, às vezes, prejuízos irreversíveis — lá na frente. Vamos ao checklist.",
      "## Documentos do imóvel",
      "Comece pela matrícula atualizada, emitida pelo Cartório de Registro de Imóveis. Ela é a certidão de identidade do bem: conta toda a história dele e revela penhoras, hipotecas, usufrutos ou disputas judiciais. Peça uma emitida nos últimos 30 dias.",
      "Confira também a certidão negativa de débitos do IPTU, na prefeitura, e — se for apartamento — a declaração de quitação do condomínio, assinada pelo síndico ou pela administradora. Dívida de condomínio acompanha o imóvel, não o antigo dono.",
      "## Documentos do vendedor",
      "Solicite certidões negativas em nome do vendedor: ações cíveis, trabalhistas, criminais e federais. Elas mostram se existe algum processo que possa, no futuro, recair sobre o imóvel comprado por meio de uma fraude contra credores. Se o vendedor for casado, peça também as certidões do cônjuge.",
      "## A escritura e o registro são coisas diferentes",
      "A escritura pública é lavrada em cartório de notas e formaliza a vontade de comprar e vender. Mas atenção a um detalhe que muita gente erra: só com o registro dessa escritura na matrícula do imóvel é que ele passa oficialmente a ser seu. Quem não registra, não é dono. Não pule essa etapa, mesmo que custe um pouco de ITBI e taxas.",
      "## Quando vale chamar um especialista",
      "Se a documentação parecer confusa, há mais de um proprietário, inventário em andamento ou o imóvel veio de leilão, vale o investimento em um advogado ou despachante imobiliário. O custo é pequeno perto da segurança de fechar um negócio realmente limpo.",
      "Na Cadê, incentivamos a transparência total: quanto mais clara a informação no anúncio, mais tranquila é a negociação para os dois lados. Documentação em dia é o melhor cartão de visitas de um imóvel.",
    ],
  },
  {
    slug: "os-melhores-bairros-para-morar-em-uberlandia",
    titulo: "Os melhores bairros para morar em Uberlândia",
    resumo:
      "Do agito do Centro à tranquilidade do Jardim Karaíba: um panorama dos bairros para você encontrar o que combina com o seu estilo de vida e o seu bolso.",
    capa: "/blog/bairros.webp",
    capaAlt: "Vista aérea de um bairro residencial arborizado",
    categoria: "Bairros de Uberlândia",
    tags: ["bairros", "Granja Marileusa", "Santa Mônica", "Jardim Karaíba", "Centro"],
    data: "2026-05-28",
    autor: AUTORES.rafael,
    conteudo: [
      "Uberlândia cresceu rápido e bem, com bairros para todos os perfis e bolsos. Escolher onde morar é tão importante quanto escolher o imóvel — afinal, é a vizinhança que vai fazer parte do seu dia a dia, da padaria da esquina ao trajeto para o trabalho.",
      "## Centro: praticidade e movimento",
      "Quem gosta de ter tudo por perto se sente em casa no Centro. Comércio forte, bancos, serviços, hospitais e transporte facilitam a rotina de quem prioriza a praticidade. É uma região para quem valoriza estar a pé de tudo e não se incomoda com mais movimento.",
      "## Santa Mônica: vida universitária e custo justo",
      "Próximo ao campus da Universidade Federal, o Santa Mônica é jovem, cheio de comércio e com boas opções de aluguel a preços acessíveis. Ótimo para estudantes, jovens profissionais e investidores que miram a locação para o público universitário.",
      "## Jardim Karaíba: sofisticação e segurança",
      "Um dos bairros mais valorizados da cidade, reúne condomínios fechados, áreas verdes, comércio de alto padrão e tranquilidade. Procurado por famílias que buscam conforto, segurança e espaço — e estão dispostas a pagar por isso.",
      "## Granja Marileusa: o novo polo de inovação",
      "Planejado do zero e moderno, o Granja Marileusa virou referência em qualidade de vida e tecnologia. Tem espaços abertos, ciclovias, empresas de ponta e um clima de cidade do futuro. Atrai quem busca um estilo de vida mais conectado e sustentável.",
      "## Tibery e Umuarama: equilíbrio e infraestrutura",
      "Para quem quer um meio-termo entre preço e estrutura, bairros como Tibery e Umuarama oferecem comércio consolidado, escolas, mobilidade e imóveis de tamanhos variados. São apostas seguras para famílias que querem botar raiz sem estourar o orçamento.",
      "Seja qual for o seu estilo, a Cadê tem anúncios em dezenas de bairros de Uberlândia. Use o filtro por região e descubra o cantinho perfeito para você.",
    ],
  },
  {
    slug: "alugar-ou-comprar-como-decidir",
    titulo: "Alugar ou comprar? Como tomar a decisão certa",
    resumo:
      "Não existe resposta única. Veja os pontos que realmente importam — dinheiro, tempo e estilo de vida — para decidir entre alugar e comprar no seu momento.",
    capa: "/blog/planejamento.webp",
    capaAlt: "Pessoa analisando finanças e planejando em um caderno",
    categoria: "Dicas",
    tags: ["alugar", "comprar", "finanças", "decisão", "planejamento"],
    data: "2026-05-20",
    autor: AUTORES.marina,
    conteudo: [
      "Alugar ou comprar? É uma das perguntas mais comuns que recebemos — e a resposta honesta depende muito mais do seu momento de vida do que de qualquer fórmula mágica da internet. Vamos olhar os dois lados com calma.",
      "## A favor de alugar",
      "Alugar dá flexibilidade. Se você ainda não sabe onde quer se fixar, está mudando de cidade, planeja crescer a família em breve ou prefere não comprometer uma reserva agora, o aluguel mantém suas opções abertas. Trocar de bairro é só uma questão de aviso prévio, não de vender um imóvel.",
      "Alugar também transfere para o proprietário os custos grandes de manutenção e a variação do mercado. Você paga para usar, não para possuir — e às vezes isso é exatamente o que faz sentido.",
      "## A favor de comprar",
      "Comprar é construir patrimônio. Cada parcela paga vira seu, você pode reformar à vontade, pintar a parede da cor que quiser e fica livre dos reajustes anuais do aluguel. Para quem tem estabilidade de renda e horizonte longo, costuma valer muito a pena.",
      "Há ainda o conforto emocional de ter um lugar que é, de fato, seu — algo que não entra na planilha, mas pesa na decisão de muita gente.",
      "## Faça as contas com honestidade",
      "Compare a parcela do financiamento com o valor do aluguel, mas inclua tudo: IPTU, condomínio, seguro, manutenção e o custo de oportunidade da entrada (quanto ela renderia investida). Quando você coloca todos os números na mesma planilha, a decisão costuma clarear sozinha.",
      "## Pense no seu horizonte de tempo",
      "Esta é a pergunta-chave: por quanto tempo você pretende ficar? Se a resposta é 'muitos anos', comprar tende a compensar, porque os custos de transação se diluem. Para horizontes curtos, de dois ou três anos, alugar costuma ser mais inteligente.",
      "Qualquer que seja sua escolha, na Cadê você encontra imóveis para alugar e para comprar — e fala direto com quem anuncia, sem intermediário no meio do caminho.",
    ],
  },
  {
    slug: "5-dicas-para-anunciar-seu-imovel-e-vender-rapido",
    titulo: "5 dicas para anunciar seu imóvel e vender mais rápido",
    resumo:
      "Boas fotos, descrição honesta e preço justo. Veja como fazer seu anúncio se destacar na multidão e atrair exatamente as pessoas certas.",
    capa: "/blog/anunciar.webp",
    capaAlt: "Sala de estar bem iluminada, organizada e convidativa",
    categoria: "Dicas",
    tags: ["anunciar", "vender", "fotos", "preço", "negociação"],
    data: "2026-05-12",
    autor: AUTORES.rafael,
    conteudo: [
      "Anunciar um imóvel é como montar uma vitrine: os primeiros segundos decidem se a pessoa para para olhar ou segue em frente. Algumas atitudes simples — e gratuitas — fazem toda a diferença entre um anúncio parado e um que fecha negócio em semanas.",
      "## 1. Capriche nas fotos",
      "Fotos de qualidade são, de longe, o maior atrativo de um anúncio. Aproveite a luz natural do começo da manhã ou do fim da tarde, abra as cortinas, mantenha os ambientes arrumados e fotografe cada cômodo na horizontal, na altura do peito. Evite fotos escuras, tortas ou com bagunça no canto. Se der, capriche numa foto de fachada caprichada para a capa.",
      "## 2. Escreva uma descrição honesta e completa",
      "Conte o que o imóvel tem de melhor, mas seja transparente sobre tudo. Informe metragem, número de quartos, vagas, andar, se aceita pet e o que está incluso. Uma descrição realista atrai pessoas realmente interessadas e evita visitas frustradas — que só fazem você perder tempo.",
      "## 3. Defina um preço justo",
      "Pesquise imóveis parecidos na mesma região para chegar a um valor coerente com o mercado. Preço acima da realidade afasta interessados e faz o anúncio 'envelhecer'; preço justo gera contato e acelera a negociação. Lembre que o melhor momento de venda é nas primeiras semanas, quando o anúncio é novidade.",
      "## 4. Destaque os diferenciais",
      "Garagem coberta, área de lazer, energia solar, proximidade de escolas, mercado ou ponto de ônibus: pequenos detalhes podem ser exatamente o que a pessoa procura. Não deixe de mencioná-los — eles são o que diferencia o seu imóvel de outros parecidos.",
      "## 5. Responda rápido",
      "Quem demonstra interesse quer resposta hoje, não amanhã. Estar disponível, ser atencioso e responder com clareza transmite confiança e acelera o fechamento. Anúncio bom com vendedor sumido não vende.",
      "Pronto para colocar seu imóvel para a cidade ver? Cadastre seu anúncio na Cadê, fale direto com gente realmente interessada e acompanhe tudo pelo seu painel.",
    ],
  },
  {
    slug: "tendencias-do-mercado-imobiliario-de-uberlandia-em-2026",
    titulo: "Tendências do mercado imobiliário de Uberlândia em 2026",
    resumo:
      "Valorização, novos polos e o que esperar dos preços. Um olhar sobre para onde o mercado da cidade está caminhando — e como se posicionar.",
    capa: "/blog/skyline.webp",
    capaAlt: "Skyline de prédios modernos ao entardecer",
    categoria: "Comprar",
    tags: ["mercado", "tendências", "2026", "investimento", "valorização"],
    data: "2026-05-03",
    autor: AUTORES.redacao,
    conteudo: [
      "Uberlândia segue como uma das cidades mais dinâmicas do Triângulo Mineiro, e o mercado imobiliário acompanha esse ritmo. Entender as tendências ajuda quem quer comprar, vender ou investir a tomar decisões melhores e a não correr atrás do prejuízo.",
      "## Novos polos de desenvolvimento",
      "Regiões planejadas, como o Granja Marileusa, puxam a valorização e atraem moradores que buscam qualidade de vida, tecnologia e infraestrutura moderna. Comprar perto de um polo em formação costuma ser uma aposta sólida de valorização no médio prazo.",
      "## Demanda por imóveis compactos",
      "Apartamentos menores e bem localizados ganham espaço, impulsionados por jovens profissionais, casais sem filhos e o público universitário. Praticidade virou prioridade: muita gente troca metro quadrado por localização e segurança.",
      "## Sustentabilidade e bem-estar",
      "Áreas verdes, espaços de convivência, energia solar e construções eficientes pesam cada vez mais na decisão de compra. Morar bem hoje é também morar com qualidade de vida e contas menores no fim do mês — e o mercado já precifica isso.",
      "## O digital no centro da busca",
      "A jornada de quem procura imóvel começa online. Plataformas transparentes, com boas fotos, informação completa e contato direto, viraram o ponto de partida. Quem anuncia bem no digital larga na frente — e essa é exatamente a proposta da Cadê.",
      "Seja para morar ou investir, acompanhar essas tendências coloca você um passo à frente. E quando estiver pronto para agir, a Cadê está aqui para conectar você ao imóvel certo, no bairro certo, pelo preço certo.",
    ],
  },
  {
    slug: "guia-completo-para-alugar-sem-dor-de-cabeca",
    titulo: "Guia completo para alugar sem dor de cabeça",
    resumo:
      "Da garantia à vistoria: o passo a passo para alugar um imóvel com segurança, entender o contrato e evitar as armadilhas mais comuns.",
    capa: "/blog/alugar.webp",
    capaAlt: "Chaves sobre a mesa em frente a uma sala recém-alugada",
    categoria: "Alugar",
    tags: ["aluguel", "contrato", "fiador", "vistoria", "garantia"],
    data: "2026-04-24",
    autor: AUTORES.juliana,
    conteudo: [
      "Alugar parece simples, mas mora o diabo nos detalhes. Um contrato mal lido ou uma vistoria malfeita podem custar caro quando você for devolver as chaves. Este guia organiza o que importa, do anúncio à entrega.",
      "## Escolha a modalidade de garantia certa",
      "O proprietário vai pedir uma garantia, e você tem opções. O fiador é gratuito, mas exige alguém com imóvel quitado disposto a assumir o risco. O seguro-fiança custa um valor mensal, mas dispensa fiador. A caução (depósito de até três aluguéis) é simples e devolvida no fim. Compare antes de escolher — cada uma pesa diferente no seu bolso.",
      "## Leia o contrato inteiro, mesmo o que parece chato",
      "Verifique o índice de reajuste anual, o prazo, a multa por saída antecipada, quem paga IPTU e condomínio e as regras para reformas e pets. Se algo estiver vago ou diferente do combinado, peça para ajustar antes de assinar. Depois da assinatura, vale o que está no papel.",
      "## A vistoria de entrada é o seu seguro",
      "Antes de se mudar, faça uma vistoria detalhada com fotos e vídeos de tudo: paredes, pisos, torneiras, tomadas, janelas. Registre cada arranhão e infiltração existentes. Esse documento é o que protege você de pagar, na saída, por danos que já estavam lá quando você chegou.",
      "## Organize a documentação",
      "Tenha em mãos RG, CPF, comprovante de renda (em geral, renda de três vezes o aluguel) e comprovante de residência atual. Documentação completa agiliza a aprovação e mostra ao proprietário que você é um inquilino organizado.",
      "## Cuide do relacionamento",
      "Pagar em dia, comunicar problemas cedo e manter o imóvel conservado constrói uma relação saudável com o proprietário — o que ajuda na hora de renovar, negociar reajuste ou pedir um pequeno reparo. Inquilino bom é disputado.",
      "Na Cadê, você encontra imóveis para alugar conversando direto com quem anuncia, com informação clara desde o primeiro contato. Menos intermediário, menos ruído.",
    ],
  },
  {
    slug: "como-avaliar-um-bairro-antes-de-comprar",
    titulo: "Como avaliar um bairro antes de comprar",
    resumo:
      "Imóvel bom em bairro errado vira arrependimento. Veja o que observar — de mobilidade a segurança — para acertar na escolha da região.",
    capa: "/blog/rua-bairro.webp",
    capaAlt: "Rua arborizada de um bairro residencial tranquilo",
    categoria: "Bairros de Uberlândia",
    tags: ["bairro", "localização", "mobilidade", "segurança", "investimento"],
    data: "2026-04-15",
    autor: AUTORES.rafael,
    conteudo: [
      "Tem um ditado no mercado imobiliário que nunca envelhece: você compra o imóvel, mas mora no bairro. Um apartamento perfeito numa região que não combina com a sua rotina vira arrependimento rápido. Veja como avaliar a vizinhança antes de decidir.",
      "## Visite em horários diferentes",
      "Um bairro tem vidas diferentes ao longo do dia. Vá de manhã, à noite e no fim de semana. Repare no movimento, no barulho, na iluminação das ruas e na sensação de segurança. O silêncio de uma terça à tarde pode esconder o caos de uma sexta à noite — e vice-versa.",
      "## Meça as distâncias da sua vida real",
      "Pegue o seu dia a dia e cronometre: quanto tempo até o trabalho, a escola das crianças, o mercado, a academia, a casa dos pais? Localização não é sobre o centro da cidade, é sobre a sua rotina. Um bairro 'longe de tudo' pode ser perto de tudo que importa para você.",
      "## Avalie a infraestrutura e os serviços",
      "Olhe se há padaria, farmácia, posto de saúde, escola, transporte público e comércio a pé. Bairros bem servidos valorizam mais e facilitam a vida. A ausência desses serviços pode significar dependência total do carro — um custo escondido.",
      "## Pesquise a tendência de valorização",
      "Pergunte a corretores e vizinhos como o bairro estava há cinco anos e para onde ele caminha. Obras de infraestrutura, novos empreendimentos e melhorias urbanas costumam puxar os preços para cima. Comprar num bairro em ascensão é comprar valorização futura.",
      "## Converse com quem já mora lá",
      "Nenhum anúncio conta a verdade do bairro melhor do que um morador. Puxe conversa na padaria, pergunte sobre barulho, enchente, segurança e convivência. São cinco minutos que economizam anos de arrependimento.",
      "Na Cadê, você filtra imóveis por bairro e fala direto com quem conhece a região. Use isso a seu favor: pergunte tudo antes de marcar a visita.",
    ],
  },
];

export const POSTS: Post[] = POSTS_BASE.map((p) => ({
  ...p,
  tempoLeitura: calcularTempoLeitura(p.conteudo),
})).sort((a, b) => b.data.localeCompare(a.data));

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Categorias na ordem em que aparecem, sem repetição. */
export function listarCategorias(): string[] {
  return Array.from(new Set(POSTS.map((p) => p.categoria)));
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
