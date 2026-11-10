"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Movimento } from "@/lib/database.types";
import { categoria, CATEGORIE_USCITA, euro, movimentiTra } from "@/lib/finanze";
import { Indicatore, Torta, type Fetta } from "@/components/spesa/vista-analisi";
import { cn } from "@/lib/utils";

type Periodo = "mese" | "trimestre" | "anno";

const PERIODI: { id: Periodo; nome: string }[] = [
  { id: "mese", nome: "Mese" },
  { id: "trimestre", nome: "3 mesi" },
  { id: "anno", nome: "Anno" },
];

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AnalisiFinanze({ movimenti, oggi }: { movimenti: Movimento[]; oggi: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("mese");
  const adesso = useMemo(() => new Date(`${oggi}T12:00:00`), [oggi]);
  const mesi = periodo === "mese" ? 1 : periodo === "trimestre" ? 3 : 12;
  const inizio = iso(new Date(adesso.getFullYear(), adesso.getMonth() - mesi + 1, 1));

  const occ = useMemo(() => movimentiTra(movimenti, inizio, oggi), [movimenti, inizio, oggi]);
  const entrate = occ.filter((o) => o.movimento.tipo === "entrata").reduce((t, o) => t + Number(o.movimento.importo), 0);
  const uscite = occ.filter((o) => o.movimento.tipo === "uscita").reduce((t, o) => t + Number(o.movimento.importo), 0);
  const messo = entrate - uscite;

  const fette = useMemo<Fetta[]>(() => {
    const m = new Map<string, number>();
    for (const o of occ) if (o.movimento.tipo === "uscita") m.set(o.movimento.categoria, (m.get(o.movimento.categoria) ?? 0) + Number(o.movimento.importo));
    return [...m.entries()]
      .map(([id, valore]) => {
        const c = categoria("uscita", id);
        return { id, nome: c.nome, valore, colore: c.colore };
      })
      .sort((a, b) => b.valore - a.valore || CATEGORIE_USCITA.findIndex((c) => c.id === a.id) - CATEGORIE_USCITA.findIndex((c) => c.id === b.id));
  }, [occ]);
  const principale = fette[0];

  // Entrate e uscite mese per mese (almeno gli ultimi sei)
  const barre = useMemo(() => {
    const n = Math.max(6, mesi);
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(adesso.getFullYear(), adesso.getMonth() - n + 1 + i, 1);
      const fine = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const o = movimentiTra(movimenti, iso(d), iso(fine) < oggi ? iso(fine) : oggi);
      return {
        nome: MESI_BREVI[d.getMonth()],
        entrate: o.filter((x) => x.movimento.tipo === "entrata").reduce((t, x) => t + Number(x.movimento.importo), 0),
        uscite: o.filter((x) => x.movimento.tipo === "uscita").reduce((t, x) => t + Number(x.movimento.importo), 0),
      };
    });
  }, [movimenti, mesi, adesso, oggi]);

  return (
    <div className="mt-6 pb-16">
      <div className="flex gap-2">
        {PERIODI.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={cn(
              "anello-focus h-9 rounded-full px-4 text-[0.875rem] transition",
              periodo === p.id ? "bg-dorso font-semibold text-su-dorso" : "text-inchiostro-2 ring-[1.5px] ring-linea-forte hover:ring-inchiostro",
            )}
          >
            {p.nome}
          </button>
        ))}
      </div>

      {occ.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-tenue">Nessun movimento in questo periodo.</p>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <Indicatore
                nome="Messo da parte"
                valore={euro(messo, false)}
                nota={entrate > 0 ? `${Math.round((messo / entrate) * 100)}% delle entrate` : undefined}
                tono={messo < 0 ? "su" : messo > 0 ? "giu" : undefined}
              />
              <Indicatore
                testo
                nome="Uscita più grande"
                valore={principale?.nome ?? "—"}
                nota={principale && uscite > 0 ? `${euro(principale.valore, false)}, ${Math.round((principale.valore / uscite) * 100)}%` : undefined}
              />
            </div>

            <section className="mt-9">
              <h2 className="titolo text-[1.125rem]">dove vanno i soldi</h2>
              {fette.length ? <Torta fette={fette} conteggio={false} /> : <p className="py-6 text-[0.9375rem] text-tenue">Nessuna uscita in questo periodo.</p>}
            </section>
          </div>

          <section className="min-w-0">
            <h2 className="titolo text-[1.125rem]">entrate e uscite</h2>
            <BarreDoppie barre={barre} />
            <div className="mt-3 flex gap-4 text-[0.75rem] text-tenue">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-eco" />
                Entrate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-pericolo" />
                Uscite
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function BarreDoppie({ barre }: { barre: { nome: string; entrate: number; uscite: number }[] }) {
  const max = Math.max(1, ...barre.flatMap((b) => [b.entrate, b.uscite]));
  return (
    <div className="mt-4 flex h-48 items-end gap-2" role="img" aria-label="Entrate e uscite mese per mese">
      {barre.map((b, i) => (
        <div key={`${b.nome}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <div className="flex h-full w-full items-end justify-center gap-[3px]">
            {(["entrate", "uscite"] as const).map((k) => (
              <motion.div
                key={k}
                title={`${k === "entrate" ? "Entrate" : "Uscite"} ${b.nome}: ${euro(b[k], false)}`}
                className={cn("w-full max-w-3.5 rounded-t-[5px]", k === "entrate" ? "bg-eco" : "bg-pericolo")}
                initial={{ height: 0 }}
                animate={{ height: `${b[k] > 0 ? Math.max(2, (b[k] / max) * 100) : 0}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
              />
            ))}
          </div>
          <span className="w-full truncate text-center text-[0.6875rem] text-tenue">{b.nome}</span>
        </div>
      ))}
    </div>
  );
}
