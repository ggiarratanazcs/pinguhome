"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, ChevronRight, Home, Images, KeyRound, Loader2, LogOut, Palette, Share2, ShieldCheck, Smile, Sparkles, Upload, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Famiglia, Profilo } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { applicaTema, TEMI, temaValido, type IdTema } from "@/lib/temi";
import { statoNotifiche, type StatoNotifiche } from "@/lib/notifiche";
import { Avatar, Campo, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Mascotte, type SceltaMascotte } from "@/components/mascotte";
import { GestioneNotifiche } from "@/components/notifiche";
import { GestioneFoto, type FotoSalvata } from "@/components/impostazioni/gestione-foto";
import { EVENTO_GIRO } from "@/components/giro-guidato";

const COLORI = ["#1d2340", "#ff9f1c", "#f2789b", "#23885a", "#3f6fd8", "#7a5cc2", "#d2394a", "#0f8b8d"];

type Pannello = "profilo" | "notifiche" | "aspetto" | "mascotte" | "foto" | "casa" | "password";

const TESTO_NOTIFICHE: Record<StatoNotifiche, string> = {
  attive: "Attive",
  spente: "Spente",
  bloccate: "Bloccate",
  "solo-da-home": "Dalla Home",
  "non-supportate": "Non disponibili",
};

/**
 * Impostazioni compatte: una riga per voce con il valore attuale a destra;
 * toccandola si apre un riquadro con solo quella configurazione.
 */
