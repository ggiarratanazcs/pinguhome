import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registraErrore, registraLettura } from "@/lib/eventi-server";
import { insegnaNegozio } from "@/lib/spesa";

export const maxDuration = 60;

const FORMATI = ["ean13", "ean8", "upca", "code128", "code39", "qrcode"] as const;

const ISTRUZIONI = `Questa è la foto di una carta fedeltà (tessera di un supermercato o negozio).
Rispondi SOLO con un JSON, senza altro testo:
{"negozio":"... o null","numero":"... o null","formato":"ean13|ean8|upca|code128|code39|qrcode o null"}
- "negozio": solo l'insegna, come la chiamerebbe chiunque (es. "Coop", "Esselunga", "Famila"), senza ragione sociale né città.
- "numero": il numero della carta, cioè le cifre stampate sotto il codice a barre (o accanto), senza spazi. Se non c'è un codice ma solo un numero, usa quello.
- "formato": "qrcode" se c'è un codice QR; "ean13" se il numero sotto le barre è di 13 cifre; "ean8" se di 8; "upca" se di 12; altrimenti "code128".
- Se un dato non si legge, usa null.`;

function estraiJson(testo: string) {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio === -1 || fine === -1) throw new Error("Risposta senza JSON");
  return JSON.parse(testo.slice(inizio, fine + 1)) as Record<string, unknown>;
}

/** Legge la foto di una tessera (già ridimensionata nel browser) con Claude. Solo per utenti collegati. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ errore: "Non sei collegato." }, { status: 401 });
  // Le letture costano: solo per chi fa parte di una casa attiva
  const { data: puo } = await supabase.rpc("puo_usare_claude");
  if (!puo) return NextResponse.json({ errore: "Le letture sono disponibili solo per chi fa parte di una casa." }, { status: 403 });

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
      max_tokens: 400,
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
    await registraErrore(supabase, "tessera", `Claude ha risposto ${risposta.status}`);
    console.error("Lettura tessera non riuscita", risposta.status, (await risposta.text().catch(() => "")).slice(0, 500));
    return NextResponse.json({ errore: risposta.status === 429 ? "Troppe letture ravvicinate: riprova tra poco." : "Non sono riuscito a leggere la tessera." }, { status: 502 });
  }

  try {
    const json = (await risposta.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    await registraLettura(supabase, "tessera", json.usage);
    const grezzo = estraiJson((json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"));
    const testo = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null);
    const formato = FORMATI.find((f) => f === testo(grezzo.formato)) ?? null;
    const numero = testo(grezzo.numero);
    return NextResponse.json({
      negozio: insegnaNegozio(testo(grezzo.negozio)),
      numero: numero && formato !== "qrcode" ? numero.replace(/\s/g, "") : numero,
      formato,
    });
  } catch (e) {
    console.error("Risposta tessera non leggibile", e);
    await registraErrore(supabase, "tessera", "Risposta di Claude non leggibile");
    return NextResponse.json({ errore: "Non ho capito la foto: prova più da vicino e dritta." }, { status: 422 });
  }
}
