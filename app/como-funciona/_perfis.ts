import {
  ClipboardList,
  Megaphone,
  MessageCircle,
  Handshake,
  CheckCircle2,
  Search,
  Heart,
  CalendarCheck,
  KeyRound,
  BadgeCheck,
  Building2,
  LayoutDashboard,
  Home,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type Passo = { icone: LucideIcon; titulo: string; texto: string };

export type Perfil = {
  slug: "proprietario" | "corretor" | "interessado";
  icone: LucideIcon;
  nome: string; // "Sou proprietário"
  chamada: string; // card subtitle
  headline: string; // page H1 destaque
  resumo: string;
  imagem: string;
  passos: Passo[];
};

export const PERFIS: Record<Perfil["slug"], Perfil> = {
  proprietario: {
    slug: "proprietario",
    icone: Home,
    nome: "Sou proprietário",
    chamada: "Quero anunciar, vender ou alugar meu imóvel",
    headline: "Anuncie e feche negócio sem intermediário sumido",
    resumo:
      "Você no controle do começo ao fim: publica em minutos, fala direto com quem se interessa e acompanha tudo pelo painel — do anúncio à assinatura.",
    imagem: "/institucional/anunciar.webp",
    passos: [
      {
        icone: ClipboardList,
        titulo: "Cadastre seu imóvel",
        texto:
          "Preencha as informações, suba boas fotos e defina o valor. Leva poucos minutos.",
      },
      {
        icone: Megaphone,
        titulo: "Publique para a cidade toda",
        texto:
          "Seu anúncio entra no ar e aparece para quem está procurando exatamente o que você oferece.",
      },
      {
        icone: MessageCircle,
        titulo: "Receba os interesses",
        texto:
          "Pessoas realmente interessadas demonstram interesse e chegam direto até você, sem ruído.",
      },
      {
        icone: Handshake,
        titulo: "Negocie com clareza",
        texto:
          "Converse, tire dúvidas e combine as condições com total transparência para os dois lados.",
      },
      {
        icone: CheckCircle2,
        titulo: "Feche o negócio",
        texto:
          "Alinhou tudo? É hora de assinar e comemorar. A Cadê acompanha até a entrega das chaves.",
      },
    ],
  },
  corretor: {
    slug: "corretor",
    icone: Briefcase,
    nome: "Sou corretor",
    chamada: "Quero gerenciar minha carteira e meus clientes",
    headline: "Sua carteira de imóveis e seus leads num só lugar",
    resumo:
      "Cadastre seu CRECI, gerencie todos os seus anúncios e converse com os interessados pela plataforma — com cada visita e proposta registrada.",
    imagem: "/institucional/buscar.webp",
    passos: [
      {
        icone: BadgeCheck,
        titulo: "Crie sua conta de corretor",
        texto:
          "Cadastre-se com seu CRECI e ative seu perfil profissional na plataforma.",
      },
      {
        icone: Building2,
        titulo: "Cadastre sua carteira",
        texto:
          "Publique todos os imóveis que você representa, com fotos e informações completas.",
      },
      {
        icone: LayoutDashboard,
        titulo: "Gerencie tudo no painel",
        texto:
          "Acompanhe anúncios, interessados e o andamento de cada negócio num painel só seu.",
      },
      {
        icone: MessageCircle,
        titulo: "Converse e agende visitas",
        texto:
          "Fale com os interessados pela plataforma e combine as visitas sem telefone tocando o dia todo.",
      },
      {
        icone: Handshake,
        titulo: "Conduza até o fechamento",
        texto:
          "Registre propostas e contrapropostas e leve a negociação até a assinatura, tudo documentado.",
      },
    ],
  },
  interessado: {
    slug: "interessado",
    icone: Search,
    nome: "Tenho interesse",
    chamada: "Quero encontrar um imóvel para comprar ou alugar",
    headline: "Encontre o lar certo e converse direto com quem anuncia",
    resumo:
      "Busque do seu jeito, demonstre interesse com um clique e fale direto com o anunciante — sem ligação fria nem intermediário que some.",
    imagem: "/institucional/acolhedor.webp",
    passos: [
      {
        icone: Search,
        titulo: "Busque do seu jeito",
        texto:
          "Filtre por bairro, preço, tipo e tamanho até encontrar o imóvel que combina com você.",
      },
      {
        icone: Heart,
        titulo: "Demonstre interesse",
        texto:
          "Gostou? Um clique avisa quem anuncia que você quer saber mais. Sem compromisso.",
      },
      {
        icone: MessageCircle,
        titulo: "Converse direto",
        texto:
          "Tire suas dúvidas falando com quem realmente conhece o imóvel — gente de verdade.",
      },
      {
        icone: CalendarCheck,
        titulo: "Agende a visita",
        texto:
          "Combine o melhor dia e horário para conhecer o imóvel pessoalmente, no seu ritmo.",
      },
      {
        icone: KeyRound,
        titulo: "Feche e mude-se",
        texto:
          "Encontrou o seu lar? A Cadê te ajuda a fechar com segurança até a chave na mão.",
      },
    ],
  },
};

export const PERFIS_LISTA = [
  PERFIS.proprietario,
  PERFIS.corretor,
  PERFIS.interessado,
];
