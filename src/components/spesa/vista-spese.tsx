"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Paperclip, Plus, Receipt, Trash2 } from "lucide-react";
import type { Lista, Spesa } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { apriScontrino } from "@/lib/scontrini";
import type { MembroCasa } from "@/lib/sessione";
import { Avatar } from "@/components/ui";
import { Mascotte } from "@/components/mascotte";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { NuovaSpesa } from "./nuova-spesa";

const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function euro(n: number, decimali = true) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: decimali ? 2 : 0, maximumFractionDigits: decimali ? 2 : 0 });
}

/** Data locale in formato AAAA-MM-GG, senza passare per UTC. */
function chiave(anno: number, mese: number, giorno: number) {
  return `${anno}-${String(mese + 1).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

function oggiChiave() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export function VistaSpese({
  dati,
  liste,
  membri,
  userId,
  azioni,
}: {
  dati: DatiSpesa;
  liste: Lista[];
  membri: MembroCasa[];
  userId: string;
  azioni: AzioniSpesa;
}) {
  const oggi = oggiChiave();
  const daComprare = useMemo(() => [...new Set(dati.voci.filter((v) => !v.presa).map((v) => v.nome))], [dati.voci]);
  const [anno, setAnno] = useState(Number(oggi.slice(0, 4)));
  const [mese, setMese] = useState(Number(oggi.slice(5, 7)) - 1);
  const [giorno, setGiorno] = useState<string | null>(null);
  const [nuova, setNuova] = useState(false);

  const prefisso = `${anno}-${String(mese + 1).padStart(2, "0")}`;
  const speseMese = useMemo(() => dati.spese.filter((s) => s.data.startsWith(prefisso)), [dati.spese, prefisso]);
  const perGiorno = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of speseMese) m.set(s.data, (m.get(s.data) ?? 0) + Number(s.importo));
    return m;
  }, [speseMese]);
  const totaleMese = speseMese.reduce((t, s) => t + Number(s.importo), 0);
  const massimo = Math.max(0, ...perGiorno.values());

  const precedente = mese === 0 ? { a: anno - 1, m: 11 } : { a: anno, m: mese - 1 };
  const prefissoPrec = `${precedente.a}-${String(precedente.m + 1).padStart(2, "0")}`;
  const totalePrec = dati.spese.filter((s) => s.data.startsWith(prefissoPrec)).reduce((t, s) => t + Number(s.importo), 0);

  const nomeMese = new Date(anno, mese, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const nomeMesePrec = new Date(precedente.a, precedente.m, 1).toLocaleDateString("it-IT", { month: "long" });
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const vuoteIniziali = (new Date(anno, mese, 1).getDay() + 6) % 7; // lunedì = 0

  function cambiaMese(delta: number) {
    const d = new Date(anno, mese + delta, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth());
    setGiorno(null);
  }

  const elenco = (giorno ? speseMese.filter((s) => s.data === giorno) : speseMese)
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data) || b.creata_il.localeCompare(a.creata_il));

  return (
    <div>
      {nuova ? (
        <div className="mt-5">
          <NuovaSpesa liste={liste} giornoIniziale={giorno} azioni={azioni} daComprare={daComprare} onChiudi={() => setNuova(false)} />
        </div>
      ) : null}
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {/* Mese e totale */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex w-full items-center gap-1 sm:w-auto">
            <button onClick={() => cambiaMese(-1)} aria-label="Mese precedente" className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro">
              <ChevronLeft className="size-5" />
            </button>
            <p className="titolo-normale min-w-[10.5rem] text-center text-[1.25rem]">{nomeMese}</p>
            <button onClick={() => cambiaMese(1)} aria-label="Mese successivo" className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro">
              <ChevronRight className="size-5" />
            </button>
            <button
              onClick={() => setNuova(true)}
              aria-label="Nuova spesa"
              className="anello-focus ml-auto grid size-12 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95 sm:hidden"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          </div>
          <div className="flex items-center gap-5">
          <div className="sm:text-right">
            <p className="titolo-normale numeri text-[1.75rem] leading-none">{euro(totaleMese)}</p>
            <p className="mt-1.5 text-[0.8125rem] text-tenue">
              {speseMese.length} {speseMese.length === 1 ? "spesa" : "spese"}
              {totalePrec > 0 ? `, a ${nomeMesePrec} ${euro(totalePrec, false)}` : ""}
            </p>
          </div>
          <button
            onClick={() => setNuova(true)}
            aria-label="Nuova spesa"
            className="anello-focus hidden size-12 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95 sm:grid"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
          </div>
        </div>

        {/* Calendario */}
        <div className="mt-6 grid grid-cols-7 gap-1 md:gap-1.5">
          {GIORNI.map((g) => (
            <div key={g} className="pb-1 text-center text-[0.75rem] text-tenue">{g}</div>
          ))}
          {Array.from({ length: vuoteIniziali }, (_, i) => (
            <div key={`v${i}`} />
          ))}
          {Array.from({ length: giorniNelMese }, (_, i) => {
            const k = chiave(anno, mese, i + 1);
            const importo = perGiorno.get(k) ?? 0;
            const selezionato = giorno === k;
            const eOggi = k === oggi;
            const futuro = k > oggi;
            // Intensità del becco proporzionale alla spesa del giorno rispetto al massimo del mese
            const intensita = importo > 0 && massimo > 0 ? 0.18 + 0.62 * (importo / massimo) : 0;
            return (
              <button
                key={k}
                onClick={() => setGiorno(selezionato ? null : k)}
                disabled={futuro && importo === 0}
                aria-label={`${i + 1} ${nomeMese}${importo ? `: ${euro(importo)}` : ""}`}
                aria-pressed={selezionato}
                className={cn(
                  "anello-focus relative flex aspect-square flex-col items-start justify-between overflow-hidden rounded-[14px] p-1.5 text-left transition md:aspect-[1.15] md:rounded-[16px] md:p-2.5",
                  selezionato ? "bg-dorso text-su-dorso" : importo ? "text-inchiostro" : "text-inchiostro-2 hover:bg-superficie-2",
                  futuro && "text-linea-forte",
                  eOggi && !selezionato && "ring-2 ring-inset ring-inchiostro",
                )}
              >
                {importo > 0 && !selezionato ? (
                  <span aria-hidden className="absolute inset-0 bg-becco" style={{ opacity: intensita }} />
                ) : null}
                <span className="numeri relative text-[0.8125rem] md:text-[0.875rem]">{i + 1}</span>
                {importo > 0 ? (
                  <span className="numeri relative w-full truncate text-[0.6875rem] font-semibold md:text-[0.875rem]">
                    {Math.round(importo)}
                    <span className="font-normal opacity-70"> €</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dettaglio: il giorno scelto, oppure tutto il mese */}
      <aside className="min-w-0">
        <div className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
          <h2 className="titolo text-[1.125rem]">
            {giorno ? new Date(`${giorno}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "tutte le spese del mese"}
          </h2>
          {giorno ? (
            <button onClick={() => setGiorno(null)} className="anello-focus text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
              tutto il mese
            </button>
          ) : null}
        </div>

        {dati.spese.length === 0 ? (
          <div className="mt-8 flex items-center gap-4">
            <Mascotte className="w-16" />
            <p className="text-[0.9375rem] text-tenue">Quando chiudete un carrello e scrivete quanto avete speso, la spesa compare qui.</p>
          </div>
        ) : elenco.length === 0 ? (
          <p className="py-6 text-[0.9375rem] text-tenue">{giorno ? "Nessuna spesa in questo giorno." : "Nessuna spesa in questo mese."}</p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {elenco.map((s) => (
                <RigaSpesa
                  key={s.id}
                  spesa={s}
                  nomeLista={s.negozio || dati.liste.find((l) => l.id === s.lista_id)?.nome}
                  coloreLista={dati.liste.find((l) => l.id === s.lista_id)?.colore}
                  chi={membri.find((m) => m.id === s.pagata_da)}
                  userId={userId}
                  mostraGiorno={!giorno}
                  azioni={azioni}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </aside>
    </div>
    </div>
  );
}

function RigaSpesa({
  spesa,
  nomeLista,
  coloreLista,
  chi,
  userId,
  mostraGiorno,
  azioni,
}: {
  spesa: Spesa;
  nomeLista: string | undefined;
  coloreLista: string | undefined;
  chi: MembroCasa | undefined;
  userId: string;
  mostraGiorno: boolean;
  azioni: AzioniSpesa;
}) {
  const [aperta, setAperta] = useState(false);
  const prodotti = Array.isArray(spesa.prodotti) ? spesa.prodotti : [];
  const campoFile = useRef<HTMLInputElement>(null);

  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-linea py-3.5">
      <button onClick={() => setAperta((a) => !a)} className="anello-focus flex w-full items-center gap-3 text-left">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: coloreLista ?? "var(--linea-forte)" }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-[1rem]">
            {nomeLista ?? "Spesa"}
            {spesa.scontrino_path ? <Receipt className="size-3.5 shrink-0 text-tenue" aria-label="con scontrino" /> : null}
          </span>
          <span className="block text-[0.8125rem] text-tenue">
            {mostraGiorno ? `${new Date(`${spesa.data}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}, ` : ""}
            {spesa.num_prodotti ? `${spesa.num_prodotti} ${spesa.num_prodotti === 1 ? "prodotto" : "prodotti"}` : spesa.origine === "manuale" ? "inserita a mano" : "nessun prodotto"}
            {chi ? `, pagata da ${chi.id === userId ? "te" : chi.nome.split(" ")[0]}` : ""}
          </span>
        </span>
        <span className="titolo-normale numeri shrink-0 text-[1.125rem]">{euro(Number(spesa.importo))}</span>
        <motion.span animate={{ rotate: aperta ? 180 : 0 }} className="inline-flex text-tenue">
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {aperta ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-[20px] bg-superficie-2 p-4">
              {prodotti.length > 0 ? (
                <ul className="flex flex-col gap-1 text-[0.875rem]">
                  {prodotti.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="truncate">{p.nome}</span>
                      <span className="numeri shrink-0 text-tenue">
                        {Number(p.quantita) !== 1 || p.unita !== "pz" ? `${formattaQuantita(Number(p.quantita))} ${p.unita}` : ""}
                        {p.prezzo !== null && p.prezzo !== undefined ? `${Number(p.quantita) !== 1 || p.unita !== "pz" ? "  " : ""}${euro(Number(p.prezzo))}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-linea pt-3">
                <label className="flex flex-col gap-1 text-[0.75rem] text-tenue">
                  Importo
                  <input
                    defaultValue={Number(spesa.importo).toFixed(2).replace(".", ",")}
                    inputMode="decimal"
                    onBlur={(e) => {
                      const n = Number(e.target.value.replace(",", "."));
                      if (Number.isFinite(n) && n >= 0 && n !== Number(spesa.importo)) azioni.modificaSpesa(spesa, { importo: Math.round(n * 100) / 100 });
                    }}
                    className="campo-linea numeri h-9 w-24 text-[0.9375rem] text-inchiostro"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[0.75rem] text-tenue">
                  Giorno
                  <input
                    type="date"
                    defaultValue={spesa.data}
                    onChange={(e) => e.target.value && azioni.modificaSpesa(spesa, { data: e.target.value })}
                    className="campo-linea h-9 text-[0.9375rem] text-inchiostro"
                  />
                </label>
                {chi ? <Avatar nome={chi.nome} colore={chi.colore} className="mb-1 size-7 text-[0.625rem]" /> : null}
                <input
                  ref={campoFile}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) azioni.allegaScontrino(spesa, f);
                    e.target.value = "";
                  }}
                />
                {spesa.scontrino_path ? (
                  <button
                    onClick={() => apriScontrino(createClient(), spesa.scontrino_path!)}
                    className="anello-focus mb-0.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold hover:bg-superficie-3"
                  >
                    <Receipt className="size-3.5" /> Vedi scontrino
                  </button>
                ) : null}
                <button
                  onClick={() => campoFile.current?.click()}
                  className="anello-focus mb-0.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-tenue hover:bg-superficie-3 hover:text-inchiostro"
                >
                  <Paperclip className="size-3.5" /> {spesa.scontrino_path ? "Sostituisci" : "Allega scontrino"}
                </button>
                <button
                  onClick={() => azioni.eliminaSpesa(spesa)}
                  className="anello-focus mb-0.5 ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-pericolo hover:bg-pericolo-tenue"
                >
                  <Trash2 className="size-3.5" /> Elimina
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
