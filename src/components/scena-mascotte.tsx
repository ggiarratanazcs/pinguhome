"use client";

import type { CSSProperties } from "react";
import { Mascotte, useMascotte } from "@/components/mascotte";
import { cn } from "@/lib/utils";

/**
 * Illustrazioni con la mascotte seduta sopra (frigo, freezer, dispensa, bagno, ripostiglio, lavanderia, carrello).
 * Con il pinguino originale si usa il disegno completo; con una mascotte personale
 * si usa l'oggetto senza pinguino e ci si appoggia sopra la mascotte scelta.
 */
type Scena = {
  /** Disegno completo con il pinguino originale; se manca, il pinguino si appoggia sopra come le altre mascotte */
  conPinguino: string | null;
  rapportoConPinguino: number; // larghezza / altezza
  vuota: string;
  rapportoVuota: number;
  x: number; // centro della mascotte, in frazione della larghezza
  y: number; // dove poggia, in frazione dell'altezza dell'oggetto (dall'alto)
  m: number; // larghezza della mascotte, in frazione della larghezza dell'oggetto
};

/** Il pinguino originale da solo, per le scene disegnate senza */
const PINGUINO_SEDUTO = "/casa/pinguino-seduto.webp";

export const SCENE = {
  frigo: { conPinguino: "/casa/frigo.webp", rapportoConPinguino: 433 / 640, vuota: "/casa/frigo-vuoto.webp", rapportoVuota: 433 / 410, x: 0.52, y: 0.07, m: 0.56 },
  freezer: { conPinguino: "/casa/freezer.webp", rapportoConPinguino: 480 / 640, vuota: "/casa/freezer-vuoto.webp", rapportoVuota: 480 / 640, x: 0.47, y: 0.37, m: 0.5 },
  dispensa: { conPinguino: "/casa/dispensa.webp", rapportoConPinguino: 480 / 640, vuota: "/casa/dispensa-vuoto.webp", rapportoVuota: 480 / 640, x: 0.4, y: 0.39, m: 0.48 },
  bagno: { conPinguino: null, rapportoConPinguino: 1, vuota: "/casa/bagno-vuoto.webp", rapportoVuota: 481 / 640, x: 0.63, y: 0.13, m: 0.5 },
  ripostiglio: { conPinguino: null, rapportoConPinguino: 1, vuota: "/casa/ripostiglio-vuoto.webp", rapportoVuota: 392 / 640, x: 0.4, y: 0.05, m: 0.66 },
  lavanderia: { conPinguino: null, rapportoConPinguino: 1, vuota: "/casa/lavanderia-vuoto.webp", rapportoVuota: 666 / 640, x: 0.81, y: 0.66, m: 0.27 },
  carrello: { conPinguino: "/casa/carrello.webp", rapportoConPinguino: 414 / 640, vuota: "/casa/carrello-vuoto.webp", rapportoVuota: 413 / 494, x: 0.72, y: 0.06, m: 0.5 },
} satisfies Record<string, Scena>;

export type NomeScena = keyof typeof SCENE;

/** Proporzioni (larghezza / altezza) dell'illustrazione, utili a chi la impagina. */
export function useRapportoScena(nome: NomeScena) {
  const { tipo } = useMascotte();
  const s: Scena = SCENE[nome];
  if (tipo === "originale" && s.conPinguino) return s.rapportoConPinguino;
  // La mascotte può sporgere sopra l'oggetto: l'altezza totale la comprende
  const altezzaOggetto = 1 / s.rapportoVuota;
  const sporgenza = Math.max(0, s.m - s.y * altezzaOggetto);
  return 1 / (altezzaOggetto + sporgenza);
}

/** Riempie il contenitore (che deve avere le proporzioni date da useRapportoScena). */
export function IllustrazioneScena({ nome, className, ombra = true }: { nome: NomeScena; className?: string; ombra?: boolean }) {
  const { tipo } = useMascotte();
  const s: Scena = SCENE[nome];
  const stileOmbra = ombra ? "drop-shadow-[0_12px_16px_rgba(var(--ombra),0.18)]" : "";

  if (tipo === "originale" && s.conPinguino) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={s.conPinguino} alt="" draggable={false} className={cn("absolute inset-0 size-full select-none object-contain", stileOmbra, className)} />;
  }

  const altezzaOggetto = 1 / s.rapportoVuota;
  const sporgenza = Math.max(0, s.m - s.y * altezzaOggetto);
  const totale = altezzaOggetto + sporgenza;
  const oggetto: CSSProperties = { height: `${(altezzaOggetto / totale) * 100}%` };
  const mascotte: CSSProperties = {
    width: `${s.m * 100}%`,
    left: `${(s.x - s.m / 2) * 100}%`,
    bottom: `${(((1 - s.y) * altezzaOggetto) / totale) * 100}%`,
  };

  return (
    <span className={cn("absolute inset-0 block", stileOmbra, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.vuota} alt="" draggable={false} className="absolute inset-x-0 bottom-0 w-full select-none object-contain" style={oggetto} />
      <span className="absolute flex aspect-square items-end justify-center" style={mascotte}>
        {tipo === "originale" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={PINGUINO_SEDUTO} alt="" draggable={false} className="max-h-full w-full select-none object-contain object-bottom" />
        ) : (
          <Mascotte className="max-h-full w-full object-contain object-bottom" />
        )}
      </span>
    </span>
  );
}
