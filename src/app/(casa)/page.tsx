import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { etichettaScadenza, giorniAScadenza } from "@/lib/spesa";
import { Pinguino } from "@/components/pinguino";
import { cn } from "@/lib/utils";

function saluto() {
  const ora = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));
  if (ora < 6) return "notte fonda";
  if (ora < 13) return "buongiorno";
  if (ora < 18) return "buon pomeriggio";
  return "buonasera";
}

export default async function Home() {
  const { profilo, famiglia } = await getContesto();
  const supabase = await createClient();
  const [{ data: voci }, { data: liste }, { data: dispensa }] = await Promise.all([
    supabase.from("voci_lista").select("lista_id, presa, urgente").eq("famiglia_id", famiglia.id),
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
  const nome = profilo.nome.split(" ")[0] || "pinguino";

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 md:px-12 md:pt-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-tenue first-letter:uppercase">{data}</p>
          <h1 className="titolo mt-3 text-[clamp(2.25rem,9vw,4.5rem)]">
            {saluto()},<br />
            {nome.toLowerCase()}
          </h1>
        </div>
        <Pinguino className="hidden w-36 md:block" />
      </div>

      <p className="mt-6 max-w-xl text-[1.125rem] text-inchiostro-2">
        {daPrendere.length === 0
          ? "Nessuna spesa in sospeso: le liste sono vuote."
          : `${daPrendere.length} ${daPrendere.length === 1 ? "cosa" : "cose"} da comprare${urgenti ? `, di cui ${urgenti} ${urgenti === 1 ? "urgente" : "urgenti"}` : ""}.`}
        {inScadenza.length > 0 ? ` In casa ${inScadenza.length === 1 ? "c'è 1 cosa" : `ci sono ${inScadenza.length} cose`} da consumare presto.` : ""}
      </p>

      <div className="mt-14 grid gap-14 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.5rem]">spesa</span>
            <Link href="/spesa" className="anello-focus flex items-center gap-1 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4">
              Apri le liste <ArrowUpRight className="size-4" />
            </Link>
          </h2>
          <ul>
            {(liste ?? []).map((l) => {
              const n = daPrendere.filter((v) => v.lista_id === l.id).length;
              return (
                <li key={l.id}>
                  <Link href="/spesa" className="anello-focus group flex items-center gap-4 border-b border-linea py-4">
                    <span className="size-2.5 rounded-full" style={{ background: l.colore }} />
                    <span className="flex-1 text-[1.125rem] group-hover:underline group-hover:underline-offset-4">{l.nome}</span>
                    <span className={cn("titolo-normale numeri text-[1.75rem] leading-none", n ? "text-inchiostro" : "text-linea-forte")}>{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.5rem]">da consumare</span>
          </h2>
          {inScadenza.length === 0 ? (
            <p className="py-4 text-tenue">Niente in scadenza nei prossimi tre giorni.</p>
          ) : (
            <ul>
              {inScadenza.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 border-b border-linea py-3.5">
                  <span className="truncate text-[1.0625rem]">{d.nome}</span>
                  <span className={cn("shrink-0 text-[0.875rem] font-semibold", d.giorni! < 0 ? "text-pericolo" : "text-becco-scuro")}>
                    {etichettaScadenza(d.giorni)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-10 text-[0.875rem] text-tenue">Presto qui anche finanze e agenda di casa.</p>
        </section>
      </div>
    </main>
  );
}
