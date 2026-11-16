"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as TastoReact } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, ChevronDown, Minus, Plus, ShoppingCart, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { indovinaReparto, interpretaVoce, nomeArticolo, posizioneDaReparto, POSIZIONI, postiAttivi, postoAttivo, UNITA, type Posto } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { IllustrazioneScena, useRapportoScena, type NomeScena } from "@/components/scena-mascotte";

const IMMAGINI: Record<string, string> = {
  frigo: "/casa/frigo-vuoto.webp",
  freezer: "/casa/freezer-vuoto.webp",
  dispensa: "/casa/dispensa-vuoto.webp",
  bagno: "/casa/bagno-vuoto.webp",
  ripostiglio: "/casa/ripostiglio-vuoto.webp",
  lavanderia: "/casa/lavanderia-vuoto.webp",
};

/** Colonne su schermo largo: tutte su una riga, fino a 6 */
const COLONNE: Record<number, string> = {
  1: "md:grid-cols-3",
  2: "md:grid-cols-3",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

/** L'oggetto aperto, con la mascotte che spunta sopra (il pinguino o quella scelta in Impostazioni). */
function ImmagineAperta({ nome }: { nome: NomeScena }) {
  const rapporto = useRapportoScena(nome);
  return (
    <motion.span
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.08 }}
      className="relative -mt-16 block h-36 shrink-0 sm:-mt-24 sm:h-44"
      style={{ aspectRatio: rapporto }}
    >
      <IllustrazioneScena nome={nome} />
    </motion.span>
  );
}

