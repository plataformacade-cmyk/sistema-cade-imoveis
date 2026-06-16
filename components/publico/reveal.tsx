"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal on scroll (padrão "front-end com taste" do vault): entra uma vez ao
 * aparecer na tela, com fade + subida suave; stagger via `delay`.
 *
 * NÃO usa useReducedMotion de propósito (descoberta da casa, Via Bella):
 * muito Windows roda com "efeitos de animação" desligados sem o dono saber
 * — o do próprio João estava — e o site inteiro pipocava sem vida. O reveal
 * é um fade curto (sem movimento contínuo, sem risco vestibular), então fica
 * ligado. Movimento CONTÍNUO (Ken Burns/float) é o que se desliga no CSS.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
