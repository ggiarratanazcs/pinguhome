/** Quello che Claude restituisce leggendo uno scontrino. */
export type ScontrinoLetto = {
  data: string | null;
  negozio: string | null;
  totale: number | null;
  prodotti: { nome: string; quantita: number; unita: string; prezzo: number | null }[];
};
