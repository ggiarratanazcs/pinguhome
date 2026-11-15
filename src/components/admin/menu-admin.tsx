"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, House, ScanLine, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const VOCI = [
  { href: "/admin", nome: "Panoramica", icona: House },
  { href: "/admin/case", nome: "Case", icona: Users },
  { href: "/admin/notifiche", nome: "Notifiche", icona: Bell },
  { href: "/admin/letture", nome: "Letture Claude", icona: ScanLine },
  { href: "/admin/errori", nome: "Errori", icona: TriangleAlert },
];

export function MenuAdmin() {
  const pathname = usePathname();
  return (
    <aside className="pt-sicuro shrink-0 bg-dorso text-su-dorso lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:flex-col lg:p-5">
      <div className="flex items-center gap-2 px-5 py-4 lg:p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icona-512.png" alt="" className="size-8 rounded-[9px] ring-1 ring-white/10" />
        <span className="titolo text-[0.9375rem]">uchi</span>
        <span className="ml-1 rounded-full bg-becco px-2 py-0.5 text-[0.6875rem] font-bold text-su-becco">admin</span>
        <Link href="/" className="anello-focus ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[0.8125rem] text-su-dorso/70 hover:text-su-dorso lg:hidden">
          <ArrowLeft className="size-4" /> App
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-[0.9375rem] [scrollbar-width:none] lg:mt-8 lg:flex-col lg:overflow-visible lg:p-0">
        {VOCI.map(({ href, nome, icona: Icona }) => {
          const attiva = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "anello-focus flex shrink-0 items-center gap-3 rounded-[12px] px-3 py-2.5 transition",
                attiva ? "bg-white/10 font-semibold" : "text-su-dorso/70 hover:bg-white/5 hover:text-su-dorso",
              )}
            >
              <Icona className="size-4" />
              {nome}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden lg:block">
        <Link href="/" className="anello-focus mb-4 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[0.875rem] text-su-dorso/70 hover:bg-white/5 hover:text-su-dorso">
          <ArrowLeft className="size-4" /> Torna all&apos;app
        </Link>
        <p className="flex items-start gap-2 text-[0.75rem] text-su-dorso/60">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Vedi stato e numeri, non il contenuto delle case
        </p>
      </div>
    </aside>
  );
}
