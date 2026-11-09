import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Flame, Leaf, ShoppingBasket, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { etichettaScadenza, giorniAScadenza } from "@/lib/spesa";
import { Pinguino } from "@/components/pinguino";
import { cn } from "@/lib/utils";

function saluto() {
  const ora = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));
  if (ora < 6) return "Buonanotte";
  if (ora < 13) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export default async function Home() {
  const { profilo, famiglia } = await getContesto();
  const supabase = await createClient();
  const [{ data: voci }, { data: liste }, { data: dispensa }] = await Promise.all([
    supabase.from("voci_lista").select("lista_id, presa, urgente, eco").eq("famiglia_id", famiglia.id),
    supabase.from("liste").select("id, nome, colore").eq("famiglia_id", famiglia.id).eq("archiviata", false).order("ordine"),
    supabase.from("dispensa").select("id, nome, scadenza").eq("famiglia_id", famiglia.id).not("scadenza", "is", null),
  ]);

  const daPrendere = (voci ?? []).filter((v) => !v.presa);
  const urgenti = daPrendere.filter((v) => v.urgente).length;
  const inScadenza = (dispensa ?? [])
    .map((d) => ({ ...d, giorni: giorniAScadenza(d.scadenza) }))
    .filter((d) => d.giorni !== null && d.giorni <= 3)
    .sort((a, b) => a.giorni! - b.giorni!);
  const data = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });

  return (
    <main className="pt-sicuro mx-auto w-full max-w-[1180px] px-5 pt-8 md:px-10 md:pt-12">
      <p className="sovratitolo">{data}</p>
      <h1 className="titolo mt-3 text-[2.5rem] leading-[1.02] md:text-[3.5rem]">
        {saluto()}, {profilo.nome.split(" ")[0] || "pinguino"}.
      </h1>
      <p className="mt-3 text-[1.0625rem] text-tenue">
        {daPrendere.length === 0
          ? "Nessuna spesa in sospeso. Goditi la banchisa."
          : `${daPrendere.length} ${daPrendere.length === 1 ? "cosa" : "cose"} da prendere${urgenti ? `, ${urgenti} urgenti` : ""}.`}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-6">
        {/* Spesa: tessera principale */}
        <Link
          href="/spesa"
          className="carta group relative overflow-hidden p-6 transition hover:-translate-y-0.5 hover:shadow-xl md:col-span-4 md:row-span-2 md:p-8"
        >
          <div className="flex items-start justify-between">
            <span className="grid size-12 place-items-center rounded-[16px] bg-accento text-su-accento">
              <ShoppingBasket className="size-6" />
            </span>
            <ArrowUpRight className="size-5 text-tenue transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accento" />
          </div>
          <p className="titolo mt-6 text-[1.75rem]">Spesa</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {(liste ?? []).map((l) => {
              const n = daPrendere.filter((v) => v.lista_id === l.id).length;
              return (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="size-2.5 rounded-full" style={{ background: l.colore }} />
                  <span className="flex-1 font-medium">{l.nome}</span>
                  <span className={cn("numeri text-sm", n ? "font-semibold" : "text-tenue")}>{n ? `${n} da prendere` : "vuota"}</span>
                </li>
              );
            })}
          </ul>
          {urgenti ? (
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-becco-tenue px-2.5 py-1 text-sm font-semibold text-[color-mix(in_oklab,var(--becco),black_35%)]">
              <Flame className="size-4" /> {urgenti} urgenti
            </p>
          ) : null}
          <Pinguino className="pointer-events-none absolute -bottom-3 right-6 size-28 opacity-90 transition group-hover:-translate-y-1" />
        </Link>

        {/* Anti-spreco */}
        <Link href="/spesa" className="carta p-6 transition hover:-translate-y-0.5 hover:shadow-xl md:col-span-2">
          <div className="flex items-center gap-2 text-eco">
            <Leaf className="size-5" />
            <span className="sovratitolo !text-eco">Anti-spreco</span>
          </div>
          {inScadenza.length === 0 ? (
            <p className="mt-4 text-sm text-tenue">Niente in scadenza nei prossimi 3 giorni.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {inScadenza.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{d.nome}</span>
                  <span className={cn("shrink-0 text-xs font-semibold", d.giorni! < 0 ? "text-pericolo" : "text-[color-mix(in_oklab,var(--becco),black_30%)]")}>
                    {etichettaScadenza(d.giorni)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>

        {/* Moduli in arrivo */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Prossimamente icona={<Wallet className="size-5" />} nome="Finanze" />
          <Prossimamente icona={<CalendarCheck className="size-5" />} nome="Agenda" />
        </div>
      </div>
    </main>
  );
}

function Prossimamente({ icona, nome }: { icona: React.ReactNode; nome: string }) {
  return (
    <div className="flex flex-col justify-between rounded-[20px] border border-dashed border-linea-forte p-5 text-tenue">
      {icona}
      <div className="mt-6">
        <p className="font-semibold text-inchiostro-2">{nome}</p>
        <p className="text-xs">In arrivo</p>
      </div>
    </div>
  );
}
