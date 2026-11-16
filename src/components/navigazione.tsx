"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CreditCard, House, LogOut, PanelLeft, Settings2, ShoppingBasket, Wallet } from "lucide-react";
import { Mascotte } from "@/components/mascotte";
import { Marchio } from "@/components/pinguino";
import { Avatar } from "@/components/ui";
import { alternaBarra } from "@/lib/temi";
import { cn } from "@/lib/utils";
import type { MembroCasa } from "@/lib/sessione";

const VOCI = [
  { href: "/", nome: "Home", icona: House, attiva: true, mobile: true },
  { href: "/spesa", nome: "Spesa", icona: ShoppingBasket, attiva: true, mobile: true },
  { href: "/finanze", nome: "Finanze", icona: Wallet, attiva: true, mobile: true },
  { href: "/agenda", nome: "Agenda", icona: CalendarCheck, attiva: true, mobile: true },
  // Su telefono il Wallet si apre dalla Home
  { href: "/wallet", nome: "Wallet", icona: CreditCard, attiva: true, mobile: false },
  { href: "/impostazioni", nome: "Impostazioni", icona: Settings2, attiva: true, mobile: true },
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
  const principali = VOCI.filter((v) => v.href !== "/impostazioni");
  const impostazioni = VOCI.find((v) => v.href === "/impostazioni")!;
  const voce = (v: (typeof VOCI)[number]) => {
    const attiva = corrente(pathname, v.href);
    const Icona = v.icona;
    return (
      <Link
        key={v.href}
        href={v.href}
        title={v.nome}
        className={cn(
          "anello-focus group flex h-11 items-center gap-3 rounded-[14px] px-2.5 text-[0.9375rem] transition-colors",
          attiva ? "bg-dorso-2 font-semibold text-su-dorso" : "text-su-dorso-tenue hover:bg-dorso-2/60 hover:text-su-dorso",
        )}
      >
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors", attiva && "bg-becco text-su-becco")}>
          <Icona className="size-[18px]" strokeWidth={attiva ? 2.2 : 1.7} />
        </span>
        <span className="solo-aperta">{v.nome}</span>
      </Link>
    );
  };
  return (
    <aside className="barra-laterale sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden bg-dorso text-su-dorso lg:flex">
      <div className="flex items-center gap-2 px-4 pt-6">
        <Link href="/" className="anello-focus flex min-w-0 flex-1 items-center gap-2.5 rounded-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icona-512.png" alt="" draggable={false} className="size-9 shrink-0 rounded-[10px] ring-1 ring-white/10" />
          <span className="solo-aperta min-w-0">
            <span className="titolo block text-[1rem] text-su-dorso">uchi</span>
            <span className="block truncate text-[0.75rem] text-su-dorso-tenue">{casa}</span>
          </span>
        </Link>
        <button
          onClick={alternaBarra}
          aria-label="Apri o chiudi la barra laterale"
          title="Apri o chiudi la barra"
          className="solo-aperta anello-focus grid size-8 shrink-0 place-items-center rounded-[10px] text-su-dorso-tenue hover:bg-dorso-2 hover:text-su-dorso"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-1 px-3">{principali.map(voce)}</nav>

      <div className="mt-auto flex flex-col gap-1 px-3 pb-5">
        {voce(impostazioni)}
        <form action="/auth/esci" method="post">
          <button title="Esci" className="anello-focus flex h-11 w-full items-center gap-3 rounded-[14px] px-2.5 text-[0.875rem] text-su-dorso-tenue hover:bg-dorso-2 hover:text-su-dorso">
            <span className="grid size-8 shrink-0 place-items-center">
              <LogOut className="size-4" />
            </span>
            <span className="solo-aperta">Esci</span>
          </button>
        </form>
        <div className="mt-3 flex items-center gap-2.5 border-t border-white/10 px-1 pt-4">
          {/* La mascotte riapre la barra quando è chiusa */}
          <button onClick={alternaBarra} aria-label="Apri o chiudi la barra laterale" className="anello-focus shrink-0 rounded-full">
            <Mascotte className="w-10" />
          </button>
          <span className="solo-aperta flex min-w-0 items-center gap-2">
            <span className="flex -space-x-2">
              {membri.map((m) => (
                <Avatar key={m.id} nome={m.nome} colore={m.colore} className="size-7 ring-2 ring-dorso" />
              ))}
            </span>
            <span className="truncate text-[0.8125rem] text-su-dorso-tenue">{membri.map((m) => m.nome.split(" ")[0]).join(" e ")}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

/** Su mobile: mascotte in alto a sinistra e un dock blu-piuma in basso. */
const TITOLI_MOBILE: [string, string][] = [
  ["/spesa", "spesa"],
  ["/agenda", "agenda"],
  ["/finanze", "finanze"],
  ["/impostazioni", "impostazioni"],
  ["/wallet", "wallet"],
];

/**
 * Su telefono: barra in alto nel colore del dorso con il titolo della sezione
 * e la mascotte a destra. Sotto, il foglio bianco riparte con gli angoli tondi.
 */
export function TestataMobile({ casa }: { casa: string }) {
  const pathname = usePathname();
  const titolo = TITOLI_MOBILE.find(([p]) => pathname.startsWith(p))?.[1] ?? "uchi";
  // In Home la testata è trasparente e sta sopra la foto
  const home = pathname === "/";
  return (
    <div className={cn("z-30 lg:hidden", home ? "absolute inset-x-0 top-0" : "sticky top-0")}>
      <header className={cn("pt-sicuro text-su-dorso", !home && "bg-dorso")}>
        <div className="flex h-14 items-center justify-between gap-3 px-5">
          <Marchio chiaro nome={titolo} className="min-w-0" />
          <Link href="/" aria-label={`${casa}: torna alla Home`} className="anello-focus relative grid size-11 shrink-0 place-items-center">
            {home ? null : <span aria-hidden className="absolute inset-x-0 bottom-0 top-[40%] rounded-[50%] bg-lastra" />}
            <Mascotte className="relative w-10" />
          </Link>
        </div>
      </header>
      {home ? null : (
        <div aria-hidden className="h-4 bg-dorso">
          <div className="h-4 rounded-t-[22px] bg-superficie" />
        </div>
      )}
    </div>
  );
}

export function BarraInferiore() {
  const pathname = usePathname();
  const voci = VOCI.filter((v) => v.attiva && v.mobile);
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
