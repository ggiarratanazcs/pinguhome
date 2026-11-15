import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inviaNotifica } from "@/lib/notifiche-server";
import { registraErrore } from "@/lib/eventi-server";

/** Notifica di prova mandata dall'admin ai dispositivi di una casa o di un utente. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("e_admin");
  if (!admin) return NextResponse.json({ errore: "Non autorizzato." }, { status: 403 });

  const corpo = (await request.json().catch(() => ({}))) as { casa?: string; utente?: string };
  const { data: iscrizioni, error } = await supabase.rpc("admin_iscrizioni", { p_casa: corpo.casa ?? null, p_utente: corpo.utente ?? null });
  if (error) return NextResponse.json({ errore: "Non riesco a leggere i dispositivi." }, { status: 500 });
  if (!iscrizioni?.length) return NextResponse.json({ errore: "Nessun dispositivo con le notifiche attive." }, { status: 404 });

  let inviate = 0;
  for (const s of iscrizioni) {
    const esito = await inviaNotifica(s, { title: "Uchi", body: "Notifica di prova: le notifiche funzionano.", url: "/", tag: "prova-admin" });
    if (esito === "ok") inviate++;
    if (esito === "scaduta") await supabase.rpc("admin_togli_iscrizione", { p_id: s.id });
  }
  if (!inviate) {
    await registraErrore(supabase, "notifiche", "Notifica di prova non arrivata a nessun dispositivo");
    return NextResponse.json({ errore: "Non è arrivata a nessun dispositivo: le iscrizioni potrebbero essere scadute." }, { status: 502 });
  }
  return NextResponse.json({ inviate });
}
