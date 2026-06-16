// Base de conhecimento do agente de suporte da Cadê Imóveis.
// É a "cabeça" do agente: vira o system prompt quando há IA configurada e
// também alimenta o modo básico (busca por palavra-chave) quando não há chave.
// Manter em PT, factual e curto — é o que o agente pode afirmar com segurança.

import type { Papel } from "@/lib/auth";

export type ItemFaq = {
  /** Pergunta canônica. */
  pergunta: string;
  /** Palavras que indicam essa intenção (modo básico, sem IA). */
  gatilhos: string[];
  /** Resposta curta e direta (40-80 palavras). */
  resposta: string;
  /** Perfis para quem o item é mais relevante (vazio = todos). */
  papeis?: Papel[];
};

export const SOBRE_CADE =
  "A Cadê Imóveis é uma plataforma de compra, venda e locação de imóveis em " +
  "Uberlândia/MG. Conecta quem procura um imóvel com quem anuncia (proprietários " +
  "e corretores), com negociação, agendamento de visitas, propostas e contrato " +
  "acontecendo dentro da própria plataforma.";

export const FAQ: ItemFaq[] = [
  {
    pergunta: "Como busco um imóvel?",
    gatilhos: ["buscar", "procurar", "achar imovel", "encontrar", "pesquisar", "filtro"],
    resposta:
      "Vá em Imóveis (no menu) ou na busca da página inicial. Você pode filtrar por " +
      "bairro, tipo (casa, apartamento, terreno), faixa de preço e por compra ou " +
      "aluguel. Clique em um imóvel para ver fotos, mapa com a localização e detalhes do bairro.",
  },
  {
    pergunta: "Como demonstro interesse num imóvel?",
    gatilhos: ["interesse", "tenho interesse", "gostei", "quero esse", "contato anunciante", "falar com dono"],
    resposta:
      "Na página do imóvel, clique em \"Tenho interesse\". Isso abre uma negociação " +
      "e um chat direto com quem anuncia — sem intermediário. A partir daí vocês " +
      "conversam, agendam visita e podem enviar propostas, tudo registrado aqui.",
  },
  {
    pergunta: "Como favorito ou compartilho um imóvel?",
    gatilhos: ["favoritar", "favorito", "salvar imovel", "compartilhar", "enviar link"],
    resposta:
      "Na página do imóvel há os botões de favoritar (coração) e compartilhar. " +
      "Favoritar guarda o imóvel para você rever depois; compartilhar gera o link " +
      "para mandar para alguém por WhatsApp ou redes.",
  },
  {
    pergunta: "Como agendo uma visita?",
    gatilhos: ["visita", "agendar", "visitar", "conhecer o imovel", "marcar"],
    resposta:
      "Depois de demonstrar interesse, dentro da negociação você pede uma visita " +
      "escolhendo data e horário. O anunciante confirma e você acompanha o status " +
      "(solicitada, confirmada, realizada) na aba Visitas do seu painel.",
  },
  {
    pergunta: "Onde vejo minhas conversas e negociações?",
    gatilhos: ["negociacoes", "negocios", "minhas conversas", "mensagens", "onde vejo", "acompanhar"],
    resposta:
      "No seu painel, em Negociações você vê cada imóvel em andamento com o status " +
      "e o histórico de conversa. Cada negociação reúne mensagens, visitas e " +
      "propostas num lugar só.",
  },
  {
    pergunta: "Como anuncio meu imóvel?",
    gatilhos: ["anunciar", "cadastrar imovel", "colocar a venda", "alugar meu", "vender meu", "publicar imovel"],
    resposta:
      "No painel, clique em \"Anunciar imóvel\" e preencha tipo, endereço, fotos " +
      "(várias), preço e descrição. Ao publicar, ele entra na vitrine e você passa " +
      "a receber interessados pelo chat. É grátis para começar.",
    papeis: ["proprietario", "corretor", "admin", "cliente"],
  },
  {
    pergunta: "Como faço e respondo uma proposta?",
    gatilhos: ["proposta", "oferta", "negociar valor", "contraproposta", "lance"],
    resposta:
      "Dentro de uma negociação, use Enviar proposta para registrar valor e " +
      "condições. O outro lado pode aceitar, recusar ou fazer uma contraproposta. " +
      "Tudo fica registrado para os dois acompanharem.",
  },
  {
    pergunta: "Como funciona o contrato e os documentos?",
    gatilhos: ["contrato", "assinar", "documento", "documentos", "due diligence", "escritura", "garantia"],
    resposta:
      "Quando a negociação avança, na aba Contrato você gera o documento e marca " +
      "como assinado; na aba Documentos sobem os comprovantes (renda, certidões) " +
      "com status de conferência. Assim o fechamento fica organizado e seguro.",
    papeis: ["proprietario", "corretor", "admin"],
  },
  {
    pergunta: "Sou corretor — preciso do CRECI?",
    gatilhos: ["corretor", "creci", "imobiliaria", "sou corretor", "registro"],
    resposta:
      "Sim. Corretores cadastram o CRECI no perfil para anunciar e atuar nas " +
      "negociações. Isso dá segurança a quem negocia. Um admin pode validar o " +
      "registro no painel.",
    papeis: ["corretor", "admin"],
  },
  {
    pergunta: "Esqueci a senha / problema para entrar",
    gatilhos: ["senha", "esqueci", "nao consigo entrar", "login", "recuperar", "acesso"],
    resposta:
      "Na tela de login, use \"Esqueci minha senha\" para receber um link de " +
      "recuperação por e-mail. Se o problema persistir, posso te encaminhar para " +
      "um atendente humano.",
  },
  {
    pergunta: "Vocês têm aplicativo?",
    gatilhos: ["aplicativo", "app", "celular", "android", "ios", "baixar"],
    resposta:
      "O app está chegando. Por enquanto a plataforma funciona muito bem pelo " +
      "navegador do celular — é só acessar o site. Quando o app sair, avisamos por aqui.",
  },
  {
    pergunta: "Onde mudo meus dados / minha conta?",
    gatilhos: ["meus dados", "perfil", "configuracoes", "alterar conta", "trocar senha", "excluir conta"],
    resposta:
      "No painel, em Configurações você edita seu perfil, troca a senha e, se " +
      "quiser, exclui a conta. Seus dados são tratados conforme a LGPD.",
  },
];

