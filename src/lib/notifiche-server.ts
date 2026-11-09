import "server-only";
import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/notifiche-config";

export type Iscrizione = { id: string; endpoint: string; p256dh: string; auth: string };
export type Messaggio = { title: string; body: string; url: string; tag: string };

let configurato = false;

function configura() {
  if (configurato) return true;
  const privata = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  if (!privata) return false;
  webpush.setVapidDetails("https://pinguhome.vercel.app", VAPID_PUBLIC_KEY, privata);
  configurato = true;
  return true;
}

/**
 * Invia una notifica a un dispositivo. Restituisce "scaduta" se il dispositivo
 * non è più iscritto (va tolto dall'elenco).
 */
export async function inviaNotifica(s: Iscrizione, m: Messaggio): Promise<"ok" | "scaduta" | "errore"> {
  if (!configura()) return "errore";
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), {
      TTL: 60 * 60 * 6,
      urgency: "high",
    });
    return "ok";
  } catch (e) {
    const codice = (e as { statusCode?: number }).statusCode;
    if (codice === 404 || codice === 410) return "scaduta";
    console.error("Notifica non inviata", codice, (e as Error).message);
    return "errore";
  }
}
