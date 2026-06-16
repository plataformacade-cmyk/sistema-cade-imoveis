import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { responder, type TurnoChat } from "@/lib/suporte/agente";
import { saudacao } from "@/lib/suporte/base-conhecimento";

export const dynamic = "force-dynamic";

type Mensagem = { id: string; autor: TurnoChat["autor"]; corpo: string; criado_em: string };

/** GET → contexto do widget: quem é o usuário + a conversa ativa (se houver). */
export async function GET(request: Request) {
  const sessao = await getSessao();
  const papel = sessao?.papel ?? "visitante";
  const nome = sessao?.user.nome?.split(" ")[0];

  if (!sessao) {
    return NextResponse.json({
      logado: false,
      papel: "visitante",
      saudacao: saudacao("visitante"),
      conversaId: null,
      mensagens: [] as Mensagem[],
    });
  }

  const supabase = await createClient();
  const url = new URL(request.url);
  let conversaId = url.searchParams.get("conversaId");

  // Sem id explícito → pega a conversa mais recente ainda não resolvida.
  if (!conversaId) {
    const { data } = await supabase
      .from("suporte_conversas")
      .select("id")
      .neq("status", "resolvida")
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    conversaId = data?.id ?? null;
  }

  let mensagens: Mensagem[] = [];
  let status: string | null = null;
  if (conversaId) {
    const [{ data: msgs }, { data: conv }] = await Promise.all([
      supabase
        .from("suporte_mensagens")
        .select("id, autor, corpo, criado_em")
        .eq("conversa_id", conversaId)
        .order("criado_em", { ascending: true }),
      supabase.from("suporte_conversas").select("status").eq("id", conversaId).maybeSingle(),
    ]);
    mensagens = (msgs as Mensagem[]) ?? [];
    status = conv?.status ?? null;
  }

  return NextResponse.json({
    logado: true,
    papel,
    saudacao: saudacao(papel, nome),
    conversaId,
    status,
    mensagens,
  });
}

/** POST → envia mensagem do usuário e devolve a resposta do agente. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mensagem = String(body?.mensagem ?? "").trim().slice(0, 2000);
  if (!mensagem) {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }

  const sessao = await getSessao();
  const papel = sessao?.papel ?? "visitante";

  // Visitante (não logado): responde sem persistir; convida a criar conta.
  if (!sessao) {
    const r = await responder("visitante", [], mensagem);
    return NextResponse.json({ conversaId: null, ...r, logado: false });
  }

  const supabase = await createClient();
  let conversaId = body?.conversaId ? String(body.conversaId) : null;

  // Garante a conversa (cria na primeira mensagem).
  if (!conversaId) {
    const { data, error } = await supabase
      .from("suporte_conversas")
      .insert({ usuario_id: sessao.user.id, papel, assunto: mensagem.slice(0, 80) })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ erro: "Não foi possível abrir a conversa." }, { status: 500 });
    }
    conversaId = data.id;
  }

  // Registra a fala do usuário.
  await supabase.from("suporte_mensagens").insert({
    conversa_id: conversaId,
    autor: "usuario",
    autor_id: sessao.user.id,
    corpo: mensagem,
  });

  // Histórico recente para dar contexto ao agente.
  const { data: hist } = await supabase
    .from("suporte_mensagens")
    .select("autor, corpo")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: true })
    .limit(20);
  const historico: TurnoChat[] = (hist as TurnoChat[]) ?? [];

  const r = await responder(papel, historico, mensagem);

  // Registra a resposta do assistente.
  await supabase.from("suporte_mensagens").insert({
    conversa_id: conversaId,
    autor: "assistente",
    corpo: r.resposta,
  });

  return NextResponse.json({ conversaId, ...r, logado: true });
}

/** PATCH → escalar para humano ou marcar como resolvida. */
export async function PATCH(request: Request) {
  const sessao = await getSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Entre na sua conta para falar com um atendente." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const conversaId = body?.conversaId ? String(body.conversaId) : null;
  const acao = String(body?.acao ?? "");
  if (!conversaId || !["escalar", "resolver"].includes(acao)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const novoStatus = acao === "escalar" ? "aguardando_humano" : "resolvida";
  const { error } = await supabase
    .from("suporte_conversas")
    .update({ status: novoStatus })
    .eq("id", conversaId);
  if (error) {
    return NextResponse.json({ erro: "Não foi possível atualizar." }, { status: 500 });
  }

  // Deixa um registro visível na conversa.
  if (acao === "escalar") {
    await supabase.from("suporte_mensagens").insert({
      conversa_id: conversaId,
      autor: "assistente",
      corpo: "Pedido enviado para a equipe da Cadê. Um atendente humano vai responder por aqui em breve. 👍",
    });
  }

  return NextResponse.json({ ok: true, status: novoStatus });
}