/** Dica de abertura por perfil (primeira fala do agente). */
export function saudacao(papel: Papel | "visitante", primeiroNome?: string): string {
  const nome = primeiroNome ? `, ${primeiroNome}` : "";
  switch (papel) {
    case "proprietario":
    case "corretor":
      return `Oi${nome}! Sou o assistente da Cadê. Posso ajudar com seus anúncios, ` +
        `negociações, visitas e propostas. O que você precisa?`;
    case "admin":
      return `Oi${nome}! Assistente da Cadê por aqui. Posso ajudar com dúvidas da ` +
        `operação, fluxos da plataforma e atendimento. Como posso ajudar?`;
    case "cliente":
      return `Oi${nome}! Sou o assistente da Cadê. Posso te ajudar a buscar imóveis, ` +
        `demonstrar interesse, agendar visitas e acompanhar negociações. O que você procura?`;
    default:
      return `Oi! Sou o assistente da Cadê Imóveis. Posso ajudar a encontrar imóveis ` +
        `em Uberlândia, anunciar o seu ou tirar dúvidas. Como posso ajudar?`;
  }
}

/** Monta o system prompt para a IA, com a base + o contexto do perfil. */
export function systemPrompt(papel: Papel | "visitante"): string {
  const faqTexto = FAQ.map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`).join("\n\n");
  const contextoPapel =
    papel === "proprietario" || papel === "corretor"
      ? "O usuário ANUNCIA imóveis (proprietário/corretor): priorize anúncios, propostas, visitas e contratos."
      : papel === "admin"
        ? "O usuário é ADMIN da operação: pode falar de fluxos internos e atendimento."
        : papel === "cliente"
          ? "O usuário BUSCA imóveis (cliente): priorize busca, interesse, visitas e negociação."
          : "Usuário não logado (visitante): incentive criar conta para negociar.";

  return [
    `Você é o assistente de suporte da Cadê Imóveis. Responda SEMPRE em português do Brasil, claro e cordial, em no máximo 3 frases curtas.`,
    SOBRE_CADE,
    contextoPapel,
    `Regras: só afirme o que está na base abaixo. Se não souber ou for um caso específico da conta do usuário (dados pessoais, um negócio específico, problema técnico), diga que vai chamar um atendente humano e oriente o usuário a tocar em "Falar com atendente". Não invente preços, imóveis nem prazos. Não peça senha. Sem emojis em excesso.`,
    `BASE DE CONHECIMENTO:\n${faqTexto}`,
  ].join("\n\n");
}
