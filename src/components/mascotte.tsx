"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Pinguino } from "@/components/pinguino";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

/**
 * Mascotte di ciascun profilo: il pinguino originale con gli occhiali,
 * oppure un'immagine caricata dalla persona (Impostazioni → Mascotte).
 */
export type SceltaMascotte = { tipo: "originale" | "personale"; percorso: string | null };

export function urlMascotte(percorso: string | null) {
  return percorso ? `${SUPABASE_URL}/storage/v1/object/public/mascotte/${percorso}` : null;
}

const ContestoMascotte = createContext<SceltaMascotte>({ tipo: "originale", percorso: null });

export function FornitoreMascotte({ tipo, percorso, children }: { tipo: string; percorso: string | null; children: ReactNode }) {
  const valore: SceltaMascotte = { tipo: tipo === "personale" && percorso ? "personale" : "originale", percorso };
  return <ContestoMascotte.Provider value={valore}>{children}</ContestoMascotte.Provider>;
}

export function useMascotte() {
  return useContext(ContestoMascotte);
}

/** La mascotte scelta: in alto a sinistra e nelle pagine vuote. */
export function Mascotte({ className, scelta }: { className?: string; scelta?: SceltaMascotte }) {
  const dalContesto = useMascotte();
  const m = scelta ?? dalContesto;
  const url = m.tipo === "personale" ? urlMascotte(m.percorso) : null;
  if (!url) return <Pinguino className={className} alt="PinguHome" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="La tua mascotte" draggable={false} className={cn("h-auto shrink-0 select-none object-contain", className)} />;
}
