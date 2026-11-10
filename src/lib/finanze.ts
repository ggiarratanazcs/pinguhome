import type { Conto, Movimento } from "@/lib/database.types";
import { occorrenze } from "@/lib/agenda";

export type Categoria = { id: string; nome: string; colore: string };

export const CATEGORIE_USCITA: Categoria[] = [
  { id: "casa", nome: "Casa", colore: "#5a8fe6" },
  { id: "spesa", nome: "Spesa", colore: "#f0a03c" },
  { id: "bollette", nome: "Bollette", colore: "#2bb3a6" },
  { id: "trasporti", nome: "Trasporti", colore: "#8a8f99" },
  { id: "salute", nome: "Salute", colore: "#e0625a" },
  { id: "svago", nome: "Svago", colore: "#8e7cc3" },
  { id: "animali", nome: "Animali", colore: "#b07a4a" },
  { id: "regali", nome: "Regali", colore: "#e88bb0" },
  { id: "altro", nome: "Altro", colore: "#c3c7d1" },
];

export const CATEGORIE_ENTRATA: Categoria[] = [
  { id: "stipendio", nome: "Stipendio", colore: "#3fa36a" },
  { id: "altro", nome: "Altro", colore: "#9fd9a8" },
];

export function categoria(tipo: Movimento["tipo"], id: string): Categoria {
  const elenco = tipo === "entrata" ? CATEGORIE_ENTRATA : CATEGORIE_USCITA;
  return elenco.find((c) => c.id === id) ?? elenco[elenco.length - 1];
}

const PAROLE: [RegExp, string][] = [
  [/\b(affitto|mutuo|condominio|mobili|ikea|riparazion\w*|idraulico)\b/i, "casa"],
  [/\b(spesa|supermercato|coop|esselunga|conad|lidl|pam|carrefour|mercato)\b/i, "spesa"],
  [/\b(luce|gas|acqua|bollett\w*|internet|wifi|telefono|tari|enel)\b/i, "bollette"],
  [/\b(benzina|auto|treno|bus|autobus|taxi|uber|bollo|assicurazione|parcheggio|aereo|volo)\b/i, "trasporti"],
  [/\b(farmacia|medico|dentista|visita|analisi|ottico)\b/i, "salute"],
  [/\b(cena|pranzo|ristorante|pizza|aperitivo|bar|caff[eè]|cinema|concerto|vacanz\w*|hotel|viaggio)\b/i, "svago"],
  [/\b(veterinario|crocchette|kiki|cane|gatto|toelettatura)\b/i, "animali"],
  [/\b(regalo|regali|compleanno)\b/i, "regali"],
];

/** "cena 45", "stipendio 1500", "benzina 60,50" → tipo, importo, categoria, descrizione */
export function interpretaMovimento(testo: string) {
  const t = testo.trim();
  const numero = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro)?/i);
  const importo = numero ? Number(numero[1].replace(",", ".")) : null;
  const descrizione = (numero ? t.replace(numero[0], " ") : t).replace(/€|euro/gi, " ").replace(/\s+/g, " ").trim();
  const entrata = /\b(stipendio|entrata|rimborso|bonus|regalo ricevuto|incasso)\b/i.test(t);
  const cat = entrata
    ? /\bstipendio\b/i.test(t)
      ? "stipendio"
      : "altro"
    : (PAROLE.find(([re]) => re.test(t))?.[1] ?? "altro");
  return { tipo: (entrata ? "entrata" : "uscita") as Movimento["tipo"], importo, categoria: cat, descrizione: descrizione ? descrizione.charAt(0).toUpperCase() + descrizione.slice(1) : "" };
}

export type Occorrenza = { movimento: Movimento; data: string };

/** I movimenti tra due date, con quelli che si ripetono moltiplicati per ogni volta. */
export function movimentiTra(movimenti: Movimento[], da: string, a: string): Occorrenza[] {
  return movimenti
    .flatMap((m) => occorrenze(m, da, a).map((d) => ({ movimento: m, data: d })))
    .sort((x, y) => y.data.localeCompare(x.data) || y.movimento.creato_il.localeCompare(x.movimento.creato_il));
}

export function segno(m: Movimento) {
  return m.tipo === "entrata" ? Number(m.importo) : -Number(m.importo);
}

/** Saldo di partenza + tutto quello che è entrato e uscito dopo quel giorno, fino a oggi. */
export function residuo(conto: Conto | null, movimenti: Movimento[], oggi: string) {
  if (!conto) return null;
  const dopo = movimentiTra(movimenti, conto.data_saldo, oggi).filter((o) => o.data > conto.data_saldo);
  return Number(conto.saldo) + dopo.reduce((t, o) => t + segno(o.movimento), 0);
}

export function euro(n: number, decimali = true) {
  return n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimali ? 2 : 0,
    maximumFractionDigits: decimali ? 2 : 0,
    useGrouping: "always",
  } as Intl.NumberFormatOptions);
}
