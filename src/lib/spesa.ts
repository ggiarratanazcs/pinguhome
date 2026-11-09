import type { Reparto } from "@/lib/database.types";

export const UNITA = ["pz", "kg", "g", "l", "ml", "conf"] as const;

const ALIAS_UNITA: Record<string, string> = {
  pz: "pz", pezzi: "pz", pezzo: "pz", x: "pz",
  kg: "kg", chili: "kg", chilo: "kg", kili: "kg",
  g: "g", gr: "g", grammi: "g", etti: "hg", etto: "hg", hg: "hg",
  l: "l", lt: "l", litri: "l", litro: "l",
  ml: "ml", cl: "cl",
  conf: "conf", confezioni: "conf", confezione: "conf", pacchi: "conf", pacco: "conf", bottiglie: "conf", bottiglia: "conf",
};

export type VoceInterpretata = { nome: string; quantita: number; unita: string | null };

function numero(s: string) {
  return Number(s.replace(",", "."));
}

/**
 * Interpreta quello che si scrive nella barra di aggiunta:
 * "2 kg mele", "mele 2kg", "latte x3", "3 yogurt", "pane".
 */
export function interpretaVoce(testo: string): VoceInterpretata {
  let t = testo.trim().replace(/\s+/g, " ");
  if (!t) return { nome: "", quantita: 1, unita: null };

  const unitaRe = Object.keys(ALIAS_UNITA).sort((a, b) => b.length - a.length).join("|");

  // In testa: "2 kg mele", "2kg mele", "3 mele"
  let m = t.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitaRe})?\\.?\\s+(?:di\\s+)?(.+)$`, "i"));
  if (m) {
    const u = m[2] ? ALIAS_UNITA[m[2].toLowerCase()] : null;
    return { nome: maiuscola(m[3]), quantita: numero(m[1]), unita: u };
  }
  // In coda: "mele 2 kg", "latte x3", "uova 6"
  m = t.match(new RegExp(`^(.+?)\\s+(?:x\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(${unitaRe})?\\.?$`, "i"));
  if (m) {
    const u = m[3] ? ALIAS_UNITA[m[3].toLowerCase()] : null;
    return { nome: maiuscola(m[1]), quantita: numero(m[2]), unita: u };
  }
  t = t.replace(/^(un|una|uno|del|della|dei|degli|delle)\s+/i, "");
  return { nome: maiuscola(t), quantita: 1, unita: null };
}

function maiuscola(s: string) {
  const p = s.trim();
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Parole chiave per indovinare il reparto di un prodotto nuovo. */
const PAROLE_REPARTO: [string, string[]][] = [
  ["Frutta e verdura", ["mel", "pera", "pere", "banan", "aranc", "limon", "fragol", "uva", "kiwi", "pesc", "albicocc", "ciliegi", "anguri", "melone", "insalat", "lattug", "rucol", "spinac", "pomodor", "zucchin", "melanzan", "peperon", "carot", "patat", "cipoll", "aglio", "basilic", "prezzemol", "finocch", "broccol", "cavol", "funghi", "avocado", "zenzer", "verdur", "frutta", "mandarin", "clementin", "sedano"]],
  ["Pane e forno", ["pane", "panin", "focacc", "cracker", "grissin", "fette biscottate", "piadin", "cornett", "brioche", "taralli", "friselle"]],
  ["Carne e pesce", ["pollo", "tacchin", "manzo", "vitell", "maial", "salsicc", "macinat", "bistecc", "hamburger", "prosciutt", "salame", "mortadell", "bresaol", "speck", "pesce", "salmon", "tonno fresco", "merluzz", "orata", "branzin", "gamber", "cozze", "vongol", "calamar", "polpo", "wurstel"]],
  ["Latticini e uova", ["latte", "yogurt", "burro", "panna", "formagg", "mozzarell", "parmigian", "grana", "ricott", "stracchin", "pecorin", "scamorz", "uova", "uovo", "kefir", "mascarpone"]],
  ["Surgelati", ["surgel", "gelat", "piselli", "bastoncini", "minestrone", "ghiacci"]],
  ["Bevande", ["acqua", "vino", "birra", "succo", "aranciata", "cola", "tè", "the ", "tisana", "caffè", "caffe", "spremuta", "bibita", "prosecco", "spumante"]],
  ["Casa e pulizia", ["detersiv", "sapone piatti", "pastiglie", "lavastovigl", "ammorbident", "candeggin", "sgrassator", "spugn", "carta igienica", "scottex", "carta cucina", "sacchetti", "sacchi", "pellicol", "alluminio", "anticalcare", "pile", "lampadin", "tovagliol"]],
  ["Cura persona", ["shampoo", "balsamo", "bagnoschiuma", "docciaschiuma", "dentifric", "spazzolin", "deodorant", "rasoi", "crema", "cotton", "assorbent", "sapone mani", "struccant", "filo interdentale"]],
  ["Animali", ["crocchett", "croccantin", "scatolett", "lettiera", "cane", "gatto", "snack cane", "kiki"]],
  ["Dispensa", ["pasta", "spaghett", "penne", "riso", "farina", "zucchero", "sale", "olio", "aceto", "passata", "pelati", "legum", "ceci", "lenticch", "fagiol", "tonno", "biscott", "cereali", "fette", "marmellat", "miele", "nutella", "caffè macinato", "cialde", "capsule", "orzo", "farro", "couscous", "sugo", "pesto", "maionese", "ketchup", "spezie", "dado", "brodo", "cioccolat", "lievito"]],
];

export function indovinaReparto(nome: string, reparti: Reparto[]): string | null {
  const n = ` ${nome.toLowerCase()}`;
  for (const [reparto, parole] of PAROLE_REPARTO) {
    if (parole.some((p) => n.includes(` ${p}`) || n.includes(p))) {
      const r = reparti.find((x) => x.nome === reparto);
      if (r) return r.id;
    }
  }
  return reparti.find((x) => x.nome === "Altro")?.id ?? null;
}

export const POSIZIONI = [
  { id: "frigo", nome: "Frigo" },
  { id: "freezer", nome: "Freezer" },
  { id: "dispensa", nome: "Dispensa" },
] as const;

export function posizioneDaReparto(nomeReparto: string | undefined) {
  if (!nomeReparto) return "dispensa";
  if (["Latticini e uova", "Carne e pesce"].includes(nomeReparto)) return "frigo";
  if (nomeReparto === "Surgelati") return "freezer";
  return "dispensa";
}
