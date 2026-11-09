"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, House, LogOut, Settings2, ShoppingBasket, Wallet } from "lucide-react";
import { Mascotte } from "@/components/mascotte";
import { Avatar } from "@/components/ui";
import { alternaBarra } from "@/lib/temi";
import { cn } from "@/lib/utils";
import type { MembroCasa } from "@/lib/sessione";

const VOCI = [
  { href: "/", nome: "Home", icona: House, attiva: true },
  { href: "/spesa", nome: "Spesa", icona: ShoppingBasket, attiva: true },
  { href: "/finanze", nome: "Finanze", icona: Wallet, attiva: false },
  { href: "/agenda", nome: "Agenda", icona: CalendarCheck, attiva: true },
  { href: "/impostazioni", nome: "Impostazioni", icona: Settings2, attiva: true },
] as const;

function corrente(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Barra laterale blu-piuma (il dorso del pinguino). Cliccando la mascotte
 * si richiude in una colonna stretta con le sole icone, e viceversa.
 */
export function BarraLaterale({ casa, membri }: { casa: string; membri: MembroCasa[] }) {
  const pathname = usePathname();
  return (
    <aside className="barra-laterale sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden bg-dorso text-su-dorso lg:flex">
      {/* Mascotte sulla sua lastra di ghiaccio: apre e chiude la barra */}
      <div className="relative px-4 pt-6">
        <button
          onClick={alternaBarra}
          aria-label="Apri o chiudi la barra laterale"
          title="Apri o chiudi la barra"
          className="anello-focus group relative mx-auto block rounded-[28px]"
        >
          <span aria-hidden className="absolute inset-x-[-6px] bottom-[-6px] top-[38%] rounded-[50%] bg-lastra opacity-95" />
          <Mascotte className="mascotte-barra relative" />
        </button>
        <div className="solo-aperta mt-5 text-center">
          <p className="titolo text-[1.0625rem] text-su-dorso">pinguhome</p>
          <p className="mt-1.5 truncate text-[0.8125rem] text-su-dorso-tenue">{casa}</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-0.5 px-3">
        {VOCI.map((v) => {
          const attiva = corrente(pathname, v.href);
          const Icona = v.icona;
          const contenuto = (
            <>
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                  attiva ? "bg-becco text-su-becco" : "text-su-dorso-tenue group-hover:text-su-dorso",
                )}
              >
                <Icona className="size-[19px]" strokeWidth={attiva ? 2.2 : 1.7} />
              </span>
              <span className="solo-aperta flex flex-1 items-center justify-between gap-2">
                {v.nome}
                {!v.attiva ? <span className="text-[0.75rem] font-normal text-su-dorso-tenue/70">presto</span> : null}
              </span>
            </>
          );
          if (!v.attiva) {
            return (
              <span key={v.href} title={`${v.nome} · presto`} className="flex h-12 items-center gap-3 px-3 text-[0.9375rem] text-su-dorso-tenue/60">
                {contenuto}
              </span>
            );
          }
          return (
            <Link
              key={v.href}
              href={v.href}
              title={v.nome}
              className={cn(
                "anello-focus group flex h-12 items-center gap-3 rounded-full px-3 text-[0.9375rem] transition-colors",
                attiva ? "font-semibold text-su-dorso" : "text-su-dorso-tenue hover:bg-dorso-2 hover:text-su-dorso",
              )}
            >
              {contenuto}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-4 pb-6">
        <div className="flex items-center gap-2 px-1">
          <span className="flex -space-x-2">
            {membri.map((m) => (
              <Avatar key={m.id} nome={m.nome} colore={m.colore} className="size-8 ring-2 ring-su-dorso/35" />
            ))}
          </span>
          <span className="solo-aperta text-[0.8125rem] text-su-dorso-tenue">
            {membri.map((m) => m.nome.split(" ")[0]).join(" e ")}
          </span>
        </div>
        <form action="/auth/esci" method="post">
          <button title="Esci" className="anello-focus flex h-10 w-full items-center gap-3 rounded-full px-3 text-[0.8125rem] text-su-dorso-tenue hover:bg-dorso-2 hover:text-su-dorso">
            <LogOut className="ml-2.5 size-4 shrink-0" />
            <span className="solo-aperta">Esci</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Su mobile: mascotte in alto a sinistra e un dock blu-piuma in basso. */
const TITOLI_MOBILE: [string, string][] = [
  ["/spesa", "spesa"],
  ["/agenda", "agenda"],
  ["/impostazioni", "impostazioni"],
];

/**
 * Su telefono: barra in alto nel colore del dorso con il titolo della sezione
 * e la mascotte a destra. Sotto, il foglio bianco riparte con gli angoli tondi.
 */
export function TestataMobile({ casa }: { casa: string }) {
  const pathname = usePathname();
  const titolo = TITOLI_MOBILE.find(([p]) => pathname.startsWith(p))?.[1] ?? "pinguhome";
  return (
    <div className="sticky top-0 z-30 lg:hidden">
      <header className="pt-sicuro bg-dorso text-su-dorso">
        <div className="flex h-14 items-center justify-between gap-3 px-5">
          <p className="titolo truncate text-[1.375rem]">{titolo}</p>
          <Link href="/" aria-label={`${casa}: torna alla Home`} className="anello-focus relative grid size-11 shrink-0 place-items-center">
            <span aria-hidden className="absolute inset-x-0 bottom-0 top-[40%] rounded-[50%] bg-lastra" />
            <Mascotte className="relative w-10" />
          </Link>
        </div>
      </header>
      <div aria-hidden className="h-4 bg-dorso">
        <div className="h-4 rounded-t-[22px] bg-superficie" />
      </div>
    </div>
  );
}

export function BarraInferiore() {
  const pathname = usePathname();
  const voci = VOCI.filter((v) => v.attiva);
  return (
    <nav className="pb-sicuro fixed inset-x-0 bottom-3 z-40 mx-auto w-fit lg:hidden">
      <div className="flex items-center gap-1 rounded-full bg-dorso p-1.5 shadow-[0_18px_40px_-14px_rgba(var(--ombra),0.6)]">
        {voci.map((v) => {
          const attiva = corrente(pathname, v.href);
          const Icona = v.icona;
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-label={v.nome}
              className={cn(
                "flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all",
                attiva ? "bg-becco text-su-becco" : "text-su-dorso-tenue",
              )}
            >
              <Icona className="size-5" strokeWidth={attiva ? 2.2 : 1.8} />
              {attiva ? v.nome : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
