"use client";

import { useEffect } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Reparto } from "@/lib/database.types";
import { POSIZIONI } from "@/lib/spesa";
import { cn } from "@/lib/utils";
import { CaroselloSezioni, porteHome } from "./carosello-sezioni";

export type DatiHome = {
  nome: string;
  saluto: string;
  data: string;
  famigliaId: string;
  liste: { id: string; nome: string; colore: string; daPrendere: number; presi: number; urgenti: number }[];
  /** Totali degli ultimi 6 mesi, dal più vecchio al corrente */
  mesi: { etichetta: string; totale: number }[];
  ultimaSpesa: { importo: number; quando: string; dove: string; chi: string } | null;
  inCasa: Record<string, number>;
  reparti: Reparto[];
  impegniSettimana: number;
  impegni30: number;
};

function euro(n: number, decimali = true) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: decimali ? 2 : 0, maximumFractionDigits: decimali ? 2 : 0 });
}

/** Numero che sale fino al valore all'apertura della pagina (unico movimento della Home). */
function Contatore({ valore, formato }: { valore: number; formato?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const testo = useTransform(mv, (v) => (formato ? formato(v) : String(Math.round(v))));
  useEffect(() => {
    const c = animate(mv, valore, { duration: 0.9, ease: [0.22, 0.9, 0.24, 1] });
    return () => c.stop();
  }, [mv, valore]);
  return <motion.span className="numeri">{testo}</motion.span>;
}

function Indicatore({
  href,
  immagine,
  rapporto,
  etichetta,
  ritardo,
  sopra,
  children,
}: {
  href: string | null;
  immagine: string;
  /** larghezza / altezza dell'immagine */
  rapporto: number;
  etichetta: string;
  ritardo: number;
  /** Contenuto disegnato sopra l'immagine (es. la data sul calendario) */
  sopra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const corpo = (
    <motion.span
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: ritardo }}
      className="group flex h-full flex-col items-center rounded-[24px] bg-superficie-2 px-2 pb-3 pt-3 text-center md:rounded-[32px] md:px-5 md:pb-5 md:pt-5"
    >
      <span className="relative block aspect-[4/5] w-full">
        <span className="absolute inset-0 flex items-end justify-center">
          {/* Il riquadro ha le proporzioni dell'immagine, così ciò che sta sopra resta al suo posto */}
          <span
            className={cn("@container relative block transition-transform duration-300 group-hover:-translate-y-1", rapporto < 4 / 5 ? "h-full" : "w-full")}
            style={{ aspectRatio: rapporto }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={immagine} alt="" draggable={false} className="absolute inset-0 size-full object-contain drop-shadow-[0_12px_16px_rgba(var(--ombra),0.18)]" />
            {sopra}
          </span>
        </span>
      </span>
      <span className="titolo-normale mt-2 block text-[1.25rem] leading-none md:text-[1.75rem]">{children}</span>
      <span className="mt-1.5 block text-[0.75rem] leading-tight text-tenue md:text-[0.8125rem]">{etichetta}</span>
    </motion.span>
  );
  return href ? (
    <Link href={href} className="anello-focus block rounded-[24px] transition-transform active:scale-[0.97] md:rounded-[32px]">
      {corpo}
    </Link>
  ) : (
    <div>{corpo}</div>
  );
}

/** La data di oggi, scritta sul pannello bianco del calendario. */
function DataDelGiorno() {
  const oggi = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) => oggi.toLocaleDateString("it-IT", { ...o, timeZone: "Europe/Rome" });
  return (
    <span
      suppressHydrationWarning
      className="pointer-events-none absolute flex flex-col items-center justify-center text-center leading-none text-[#4a4a4f]"
      style={{ left: "17%", right: "5%", top: "11%", bottom: "22%", transform: "skewY(-2deg)" }}
    >
      <span suppressHydrationWarning className="text-[9cqw] font-semibold uppercase tracking-wide">{fmt({ month: "short" }).replace(".", "")}</span>
      <span suppressHydrationWarning className="titolo-normale mt-[2cqw] text-[26cqw]">{fmt({ day: "numeric" })}</span>
      <span suppressHydrationWarning className="mt-[2cqw] text-[8cqw]">{fmt({ weekday: "long" })}</span>
    </span>
  );
}

