"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowUpRight, ChevronRight, Eye, EyeOff } from "lucide-react";
import { ascoltaNascoste, impostaNascoste, leggiNascoste } from "@/lib/finanze";
import type { Reparto } from "@/lib/database.types";
import { postiAttivi } from "@/lib/spesa";
import { cn } from "@/lib/utils";
import { CorniceFoto, type FotoCornice } from "./cornice-foto";
import { IllustrazioneScena, useRapportoScena, type NomeScena } from "@/components/scena-mascotte";
import { Tessera } from "@/components/wallet/tessera";

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
  luoghi: string[] | null;
  reparti: Reparto[];
  impegniSettimana: number;
  impegni30: number;
  residuo: number | null;
  foto: FotoCornice[];
  cornice: "scorrimento" | "polaroid";
  /** Le carte del Wallet (per il ventaglio dell'accesso rapido) */
  carte: { negozio: string; colore: string }[];
  /** Su PC, accanto alla foto: gli impegni di oggi e domani */
  prossimi: { id: string; titolo: string; data: string; ora: string | null; categoria: string }[];
  oggi: string;
  /** Su PC: gli obiettivi con quanto è già messo da parte */
  obiettivi: { id: string; nome: string; colore: string; meta: number; messi: number }[];
};

/** PC: gli impegni di oggi e domani, accanto alla foto */
function OggiDomani({ prossimi, oggi }: { prossimi: DatiHome["prossimi"]; oggi: string }) {
  return (
    <section className="hidden min-h-0 flex-col rounded-[28px] bg-superficie-2 p-6 lg:flex">
      <h2 className="flex items-center justify-between">
        <span className="titolo text-[1.25rem]">oggi e domani</span>
        <Link href="/agenda" className="anello-focus flex items-center gap-1 text-[0.8125rem] font-semibold text-tenue hover:text-inchiostro">
          Agenda <ArrowUpRight className="size-4" />
        </Link>
      </h2>
      {prossimi.length ? (
        <ul className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {prossimi.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-t border-linea py-3 first:border-t-0">
              <span className={cn("w-16 shrink-0 text-[0.75rem] font-semibold", p.data === oggi ? "text-becco-scuro" : "text-tenue")}>
                {p.data === oggi ? "oggi" : "domani"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{p.titolo}</span>
              {p.ora ? <span className="numeri shrink-0 text-[0.8125rem] text-tenue">{p.ora}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[0.9375rem] text-tenue">Niente in agenda.</p>
      )}
    </section>
  );
}

/** PC: gli obiettivi con la barra di quanto è già messo da parte */
function ObiettiviHome({ obiettivi, nascoste }: { obiettivi: DatiHome["obiettivi"]; nascoste: boolean }) {
  if (!obiettivi.length) return null;
  return (
    <Link href="/finanze?vista=obiettivi" className="anello-focus hidden rounded-[24px] bg-superficie-2 p-5 transition hover:bg-superficie-3 lg:block">
      <span className="flex items-center justify-between">
        <span className="titolo text-[1.0625rem]">obiettivi</span>
        <ChevronRight className="size-5 text-tenue" />
      </span>
      <span className="mt-3 flex flex-col gap-3">
        {obiettivi.slice(0, 3).map((o) => (
          <span key={o.id} className="block">
            <span className="flex items-baseline justify-between gap-2 text-[0.875rem]">
              <span className="truncate">{o.nome}</span>
              <span className="numeri shrink-0 text-[0.8125rem] text-tenue">{nascoste ? "•••" : `${Math.round(o.meta ? (o.messi / o.meta) * 100 : 0)}%`}</span>
            </span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-superficie-3">
              <motion.span
                className="block h-full rounded-full"
                style={{ background: o.colore }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, o.meta ? (o.messi / o.meta) * 100 : 0)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 0.9, 0.24, 1] }}
              />
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}

/** Accesso rapido al Wallet: le prime carte a ventaglio */
function AccessoWallet({ carte }: { carte: DatiHome["carte"] }) {
  const prime = carte.slice(0, 3);
  return (
    <Link
      href="/wallet"
      className="anello-focus mt-3 flex max-w-3xl items-center gap-4 rounded-[20px] bg-superficie-2 py-3 pl-4 pr-3 transition hover:bg-superficie-3 active:scale-[0.99] md:mt-6 lg:mt-0 lg:rounded-[24px]"
    >
      <span className="relative h-14 w-24 shrink-0">
        {prime.length ? (
          prime.map((c, k) => (
            <motion.span
              key={`${c.negozio}-${k}`}
              className="absolute w-[72px]"
              style={{ left: k * 12, top: 8 - k * 4 }}
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: -8 + k * 6 + (prime.length === 1 ? 8 : 0), opacity: 1 }}
              transition={{ delay: 0.2 + k * 0.06, type: "spring", stiffness: 260, damping: 18 }}
            >
              <Tessera negozio={c.negozio} colore={c.colore} piccola />
            </motion.span>
          ))
        ) : (
          <span className="absolute left-3 top-2 w-[72px] rotate-[-4deg]">
            <Tessera negozio="wallet" colore="#5b5fa3" piccola />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="titolo block text-[1.0625rem]">wallet</span>
        <span className="block text-[0.75rem] text-tenue">{carte.length === 1 ? "1 carta" : `${carte.length} carte`}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-tenue" />
    </Link>
  );
}

function euro(n: number, decimali = true) {
  return n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimali ? 2 : 0,
    maximumFractionDigits: decimali ? 2 : 0,
    useGrouping: "always",
  } as Intl.NumberFormatOptions);
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
  rapporto: rapportoImmagine,
  scena,
  etichetta,
  ritardo,
  sopra,
  angolo,
  children,
}: {
  href: string | null;
  /** Un'immagine fissa, oppure una scena con la mascotte scelta seduta sopra */
  immagine?: string;
  /** larghezza / altezza dell'immagine */
  rapporto?: number;
  scena?: NomeScena;
  etichetta: string;
  ritardo: number;
  /** Contenuto disegnato sopra l'immagine (es. la data sul calendario) */
  sopra?: React.ReactNode;
  /** Un pulsantino nell'angolo in alto a destra, fuori dal collegamento (es. l'occhio per le cifre) */
  angolo?: React.ReactNode;
  children: React.ReactNode;
}) {
  const rapportoScena = useRapportoScena(scena ?? "carrello");
  const rapporto = scena ? rapportoScena : (rapportoImmagine ?? 1);
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
            {scena ? (
              <IllustrazioneScena nome={scena} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={immagine} alt="" draggable={false} className="absolute inset-0 size-full object-contain drop-shadow-[0_12px_16px_rgba(var(--ombra),0.18)]" />
            )}
            {sopra}
          </span>
        </span>
      </span>
      <span className="titolo-normale mt-2 block text-[1.25rem] leading-none md:text-[1.75rem]">{children}</span>
      <span className="mt-1.5 block text-[0.75rem] leading-tight text-tenue md:text-[0.8125rem]">{etichetta}</span>
    </motion.span>
  );
  const scheda = href ? (
    <Link href={href} className="anello-focus block h-full rounded-[24px] transition-transform active:scale-[0.97] md:rounded-[32px]">
      {corpo}
    </Link>
  ) : (
    <div className="h-full">{corpo}</div>
  );
  return angolo ? (
    <div className="relative">
      {scheda}
      <div className="absolute right-1.5 top-1.5 md:right-3 md:top-3">{angolo}</div>
    </div>
  ) : (
    scheda
  );
}

