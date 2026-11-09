"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Plus, Search, Star } from "lucide-react";
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

  async function aggiungi(p: Prodotto) {
    if (!lista) return;
    await azioni.aggiungi(p.nome, { unita: p.unita, quantita: 1 });
    avvisa(`${p.nome} aggiunto a ${lista.nome}`);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end">
        <label className="flex flex-1 items-center gap-3 border-b-2 border-linea-forte pb-1 focus-within:border-becco">
          <Search className="size-5 text-tenue" />
          <input
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca un prodotto"
            className="h-12 min-w-0 flex-1 bg-transparent text-[1.125rem] outline-none placeholder:text-tenue/70"
          />
        </label>
        <button
          onClick={() => setSoloPreferiti((s) => !s)}
          aria-pressed={soloPreferiti}
          className={cn(
            "anello-focus flex h-11 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-semibold transition",
            soloPreferiti ? "bg-becco text-su-becco" : "text-inchiostro-2 ring-[1.5px] ring-linea-forte hover:ring-inchiostro",
          )}
        >
          <Star className="size-4" fill={soloPreferiti ? "currentColor" : "none"} /> Solo i preferiti
        </button>
      </div>

      {prodotti.length === 0 ? (
        <p className="mt-10 max-w-md text-tenue">
          {dati.prodotti.length === 0
            ? "Ogni cosa che aggiungete alla lista finisce qui: la prossima volta basta un tocco."
            : "Nessun prodotto con questo nome."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {prodotti.map((p) => {
            const reparto = dati.reparti.find((r) => r.id === p.reparto_id);
            const presente = inLista.has(p.nome.toLowerCase());
            return (
              <motion.li layout key={p.id} className="flex items-center gap-3 border-b border-linea py-3">
                <IconaReparto icona={reparto?.icona} className="size-[18px] shrink-0 text-tenue" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1rem]">{p.nome}</p>
                  <p className="text-[0.8125rem] text-tenue">
                    {p.volte_acquistato > 0 ? `Preso ${p.volte_acquistato} ${p.volte_acquistato === 1 ? "volta" : "volte"}` : reparto?.nome ?? "Altro"}
                  </p>
                </div>
                <button
                  onClick={() => azioni.modificaProdotto(p, { abituale: !p.abituale })}
                  aria-label={p.abituale ? "Togli dai preferiti" : "Metti nei preferiti"}
                  aria-pressed={p.abituale}
                  className={cn("anello-focus grid size-9 place-items-center rounded-full transition", p.abituale ? "text-becco" : "text-linea-forte hover:text-tenue")}
                >
                  <Star className="size-[18px]" fill={p.abituale ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => !presente && aggiungi(p)}
                  disabled={presente || !lista}
                  aria-label={presente ? "Già in lista" : `Aggiungi ${p.nome} alla lista`}
                  className={cn(
                    "anello-focus grid size-10 shrink-0 place-items-center rounded-full transition",
                    presente ? "bg-superficie-3 text-tenue" : "bg-becco text-su-becco hover:bg-becco-hover active:scale-95",
                  )}
                >
                  {presente ? <Check className="size-4" strokeWidth={2.6} /> : <Plus className="size-5" strokeWidth={2.4} />}
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
