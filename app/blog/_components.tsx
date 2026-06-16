import Link from "next/link";
import type { ReactNode } from "react";
import { Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Post, formatarData } from "./_posts";

/**
 * Renderiza um parágrafo do artigo convertendo links markdown `[texto](/rota)`
 * em <Link> (interno) ou <a> (externo). Links internos são ouro pra SEO/GEO.
 */
export function TextoComLinks({ texto }: { texto: string }): ReactNode {
  const partes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const [, rotulo, href] = m;
    if (href.startsWith("/")) {
      partes.push(
        <Link key={i} href={href} className="font-medium text-primary underline underline-offset-2">
          {rotulo}
        </Link>,
      );
    } else {
      partes.push(
        <a key={i} href={href} className="font-medium text-primary underline underline-offset-2">
          {rotulo}
        </a>,
      );
    }
    ultimo = m.index + m[0].length;
    i++;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/** Linha de autor: avatar + nome (+ data + tempo de leitura opcional). */
export function LinhaAutor({
  post,
  detalhada = false,
  className,
}: {
  post: Post;
  detalhada?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src={post.autor.avatar}
        alt={post.autor.nome}
        loading="lazy"
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
      />
      <div className="min-w-0 text-sm leading-tight">
        <p className="font-medium text-foreground">{post.autor.nome}</p>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          {detalhada ? (
            <>
              <span>{formatarData(post.data)}</span>
              <span aria-hidden>·</span>
              <Clock className="size-3.5" />
              <span>{post.tempoLeitura} min de leitura</span>
            </>
          ) : (
            <>
              <span>{formatarData(post.data)}</span>
              <span aria-hidden>·</span>
              <span>{post.tempoLeitura} min</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Card vertical de post para a grade. */
export function CardPost({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5 hover:ring-foreground/15"
    >
      <div className="relative overflow-hidden">
        <img
          src={post.capa}
          alt={post.capaAlt}
          loading="lazy"
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge className="absolute top-3 left-3 shadow-sm">
          {post.categoria}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight text-balance transition-colors group-hover:text-primary">
          {post.titulo}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.resumo}
        </p>
        <div className="mt-auto pt-5">
          <LinhaAutor post={post} />
        </div>
      </div>
    </Link>
  );
}

/** Bloco visual de newsletter (formulário não funcional, apenas captura visual). */
export function BlocoNewsletter() {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-8 text-primary-foreground shadow-xl shadow-primary/20 md:p-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-foreground/15">
          <Mail className="size-6" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          Receba os melhores guias no seu e-mail
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-primary-foreground/85">
          Dicas práticas sobre o mercado de Uberlândia, sem spam. Só conteúdo
          que ajuda você a comprar, vender ou alugar melhor.
        </p>
        <form className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            placeholder="seu@email.com"
            aria-label="Seu e-mail"
            className="h-11 flex-1 border-transparent bg-primary-foreground text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="lg"
            className="h-11 bg-foreground text-background hover:bg-foreground/90"
          >
            Quero receber
          </Button>
        </form>
        <p className="mt-3 text-xs text-primary-foreground/70">
          Você pode cancelar quando quiser.
        </p>
      </div>
    </div>
  );
}
