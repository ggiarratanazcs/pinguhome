import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { POSIZIONI } from "@/lib/spesa";
import { Mascotte } from "@/components/mascotte";
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
  const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const inizioMese = `${oggi.slice(0, 7)}-01`;
  const [{ data: voci }, { data: liste }, { data: dispensa }, { data: spese }] = await Promise.all([
    supabase.from("voci_lista").select("lista_id, presa, urgente").eq("famiglia_id", famiglia.id),
    supabase.from("liste").select("id, nome, colore").eq("famiglia_id", famiglia.id).eq("archiviata", false).order("ordine"),
    supabase.from("dispensa").select("posizione").eq("famiglia_id", famiglia.id),
    supabase.from("spese").select("importo").eq("famiglia_id", famiglia.id).gte("data", inizioMese).lte("data", oggi),
  ]);
  const spesoMese = (spese ?? []).reduce((t, s) => t + Number(s.importo), 0);
  const nomeMese = new Date().toLocaleDateString("it-IT", { month: "long", timeZone: "Europe/Rome" });

  const daPrendere = (voci ?? []).filter((v) => !v.presa);
  const urgenti = daPrendere.filter((v) => v.urgente).length;
  const data = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
  const nome = profilo.nome.split(" ")[0] || "pinguino";

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 md:px-12 md:pt-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-tenue first-letter:uppercase">{data}</p>
          <h1 className="titolo titolo-pagina mt-2">
            {saluto()}, {nome.toLowerCase()}
          </h1>
        </div>
        <Mascotte className="hidden w-20 shrink-0 md:block" />
      </div>

      <p className="mt-3 max-w-xl text-inchiostro-2">
        {daPrendere.length === 0
          ? "Nessuna spesa in sospeso: le liste sono vuote."
          : `${daPrendere.length} ${daPrendere.length === 1 ? "cosa" : "cose"} da comprare${urgenti ? `, di cui ${urgenti} ${urgenti === 1 ? "urgente" : "urgenti"}` : ""}.`}
        {spesoMese > 0 ? ` A ${nomeMese} avete speso ${spesoMese.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.` : ""}
      </p>

      <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.125rem]">spesa</span>
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
                    <span className={cn("titolo-normale numeri text-[1.375rem] leading-none", n ? "text-inchiostro" : "text-linea-forte")}>{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.125rem]">in casa</span>
          </h2>
          <ul>
            {POSIZIONI.map((p) => {
              const n = (dispensa ?? []).filter((d) => d.posizione === p.id).length;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-linea py-4">
                  <span className="text-[1.0625rem]">{p.nome}</span>
                  <span className={cn("titolo-normale numeri text-[1.25rem] leading-none", n ? "text-inchiostro" : "text-linea-forte")}>{n}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-10 text-[0.875rem] text-tenue">Presto qui anche finanze e agenda di casa.</p>
        </section>
      </div>
    </main>
  );
}
