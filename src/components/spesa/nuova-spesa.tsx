"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Lista, ProdottoSpesa } from "@/lib/database.types";
import { leggiScontrino } from "@/lib/scontrini";
import { Messaggio, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AzioniSpesa } from "./app-spesa";
import { AllegaScontrino } from "./allega-scontrino";

type Modo = "mano" | "scontrino";
type Riga = ProdottoSpesa & { chiave: string };

function oggiChiave() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function numero(testo: string) {
  const n = Number(testo.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Pannello per aggiungere una spesa dalla sezione Spese: scritta a mano o letta da uno scontrino. */
export function NuovaSpesa({
  liste,
  giornoIniziale,
  azioni,
  onChiudi,
}: {
  liste: Lista[];
  giornoIniziale: string | null;
  azioni: AzioniSpesa;
  onChiudi: () => void;
}) {
  const oggi = oggiChiave();
  const [modo, setModo] = useState<Modo>("mano");
  const [scontrino, setScontrino] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [lettura, setLettura] = useState<"attesa" | "in-corso" | "fatta">("attesa");
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  // Campi del modulo (gli stessi per i due modi: la lettura li compila)
  const [data, setData] = useState(giornoIniziale && giornoIniziale <= oggi ? giornoIniziale : oggi);
  const [importo, setImporto] = useState("");
  const [negozio, setNegozio] = useState("");
  const [listaId, setListaId] = useState<string>(liste[0]?.id ?? "");
  const [righe, setRighe] = useState<Riga[]>([]);
  const fotocamera = useRef<HTMLInputElement>(null);

  function scegliFoto(file: File | null) {
    setScontrino(file);
    setErrore(null);
    if (anteprima) URL.revokeObjectURL(anteprima);
    setAnteprima(file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    if (file && modo === "scontrino") leggi(file);
  }

  async function leggi(file: File) {
    setLettura("in-corso");
    try {
      const r = await leggiScontrino(file);
      if (r.data) setData(r.data > oggi ? oggi : r.data);
      if (r.totale !== null) setImporto(r.totale.toFixed(2).replace(".", ","));
      if (r.negozio) setNegozio(r.negozio);
      setRighe(r.prodotti.map((p) => ({ ...p, chiave: crypto.randomUUID() })));
      setLettura("fatta");
      if (r.totale === null) setErrore("Non ho trovato il totale: scrivilo tu.");
    } catch (e) {
      setLettura("attesa");
      setErrore(e instanceof Error ? e.message : "Non sono riuscito a leggere lo scontrino.");
    }
  }

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = numero(importo);
    if (!Number.isFinite(n) || n < 0) {
      setErrore("Scrivi quanto avete speso, ad esempio 42,50.");
      return;
    }
    setSalvataggio(true);
    const ok = await azioni.creaSpesa({
      data,
      importo: Math.round(n * 100) / 100,
      lista_id: listaId || null,
      negozio: negozio.trim() || null,
      prodotti: righe.filter((r) => r.nome.trim()).map(({ chiave: _c, ...p }) => (void _c, { ...p, nome: p.nome.trim() })),
      origine: modo === "scontrino" && lettura === "fatta" ? "scontrino" : "manuale",
      scontrino,
    });
    setSalvataggio(false);
    if (ok) onChiudi();
  }

  const sommaRighe = righe.reduce((t, r) => t + (r.prezzo ?? 0), 0);

  return (
    <motion.form
      onSubmit={salva}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mt-6 rounded-[28px] bg-superficie-2 p-5 md:p-6"
    >
      <button type="button" onClick={onChiudi} aria-label="Chiudi" className="anello-focus absolute right-4 top-4 grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro">
        <X className="size-5" />
      </button>

      <p className="titolo text-[1.125rem]">nuova spesa</p>
      <div className="mt-3 flex gap-5 text-[0.9375rem]">
        {(
          [
            ["mano", "Scrivila a mano"],
            ["scontrino", "Leggi uno scontrino"],
          ] as const
        ).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setModo(id);
              setErrore(null);
            }}
            className={cn("anello-focus relative pb-1", modo === id ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro")}
          >
            {nome}
            {modo === id ? <motion.span layoutId="modo-nuova-spesa" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-becco" /> : null}
          </button>
        ))}
      </div>

      {/* Lettura dello scontrino */}
      {modo === "scontrino" ? (
        <div className="mt-6">
          <input
            ref={fotocamera}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => scegliFoto(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-4">
            {anteprima ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={anteprima} alt="Scontrino scelto" className="h-28 w-20 rounded-[12px] object-cover ring-1 ring-linea" />
            ) : null}
            <div className="flex flex-col items-start gap-2">
              <Pulsante type="button" variante={anteprima ? "secondario" : "primario"} onClick={() => fotocamera.current?.click()} disabled={lettura === "in-corso"}>
                <Camera className="size-[18px]" /> {anteprima ? "Cambia foto" : "Scatta o scegli la foto"}
              </Pulsante>
              {lettura === "in-corso" ? (
                <p className="flex items-center gap-2 text-[0.875rem] text-tenue">
                  <Loader2 className="size-4 animate-spin" /> Sto leggendo lo scontrino…
                </p>
              ) : lettura === "fatta" ? (
                <p className="text-[0.875rem] text-tenue">Ho letto lo scontrino: controlla i dati e salva.</p>
              ) : (
                <p className="text-[0.875rem] text-tenue">Inquadra lo scontrino intero, dritto e ben illuminato.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {errore ? <div className="mt-5"><Messaggio tipo="errore">{errore}</Messaggio></div> : null}

      {/* Dati della spesa: sempre visibili a mano, dopo la lettura con lo scontrino */}
      {modo === "mano" || lettura === "fatta" || errore ? (
        <div className="mt-6">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
              Totale
              <span className="flex items-baseline gap-1.5 border-b-[1.5px] border-linea-forte focus-within:border-becco">
                <span className="text-tenue">€</span>
                <input
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  required
                  inputMode="decimal"
                  placeholder="0,00"
                  className="numeri h-11 w-full bg-transparent text-[1.25rem] font-semibold text-inchiostro outline-none placeholder:font-normal placeholder:text-tenue/50"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
              Giorno
              <input type="date" value={data} max={oggi} onChange={(e) => setData(e.target.value)} required className="campo-linea h-11 text-inchiostro" />
            </label>
            <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
              Negozio
              <input value={negozio} onChange={(e) => setNegozio(e.target.value)} placeholder="Es. Coop" className="campo-linea h-11 text-inchiostro" />
            </label>
            <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
              Lista
              <select value={listaId} onChange={(e) => setListaId(e.target.value)} className="campo-linea h-11 text-inchiostro">
                {liste.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
                <option value="">Nessuna lista</option>
              </select>
            </label>
          </div>

          {/* Prodotti: letti dallo scontrino o aggiunti a mano, tutti modificabili */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between border-b border-linea-forte pb-1.5">
              <p className="text-[0.8125rem] text-tenue">Prodotti {righe.length ? `(${righe.length})` : "(facoltativi)"}</p>
              {sommaRighe > 0 ? (
                <p className="numeri text-[0.8125rem] text-tenue">somma righe {sommaRighe.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p>
              ) : null}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              <AnimatePresence initial={false}>
                {righe.map((r) => (
                  <motion.li key={r.chiave} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 border-b border-linea py-1.5">
                    <input
                      value={r.nome}
                      onChange={(e) => setRighe((rr) => rr.map((x) => (x.chiave === r.chiave ? { ...x, nome: e.target.value } : x)))}
                      aria-label="Prodotto"
                      className="h-9 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-inchiostro outline-none"
                    />
                    <span className="numeri shrink-0 text-[0.8125rem] text-tenue">
                      {r.quantita !== 1 || r.unita !== "pz" ? `${String(r.quantita).replace(".", ",")} ${r.unita}` : ""}
                    </span>
                    <input
                      value={r.prezzo === null || r.prezzo === undefined ? "" : String(r.prezzo).replace(".", ",")}
                      onChange={(e) => {
                        const n = numero(e.target.value);
                        setRighe((rr) => rr.map((x) => (x.chiave === r.chiave ? { ...x, prezzo: e.target.value === "" || !Number.isFinite(n) ? null : n } : x)));
                      }}
                      inputMode="decimal"
                      placeholder="€"
                      aria-label="Prezzo"
                      className="numeri h-9 w-16 shrink-0 bg-transparent text-right text-[0.9375rem] text-inchiostro outline-none placeholder:text-tenue/50"
                    />
                    <button
                      type="button"
                      onClick={() => setRighe((rr) => rr.filter((x) => x.chiave !== r.chiave))}
                      aria-label={`Togli ${r.nome}`}
                      className="anello-focus grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <button
              type="button"
              onClick={() => setRighe((rr) => [...rr, { chiave: crypto.randomUUID(), nome: "", quantita: 1, unita: "pz", prezzo: null }])}
              className="anello-focus mt-2 flex items-center gap-1.5 text-[0.875rem] text-tenue hover:text-inchiostro"
            >
              <Plus className="size-4" /> Aggiungi un prodotto
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {modo === "mano" ? <AllegaScontrino file={scontrino} onCambia={scegliFoto} etichetta="Allega lo scontrino (facoltativo)" /> : <span />}
            <div className="flex gap-2">
              <Pulsante type="button" variante="fantasma" onClick={onChiudi}>Annulla</Pulsante>
              <Pulsante type="submit" disabled={salvataggio || lettura === "in-corso"}>
                {salvataggio ? <Loader2 className="size-4 animate-spin" /> : null}
                Salva la spesa
              </Pulsante>
            </div>
          </div>
        </div>
      ) : null}
    </motion.form>
  );
}
