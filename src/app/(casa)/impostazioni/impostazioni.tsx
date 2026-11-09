"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, Share2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Famiglia, Profilo } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { applicaTema, TEMI, temaValido, type IdTema } from "@/lib/temi";
import { Avatar, Campo, Messaggio, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Mascotte, type SceltaMascotte } from "@/components/mascotte";
import { GestioneNotifiche } from "@/components/notifiche";

const COLORI = ["#1d2340", "#ff9f1c", "#f2789b", "#23885a", "#3f6fd8", "#7a5cc2", "#d2394a", "#0f8b8d"];

export function Impostazioni({ profilo, famiglia, membri }: { profilo: Profilo; famiglia: Famiglia; membri: MembroCasa[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [tema, setTema] = useState<IdTema>(temaValido(profilo.tema));
  const [colore, setColore] = useState(profilo.colore);
  const [mascotte, setMascotte] = useState<SceltaMascotte>({
    tipo: profilo.mascotte === "personale" && profilo.mascotte_path ? "personale" : "originale",
    percorso: profilo.mascotte_path,
  });
  const [caricamento, setCaricamento] = useState(false);
  const campoMascotte = useRef<HTMLInputElement>(null);
  const [copiato, setCopiato] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);

  async function scegliTema(t: IdTema) {
    setTema(t);
    applicaTema(t);
    await supabase.from("profili").update({ tema: t }).eq("id", profilo.id);
  }

  async function scegliMascotte(tipo: SceltaMascotte["tipo"]) {
    if (tipo === "personale" && !mascotte.percorso) {
      campoMascotte.current?.click();
      return;
    }
    setMascotte((m) => ({ ...m, tipo }));
    await supabase.from("profili").update({ mascotte: tipo }).eq("id", profilo.id);
    router.refresh();
  }

  /** Carica l'immagine della mascotte: ridotta a 512 px, trasparenza conservata. */
  async function caricaMascotte(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEsito("Scegli un'immagine (PNG con sfondo trasparente è l'ideale).");
      return;
    }
    setCaricamento(true);
    try {
      const blob = await riduciPng(file, 512);
      const percorso = `${profilo.id}/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from("mascotte").upload(percorso, blob, { contentType: "image/png" });
      if (error) throw error;
      if (mascotte.percorso) await supabase.storage.from("mascotte").remove([mascotte.percorso]);
      await supabase.from("profili").update({ mascotte: "personale", mascotte_path: percorso }).eq("id", profilo.id);
      setMascotte({ tipo: "personale", percorso });
      setEsito("Mascotte aggiornata.");
      router.refresh();
    } catch {
      setEsito("Non sono riuscito a caricare l'immagine: riprova con un PNG più leggero.");
    } finally {
      setCaricamento(false);
      if (campoMascotte.current) campoMascotte.current.value = "";
    }
  }

  async function salvaProfilo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = String(new FormData(e.currentTarget).get("nome") ?? "").trim();
    await supabase.from("profili").update({ nome, colore }).eq("id", profilo.id);
    setEsito("Profilo salvato.");
    router.refresh();
  }

  async function salvaCasa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = String(new FormData(e.currentTarget).get("casa") ?? "").trim();
    if (!nome) return;
    await supabase.from("famiglie").update({ nome }).eq("id", famiglia.id);
    setEsito("Nome della casa salvato.");
    router.refresh();
  }

  async function cambiaPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const { error } = await supabase.auth.updateUser({ password });
    setEsito(error ? "Password non cambiata: servono almeno 6 caratteri." : "Password cambiata.");
    if (!error) form.reset();
  }

  async function condividi() {
    const testo = `Entra nella nostra casa su PinguHome con il codice ${famiglia.codice_invito}: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "PinguHome", text: testo });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(famiglia.codice_invito);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 1800);
  }

  return (
    <main className="mx-auto w-full max-w-[920px] px-5 pt-0 md:px-12 lg:pt-14">
      <div className="hidden items-end justify-between gap-4 lg:flex">
        <h1 className="titolo titolo-pagina">impostazioni</h1>
        <Mascotte className="-mb-1 hidden w-16 shrink-0 md:block" />
      </div>

      {esito ? <div className="mt-6"><Messaggio tipo="ok">{esito}</Messaggio></div> : null}

      <Sezione titolo="notifiche" descrizione="I promemoria dell'agenda, sul telefono o sul computer.">
        <GestioneNotifiche />
      </Sezione>

      <Sezione titolo="aspetto" descrizione="Il tema vale su tutti i tuoi dispositivi.">
        <div className="grid gap-4 sm:grid-cols-3">
          {TEMI.map((t) => {
            const attivo = tema === t.id;
            const a = t.anteprima;
            return (
              <button key={t.id} onClick={() => scegliTema(t.id)} aria-pressed={attivo} className="anello-focus group text-left">
                <div
                  className={cn("relative flex h-28 overflow-hidden rounded-[22px] ring-offset-2 ring-offset-superficie transition", attivo ? "ring-[3px] ring-becco" : "ring-1 ring-linea group-hover:ring-linea-forte")}
                  style={{ background: a.sfondo }}
                >
                  <div className="w-1/4" style={{ background: a.dorso }} />
                  <div className="relative m-2 ml-0 flex-1 rounded-l-[14px] rounded-r-[8px] p-3" style={{ background: a.foglio }}>
                    <div className="h-2.5 w-16 rounded-full" style={{ background: a.dorso, opacity: 0.85 }} />
                    <div className="mt-2 h-1.5 w-24 rounded-full" style={{ background: a.dorso, opacity: 0.2 }} />
                    <div className="mt-1.5 h-1.5 w-20 rounded-full" style={{ background: a.dorso, opacity: 0.2 }} />
                    <div className="absolute bottom-3 right-3 size-6 rounded-full" style={{ background: a.becco }} />
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-2 font-semibold">
                  {t.nome}
                  {attivo ? <Check className="size-4 text-becco-scuro" strokeWidth={3} /> : null}
                </p>
                <p className="text-[0.8125rem] text-tenue">{t.descrizione}</p>
              </button>
            );
          })}
        </div>
      </Sezione>

      <Sezione titolo="mascotte" descrizione="Il pinguino in alto a sinistra. Ognuno sceglie il suo: puoi caricare un'immagine tua, meglio un PNG con sfondo trasparente.">
        <input ref={campoMascotte} type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" tabIndex={-1} onChange={(e) => caricaMascotte(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-4">
          {(
            [
              { tipo: "originale", nome: "L'originale" },
              { tipo: "personale", nome: mascotte.percorso ? "La tua" : "Carica la tua" },
            ] as const
          ).map((o) => {
            const attiva = mascotte.tipo === o.tipo;
            return (
              <button key={o.tipo} onClick={() => scegliMascotte(o.tipo)} aria-pressed={attiva} className="anello-focus group flex w-32 flex-col items-center text-center">
                <span
                  className={cn(
                    "grid aspect-square w-full place-items-center rounded-[22px] p-3 transition",
                    attiva ? "bg-becco-tenue ring-[3px] ring-becco" : "bg-superficie-2 ring-1 ring-linea group-hover:ring-linea-forte",
                  )}
                >
                  {o.tipo === "originale" ? (
                    <Mascotte scelta={{ tipo: "originale", percorso: null }} className="w-full" />
                  ) : mascotte.percorso ? (
                    <Mascotte scelta={{ tipo: "personale", percorso: mascotte.percorso }} className="max-h-full w-full" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-tenue">
                      {caricamento ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
                    </span>
                  )}
                </span>
                <span className={cn("mt-2 text-[0.8125rem]", attiva ? "font-semibold" : "text-tenue")}>{o.nome}</span>
              </button>
            );
          })}
        </div>
        {mascotte.percorso ? (
          <button
            onClick={() => campoMascotte.current?.click()}
            disabled={caricamento}
            className="anello-focus mt-4 flex items-center gap-2 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4"
          >
            {caricamento ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Cambia immagine
          </button>
        ) : null}
      </Sezione>

      <Sezione titolo="tu" descrizione="Il tuo colore distingue le voci che aggiungi alla lista.">
        <form onSubmit={salvaProfilo} className="flex flex-col gap-6">
          <Campo etichetta="Nome" id="nome" name="nome" defaultValue={profilo.nome} required />
          <div>
            <p className="text-[0.8125rem] text-tenue">Colore</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {COLORI.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColore(c)}
                  aria-label={`Colore ${c}`}
                  aria-pressed={colore === c}
                  className={cn("size-9 rounded-full ring-offset-[3px] ring-offset-superficie transition", colore === c ? "ring-2 ring-inchiostro" : "hover:scale-110")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Pulsante type="submit" className="self-start">Salva il profilo</Pulsante>
        </form>
      </Sezione>

      <Sezione titolo="casa" descrizione="Chi entra con il codice vede e modifica le stesse liste.">
        <form onSubmit={salvaCasa} className="flex items-end gap-3">
          <div className="flex-1"><Campo etichetta="Nome della casa" id="casa" name="casa" defaultValue={famiglia.nome} /></div>
          <Pulsante type="submit" variante="secondario">Salva</Pulsante>
        </form>

        <div className="mt-8 flex flex-col gap-4 rounded-[28px] bg-dorso p-6 text-su-dorso sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-[0.875rem] text-su-dorso-tenue">Codice per entrare nella casa</p>
            <p className="titolo-normale numeri mt-1 text-[1.75rem] tracking-[0.18em]">{famiglia.codice_invito}</p>
          </div>
          <Pulsante onClick={condividi}>
            {copiato ? <Check className="size-4" /> : <Share2 className="size-4" />}
            {copiato ? "Codice copiato" : "Condividi il codice"}
          </Pulsante>
        </div>

        <ul className="mt-6">
          {membri.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-b border-linea py-3">
              <Avatar nome={m.nome} colore={m.colore} className="size-9" />
              <span className="flex-1">
                {m.nome}
                {m.id === profilo.id ? <span className="text-tenue"> (tu)</span> : null}
              </span>
              <span className="text-[0.8125rem] text-tenue">{m.ruolo === "titolare" ? "ha creato la casa" : "membro"}</span>
            </li>
          ))}
        </ul>
      </Sezione>

      <Sezione titolo="accesso" descrizione={profilo.email}>
        <form onSubmit={cambiaPassword} className="flex items-end gap-3">
          <div className="flex-1"><Campo etichetta="Nuova password" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required /></div>
          <Pulsante type="submit" variante="secondario">Cambia</Pulsante>
        </form>
        <form action="/auth/esci" method="post" className="mt-8">
          <Pulsante variante="pericolo" className="px-0 hover:bg-transparent hover:underline"><LogOut className="size-4" /> Esci da PinguHome</Pulsante>
        </form>
      </Sezione>
    </main>
  );
}

function Sezione({ titolo, descrizione, children }: { titolo: string; descrizione?: string; children: ReactNode }) {
  return (
    <section className="mt-10 grid gap-5 first-of-type:mt-2 lg:first-of-type:mt-10 md:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <h2 className="titolo text-[1.125rem]">{titolo}</h2>
        {descrizione ? <p className="mt-2 text-[0.875rem] text-tenue">{descrizione}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Riduce l'immagine al lato massimo indicato e la esporta in PNG (la trasparenza resta). */
async function riduciPng(file: File, lato: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Immagine non leggibile"));
      i.src = url;
    });
    const scala = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scala);
    canvas.height = Math.round(img.naturalHeight * scala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("Conversione non riuscita"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
