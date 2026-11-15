/** Tipi e formati della console di admin. */

export type MembroAdmin = { id: string; nome: string; colore: string; dispositivi: number };
export type CasaAdmin = {
  id: string;
  nome: string;
  creata_il: string;
  sospesa_il: string | null;
  spazio: number;
  letture: number;
  carte: number;
  ultima: string | null;
  membri: MembroAdmin[];
};
export type Panoramica = {
  case: number;
  utenti: number;
  dispositivi: number;
  spazio: number;
  letture_mese: number;
  token_ingresso_mese: number;
  token_uscita_mese: number;
  errori_settimana: number;
  elenco: CasaAdmin[];
};
export type EventoAdmin = {
  id: number;
  tipo: string;
  dove: string | null;
  messaggio: string | null;
  token_ingresso: number | null;
  token_uscita: number | null;
  creato_il: string;
  casa: string | null;
  utente: string | null;
};
export type DispositivoAdmin = { id: string; user_id: string; dispositivo: string | null; creata_il: string; utente: string; case_: string | null };

/** Prezzi di Claude Sonnet 5.5 (dollari per milione di token): 2 in ingresso, 10 in uscita. */
export function costoDollari(ingresso: number, uscita: number) {
  return (ingresso * 2 + uscita * 10) / 1_000_000;
}

export function dollari(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 });
}

export function peso(byte: number) {
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  if (byte < 1024 ** 3) return `${(byte / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: byte < 10 * 1024 * 1024 ? 1 : 0 })} MB`;
  return `${(byte / 1024 ** 3).toLocaleString("it-IT", { maximumFractionDigits: 1 })} GB`;
}

function giornoRoma(d: Date) {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

/** "oggi, 18:42", "ieri, 21:10" oppure "12 nov" */
export function quando(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const oggi = new Date();
  const ieri = new Date(oggi.getTime() - 86_400_000);
  if (giornoRoma(d) === giornoRoma(oggi)) return `oggi, ${ora}`;
  if (giornoRoma(d) === giornoRoma(ieri)) return `ieri, ${ora}`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "Europe/Rome" }).replace(".", "");
}

/** Dal testo del browser, un nome breve del dispositivo */
export function nomeDispositivo(ua: string | null) {
  if (!ua) return "Dispositivo";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "Dispositivo";
}
