"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Camera, Check, ChevronDown, CornerDownLeft, Flame, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import type { Lista, Prodotto, Reparto, VoceLista } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { preparaFile } from "@/lib/scontrini";
import type { MembroCasa } from "@/lib/sessione";
import { interpretaVoce, UNITA } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { Mascotte } from "@/components/mascotte";
import { useDesktop } from "@/lib/schermo";
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
  const [scheda, setScheda] = useState<string | null>(null);
  const [grande, setGrande] = useState<string | null>(null);
  const foto = useFotoProdotti(dati.prodotti);
  const desktop = useDesktop();
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
    <div className="mt-4 grid gap-12 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <AggiuntaRapida dati={dati} voci={voci} onAggiungi={(t) => azioni.aggiungi(t)} onFoto={azioni.aggiungiDaFoto} />


        {daPrendere.length === 0 && prese.length === 0 ? <ListaVuota /> : null}
        {daPrendere.length === 0 && prese.length > 0 ? (
          <div className="mt-10 flex items-center gap-5">
            <Mascotte className="w-20" />
            <div>
              <p className="titolo-normale text-xl">Tutto nel carrello</p>
              <p className="mt-1 text-tenue">Chiudi il carrello qui sotto e segna quanto avete speso.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-5">
          {gruppi.map(({ reparto, voci: elenco }) => (
            <section key={reparto?.id ?? "altro"}>
              <h2 className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">
                <IconaReparto icona={reparto?.icona} className="size-3.5" />
                {reparto?.nome ?? "Altro"}
              </h2>
              <ul className="mt-0.5">
                <AnimatePresence initial={false}>
                  {elenco.map((v) => (
                    <RigaVoce
                      key={v.id}
                      voce={v}
                      foto={foto.di(v, dati.prodotti)}
                      membri={membri}
                      userId={userId}
                      azioni={azioni}
                      onApri={() => setScheda(v.id)}
                      onFoto={() => setGrande(v.id)}
                      selezionata={desktop && scheda === v.id}
                    />
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
                    <RigaVoce
                      key={v.id}
                      voce={v}
                      foto={foto.di(v, dati.prodotti)}
                      membri={membri}
                      userId={userId}
                      azioni={azioni}
                      onApri={() => setScheda(v.id)}
                      onFoto={() => setGrande(v.id)}
                    />
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
            <ChiudiCarrello onChiudi={azioni.chiudiSpesa} onSvuota={azioni.rimettiInLista} />
          </section>
        ) : null}
      </div>

      <AnimatePresence>
        {!desktop && scheda && voci.some((v) => v.id === scheda) ? (
          <SchedaVoce
            key={scheda}
            voce={voci.find((v) => v.id === scheda)!}
            foto={foto.di(voci.find((v) => v.id === scheda)!, dati.prodotti)}
            dati={dati}
            azioni={azioni}
            onChiudi={() => setScheda(null)}
            onFotoGrande={() => setGrande(scheda)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {grande && voci.some((v) => v.id === grande) && foto.di(voci.find((v) => v.id === grande)!, dati.prodotti) ? (
          <FotoGrande
            key={grande}
            voce={voci.find((v) => v.id === grande)!}
            url={foto.di(voci.find((v) => v.id === grande)!, dati.prodotti)!}
            onCarrello={() => {
              const v = voci.find((x) => x.id === grande)!;
              if (!v.presa) azioni.segnaPresa(v);
              setGrande(null);
              setScheda(null);
            }}
            onChiudi={() => setGrande(null)}
          />
        ) : null}
      </AnimatePresence>

      {/* Su PC: a destra la scheda della voce scelta; senza scelta, i numeri della lista */}
      <aside className="hidden lg:block">
        <div className="sticky top-8 flex flex-col gap-8">
          {desktop && scheda && voci.some((v) => v.id === scheda) ? (
            <SchedaVoce
              key={scheda}
              inline
              voce={voci.find((v) => v.id === scheda)!}
              foto={foto.di(voci.find((v) => v.id === scheda)!, dati.prodotti)}
              dati={dati}
              azioni={azioni}
              onChiudi={() => setScheda(null)}
              onFotoGrande={() => setGrande(scheda)}
            />
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[24px] bg-superficie-2 p-6">
              <Dato etichetta="da prendere" valore={daPrendere.length} />
              <Dato etichetta="urgenti" valore={daPrendere.filter((v) => v.urgente).length} accento={daPrendere.some((v) => v.urgente)} />
              <Dato etichetta="reparti da girare" valore={gruppi.length} />
              <Dato etichetta="già presi" valore={prese.length} />
            </dl>
          )}
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
        <Mascotte className="w-28" />
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
  onFoto,
}: {
  dati: DatiSpesa;
  voci: VoceLista[];
  onAggiungi: (testo: string) => void;
  onFoto: (foto: Blob, dataUrl: string) => Promise<void>;
}) {
  const [testo, setTesto] = useState("");
  const [leggo, setLeggo] = useState(false);
  const fotocamera = useRef<HTMLInputElement>(null);

  async function daFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLeggo(true);
    try {
      const { blob, dataUrl } = await preparaFile(file);
      if (dataUrl) await onFoto(blob, dataUrl);
    } finally {
      setLeggo(false);
    }
  }
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
    <div data-giro="aggiungi" className="relative">
      <div className={cn("flex h-12 items-center gap-1.5 rounded-full bg-superficie-2 pl-5 pr-1.5 ring-2 transition-[box-shadow,background]", fuoco ? "bg-superficie ring-becco" : "ring-transparent")}>
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
          className="h-full min-w-0 flex-1 bg-transparent text-[1.0625rem] outline-none placeholder:text-tenue"
        />
        {testo && (interpretata.quantita !== 1 || interpretata.unita) ? (
          <span className="numeri shrink-0 rounded-full bg-guancia-tenue px-3 py-1 text-[0.8125rem] font-semibold text-inchiostro">
            {formattaQuantita(interpretata.quantita)} {interpretata.unita ?? "pz"}
          </span>
        ) : null}
        <button
          onClick={() => fotocamera.current?.click()}
          disabled={leggo}
          aria-label="Aggiungi con una foto"
          title="Aggiungi con una foto"
          className="anello-focus grid size-9 shrink-0 place-items-center rounded-full text-tenue transition hover:bg-superficie-3 hover:text-inchiostro"
        >
          {leggo ? <Loader2 className="size-[18px] animate-spin" /> : <Camera className="size-[18px]" />}
        </button>
        <input ref={fotocamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={daFoto} />
        <button
          onClick={() => conferma()}
          disabled={!testo.trim()}
          aria-label="Aggiungi alla lista"
          className="anello-focus grid size-9 shrink-0 place-items-center rounded-full bg-becco text-su-becco transition hover:bg-becco-hover active:scale-95 disabled:opacity-60"
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

/** Link temporanei alle foto dei prodotti, chiesti tutti insieme e tenuti finché la pagina è aperta. */
function useFotoProdotti(prodotti: Prodotto[]) {
  const [url, setUrl] = useState<Record<string, string>>({});
  const percorsi = useMemo(() => prodotti.map((p) => p.foto_path).filter((x): x is string => Boolean(x)), [prodotti]);

  useEffect(() => {
    const mancanti = percorsi.filter((p) => !url[p]);
    if (!mancanti.length) return;
    let vivo = true;
    createClient()
      .storage.from("prodotti")
      .createSignedUrls(mancanti, 60 * 60 * 6)
      .then(({ data }) => {
        if (!vivo || !data) return;
        setUrl((u) => ({ ...u, ...Object.fromEntries(data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : []))) }));
      });
    return () => {
      vivo = false;
    };
  }, [percorsi, url]);

  return {
    di(voce: VoceLista, elenco: Prodotto[]) {
      const p = (voce.prodotto_id && elenco.find((x) => x.id === voce.prodotto_id)) || elenco.find((x) => x.nome.toLowerCase() === voce.nome.toLowerCase());
      return p?.foto_path ? (url[p.foto_path] ?? null) : null;
    },
  };
}

function RigaVoce({
  voce,
  foto,
  membri,
  userId,
  azioni,
  onApri,
  onFoto,
  selezionata = false,
}: {
  voce: VoceLista;
  foto: string | null;
  membri: MembroCasa[];
  userId: string;
  azioni: AzioniSpesa;
  onApri: () => void;
  onFoto: () => void;
  selezionata?: boolean;
}) {
  const chiPresa = membri.find((m) => m.id === voce.presa_da);
  const sotto = voce.presa && chiPresa ? `Presa da ${chiPresa.id === userId ? "te" : chiPresa.nome}` : voce.note;

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
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5} dragSnapToOrigin onDragEnd={trascina} className={cn("relative transition-colors", selezionata ? "bg-becco-tenue" : "bg-superficie")}>
        <div className={cn("flex min-h-[48px] items-center gap-3 py-1.5", selezionata && "lg:-mx-3 lg:px-3")}>
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

          <button onClick={onApri} className="anello-focus min-w-0 flex-1 rounded-[8px] py-1 text-left">
            <span className="flex items-center gap-1.5">
              <span className={cn("truncate text-[1rem] transition-colors", voce.presa && "text-tenue line-through decoration-tenue/50")}>{voce.nome}</span>
              {voce.urgente && !voce.presa ? <Flame className="size-3.5 shrink-0 text-becco" aria-label="urgente" /> : null}
            </span>
            {sotto ? <span className="block truncate text-[0.75rem] leading-tight text-tenue">{sotto}</span> : null}
          </button>

          {Number(voce.quantita) !== 1 || voce.unita !== "pz" ? (
            <button onClick={onApri} className="numeri shrink-0 text-[0.875rem] font-semibold text-inchiostro-2">
              {formattaQuantita(Number(voce.quantita))} {voce.unita}
            </button>
          ) : null}

          {foto ? (
            <button onClick={onFoto} aria-label={`Foto di ${voce.nome}`} className="anello-focus size-9 shrink-0 overflow-hidden rounded-[10px] ring-1 ring-linea">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" draggable={false} className={cn("size-full object-cover", voce.presa && "opacity-50 grayscale")} />
            </button>
          ) : null}
        </div>
      </motion.div>
    </motion.li>
  );
}

/** Tutto su una voce: foto, quantità, reparto, urgente, nota. */
function SchedaVoce({
  voce,
  foto,
  dati,
  azioni,
  onChiudi,
  onFotoGrande,
  inline = false,
}: {
  voce: VoceLista;
  foto: string | null;
  dati: DatiSpesa;
  azioni: AzioniSpesa;
  onChiudi: () => void;
  onFotoGrande: () => void;
  /** Su PC: dentro la colonna di destra, senza velo sopra la pagina */
  inline?: boolean;
}) {
  const passo = ["kg", "l"].includes(voce.unita) ? 0.5 : ["g", "ml"].includes(voce.unita) ? 100 : 1;
  const q = Number(voce.quantita);
  const [nota, setNota] = useState(voce.note ?? "");
  const [carico, setCarico] = useState(false);
  const fotocamera = useRef<HTMLInputElement>(null);
  const reparto = dati.reparti.find((r) => r.id === voce.reparto_id);

  function salvaNota() {
    if (nota !== (voce.note ?? "")) azioni.modificaVoce(voce, { note: nota.trim() || null });
  }

  function chiudi() {
    salvaNota();
    onChiudi();
  }

  useEffect(() => {
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);

  async function nuovaFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCarico(true);
    try {
      const { blob } = await preparaFile(file);
      await azioni.fotoProdotto(voce, blob);
    } finally {
      setCarico(false);
    }
  }

  const contenuto = (
    <>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {foto ? (
              <button onClick={onFotoGrande} aria-label="Foto a tutto schermo" className="anello-focus block size-24 overflow-hidden rounded-[20px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="" draggable={false} className="size-full object-cover" />
              </button>
            ) : (
              <button
                onClick={() => fotocamera.current?.click()}
                aria-label="Aggiungi una foto"
                className="anello-focus grid size-24 place-items-center rounded-[20px] border-2 border-dashed border-linea-forte text-tenue transition hover:border-becco hover:text-inchiostro"
              >
                {carico ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
              </button>
            )}
            {foto ? (
              <button
                onClick={() => fotocamera.current?.click()}
                aria-label="Cambia foto"
                className="anello-focus absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-dorso text-su-dorso shadow"
              >
                {carico ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </button>
            ) : null}
            <input ref={fotocamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={nuovaFoto} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="titolo break-words text-[1.375rem] leading-tight">{voce.nome.toLowerCase()}</p>
            <label className="relative mt-1 inline-flex items-center gap-1 text-[0.8125rem] text-tenue">
              <IconaReparto icona={reparto?.icona} className="size-3.5" />
              <span className="underline decoration-dotted underline-offset-4">{reparto?.nome ?? "Altro"}</span>
              <ChevronDown className="size-3.5" />
              <select
                value={voce.reparto_id ?? ""}
                onChange={(e) => azioni.modificaVoce(voce, { reparto_id: e.target.value || null })}
                aria-label="Reparto"
                className="absolute inset-0 cursor-pointer opacity-0"
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
            </label>
          </div>
          <button onClick={chiudi} aria-label="Chiudi" className="anello-focus grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex h-10 items-center rounded-full ring-1 ring-linea">
            <button onClick={() => q - passo > 0 && azioni.modificaVoce(voce, { quantita: q - passo })} className="grid size-10 place-items-center text-tenue hover:text-inchiostro" aria-label="Meno">
              <Minus className="size-4" />
            </button>
            <span className="numeri min-w-8 text-center font-semibold">{formattaQuantita(q)}</span>
            <button onClick={() => azioni.modificaVoce(voce, { quantita: q + passo })} className="grid size-10 place-items-center text-tenue hover:text-inchiostro" aria-label="Più">
              <Plus className="size-4" />
            </button>
          </div>
          <select value={voce.unita} onChange={(e) => azioni.modificaVoce(voce, { unita: e.target.value })} aria-label="Unità" className="h-10 rounded-full bg-superficie px-4 ring-1 ring-linea">
            {[...new Set([...UNITA, voce.unita])].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <button
            onClick={() => azioni.modificaVoce(voce, { urgente: !voce.urgente })}
            aria-pressed={voce.urgente}
            className={cn(
              "anello-focus ml-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-medium transition",
              voce.urgente ? "bg-becco text-su-becco" : "text-tenue ring-1 ring-linea hover:text-inchiostro",
            )}
          >
            <Flame className="size-4" /> Urgente
          </button>
        </div>

        <label className="mt-4 flex flex-col-reverse gap-1 text-[0.75rem] text-tenue">
          Nota
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={salvaNota}
            placeholder="Marca, formato…"
            className="campo-linea h-10 text-[1rem] text-inchiostro placeholder:text-tenue/60"
          />
        </label>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => (azioni.elimina(voce), onChiudi())} aria-label="Elimina" className="anello-focus grid size-10 place-items-center rounded-full text-pericolo hover:bg-pericolo-tenue">
            <Trash2 className="size-[18px]" />
          </button>
          <Pulsante onClick={chiudi}>Fatto</Pulsante>
        </div>
    </>
  );

  if (inline) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        aria-label={voce.nome}
        className="rounded-[24px] bg-superficie p-5 ring-1 ring-linea shadow-[0_18px_40px_-28px_rgba(var(--ombra),0.5)]"
      >
        {contenuto}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/40 p-3 backdrop-blur-md sm:items-center"
      onClick={chiudi}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={voce.nome}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="pb-sicuro w-full max-w-md rounded-[32px] bg-superficie p-5 shadow-2xl"
      >
        {contenuto}
      </motion.div>
    </motion.div>
  );
}

/** Al supermercato: la foto a tutto schermo, e dentro al carrello con un tocco. */
function FotoGrande({ voce, url, onCarrello, onChiudi }: { voce: VoceLista; url: string; onCarrello: () => void; onChiudi: () => void }) {
  const dettagli = [voce.note, Number(voce.quantita) !== 1 || voce.unita !== "pz" ? `${formattaQuantita(Number(voce.quantita))} ${voce.unita}` : null].filter(Boolean).join(" · ");

  useEffect(() => {
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto di ${voce.nome}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-sicuro pb-sicuro fixed inset-0 z-[70] flex flex-col bg-[#0b0e1c]"
      onClick={onChiudi}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <motion.img
          src={url}
          alt={voce.nome}
          initial={{ scale: 0.94 }}
          animate={{ scale: 1 }}
          className="max-h-full max-w-full rounded-[24px] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="px-6 pb-6 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="titolo text-[1.5rem]">{voce.nome.toLowerCase()}</p>
        {dettagli ? <p className="text-white/75">{dettagli}</p> : null}
        <div className="mt-4 flex gap-3">
          {!voce.presa ? (
            <button onClick={onCarrello} className="anello-focus flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-becco font-semibold text-su-becco active:scale-[0.98]">
              <Check className="size-4" strokeWidth={3} /> Nel carrello
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <button onClick={onChiudi} aria-label="Chiudi" className="anello-focus grid size-12 place-items-center rounded-full bg-white/15 text-white">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
