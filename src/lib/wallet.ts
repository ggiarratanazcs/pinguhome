import type { Carta } from "@/lib/database.types";
import { insegnaNegozio } from "@/lib/spesa";

export type Formato = Carta["formato"];

/** Il colore di ogni insegna conosciuta (solo il colore: niente loghi). */
const COLORI_INSEGNE: Record<string, string> = {
  Coop: "#c8281e",
  Conad: "#d7261e",
  Esselunga: "#1b5fa8",
  Lidl: "#0050aa",
  Pam: "#d6141f",
  Carrefour: "#1e5bc6",
  Eurospin: "#1d4f91",
  Aldi: "#1a2b6d",
  Penny: "#cd1719",
  MD: "#e2231a",
  Despar: "#00843d",
  Crai: "#d7261e",
  Sigma: "#e2001a",
  Simply: "#d7261e",
  Bennet: "#d7261e",
  Famila: "#cf5a22",
  Todis: "#d7261e",
  "NaturaSì": "#5a8f29",
  "Acqua & Sapone": "#d9206b",
  Obi: "#f07d00",
  Ikea: "#0058a3",
  "Leroy Merlin": "#5f9e1d",
  Decathlon: "#0082c3",
  Amazon: "#232f3e",
};

/** Colori da scegliere per le carte senza un colore noto */
export const TAVOLOZZA = ["#5b5fa3", "#1b5fa8", "#0082c3", "#2b9a8f", "#3f8a5e", "#cf5a22", "#c8281e", "#d9206b", "#7b4fa8", "#3d4352"];

export function coloreInsegna(negozio: string): string | null {
  const n = insegnaNegozio(negozio);
  return n ? (COLORI_INSEGNE[n] ?? null) : null;
}

function cifraControlloEan(cifre: string) {
  const somma = [...cifre].reduce((t, c, i) => t + Number(c) * ((cifre.length - i) % 2 === 0 ? 1 : 3), 0);
  return String((10 - (somma % 10)) % 10);
}

function eanValido(numero: string) {
  return cifraControlloEan(numero.slice(0, -1)) === numero.slice(-1);
}

/** Per un codice a barre: dal numero sceglie il tipo giusto (EAN-13, EAN-8, UPC-A), altrimenti Code 128. */
export function formatoDaNumero(numero: string): Formato {
  const n = numero.replace(/\s/g, "");
  if (/^\d{13}$/.test(n) && eanValido(n)) return "ean13";
  if (/^\d{8}$/.test(n) && eanValido(n)) return "ean8";
  if (/^\d{12}$/.test(n) && eanValido(n)) return "upca";
  return "code128";
}

/** Il numero da mostrare: a gruppi, come sulle tessere. */
export function numeroLeggibile(numero: string) {
  const n = numero.replace(/\s/g, "");
  if (!/^\d+$/.test(n)) return numero;
  if (n.length === 13) return `${n[0]} ${n.slice(1, 4)} ${n.slice(4, 7)} ${n.slice(7, 10)} ${n.slice(10)}`;
  return n.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Disegna il codice (SVG, senza testo: il numero si scrive sotto a parte). Se il numero non va bene per quel tipo, ripiega su Code 128. */
export async function disegnaCodice(numero: string, formato: Formato): Promise<string> {
  const { toSVG } = await import("bwip-js/browser");
  const testo = formato === "qrcode" ? numero : numero.replace(/\s/g, "");
  const opzioni = formato === "qrcode" ? { bcid: "qrcode", text: testo, scale: 4, eclevel: "M" } : { bcid: formato, text: testo, scale: 3, height: 26 };
  try {
    return toSVG(opzioni);
  } catch {
    return toSVG({ bcid: "code128", text: testo, scale: 3, height: 26 });
  }
}

const DA_ZXING: Record<number, Formato> = {};

/** Legge il codice a barre dalla foto direttamente sul telefono (nessun invio). */
export async function leggiCodiceDaFoto(dataUrl: string): Promise<{ numero: string; formato: Formato } | null> {
  try {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
    if (!Object.keys(DA_ZXING).length) {
      DA_ZXING[BarcodeFormat.EAN_13] = "ean13";
      DA_ZXING[BarcodeFormat.EAN_8] = "ean8";
      DA_ZXING[BarcodeFormat.UPC_A] = "upca";
      DA_ZXING[BarcodeFormat.CODE_128] = "code128";
      DA_ZXING[BarcodeFormat.CODE_39] = "code39";
      DA_ZXING[BarcodeFormat.QR_CODE] = "qrcode";
    }
    const suggerimenti = new Map();
    suggerimenti.set(DecodeHintType.TRY_HARDER, true);
    const lettore = new BrowserMultiFormatReader(suggerimenti);
    const r = await lettore.decodeFromImageUrl(dataUrl);
    const formato = DA_ZXING[r.getBarcodeFormat()];
    return formato ? { numero: r.getText(), formato } : { numero: r.getText(), formato: "code128" };
  } catch {
    return null;
  }
}

/** Fa leggere a Claude la foto della tessera: insegna, numero e tipo di codice. */
export async function leggiTessera(dataUrl: string): Promise<{ negozio: string | null; numero: string | null; formato: Formato | null }> {
  const r = await fetch("/api/tessera", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ immagine: dataUrl, tipo: "image/jpeg" }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json) throw new Error(json?.errore ?? "Non sono riuscito a leggere la tessera.");
  return json;
}
