import type { Impegno } from "@/lib/database.types";

/* =====================================================================
   Date come stringhe AAAA-MM-GG, calcolate in UTC per non avere
   sorprese con l'ora legale.
   ===================================================================== */

export function aData(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function daData(s: string) {
  return new Date(`${s}T00:00:00Z`);
}
export function piuGiorni(s: string, n: number) {
  const d = daData(s);
  d.setUTCDate(d.getUTCDate() + n);
  return aData(d);
}
export function oggiRoma() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}
/** 0 = lunedì … 6 = domenica */
export function giornoSettimana(s: string) {
  return (daData(s).getUTCDay() + 6) % 7;
}
function giorniNelMese(anno: number, mese0: number) {
  return new Date(Date.UTC(anno, mese0 + 1, 0)).getUTCDate();
}

export const CATEGORIE = [
  { id: "appuntamento", nome: "Appuntamento", colore: "#3f6fd8" },
  { id: "casa", nome: "Casa", colore: "#23885a" },
  { id: "bolletta", nome: "Bolletta", colore: "#e08a2e" },
  { id: "viaggio", nome: "Viaggio", colore: "#7a5cc2" },
  { id: "altro", nome: "Altro", colore: "#737a99" },
] as const;

export const RICORRENZE = [
  { id: "nessuna", nome: "Una volta" },
  { id: "settimanale", nome: "Ogni settimana" },
  { id: "mensile", nome: "Ogni mese" },
  { id: "annuale", nome: "Ogni anno" },
] as const;

/** Giorni (tra da e a, inclusi) in cui cade l'impegno, ricorrenze comprese. */
export function occorrenze(imp: Pick<Impegno, "data" | "ricorrenza">, da: string, a: string): string[] {
  if (imp.ricorrenza === "nessuna") return imp.data >= da && imp.data <= a ? [imp.data] : [];
  const risultato: string[] = [];
  const inizio = daData(imp.data);
  const giorno = inizio.getUTCDate();
  if (imp.ricorrenza === "settimanale") {
    let d = imp.data;
    if (d < da) {
      const salti = Math.floor((daData(da).getTime() - inizio.getTime()) / (7 * 86_400_000));
      d = piuGiorni(imp.data, salti * 7);
    }
    for (; d <= a; d = piuGiorni(d, 7)) if (d >= da) risultato.push(d);
    return risultato;
  }
  // mensile e annuale: stesso giorno del mese (se il mese è più corto, l'ultimo giorno)
  const passoMesi = imp.ricorrenza === "mensile" ? 1 : 12;
  const fine = daData(a);
  for (let k = 0; ; k += passoMesi) {
    const anno = inizio.getUTCFullYear();
    const mese0 = inizio.getUTCMonth() + k;
    const primo = new Date(Date.UTC(anno, mese0, 1));
    if (primo > fine) break;
    const d = aData(new Date(Date.UTC(primo.getUTCFullYear(), primo.getUTCMonth(), Math.min(giorno, giorniNelMese(primo.getUTCFullYear(), primo.getUTCMonth())))));
    if (d >= da && d <= a) risultato.push(d);
  }
  return risultato;
}

/* =====================================================================
   Aggiunta veloce: "domani alle 18 dentista", "venerdì cena da Mara",
   "15/12 bollo auto", "ogni mese affitto il 5"
   ===================================================================== */

const GIORNI = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const PAROLE_CATEGORIA: [Impegno["categoria"], RegExp][] = [
  ["bolletta", /\b(bollett\w*|luce|gas|acqua|tari|bollo|affitto|rata|canone|assicurazion\w*|abbonament\w*)\b/i],
  ["appuntamento", /\b(dentista|medic\w*|visita|dottor\w*|parrucchier\w*|barbiere|veterinari\w*|commercialista|appuntament\w*|colloquio|riunione)\b/i],
  ["viaggio", /\b(volo|treno|aereo|viaggio|hotel|partenza|vacanza|traghetto)\b/i],
  ["casa", /\b(pulizi\w*|caldaia|idraulico|elettricista|condominio|lavatrice|spazzatura|rifiuti|bucato|giardino|trasloco|manutenzion\w*)\b/i],
];

