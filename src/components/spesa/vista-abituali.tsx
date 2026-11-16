"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Search, Star, Trash2 } from "lucide-react";
import type { Lista, Prodotto } from "@/lib/database.types";
import { indovinaReparto, stessoArticolo } from "@/lib/spesa";
import { cn } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";
import { IconaReparto } from "./icona-reparto";

/** Quante spese diverse servono perché un prodotto diventi abituale. */
const SOGLIA = 2;

type Abituale = {
  nome: string;
  unita: string;
  volte: number;
  prodotto: Prodotto | undefined;
};

/**
 * Abituali: quello che ricompare in più spese (carrelli chiusi, spese a mano o lette dallo scontrino),
 * più i preferiti con la stellina. Quello che togliete non ricompare più.
 */
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
  const [daTogliere, setDaTogliere] = useState<string | null>(null);

  const inLista = useMemo(() => dati.voci.filter((v) => v.lista_id === lista?.id && !v.presa).map((v) => v.nome), [dati.voci, lista?.id]);

  // Raggruppa i prodotti delle spese: "Banane" e "banana" sono la stessa cosa
  const abituali = useMemo(() => {
    const gruppi: { nomi: Map<string, number>; unita: Map<string, number>; spese: Set<string> }[] = [];
    const chiave = (g: (typeof gruppi)[number]) => [...g.nomi.keys()][0];
    for (const s of dati.spese) {
      for (const p of s.prodotti ?? []) {
        const nome = p.nome.trim();
        if (!nome) continue;
        let g = gruppi.find((x) => stessoArticolo(chiave(x), nome));
        if (!g) {
          g = { nomi: new Map(), unita: new Map(), spese: new Set() };
          gruppi.push(g);
        }
        g.nomi.set(nome, (g.nomi.get(nome) ?? 0) + 1);
        g.unita.set(p.unita || "pz", (g.unita.get(p.unita || "pz") ?? 0) + 1);
        g.spese.add(s.id);
      }
    }
    const piuUsato = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];

    const elenco: Abituale[] = gruppi.map((g) => {
      const nome = piuUsato(g.nomi);
      return { nome: nome.charAt(0).toUpperCase() + nome.slice(1), unita: piuUsato(g.unita), volte: g.spese.size, prodotto: dati.prodotti.find((p) => stessoArticolo(p.nome, nome)) };
    });
    // I preferiti restano anche se comprati poche volte
    for (const p of dati.prodotti) {
      if (p.abituale && !elenco.some((a) => stessoArticolo(a.nome, p.nome))) elenco.push({ nome: p.nome, unita: p.unita, volte: 0, prodotto: p });
    }
    return elenco
      .filter((a) => !a.prodotto?.nascosto && (a.volte >= SOGLIA || a.prodotto?.abituale))
      .sort((a, b) => Number(!!b.prodotto?.abituale) - Number(!!a.prodotto?.abituale) || b.volte - a.volte || a.nome.localeCompare(b.nome));
  }, [dati.spese, dati.prodotti]);

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return abituali.filter((a) => (!q || a.nome.toLowerCase().includes(q)) && (!soloPreferiti || a.prodotto?.abituale));
  }, [abituali, cerca, soloPreferiti]);

  async function aggiungi(a: Abituale) {
    if (!lista) return;
    await azioni.aggiungi(a.nome, { unita: a.unita, quantita: 1 });
    avvisa(`${a.nome} aggiunto a ${lista.nome}`);
  }

  async function togli(a: Abituale) {
    setDaTogliere(null);
    await azioni.segnaAbituale(a.nome, a.unita, { nascosto: true, abituale: false });
    avvisa(`${a.nome} tolto dagli abituali`);
  }

  return (
    <div className="mt-8 lg:mt-0">
      <div className="flex items-center gap-3 md:gap-5">
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
            "anello-focus flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold transition max-sm:w-11 sm:px-5",
            soloPreferiti ? "bg-becco text-su-becco" : "text-inchiostro-2 ring-[1.5px] ring-linea-forte hover:ring-inchiostro",
          )}
        >
          <Star className="size-4" fill={soloPreferiti ? "currentColor" : "none"} /> <span className="max-sm:sr-only">Solo i preferiti</span>
        </button>
      </div>

      {visibili.length === 0 ? (
        <p className="mt-10 max-w-md text-tenue">
          {abituali.length === 0 ? "Qui compare quello che comprate più spesso." : "Nessun prodotto con questo nome."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {visibili.map((a) => {
              const repartoId = a.prodotto?.reparto_id ?? indovinaReparto(a.nome, dati.reparti);
              const reparto = dati.reparti.find((r) => r.id === repartoId);
              const presente = inLista.some((n) => stessoArticolo(n, a.nome));
              const preferito = !!a.prodotto?.abituale;
              const conferma = daTogliere === a.nome;
              return (
                <motion.li
                  layout
                  key={a.nome}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 border-b border-linea py-3"
                >
                  <IconaReparto icona={reparto?.icona} className="size-[18px] shrink-0 text-tenue" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1rem]">{a.nome}</p>
                    <p className="text-[0.8125rem] text-tenue">{a.volte > 0 ? `Preso ${a.volte} ${a.volte === 1 ? "volta" : "volte"}` : (reparto?.nome ?? "Altro")}</p>
                  </div>

                  {conferma ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button onClick={() => setDaTogliere(null)} className="anello-focus h-9 rounded-full px-3 text-[0.8125rem] text-tenue hover:text-inchiostro">
                        Annulla
                      </button>
                      <button onClick={() => togli(a)} className="anello-focus h-9 rounded-full bg-pericolo px-3.5 text-[0.8125rem] font-semibold text-white">
                        Togli
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setDaTogliere(a.nome)}
                        aria-label={`Togli ${a.nome} dagli abituali`}
                        className="anello-focus grid size-9 shrink-0 place-items-center rounded-full text-linea-forte transition hover:bg-pericolo-tenue hover:text-pericolo"
                      >
                        <Trash2 className="size-[17px]" />
                      </button>
                      <button
                        onClick={() => azioni.segnaAbituale(a.nome, a.unita, { abituale: !preferito })}
                        aria-label={preferito ? "Togli dai preferiti" : "Metti nei preferiti"}
                        aria-pressed={preferito}
                        className={cn("anello-focus grid size-9 shrink-0 place-items-center rounded-full transition", preferito ? "text-becco" : "text-linea-forte hover:text-tenue")}
                      >
                        <Star className="size-[18px]" fill={preferito ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => !presente && aggiungi(a)}
                        disabled={presente || !lista}
                        aria-label={presente ? "Già in lista" : `Aggiungi ${a.nome} alla lista`}
                        className={cn(
                          "anello-focus grid size-10 shrink-0 place-items-center rounded-full transition",
                          presente ? "bg-superficie-3 text-tenue" : "bg-becco text-su-becco hover:bg-becco-hover active:scale-95",
                        )}
                      >
                        {presente ? <Check className="size-4" strokeWidth={2.6} /> : <Plus className="size-5" strokeWidth={2.4} />}
                      </button>
                    </>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
