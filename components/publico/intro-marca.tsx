"use client";

// Intro de marca na entrada: cortina branca com "Cadê Imóveis" letra a letra
// + a tag "onde você vai achar o lugar certo", que sobe e revela o site.
// Padrão endurecido da casa (Via Bella):
// - <script> inline decide ANTES do primeiro paint que a intro roda (marca
//   html.intro-roda + html.intro-ativa). Sem a classe o CSS esconde a cortina
//   e a cascata .entra anima na hora.
// - FAILSAFE independente de React: o próprio script agenda a remoção da
//   classe — se a hidratação falhar, a página NUNCA fica presa em branco.
// - Os tempos moram só no CSS; o React só ouve animationstart/animationend
//   da cortina pra soltar a cascata do hero e desmontar o overlay.
// A intro roda em TODO carregamento (pedido do João) e NÃO pula com
// prefers-reduced-motion (é um fade curto de marca; metade dos Windows
// "otimizados" liga essa flag sem o dono saber — caso do próprio João).

import { useEffect, useState, type AnimationEvent, type CSSProperties } from "react";

// "Cadê Imóveis" letra a letra (" " = espaço que não colapsa).
const LETRAS: { ch: string; marca?: boolean }[] = [
  { ch: "C" }, { ch: "a" }, { ch: "d" }, { ch: "ê" }, { ch: " " },
  { ch: "I", marca: true }, { ch: "m", marca: true }, { ch: "ó", marca: true },
  { ch: "v", marca: true }, { ch: "e", marca: true }, { ch: "i", marca: true },
  { ch: "s", marca: true },
];

const SCRIPT_INTRO = `
(function () {
  var html = document.documentElement;
  html.classList.add("intro-roda", "intro-ativa");
  // Failsafe: solta a página mesmo se o React nunca hidratar.
  setTimeout(function () { html.classList.remove("intro-ativa"); }, 3600);
})();
`;

export function IntroMarca() {
  const [viva, setViva] = useState(true);

  useEffect(() => {
    // Script decidiu não rodar a intro? Desmonta o overlay ocioso.
    if (!document.documentElement.classList.contains("intro-roda")) {
      setViva(false);
    }
    // Cinto de segurança na desmontagem (navegação no meio da intro).
    return () => {
      document.documentElement.classList.remove("intro-ativa", "intro-roda");
    };
  }, []);

  const aoComecarSubir = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "intro-cortina") {
      document.documentElement.classList.remove("intro-ativa");
    }
  };
  const aoTerminarSubir = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "intro-cortina") {
      document.documentElement.classList.remove("intro-roda");
      setViva(false);
    }
  };

  if (!viva) return null;

  return (
    <>
      {/* Roda no parse do HTML, antes do primeiro paint. */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_INTRO }} />
      <div
        className="intro-marca"
        aria-hidden
        onAnimationStart={aoComecarSubir}
        onAnimationEnd={aoTerminarSubir}
      >
        <div className="w-full px-4 text-center">
          <div className="intro-nome text-foreground">
            {LETRAS.map((l, i) => (
              <span
                key={i}
                className={"intro-letra" + (l.marca ? " intro-letra-marca" : "")}
                style={{ "--i": i } as CSSProperties}
              >
                {l.ch}
              </span>
            ))}
          </div>
          <div className="intro-tag">onde você vai achar o lugar certo</div>
        </div>
      </div>
    </>
  );
}
