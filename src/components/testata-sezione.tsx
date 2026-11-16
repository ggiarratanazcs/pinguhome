"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Testata delle sezioni su PC: titolo grande, le schede della sezione come pillole
 * e a destra le azioni (cerca, aggiungi…). Su telefono non si vede.
 */
export function TestataSezione<T extends string>({
  titolo,
  schede,
  attiva,
  onScheda,
  children,
  className,
  giro,
}: {
  titolo: string;
  schede?: { id: T; nome: string }[];
  attiva?: T;
  onScheda?: (id: T) => void;
  children?: ReactNode;
  className?: string;
  /** Segnaposto per il giro guidato */
  giro?: string;
}) {
  return (
    <header className={cn("hidden items-center gap-6 pb-7 lg:flex", className)}>
      <h1 className="titolo text-[2rem]">{titolo}</h1>
      {schede?.length ? (
        <nav data-giro={giro} className="flex items-center gap-1 rounded-full bg-superficie-2 p-1 ring-1 ring-linea">
          {schede.map((s) => {
            const on = s.id === attiva;
            return (
              <button
                key={s.id}
                onClick={() => onScheda?.(s.id)}
                aria-pressed={on}
                className={cn(
                  "anello-focus relative h-9 rounded-full px-4 text-[0.875rem] transition-colors",
                  on ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro",
                )}
              >
                {on ? (
                  <motion.span
                    layoutId={`scheda-${titolo}`}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className="absolute inset-0 rounded-full bg-superficie shadow-[0_1px_3px_rgba(var(--ombra),0.14)]"
                  />
                ) : null}
                <span className="relative">{s.nome}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>
  );
}

/** Contenitore delle sezioni: stretto su telefono, largo e arioso su PC. */
export const CONTENITORE = "mx-auto w-full max-w-[1120px] px-5 pt-1 md:px-12 lg:max-w-[1480px] lg:px-10 lg:pt-8";
