"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Repeat, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Impegno, ImpegnoFatto } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import {
  CATEGORIE,
  PROMEMORIA_CON_ORA,
  PROMEMORIA_SENZA_ORA,
  RICORRENZE,
  daData,
  formattaEuro,
  giornoSettimana,
  interpretaImpegno,
  occorrenze,
  oggiRoma,
  piuGiorni,
  promemoriaPredefinito,
} from "@/lib/agenda";
import { Avatar, Pulsante } from "@/components/ui";
import { Mascotte } from "@/components/mascotte";
import { cn } from "@/lib/utils";

type Occorrenza = { impegno: Impegno; data: string; fatto: boolean };

const GIORNI_BREVI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function aggiornaPerId<T extends { id: string }>(elenco: T[], riga: T) {
  const i = elenco.findIndex((x) => x.id === riga.id);
  if (i === -1) return [...elenco, riga];
  const copia = elenco.slice();
  copia[i] = { ...copia[i], ...riga };
  return copia;
}

function chiaveFatto(f: Pick<ImpegnoFatto, "impegno_id" | "data">) {
  return `${f.impegno_id}|${f.data}`;
}

function coloreCategoria(c: Impegno["categoria"]) {
  return CATEGORIE.find((x) => x.id === c)?.colore ?? "#737a99";
}