export function Impostazioni({
  profilo,
  famiglia,
  membri,
  foto,
  admin = false,
}: {
  profilo: Profilo;
  famiglia: Famiglia;
  membri: MembroCasa[];
  foto: FotoSalvata[];
  admin?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [aperto, setAperto] = useState<Pannello | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nome, setNome] = useState(profilo.nome);
  const [colore, setColore] = useState(profilo.colore);
  const [nomeCasa, setNomeCasa] = useState(famiglia.nome);
  const [tema, setTema] = useState<IdTema>(temaValido(profilo.tema));
  const [mascotte, setMascotte] = useState<SceltaMascotte>({
    tipo: profilo.mascotte === "personale" && profilo.mascotte_path ? "personale" : "originale",
    percorso: profilo.mascotte_path,
  });
  const [riepilogoFoto, setRiepilogoFoto] = useState({ stile: profilo.cornice ?? "scorrimento", n: foto.length });
  const [notifiche, setNotifiche] = useState<StatoNotifiche | null>(null);

  useEffect(() => {
    statoNotifiche().then(setNotifiche);
  }, [aperto]);

  const avvisa = useCallback((t: string) => {
    setAvviso(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAvviso(null), 2400);
  }, []);

  const aggiornaFoto = useCallback((s: { stile: Profilo["cornice"]; foto: FotoSalvata[] }) => setRiepilogoFoto({ stile: s.stile, n: s.foto.length }), []);

  const nomeTema = TEMI.find((t) => t.id === tema)?.nome ?? "";

  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pb-16 pt-1 md:px-8 lg:pt-14">
      <h1 className="titolo titolo-pagina mb-6 hidden lg:block">impostazioni</h1>

      {/* Tu */}
      <button
        onClick={() => setAperto("profilo")}
        className="anello-focus flex w-full items-center gap-4 rounded-[24px] bg-superficie-2 p-4 text-left transition hover:bg-superficie-3"
      >
        <Avatar nome={nome} colore={colore} className="size-12 text-base" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0625rem] font-semibold">{nome}</span>
          <span className="block truncate text-[0.8125rem] text-tenue">{profilo.email}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-tenue" />
      </button>

      <Gruppo>
        <Riga giro="notifiche" icona={Bell} colore="#f0a03c" nome="Notifiche" valore={notifiche ? TESTO_NOTIFICHE[notifiche] : ""} onClick={() => setAperto("notifiche")} />
        <Riga icona={Palette} colore="#7a5cc2" nome="Aspetto" valore={nomeTema} onClick={() => setAperto("aspetto")} />
        <Riga
          icona={Smile}
          colore="#1d2340"
          nome="Mascotte"
          valore={mascotte.tipo === "personale" ? "La tua" : "L'originale"}
          anteprima={<Mascotte scelta={mascotte} className="size-7 object-contain" />}
          onClick={() => setAperto("mascotte")}
        />
        <Riga
          icona={Images}
          colore="#23885a"
          nome="Foto"
          valore={`${riepilogoFoto.stile === "polaroid" ? "Polaroid" : "Scorrimento"} · ${riepilogoFoto.n} foto`}
          onClick={() => setAperto("foto")}
        />
      </Gruppo>

      <Gruppo>
        <Riga
          icona={Home}
          colore="#3f6fd8"
          nome="Casa"
          valore={nomeCasa}
          onClick={() => setAperto("casa")}
        />
      </Gruppo>

      <Gruppo>
        <Riga icona={Sparkles} colore="#ff9f1c" nome="Rivedi il tutorial" valore="" onClick={() => window.dispatchEvent(new Event(EVENTO_GIRO))} />
        {admin ? <Riga icona={ShieldCheck} colore="#1d2340" nome="Console di admin" valore="" onClick={() => router.push("/admin")} /> : null}
        <Riga icona={KeyRound} colore="#8a8f99" nome="Password" valore="" onClick={() => setAperto("password")} />
        <form action="/auth/esci" method="post">
          <button className="anello-focus flex w-full items-center gap-3 px-4 py-3.5 text-left text-pericolo transition hover:bg-superficie-3">
            <span className="grid size-8 place-items-center rounded-[10px] bg-pericolo-tenue">
              <LogOut className="size-[17px]" />
            </span>
            <span className="flex-1 text-[0.9375rem] font-semibold">Esci da Uchi</span>
          </button>
        </form>
      </Gruppo>

      {/* Riquadri */}
      <Riquadro titolo="il tuo profilo" aperto={aperto === "profilo"} onChiudi={() => setAperto(null)}>
        <PannelloProfilo
          profilo={profilo}
          nome={nome}
          colore={colore}
          onSalvato={(n, c) => {
            setNome(n);
            setColore(c);
            setAperto(null);
            avvisa("Profilo salvato");
            router.refresh();
          }}
        />
      </Riquadro>

      <Riquadro titolo="notifiche" aperto={aperto === "notifiche"} onChiudi={() => setAperto(null)}>
        <GestioneNotifiche />
      </Riquadro>

      <Riquadro titolo="aspetto" aperto={aperto === "aspetto"} onChiudi={() => setAperto(null)}>
        <div className="flex flex-col gap-2">
          {TEMI.map((t) => {
            const attivo = tema === t.id;
            const a = t.anteprima;
            return (
              <button
                key={t.id}
                onClick={async () => {
                  setTema(t.id);
                  applicaTema(t.id);
                  await supabase.from("profili").update({ tema: t.id }).eq("id", profilo.id);
                }}
                aria-pressed={attivo}
                className={cn(
                  "anello-focus flex items-center gap-4 rounded-[18px] p-2.5 pr-4 text-left transition",
                  attivo ? "bg-becco-tenue" : "hover:bg-superficie-2",
                )}
              >
                <span className="flex h-12 w-16 shrink-0 overflow-hidden rounded-[12px] ring-1 ring-linea" style={{ background: a.sfondo }}>
                  <span className="w-1/4" style={{ background: a.dorso }} />
                  <span className="relative m-1 ml-0 flex-1 rounded-l-[8px] rounded-r-[5px]" style={{ background: a.foglio }}>
                    <span className="absolute bottom-1.5 right-1.5 size-3 rounded-full" style={{ background: a.becco }} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.nome}</span>
                  <span className="block truncate text-[0.8125rem] text-tenue">{t.descrizione}</span>
                </span>
                {attivo ? <Check className="size-5 shrink-0 text-becco-scuro" strokeWidth={3} /> : null}
              </button>
            );
          })}
        </div>
      </Riquadro>

      <Riquadro titolo="mascotte" aperto={aperto === "mascotte"} onChiudi={() => setAperto(null)}>
        <PannelloMascotte profiloId={profilo.id} mascotte={mascotte} onCambio={(m) => (setMascotte(m), router.refresh())} avvisa={avvisa} />
      </Riquadro>

      <Riquadro titolo="foto" aperto={aperto === "foto"} onChiudi={() => setAperto(null)} largo>
        <GestioneFoto famigliaId={famiglia.id} userId={profilo.id} stileIniziale={riepilogoFoto.stile} iniziali={foto} onCambio={aggiornaFoto} />
      </Riquadro>

      <Riquadro titolo="casa" aperto={aperto === "casa"} onChiudi={() => setAperto(null)}>
        <PannelloCasa
          famiglia={famiglia}
          membri={membri}
          profiloId={profilo.id}
          nomeCasa={nomeCasa}
          onNome={(n) => {
            setNomeCasa(n);
            avvisa("Nome della casa salvato");
            router.refresh();
          }}
        />
      </Riquadro>

      <Riquadro titolo="password" aperto={aperto === "password"} onChiudi={() => setAperto(null)}>
        <PannelloPassword
          onFatto={() => {
            setAperto(null);
            avvisa("Password cambiata");
          }}
        />
      </Riquadro>

      <AnimatePresence>
        {avviso ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-0 bottom-24 z-[70] mx-auto w-fit max-w-[90vw] truncate rounded-full bg-dorso px-5 py-3 text-sm font-medium text-su-dorso shadow-xl lg:bottom-10"
          >
            {avviso}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/* ---------- Elementi della lista ---------- */

function Gruppo({ children }: { children: ReactNode }) {
  return <div className="mt-5 divide-y divide-linea overflow-hidden rounded-[24px] bg-superficie-2">{children}</div>;
}

function Riga({
  giro,
  icona: Icona,
  colore,
  nome,
  valore,
  anteprima,
  onClick,
}: {
  giro?: string;
  icona: LucideIcon;
  colore: string;
  nome: string;
  valore: string;
  anteprima?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button data-giro={giro} onClick={onClick} className="anello-focus flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-superficie-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: colore }}>
        <Icona className="size-[17px]" />
      </span>
      <span className="flex-1 text-[0.9375rem]">{nome}</span>
      {anteprima}
      {valore ? <span className="max-w-[45%] truncate text-[0.875rem] text-tenue">{valore}</span> : null}
      <ChevronRight className="size-4 shrink-0 text-tenue" />
    </button>
  );
}

/** Riquadro in sovrimpressione: dal basso su telefono, al centro su computer. */
function Riquadro({ titolo, aperto, onChiudi, largo = false, children }: { titolo: string; aperto: boolean; onChiudi: () => void; largo?: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aperto, onChiudi]);

  return (
    <AnimatePresence>
      {aperto ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/40 p-3 backdrop-blur-md sm:items-center"
          onClick={onChiudi}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titolo}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn("pb-sicuro flex max-h-[88dvh] w-full flex-col rounded-[32px] bg-superficie shadow-2xl", largo ? "max-w-2xl" : "max-w-lg")}
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
              <p className="titolo text-[1.25rem]">{titolo}</p>
              <button onClick={onChiudi} aria-label="Chiudi" className="anello-focus grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------- Pannelli ---------- */

function PannelloProfilo({ profilo, nome, colore, onSalvato }: { profilo: Profilo; nome: string; colore: string; onSalvato: (nome: string, colore: string) => void }) {
  const supabase = createClient();
  const [scelto, setScelto] = useState(colore);

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = String(new FormData(e.currentTarget).get("nome") ?? "").trim() || nome;
    await supabase.from("profili").update({ nome: n, colore: scelto }).eq("id", profilo.id);
    onSalvato(n, scelto);
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-6">
      <Campo etichetta="Nome" id="nome" name="nome" defaultValue={nome} required />
      <div>
        <p className="text-[0.8125rem] text-tenue">Colore</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {COLORI.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setScelto(c)}
              aria-label={`Colore ${c}`}
              aria-pressed={scelto === c}
              className={cn("size-9 rounded-full ring-offset-[3px] ring-offset-superficie transition", scelto === c ? "ring-2 ring-inchiostro" : "hover:scale-110")}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <Pulsante type="submit" className="self-end">
        Salva
      </Pulsante>
    </form>
  );
}