function senzaAccenti(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export type ImpegnoInterpretato = {
  titolo: string;
  data: string;
  ora: string | null;
  ricorrenza: Impegno["ricorrenza"];
  categoria: Impegno["categoria"];
  dataTrovata: boolean;
};

export function interpretaImpegno(testo: string, oggi: string): ImpegnoInterpretato {
  let t = ` ${testo.trim().replace(/\s+/g, " ")} `;
  const norm = () => senzaAccenti(t.toLowerCase());
  let data: string | null = null;
  let ora: string | null = null;
  let ricorrenza: Impegno["ricorrenza"] = "nessuna";

  // Toglie dal testo il pezzo riconosciuto (stessa posizione nel testo normalizzato)
  const togli = (re: RegExp) => {
    const m = norm().match(re);
    if (!m || m.index === undefined) return null;
    t = `${t.slice(0, m.index)} ${t.slice(m.index + m[0].length)}`;
    return m;
  };

  // Ricorrenza
  if (togli(/\bogni settimana\b/)) ricorrenza = "settimanale";
  else if (togli(/\bogni mese\b/)) ricorrenza = "mensile";
  else if (togli(/\bogni anno\b/)) ricorrenza = "annuale";
  else {
    const m = norm().match(new RegExp(`\\bogni (${GIORNI.join("|")})\\b`));
    if (m) ricorrenza = "settimanale"; // il giorno lo prende il blocco sotto
    if (m) t = t.replace(/\bogni\s+/i, " ");
  }

  // Ora: "alle 18", "alle 18:30", "ore 9.15", "18:30"
  let m = togli(/\b(?:alle|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?\b/) ?? togli(/\b(\d{1,2})[:.](\d{2})\b/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (h < 24 && min < 60) ora = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  // Data
  if (togli(/\bdopodomani\b/)) data = piuGiorni(oggi, 2);
  else if (togli(/\bdomani\b/)) data = piuGiorni(oggi, 1);
  else if (togli(/\boggi\b/)) data = oggi;
  if (!data && (m = togli(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) {
    const g = Number(m[1]);
    const me = Number(m[2]) - 1;
    let anno = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(oggi.slice(0, 4));
    let d = aData(new Date(Date.UTC(anno, me, g)));
    if (!m[3] && d < oggi) d = aData(new Date(Date.UTC(++anno, me, g)));
    data = d;
  }
  if (!data && (m = togli(new RegExp(`\\b(?:il\\s+)?(\\d{1,2})\\s+(${MESI.join("|")})(?:\\s+(\\d{4}))?\\b`)))) {
    const g = Number(m[1]);
    const me = MESI.indexOf(m[2]);
    let anno = m[3] ? Number(m[3]) : Number(oggi.slice(0, 4));
    let d = aData(new Date(Date.UTC(anno, me, g)));
    if (!m[3] && d < oggi) d = aData(new Date(Date.UTC(++anno, me, g)));
    data = d;
  }
  if (!data && (m = togli(new RegExp(`\\b(?:(?:il|la)\\s+)?(?:prossim[oa]\\s+)?(${GIORNI.join("|")})(?:\\s+prossim[oa])?\\b`)))) {
    const obiettivo = GIORNI.indexOf(m[1]);
    let diff = (obiettivo - giornoSettimana(oggi) + 7) % 7;
    if (diff === 0) diff = 7;
    data = piuGiorni(oggi, diff);
  }
  if (!data && (m = togli(/\b(?:il|del)\s+(\d{1,2})\b/))) {
    // "il 5": prossimo giorno 5 (questo mese o il successivo)
    const g = Number(m[1]);
    const anno = Number(oggi.slice(0, 4));
    const me = Number(oggi.slice(5, 7)) - 1;
    let d = aData(new Date(Date.UTC(anno, me, g)));
    if (d < oggi) d = aData(new Date(Date.UTC(anno, me + 1, g)));
    data = d;
  }

  const titoloGrezzo = t
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:a|il|la|di|da|per)\s+/i, "")
    .trim();
  const titolo = titoloGrezzo.charAt(0).toUpperCase() + titoloGrezzo.slice(1);
  const categoria = PAROLE_CATEGORIA.find(([, re]) => re.test(senzaAccenti(titolo)))?.[0] ?? "altro";
  return { titolo, data: data ?? oggi, ora, ricorrenza, categoria, dataTrovata: data !== null };
}
