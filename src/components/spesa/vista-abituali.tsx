"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Leaf, Plus, Search, Star } from "lucide-react";
import type { Lista, Prodotto } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { IconaReparto } from "./icona-reparto";

export function VistaAbituali({
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
  const [cerca, setCerca] = useState("");
  const [soloPreferiti, setSoloPreferiti] = useState(false);

  const inLista = useMemo(
    () => new Set(dati.voci.filter((v) => v.lista_id === lista?.id && !v.presa).map((v) => v.nome.toLowerCase())),
    [dati.voci, lista?.id],
  );

  const prodotti = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return dati.prodotti
      .filter((p) => (!q || p.nome.toLowerCase().includes(q)) && (!soloPreferiti || p.abituale))
      .sort((a, b) => Number(b.abituale) - Number(a.abituale) || b.volte_acquistato - a.volte_acquistato || a.nome.localeCompare(b.nome));
  }, [cerca, dati.prodotti, soloPreferiti]);

  const totaleAcquisti = dati.prodotti.reduce((s, p) => s + p.volte_acquistato, 0);
  const acquistiGreen = dati.prodotti.filter((p) => p.eco).reduce((s, p) => s + p.volte_acquistato, 0);
  const quotaGreen = totaleAcquisti ? Math.round((acquistiGreen / totaleAcquisti) * 100) : 0;

  async function aggiungi(p: Prodotto) {
    if (!lista) return;
    await azioni.aggiungi(p.nome, { unita: p.unita, quantita: 1 });
    avvisa(`${p.nome} → ${lista.nome}`);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="carta flex h-12 flex-1 items-center gap-3 px-4">
          <Search className="size-4 text-tenue" />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca tra i prodotti della casa" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <button
          onClick={() => setSoloPreferiti((s) => !s)}
          className={cn(
            "anello-focus flex h-12 items-center gap-2 rounded-[16px] border px-4 text-sm font-medium transition",
            soloPreferiti ? "border-transparent bg-becco-tenue text-[color-mix(in_oklab,var(--becco),black_35%)]" : "border-linea bg-superficie text-inchiostro-2",
          )}
        >
          <Star className="size-4" fill={soloPreferiti ? "currentColor" : "none"} /> Solo abituali
        </button>
        {totaleAcquisti > 0 ? (
          <div className="flex h-12 items-center gap-2 rounded-[16px] bg-eco-tenue px-4 text-sm font-semibold text-eco">
            <Leaf className="size-4" /> {quotaGreen}% acquisti green
          </div>
        ) : null}
      </div>

      {prodotti.length === 0 ? (
        <p className="mt-10 text-center text-sm text-tenue">
          {dati.prodotti.length === 0
            ? "I prodotti che aggiungi alla lista finiscono qui: la prossima volta basta un tocco."
            : "Nessun prodotto trovato."}
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {prodotti.map((p) => {
            const reparto = dati.reparti.find((r) => r.id === p.reparto_id);
            const presente = inLista.has(p.nome.toLowerCase());
            return (
              <motion.li layout key={p.id} className="carta flex items-center gap-3 p-3 pl-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-superficie-3 text-accento">
                  <IconaReparto icona={reparto?.icona} className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="text-xs text-tenue">
                    {p.volte_acquistato > 0 ? `Preso ${p.volte_acquistato} ${p.volte_acquistato === 1 ? "volta" : "volte"}` : reparto?.nome ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => azioni.modificaProdotto(p, { eco: !p.eco })}
                  aria-label="Green"
                  className={cn("grid size-8 place-items-center rounded-lg transition", p.eco ? "text-eco" : "text-tenue/50 hover:text-tenue")}
                >
                  <Leaf className="size-4" />
                </button>
                <button
                  onClick={() => azioni.modificaProdotto(p, { abituale: !p.abituale })}
                  aria-label="Abituale"
                  className={cn("grid size-8 place-items-center rounded-lg transition", p.abituale ? "text-becco" : "text-tenue/50 hover:text-tenue")}
                >
                  <Star className="size-4" fill={p.abituale ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => !presente && aggiungi(p)}
                  disabled={presente || !lista}
                  aria-label={presente ? "Già in lista" : "Aggiungi alla lista"}
                  className={cn(
                    "anello-focus grid size-9 shrink-0 place-items-center rounded-[12px] transition",
                    presente ? "bg-eco-tenue text-eco" : "bg-accento text-su-accento hover:bg-accento-hover active:scale-95",
                  )}
                >
                  {presente ? <Check className="size-4" strokeWidth={2.8} /> : <Plus className="size-4" strokeWidth={2.6} />}
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
