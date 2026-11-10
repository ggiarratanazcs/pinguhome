"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Briefcase,
  Car,
  ChevronLeft,
  ChevronRight,
  Circle,
  Gift,
  HeartPulse,
  House,
  PartyPopper,
  PawPrint,
  Plus,
  ShoppingCart,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Conto, Movimento } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { oggiRoma, RICORRENZE } from "@/lib/agenda";
import { CATEGORIE_ENTRATA, CATEGORIE_USCITA, categoria, euro, interpretaMovimento, movimentiTra, residuo, type Occorrenza } from "@/lib/finanze";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AnalisiFinanze } from "./analisi-finanze";

export type VistaFinanze = "conto" | "analisi";

const ICONE: Record<string, LucideIcon> = {
  casa: House,
  spesa: ShoppingCart,
  bollette: Zap,
  trasporti: Car,
  salute: HeartPulse,
  svago: PartyPopper,
  animali: PawPrint,
  regali: Gift,
  stipendio: Briefcase,
  altro: Circle,
};

function aggiornaPerId<T extends { id: string }>(elenco: T[], riga: T) {
  const i = elenco.findIndex((x) => x.id === riga.id);
  if (i === -1) return [...elenco, riga];
  const copia = elenco.slice();
  copia[i] = { ...copia[i], ...riga };
  return copia;
}

