"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Car,
  Dumbbell,
  Pencil,
  Gift,
  GraduationCap,
  Heart,
  House,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Plus,
  Repeat,
  Sofa,
  Target,
  Trash2,
  Umbrella,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Accantonamento, Obiettivo } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ---------- Dati e calcoli ---------- */

export const ICONE_OBIETTIVO: Record<string, LucideIcon> = {
  target: Target,
  plane: Plane,
  umbrella: Umbrella,
  sofa: Sofa,
  car: Car,
  house: House,
  gift: Gift,
  "graduation-cap": GraduationCap,
  heart: Heart,
  laptop: Laptop,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  "piggy-bank": PiggyBank,
};

const COLORI = ["#d9206b", "#2b9a8f", "#cf5a22", "#5b5fa3", "#1b5fa8", "#7b4fa8", "#3f8a5e", "#c8281e"];

function euro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0, useGrouping: "always" });
}

/** Mesi interi da oggi alla scadenza (almeno 1) */
function mesiAlla(scadenza: string, oggi: string) {
  const [a1, m1] = oggi.split("-").map(Number);
  const [a2, m2] = scadenza.split("-").map(Number);
  return Math.max(1, (a2 - a1) * 12 + (m2 - m1));
}

export type StatoObiettivo = {
  fatto: number;
  manca: number;
  percentuale: number;
  /** Quanto serve al mese per arrivare in tempo (null se non c'è una data) */
  alMese: number | null;
  raggiunto: boolean;
  indietro: boolean;
  perPersona: Record<string, number>;
};

export function statoObiettivo(o: Obiettivo, accantonamenti: Accantonamento[], oggi: string): StatoObiettivo {
  const miei = accantonamenti.filter((a) => a.obiettivo_id === o.id);
  const fatto = Math.max(0, miei.reduce((t, a) => t + Number(a.importo), 0));
  const meta = Number(o.meta);
  const manca = Math.max(0, meta - fatto);
  const raggiunto = fatto >= meta;
  const alMese = o.scadenza && !raggiunto ? Math.ceil(manca / mesiAlla(o.scadenza, oggi)) : null;
  // Indietro: con l'automatico la quota non basta; senza, si è sotto la tabella di marcia
  let indietro = false;
  if (o.scadenza && !raggiunto) {
    if (o.scadenza < oggi) indietro = true;
    else if (o.automatico && o.quota_auto) indietro = Number(o.quota_auto) < (alMese ?? 0);
    else {
      const inizio = new Date(o.creato_il).getTime();
      const fine = new Date(`${o.scadenza}T23:59:59`).getTime();
      const trascorso = Math.min(1, Math.max(0, (Date.now() - inizio) / Math.max(1, fine - inizio)));
      indietro = trascorso > 0.15 && fatto < meta * trascorso * 0.85;
    }
  }
  const perPersona: Record<string, number> = {};
  for (const a of miei) if (a.chi) perPersona[a.chi] = (perPersona[a.chi] ?? 0) + Number(a.importo);
  return { fatto, manca, percentuale: Math.min(100, (fatto / meta) * 100), alMese, raggiunto, indietro, perPersona };
}

function sottotitolo(o: Obiettivo, s: StatoObiettivo) {
  if (s.raggiunto) return "Raggiunto";
  const quando = o.scadenza ? `entro ${new Date(`${o.scadenza}T12:00:00`).toLocaleDateString("it-IT", { month: "long", year: o.scadenza.slice(0, 4) === new Date().getFullYear().toString() ? undefined : "numeric" })}` : "senza scadenza";
  const quota = o.automatico && o.quota_auto ? `${euro(Number(o.quota_auto))}/mese` : s.alMese ? `${euro(s.alMese)}/mese` : null;
  return [quando, quota].filter(Boolean).join(" · ");
}

function Barra({ v, colore }: { v: number; colore: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-superficie-3">
      <motion.span className="block h-full rounded-full" style={{ background: colore }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6, ease: [0.22, 0.9, 0.24, 1] }} />
    </span>
  );
}

