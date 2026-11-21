import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registraErrore, registraLettura } from "@/lib/eventi-server";

export const maxDuration = 60;

type Riga = { id: string; nome: string; quantita: number; unita: string; posizione: string };

function istruzioni(posti: { id: string; nome: string }[], righe: Riga[], nota: string) {
  return `Sei l'assistente di casa. Qualcuno ha detto a voce cosa c'è in casa: aggiorna l'inventario.

Posti della casa (usa solo questi id): ${posti.map((p) => `${p.id} (${p.nome})`).join(", ")}
Unità ammesse: pz, kg, g, l, ml, conf

Inventario attuale (id | nome | quantità | unità | posto):
${righe.length ? righe.map((r) => `${r.id} | ${r.nome} | ${r.quantita} | ${r.unita} | ${r.posizione}`).join("\n") : "(vuoto)"}

Nota detta a voce (trascritta in automatico, può contenere piccoli errori):
"""${nota}"""

Rispondi SOLO con un JSON, senza altro testo:
{"modifiche":[{"azione":"nuovo|cambia|finito","id":"id della riga esistente o null","nome":"...","quantita":0,"unita":"pz","posizione":"id del posto"}]}

Regole:
- "nuovo": una cosa che non è nell'inventario. id null.
- "cambia": una cosa già nell'inventario con una quantità diversa da quella detta. Usa il suo id e la NUOVA quantità totale.
- "finito": una cosa dell'inventario che è finita o non c'è più. Usa il suo id, quantita 0.
- Se una cosa è nell'inventario ed è detta con la stessa quantità, non metterla.
- Le cose dell'inventario che la nota non nomina NON vanno toccate.
- Se il posto non è detto, scegli quello più sensato (latte e carne in frigo, surgelati in freezer, pasta e caffè in dispensa, detersivi in lavanderia, shampoo in bagno), sempre tra i posti della casa.
- "mezzo chilo" = 500 g, "un litro" = 1 l, "tre pacchi" = 3 conf o 3 pz. Se la quantità non è detta per una cosa nuova, 1 pz.
- "sta finendo" o "quasi finito" NON vuol dire finito: in quel caso non cambiare la quantità.
- Nomi semplici in italiano, iniziale maiuscola, senza marca: "Latte", "Petto di pollo", "Detersivo piatti".
- Correggi gli errori evidenti della trascrizione.
- Se la nota non parla di cose di casa, rispondi {"modifiche":[]}.`;
}

function estraiJson(testo: string) {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio === -1 || fine === -1) throw new Error("Risposta senza JSON");
  return JSON.parse(testo.slice(inizio, fine + 1)) as { modifiche?: unknown };
}

const UNITA = ["pz", "kg", "g", "l", "ml", "conf"];

/** Capisce una nota a voce sull'inventario di casa e propone le modifiche (che poi vanno confermate). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ errore: "Non sei collegato." }, { status: 401 });
  const { data: puo } = await supabase.rpc("puo_usare_claude");
  if (!puo) return NextResponse.json({ errore: "L'assistente è disponibile solo per chi fa parte di una casa." }, { status: 403 });

  const chiave = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/["'\s]/g, "");
  if (!chiave) return NextResponse.json({ errore: "L'assistente non è attivo: manca la chiave ANTHROPIC_API_KEY su Vercel." }, { status: 503 });

  let corpo: { nota?: string; posti?: { id: string; nome: string }[]; righe?: Riga[] };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }
  const nota = (corpo.nota ?? "").trim().slice(0, 4000);
  const posti = (corpo.posti ?? []).slice(0, 10);
  const righe = (corpo.righe ?? []).slice(0, 400);
  if (!nota || !posti.length) return NextResponse.json({ errore: "Non ho sentito niente." }, { status: 400 });

  const risposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chiave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: istruzioni(posti, righe, nota) }],
    }),
  });

  if (!risposta.ok) {
    await registraErrore(supabase, "inventario", `Claude ha risposto ${risposta.status}`);
    return NextResponse.json({ errore: risposta.status === 429 ? "Troppe richieste ravvicinate: riprova tra poco." : "Non sono riuscito a capire la nota." }, { status: 502 });
  }

  try {
    const json = (await risposta.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    await registraLettura(supabase, "inventario", json.usage);
    const grezzo = estraiJson((json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"));
    const idPosti = new Set(posti.map((p) => p.id));
    const perId = new Map(righe.map((r) => [r.id, r]));
    const modifiche = (Array.isArray(grezzo.modifiche) ? grezzo.modifiche : [])
      .map((m: Record<string, unknown>) => {
        const azione = m.azione === "nuovo" || m.azione === "cambia" || m.azione === "finito" ? m.azione : null;
        const esistente = typeof m.id === "string" ? perId.get(m.id) : undefined;
        const nome = typeof m.nome === "string" ? m.nome.trim().slice(0, 60) : esistente?.nome ?? "";
        const quantita = Math.max(0, Math.round(Number(m.quantita ?? 0) * 100) / 100);
        const unita = typeof m.unita === "string" && UNITA.includes(m.unita) ? m.unita : esistente?.unita ?? "pz";
        const posizione = typeof m.posizione === "string" && idPosti.has(m.posizione) ? m.posizione : esistente?.posizione ?? posti[0].id;
        if (!azione || !nome) return null;
        if (azione !== "nuovo" && !esistente) return { azione: "nuovo" as const, id: null, nome, quantita: quantita || 1, unita, posizione };
        if (azione === "nuovo") return { azione, id: null, nome, quantita: quantita || 1, unita, posizione };
        return { azione, id: esistente!.id, nome: esistente!.nome, quantita: azione === "finito" ? 0 : quantita, unita: esistente!.unita, posizione: esistente!.posizione, prima: esistente!.quantita };
      })
      .filter(Boolean);
    return NextResponse.json({ modifiche });
  } catch (e) {
    console.error("Risposta inventario non leggibile", e);
    await registraErrore(supabase, "inventario", "Risposta di Claude non leggibile");
    return NextResponse.json({ errore: "Non ho capito la nota, riprova con parole più semplici." }, { status: 422 });
  }
}
