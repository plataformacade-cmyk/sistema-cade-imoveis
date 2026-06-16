"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal on scroll (padrão "front-end com taste" do vault): entra uma vez,
 * stagger via `delay`. Respeita prefers-reduced-motion — com ele ligado,
 * renderiza tudo visível (sem animação de entrada), como manda a a11y.
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
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
