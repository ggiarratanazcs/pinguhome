import type { Conto, Impegno, ImpegnoFatto, Movimento } from "@/lib/database.types";
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

/**
 * Proiezione a fine mese: il residuo di oggi più i movimenti già previsti da domani a fine mese
 * (anche quelli che si ripetono) e le scadenze dell'Agenda con un importo, non ancora pagate, da oggi a fine mese.
 */
export function proiezioneFineMese(
  attuale: number | null,
  movimenti: Movimento[],
  scadenze: Pick<Impegno, "id" | "data" | "ricorrenza" | "importo">[],
  pagate: Pick<ImpegnoFatto, "impegno_id" | "data">[],
  oggi: string,
) {
  if (attuale === null) return null;
  const [a, m] = oggi.split("-").map(Number);
  const fine = `${oggi.slice(0, 7)}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
  const futuri = movimentiTra(movimenti, oggi, fine).filter((o) => o.data > oggi);
  const fatte = new Set(pagate.map((p) => `${p.impegno_id}|${p.data}`));
  const daPagare = scadenze.flatMap((i) =>
    Number(i.importo) > 0 ? occorrenze(i, oggi, fine).filter((d) => !fatte.has(`${i.id}|${d}`)).map(() => Number(i.importo)) : [],
  );
  const entrate = futuri.filter((o) => o.movimento.tipo === "entrata").reduce((t, o) => t + Number(o.movimento.importo), 0);
  const uscite = futuri.filter((o) => o.movimento.tipo === "uscita").reduce((t, o) => t + Number(o.movimento.importo), 0) + daPagare.reduce((t, n) => t + n, 0);
  return { totale: attuale + entrate - uscite, entrate, uscite };
}

export type InArrivo = { chiave: string; nome: string; data: string; importo: number; categoria: string; daAgenda: boolean };

/**
 * Le uscite in arrivo nei prossimi giorni: le scadenze dell'Agenda con un importo non ancora pagate
 * e le uscite già previste sul conto (anche quelle che si ripetono).
 */
export function usciteInArrivo(
  movimenti: Movimento[],
  scadenze: Pick<Impegno, "id" | "data" | "ricorrenza" | "importo" | "titolo">[],
  pagate: Pick<ImpegnoFatto, "impegno_id" | "data">[],
  oggi: string,
  giorni = 30,
): InArrivo[] {
  const [a, m, g] = oggi.split("-").map(Number);
  const fineData = new Date(a, m - 1, g + giorni);
  const fine = `${fineData.getFullYear()}-${String(fineData.getMonth() + 1).padStart(2, "0")}-${String(fineData.getDate()).padStart(2, "0")}`;
  const fatte = new Set(pagate.map((p) => `${p.impegno_id}|${p.data}`));
  const daAgenda = scadenze.flatMap((i) =>
    Number(i.importo) > 0
      ? occorrenze(i, oggi, fine)
          .filter((d) => !fatte.has(`${i.id}|${d}`))
          .map((d) => ({ chiave: `a-${i.id}-${d}`, nome: i.titolo, data: d, importo: Number(i.importo), categoria: interpretaMovimento(i.titolo).categoria, daAgenda: true }))
      : [],
  );
  const dalConto = movimentiTra(movimenti, oggi, fine)
    .filter((o) => o.movimento.tipo === "uscita" && o.data > oggi)
    .map((o) => ({ chiave: `m-${o.movimento.id}-${o.data}`, nome: o.movimento.descrizione || categoria("uscita", o.movimento.categoria).nome, data: o.data, importo: Number(o.movimento.importo), categoria: o.movimento.categoria, daAgenda: false }));
  return [...daAgenda, ...dalConto].sort((x, y) => x.data.localeCompare(y.data) || y.importo - x.importo);
}

/* Cifre nascoste: una scelta per dispositivo, ricordata nel browser */
const CHIAVE_NASCOSTE = "uchi:cifre-nascoste";
const ascoltatori = new Set<() => void>();
export function leggiNascoste() {
  try {
    return localStorage.getItem(CHIAVE_NASCOSTE) === "1";
  } catch {
    return false;
  }
}
export function impostaNascoste(v: boolean) {
  try {
    localStorage.setItem(CHIAVE_NASCOSTE, v ? "1" : "0");
  } catch {}
  ascoltatori.forEach((f) => f());
}
export function ascoltaNascoste(f: () => void) {
  ascoltatori.add(f);
  return () => {
    ascoltatori.delete(f);
  };
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