function etichettaGiorno(d: string, oggi: string) {
  if (d === oggi) return "oggi";
  if (d === piuGiorni(oggi, 1)) return "domani";
  if (d === piuGiorni(oggi, -1)) return "ieri";
  return daData(d).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function etichettaBreve(d: string, oggi: string) {
  if (d === oggi) return "oggi";
  if (d === piuGiorni(oggi, 1)) return "domani";
  return daData(d).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function AppAgenda({
  famigliaId,
  userId,
  membri,
  iniziali,
}: {
  famigliaId: string;
  userId: string;
  membri: MembroCasa[];
  iniziali: { impegni: Impegno[]; fatti: ImpegnoFatto[] };
}) {
  const supabase = useMemo(() => createClient(), []);
  const oggi = oggiRoma();
  const [impegni, setImpegni] = useState(iniziali.impegni);
  const [fatti, setFatti] = useState(() => new Set(iniziali.fatti.map(chiaveFatto)));
  const [anno, setAnno] = useState(Number(oggi.slice(0, 4)));
  const [mese, setMese] = useState(Number(oggi.slice(5, 7)) - 1);
  const [giorno, setGiorno] = useState<string | null>(null);
  const [maschera, setMaschera] = useState<string | null>(null); // giorno proposto nella maschera di inserimento
  const ultimoTocco = useRef<{ giorno: string; quando: number } | null>(null);

  /** Un tocco sceglie il giorno; due tocchi ravvicinati aprono la maschera per aggiungere un impegno. */
  function toccaGiorno(d: string, adesso: number) {
    const prima = ultimoTocco.current;
    ultimoTocco.current = { giorno: d, quando: adesso };
    if (prima && prima.giorno === d && adesso - prima.quando < 350) {
      ultimoTocco.current = null;
      setMaschera(d);
      return;
    }
    setGiorno(d);
  }
  const [avviso, setAvviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avvisa = useCallback((t: string) => {
    setAvviso(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAvviso(null), 2400);
  }, []);

  // Tempo reale: gli impegni aggiunti o spuntati dall'altra persona arrivano subito
  useEffect(() => {
    const filtro = `famiglia_id=eq.${famigliaId}`;
    const canale = supabase
      .channel(`agenda-${famigliaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "impegni", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setImpegni((x) => x.filter((i) => i.id !== id));
        } else setImpegni((x) => aggiornaPerId(x, p.new as Impegno));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "impegni_fatti", filter: filtro }, (p) => {
        setFatti((s) => {
          const n = new Set(s);
          if (p.eventType === "DELETE") n.delete(chiaveFatto(p.old as ImpegnoFatto));
          else n.add(chiaveFatto(p.new as ImpegnoFatto));
          return n;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [famigliaId, supabase]);

  const occorrenzeTra = useCallback(
    (da: string, a: string): Occorrenza[] =>
      impegni
        .flatMap((imp) => occorrenze(imp, da, a).map((d) => ({ impegno: imp, data: d, fatto: fatti.has(`${imp.id}|${d}`) })))
        .sort((x, y) => x.data.localeCompare(y.data) || (x.impegno.ora ?? "99").localeCompare(y.impegno.ora ?? "99")),
    [impegni, fatti],
  );

  // Calendario del mese
  const inizioMese = `${anno}-${String(mese + 1).padStart(2, "0")}-01`;
  const giorniNelMese = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
  const fineMese = piuGiorni(inizioMese, giorniNelMese - 1);
  const delMese = useMemo(() => occorrenzeTra(inizioMese, fineMese), [occorrenzeTra, inizioMese, fineMese]);
  const nomeMese = daData(inizioMese).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
  const scadenzeMese = delMese.filter((o) => o.impegno.importo !== null);
  const totaleScadenze = scadenzeMese.reduce((t, o) => t + Number(o.impegno.importo), 0);
  const daPagare = scadenzeMese.filter((o) => !o.fatto).reduce((t, o) => t + Number(o.impegno.importo), 0);

  function cambiaMese(delta: number) {
    const d = new Date(Date.UTC(anno, mese + delta, 1));
    setAnno(d.getUTCFullYear());
    setMese(d.getUTCMonth());
    setGiorno(null);
  }

  // Elenco a destra: il giorno scelto, oppure i prossimi 30 giorni (più quello rimasto indietro)
  const elenco = useMemo(() => {
    if (giorno) return occorrenzeTra(giorno, giorno);
    const indietro = occorrenzeTra(piuGiorni(oggi, -14), piuGiorni(oggi, -1)).filter((o) => !o.fatto && o.impegno.ricorrenza === "nessuna");
    return [...indietro, ...occorrenzeTra(oggi, piuGiorni(oggi, 30))];
  }, [giorno, occorrenzeTra, oggi]);

  const perGiorno = useMemo(() => {
    const m = new Map<string, Occorrenza[]>();
    for (const o of elenco) m.set(o.data, [...(m.get(o.data) ?? []), o]);
    return [...m.entries()];
  }, [elenco]);

  /* ---------- Azioni ---------- */

  async function crea(nuovo: Omit<Impegno, "id" | "creato_il" | "creato_da" | "famiglia_id">) {
    const riga: Impegno = { ...nuovo, id: crypto.randomUUID(), famiglia_id: famigliaId, creato_da: userId, creato_il: new Date().toISOString() };
    setImpegni((x) => aggiornaPerId(x, riga));
    const { error } = await supabase.from("impegni").insert(riga);
    if (error) {
      setImpegni((x) => x.filter((i) => i.id !== riga.id));
      avvisa("Non sono riuscito a salvare l'impegno: riprova.");
      return;
    }
    avvisa(`${riga.titolo}: ${etichettaBreve(riga.data, oggi)}${riga.ora ? ` alle ${riga.ora.slice(0, 5)}` : ""}`);
  }

  async function modifica(imp: Impegno, m: Partial<Impegno>) {
    setImpegni((x) => aggiornaPerId(x, { ...imp, ...m }));
    await supabase.from("impegni").update(m).eq("id", imp.id);
  }

  async function elimina(imp: Impegno) {
    setImpegni((x) => x.filter((i) => i.id !== imp.id));
    await supabase.from("impegni").delete().eq("id", imp.id);
    avvisa(`${imp.titolo} eliminato`);
  }

  async function segnaFatto(o: Occorrenza) {
    const k = `${o.impegno.id}|${o.data}`;
    if (navigator.vibrate) navigator.vibrate(8);
    if (o.fatto) {
      setFatti((s) => {
        const n = new Set(s);
        n.delete(k);
        return n;
      });
      await supabase.from("impegni_fatti").delete().eq("impegno_id", o.impegno.id).eq("data", o.data);
    } else {
      setFatti((s) => new Set(s).add(k));
      await supabase.from("impegni_fatti").insert({ impegno_id: o.impegno.id, famiglia_id: famigliaId, data: o.data });
    }
  }

  const vuota = impegni.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-1 md:px-12 lg:pt-10">
      <div className="flex items-center justify-end gap-4 lg:justify-between">
        <h1 className="titolo titolo-pagina hidden lg:block">agenda</h1>
        <button
          onClick={() => setMaschera(giorno ?? oggi)}
          aria-label="Nuovo impegno"
          className="anello-focus grid size-12 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Calendario */}
        <section className="min-w-0">
          <div className="flex items-center gap-1">
            <button onClick={() => cambiaMese(-1)} aria-label="Mese precedente" className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro">
              <ChevronLeft className="size-5" />
            </button>
            <p className="titolo-normale min-w-[10.5rem] text-center text-[1.25rem]">{nomeMese}</p>
            <button onClick={() => cambiaMese(1)} aria-label="Mese successivo" className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro">
              <ChevronRight className="size-5" />
            </button>
            {inizioMese !== `${oggi.slice(0, 7)}-01` ? (
              <button
                onClick={() => {
                  setAnno(Number(oggi.slice(0, 4)));
                  setMese(Number(oggi.slice(5, 7)) - 1);
                  setGiorno(null);
                }}
                className="anello-focus ml-2 text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro"
              >
                oggi
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 md:gap-1.5">
            {GIORNI_BREVI.map((g) => (
              <div key={g} className="pb-1 text-center text-[0.75rem] text-tenue">{g}</div>
            ))}
            {Array.from({ length: giornoSettimana(inizioMese) }, (_, i) => (
              <div key={`v${i}`} />
            ))}
            {Array.from({ length: giorniNelMese }, (_, i) => {
              const d = piuGiorni(inizioMese, i);
              const delGiorno = delMese.filter((o) => o.data === d);
              const selezionato = giorno === d;
              const eOggi = d === oggi;
              const passato = d < oggi;
              return (
                <button
                  key={d}
                  onClick={(e) => toccaGiorno(d, e.timeStamp)}
                  aria-pressed={selezionato}
                  aria-label={`${i + 1} ${nomeMese}${delGiorno.length ? `: ${delGiorno.length} impegni` : ""}`}
                  className={cn(
                    "anello-focus flex aspect-square flex-col items-start justify-between rounded-[14px] p-1.5 text-left transition md:aspect-[1.15] md:rounded-[16px] md:p-2.5",
                    selezionato ? "bg-dorso text-su-dorso" : delGiorno.length ? "bg-superficie-2 hover:bg-superficie-3" : "hover:bg-superficie-2",
                    passato && !selezionato && "text-tenue",
                    eOggi && !selezionato && "ring-2 ring-inset ring-becco",
                  )}
                >
                  <span className="numeri text-[0.8125rem] md:text-[0.875rem]">{i + 1}</span>
                  {delGiorno.length ? (
                    <span className="flex flex-wrap gap-[3px]">
                      {delGiorno.slice(0, 4).map((o) => (
                        <span
                          key={o.impegno.id}
                          className={cn("size-1.5 rounded-full md:size-2", o.fatto && "opacity-35")}
                          style={{ background: coloreCategoria(o.impegno.categoria) }}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {totaleScadenze > 0 ? (
            <div className={cn("mt-6 flex items-baseline justify-between gap-4 rounded-[20px] px-5 py-4", daPagare > 0 ? "bg-becco-tenue" : "bg-eco-tenue")}>
              <div>
                <p className={cn("text-[0.8125rem]", daPagare > 0 ? "text-becco-scuro" : "text-eco")}>Scadenze di {nomeMese.split(" ")[0]}</p>
                <p className="titolo-normale numeri mt-1 text-[1.5rem] leading-none">{formattaEuro(totaleScadenze)}</p>
              </div>
              <p className={cn("text-right text-[0.8125rem]", daPagare > 0 ? "text-inchiostro-2" : "flex items-center gap-1.5 font-semibold text-eco")}>
                {daPagare > 0 ? (
                  <>
                    ancora da pagare
                    <br />
                    <span className="numeri font-semibold text-inchiostro">{formattaEuro(daPagare)}</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" strokeWidth={2.8} /> tutto pagato
                  </>
                )}
              </p>
            </div>
          ) : null}

          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-tenue">
            {CATEGORIE.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: c.colore }} />
                {c.nome}
              </li>
            ))}
          </ul>
        </section>

        {/* Elenco */}
        <section className="min-w-0">
          <div className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <h2 className="titolo text-[1.125rem]">{giorno ? etichettaGiorno(giorno, oggi) : "prossimi giorni"}</h2>
            {giorno ? (
              <button onClick={() => setGiorno(null)} className="anello-focus text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
                prossimi giorni
              </button>
            ) : null}
          </div>

          {vuota ? (
            <div className="mt-8 flex items-center gap-4">
              <Mascotte className="w-16" />
              <p className="text-[0.9375rem] text-tenue">L&apos;agenda è vuota. Tocca + in alto, oppure due volte su un giorno del calendario.</p>
            </div>
          ) : perGiorno.length === 0 ? (
            <p className="py-6 text-[0.9375rem] text-tenue">{giorno ? "Niente in questo giorno." : "Niente in programma nei prossimi 30 giorni."}</p>
          ) : (
            <div className="flex flex-col">
              {perGiorno.map(([d, elementi]) => (
                <div key={d} className="pt-4">
                  {!giorno ? (
                    <p className={cn("text-[0.8125rem] first-letter:uppercase", d < oggi ? "font-semibold text-pericolo" : d === oggi ? "font-semibold text-becco-scuro" : "text-tenue")}>
                      {d < oggi ? `Rimasto indietro, ${etichettaGiorno(d, oggi)}` : etichettaGiorno(d, oggi)}
                    </p>
                  ) : null}
                  <ul>
                    <AnimatePresence initial={false}>
                      {elementi.map((o) => (
                        <RigaImpegno
                          key={`${o.impegno.id}|${o.data}`}
                          o={o}
                          membri={membri}
                          userId={userId}
                          onFatto={() => segnaFatto(o)}
                          onModifica={(m) => modifica(o.impegno, m)}
                          onElimina={() => elimina(o.impegno)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="pb-16" />

      <AnimatePresence>
        {maschera ? (
          <MascheraImpegno
            key="maschera"
            oggi={oggi}
            giornoIniziale={maschera}
            membri={membri}
            userId={userId}
            onAnnulla={() => setMaschera(null)}
            onSalva={async (n) => {
              setMaschera(null);
              setGiorno(n.data);
              await crea(n);
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

/* ---------- Maschera di inserimento ---------- */

type NuovoImpegno = Omit<Impegno, "id" | "creato_il" | "creato_da" | "famiglia_id">;

function MascheraImpegno({
  oggi,
  giornoIniziale,
  membri,
  userId,
  onAnnulla,
  onSalva,
}: {
  oggi: string;
  giornoIniziale: string;
  membri: MembroCasa[];
  userId: string;
  onAnnulla: () => void;
  onSalva: (n: NuovoImpegno) => Promise<void>;
}) {
  const [titolo, setTitolo] = useState("");
  const [data, setData] = useState(giornoIniziale);
  const [ora, setOra] = useState("");
  const [categoria, setCategoria] = useState<Impegno["categoria"]>("altro");
  const [importo, setImporto] = useState("");
  const [ricorrenza, setRicorrenza] = useState<Impegno["ricorrenza"]>("nessuna");
  const [perChi, setPerChi] = useState<string | null>(null);
  const [promemoria, setPromemoria] = useState<string>("auto");
  const [toccati, setToccati] = useState<Set<string>>(new Set());
  const tocca = (campo: string) => setToccati((t) => new Set(t).add(campo));

  // Mentre scrivi ("alle 18 dentista", "affitto 650 € ogni mese") compila i campi che non hai già cambiato a mano
  function scrivi(t: string) {
    setTitolo(t);
    const l = interpretaImpegno(t, oggi);
    if (l.dataTrovata && !toccati.has("data")) setData(l.data);
    if (l.ora && !toccati.has("ora")) setOra(l.ora);
    if (l.importo !== null && !toccati.has("importo")) setImporto(String(l.importo).replace(".", ","));
    if (l.ricorrenza !== "nessuna" && !toccati.has("ricorrenza")) setRicorrenza(l.ricorrenza);
    if (!toccati.has("categoria")) setCategoria(l.categoria);
  }

  function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const l = interpretaImpegno(titolo, oggi);
    const nome = (l.titolo || titolo).trim();
    if (!nome) return;
    const n = Number(importo.replace(",", "."));
    const oraFinale = ora || null;
    onSalva({
      titolo: nome,
      data,
      ora: oraFinale,
      note: null,
      per_chi: perChi,
      categoria,
      ricorrenza,
      importo: importo.trim() && Number.isFinite(n) ? Math.round(n * 100) / 100 : null,
      promemoria: promemoria === "auto" ? promemoriaPredefinito(categoria, oraFinale) : promemoria === "" ? null : Number(promemoria),
    });
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onAnnulla();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnulla]);

  const opzioniPromemoria = ora ? PROMEMORIA_CON_ORA : PROMEMORIA_SENZA_ORA;
  const scelte = [{ id: null as string | null, nome: "Entrambi" }, ...membri.map((m) => ({ id: m.id as string | null, nome: m.id === userId ? "Io" : m.nome.split(" ")[0] }))];

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
        aria-label="Nuovo impegno"
        onSubmit={salva}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="pb-sicuro w-full max-w-md rounded-[28px] bg-superficie p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="titolo text-[1.125rem]">nuovo impegno</p>
          <p className="text-[0.8125rem] text-tenue first-letter:uppercase">{etichettaBreve(data, oggi)}</p>
        </div>

        <input
          autoFocus
          value={titolo}
          onChange={(e) => scrivi(e.target.value)}
          placeholder="Es. dentista alle 18"
          required
          className="campo-linea mt-4 h-12 w-full text-[1.125rem] text-inchiostro placeholder:text-tenue/60"
        />

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.8125rem] text-tenue">
          <label className="flex flex-col gap-1">
            Giorno
            <input type="date" value={data} onChange={(e) => (tocca("data"), setData(e.target.value || data))} required className="campo-linea h-10 text-inchiostro" />
          </label>
          <label className="flex flex-col gap-1">
            Ora
            <input type="time" value={ora} onChange={(e) => (tocca("ora"), setOra(e.target.value))} className="campo-linea h-10 text-inchiostro" />
          </label>
          <label className="flex flex-col gap-1">
            Tipo
            <select value={categoria} onChange={(e) => (tocca("categoria"), setCategoria(e.target.value as Impegno["categoria"]))} className="campo-linea h-10 text-inchiostro">
              {CATEGORIE.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Si ripete
            <select value={ricorrenza} onChange={(e) => (tocca("ricorrenza"), setRicorrenza(e.target.value as Impegno["ricorrenza"]))} className="campo-linea h-10 text-inchiostro">
              {RICORRENZE.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </label>
          {categoria === "scadenza" || importo ? (
            <label className="flex flex-col gap-1">
              Importo
              <span className="flex items-baseline gap-1 border-b-[1.5px] border-linea-forte focus-within:border-becco">
                <span>€</span>
                <input value={importo} onChange={(e) => (tocca("importo"), setImporto(e.target.value))} inputMode="decimal" placeholder="0,00" className="numeri h-10 w-full bg-transparent text-inchiostro outline-none" />
              </span>
            </label>
          ) : null}
          <label className={cn("flex flex-col gap-1", !(categoria === "scadenza" || importo) && "col-span-2")}>
            Promemoria
            <select value={promemoria} onChange={(e) => setPromemoria(e.target.value)} className="campo-linea h-10 text-inchiostro">
              <option value="auto">{nomeAuto(categoria, ora || null)}</option>
              {opzioniPromemoria.map((p) => (
                <option key={p.nome} value={p.valore === null ? "" : String(p.valore)}>{p.nome}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3 text-[0.875rem]" role="group" aria-label="Per chi">
          <span className="text-tenue">per</span>
          {scelte.map((c) => (
            <button
              key={c.id ?? "entrambi"}
              type="button"
              onClick={() => setPerChi(c.id)}
              aria-pressed={perChi === c.id}
              className={cn(
                "anello-focus underline-offset-4 transition",
                perChi === c.id ? "font-semibold text-inchiostro underline decoration-becco decoration-2" : "text-tenue hover:text-inchiostro",
              )}
            >
              {c.nome}
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>Annulla</Pulsante>
          <Pulsante type="submit" disabled={!titolo.trim()}>Aggiungi</Pulsante>
        </div>
      </motion.form>
    </motion.div>
  );
}

function nomeAuto(categoria: Impegno["categoria"], ora: string | null) {
  const v = promemoriaPredefinito(categoria, ora);
  const elenco = ora ? PROMEMORIA_CON_ORA : PROMEMORIA_SENZA_ORA;
  const nome = elenco.find((p) => p.valore === v)?.nome ?? "Nessun promemoria";
  return `${nome} (consigliato)`;
}

/* ---------- Riga impegno ---------- */

function RigaImpegno({
  o,
  membri,
  userId,
  onFatto,
  onModifica,
  onElimina,
}: {
  o: Occorrenza;
  membri: MembroCasa[];
  userId: string;
  onFatto: () => void;
  onModifica: (m: Partial<Impegno>) => void;
  onElimina: () => void;
}) {
  const [aperta, setAperta] = useState(false);
  const imp = o.impegno;
  const chi = membri.find((m) => m.id === imp.per_chi);
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-linea">
      <div className="flex items-center gap-3 py-3">
        <button
          onClick={onFatto}
          aria-label={o.fatto ? "Segna come da fare" : imp.importo !== null ? "Segna come pagata" : "Segna come fatto"}
          className={cn(
            "anello-focus grid size-[24px] shrink-0 place-items-center rounded-full border-2 transition-colors",
            o.fatto ? "border-becco bg-becco text-su-becco" : "border-linea-forte hover:border-becco",
          )}
        >
          {o.fatto ? <Check className="size-3.5" strokeWidth={3.2} /> : null}
        </button>
        <span className="numeri w-11 shrink-0 text-[0.875rem] font-semibold text-inchiostro-2">{imp.ora ? imp.ora.slice(0, 5) : ""}</span>
        <button onClick={() => setAperta((a) => !a)} className="anello-focus min-w-0 flex-1 text-left">
          <span className={cn("flex items-center gap-2 text-[1rem]", o.fatto && "text-tenue line-through decoration-tenue/50")}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: coloreCategoria(imp.categoria) }} />
            <span className="truncate">{imp.titolo}</span>
            {imp.ricorrenza !== "nessuna" ? <Repeat className="size-3.5 shrink-0 text-tenue" aria-label="si ripete" /> : null}
            {imp.promemoria !== null ? <Bell className="size-3.5 shrink-0 text-tenue" aria-label="con promemoria" /> : null}
          </span>
          {imp.note ? <span className="mt-0.5 block truncate pl-4 text-[0.8125rem] text-tenue">{imp.note}</span> : null}
        </button>
        {imp.importo !== null ? (
          <span className={cn("numeri shrink-0 text-[0.9375rem] font-semibold", o.fatto ? "text-tenue line-through" : "text-inchiostro")}>{formattaEuro(Number(imp.importo))}</span>
        ) : null}
        {chi ? (
          <Avatar nome={chi.nome} colore={chi.colore} className="size-6 text-[0.5625rem]" />
        ) : (
          <span className="flex -space-x-1.5" title="Per entrambi">
            {membri.slice(0, 2).map((m) => (
              <Avatar key={m.id} nome={m.nome} colore={m.colore} className="size-5 text-[0.5rem] opacity-70" />
            ))}
          </span>
        )}
        <button onClick={() => setAperta((a) => !a)} aria-label="Dettagli" className="anello-focus grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-superficie-3">
          <motion.span animate={{ rotate: aperta ? 180 : 0 }} className="inline-flex">
            <ChevronDown className="size-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {aperta ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[20px] bg-superficie-2 p-4 text-[0.8125rem] text-tenue sm:grid-cols-3">
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
                Titolo
                <input defaultValue={imp.titolo} onBlur={(e) => e.target.value.trim() && e.target.value !== imp.titolo && onModifica({ titolo: e.target.value.trim() })} className="campo-linea h-9 text-[0.9375rem] text-inchiostro" />
              </label>
              <label className="flex flex-col gap-1">
                Giorno{imp.ricorrenza !== "nessuna" ? " di partenza" : ""}
                <input type="date" defaultValue={imp.data} onChange={(e) => e.target.value && onModifica({ data: e.target.value })} className="campo-linea h-9 text-inchiostro" />
              </label>
              <label className="flex flex-col gap-1">
                Ora
                <input type="time" defaultValue={imp.ora?.slice(0, 5) ?? ""} onChange={(e) => onModifica({ ora: e.target.value || null })} className="campo-linea h-9 text-inchiostro" />
              </label>
              <label className="flex flex-col gap-1">
                Si ripete
                <select value={imp.ricorrenza} onChange={(e) => onModifica({ ricorrenza: e.target.value as Impegno["ricorrenza"] })} className="campo-linea h-9 text-inchiostro">
                  {RICORRENZE.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Tipo
                <select value={imp.categoria} onChange={(e) => onModifica({ categoria: e.target.value as Impegno["categoria"] })} className="campo-linea h-9 text-inchiostro">
                  {CATEGORIE.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Per chi
                <select value={imp.per_chi ?? ""} onChange={(e) => onModifica({ per_chi: e.target.value || null })} className="campo-linea h-9 text-inchiostro">
                  <option value="">Entrambi</option>
                  {membri.map((m) => (
                    <option key={m.id} value={m.id}>{m.id === userId ? `${m.nome} (io)` : m.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Importo
                <span className="flex items-baseline gap-1 border-b-[1.5px] border-linea-forte focus-within:border-becco">
                  <span>€</span>
                  <input
                    defaultValue={imp.importo === null ? "" : String(imp.importo).replace(".", ",")}
                    inputMode="decimal"
                    placeholder="—"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const n = Number(v.replace(",", "."));
                      if (v === "") onModifica({ importo: null });
                      else if (Number.isFinite(n) && n >= 0) onModifica({ importo: Math.round(n * 100) / 100, categoria: imp.categoria === "altro" ? "scadenza" : imp.categoria });
                    }}
                    className="numeri h-9 w-full bg-transparent text-inchiostro outline-none"
                  />
                </span>
              </label>
              <label className="flex flex-col gap-1">
                Promemoria
                <select
                  value={imp.promemoria === null ? "" : String(imp.promemoria)}
                  onChange={(e) => onModifica({ promemoria: e.target.value === "" ? null : Number(e.target.value) })}
                  className="campo-linea h-9 text-inchiostro"
                >
                  {(imp.ora ? PROMEMORIA_CON_ORA : PROMEMORIA_SENZA_ORA).map((p) => (
                    <option key={p.nome} value={p.valore === null ? "" : String(p.valore)}>{p.nome}</option>
                  ))}
                  {imp.promemoria !== null && !(imp.ora ? PROMEMORIA_CON_ORA : PROMEMORIA_SENZA_ORA).some((p) => p.valore === imp.promemoria) ? (
                    <option value={String(imp.promemoria)}>{Math.round(imp.promemoria / 60)} ore prima</option>
                  ) : null}
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1 sm:col-span-2">
                Nota
                <input defaultValue={imp.note ?? ""} placeholder="Indirizzo, cosa portare…" onBlur={(e) => e.target.value !== (imp.note ?? "") && onModifica({ note: e.target.value || null })} className="campo-linea h-9 text-inchiostro" />
              </label>
              <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                <Pulsante variante="pericolo" onClick={onElimina} className="h-9 px-4 text-sm">
                  <Trash2 className="size-4" /> Elimina{imp.ricorrenza !== "nessuna" ? " tutte" : ""}
                </Pulsante>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
