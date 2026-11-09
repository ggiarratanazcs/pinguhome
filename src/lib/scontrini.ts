"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ScontrinoLetto } from "@/lib/tipi-scontrino";

export type { ScontrinoLetto };

const LATO_MASSIMO = 1600;

/**
 * Riduce la foto prima di inviarla: le foto del telefono pesano 3-5 MB,
 * a 1600 px restano nitide per la lettura e diventano ~300 KB.
 * I PDF passano così come sono.
 */
export async function preparaFile(file: File): Promise<{ blob: Blob; tipo: string; dataUrl: string | null }> {
  if (!file.type.startsWith("image/")) return { blob: file, tipo: file.type || "application/pdf", dataUrl: null };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Immagine non leggibile"));
      i.src = url;
    });
    const scala = Math.min(1, LATO_MASSIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scala);
    canvas.height = Math.round(img.naturalHeight * scala);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponibile");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const blob = await (await fetch(dataUrl)).blob();
    return { blob, tipo: "image/jpeg", dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Carica lo scontrino nell'archivio privato della casa e restituisce il percorso. */
export async function caricaScontrino(supabase: SupabaseClient<Database>, famigliaId: string, file: File): Promise<string | null> {
  const { blob, tipo } = await preparaFile(file);
  const estensione = tipo === "application/pdf" ? "pdf" : tipo === "image/png" ? "png" : "jpg";
  const percorso = `${famigliaId}/${crypto.randomUUID()}.${estensione}`;
  const { error } = await supabase.storage.from("scontrini").upload(percorso, blob, { contentType: tipo, upsert: false });
  return error ? null : percorso;
}

/** Apre lo scontrino in una nuova scheda con un collegamento temporaneo. */
export async function apriScontrino(supabase: SupabaseClient<Database>, percorso: string) {
  const finestra = window.open("", "_blank");
  const { data } = await supabase.storage.from("scontrini").createSignedUrl(percorso, 60 * 10);
  if (data?.signedUrl) {
    if (finestra) finestra.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  } else finestra?.close();
}

/** Fa leggere lo scontrino a Claude: data, negozio, totale e prodotti. */
export async function leggiScontrino(file: File): Promise<ScontrinoLetto> {
  const { dataUrl } = await preparaFile(file);
  if (!dataUrl) throw new Error("Per la lettura serve una foto (JPG o PNG), non un PDF.");
  const r = await fetch("/api/scontrino", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ immagine: dataUrl, tipo: "image/jpeg" }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json) throw new Error(json?.errore ?? "Non sono riuscito a leggere lo scontrino.");
  return json as ScontrinoLetto;
}
