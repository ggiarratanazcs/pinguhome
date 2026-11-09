"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Check, ChevronDown, CornerDownLeft, Flame, Leaf, Minus, MoreHorizontal, PackageCheck, Plus, Trash2 } from "lucide-react";
import type { Lista, Reparto, VoceLista } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { interpretaVoce, UNITA } from "@/lib/spesa";
import { Avatar, Pulsante } from "@/components/ui";
import { Pinguino } from "@/components/pinguino";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { IconaReparto } from "./icona-reparto";

export function VistaLista({
  lista,
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

  const ecoQuota = voci.length ? Math.round((voci.filter((v) => v.eco).length / voci.length) * 100) : 0;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <AggiuntaRapida dati={dati} voci={voci} onAggiungi={(t) => azioni.aggiungi(t)} colore={lista.colore} />

        {daPrendere.length === 0 && prese.length === 0 ? <ListaVuota /> : null}
        {daPrendere.length === 0 && prese.length > 0 ? (
          <div className="carta mt-6 flex items-center gap-4 p-5">
            <Pinguino className="size-12" />
            <div>
              <p className="font-semibold">Tutto nel carrello!</p>
              <p className="text-sm text-tenue">Chiudi la spesa per mettere i prodotti in dispensa.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-6">
          {gruppi.map(({ reparto, voci: elenco }) => (
            <section key={reparto?.id ?? "altro"}>
              <h2 className="mb-2 flex items-center gap-2 px-1 text-[0.8125rem] font-semibold text-inchiostro-2">
                <IconaReparto icona={reparto?.icona} className="size-4 text-accento" />
                {reparto?.nome ?? "Altro"}
                <span className="numeri font-normal text-tenue">{elenco.length}</span>
              </h2>
              <ul className="carta divide-y divide-linea overflow-hidden">
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
          <section className="mt-8">
            <button
              onClick={() => setCarrelloAperto((a) => !a)}
              className="anello-focus flex w-full items-center gap-2 rounded-xl px-1 py-2 text-[0.8125rem] font-semibold text-inchiostro-2"
            >
              <motion.span animate={{ rotate: carrelloAperto ? 0 : -90 }} className="inline-flex">
                <ChevronDown className="size-4" />
              </motion.span>
              Nel carrello
              <span className="numeri font-normal text-tenue">{prese.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {carrelloAperto ? (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="carta mt-2 divide-y divide-linea overflow-hidden"
                >
                  {prese.map((v) => (
                    <RigaVoce key={v.id} voce={v} dati={dati} membri={membri} userId={userId} azioni={azioni} />
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pulsante onClick={() => azioni.chiudiSpesa(true)} className="h-10 text-sm">
                <PackageCheck className="size-4" /> Chiudi e metti in dispensa
              </Pulsante>
              <Pulsante variante="fantasma" onClick={() => azioni.chiudiSpesa(false)} className="h-10 text-sm">
                Svuota soltanto
              </Pulsante>
            </div>
          </section>
        ) : null}
      </div>

      {/* Colonna laterale: riepilogo e impatto */}
      <aside className="hidden flex-col gap-4 lg:flex">
        <div className="carta p-5">
          <p className="sovratitolo">Riepilogo</p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Dato etichetta="Da prendere" valore={daPrendere.length} />
            <Dato etichetta="Urgenti" valore={daPrendere.filter((v) => v.urgente).length} accento={daPrendere.some((v) => v.urgente) ? "becco" : undefined} />
            <Dato etichetta="Reparti" valore={gruppi.length} />
            <Dato etichetta="Nel carrello" valore={prese.length} />
          </dl>
        </div>
        <div className="carta relative overflow-hidden p-5">
          <p className="sovratitolo">Scelte green</p>
          <p className="titolo numeri mt-3 text-[2.5rem] leading-none text-eco">{ecoQuota}%</p>
          <p className="mt-2 text-sm text-tenue">
            Prodotti sfusi, locali o senza plastica in questa lista. Tocca la foglia su una voce per segnarla.
          </p>
          <Leaf className="absolute -bottom-4 -right-3 size-24 rotate-12 text-eco opacity-10" />
        </div>
        <div className="rounded-[20px] border border-dashed border-linea-forte p-5 text-sm text-tenue">
          <p className="font-semibold text-inchiostro-2">Scrivi come parli</p>
          <p className="mt-1.5">
            <kbd className="rounded bg-superficie-3 px-1.5 py-0.5 text-xs">2 kg mele</kbd>,{" "}
            <kbd className="rounded bg-superficie-3 px-1.5 py-0.5 text-xs">latte x3</kbd>,{" "}
            <kbd className="rounded bg-superficie-3 px-1.5 py-0.5 text-xs">pane</kbd>: quantità e reparto li capisco io.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ordina(elenco: VoceLista[]) {
  return elenco.slice().sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.creata_il.localeCompare(b.creata_il));
}

function Dato({ etichetta, valore, accento }: { etichetta: string; valore: number; accento?: "becco" }) {
  return (
    <div>
      <dt className="text-xs text-tenue">{etichetta}</dt>
      <dd className={cn("titolo numeri mt-1 text-2xl", accento === "becco" && "text-[color-mix(in_oklab,var(--becco),black_25%)]")}>{valore}</dd>
    </div>
  );
}

function ListaVuota() {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 mx-auto h-3 w-24 rounded-full bg-inchiostro/10 blur-sm" />
        <motion.div animate={{ rotate: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
          <Pinguino className="size-24" />
        </motion.div>
      </div>
      <p className="titolo mt-5 text-xl">La lista è vuota</p>
      <p className="mt-1 max-w-xs text-sm text-tenue">Aggiungi qualcosa qui sopra, oppure pesca dagli Abituali.</p>
    </div>
  );
}

function AggiuntaRapida({
  dati,
  voci,
  onAggiungi,
  colore,
}: {
  dati: DatiSpesa;
  voci: VoceLista[];
  onAggiungi: (testo: string) => void;
  colore: string;
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
      <div
        className={cn(
          "carta flex items-center gap-3 px-4 transition-shadow",
          fuoco && "ring-4 ring-accento-tenue",
          mostraTendina && "rounded-b-none",
        )}
      >
        <span className="hidden size-7 shrink-0 place-items-center rounded-full text-white sm:grid" style={{ background: colore }}>
          <Plus className="size-4" strokeWidth={2.6} />
        </span>
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
          placeholder="Aggiungi alla lista… es. 2 kg mele"
          enterKeyHint="done"
          autoComplete="off"
          className="h-14 min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-tenue/80"
        />
        {testo && (interpretata.quantita !== 1 || interpretata.unita) ? (
          <span className="numeri hidden shrink-0 rounded-lg bg-accento-tenue px-2 py-1 text-xs font-semibold text-accento sm:inline">
            {formattaQuantita(interpretata.quantita)} {interpretata.unita ?? "pz"}
          </span>
        ) : null}
        <button
          onClick={() => conferma()}
          disabled={!testo.trim()}
          className="anello-focus hidden h-8 shrink-0 items-center gap-1.5 rounded-lg bg-superficie-3 px-2.5 text-xs font-medium text-inchiostro-2 transition disabled:opacity-40 sm:flex"
        >
          <CornerDownLeft className="size-3.5" /> Invio
        </button>
        <button
          onClick={() => conferma()}
          disabled={!testo.trim()}
          aria-label="Aggiungi"
          className="anello-focus grid size-9 shrink-0 place-items-center rounded-xl bg-accento text-su-accento disabled:opacity-40 sm:hidden"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <AnimatePresence>
        {mostraTendina ? (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-full z-30 overflow-hidden rounded-b-[20px] border border-t-0 border-linea bg-superficie shadow-xl"
          >
            {suggerimenti.map((p, i) => {
              const reparto = dati.reparti.find((r) => r.id === p.reparto_id);
              return (
                <li key={p.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => conferma(p.nome)}
                    onMouseEnter={() => setIndice(i)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.9375rem]", i === indice && "bg-superficie-2")}
                  >
                    <IconaReparto icona={reparto?.icona} className="size-4 text-tenue" />
                    <span className="flex-1">{p.nome}</span>
                    {p.eco ? <Leaf className="size-3.5 text-eco" /> : null}
                    {p.volte_acquistato > 0 ? <span className="numeri text-xs text-tenue">preso {p.volte_acquistato}×</span> : null}
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
      className="relative overflow-hidden"
    >
      {/* Sfondo rivelato dallo scorrimento laterale (mobile) */}
      <div className="absolute inset-0 flex items-center justify-between px-5 text-sm font-semibold">
        <span className="flex items-center gap-2 text-eco"><Check className="size-4" /> Presa</span>
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
        <div className="group flex min-h-[60px] items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => azioni.segnaPresa(voce)}
            aria-label={voce.presa ? "Rimetti in lista" : "Segna come presa"}
            className={cn(
              "anello-focus grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
              voce.presa ? "border-eco bg-eco text-white" : "border-linea-forte hover:border-accento",
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
              <span className={cn("truncate text-[0.9844rem] font-medium transition-colors", voce.presa && "text-tenue line-through decoration-tenue/50")}>
                {voce.nome}
              </span>
              {voce.urgente && !voce.presa ? <Flame className="size-3.5 shrink-0 text-becco" fill="currentColor" /> : null}
              {voce.eco ? <Leaf className="size-3.5 shrink-0 text-eco" /> : null}
            </span>
            {voce.note || (voce.presa && chiPresa) ? (
              <span className="mt-0.5 block truncate text-xs text-tenue">
                {voce.presa && chiPresa ? `Presa da ${chiPresa.id === userId ? "te" : chiPresa.nome}` : voce.note}
              </span>
            ) : null}
          </button>

          {Number(voce.quantita) !== 1 || voce.unita !== "pz" ? (
            <span className="numeri shrink-0 rounded-lg bg-superficie-3 px-2 py-1 text-xs font-semibold text-inchiostro-2">
              {formattaQuantita(Number(voce.quantita))} {voce.unita}
            </span>
          ) : null}

          {autore && membri.length > 1 ? <Avatar nome={autore.nome} colore={autore.colore} className="size-6 text-[0.5625rem] ring-0" /> : null}

          <button
            onClick={() => setAperta((a) => !a)}
            aria-label="Dettagli"
            className={cn(
              "anello-focus grid size-8 shrink-0 place-items-center rounded-lg text-tenue transition hover:bg-superficie-3 hover:text-inchiostro",
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
    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-linea bg-superficie-2 px-4 py-3 pl-[52px]">
      <div className="flex h-9 items-center rounded-lg border border-linea bg-superficie">
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
        className="h-9 rounded-lg border border-linea bg-superficie px-2 text-sm"
      >
        {[...new Set([...UNITA, voce.unita])].map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
      <select
        value={voce.reparto_id ?? ""}
        onChange={(e) => azioni.modificaVoce(voce, { reparto_id: e.target.value || null })}
        className="h-9 max-w-[11rem] rounded-lg border border-linea bg-superficie px-2 text-sm"
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
      <Interruttore attivo={voce.eco} onClick={() => azioni.modificaVoce(voce, { eco: !voce.eco })} colore="eco">
        <Leaf className="size-3.5" /> Green
      </Interruttore>
      <Interruttore attivo={voce.urgente} onClick={() => azioni.modificaVoce(voce, { urgente: !voce.urgente })} colore="becco">
        <Flame className="size-3.5" /> Urgente
      </Interruttore>
      <input
        defaultValue={voce.note ?? ""}
        onBlur={(e) => e.target.value !== (voce.note ?? "") && azioni.modificaVoce(voce, { note: e.target.value || null })}
        placeholder="Nota (marca, formato…)"
        className="h-9 min-w-40 flex-1 rounded-lg border border-linea bg-superficie px-3 text-sm outline-none focus:border-accento"
      />
      <button onClick={() => azioni.elimina(voce)} className="grid size-9 place-items-center rounded-lg text-pericolo hover:bg-pericolo-tenue" aria-label="Elimina">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function Interruttore({
  attivo,
  onClick,
  colore,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  colore: "eco" | "becco";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={attivo}
      className={cn(
        "anello-focus flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition",
        attivo
          ? colore === "eco"
            ? "border-transparent bg-eco-tenue text-eco"
            : "border-transparent bg-becco-tenue text-[color-mix(in_oklab,var(--becco),black_30%)]"
          : "border-linea bg-superficie text-tenue hover:text-inchiostro",
      )}
    >
      {children}
    </button>
  );
}
