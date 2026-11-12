import type { ProdottoSpesa } from "@/lib/database.types";

/** Quello che Claude restituisce leggendo uno scontrino. */
export type ScontrinoLetto = {
  data: string | null;
  negozio: string | null;
  totale: number | null;
  prodotti: (ProdottoSpesa & { prezzo: number | null })[];
};
