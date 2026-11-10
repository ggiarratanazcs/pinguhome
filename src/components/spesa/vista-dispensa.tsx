"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { interpretaVoce, POSIZIONI, UNITA } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";

const IMMAGINI: Record<string, { vuoto: string; pinguino: string }> = {
  frigo: { vuoto: "/casa/frigo-vuoto.webp", pinguino: "/casa/frigo.webp" },
  freezer: { vuoto: "/casa/freezer-vuoto.webp", pinguino: "/casa/freezer.webp" },
  dispensa: { vuoto: "/casa/dispensa-vuoto.webp", pinguino: "/casa/dispensa.webp" },
};

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
  const [aperta, setAperta] = useState<string | null>(null);
  const posAperta = POSIZIONI.find((p) => p.id === aperta);

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

  return (
    <div className="mt-8">
      <NuovaInDispensa onSalva={azioni.salvaDispensa} />

      <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3 md:gap-6">
        {POSIZIONI.map((pos) => {
          const n = righe.filter((r) => r.posizione === pos.id).length;
          return (
            <button
              key={pos.id}
              onClick={() => setAperta(pos.id)}
              className="anello-focus group flex flex-col items-center rounded-[24px] bg-superficie-2 px-2 pb-3 pt-4 transition-transform active:scale-[0.97] md:rounded-[32px] md:px-6 md:pb-5 md:pt-6"
            >
              <div className="relative aspect-[3/4] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMMAGINI[pos.id].vuoto}
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
                <motion.img
                  src={IMMAGINI[posAperta.id].pinguino}
                  initial={{ opacity: 0, y: 24, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.08 }}
                  alt=""
                  draggable={false}
                  className="h-36 w-auto -mt-16 object-contain drop-shadow-[0_18px_22px_rgba(var(--ombra),0.25)] sm:h-44 sm:-mt-24"
                />
                <div className="min-w-0 flex-1 pb-2">
                  <p className="titolo text-[1.375rem]">{posAperta.nome.toLowerCase()}</p>
                  <p className="numeri text-[0.875rem] text-tenue">
                    {righe.filter((r) => r.posizione === posAperta.id).length}
                  </p>
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
                      <RigaDispensa key={r.id} riga={r} azioni={azioni} onRicompra={() => ricompra(r)} />
                    ))}
                </AnimatePresence>
                {righe.every((r) => r.posizione !== posAperta.id) ? (
                  <li className="py-5 text-[0.875rem] text-tenue">Niente qui.</li>
                ) : null}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
      <div className="flex items-center gap-2">
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
        <div className="flex items-center border-l border-linea pl-1">
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
