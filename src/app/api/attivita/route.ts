import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Impegno, Spesa, VoceLista } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { formattaEuro, oggiRoma, piuGiorni } from "@/lib/agenda";
import { inviaNotifica, type Iscrizione, type Messaggio } from "@/lib/notifiche-server";

export const maxDuration = 30;

type Evento = {
  tabella: "impegni" | "voci_lista" | "spese";
  evento: "INSERT" | "UPDATE" | "DELETE";
  autore: string;
  famiglia_id: string;
  nuovo: Record<string, unknown> | null;
  vecchio: Record<string, unknown> | null;
};

type Dati = { autore: string | null; lista: string | null; recenti: string[]; iscrizioni: Iscrizione[] };

function quando(data: string, ora: string | null) {
  const oggi = oggiRoma();
  const g =
    data === oggi
      ? "oggi"
      : data === piuGiorni(oggi, 1)
        ? "domani"
        : new Date(`${data}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return ora ? `${g} alle ${ora.slice(0, 5)}` : g;
}

function maiuscola(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function elencoNomi(nomi: string[]) {
  if (nomi.length <= 1) return nomi[0] ?? "";
  if (nomi.length <= 3) return `${nomi.slice(0, -1).join(", ")} e ${nomi[nomi.length - 1]}`;
  const altri = nomi.length - 2;
  return `${nomi.slice(0, 2).join(", ")} e altre ${altri} cose`;
}

function componi(e: Evento, d: Dati): Messaggio | null {
  const chi = d.autore ?? "Qualcuno";

  if (e.tabella === "impegni") {
    const imp = (e.nuovo ?? e.vecchio) as unknown as Impegno;
    const dettaglio = maiuscola(quando(imp.data, imp.ora)) + (imp.importo !== null ? `, ${formattaEuro(Number(imp.importo))}` : "");
    const azione = e.evento === "INSERT" ? "ha aggiunto" : e.evento === "UPDATE" ? "ha modificato" : "ha cancellato";
    return { title: `${chi} ${azione} ${imp.titolo}`, body: dettaglio, url: "/agenda", tag: `impegno-${imp.id}` };
  }

  if (e.tabella === "voci_lista") {
    const v = e.nuovo as unknown as VoceLista;
    const nomi = d.recenti.length ? d.recenti : [v.nome];
    return {
      title: `${chi} ha aggiunto a ${d.lista ?? "la lista"}`,
      body: maiuscola(elencoNomi(nomi)),
      url: "/spesa",
      tag: `lista-${v.lista_id}-${e.autore}`,
    };
  }

  if (e.tabella === "spese") {
    const s = e.nuovo as unknown as Spesa;
    const dove = s.negozio ?? d.lista;
    return {
      title: `${chi} ha registrato una spesa`,
      body: `${formattaEuro(Number(s.importo))}${dove ? `, ${dove}` : ""}. ${maiuscola(quando(s.data, null))}.`,
      url: "/spesa?vista=spese",
      tag: `spesa-${s.id}`,
    };
  }
  return null;
}

/** Chiamata dal database quando qualcuno della casa aggiunge, modifica o cancella qualcosa. */
export async function POST(request: Request) {
  const segreto = (process.env.PROMEMORIA_SEGRETO ?? "").trim();
  if (!segreto || request.headers.get("x-segreto") !== segreto) {
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }
  const e = (await request.json()) as Evento;
  const riga = e.nuovo ?? e.vecchio ?? {};
  const lista = typeof riga.lista_id === "string" ? riga.lista_id : null;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("attivita_dati", { p_segreto: segreto, p_famiglia: e.famiglia_id, p_autore: e.autore, p_lista: lista });
  if (error || !data) return NextResponse.json({ errore: error?.message ?? "Dati non disponibili" }, { status: 500 });
  const d = data as unknown as Dati;

  const messaggio = componi(e, d);
  if (!messaggio || d.iscrizioni.length === 0) return NextResponse.json({ notifiche: 0 });

  const esiti = await Promise.all(d.iscrizioni.map((s) => inviaNotifica(s, messaggio).then((r) => ({ id: s.id, r }))));
  const scadute = esiti.filter((x) => x.r === "scaduta").map((x) => x.id);
  if (scadute.length) await supabase.rpc("promemoria_registra", { p_segreto: segreto, p_inviati: [], p_scadute: scadute });
  return NextResponse.json({ notifiche: esiti.filter((x) => x.r === "ok").length });
}
