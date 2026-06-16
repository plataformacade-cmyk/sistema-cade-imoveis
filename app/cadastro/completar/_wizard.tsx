"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Home,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  MapPin,
  Wallet,
  PartyPopper,
} from "lucide-react";
import { tornarProprietario } from "@/actions/onboarding";

const BAIRROS = [
  "Centro", "Santa Mônica", "Jardim Karaíba", "Granja Marileusa", "Tibery",
  "Morada da Colina", "Lídice", "Brasil", "Saraiva", "Granada", "Jardim Inconfidência",
];
const TIPOS = [
  { v: "casa", l: "Casa" },
  { v: "apartamento", l: "Apartamento" },
  { v: "comercial", l: "Comercial" },
  { v: "terreno", l: "Terreno" },
];
const FAIXAS = [
  { l: "Até R$ 300 mil", max: "300000" },
  { l: "R$ 300–600 mil", max: "600000" },
  { l: "R$ 600 mil–1 mi", max: "1000000" },
  { l: "Acima de R$ 1 mi", max: "" },
];

const PASSOS = ["Intenção", "Preferências", "Tudo pronto"];

export function OnboardingWizard({ primeiroNome }: { primeiroNome: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [passo, setPasso] = useState(0);
  const [intencao, setIntencao] = useState<"buscar" | "anunciar" | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [bairro, setBairro] = useState<string | null>(null);
  const [faixa, setFaixa] = useState<string | null>(null);

  function escolher(i: "buscar" | "anunciar") {
    setIntencao(i);
    setPasso(1);
  }

  function finalizar() {
    if (intencao === "anunciar") {
      startTransition(async () => {
        await tornarProprietario();
        router.push("/painel/imoveis/novo");
      });
    } else {
      const p = new URLSearchParams();
      if (tipo) p.set("tipo", tipo);
      if (bairro) p.set("bairro", bairro);
      if (faixa) p.set("valor_max", faixa);
      router.push(`/plataforma${p.toString() ? `?${p}` : ""}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      {/* marca */}
      <div className="mb-6 flex items-center gap-2 font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-cade.svg" alt="" className="size-7" />
        <span className="tracking-tight">
          Cadê<span className="text-primary"> Imóveis</span>
        </span>
      </div>

      {/* stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {PASSOS.map((nome, i) => (
          <li key={nome} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < passo
                  ? "bg-primary text-primary-foreground"
                  : i === passo
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < passo ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={`hidden text-sm sm:block ${i === passo ? "font-medium" : "text-muted-foreground"}`}
            >
              {nome}
            </span>
            {i < PASSOS.length - 1 && (
              <span className={`h-px flex-1 ${i < passo ? "bg-primary" : "bg-border"}`} />
            )}
          </li>
        ))}
      </ol>

      {/* PASSO 1 — intenção */}
      {passo === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h1 className="text-3xl font-semibold tracking-tight">
            Boas-vindas, {primeiroNome}! 🎉
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Conta criada. O que te traz à Cadê hoje?
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => escolher("buscar")}
              className="group flex flex-col gap-3 rounded-2xl border bg-card p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Search className="size-7" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Quero encontrar um imóvel</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Busque casas, apartamentos e terrenos em Uberlândia e converse direto com quem anuncia.
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
                Começar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            <button
              onClick={() => escolher("anunciar")}
              className="group flex flex-col gap-3 rounded-2xl border bg-card p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Home className="size-7" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Quero anunciar um imóvel</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cadastre seu imóvel em minutos, receba interessados e negocie pela plataforma.
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
                Começar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* PASSO 2 — preferências (buscar) ou tipo (anunciar) */}
      {passo === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h1 className="text-2xl font-semibold tracking-tight">
            {intencao === "buscar" ? "O que você procura?" : "Sobre o seu imóvel"}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {intencao === "buscar"
              ? "Pode pular — é só pra já te mostrar o que faz sentido."
              : "Pra começar o anúncio com o pé direito."}
          </p>

          <div className="mt-6 flex flex-col gap-6">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="size-4 text-primary" /> Tipo de imóvel
              </p>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setTipo(tipo === t.v ? null : t.v)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      tipo === t.v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/40"
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {intencao === "buscar" && (
              <>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="size-4 text-primary" /> Bairro
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BAIRROS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBairro(bairro === b ? null : b)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          bairro === b
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/40"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Wallet className="size-4 text-primary" /> Faixa de preço
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FAIXAS.map((f) => (
                      <button
                        key={f.l}
                        onClick={() => setFaixa(faixa === f.max ? null : f.max)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          faixa === f.max
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/40"
                        }`}
                      >
                        {f.l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setPasso(0)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <button
              onClick={() => setPasso(2)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continuar <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3 — pronto */}
      {passo === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PartyPopper className="size-8" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Tudo pronto!</h1>
          <p className="mx-auto mt-2 max-w-md text-lg text-muted-foreground">
            {intencao === "anunciar"
              ? "Vamos cadastrar o seu primeiro imóvel agora."
              : "Separamos os imóveis com a sua cara. Bora ver?"}
          </p>
          <button
            onClick={finalizar}
            disabled={pending}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pending
              ? "Abrindo…"
              : intencao === "anunciar"
                ? "Anunciar meu imóvel"
                : "Ver imóveis"}
            <ArrowRight className="size-5" />
          </button>
          <div className="mt-4">
            <button
              onClick={() => setPasso(1)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Voltar
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
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
