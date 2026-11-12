import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ScontrinoLetto } from "@/lib/tipi-scontrino";

export const maxDuration = 60;

const REPARTI = [
  "Frutta e verdura",
  "Pane e forno",
  "Carne e pesce",
  "Latticini e uova",
  "Dispensa",
  "Surgelati",
  "Bevande",
  "Casa e pulizia",
  "Cura persona",
  "Animali",
  "Altro",
];

function istruzioni(daComprare: string[]) {
  const lista = daComprare.length
    ? `\nLista delle cose da comprare: ${JSON.stringify(daComprare)}.\n- "in_lista": se l'articolo corrisponde a una voce di questa lista (anche con un nome diverso, es. "Banane" ↔ "banana"), scrivi la voce esattamente com'è nella lista; altrimenti null.`
    : `\n- "in_lista": sempre null.`;
  return `Leggi questo scontrino fiscale italiano (supermercato, negozio, farmacia...).
Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, con questa forma:
{"data":"AAAA-MM-GG o null","negozio":"nome del negozio o null","totale":numero o null,"prodotti":[{"nome":"...","quantita":numero,"unita":"pz|kg|g|l|ml|conf","prezzo":numero o null,"reparto":"...","in_lista":"... o null"}]}
Regole:
- "totale" è l'importo pagato (TOTALE / TOTALE COMPLESSIVO / IMPORTO PAGATO), in euro con il punto decimale.
- "data" è la data di emissione dello scontrino.
- In "prodotti" metti solo gli articoli acquistati: niente subtotali, totali, IVA, resto, contanti, carte, punti fedeltà, buoni, sacchetti.
- Se c'è uno sconto su un articolo, sottrailo dal suo prezzo invece di creare una riga a parte.
- "nome": il nome semplice e generico dell'articolo, come lo scriveresti nella lista della spesa, in italiano, con l'iniziale maiuscola, di 1-3 parole. Togli marche, negozio, formati e codici. Esempi: "BANANE CHIQUITA COOP X3" → "Banane"; "LATTE PS UHT GRANAROLO 1L" → "Latte"; "MOZZ.FIORDILATTE 125G" → "Mozzarella"; "DETERS.PIATTI LIMONE" → "Detersivo piatti"; "PETTO POLLO AIA" → "Petto di pollo".
- "quantita" e "unita": quanti pezzi o quanto peso. "x3" o "3 x 1,20" → quantita 3; "0,512 kg x 2,49 €/kg" → quantita 0.512, unita "kg". "prezzo" è il totale della riga.
- "reparto": uno solo tra ${JSON.stringify(REPARTI)}.${lista}
- Se un dato non si legge, usa null.`;
}

function estraiJson(testo: string) {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio === -1 || fine === -1) throw new Error("Risposta senza JSON");
  return JSON.parse(testo.slice(inizio, fine + 1));
}

function pulisci(grezzo: Record<string, unknown>, daComprare: string[]): ScontrinoLetto {
  const voce = (v: unknown) => (typeof v === "string" ? (daComprare.find((x) => x.toLowerCase() === v.trim().toLowerCase()) ?? null) : null);
  const reparto = (v: unknown) => (typeof v === "string" ? (REPARTI.find((x) => x.toLowerCase() === v.trim().toLowerCase()) ?? null) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() ? Number(v.replace(",", ".")) || null : null);
  const data = typeof grezzo.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(grezzo.data) ? grezzo.data : null;
  const prodotti = Array.isArray(grezzo.prodotti) ? grezzo.prodotti : [];
  return {
    data,
    negozio: typeof grezzo.negozio === "string" && grezzo.negozio.trim() ? grezzo.negozio.trim() : null,
    totale: num(grezzo.totale),
    prodotti: prodotti
      .map((p) => p as Record<string, unknown>)
      .filter((p) => typeof p.nome === "string" && p.nome.trim())
      .map((p) => ({
        nome: String(p.nome).trim(),
        quantita: num(p.quantita) ?? 1,
        unita: typeof p.unita === "string" && p.unita ? p.unita : "pz",
        prezzo: num(p.prezzo),
        reparto: reparto(p.reparto),
        in_lista: voce(p.in_lista),
      })),
  };
}

/**
 * Riceve la foto (già ridimensionata nel browser) e la fa leggere a Claude.
 * Solo per utenti collegati; la chiave API resta sul server (ANTHROPIC_API_KEY su Vercel).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ errore: "Non sei collegato." }, { status: 401 });

  const chiave = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/["'\s]/g, "");
  if (!chiave) {
    return NextResponse.json(
      { errore: "La lettura degli scontrini non è ancora attiva: manca la chiave ANTHROPIC_API_KEY su Vercel." },
      { status: 503 },
    );
  }

  let corpo: { immagine?: string; tipo?: string; lista?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: "Foto non valida." }, { status: 400 });
  }
  const immagine = corpo.immagine?.replace(/^data:[^;]+;base64,/, "");
  const tipo = corpo.tipo && ["image/jpeg", "image/png", "image/webp"].includes(corpo.tipo) ? corpo.tipo : "image/jpeg";
  if (!immagine) return NextResponse.json({ errore: "Foto mancante." }, { status: 400 });
  const daComprare = Array.isArray(corpo.lista)
    ? [...new Set(corpo.lista.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 200)
    : [];

  const risposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": chiave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: immagine } },
            { type: "text", text: istruzioni(daComprare) },
          ],
        },
      ],
    }),
  });

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => "");
    console.error("Lettura scontrino non riuscita", risposta.status, dettaglio.slice(0, 500));
    const messaggio =
      risposta.status === 401
        ? "La chiave ANTHROPIC_API_KEY non è valida."
        : risposta.status === 429
          ? "Troppe letture ravvicinate: riprova tra poco."
          : "Non sono riuscito a leggere lo scontrino. Riprova o inseriscilo a mano.";
    return NextResponse.json({ errore: messaggio }, { status: 502 });
  }

  try {
    const json = (await risposta.json()) as { content?: { type: string; text?: string }[] };
    const testo = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    return NextResponse.json(pulisci(estraiJson(testo), daComprare));
  } catch (e) {
    console.error("Risposta scontrino non leggibile", e);
    return NextResponse.json({ errore: "Non ho capito lo scontrino: prova con una foto più nitida e dritta." }, { status: 422 });
  }
}