export function VistaDispensa({
  dati,
  lista,
  azioni,
  avvisa,
}: {
  dati: DatiSpesa;
  lista: Lista | undefined;
  azioni: AzioniSpesa;
  avvisa: (t: string) => void;
}) {
  const righe = useMemo(() => dati.dispensa.slice().sort((a, b) => a.nome.localeCompare(b.nome)), [dati.dispensa]);
  const attivi = useMemo(() => postiAttivi(dati.luoghi), [dati.luoghi]);
  const [aperta, setAperta] = useState<string | null>(null);
  const [appena, setAppena] = useState<string | null>(null);
  const timerAppena = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La prima volta la casa sceglie i posti da gestire
  const [configura, setConfigura] = useState(dati.luoghi === null);
  const posAperta = attivi.find((p) => p.id === aperta);

  useEffect(() => {
    if (!aperta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAperta(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aperta]);

  async function ricompra(r: Dispensa) {
    if (!lista) return;
    await azioni.aggiungi(r.nome, { quantita: 1, unita: r.unita });
    avvisa(`${r.nome} aggiunto a ${lista.nome}`);
  }

  /** Mette in casa: se c'è già (stesso nome, unità e posto) aumenta la quantità */
  async function metti(nome: string, quantita: number, unita: string, posto: Posto) {
    const gia = dati.dispensa.find((r) => r.nome.toLowerCase() === nome.toLowerCase() && r.unita === unita && r.posizione === posto.id);
    if (gia) await azioni.salvaDispensa({ id: gia.id, nome: gia.nome, quantita: Number(gia.quantita) + quantita });
    else await azioni.salvaDispensa({ nome, quantita, unita, posizione: posto.id });
    const quanto = unita === "pz" ? (quantita === 1 ? "" : `${formattaQuantita(quantita)} `) : `${formattaQuantita(quantita)} ${unita} `;
    avvisa(`${quanto}${nome} in ${posto.nome}`);
    setAppena(posto.id);
    if (timerAppena.current) clearTimeout(timerAppena.current);
    timerAppena.current = setTimeout(() => setAppena(null), 1600);
  }

  async function sposta(r: Dispensa, posto: Posto) {
    await azioni.salvaDispensa({ id: r.id, nome: r.nome, posizione: posto.id });
    avvisa(`${r.nome} spostato in ${posto.nome}`);
  }

  return (
    <div className="mt-8 lg:mt-0">
      <div className="flex max-w-5xl items-center gap-2">
        <AggiuntaCasa dati={dati} attivi={attivi} onMetti={metti} onConfigura={() => setConfigura(true)} />
      </div>

      <div className={cn("mt-8 grid max-w-5xl grid-cols-3 gap-3 md:gap-5", COLONNE[attivi.length])}>
        {attivi.map((pos) => {
          const n = righe.filter((r) => r.posizione === pos.id).length;
          return (
            <button
              key={pos.id}
              onClick={() => setAperta(pos.id)}
              className={cn(
                "anello-focus group flex flex-col items-center rounded-[24px] px-2 pb-3 pt-4 ring-2 transition-[transform,background-color,box-shadow] duration-500 active:scale-[0.97] md:rounded-[32px] md:px-6 md:pb-5 md:pt-6",
                appena === pos.id ? "bg-becco-tenue ring-becco" : "bg-superficie-2 ring-transparent",
              )}
            >
              <div className="relative aspect-[3/4] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMMAGINI[pos.id]}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full object-contain object-bottom drop-shadow-[0_14px_18px_rgba(var(--ombra),0.18)] transition-transform duration-300 group-hover:-translate-y-1"
                />
              </div>
              <span className="titolo mt-3 text-[0.9375rem] md:text-[1.125rem]">{pos.nome}</span>
              <span className="numeri text-[0.8125rem] text-tenue">{n}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {posAperta ? (
          <motion.div
            key="velo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/40 p-3 backdrop-blur-md sm:items-center"
            onClick={() => setAperta(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={posAperta.nome}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="pb-sicuro flex max-h-[88dvh] w-full max-w-lg flex-col rounded-[32px] bg-superficie shadow-2xl"
            >
              <div className="relative flex items-end gap-4 px-5 pt-5">
                <ImmagineAperta nome={posAperta.id as NomeScena} />
                <div className="min-w-0 flex-1 pb-2">
                  <p className="titolo text-[1.375rem]">{posAperta.nome.toLowerCase()}</p>
                  <p className="numeri text-[0.875rem] text-tenue">{righe.filter((r) => r.posizione === posAperta.id).length}</p>
                </div>
                <button
                  onClick={() => setAperta(null)}
                  className="anello-focus absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro"
                  aria-label="Chiudi"
                >
                  <X className="size-4" />
                </button>
              </div>

              <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                <AnimatePresence initial={false}>
                  {righe
                    .filter((r) => r.posizione === posAperta.id)
                    .map((r) => (
                      <RigaDispensa
                        key={r.id}
                        riga={r}
                        azioni={azioni}
                        altri={attivi.filter((p) => p.id !== r.posizione)}
                        onRicompra={() => ricompra(r)}
                        onSposta={(p) => sposta(r, p)}
                      />
                    ))}
                </AnimatePresence>
                {righe.every((r) => r.posizione !== posAperta.id) ? <li className="py-5 text-[0.875rem] text-tenue">Niente qui.</li> : null}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {configura ? (
          <ConfiguraLuoghi
            iniziali={dati.luoghi}
            primaVolta={dati.luoghi === null}
            onChiudi={() => setConfigura(false)}
            onSalva={async (luoghi) => {
              setConfigura(false);
              const esito = await azioni.salvaLuoghi(luoghi);
              if (!esito.ok) avvisa("Non sono riuscito a salvare i posti");
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Scelta dei posti ---------- */

function ConfiguraLuoghi({
  iniziali,
  primaVolta,
  onChiudi,
  onSalva,
}: {
  iniziali: string[] | null;
  primaVolta: boolean;
  onChiudi: () => void;
  onSalva: (luoghi: string[]) => Promise<void>;
}) {
  const [scelti, setScelti] = useState<Set<string>>(() => new Set(iniziali ?? POSIZIONI.map((p) => p.id)));
  const cambia = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const chiudibile = !primaVolta;

  useEffect(() => {
    if (!chiudibile) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [chiudibile, onChiudi]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/40 p-3 backdrop-blur-md sm:items-center"
      onClick={() => chiudibile && onChiudi()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="La vostra casa"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="pb-sicuro relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-[32px] bg-superficie p-5 shadow-2xl"
      >
        {chiudibile ? (
          <button
            onClick={onChiudi}
            className="anello-focus absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <p className="titolo text-[1.375rem]">la vostra casa</p>
        <p className="mt-1 text-[0.875rem] text-tenue">Tenete solo i posti che usate davvero.</p>

        <ul className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {POSIZIONI.map((p) => {
            const on = scelti.has(p.id);
            return (
              <li key={p.id} className="border-b border-linea last:border-0">
                <button type="button" role="switch" aria-checked={on} onClick={() => cambia(p.id)} className="anello-focus flex w-full items-center gap-3 py-2 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMMAGINI[p.id]} alt="" draggable={false} className={cn("size-11 shrink-0 object-contain transition", !on && "opacity-35 grayscale")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[1rem] transition-colors", !on && "text-tenue")}>{p.nome}</span>
                    {p.id === "freezer" && !on && scelti.has("frigo") ? <span className="block text-[0.75rem] text-tenue">I surgelati vanno in Frigo</span> : null}
                  </span>
                  <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-becco" : "bg-superficie-3")}>
                    <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }} className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow", on ? "right-0.5" : "left-0.5")} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Pulsante className="mt-4 h-12 w-full" disabled={scelti.size === 0} onClick={() => onSalva(POSIZIONI.filter((p) => scelti.has(p.id)).map((p) => p.id))}>
          Fatto
        </Pulsante>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Riga ---------- */

function RigaDispensa({
  riga,
  azioni,
  altri,
  onRicompra,
  onSposta,
}: {
  riga: Dispensa;
  azioni: AzioniSpesa;
  altri: Posto[];
  onRicompra: () => void;
  onSposta: (p: Posto) => void;
}) {
  const q = Number(riga.quantita);
  const passo = ["kg", "l"].includes(riga.unita) ? 0.5 : ["g", "ml"].includes(riga.unita) ? 100 : 1;
  const [sposta, setSposta] = useState(false);

  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-linea py-3">
      <div className="flex items-center gap-1">
        <span className="line-clamp-2 min-w-0 flex-1 hyphens-auto text-[1rem] leading-snug">{riga.nome}</span>
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => (q - passo <= 0 ? azioni.eliminaDispensa(riga) : azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: q - passo }))}
            className="anello-focus grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro"
            aria-label={`Togli un po' di ${riga.nome}`}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="numeri min-w-10 text-center text-[0.875rem] font-semibold">
            {formattaQuantita(q)} <span className="font-normal text-tenue">{riga.unita}</span>
          </span>
          <button
            onClick={() => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: q + passo })}
            className="anello-focus grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro"
            aria-label={`Aggiungi ${riga.nome}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center border-l border-linea pl-1">
          {altri.length ? (
            <button
              onClick={() => setSposta((s) => !s)}
              aria-expanded={sposta}
              className={cn(
                "anello-focus grid size-9 place-items-center rounded-full transition",
                sposta ? "bg-superficie-3 text-inchiostro" : "text-tenue hover:bg-superficie-3 hover:text-inchiostro",
              )}
              aria-label={`Sposta ${riga.nome}`}
              title="Sposta"
            >
              <ArrowLeftRight className="size-4" />
            </button>
          ) : null}
          <button
            onClick={onRicompra}
            className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-becco-tenue hover:text-becco-scuro"
            aria-label={`Rimetti ${riga.nome} in lista`}
            title="Rimetti in lista"
          >
            <ShoppingCart className="size-4" />
          </button>
          <button
            onClick={() => azioni.eliminaDispensa(riga)}
            className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo"
            aria-label={`${riga.nome} finito`}
            title="Finito"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {sposta ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-[20px] bg-superficie-2 p-3">
              <p className="px-1 text-[0.8125rem] text-tenue">Sposta in</p>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {altri.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSposta(p)}
                    className="anello-focus flex flex-col items-center rounded-[14px] bg-superficie py-2 transition hover:bg-superficie-3 active:scale-95"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={IMMAGINI[p.id]} alt="" draggable={false} className="h-10 object-contain" />
                    <span className="mt-1 text-[0.6875rem]">{p.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

/* ---------- Aggiungi ---------- */

/** Un campo solo: scrivi cosa avete, scegli la quantità; il posto lo indovina l'app (e si può cambiare). */
function AggiuntaCasa({
  dati,
  attivi,
  onMetti,
  onConfigura,
}: {
  dati: DatiSpesa;
  attivi: Posto[];
  onMetti: (nome: string, quantita: number, unita: string, posto: Posto) => Promise<void>;
  onConfigura: () => void;
}) {
  const [testo, setTesto] = useState("");
  const [fuoco, setFuoco] = useState(false);
  const [indice, setIndice] = useState(-1);
  // Quello che tocchi a mano vince su quello che l'app capisce dal testo
  const [quantitaMano, setQuantitaMano] = useState<number | null>(null);
  const [unitaMano, setUnitaMano] = useState<string | null>(null);
  const [postoMano, setPostoMano] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const letta = interpretaVoce(testo);
  const nome = letta.nome;

  const suggerimenti = useMemo(() => {
    const q = nome.toLowerCase();
    if (!q) return [];
    return dati.prodotti
      .filter((p) => p.nome.toLowerCase().includes(q) && p.nome.toLowerCase() !== q)
      .sort((a, b) => Number(b.nome.toLowerCase().startsWith(q)) - Number(a.nome.toLowerCase().startsWith(q)) || b.volte_acquistato - a.volte_acquistato)
      .slice(0, 5);
  }, [dati.prodotti, nome]);

  function postoPer(n: string) {
    const prodotto = dati.prodotti.find((p) => p.nome.toLowerCase() === n.toLowerCase());
    const repartoId = prodotto?.reparto_id ?? indovinaReparto(n, dati.reparti);
    const reparto = dati.reparti.find((r) => r.id === repartoId)?.nome;
    const id = postoAttivo(posizioneDaReparto(reparto, n), attivi);
    return attivi.find((p) => p.id === id) ?? attivi[0];
  }

  const quantita = quantitaMano ?? letta.quantita;
  const prodotto = dati.prodotti.find((p) => p.nome.toLowerCase() === nome.toLowerCase());
  const unita = unitaMano ?? letta.unita ?? prodotto?.unita ?? "pz";
  const posto = (postoMano && attivi.find((p) => p.id === postoMano)) || (nome ? postoPer(nome) : attivi[0]);
  const passo = ["kg", "l"].includes(unita) ? 0.5 : ["g", "ml"].includes(unita) ? 100 : 1;

  function azzera() {
    setTesto("");
    setQuantitaMano(null);
    setUnitaMano(null);
    setPostoMano(null);
    setIndice(-1);
  }

  async function conferma(scelto?: string) {
    const n = nomeArticolo(scelto ?? nome);
    if (!n || !posto) return;
    const p = postoMano ? posto : postoPer(n);
    azzera();
    campo.current?.focus();
    await onMetti(n, quantita, unita, p);
  }

  function tasti(e: TastoReact<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, suggerimenti.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      conferma(indice >= 0 ? suggerimenti[indice]?.nome : undefined);
    } else if (e.key === "Escape") azzera();
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <div className={cn("flex h-12 flex-1 items-center gap-1.5 rounded-full pl-5 pr-1.5 ring-2 transition-[box-shadow,background]", fuoco || testo ? "bg-superficie ring-becco" : "bg-superficie-2 ring-transparent")}>
          <input
            ref={campo}
            value={testo}
            onChange={(e) => (setTesto(e.target.value), setIndice(-1))}
            onKeyDown={tasti}
            onFocus={() => setFuoco(true)}
            onBlur={() => setTimeout(() => setFuoco(false), 150)}
            placeholder="Cosa avete già?"
            enterKeyHint="done"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[1.0625rem] outline-none placeholder:text-tenue"
          />
          <button
            onClick={() => conferma()}
            disabled={!nome}
            aria-label="Metti in casa"
            className="anello-focus grid size-9 shrink-0 place-items-center rounded-full bg-becco text-su-becco transition hover:bg-becco-hover active:scale-95 disabled:opacity-60"
          >
            <Plus className="size-5" strokeWidth={2.4} />
          </button>
        </div>
        {/* Scegliere i posti della casa */}
        <button
          onClick={onConfigura}
          aria-label="Scegli i posti della casa"
          title="Scegli i posti della casa"
          className="anello-focus grid size-11 shrink-0 place-items-center rounded-full bg-superficie-2 text-tenue transition hover:bg-superficie-3 hover:text-inchiostro"
        >
          <SlidersHorizontal className="size-[18px]" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {nome ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="flex h-10 items-center rounded-full bg-superficie-2">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => quantita - passo > 0 && setQuantitaMano(quantita - passo)}
                  aria-label="Meno"
                  className="grid size-10 place-items-center text-tenue hover:text-inchiostro"
                >
                  <Minus className="size-4" />
                </button>
                <span className="numeri min-w-6 text-center font-semibold">{formattaQuantita(quantita)}</span>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQuantitaMano(quantita + passo)} aria-label="Più" className="grid size-10 place-items-center text-tenue hover:text-inchiostro">
                  <Plus className="size-4" />
                </button>
              </div>
              <label className="relative flex h-10 items-center gap-1 rounded-full bg-superficie-2 px-3 text-[0.9375rem]">
                {unita}
                <ChevronDown className="size-3.5 text-tenue" />
                <select value={unita} onChange={(e) => setUnitaMano(e.target.value)} aria-label="Unità" className="absolute inset-0 cursor-pointer opacity-0">
                  {[...new Set([...UNITA, unita])].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              {posto ? (
                <label className="relative ml-auto flex h-10 items-center gap-1.5 rounded-full bg-superficie-2 pl-1.5 pr-3 text-[0.9375rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMMAGINI[posto.id]} alt="" draggable={false} className="size-7 object-contain" />
                  {posto.nome}
                  <ChevronDown className="size-3.5 text-tenue" />
                  <select value={posto.id} onChange={(e) => setPostoMano(e.target.value)} aria-label="Dove" className="absolute inset-0 cursor-pointer opacity-0">
                    {attivi.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {fuoco && suggerimenti.length ? (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-[112px] z-30 overflow-hidden rounded-[22px] bg-superficie py-2 shadow-[0_24px_60px_-20px_rgba(var(--ombra),0.45)] ring-1 ring-linea"
          >
            {suggerimenti.map((p, i) => (
              <li key={p.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => conferma(p.nome)}
                  onMouseEnter={() => setIndice(i)}
                  className={cn("flex w-full items-center gap-3 px-5 py-2.5 text-left", i === indice && "bg-superficie-2")}
                >
                  {p.nome}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