function PannelloMascotte({
  profiloId,
  mascotte,
  onCambio,
  avvisa,
}: {
  profiloId: string;
  mascotte: SceltaMascotte;
  onCambio: (m: SceltaMascotte) => void;
  avvisa: (t: string) => void;
}) {
  const supabase = createClient();
  const campo = useRef<HTMLInputElement>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function scegli(tipo: SceltaMascotte["tipo"]) {
    if (tipo === "personale" && !mascotte.percorso) {
      campo.current?.click();
      return;
    }
    onCambio({ ...mascotte, tipo });
    await supabase.from("profili").update({ mascotte: tipo }).eq("id", profiloId);
  }

  /** Carica l'immagine della mascotte: ridotta a 512 px, trasparenza conservata. */
  async function carica(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      avvisa("Scegli un'immagine, meglio un PNG trasparente");
      return;
    }
    setCaricamento(true);
    try {
      const blob = await riduciPng(file, 512);
      const percorso = `${profiloId}/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from("mascotte").upload(percorso, blob, { contentType: "image/png" });
      if (error) throw error;
      if (mascotte.percorso) await supabase.storage.from("mascotte").remove([mascotte.percorso]);
      await supabase.from("profili").update({ mascotte: "personale", mascotte_path: percorso }).eq("id", profiloId);
      onCambio({ tipo: "personale", percorso });
      avvisa("Mascotte aggiornata");
    } catch {
      avvisa("Non sono riuscito a caricarla: prova un PNG più leggero");
    } finally {
      setCaricamento(false);
      if (campo.current) campo.current.value = "";
    }
  }

  return (
    <div>
      <p className="text-[0.875rem] text-tenue">Ognuno sceglie la sua: puoi caricare un&apos;immagine tua, meglio un PNG con sfondo trasparente.</p>
      <input ref={campo} type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" tabIndex={-1} onChange={(e) => carica(e.target.files?.[0])} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(
          [
            { tipo: "originale", nome: "L'originale" },
            { tipo: "personale", nome: mascotte.percorso ? "La tua" : "Carica la tua" },
          ] as const
        ).map((o) => {
          const attiva = mascotte.tipo === o.tipo;
          return (
            <button key={o.tipo} onClick={() => scegli(o.tipo)} aria-pressed={attiva} className="anello-focus group flex flex-col items-center text-center">
              <span
                className={cn(
                  "grid aspect-square w-full max-w-36 place-items-center rounded-[22px] p-3 transition",
                  attiva ? "bg-becco-tenue ring-[3px] ring-becco" : "bg-superficie-2 ring-1 ring-linea group-hover:ring-linea-forte",
                )}
              >
                {o.tipo === "originale" ? (
                  <Mascotte scelta={{ tipo: "originale", percorso: null }} className="w-full" />
                ) : mascotte.percorso ? (
                  <Mascotte scelta={{ tipo: "personale", percorso: mascotte.percorso }} className="max-h-full w-full" />
                ) : caricamento ? (
                  <Loader2 className="size-6 animate-spin text-tenue" />
                ) : (
                  <Upload className="size-6 text-tenue" />
                )}
              </span>
              <span className={cn("mt-2 text-[0.8125rem]", attiva ? "font-semibold" : "text-tenue")}>{o.nome}</span>
            </button>
          );
        })}
      </div>
      {mascotte.percorso ? (
        <button
          onClick={() => campo.current?.click()}
          disabled={caricamento}
          className="anello-focus mt-5 flex items-center gap-2 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4"
        >
          {caricamento ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Cambia immagine
        </button>
      ) : null}
    </div>
  );
}

function PannelloCasa({
  famiglia,
  membri,
  profiloId,
  nomeCasa,
  onNome,
}: {
  famiglia: Famiglia;
  membri: MembroCasa[];
  profiloId: string;
  nomeCasa: string;
  onNome: (n: string) => void;
}) {
  const supabase = createClient();
  const [copiato, setCopiato] = useState(false);

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = String(new FormData(e.currentTarget).get("casa") ?? "").trim();
    if (!n) return;
    await supabase.from("famiglie").update({ nome: n }).eq("id", famiglia.id);
    onNome(n);
  }

  async function condividi() {
    const testo = `Entra nella nostra casa su Uchi con il codice ${famiglia.codice_invito}: ${window.location.origin}/accesso?codice=${famiglia.codice_invito}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Uchi", text: testo });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(famiglia.codice_invito);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 1800);
  }

  return (
    <div>
      <form onSubmit={salva} className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <Campo etichetta="Nome della casa" id="casa" name="casa" defaultValue={nomeCasa} />
        </div>
        <Pulsante type="submit" variante="secondario">
          Salva
        </Pulsante>
      </form>

      <div className="mt-6 flex items-center gap-4 rounded-[22px] bg-dorso p-4 text-su-dorso">
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] text-su-dorso-tenue">Codice per entrare nella casa</p>
          <p className="titolo-normale numeri mt-0.5 text-[1.5rem] tracking-[0.18em]">{famiglia.codice_invito}</p>
        </div>
        <Pulsante onClick={condividi} className="shrink-0">
          {copiato ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copiato ? "Copiato" : "Condividi"}
        </Pulsante>
      </div>

      <ul className="mt-4">
        {membri.map((m) => (
          <li key={m.id} className="flex items-center gap-3 border-b border-linea py-3 last:border-0">
            <Avatar nome={m.nome} colore={m.colore} className="size-9" />
            <span className="flex-1">
              {m.nome}
              {m.id === profiloId ? <span className="text-tenue"> (tu)</span> : null}
            </span>
            <span className="text-[0.8125rem] text-tenue">{m.ruolo === "titolare" ? "ha creato la casa" : "membro"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PannelloPassword({ onFatto }: { onFatto: () => void }) {
  const supabase = createClient();
  const [errore, setErrore] = useState<string | null>(null);

  async function cambia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErrore("Servono almeno 6 caratteri.");
    else onFatto();
  }

  return (
    <form onSubmit={cambia} className="flex flex-col gap-4">
      <Campo etichetta="Nuova password" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
      {errore ? <p className="text-[0.875rem] text-pericolo">{errore}</p> : null}
      <Pulsante type="submit" className="self-end">
        Cambia
      </Pulsante>
    </form>
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
