import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inviaNotifica } from "@/lib/notifiche-server";

/** Notifica di prova ai dispositivi dell'utente collegato. */
export async function POST() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ errore: "Non sei collegato." }, { status: 401 });

  const { data: iscrizioni } = await supabase.from("push_iscrizioni").select("id, endpoint, p256dh, auth");
  if (!iscrizioni?.length) return NextResponse.json({ errore: "Nessun dispositivo iscritto alle notifiche." }, { status: 404 });

  let ok = 0;
  for (const s of iscrizioni) {
    const esito = await inviaNotifica(s, {
      title: "PinguHome",
      body: "Le notifiche funzionano: qui arriveranno i promemoria dell'agenda.",
      url: "/agenda",
      tag: "prova",
    });
    if (esito === "ok") ok++;
    if (esito === "scaduta") await supabase.from("push_iscrizioni").delete().eq("id", s.id);
  }
  return ok ? NextResponse.json({ inviate: ok }) : NextResponse.json({ errore: "Invio non riuscito: riattiva le notifiche su questo dispositivo." }, { status: 502 });
}
