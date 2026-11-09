import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Impegno } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { aData, formattaEuro, istanteRoma, occorrenze, oggiRoma, piuGiorni } from "@/lib/agenda";
import { inviaNotifica, type Iscrizione } from "@/lib/notifiche-server";

export const maxDuration = 60;

/** Finestra: si inviano i promemoria la cui ora è caduta negli ultimi 30 minuti (il timer gira ogni 5). */
const FINESTRA_MS = 30 * 60 * 1000;

type Dati = {
  impegni: Impegno[];
  membri: { famiglia_id: string; user_id: string }[];
  iscrizioni: (Iscrizione & { user_id: string })[];
  inviati: { impegno_id: string; data: string; user_id: string }[];
  fatti: { impegno_id: string; data: string }[];
};

function quando(data: string, ora: string | null, oggi: string) {
  const giorno =
    data === oggi
      ? "Oggi"
      : data === piuGiorni(oggi, 1)
        ? "Domani"
        : new Date(`${data}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const g = giorno.charAt(0).toUpperCase() + giorno.slice(1);
  return ora ? `${g} alle ${ora.slice(0, 5)}` : g;
}

/**
 * Chiamata ogni 5 minuti dal timer del database (pg_cron), con il segreto condiviso.
 * Calcola i promemoria dovuti (ricorrenze comprese) e invia le notifiche.
 */
export async function POST(request: Request) {
  const segreto = (process.env.PROMEMORIA_SEGRETO ?? "").trim();
  if (!segreto || request.headers.get("x-segreto") !== segreto) {
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("promemoria_dati", { p_segreto: segreto });
  if (error || !data) return NextResponse.json({ errore: error?.message ?? "Dati non disponibili" }, { status: 500 });
  const d = data as unknown as Dati;

  const ora = Date.now();
  const oggi = oggiRoma();
  const giaInviati = new Set(d.inviati.map((x) => `${x.impegno_id}|${x.data}|${x.user_id}`));
  const fatti = new Set(d.fatti.map((x) => `${x.impegno_id}|${x.data}`));
  const inviati: { impegno_id: string; data: string; user_id: string }[] = [];
  const scadute = new Set<string>();
  let notifiche = 0;

  for (const imp of d.impegni) {
    if (imp.promemoria === null) continue;
    const anticipo = imp.promemoria * 60_000;
    // Giorni in cui l'impegno può far scattare il promemoria adesso
    const da = aData(new Date(ora - FINESTRA_MS + anticipo - 86_400_000));
    const a = aData(new Date(ora + anticipo + 86_400_000));
    for (const giorno of occorrenze(imp, da, a)) {
      const scatto = istanteRoma(giorno, imp.ora) - anticipo;
      if (scatto > ora || scatto <= ora - FINESTRA_MS) continue;
      if (fatti.has(`${imp.id}|${giorno}`)) continue;
      const destinatari = imp.per_chi ? [imp.per_chi] : d.membri.filter((m) => m.famiglia_id === imp.famiglia_id).map((m) => m.user_id);
      for (const utente of destinatari) {
        if (giaInviati.has(`${imp.id}|${giorno}|${utente}`)) continue;
        const corpo =
          imp.importo !== null
            ? `${imp.categoria === "scadenza" ? "Scadenza" : "Importo"}: ${formattaEuro(Number(imp.importo))}. ${quando(giorno, imp.ora, oggi)}.`
            : `${quando(giorno, imp.ora, oggi)}.${imp.note ? ` ${imp.note}` : ""}`;
        for (const s of d.iscrizioni.filter((x) => x.user_id === utente)) {
          const esito = await inviaNotifica(s, { title: imp.titolo, body: corpo, url: "/agenda", tag: `${imp.id}|${giorno}` });
          if (esito === "scaduta") scadute.add(s.id);
          if (esito === "ok") notifiche++;
        }
        inviati.push({ impegno_id: imp.id, data: giorno, user_id: utente });
      }
    }
  }

  if (inviati.length || scadute.size) {
    await supabase.rpc("promemoria_registra", { p_segreto: segreto, p_inviati: inviati, p_scadute: [...scadute] });
  }
  return NextResponse.json({ promemoria: inviati.length, notifiche, iscrizioni_tolte: scadute.size, oggi });
}
