"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarCheck, House, LogOut, Settings2, ShoppingBasket, Wallet } from "lucide-react";
import { Marchio } from "@/components/pinguino";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MembroCasa } from "@/lib/sessione";

const VOCI = [
  { href: "/", nome: "Home", icona: House, attiva: true },
  { href: "/spesa", nome: "Spesa", icona: ShoppingBasket, attiva: true },
  { href: "/finanze", nome: "Finanze", icona: Wallet, attiva: false },
  { href: "/agenda", nome: "Agenda", icona: CalendarCheck, attiva: false },
  { href: "/impostazioni", nome: "Impostazioni", icona: Settings2, attiva: true },
] as const;

function corrente(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BarraLaterale({ casa, membri }: { casa: string; membri: MembroCasa[] }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-linea px-4 py-6 lg:flex">
      <Link href="/" className="anello-focus rounded-xl px-2">
        <Marchio />
      </Link>

      <div className="mt-8 rounded-[16px] border border-linea bg-superficie-2 px-3 py-3">
        <p className="sovratitolo">Casa</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{casa}</span>
          <span className="flex -space-x-2">
            {membri.map((m) => (
              <Avatar key={m.id} nome={m.nome} colore={m.colore} className="size-7" />
            ))}
          </span>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {VOCI.map((v) => {
          const attiva = corrente(pathname, v.href);
          const Icona = v.icona;
          if (!v.attiva) {
            return (
              <span key={v.href} className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] text-tenue/70">
                <Icona className="size-[18px]" strokeWidth={1.8} />
                {v.nome}
                <span className="ml-auto rounded-md bg-superficie-3 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider">
                  Presto
                </span>
              </span>
            );
          }
          return (
            <Link
              key={v.href}
              href={v.href}
              className={cn(
                "anello-focus relative flex h-11 items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-medium transition-colors",
                attiva ? "text-inchiostro" : "text-inchiostro-2 hover:bg-superficie-3",
              )}
            >
              {attiva ? (
                <motion.span
                  layoutId="voce-attiva"
                  className="absolute inset-0 rounded-[12px] bg-superficie shadow-[0_6px_18px_-10px_rgba(var(--ombra),0.35)] ring-1 ring-linea"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <Icona className={cn("relative size-[18px]", attiva && "text-accento")} strokeWidth={attiva ? 2.2 : 1.8} />
              <span className="relative">{v.nome}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/auth/esci" method="post" className="mt-auto">
        <button className="anello-focus flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-sm text-tenue hover:bg-superficie-3">
          <LogOut className="size-4" /> Esci
        </button>
      </form>
    </aside>
  );
}

export function BarraInferiore() {
  const pathname = usePathname();
  const voci = VOCI.filter((v) => v.attiva);
  return (
    <nav className="vetro pb-sicuro fixed inset-x-0 bottom-0 z-40 border-t border-linea lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {voci.map((v) => {
          const attiva = corrente(pathname, v.href);
          const Icona = v.icona;
          return (
            <Link key={v.href} href={v.href} className="relative flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium">
              {attiva ? (
                <motion.span
                  layoutId="voce-attiva-mobile"
                  className="absolute top-1.5 h-8 w-14 rounded-full bg-accento-tenue"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <Icona className={cn("relative mt-1 size-[22px]", attiva ? "text-accento" : "text-tenue")} strokeWidth={attiva ? 2.2 : 1.8} />
              <span className={cn("relative", attiva ? "text-inchiostro" : "text-tenue")}>{v.nome}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
