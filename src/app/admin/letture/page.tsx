import { createClient } from "@/lib/supabase/server";
import { costoDollari, dollari, quando, type EventoAdmin } from "@/lib/admin";

export const metadata = { title: "Letture Claude · Admin" };

const NOMI: Record<string, string> = { scontrino: "Scontrino", tessera: "Tessera", prodotto: "Prodotto" };

export default async function PaginaLetture() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_eventi", { p_tipo: "letture", p_limite: 300 });
  const elenco = (data ?? []) as unknown as EventoAdmin[];
  const inizioMese = new Date();
  inizioMese.setDate(1);
  inizioMese.setHours(0, 0, 0, 0);
  const delMese = elenco.filter((e) => new Date(e.creato_il) >= inizioMese);
  const costoMese = costoDollari(
    delMese.reduce((t, e) => t + (e.token_ingresso ?? 0), 0),
    delMese.reduce((t, e) => t + (e.token_uscita ?? 0), 0),
  );
  const perTipo = ["scontrino", "tessera", "prodotto", "inventario"].map((t) => [t, delMese.filter((e) => e.tipo === t).length] as const);

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="titolo text-[1.75rem]">letture claude</h1>
      <p className="mt-1 text-[0.875rem] text-tenue">
        Questo mese {delMese.length === 1 ? "1 lettura" : `${delMese.length} letture`} · ~{dollari(costoMese)} (Sonnet 5.5: 2 $ per milione di token in ingresso, 10 $ in uscita)
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {perTipo.map(([t, n]) => (
          <div key={t} className="rounded-[16px] bg-superficie p-4 ring-1 ring-linea">
            <p className="titolo-normale numeri text-[1.5rem] leading-none">{n}</p>
            <p className="mt-1 text-[0.8125rem] text-tenue">{NOMI[t]}</p>
          </div>
        ))}
      </div>
      <section className="mt-6 overflow-hidden rounded-[20px] bg-superficie p-2 ring-1 ring-linea">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr_0.8fr] gap-3 px-4 py-3 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue md:grid">
          <span>Quando</span>
          <span>Cosa</span>
          <span>Casa</span>
          <span className="text-right">Costo</span>
        </div>
        {elenco.length === 0 ? <p className="px-4 py-6 text-tenue">Ancora nessuna lettura registrata.</p> : null}
        {elenco.map((e) => (
          <div key={e.id} className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-linea px-4 py-3 text-[0.875rem] first-of-type:border-0 md:grid-cols-[1fr_1fr_1.2fr_0.8fr]">
            <span>{quando(e.creato_il)}</span>
            <span className="font-medium">{NOMI[e.tipo] ?? e.tipo}</span>
            <span className="truncate text-tenue">
              {e.casa ?? "—"}
              {e.utente ? ` · ${e.utente}` : ""}
            </span>
            <span className="numeri text-tenue md:text-right">{e.token_ingresso === null ? "—" : dollari(costoDollari(e.token_ingresso ?? 0, e.token_uscita ?? 0))}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