/* ---------- Vista ---------- */

export function VistaObiettivi({
  obiettivi,
  accantonamenti,
  oggi,
  userId,
  membri,
  nascoste,
  onSalva,
  onElimina,
  onAccantona,
  onTogliAccantonamento,
}: {
  obiettivi: Obiettivo[];
  accantonamenti: Accantonamento[];
  oggi: string;
  userId: string;
  membri: MembroCasa[];
  nascoste: boolean;
  onSalva: (o: Obiettivo) => Promise<void>;
  onElimina: (o: Obiettivo) => Promise<void>;
  onAccantona: (o: Obiettivo, importo: number) => Promise<void>;
  onTogliAccantonamento: (a: Accantonamento) => Promise<void>;
}) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [maschera, setMaschera] = useState<{ obiettivo: Obiettivo | null } | null>(null);
  const totale = accantonamenti.reduce((t, a) => t + Number(a.importo), 0);
  const cifra = (n: number) => (nascoste ? "•••••" : euro(n));
  // In alto quelli in corso, in fondo quelli raggiunti
  const ordinati = useMemo(
    () =>
      obiettivi
        .map((o) => ({ o, s: statoObiettivo(o, accantonamenti, oggi) }))
        .sort((a, b) => Number(a.s.raggiunto) - Number(b.s.raggiunto) || (a.o.scadenza ?? "9999").localeCompare(b.o.scadenza ?? "9999")),
    [obiettivi, accantonamenti, oggi],
  );
  const apertoObiettivo = obiettivi.find((o) => o.id === aperto) ?? null;

  return (
    <div className="mt-6 max-w-3xl lg:mt-0 lg:max-w-none">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.8125rem] text-tenue">Messi da parte</p>
          <p className="titolo-normale numeri text-[2rem] leading-tight">{cifra(Math.max(0, totale))}</p>
        </div>
        <button
          onClick={() => setMaschera({ obiettivo: null })}
          aria-label="Nuovo obiettivo"
          className="anello-focus grid size-11 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </button>
      </div>

      {obiettivi.length === 0 ? (
        <button
          onClick={() => setMaschera({ obiettivo: null })}
          className="anello-focus mt-6 flex w-full items-center gap-4 rounded-[22px] border-2 border-dashed border-linea-forte p-5 text-left text-tenue transition hover:border-becco hover:text-inchiostro"
        >
          <PiggyBank className="size-8 shrink-0" />
          <span>Un viaggio, un fondo per gli imprevisti, il divano nuovo: scegli una cifra e mettete da parte un po&apos; alla volta.</span>
        </button>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4">
        {ordinati.map(({ o, s }) => {
          const Icona = ICONE_OBIETTIVO[o.icona] ?? Target;
          return (
            <motion.button
              key={o.id}
              layout
              onClick={() => setAperto(o.id)}
              className={cn("anello-focus rounded-[22px] bg-superficie-2 p-4 text-left transition hover:bg-superficie-3 active:scale-[0.99]", s.raggiunto && "opacity-75")}
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white" style={{ background: o.colore }}>
                  <Icona className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{o.nome}</span>
                    {s.indietro ? <span className="shrink-0 rounded-full bg-pericolo-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-pericolo">indietro</span> : null}
                    {s.raggiunto ? <span className="shrink-0 rounded-full bg-eco-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-eco">raggiunto</span> : null}
                  </span>
                  <span className="block truncate text-[0.75rem] text-tenue">{sottotitolo(o, s)}</span>
                </span>
                <span className="numeri shrink-0 text-right text-[0.875rem]">
                  <span className="block font-semibold">{cifra(s.fatto)}</span>
                  <span className="text-tenue">di {cifra(Number(o.meta))}</span>
                </span>
              </span>
              <span className="mt-3 block">
                <Barra v={s.percentuale} colore={o.colore} />
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {apertoObiettivo ? (
          <SchedaObiettivo
            key={apertoObiettivo.id}
            obiettivo={apertoObiettivo}
            stato={statoObiettivo(apertoObiettivo, accantonamenti, oggi)}
            membri={membri}
            nascoste={nascoste}
            onChiudi={() => setAperto(null)}
            onModifica={() => setMaschera({ obiettivo: apertoObiettivo })}
            onAccantona={(n) => onAccantona(apertoObiettivo, n)}
            storico={accantonamenti.filter((a) => a.obiettivo_id === apertoObiettivo.id)}
            onTogli={onTogliAccantonamento}
            onAutomatico={(attivo, quota, giorno) => onSalva({ ...apertoObiettivo, automatico: attivo, quota_auto: quota, giorno_auto: giorno })}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {maschera ? (
          <MascheraObiettivo
            obiettivo={maschera.obiettivo}
            userId={userId}
            onAnnulla={() => setMaschera(null)}
            onElimina={
              maschera.obiettivo
                ? async () => {
                    const o = maschera.obiettivo!;
                    setMaschera(null);
                    setAperto(null);
                    await onElimina(o);
                  }
                : undefined
            }
            onSalva={async (o) => {
              setMaschera(null);
              await onSalva(o);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Un obiettivo aperto ---------- */

function Velo({ onChiudi, children, etichetta }: { onChiudi: () => void; children: React.ReactNode; etichetta: string }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);
  return (
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
        aria-label={etichetta}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="pb-sicuro relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[32px] bg-superficie p-5 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function SchedaObiettivo({
  obiettivo: o,
  stato: s,
  membri,
  nascoste,
  onChiudi,
  onModifica,
  onAccantona,
  onAutomatico,
  storico,
  onTogli,
}: {
  obiettivo: Obiettivo;
  stato: StatoObiettivo;
  storico: Accantonamento[];
  onTogli: (a: Accantonamento) => Promise<void>;
  membri: MembroCasa[];
  nascoste: boolean;
  onChiudi: () => void;
  onModifica: () => void;
  onAccantona: (importo: number) => Promise<void>;
  onAutomatico: (attivo: boolean, quota: number | null, giorno: number | null) => Promise<void>;
}) {
  const Icona = ICONE_OBIETTIVO[o.icona] ?? Target;
  const [azione, setAzione] = useState<null | "metti" | "riprendi">(null);
  const [importo, setImporto] = useState("");
  const [quota, setQuota] = useState(String(o.quota_auto ?? s.alMese ?? ""));
  const [giorno, setGiorno] = useState(String(o.giorno_auto ?? 27));
  const cifra = (n: number) => (nascoste ? "•••••" : euro(n));
  const di = o.di_chi ? membri.find((m) => m.id === o.di_chi)?.nome.split(" ")[0] : null;
  const scadenza = o.scadenza ? new Date(`${o.scadenza}T12:00:00`).toLocaleDateString("it-IT", { month: "long", year: "numeric" }) : null;

  async function conferma(e: FormEvent) {
    e.preventDefault();
    const n = Number(importo.replace(",", "."));
    if (!(n > 0)) return;
    await onAccantona(azione === "riprendi" ? -Math.min(n, s.fatto) : n);
    setAzione(null);
    setImporto("");
  }

  function salvaAutomatico(attivo: boolean) {
    const q = Number(quota.replace(",", "."));
    const g = Math.min(28, Math.max(1, Number(giorno) || 27));
    onAutomatico(attivo, q > 0 ? q : null, g);
  }

  return (
    <Velo onChiudi={onChiudi} etichetta={o.nome}>
      <div className="absolute right-4 top-4 flex gap-2">
        <button onClick={onModifica} aria-label="Modifica obiettivo" title="Modifica" className="anello-focus grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
          <Pencil className="size-4" />
        </button>
        <button onClick={onChiudi} aria-label="Chiudi" className="anello-focus grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
          <X className="size-4" />
        </button>
      </div>
      <button onClick={onModifica} className="anello-focus flex items-center gap-3 rounded-[16px] pr-24 text-left">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] text-white" style={{ background: o.colore }}>
          <Icona className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="titolo block truncate text-[1.375rem]">{o.nome.toLowerCase()}</span>
          <span className="block text-[0.8125rem] text-tenue">
            {scadenza ? `Entro ${scadenza}` : "Senza scadenza"} · {di ? `di ${di}` : "di casa"}
          </span>
        </span>
      </button>

      <p className="numeri mt-5 text-[2rem] font-semibold leading-none">
        {cifra(s.fatto)} <span className="text-[1rem] font-normal text-tenue">di {cifra(Number(o.meta))}</span>
      </p>
      <div className="mt-3">
        <Barra v={s.percentuale} colore={o.colore} />
      </div>
      <p className="mt-2 text-[0.8125rem] text-tenue">
        {s.raggiunto ? (
          "Obiettivo raggiunto."
        ) : s.alMese ? (
          <>
            Mancano {cifra(s.manca)}: servono <strong className="text-inchiostro">{cifra(s.alMese)} al mese</strong> per arrivarci.
          </>
        ) : (
          <>Mancano {cifra(s.manca)}.</>
        )}
      </p>

      {Object.keys(s.perPersona).length > 1 || (Object.keys(s.perPersona).length === 1 && !o.di_chi) ? (
        <div className="mt-4 flex flex-wrap gap-2 text-[0.8125rem]">
          {membri
            .filter((m) => s.perPersona[m.id])
            .map((m) => (
              <span key={m.id} className="flex items-center gap-2 rounded-full bg-superficie-2 px-3 py-1.5">
                <span className="size-2.5 rounded-full" style={{ background: m.colore }} />
                {m.nome.split(" ")[0]} {cifra(s.perPersona[m.id])}
              </span>
            ))}
        </div>
      ) : null}

      {!s.raggiunto ? (
        <div className="mt-4 rounded-[18px] bg-superficie-2 p-3">
          <div className="flex items-center gap-3">
            <Repeat className="size-5 shrink-0 text-tenue" />
            <span className="flex-1 text-[0.875rem]">
              {o.automatico && o.quota_auto ? (
                <>
                  Ogni mese il {o.giorno_auto}
                  <br />
                  <span className="text-tenue">metti da parte {cifra(Number(o.quota_auto))}</span>
                </>
              ) : (
                <>
                  Ogni mese, in automatico
                  <br />
                  <span className="text-tenue">una cifra fissa, il giorno che scegli</span>
                </>
              )}
            </span>
            <button
              role="switch"
              aria-checked={o.automatico}
              aria-label="Accantonamento automatico"
              onClick={() => salvaAutomatico(!o.automatico)}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", o.automatico ? "bg-becco" : "bg-superficie-3")}
            >
              <motion.span layout className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow", o.automatico ? "right-0.5" : "left-0.5")} />
            </button>
          </div>
          {o.automatico ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-[0.75rem] text-tenue">
              <label className="flex flex-col gap-1">
                Quanto
                <input
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  onBlur={() => salvaAutomatico(true)}
                  inputMode="decimal"
                  className="numeri campo-linea h-9 text-[1rem] text-inchiostro"
                />
              </label>
              <label className="flex flex-col gap-1">
                Giorno del mese
                <input
                  value={giorno}
                  onChange={(e) => setGiorno(e.target.value)}
                  onBlur={() => salvaAutomatico(true)}
                  inputMode="numeric"
                  className="numeri campo-linea h-9 text-[1rem] text-inchiostro"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {storico.length ? <Storico storico={storico} membri={membri} nascoste={nascoste} onTogli={onTogli} /> : null}

      <AnimatePresence initial={false} mode="wait">
        {azione ? (
          <motion.form key="importo" onSubmit={conferma} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[0.75rem] text-tenue">
              {azione === "metti" ? "Quanto metti da parte" : "Quanto riprendi"}
              <input
                autoFocus
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="numeri campo-linea h-11 text-[1.25rem] text-inchiostro"
              />
            </label>
            <Pulsante type="submit" disabled={!(Number(importo.replace(",", ".")) > 0)}>
              Ok
            </Pulsante>
            <Pulsante type="button" variante="fantasma" onClick={() => setAzione(null)}>
              Annulla
            </Pulsante>
          </motion.form>
        ) : (
          <motion.div key="pulsanti" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setAzione("metti")} className="anello-focus flex h-12 items-center justify-center rounded-full bg-becco font-semibold text-su-becco transition hover:bg-becco-hover active:scale-[0.98]">
              Metti da parte
            </button>
            <button
              onClick={() => setAzione("riprendi")}
              disabled={s.fatto <= 0}
              className="anello-focus flex h-12 items-center justify-center rounded-full font-semibold ring-1 ring-linea transition hover:bg-superficie-2 disabled:opacity-50"
            >
              Riprendi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Velo>
  );
}

/** Gli ultimi movimenti dell'obiettivo: si possono togliere quelli sbagliati */
function Storico({ storico, membri, nascoste, onTogli }: { storico: Accantonamento[]; membri: MembroCasa[]; nascoste: boolean; onTogli: (a: Accantonamento) => Promise<void> }) {
  const [tutti, setTutti] = useState(false);
  const [conferma, setConferma] = useState<string | null>(null);
  const ordinati = storico.slice().sort((a, b) => b.data.localeCompare(a.data) || b.creato_il.localeCompare(a.creato_il));
  const visibili = tutti ? ordinati : ordinati.slice(0, 3);
  return (
    <div className="mt-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Movimenti</p>
      <ul className="mt-1">
        {visibili.map((a) => {
          const chi = membri.find((m) => m.id === a.chi)?.nome.split(" ")[0];
          const quando = new Date(`${a.data}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
          return (
            <li key={a.id} className="flex items-center gap-2 border-b border-linea py-2 text-[0.875rem] last:border-0">
              <span className="flex-1 text-tenue">
                {quando}
                {chi ? ` · ${chi}` : ""}
                {a.automatico ? " · automatico" : ""}
              </span>
              <span className={cn("numeri font-semibold", Number(a.importo) < 0 && "text-pericolo")}>
                {nascoste ? "•••••" : `${Number(a.importo) > 0 ? "+" : "−"}${euro(Math.abs(Number(a.importo)))}`}
              </span>
              {conferma === a.id ? (
                <button onClick={() => (setConferma(null), onTogli(a))} className="anello-focus rounded-full bg-pericolo px-3 py-1 text-[0.75rem] font-semibold text-white">
                  Togli
                </button>
              ) : (
                <button onClick={() => setConferma(a.id)} aria-label="Togli questo movimento" className="anello-focus grid size-7 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {ordinati.length > 3 ? (
        <button onClick={() => setTutti((t) => !t)} className="anello-focus mt-1 text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
          {tutti ? "Mostra meno" : `Mostra tutti (${ordinati.length})`}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Nuovo / modifica ---------- */

function MascheraObiettivo({
  obiettivo,
  userId,
  onAnnulla,
  onSalva,
  onElimina,
}: {
  obiettivo: Obiettivo | null;
  userId: string;
  onAnnulla: () => void;
  onSalva: (o: Obiettivo) => Promise<void>;
  onElimina?: () => Promise<void>;
}) {
  const [nome, setNome] = useState(obiettivo?.nome ?? "");
  const [meta, setMeta] = useState(obiettivo ? String(Number(obiettivo.meta)) : "");
  const [scadenza, setScadenza] = useState(obiettivo?.scadenza ?? "");
  const [icona, setIcona] = useState(obiettivo?.icona ?? "target");
  const [colore, setColore] = useState(obiettivo?.colore ?? COLORI[0]);
  const [diCasa, setDiCasa] = useState(obiettivo ? obiettivo.di_chi === null : true);
  const [conferma, setConferma] = useState(false);
  const cifra = Number(meta.replace(",", "."));
  const valido = nome.trim() && cifra > 0;

  function invia(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    onSalva({
      id: obiettivo?.id ?? crypto.randomUUID(),
      famiglia_id: obiettivo?.famiglia_id ?? "",
      nome: nome.trim(),
      meta: cifra,
      scadenza: scadenza || null,
      icona,
      colore,
      di_chi: diCasa ? null : (obiettivo?.di_chi ?? userId),
      automatico: obiettivo?.automatico ?? false,
      quota_auto: obiettivo?.quota_auto ?? null,
      giorno_auto: obiettivo?.giorno_auto ?? null,
      creato_da: obiettivo?.creato_da ?? userId,
      creato_il: obiettivo?.creato_il ?? new Date().toISOString(),
    });
  }

  const Icona = ICONE_OBIETTIVO[icona] ?? Target;
  return (
    <Velo onChiudi={onAnnulla} etichetta={obiettivo ? "Modifica obiettivo" : "Nuovo obiettivo"}>
      <form onSubmit={invia}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[14px] text-white transition-colors" style={{ background: colore }}>
            <Icona className="size-6" />
          </span>
          <p className="titolo text-[1.25rem]">{obiettivo ? "modifica obiettivo" : "nuovo obiettivo"}</p>
        </div>

        <div className="mt-5 grid gap-4 text-[0.8125rem] text-tenue">
          <label className="flex flex-col gap-1">
            Per cosa
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Viaggio in Giappone" required maxLength={60} className="campo-linea h-11 text-[1.0625rem] text-inchiostro" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              Quanto serve
              <input value={meta} onChange={(e) => setMeta(e.target.value)} inputMode="decimal" placeholder="0 €" required className="numeri campo-linea h-11 text-[1.0625rem] text-inchiostro" />
            </label>
            <label className="flex flex-col gap-1">
              Entro (facoltativo)
              <input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="campo-linea h-11 text-[1rem] text-inchiostro" />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            Icona
            <div className="flex flex-wrap gap-2">
              {Object.entries(ICONE_OBIETTIVO).map(([id, I]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcona(id)}
                  aria-label={id}
                  aria-pressed={icona === id}
                  className={cn("anello-focus grid size-10 place-items-center rounded-[12px] transition", icona === id ? "bg-dorso text-su-dorso" : "bg-superficie-2 text-tenue hover:text-inchiostro")}
                >
                  <I className="size-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            Colore
            <div className="flex flex-wrap gap-2">
              {COLORI.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColore(c)}
                  aria-label={`Colore ${c}`}
                  aria-pressed={colore === c}
                  className={cn("anello-focus size-8 rounded-full transition", colore === c && "ring-2 ring-inchiostro ring-offset-2 ring-offset-superficie")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[0.875rem]" role="group" aria-label="Di chi">
            <span>Di chi</span>
            {[
              { v: true, nome: "Di casa" },
              { v: false, nome: "Solo mio" },
            ].map((x) => (
              <button
                key={x.nome}
                type="button"
                onClick={() => setDiCasa(x.v)}
                aria-pressed={diCasa === x.v}
                className={cn("anello-focus underline-offset-4", diCasa === x.v ? "font-semibold text-inchiostro underline decoration-becco decoration-2" : "text-tenue hover:text-inchiostro")}
              >
                {x.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {onElimina ? (
            conferma ? (
              <span className="flex items-center gap-1">
                <Pulsante type="button" variante="pericolo" className="h-10 px-4" onClick={onElimina}>
                  Elimina
                </Pulsante>
                <Pulsante type="button" variante="fantasma" className="h-10 px-3" onClick={() => setConferma(false)}>
                  No
                </Pulsante>
              </span>
            ) : (
              <button type="button" onClick={() => setConferma(true)} aria-label="Elimina obiettivo" className="anello-focus grid size-10 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
                <Trash2 className="size-[18px]" />
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
              Annulla
            </Pulsante>
            <Pulsante type="submit" disabled={!valido}>
              Salva
            </Pulsante>
          </div>
        </div>
      </form>
    </Velo>
  );
}
