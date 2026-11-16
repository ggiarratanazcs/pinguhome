"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import type { Budget, Movimento } from "@/lib/database.types";
import { CATEGORIE_USCITA, categoria, movimentiTra } from "@/lib/finanze";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

function euro(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" });
}

function fineMese(mese: string) {
  const [a, m] = mese.split("-").map(Number);
  return `${mese}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}

function spostaMese(mese: string, n: number) {
  const [a, m] = mese.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nomeMese(mese: string) {
  const [a, m] = mese.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("it-IT", { month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Soglia oltre la quale una categoria si fa rossa */
const ATTENZIONE = 0.8;

function Barra({ v, colore }: { v: number; colore: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-superficie-3">
      <motion.span className="block h-full rounded-full" style={{ background: colore }} initial={false} animate={{ width: `${Math.min(100, v * 100)}%` }} transition={{ duration: 0.5, ease: [0.22, 0.9, 0.24, 1] }} />
    </span>
  );
}

export function VistaBudget({
  budget,
  movimenti,
  oggi,
  nascoste,
  onSalva,
  onElimina,
}: {
  budget: Budget[];
  movimenti: Movimento[];
  oggi: string;
  nascoste: boolean;
  onSalva: (categoria: string, importo: number) => Promise<void>;
  onElimina: (categoria: string) => Promise<void>;
}) {
  const [mese, setMese] = useState(oggi.slice(0, 7));
  const [maschera, setMaschera] = useState<{ categoria: string | null } | null>(null);
  const cifra = (n: number) => (nascoste ? "•••••" : euro(n));
  const corrente = mese === oggi.slice(0, 7);

  // Uscite del mese per categoria (le spese della lista arrivano già come uscite "spesa")
  const spese = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of movimentiTra(movimenti, `${mese}-01`, fineMese(mese))) {
      if (o.movimento.tipo !== "uscita" || o.data > oggi) continue;
      m[o.movimento.categoria] = (m[o.movimento.categoria] ?? 0) + Number(o.movimento.importo);
    }
    return m;
  }, [movimenti, mese, oggi]);

  const giorniRimasti = useMemo(() => {
    if (!corrente) return 0;
    const fine = Number(fineMese(mese).slice(8));
    return fine - Number(oggi.slice(8)) + 1;
  }, [corrente, mese, oggi]);

  const conBudget = CATEGORIE_USCITA.filter((c) => budget.some((b) => b.categoria === c.id));
  const senzaBudget = CATEGORIE_USCITA.filter((c) => !budget.some((b) => b.categoria === c.id) && (spese[c.id] ?? 0) > 0);
  const totaleBudget = budget.reduce((t, b) => t + Number(b.importo), 0);
  const totaleSpeso = conBudget.reduce((t, c) => t + (spese[c.id] ?? 0), 0);

  return (
    <div className="mt-6 max-w-3xl pb-16 lg:mt-0 lg:max-w-4xl">
      <div className="flex items-center gap-2">
        <button onClick={() => setMese((m) => spostaMese(m, -1))} aria-label="Mese prima" className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro">
          <ChevronLeft className="size-5" />
        </button>
        <p className="titolo min-w-0 flex-1 text-center text-[1.125rem]">{nomeMese(mese).toLowerCase()}</p>
        <button
          onClick={() => setMese((m) => spostaMese(m, 1))}
          disabled={corrente}
          aria-label="Mese dopo"
          className="anello-focus grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          onClick={() => setMaschera({ categoria: null })}
          aria-label="Nuovo budget"
          className="anello-focus ml-2 grid size-11 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </button>
      </div>

      {conBudget.length === 0 ? (
        <button
          onClick={() => setMaschera({ categoria: null })}
          className="anello-focus mt-6 w-full rounded-[22px] border-2 border-dashed border-linea-forte p-5 text-left text-tenue transition hover:border-becco hover:text-inchiostro"
        >
          Dai un tetto al mese a una categoria, per esempio 400 € per la spesa: la barra si riempie da sola con le uscite.
        </button>
      ) : (
        <>
          <div className="mt-5">
            <p className="text-[0.8125rem] text-tenue">
              Spesi <strong className="numeri text-inchiostro">{cifra(totaleSpeso)}</strong> di {cifra(totaleBudget)}
            </p>
            <div className="mt-2">
              <Barra v={totaleBudget ? totaleSpeso / totaleBudget : 0} colore={totaleSpeso > totaleBudget ? "var(--pericolo)" : "var(--dorso)"} />
            </div>
          </div>

          <ul className="mt-6 flex flex-col gap-1">
            {conBudget.map((c) => {
              const tetto = Number(budget.find((b) => b.categoria === c.id)!.importo);
              const speso = spese[c.id] ?? 0;
              const quota = speso / tetto;
              const sforato = speso > tetto;
              const attenzione = !sforato && quota >= ATTENZIONE;
              const resta = tetto - speso;
              return (
                <li key={c.id}>
                  <button onClick={() => setMaschera({ categoria: c.id })} className="anello-focus w-full rounded-[16px] px-2 py-2.5 text-left transition hover:bg-superficie-2">
                    <span className="flex items-center gap-2 text-[0.9375rem]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.colore }} />
                      <span className="flex-1">{c.nome}</span>
                      <span className={cn("numeri text-[0.875rem]", (attenzione || sforato) && "font-semibold text-pericolo")}>
                        {cifra(speso)} <span className="font-normal text-tenue">/ {cifra(tetto)}</span>
                      </span>
                    </span>
                    <span className="mt-1.5 block">
                      <Barra v={quota} colore={attenzione || sforato ? "var(--pericolo)" : c.colore} />
                    </span>
                    {sforato ? (
                      <span className="mt-1 block text-[0.75rem] text-pericolo">Superato di {cifra(-resta)}</span>
                    ) : attenzione && corrente ? (
                      <span className="mt-1 block text-[0.75rem] text-pericolo">
                        Restano {cifra(resta)} per {giorniRimasti === 1 ? "oggi" : `${giorniRimasti} giorni`}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {senzaBudget.length ? (
        <div className="mt-8">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Senza budget</p>
          <ul className="mt-1">
            {senzaBudget.map((c) => (
              <li key={c.id} className="flex items-center gap-2 border-b border-linea py-2.5 text-[0.9375rem] last:border-0">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.colore }} />
                <span className="flex-1">{c.nome}</span>
                <span className="numeri text-[0.875rem] text-tenue">{cifra(spese[c.id] ?? 0)}</span>
                <button onClick={() => setMaschera({ categoria: c.id })} className="anello-focus ml-2 text-[0.8125rem] font-semibold underline decoration-becco decoration-2 underline-offset-4">
                  Imposta
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AnimatePresence>
        {maschera ? (
          <MascheraBudget
            categoriaIniziale={maschera.categoria}
            budget={budget}
            onAnnulla={() => setMaschera(null)}
            onSalva={async (cat, n) => {
              setMaschera(null);
              await onSalva(cat, n);
            }}
            onElimina={async (cat) => {
              setMaschera(null);
              await onElimina(cat);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MascheraBudget({
  categoriaIniziale,
  budget,
  onAnnulla,
  onSalva,
  onElimina,
}: {
  categoriaIniziale: string | null;
  budget: Budget[];
  onAnnulla: () => void;
  onSalva: (categoria: string, importo: number) => Promise<void>;
  onElimina: (categoria: string) => Promise<void>;
}) {
  const libere = CATEGORIE_USCITA.filter((c) => c.id === categoriaIniziale || !budget.some((b) => b.categoria === c.id));
  const [cat, setCat] = useState(categoriaIniziale ?? libere[0]?.id ?? "spesa");
  const esistente = budget.find((b) => b.categoria === cat);
  const [importo, setImporto] = useState(esistente ? String(Number(esistente.importo)) : "");
  const n = Number(importo.replace(",", "."));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onAnnulla();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnulla]);

  function invia(e: FormEvent) {
    e.preventDefault();
    if (n > 0) onSalva(cat, n);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/40 p-3 backdrop-blur-md sm:items-center"
      onClick={onAnnulla}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label="Budget"
        onSubmit={invia}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="pb-sicuro relative w-full max-w-md rounded-[32px] bg-superficie p-5 shadow-2xl"
      >
        <button type="button" onClick={onAnnulla} aria-label="Chiudi" className="anello-focus absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
          <X className="size-4" />
        </button>
        <p className="titolo text-[1.25rem]">{categoriaIniziale && esistente ? categoria("uscita", cat).nome.toLowerCase() : "nuovo budget"}</p>

        {!categoriaIniziale || !esistente ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {libere.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={cn(
                  "anello-focus flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.875rem] transition",
                  cat === c.id ? "bg-dorso font-semibold text-su-dorso" : "bg-superficie-2 text-tenue hover:text-inchiostro",
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: c.colore }} />
                {c.nome}
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-5 flex flex-col gap-1 text-[0.8125rem] text-tenue">
          Al mese
          <input autoFocus value={importo} onChange={(e) => setImporto(e.target.value)} inputMode="decimal" placeholder="0 €" className="numeri campo-linea h-12 text-[1.5rem] text-inchiostro" />
        </label>

        <div className="mt-6 flex items-center justify-between gap-2">
          {esistente ? (
            <button type="button" onClick={() => onElimina(cat)} aria-label="Togli il budget" className="anello-focus grid size-10 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
              <Trash2 className="size-[18px]" />
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
              Annulla
            </Pulsante>
            <Pulsante type="submit" disabled={!(n > 0)}>
              Salva
            </Pulsante>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}
