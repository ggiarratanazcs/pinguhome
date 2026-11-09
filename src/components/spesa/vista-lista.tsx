"use client";

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Check, ChevronDown, CornerDownLeft, Flame, Loader2, Minus, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { Lista, Reparto, VoceLista } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { interpretaVoce, UNITA } from "@/lib/spesa";
import { Avatar, Pulsante } from "@/components/ui";
import { Pinguino } from "@/components/pinguino";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { IconaReparto } from "./icona-reparto";
import { AllegaScontrino } from "./allega-scontrino";

export function VistaLista({
  voci,
  dati,
  membri,
  userId,
  azioni,
}: {
  lista: Lista;
  voci: VoceLista[];
  dati: DatiSpesa;
  membri: MembroCasa[];
  userId: string;
  azioni: AzioniSpesa;
}) {
  const [carrelloAperto, setCarrelloAperto] = useState(false);
  const daPrendere = voci.filter((v) => !v.presa);
  const prese = voci.filter((v) => v.presa).sort((a, b) => (b.presa_il ?? "").localeCompare(a.presa_il ?? ""));

  // Raggruppa per reparto, nell'ordine dei corridoi; le urgenti in cima al proprio reparto
  const gruppi = useMemo(() => {
    const perReparto = new Map<string, VoceLista[]>();
    for (const v of daPrendere) {
      const k = v.reparto_id ?? "altro";
      perReparto.set(k, [...(perReparto.get(k) ?? []), v]);
    }
    const ordinati = [...dati.reparti].sort((a, b) => a.ordine - b.ordine);
    const risultato: { reparto: Reparto | null; voci: VoceLista[] }[] = [];
    for (const r of ordinati) {
      const elenco = perReparto.get(r.id);
      if (elenco) risultato.push({ reparto: r, voci: ordina(elenco) });
    }
    const senza = perReparto.get("altro");
    if (senza) risultato.push({ reparto: null, voci: ordina(senza) });
    return risultato;
  }, [daPrendere, dati.reparti]);

  return (
    <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">
        <AggiuntaRapida dati={dati} voci={voci} onAggiungi={(t) => azioni.aggiungi(t)} />

        {daPrendere.length === 0 && prese.length === 0 ? <ListaVuota /> : null}
        {daPrendere.length === 0 && prese.length > 0 ? (
          <div className="mt-10 flex items-center gap-5">
            <Pinguino className="w-20" />
            <div>
              <p className="titolo-normale text-xl">Tutto nel carrello</p>
              <p className="mt-1 text-tenue">Chiudi il carrello qui sotto e segna quanto avete speso.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-7">
          {gruppi.map(({ reparto, voci: elenco }) => (
            <section key={reparto?.id ?? "altro"}>
              <h2 className="flex items-center gap-2 text-[0.8125rem] text-tenue">
                <IconaReparto icona={reparto?.icona} className="size-4" />
                {reparto?.nome ?? "Altro"}
              </h2>
              <ul className="mt-1">
                <AnimatePresence initial={false}>
                  {elenco.map((v) => (
                    <RigaVoce key={v.id} voce={v} dati={dati} membri={membri} userId={userId} azioni={azioni} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>

        {prese.length > 0 ? (
          <section className="mt-12 rounded-[28px] bg-superficie-2 p-5 md:p-6">
            <button
              onClick={() => setCarrelloAperto((a) => !a)}
              className="anello-focus flex w-full items-center gap-3 text-left"
            >
              <span className="titolo-normale numeri text-[1.75rem] text-becco-scuro">{prese.length}</span>
              <span className="flex-1">
                <span className="block font-semibold">nel carrello</span>
                <span className="block text-[0.8125rem] text-tenue">{carrelloAperto ? "Nascondi" : "Mostra"} cosa avete già preso</span>
              </span>
              <motion.span animate={{ rotate: carrelloAperto ? 180 : 0 }} className="inline-flex text-tenue">
                <ChevronDown className="size-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {carrelloAperto ? (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  {prese.map((v) => (
                    <RigaVoce key={v.id} voce={v} dati={dati} membri={membri} userId={userId} azioni={azioni} />
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
            <ChiudiCarrello onChiudi={azioni.chiudiSpesa} onSvuota={azioni.rimettiInLista} />
          </section>
        ) : null}
      </div>

      {/* Colonna laterale: numeri della lista, come fatti scritti */}
      <aside className="hidden lg:block">
        <div className="sticky top-10 flex flex-col gap-8">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <Dato etichetta="da prendere" valore={daPrendere.length} />
            <Dato etichetta="urgenti" valore={daPrendere.filter((v) => v.urgente).length} accento={daPrendere.some((v) => v.urgente)} />
            <Dato etichetta="reparti da girare" valore={gruppi.length} />
            <Dato etichetta="già presi" valore={prese.length} />
          </dl>
        </div>
      </aside>
    </div>
  );
}

/** Chiusura del carrello: quanto avete speso, quando, e se mettere i prodotti in casa. */
function ChiudiCarrello({ onChiudi, onSvuota }: { onChiudi: AzioniSpesa["chiudiSpesa"]; onSvuota: AzioniSpesa["rimettiInLista"] }) {
  const [inCorso, setInCorso] = useState(false);
  const [inCasa, setInCasa] = useState(true);
  const [scontrino, setScontrino] = useState<File | null>(null);
  const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

  async function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const importo = Number(String(f.get("importo") ?? "").replace(",", "."));
    if (!Number.isFinite(importo) || importo < 0) return;
    setInCorso(true);
    await onChiudi({ importo: Math.round(importo * 100) / 100, data: String(f.get("data") || oggi), inDispensa: inCasa, scontrino });
    setInCorso(false);
  }

  return (
    <form onSubmit={invia} className="mt-6 border-t border-linea pt-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
          Quanto avete speso
          <span className="flex items-baseline gap-1.5 border-b-2 border-linea-forte focus-within:border-becco">
            <span className="text-[1.25rem] text-tenue">€</span>
            <input
              name="importo"
              required
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              placeholder="0,00"
              autoComplete="off"
              className="numeri h-11 w-32 bg-transparent text-[1.5rem] font-semibold text-inchiostro outline-none placeholder:font-normal placeholder:text-tenue/50"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
          Giorno
          <input name="data" type="date" defaultValue={oggi} max={oggi} className="campo-linea h-11 text-[1rem] text-inchiostro" />
        </label>
      </div>
      <div className="mt-5">
        <AllegaScontrino file={scontrino} onCambia={setScontrino} etichetta="Allega lo scontrino (facoltativo)" />
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-3 text-[0.9375rem]">
        <input type="checkbox" checked={inCasa} onChange={(e) => setInCasa(e.target.checked)} className="size-5 accent-[var(--becco)]" />
        Metti i prodotti in casa (frigo, freezer, dispensa)
      </label>
      <Pulsante type="submit" disabled={inCorso} className="mt-5">
        {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
        Chiudi il carrello
      </Pulsante>
      <Pulsante type="button" variante="fantasma" disabled={inCorso} onClick={onSvuota} className="ml-2 mt-5">
        Svuota il carrello
      </Pulsante>
    </form>
  );
}

function ordina(elenco: VoceLista[]) {
  return elenco.slice().sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.creata_il.localeCompare(b.creata_il));
}

function Dato({ etichetta, valore, accento }: { etichetta: string; valore: number; accento?: boolean }) {
  return (
    <div>
      <dd className={cn("titolo-normale numeri text-[1.5rem] leading-none", accento ? "text-becco-scuro" : "text-inchiostro")}>{valore}</dd>
      <dt className="mt-1.5 text-[0.8125rem] text-tenue">{etichetta}</dt>
    </div>
  );
}

function ListaVuota() {
  return (
    <div className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
      >
        <Pinguino className="w-28" />
      </motion.div>
      <div>
        <p className="titolo-normale text-2xl">Niente da comprare.</p>
        <p className="mt-2 max-w-sm text-tenue">Scrivi qui sopra cosa manca, oppure ripesca qualcosa dagli abituali.</p>
      </div>
    </div>
  );
}

function AggiuntaRapida({
  dati,
  voci,
  onAggiungi,
}: {
  dati: DatiSpesa;
  voci: VoceLista[];
  onAggiungi: (testo: string) => void;
}) {
  const [testo, setTesto] = useState("");
  const [indice, setIndice] = useState(-1);
  const [fuoco, setFuoco] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const interpretata = interpretaVoce(testo);

  const suggerimenti = useMemo(() => {
    const q = interpretata.nome.toLowerCase();
    if (q.length < 1) return [];
    const inLista = new Set(voci.filter((v) => !v.presa).map((v) => v.nome.toLowerCase()));
    return dati.prodotti
      .filter((p) => p.nome.toLowerCase().includes(q) && !inLista.has(p.nome.toLowerCase()))
      .sort((a, b) => Number(b.nome.toLowerCase().startsWith(q)) - Number(a.nome.toLowerCase().startsWith(q)) || b.volte_acquistato - a.volte_acquistato)
      .slice(0, 6);
  }, [dati.prodotti, interpretata.nome, voci]);

  function conferma(nome?: string) {
    const base = nome
      ? `${interpretata.quantita !== 1 || interpretata.unita ? `${formattaQuantita(interpretata.quantita)} ${interpretata.unita ?? ""} ` : ""}${nome}`
      : testo;
    if (!base.trim()) return;
    onAggiungi(base);
    setTesto("");
    setIndice(-1);
    campo.current?.focus();
  }

  function tasti(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, suggerimenti.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      conferma(indice >= 0 ? suggerimenti[indice]?.nome : undefined);
    } else if (e.key === "Escape") {
      setTesto("");
    }
  }

  const mostraTendina = fuoco && suggerimenti.length > 0;

  return (
    <div className="relative">
      <div className={cn("flex items-center gap-3 border-b-2 pb-1 transition-colors", fuoco ? "border-becco" : "border-linea-forte")}>
        <input
          ref={campo}
          value={testo}
          onChange={(e) => {
            setTesto(e.target.value);
            setIndice(-1);
          }}
          onKeyDown={tasti}
          onFocus={() => setFuoco(true)}
          onBlur={() => setTimeout(() => setFuoco(false), 120)}
          placeholder="Cosa manca?"
          enterKeyHint="done"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 bg-transparent text-[1.125rem] outline-none placeholder:text-tenue/70"
        />
        {testo && (interpretata.quantita !== 1 || interpretata.unita) ? (
          <span className="numeri shrink-0 rounded-full bg-guancia-tenue px-3 py-1 text-[0.8125rem] font-semibold text-inchiostro">
            {formattaQuantita(interpretata.quantita)} {interpretata.unita ?? "pz"}
          </span>
        ) : null}
        <button
          onClick={() => conferma()}
          disabled={!testo.trim()}
          aria-label="Aggiungi alla lista"
          className="anello-focus grid size-10 shrink-0 place-items-center rounded-full bg-becco text-su-becco transition hover:bg-becco-hover active:scale-95 disabled:bg-superficie-3 disabled:text-tenue"
        >
          <Plus className="size-5" strokeWidth={2.4} />
        </button>
      </div>
      <p className="mt-2 hidden text-[0.8125rem] text-tenue sm:block">
        Scrivi come parli: “2 kg mele”, “latte x3”. Quantità e reparto li sistemo io.
      </p>
      <AnimatePresence>
        {mostraTendina ? (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-[56px] z-30 overflow-hidden rounded-[22px] bg-superficie py-2 shadow-[0_24px_60px_-20px_rgba(var(--ombra),0.45)] ring-1 ring-linea"
          >
            {suggerimenti.map((p, i) => {
              const reparto = dati.reparti.find((r) => r.id === p.reparto_id);
              return (
                <li key={p.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => conferma(p.nome)}
                    onMouseEnter={() => setIndice(i)}
                    className={cn("flex w-full items-center gap-3 px-5 py-2.5 text-left", i === indice && "bg-superficie-2")}
                  >
                    <IconaReparto icona={reparto?.icona} className="size-4 text-tenue" />
                    <span className="flex-1">{p.nome}</span>
                    {p.volte_acquistato > 0 ? <span className="numeri text-xs text-tenue">preso {p.volte_acquistato} volte</span> : null}
                    {i === indice ? <CornerDownLeft className="size-3.5 text-tenue" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RigaVoce({
  voce,
  dati,
  membri,
  userId,
  azioni,
}: {
  voce: VoceLista;
  dati: DatiSpesa;
  membri: MembroCasa[];
  userId: string;
  azioni: AzioniSpesa;
}) {
  const [aperta, setAperta] = useState(false);
  const autore = membri.find((m) => m.id === voce.aggiunta_da);
  const chiPresa = membri.find((m) => m.id === voce.presa_da);

  function trascina(_: unknown, info: PanInfo) {
    if (info.offset.x < -110) azioni.elimina(voce);
    else if (info.offset.x > 110) azioni.segnaPresa(voce);
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden border-b border-linea last:border-b-0"
    >
      {/* Sfondo rivelato dallo scorrimento laterale (mobile) */}
      <div className="absolute inset-0 flex items-center justify-between px-5 text-sm font-semibold">
        <span className="flex items-center gap-2 text-becco-scuro"><Check className="size-4" /> Nel carrello</span>
        <span className="flex items-center gap-2 text-pericolo">Elimina <Trash2 className="size-4" /></span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={trascina}
        className="relative bg-superficie"
      >
        <div className="group flex min-h-[58px] items-center gap-4 py-2.5">
          <button
            onClick={() => azioni.segnaPresa(voce)}
            aria-label={voce.presa ? "Rimetti in lista" : "Segna come presa"}
            className={cn(
              "anello-focus grid size-[26px] shrink-0 place-items-center rounded-full border-2 transition-colors",
              voce.presa ? "border-becco bg-becco text-su-becco" : "border-linea-forte hover:border-becco",
            )}
          >
            <AnimatePresence>
              {voce.presa ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                  <Check className="size-3.5" strokeWidth={3.2} />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>

          <button onClick={() => azioni.segnaPresa(voce)} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2">
              <span className={cn("truncate text-[1.0625rem] transition-colors", voce.presa && "text-tenue line-through decoration-tenue/50")}>
                {voce.nome}
              </span>
              {voce.urgente && !voce.presa ? <span className="shrink-0 rounded-full bg-becco-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-becco-scuro">urgente</span> : null}
            </span>
            {voce.note || (voce.presa && chiPresa) ? (
              <span className="mt-0.5 block truncate text-xs text-tenue">
                {voce.presa && chiPresa ? `Presa da ${chiPresa.id === userId ? "te" : chiPresa.nome}` : voce.note}
              </span>
            ) : null}
          </button>

          {Number(voce.quantita) !== 1 || voce.unita !== "pz" ? (
            <span className="numeri shrink-0 text-[0.9375rem] font-semibold text-inchiostro-2">
              {formattaQuantita(Number(voce.quantita))} {voce.unita}
            </span>
          ) : null}

          {autore && membri.length > 1 ? <Avatar nome={autore.nome} colore={autore.colore} className="size-6 text-[0.5625rem] opacity-80" /> : null}

          <button
            onClick={() => setAperta((a) => !a)}
            aria-label="Dettagli"
            className={cn(
              "anello-focus grid size-8 shrink-0 place-items-center rounded-full text-tenue transition hover:bg-superficie-3 hover:text-inchiostro",
              aperta && "bg-superficie-3 text-inchiostro",
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {aperta ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <DettaglioVoce voce={voce} dati={dati} azioni={azioni} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}

function DettaglioVoce({ voce, dati, azioni }: { voce: VoceLista; dati: DatiSpesa; azioni: AzioniSpesa }) {
  const passo = ["kg", "l"].includes(voce.unita) ? 0.5 : ["g", "ml"].includes(voce.unita) ? 100 : 1;
  const q = Number(voce.quantita);
  return (
    <div className="mb-3 ml-[42px] flex flex-wrap items-center gap-2 rounded-[20px] bg-superficie-2 p-3">
      <div className="flex h-9 items-center rounded-full bg-superficie ring-1 ring-linea">
        <button onClick={() => q - passo > 0 && azioni.modificaVoce(voce, { quantita: q - passo })} className="grid size-9 place-items-center text-tenue hover:text-inchiostro" aria-label="Meno">
          <Minus className="size-3.5" />
        </button>
        <span className="numeri min-w-8 text-center text-sm font-semibold">{formattaQuantita(q)}</span>
        <button onClick={() => azioni.modificaVoce(voce, { quantita: q + passo })} className="grid size-9 place-items-center text-tenue hover:text-inchiostro" aria-label="Più">
          <Plus className="size-3.5" />
        </button>
      </div>
      <select
        value={voce.unita}
        onChange={(e) => azioni.modificaVoce(voce, { unita: e.target.value })}
        className="h-9 rounded-full bg-superficie px-3 text-sm ring-1 ring-linea"
      >
        {[...new Set([...UNITA, voce.unita])].map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
      <select
        value={voce.reparto_id ?? ""}
        onChange={(e) => azioni.modificaVoce(voce, { reparto_id: e.target.value || null })}
        className="h-9 max-w-[11rem] rounded-full bg-superficie px-3 text-sm ring-1 ring-linea"
      >
        {dati.reparti
          .slice()
          .sort((a, b) => a.ordine - b.ordine)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
      </select>
      <Interruttore attivo={voce.urgente} onClick={() => azioni.modificaVoce(voce, { urgente: !voce.urgente })}>
        <Flame className="size-3.5" /> Urgente
      </Interruttore>
      <input
        defaultValue={voce.note ?? ""}
        onBlur={(e) => e.target.value !== (voce.note ?? "") && azioni.modificaVoce(voce, { note: e.target.value || null })}
        placeholder="Nota (marca, formato…)"
        className="h-9 min-w-40 flex-1 rounded-full bg-superficie px-4 text-sm outline-none ring-1 ring-linea focus:ring-becco"
      />
      <button onClick={() => azioni.elimina(voce)} className="grid size-9 place-items-center rounded-full text-pericolo hover:bg-pericolo-tenue" aria-label="Elimina">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function Interruttore({
  attivo,
  onClick,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={attivo}
      className={cn(
        "anello-focus flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition",
        attivo ? "bg-becco text-su-becco" : "bg-superficie text-tenue ring-1 ring-linea hover:text-inchiostro",
      )}
    >
      {children}
    </button>
  );
}
