import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const ISTRUZIONI = `Questa è la foto di un prodotto da ricomprare (una confezione, un barattolo, un frutto, un oggetto di casa).
Rispondi SOLO con un JSON, senza altro testo:
{"nome":"... o null"}
- "nome": il nome semplice e generico del prodotto, come lo scriveresti nella lista della spesa, in italiano, con l'iniziale maiuscola, di 1-3 parole, senza marca né formato. Esempi: una confezione di Pan di Stelle → "Biscotti"; una bottiglia di Fairy → "Detersivo piatti"; un vasetto di yogurt greco Fage → "Yogurt greco".
- Se non si capisce cosa sia, usa null.`;

function estraiJson(testo: string) {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio === -1 || fine === -1) throw new Error("Risposta senza JSON");
  return JSON.parse(testo.slice(inizio, fine + 1)) as Record<string, unknown>;
}

/** Riconosce il prodotto nella foto (già ridimensionata nel browser) con Claude. Solo per utenti collegati. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ errore: "Non sei collegato." }, { status: 401 });

  const chiave = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/["'\s]/g, "");
  if (!chiave) return NextResponse.json({ errore: "La lettura delle foto non è attiva: manca la chiave ANTHROPIC_API_KEY su Vercel." }, { status: 503 });

  let corpo: { immagine?: string; tipo?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: "Foto non valida." }, { status: 400 });
  }
  const immagine = corpo.immagine?.replace(/^data:[^;]+;base64,/, "");
  const tipo = corpo.tipo && ["image/jpeg", "image/png", "image/webp"].includes(corpo.tipo) ? corpo.tipo : "image/jpeg";
  if (!immagine) return NextResponse.json({ errore: "Foto mancante." }, { status: 400 });

  const risposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chiave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: immagine } },
            { type: "text", text: ISTRUZIONI },
          ],
        },
      ],
    }),
  });

  if (!risposta.ok) {
    console.error("Lettura prodotto non riuscita", risposta.status, (await risposta.text().catch(() => "")).slice(0, 500));
    return NextResponse.json({ errore: risposta.status === 429 ? "Troppe letture ravvicinate: riprova tra poco." : "Non sono riuscito a riconoscere il prodotto." }, { status: 502 });
  }

  try {
    const json = (await risposta.json()) as { content?: { type: string; text?: string }[] };
    const grezzo = estraiJson((json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"));
    const nome = typeof grezzo.nome === "string" && grezzo.nome.trim() && grezzo.nome.trim().toLowerCase() !== "null" ? grezzo.nome.trim().slice(0, 60) : null;
    return NextResponse.json({ nome });
  } catch (e) {
    console.error("Risposta prodotto non leggibile", e);
    return NextResponse.json({ errore: "Non ho capito cosa c'è nella foto." }, { status: 422 });
  }
}