function nomeMese(mese: string) {
  const [a, m] = mese.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function spostaMese(mese: string, n: number) {
  const [a, m] = mese.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fineMese(mese: string) {
  const [a, m] = mese.split("-").map(Number);
  return `${mese}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}

function etichettaGiorno(d: string, oggi: string) {
  if (d === oggi) return "Oggi";
  const t = new Date(`${d}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function AppFinanze({
  famigliaId,
  userId,
  membri,
  iniziali,
  vistaIniziale = "conto",
}: {
  famigliaId: string;
  userId: string;
  membri: MembroCasa[];
  iniziali: { conto: Conto | null; movimenti: Movimento[] };
  vistaIniziale?: VistaFinanze;
}) {
  const supabase = useMemo(() => createClient(), []);
  const oggi = oggiRoma();
  const [vista, setVista] = useState<VistaFinanze>(vistaIniziale);
  const [conto, setConto] = useState<Conto | null>(iniziali.conto);
  const [movimenti, setMovimenti] = useState<Movimento[]>(iniziali.movimenti);
  const [maschera, setMaschera] = useState(false);
  const [avviso, setAvviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avvisa = useCallback((t: string) => {
    setAvviso(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAvviso(null), 2400);
  }, []);

  // Tempo reale: spese, scadenze pagate e movimenti dell'altra persona arrivano subito
  useEffect(() => {
    const filtro = `famiglia_id=eq.${famigliaId}`;
    const canale = supabase
      .channel(`finanze-${famigliaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "movimenti", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setMovimenti((x) => x.filter((m) => m.id !== id));
        } else setMovimenti((x) => aggiornaPerId(x, p.new as Movimento));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conti", filter: filtro }, (p) => {
        if (p.eventType !== "DELETE") setConto(p.new as Conto);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [famigliaId, supabase]);

  async function salvaSaldo(saldo: number) {
    const riga = { famiglia_id: famigliaId, saldo, data_saldo: oggi, aggiornato_da: userId, aggiornato_il: new Date().toISOString() };
    setConto(riga);
    const { error } = await supabase.from("conti").upsert(riga);
    if (error) avvisa("Non sono riuscito a salvare il saldo");
  }

  async function crea(m: Omit<Movimento, "id" | "creato_il" | "famiglia_id" | "creato_da" | "origine" | "spesa_id" | "impegno_id" | "impegno_data">) {
    const temporaneo: Movimento = {
      ...m,
      id: crypto.randomUUID(),
      famiglia_id: famigliaId,
      creato_da: userId,
      creato_il: new Date().toISOString(),
      origine: "manuale",
      spesa_id: null,
      impegno_id: null,
      impegno_data: null,
    };
    setMovimenti((x) => [...x, temporaneo]);
    const { error } = await supabase.from("movimenti").insert({ ...m, id: temporaneo.id, famiglia_id: famigliaId, creato_da: userId });
    if (error) {
      setMovimenti((x) => x.filter((y) => y.id !== temporaneo.id));
      avvisa("Non sono riuscito ad aggiungerlo");
    }
  }

  async function elimina(m: Movimento) {
    setMovimenti((x) => x.filter((y) => y.id !== m.id));
    const { error } = await supabase.from("movimenti").delete().eq("id", m.id);
    if (error) {
      setMovimenti((x) => [...x, m]);
      avvisa("Non sono riuscito a eliminarlo");
    }
  }

  const schede: { id: VistaFinanze; nome: string }[] = [
    { id: "conto", nome: "Conto" },
    { id: "analisi", nome: "Analisi" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-1 md:px-12 lg:pt-10">
      <h1 className="titolo titolo-pagina mb-6 hidden lg:block">finanze</h1>
      <nav className="flex items-center gap-5 text-[0.9375rem] md:gap-6">
        {schede.map((s) => {
          const attiva = vista === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setVista(s.id)}
              className={cn("anello-focus relative pb-1.5 transition-colors", attiva ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro")}
            >
              {s.nome}
              {attiva ? <motion.span layoutId="sezione-finanze" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-becco" /> : null}
            </button>
          );
        })}
      </nav>

      {vista === "conto" ? (
        <VistaConto conto={conto} movimenti={movimenti} oggi={oggi} membri={membri} onSaldo={salvaSaldo} onNuovo={() => setMaschera(true)} onElimina={elimina} />
      ) : (
        <AnalisiFinanze movimenti={movimenti} oggi={oggi} />
      )}

      <AnimatePresence>
        {maschera ? (
          <MascheraMovimento
            oggi={oggi}
            membri={membri}
            userId={userId}
            onAnnulla={() => setMaschera(false)}
            onSalva={async (m) => {
              setMaschera(false);
              await crea(m);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {avviso ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90vw] truncate rounded-full bg-dorso px-5 py-3 text-sm font-medium text-su-dorso shadow-xl lg:bottom-10"
          >
            {avviso}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Conto ---------- */

function VistaConto({
  conto,
  movimenti,
  oggi,
  membri,
  onSaldo,
  onNuovo,
  onElimina,
}: {
  conto: Conto | null;
  movimenti: Movimento[];
  oggi: string;
  membri: MembroCasa[];
  onSaldo: (n: number) => Promise<void>;
  onNuovo: () => void;
  onElimina: (m: Movimento) => void;
}) {
  const [mese, setMese] = useState(oggi.slice(0, 7));
  const [allinea, setAllinea] = useState(false);
  const totale = residuo(conto, movimenti, oggi);

  const delMese = useMemo(() => movimentiTra(movimenti, `${mese}-01`, fineMese(mese)).filter((o) => o.data <= oggi), [movimenti, mese, oggi]);
  const entrate = delMese.filter((o) => o.movimento.tipo === "entrata").reduce((t, o) => t + Number(o.movimento.importo), 0);
  const uscite = delMese.filter((o) => o.movimento.tipo === "uscita").reduce((t, o) => t + Number(o.movimento.importo), 0);
  const perGiorno = useMemo(() => {
    const m = new Map<string, Occorrenza[]>();
    for (const o of delMese) m.set(o.data, [...(m.get(o.data) ?? []), o]);
    return [...m.entries()];
  }, [delMese]);
  const nomeMeseCorto = new Date(`${mese}-15T12:00:00`).toLocaleDateString("it-IT", { month: "long" });

  if (!conto) {
    return (
      <div className="mt-8 max-w-md">
        <ImpostaSaldo etichetta="Quanto c'è sul conto oggi?" onSalva={onSaldo} />
      </div>
    );
  }

  return (
    <div className="mt-6 pb-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/casa/salvadanaio.webp" alt="" className="size-16 shrink-0 object-contain drop-shadow-[0_8px_12px_rgba(var(--ombra),0.18)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] text-tenue">Residuo sul conto</p>
              <p className={cn("titolo-normale numeri truncate text-[2rem] leading-tight", (totale ?? 0) < 0 && "text-pericolo")}>{euro(totale ?? 0)}</p>
            </div>
            <button
              onClick={onNuovo}
              aria-label="Nuovo movimento"
              className="anello-focus grid size-12 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-eco-tenue px-4 py-3">
              <p className="text-[0.75rem] text-eco">Entrate {nomeMeseCorto}</p>
              <p className="numeri text-[1.125rem] font-semibold text-inchiostro">+{euro(entrate, false)}</p>
            </div>
            <div className="rounded-[18px] bg-pericolo-tenue px-4 py-3">
              <p className="text-[0.75rem] text-pericolo">Uscite {nomeMeseCorto}</p>
              <p className="numeri text-[1.125rem] font-semibold text-inchiostro">−{euro(uscite, false)}</p>
            </div>
          </div>

          <div className="mt-4">
            {allinea ? (
              <ImpostaSaldo
                etichetta="Saldo vero sul conto oggi"
                iniziale={totale ?? 0}
                onAnnulla={() => setAllinea(false)}
                onSalva={async (n) => {
                  setAllinea(false);
                  await onSaldo(n);
                }}
              />
            ) : (
              <button onClick={() => setAllinea(true)} className="anello-focus text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
                Allinea al saldo vero
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <button onClick={() => setMese((m) => spostaMese(m, -1))} aria-label="Mese precedente" className="anello-focus grid size-9 place-items-center rounded-full hover:bg-superficie-2">
              <ChevronLeft className="size-5" />
            </button>
            <span className="titolo min-w-40 text-center text-[1.0625rem]">{nomeMese(mese)}</span>
            <button onClick={() => setMese((m) => spostaMese(m, 1))} aria-label="Mese successivo" className="anello-focus grid size-9 place-items-center rounded-full hover:bg-superficie-2">
              <ChevronRight className="size-5" />
            </button>
          </div>

          {perGiorno.length === 0 ? (
            <p className="py-8 text-[0.9375rem] text-tenue">Nessun movimento in questo mese.</p>
          ) : (
            <div className="mt-2">
              {perGiorno.map(([d, elenco]) => (
                <section key={d} className="mt-4">
                  <p className="text-[0.8125rem] text-tenue">{etichettaGiorno(d, oggi)}</p>
                  <ul>
                    <AnimatePresence initial={false}>
                      {elenco.map((o) => (
                        <RigaMovimento key={`${o.movimento.id}|${o.data}`} o={o} membri={membri} onElimina={() => onElimina(o.movimento)} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpostaSaldo({
  etichetta,
  iniziale,
  onSalva,
  onAnnulla,
}: {
  etichetta: string;
  iniziale?: number;
  onSalva: (n: number) => Promise<void>;
  onAnnulla?: () => void;
}) {
  const [valore, setValore] = useState(iniziale !== undefined ? iniziale.toFixed(2).replace(".", ",") : "");
  const n = Number(valore.replace(/\./g, "").replace(",", "."));
  const valido = valore.trim() !== "" && Number.isFinite(n);

  function invia(e: FormEvent) {
    e.preventDefault();
    if (valido) onSalva(Math.round(n * 100) / 100);
  }

  return (
    <form onSubmit={invia} className="rounded-[24px] bg-superficie-2 p-5">
      <label className="flex flex-col gap-2 text-[0.875rem] text-tenue">
        {etichetta}
        <span className="flex items-baseline gap-2 border-b-[1.5px] border-linea-forte focus-within:border-becco">
          <span className="text-[1.25rem] text-inchiostro">€</span>
          <input
            autoFocus
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="numeri h-12 w-full bg-transparent text-[1.5rem] text-inchiostro outline-none"
          />
        </span>
      </label>
      <div className="mt-4 flex justify-end gap-2">
        {onAnnulla ? (
          <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
            Annulla
          </Pulsante>
        ) : null}
        <Pulsante type="submit" disabled={!valido}>
          Salva
        </Pulsante>
      </div>
    </form>
  );
}

function RigaMovimento({ o, membri, onElimina }: { o: Occorrenza; membri: MembroCasa[]; onElimina: () => void }) {
  const m = o.movimento;
  const cat = categoria(m.tipo, m.categoria);
  const Icona = ICONE[m.categoria] ?? Circle;
  const [aperta, setAperta] = useState(false);
  const [conferma, setConferma] = useState(false);
  const chi = membri.find((x) => x.id === m.chi);
  const ripete = RICORRENZE.find((r) => r.id === m.ricorrenza && r.id !== "nessuna");
  const sotto =
    m.origine === "spesa"
      ? "dalla Spesa"
      : m.origine === "agenda"
        ? "dall'Agenda"
        : [cat.nome, ripete?.nome.toLowerCase(), chi?.nome].filter(Boolean).join(" · ");

  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-linea">
      <button
        onClick={() => m.origine === "manuale" && (setAperta((a) => !a), setConferma(false))}
        className={cn("anello-focus flex w-full items-center gap-3 py-3 text-left", m.origine !== "manuale" && "cursor-default")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[12px]" style={{ background: `${cat.colore}26`, color: cat.colore }}>
          <Icona className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem]">{m.descrizione || cat.nome}</span>
          <span className="block truncate text-[0.75rem] text-tenue">{sotto}</span>
        </span>
        <span className={cn("numeri shrink-0 text-[0.9375rem] font-semibold", m.tipo === "entrata" ? "text-eco" : "text-inchiostro")}>
          {m.tipo === "entrata" ? "+" : "−"}
          {euro(Number(m.importo))}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {aperta ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex justify-end pb-3">
              {conferma ? (
                <span className="flex items-center gap-2 text-[0.8125rem]">
                  <span className="text-tenue">{ripete ? "Elimino anche le prossime volte?" : "Lo elimino?"}</span>
                  <Pulsante variante="fantasma" className="h-9 px-3 text-sm" onClick={() => setConferma(false)}>
                    No
                  </Pulsante>
                  <Pulsante variante="pericolo" className="h-9 px-3 text-sm" onClick={onElimina}>
                    Elimina
                  </Pulsante>
                </span>
              ) : (
                <Pulsante variante="secondario" className="h-9 px-3 text-sm" onClick={() => setConferma(true)}>
                  <Trash2 className="size-4" /> Elimina
                </Pulsante>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

/* ---------- Nuovo movimento ---------- */

type NuovoMovimento = Pick<Movimento, "tipo" | "importo" | "data" | "categoria" | "descrizione" | "chi" | "ricorrenza">;

function MascheraMovimento({
  oggi,
  membri,
  userId,
  onAnnulla,
  onSalva,
}: {
  oggi: string;
  membri: MembroCasa[];
  userId: string;
  onAnnulla: () => void;
  onSalva: (m: NuovoMovimento) => Promise<void>;
}) {
  const [testo, setTesto] = useState("");
  const [tipo, setTipo] = useState<Movimento["tipo"]>("uscita");
  const [importo, setImporto] = useState("");
  const [cat, setCat] = useState("altro");
  const [data, setData] = useState(oggi);
  const [ricorrenza, setRicorrenza] = useState<Movimento["ricorrenza"]>("nessuna");
  const [chi, setChi] = useState<string | null>(userId);
  const [toccati, setToccati] = useState<Set<string>>(new Set());
  const tocca = (c: string) => setToccati((t) => new Set(t).add(c));

  // Mentre scrivi ("cena 45", "stipendio 1500") compila i campi che non hai cambiato a mano
  function scrivi(t: string) {
    setTesto(t);
    const l = interpretaMovimento(t);
    if (l.importo !== null && !toccati.has("importo")) setImporto(String(l.importo).replace(".", ","));
    if (!toccati.has("tipo")) setTipo(l.tipo);
    if (!toccati.has("categoria")) setCat(l.categoria);
  }

  const n = Number(importo.replace(/\./g, "").replace(",", "."));
  const valido = importo.trim() !== "" && Number.isFinite(n) && n > 0;
  const categorie = tipo === "entrata" ? CATEGORIE_ENTRATA : CATEGORIE_USCITA;

  function salva(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    const l = interpretaMovimento(testo);
    onSalva({
      tipo,
      importo: Math.round(n * 100) / 100,
      data,
      categoria: categorie.some((c) => c.id === cat) ? cat : "altro",
      descrizione: l.descrizione || categoria(tipo, cat).nome,
      chi,
      ricorrenza,
    });
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onAnnulla();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnulla]);

  const scelte = [...membri.map((m) => ({ id: m.id as string | null, nome: m.id === userId ? "Io" : m.nome.split(" ")[0] })), { id: null as string | null, nome: "Entrambi" }];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/45 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onAnnulla}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label="Nuovo movimento"
        onSubmit={salva}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="pb-sicuro w-full max-w-md rounded-[28px] bg-superficie p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="titolo whitespace-nowrap text-[1.0625rem]">nuovo movimento</p>
          <div className="flex rounded-full bg-superficie-2 p-1 text-[0.8125rem]">
            {(["uscita", "entrata"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => (tocca("tipo"), setTipo(t), setCat((c) => ((t === "entrata" ? CATEGORIE_ENTRATA : CATEGORIE_USCITA).some((x) => x.id === c) ? c : "altro")))}
                aria-pressed={tipo === t}
                className={cn(
                  "anello-focus h-8 rounded-full px-3 capitalize transition",
                  tipo === t ? (t === "entrata" ? "bg-eco font-semibold text-white" : "bg-dorso font-semibold text-su-dorso") : "text-tenue",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <input
          autoFocus
          value={testo}
          onChange={(e) => scrivi(e.target.value)}
          placeholder="Es. cena 45"
          className="campo-linea mt-4 h-12 w-full text-[1.125rem] text-inchiostro placeholder:text-tenue/60"
        />

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.8125rem] text-tenue">
          <label className="flex flex-col gap-1">
            Importo
            <span className="flex items-baseline gap-1 border-b-[1.5px] border-linea-forte focus-within:border-becco">
              <span>€</span>
              <input value={importo} onChange={(e) => (tocca("importo"), setImporto(e.target.value))} inputMode="decimal" placeholder="0,00" required className="numeri h-10 w-full bg-transparent text-inchiostro outline-none" />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            Categoria
            <select value={cat} onChange={(e) => (tocca("categoria"), setCat(e.target.value))} className="campo-linea h-10 text-inchiostro">
              {categorie.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Giorno
            <input type="date" value={data} onChange={(e) => setData(e.target.value || data)} required className="campo-linea h-10 text-inchiostro" />
          </label>
          <label className="flex flex-col gap-1">
            Si ripete
            <select value={ricorrenza} onChange={(e) => setRicorrenza(e.target.value as Movimento["ricorrenza"])} className="campo-linea h-10 text-inchiostro">
              {RICORRENZE.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3 text-[0.875rem]" role="group" aria-label="Chi">
          <span className="text-tenue">chi</span>
          {scelte.map((c) => (
            <button
              key={c.id ?? "entrambi"}
              type="button"
              onClick={() => setChi(c.id)}
              aria-pressed={chi === c.id}
              className={cn(
                "anello-focus underline-offset-4 transition",
                chi === c.id ? "font-semibold text-inchiostro underline decoration-becco decoration-2" : "text-tenue hover:text-inchiostro",
              )}
            >
              {c.nome}
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
            Annulla
          </Pulsante>
          <Pulsante type="submit" disabled={!valido}>
            Aggiungi
          </Pulsante>
        </div>
      </motion.form>
    </motion.div>
  );
}

