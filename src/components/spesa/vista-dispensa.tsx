"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { etichettaScadenza, giorniAScadenza, interpretaVoce, POSIZIONI, UNITA } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { Pinguino } from "@/components/pinguino";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";

type Filtro = "tutto" | "scadenza" | "scorta";

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
  const [filtro, setFiltro] = useState<Filtro>("tutto");

  const righe = useMemo(() => {
    let r = dati.dispensa.slice();
    if (filtro === "scadenza") r = r.filter((x) => (giorniAScadenza(x.scadenza) ?? 99) <= 3);
    if (filtro === "scorta") r = r.filter((x) => x.scorta_minima !== null && Number(x.quantita) <= Number(x.scorta_minima));
    return r.sort((a, b) => (giorniAScadenza(a.scadenza) ?? 9999) - (giorniAScadenza(b.scadenza) ?? 9999) || a.nome.localeCompare(b.nome));
  }, [dati.dispensa, filtro]);

  const inScadenza = dati.dispensa.filter((x) => (giorniAScadenza(x.scadenza) ?? 99) <= 3).length;
  const sottoScorta = dati.dispensa.filter((x) => x.scorta_minima !== null && Number(x.quantita) <= Number(x.scorta_minima)).length;

  async function ricompra(r: Dispensa) {
    if (!lista) return;
    await azioni.aggiungi(r.nome, { quantita: 1, unita: r.unita });
    avvisa(`${r.nome} aggiunto a ${lista.nome}`);
  }

  const filtri: { id: Filtro; nome: string; n: number }[] = [
    { id: "tutto", nome: "Tutto", n: dati.dispensa.length },
    { id: "scadenza", nome: "Scade a breve", n: inScadenza },
    { id: "scorta", nome: "Sta finendo", n: sottoScorta },
  ];

  return (
    <div className="mt-8">
      <NuovaInDispensa onSalva={azioni.salvaDispensa} />

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.9375rem]">
        {filtri.map((f) => {
          const attivo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn("anello-focus relative flex items-baseline gap-1.5 pb-1 transition-colors", attivo ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro")}
            >
              {f.nome}
              <span className={cn("numeri text-[0.8125rem]", f.id !== "tutto" && f.n > 0 ? "text-becco-scuro" : "text-tenue")}>{f.n}</span>
              {attivo ? <motion.span layoutId="filtro-dispensa" className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-inchiostro" /> : null}
            </button>
          );
        })}
      </div>

      {dati.dispensa.length === 0 ? (
        <div className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Pinguino className="w-28" />
          <div>
            <p className="titolo-normale text-2xl">La casa è ancora vuota.</p>
            <p className="mt-2 max-w-md text-tenue">
              Chiudi una spesa con “metti in casa”, oppure aggiungi qui quello che avete già con la sua scadenza: ve lo ricordo prima che vada buttato.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {POSIZIONI.map((pos) => {
            const elenco = righe.filter((r) => r.posizione === pos.id);
            return (
              <section key={pos.id} className="min-w-0">
                <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
                  <span className="titolo text-[1.375rem]">{pos.nome}</span>
                  <span className="numeri text-[0.8125rem] text-tenue">{elenco.length}</span>
                </h2>
                <ul>
                  <AnimatePresence initial={false}>
                    {elenco.map((r) => (
                      <RigaDispensa key={r.id} riga={r} azioni={azioni} onRicompra={() => ricompra(r)} />
                    ))}
                  </AnimatePresence>
                  {elenco.length === 0 ? <li className="py-5 text-[0.875rem] text-tenue">Niente qui.</li> : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RigaDispensa({ riga, azioni, onRicompra }: { riga: Dispensa; azioni: AzioniSpesa; onRicompra: () => void }) {
  const giorni = giorniAScadenza(riga.scadenza);
  const etichetta = etichettaScadenza(giorni);
  const q = Number(riga.quantita);
  const passo = ["kg", "l"].includes(riga.unita) ? 0.5 : ["g", "ml"].includes(riga.unita) ? 100 : 1;
  const sotto = riga.scorta_minima !== null && q <= Number(riga.scorta_minima);
  const [modifica, setModifica] = useState(false);

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-linea py-3"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => setModifica((m) => !m)} className="anello-focus min-w-0 flex-1 text-left">
          <p className="truncate text-[1rem]">{riga.nome}</p>
          <p
            className={cn(
              "mt-0.5 text-[0.8125rem]",
              giorni !== null && giorni < 0 ? "font-semibold text-pericolo" : giorni !== null && giorni <= 3 ? "font-semibold text-becco-scuro" : "text-tenue",
            )}
          >
            {etichetta ?? "Senza scadenza"}
            {sotto ? <span className="font-semibold text-pericolo"> e sta finendo</span> : null}
          </p>
        </button>
        <div className="flex items-center">
          <button
            onClick={() => (q - passo <= 0 ? azioni.eliminaDispensa(riga) : azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: q - passo }))}
            className="anello-focus grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-inchiostro"
            aria-label={`Togli un po' di ${riga.nome}`}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="numeri min-w-12 text-center text-[0.875rem] font-semibold">
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
      </div>

      {sotto ? (
        <button onClick={onRicompra} className="anello-focus mt-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-inchiostro underline decoration-becco decoration-2 underline-offset-4">
          <ShoppingCart className="size-4" /> Rimetti in lista
        </button>
      ) : null}

      <AnimatePresence initial={false}>
        {modifica ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[20px] bg-superficie-2 p-4 text-sm">
              <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
                Scadenza
                <input
                  type="date"
                  defaultValue={riga.scadenza ?? ""}
                  onChange={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, scadenza: e.target.value || null })}
                  className="campo-linea h-9 text-inchiostro"
                />
              </label>
              <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
                Avvisami sotto
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="quantità"
                  defaultValue={riga.scorta_minima ?? ""}
                  onBlur={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, scorta_minima: e.target.value === "" ? null : Number(e.target.value) })}
                  className="campo-linea h-9 text-inchiostro"
                />
              </label>
              <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
                Dove
                <select
                  value={riga.posizione}
                  onChange={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, posizione: e.target.value })}
                  className="campo-linea h-9 text-inchiostro"
                >
                  {POSIZIONI.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-end">
                <Pulsante variante="pericolo" onClick={() => azioni.eliminaDispensa(riga)} className="h-9 px-4 text-sm">
                  <Trash2 className="size-4" /> Finito
                </Pulsante>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function NuovaInDispensa({ onSalva }: { onSalva: AzioniSpesa["salvaDispensa"] }) {
  const [aperta, setAperta] = useState(false);

  async function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const v = interpretaVoce(String(f.get("nome") ?? ""));
    if (!v.nome) return;
    await onSalva({
      nome: v.nome,
      quantita: v.quantita,
      unita: v.unita ?? String(f.get("unita") ?? "pz"),
      posizione: String(f.get("posizione") ?? "dispensa"),
      scadenza: String(f.get("scadenza") ?? "") || null,
    });
    form.reset();
  }

  if (!aperta) {
    return (
      <Pulsante variante="secondario" onClick={() => setAperta(true)}>
        <Plus className="size-4" /> Aggiungi quello che avete già
      </Pulsante>
    );
  }

  return (
    <form onSubmit={invia} className="grid gap-5 rounded-[28px] bg-superficie-2 p-5 md:grid-cols-[minmax(0,2fr)_90px_130px_150px] md:items-end md:p-6">
      <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
        Prodotto
        <input name="nome" required autoFocus placeholder="Es. 1 l latte" className="campo-linea h-10 text-[1rem] text-inchiostro" />
      </label>
      <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
        Unità
        <select name="unita" className="campo-linea h-10 text-inchiostro">
          {UNITA.map((u) => <option key={u}>{u}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
        Dove
        <select name="posizione" defaultValue="dispensa" className="campo-linea h-10 text-inchiostro">
          {POSIZIONI.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[0.8125rem] text-tenue">
        Scadenza
        <input name="scadenza" type="date" className="campo-linea h-10 text-inchiostro" />
      </label>
      <div className="flex gap-2 md:col-span-4">
        <Pulsante type="submit">Metti in casa</Pulsante>
        <Pulsante type="button" variante="fantasma" onClick={() => setAperta(false)}>Chiudi</Pulsante>
      </div>
    </form>
  );
}
