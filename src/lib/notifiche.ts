"use client";

import { createClient } from "@/lib/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/notifiche-config";

export type StatoNotifiche = "non-supportate" | "solo-da-home" | "bloccate" | "attive" | "spente";

function chiaveInByte(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

function eIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function installataSuHome() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export async function registraServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function statoNotifiche(): Promise<StatoNotifiche> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return eIos() && !installataSuHome() ? "solo-da-home" : "non-supportate";
  }
  if (Notification.permission === "denied") return "bloccate";
  const reg = await navigator.serviceWorker.getRegistration();
  const iscrizione = await reg?.pushManager.getSubscription();
  return iscrizione && Notification.permission === "granted" ? "attive" : "spente";
}

/** Chiede il permesso, iscrive questo dispositivo e lo salva nel profilo. */
export async function attivaNotifiche(): Promise<StatoNotifiche> {
  const reg = await registraServiceWorker();
  if (!reg) return "non-supportate";
  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") return permesso === "denied" ? "bloccate" : "spente";
  await navigator.serviceWorker.ready;
  const iscrizione =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(VAPID_PUBLIC_KEY) }));
  const json = iscrizione.toJSON();
  const supabase = createClient();
  const { error } = await supabase.from("push_iscrizioni").upsert(
    {
      endpoint: iscrizione.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      dispositivo: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error("Iscrizione non salvata");
  return "attive";
}

export async function disattivaNotifiche() {
  const reg = await navigator.serviceWorker.getRegistration();
  const iscrizione = await reg?.pushManager.getSubscription();
  if (iscrizione) {
    await createClient().from("push_iscrizioni").delete().eq("endpoint", iscrizione.endpoint);
    await iscrizione.unsubscribe();
  }
}

export async function inviaProva() {
  const r = await fetch("/api/notifiche/prova", { method: "POST" });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.errore ?? "Invio non riuscito");
}