export function VistaHome({ dati }: { dati: DatiHome }) {
  const daComprare = dati.liste.reduce((t, l) => t + l.daPrendere, 0);
  const meseCorrente = dati.mesi[dati.mesi.length - 1];
  const totaleInCasa = Object.values(dati.inCasa).reduce((t, n) => t + n, 0);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-1 md:px-12 lg:pt-10">
      {/* Testata: data, saluto e i tre numeri che contano */}
      <section className="pt-3 md:pt-0">
        <p className="text-[0.875rem] text-tenue first-letter:uppercase">{dati.data}</p>
        <h1 className="titolo titolo-pagina mt-1">
          {dati.saluto}, {dati.nome.toLowerCase()}
        </h1>

        <div className="mt-6 grid max-w-3xl grid-cols-3 gap-3 md:gap-6">
          <Indicatore href="/spesa" immagine="/casa/carrello.webp" rapporto={414 / 640} etichetta="da comprare" ritardo={0}>
            <Contatore valore={daComprare} />
          </Indicatore>
          <Indicatore href="/agenda" immagine="/casa/calendario.webp" rapporto={557 / 640} etichetta="impegni in 30 giorni" ritardo={0.06} sopra={<DataDelGiorno />}>
            <Contatore valore={dati.impegni30} />
          </Indicatore>
          <Indicatore href={null} immagine="/casa/salvadanaio.webp" rapporto={621 / 640} etichetta="residuo sul conto" ritardo={0.12}>
            <span className="text-tenue">presto</span>
          </Indicatore>
        </div>
      </section>

      <CaroselloSezioni porte={porteHome({ daComprare, spesoMese: euro(meseCorrente?.totale ?? 0, false), inCasa: totaleInCasa, impegniSettimana: dati.impegniSettimana })} />

      <div className="mt-10 hidden gap-10 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        {/* Liste con avanzamento: solo su schermi grandi, su telefono ci sono le carte */}
        <section className="hidden md:block">
          <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.125rem]">spesa</span>
            <Link href="/spesa" className="anello-focus flex items-center gap-1 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4">
              Apri le liste <ArrowUpRight className="size-4" />
            </Link>
          </h2>
          <ul>
            {dati.liste.map((l) => {
              const totale = l.daPrendere + l.presi;
              return (
                <li key={l.id}>
                  <Link href="/spesa" className="anello-focus group block border-b border-linea py-3.5">
                    <span className="flex items-center gap-3">
                      <span className="size-2.5 rounded-full" style={{ background: l.colore }} />
                      <span className="flex-1 text-[1.0625rem] group-hover:underline group-hover:underline-offset-4">{l.nome}</span>
                      {l.urgenti ? <span className="rounded-full bg-becco-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-becco-scuro">{l.urgenti} urgenti</span> : null}
                      <span className={cn("titolo-normale numeri text-[1.375rem] leading-none", l.daPrendere ? "text-inchiostro" : "text-linea-forte")}>{l.daPrendere}</span>
                    </span>
                    {totale > 0 ? (
                      <span className="mt-2.5 ml-[22px] block h-1 overflow-hidden rounded-full bg-superficie-3">
                        <motion.span
                          className="block h-full rounded-full bg-becco"
                          initial={{ width: 0 }}
                          animate={{ width: `${(l.presi / totale) * 100}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 0.9, 0.24, 1] }}
                        />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* In casa: tre lastre di ghiaccio */}
          <div className="mt-8 grid grid-cols-3 gap-2.5">
            {POSIZIONI.map((p) => (
              <Link key={p.id} href="/spesa" className="anello-focus rounded-[20px] bg-lastra/55 px-4 py-3.5 transition hover:bg-lastra">
                <p className="titolo-normale numeri text-[1.5rem] leading-none">{dati.inCasa[p.id] ?? 0}</p>
                <p className="mt-1.5 text-[0.8125rem] text-inchiostro-2">{p.nome}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="hidden pb-6 md:block" />
    </main>
  );
}
