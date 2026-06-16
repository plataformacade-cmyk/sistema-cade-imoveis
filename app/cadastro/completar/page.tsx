import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowRight, Search, Home } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Onboarding pós-cadastro: o novo usuário escolhe a intenção. Quem quer
// anunciar vira "proprietario" na hora e já vai cadastrar o 1º imóvel.
async function queroAnunciar() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("usuarios").update({ papel: "proprietario" }).eq("id", user.id);
    revalidatePath("/", "layout");
  }
  redirect("/painel/imoveis/novo");
}

export default async function CompletarCadastroPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  const primeiroNome = (sessao.user.nome || "").split(" ")[0] || "tudo certo";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-cade.svg" alt="" className="size-7" />
        <span className="tracking-tight">
          Cadê<span className="text-primary"> Imóveis</span>
        </span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Boas-vindas, {primeiroNome}! 🎉
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Conta criada. O que te traz à Cadê hoje?
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Buscar */}
        <Link
          href="/plataforma"
          className="group flex flex-col gap-3 rounded-2xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Search className="size-7" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight">
            Quero encontrar um imóvel
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Busque casas, apartamentos e terrenos em Uberlândia e converse direto
            com quem anuncia.
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
            Buscar imóveis
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        {/* Anunciar */}
        <form action={queroAnunciar} className="contents">
          <button
            type="submit"
            className="group flex flex-col gap-3 rounded-2xl border bg-card p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Home className="size-7" />
            </span>
            <h2 className="text-xl font-semibold tracking-tight">
              Quero anunciar um imóvel
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cadastre seu imóvel em minutos, receba interessados e negocie pela
              plataforma. É grátis para começar.
            </p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
              Anunciar agora
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/painel"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Pular e ir para o painel
        </Link>
      </div>
    </main>
  );
}