/** L'occhio sul salvadanaio: nasconde o mostra le cifre (la stessa scelta vale in Finanze). */
function OcchioCifre({ nascoste }: { nascoste: boolean }) {
  return (
    <button
      onClick={() => impostaNascoste(!nascoste)}
      aria-label={nascoste ? "Mostra le cifre" : "Nascondi le cifre"}
      aria-pressed={nascoste}
      className="anello-focus grid size-7 place-items-center rounded-full text-tenue transition hover:bg-superficie-3 hover:text-inchiostro"
    >
      {nascoste ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </button>
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
  const nascoste = useSyncExternalStore(ascoltaNascoste, leggiNascoste, () => false);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 md:px-12 lg:max-w-[1480px] lg:px-10 lg:pt-8">
      {/* Testata: data, saluto e i tre numeri che contano */}
      <section>
        <div className="lg:grid lg:h-[380px] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <CorniceFoto
          famigliaId={dati.famigliaId}
          stile={dati.cornice}
          iniziali={dati.foto}
          data={dati.data}
          saluto={`${dati.saluto}, ${dati.nome.toLowerCase()}`}
        />
        <OggiDomani prossimi={dati.prossimi} oggi={dati.oggi} />
        </div>

        {/* Su telefono il foglio bianco sale sopra la foto */}
        <div className="relative z-10 -mx-4 -mt-5 rounded-t-[22px] bg-superficie px-4 pt-5 md:-mx-12 md:px-12 lg:mx-0 lg:mt-6 lg:rounded-none lg:bg-transparent lg:p-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] lg:gap-6">
        <div data-giro="indicatori" className="grid max-w-3xl grid-cols-3 gap-3 md:gap-6 lg:max-w-none">
          <Indicatore href="/spesa" scena="carrello" etichetta="da comprare" ritardo={0}>
            <Contatore valore={daComprare} />
          </Indicatore>
          <Indicatore href="/agenda" immagine="/casa/calendario.webp" rapporto={557 / 640} etichetta="impegni in 30 giorni" ritardo={0.06} sopra={<DataDelGiorno />}>
            <Contatore valore={dati.impegni30} />
          </Indicatore>
          <Indicatore
            href="/finanze"
            immagine="/casa/salvadanaio.webp"
            rapporto={621 / 640}
            etichetta="residuo sul conto"
            ritardo={0.12}
            angolo={dati.residuo === null ? null : <OcchioCifre nascoste={nascoste} />}
          >
            {dati.residuo === null ? <span className="text-tenue">—</span> : nascoste ? <span className="tracking-wider">•••••</span> : <Contatore valore={dati.residuo} formato={(n) => euro(n, false)} />}
          </Indicatore>
        </div>
        <div className="lg:flex lg:flex-col lg:gap-4">
          <ObiettiviHome obiettivi={dati.obiettivi} nascoste={nascoste} />
          <AccessoWallet carte={dati.carte} />
        </div>
        </div>
        </div>
      </section>


      <div className="mt-10 hidden gap-10 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12 lg:mt-8 lg:grid-cols-1">
        {/* Liste con avanzamento: solo su schermi grandi, su telefono ci sono le carte */}
        <section className="hidden md:block lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] lg:gap-6">
          <div>
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
          </div>

          {/* In casa: una lastra di ghiaccio per ogni posto */}
          <div className="mt-8 grid grid-cols-3 content-start gap-2.5 lg:mt-0 lg:grid-cols-2">
            {postiAttivi(dati.luoghi).map((p) => (
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
