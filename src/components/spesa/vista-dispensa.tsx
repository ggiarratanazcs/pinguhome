"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { interpretaVoce, POSIZIONI, UNITA } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { Mascotte } from "@/components/mascotte";
import { formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";

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

  async function ricompra(r: Dispensa) {
    if (!lista) return;
    await azioni.aggiungi(r.nome, { quantita: 1, unita: r.unita });
    avvisa(`${r.nome} aggiunto a ${lista.nome}`);
  }

  return (
    <div className="mt-8">
      <NuovaInDispensa onSalva={azioni.salvaDispensa} />

      {dati.dispensa.length === 0 ? (
        <div className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Mascotte className="w-28" />
          <div>
            <p className="titolo-normale text-2xl">La casa è ancora vuota.</p>
            <p className="mt-2 max-w-md text-tenue">
              Chiudi una spesa con “metti in casa”, oppure aggiungi qui quello che avete già.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {POSIZIONI.map((pos) => {
            const elenco = righe.filter((r) => r.posizione === pos.id);
            return (
              <section key={pos.id} className="min-w-0">
                <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
                  <span className="titolo text-[1.125rem]">{pos.nome}</span>
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
  const q = Number(riga.quantita);
  const passo = ["kg", "l"].includes(riga.unita) ? 0.5 : ["g", "ml"].includes(riga.unita) ? 100 : 1;
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
        <button onClick={() => setModifica((m) => !m)} className="anello-focus min-w-0 flex-1 truncate text-left text-[1rem]">
          {riga.nome}
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

      <AnimatePresence initial={false}>
        {modifica ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-[20px] bg-superficie-2 p-4 text-sm">
              <label className="flex min-w-32 flex-1 flex-col gap-1 text-[0.8125rem] text-tenue">
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
              <Pulsante variante="secondario" onClick={onRicompra} className="h-9 px-4 text-sm">
                <ShoppingCart className="size-4" /> Rimetti in lista
              </Pulsante>
              <Pulsante variante="pericolo" onClick={() => azioni.eliminaDispensa(riga)} className="h-9 px-4 text-sm">
                <Trash2 className="size-4" /> Finito
              </Pulsante>
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
    <form onSubmit={invia} className="grid gap-5 rounded-[28px] bg-superficie-2 p-5 md:grid-cols-[minmax(0,2fr)_100px_150px] md:items-end md:p-6">
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
      <div className="flex gap-2 md:col-span-3">
        <Pulsante type="submit">Metti in casa</Pulsante>
        <Pulsante type="button" variante="fantasma" onClick={() => setAperta(false)}>Chiudi</Pulsante>
      </div>
    </form>
  );
}
