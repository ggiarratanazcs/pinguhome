"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Pinguino } from "@/components/pinguino";
import { PinguinoDisegnato, type Look, type Posa } from "@/components/pinguini";

/** Mascotte scelte in Impostazioni: il pinguino originale con gli occhiali o uno della famiglia disegnata. */
export const MASCOTTE = [
  { id: "originale", nome: "L'originale" },
  { id: "occhiali", nome: "Occhiali da sole" },
  { id: "sciarpa", nome: "Sciarpa" },
  { id: "cuffie", nome: "Cuffie" },
  { id: "berretto", nome: "Berretto" },
  { id: "nudo", nome: "Al naturale" },
] as const;

export type IdMascotte = (typeof MASCOTTE)[number]["id"];

export function mascotteValida(m: string | null | undefined): IdMascotte {
  return (MASCOTTE.find((x) => x.id === m)?.id ?? "originale") as IdMascotte;
}

const ContestoMascotte = createContext<IdMascotte>("originale");

export function FornitoreMascotte({ mascotte, children }: { mascotte: string; children: ReactNode }) {
  return <ContestoMascotte.Provider value={mascotteValida(mascotte)}>{children}</ContestoMascotte.Provider>;
}

export function useMascotte() {
  return useContext(ContestoMascotte);
}

/** Look dei pinguini delle sezioni: segue la mascotte scelta (l'originale porta gli occhiali). */
function lookDa(m: IdMascotte): Look {
  return m === "originale" ? "occhiali" : m;
}

/** La mascotte in alto a sinistra (barra laterale e testata mobile). */
export function Mascotte({ className, scelta }: { className?: string; scelta?: IdMascotte }) {
  const dalContesto = useMascotte();
  const m = scelta ?? dalContesto;
  if (m === "originale") return <Pinguino className={className} alt="PinguHome" />;
  return <PinguinoDisegnato look={lookDa(m)} className={className} titolo="PinguHome" />;
}

/** Il pinguino di ogni sezione, che fa qualcosa di diverso. */
export function PinguinoSezione({ posa, className }: { posa: Posa; className?: string }) {
  const m = useMascotte();
  return <PinguinoDisegnato posa={posa} look={lookDa(m)} className={className} />;
}
