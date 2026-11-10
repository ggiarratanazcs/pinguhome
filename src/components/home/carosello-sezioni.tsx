"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type PanInfo } from "motion/react";
import { ArrowUpRight, CalendarCheck, ReceiptEuro, Refrigerator, ShoppingBasket, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Porta = {
  id: string;
  titolo: string;
  testo: string;
  href: string | null;
  icona: LucideIcon;
  /** classi di sfondo e testo della carta */
  stile: string;
  presto?: boolean;
};

export function porteHome(numeri: { daComprare: number; spesoMese: string; inCasa: number; impegniSettimana: number; residuo: string | null }): Porta[] {
  return [
    { id: "spesa", titolo: "spesa", testo: `${numeri.daComprare} da comprare`, href: "/spesa", icona: ShoppingBasket, stile: "bg-becco text-su-becco" },
    { id: "agenda", titolo: "agenda", testo: numeri.impegniSettimana ? `${numeri.impegniSettimana} ${numeri.impegniSettimana === 1 ? "impegno" : "impegni"} nei prossimi 7 giorni` : "Niente in programma questa settimana", href: "/agenda", icona: CalendarCheck, stile: "bg-[#7a5cc2] text-white" },
    { id: "spese", titolo: "spese", testo: `${numeri.spesoMese} questo mese`, href: "/spesa?vista=spese", icona: ReceiptEuro, stile: "bg-guancia text-[#2c1c3d]" },
    { id: "casa", titolo: "in casa", testo: `${numeri.inCasa} prodotti tra frigo e dispensa`, href: "/spesa?vista=dispensa", icona: Refrigerator, stile: "bg-lastra text-inchiostro" },
    { id: "finanze", titolo: "finanze", testo: numeri.residuo ? `${numeri.residuo} sul conto` : "Il conto di casa", href: "/finanze", icona: Wallet, stile: "bg-[#23885a] text-white" },
  ];
}

/**
 * Carosello delle sezioni (solo telefono): la carta davanti è in evidenza,
 * le altre stanno dietro, più piccole e ruotate. Scorrendo, quella verso cui
 * vai viene avanti. Si gira all'infinito.
 */
export function CaroselloSezioni({ porte }: { porte: Porta[] }) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const n = porte.length;

  function scorri(direzione: number) {
    setIndice((i) => (i + direzione + n) % n);
  }

  function fineTrascinamento(_: unknown, info: PanInfo) {
    if (info.offset.x < -40 || info.velocity.x < -350) scorri(1);
    else if (info.offset.x > 40 || info.velocity.x > 350) scorri(-1);
  }

  return (
    <section aria-roledescription="carosello" aria-label="Sezioni" className="-mx-4 overflow-hidden pb-2 md:hidden">
      {/* Il gesto laterale cambia carta ma la pagina resta ferma: niente trascinamento del contenitore */}
      <motion.div
        onPanEnd={fineTrascinamento}
        className="relative mx-auto mt-8 h-[220px] w-full touch-pan-y select-none"
        style={{ perspective: 1100 }}
      >
        {porte.map((p, i) => {
          // Posizione rispetto alla carta davanti, con giro continuo: -2 … 0 … +2
          let d = i - indice;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const distanza = Math.abs(d);
          const Icona = p.icona;
          const davanti = d === 0;
          return (
            <motion.button
              key={p.id}
              type="button"
              aria-label={`${p.titolo}${p.presto ? ", presto disponibile" : ""}`}
              aria-hidden={distanza > 1}
              tabIndex={davanti ? 0 : -1}
              onTap={() => {
                if (!davanti) return scorri(d > 0 ? 1 : -1);
                if (p.href) router.push(p.href);
              }}
              initial={false}
              animate={{
                x: `${d * 50}%`,
                scale: 1 - distanza * 0.13,
                rotateY: d * -16,
                opacity: distanza > 2 ? 0 : 1 - distanza * 0.28,
                filter: davanti ? "saturate(1)" : "saturate(0.75)",
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ zIndex: 10 - distanza }}
              className={cn(
                "anello-focus absolute inset-y-0 left-1/2 -ml-[36%] flex w-[72%] flex-col justify-between overflow-hidden rounded-[28px] p-5 text-left shadow-[0_20px_40px_-22px_rgba(var(--ombra),0.6)]",
                p.stile,
              )}
            >
              <Icona aria-hidden className="absolute -right-5 -top-5 size-36 opacity-15" strokeWidth={1.4} />
              {p.presto ? (
                <span className="relative self-start rounded-full bg-black/15 px-2.5 py-1 text-[0.6875rem] font-semibold">presto</span>
              ) : (
                <span />
              )}
              <span className="relative flex items-end justify-between gap-3">
                <span>
                  <span className="titolo block text-[1.75rem]">{p.titolo}</span>
                  <span className="mt-1.5 block text-[0.875rem] opacity-80">{p.testo}</span>
                </span>
                {p.href ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/25">
                    <ArrowUpRight className="size-5" />
                  </span>
                ) : null}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Indicatore della carta davanti */}
      <div className="mt-4 flex justify-center gap-1.5">
        {porte.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndice(i)}
            aria-label={`Vai a ${p.titolo}`}
            className={cn("h-1.5 rounded-full transition-all", i === indice ? "w-6 bg-inchiostro" : "w-1.5 bg-linea-forte")}
          />
        ))}
      </div>
    </section>
  );
}
