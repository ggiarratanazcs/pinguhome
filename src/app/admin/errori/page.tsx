import { createClient } from "@/lib/supabase/server";
import { quando, type EventoAdmin } from "@/lib/admin";

export const metadata = { title: "Errori · Admin" };

const DOVE: Record<string, string> = { scontrino: "Lettura scontrino", tessera: "Lettura tessera", prodotto: "Foto prodotto", notifiche: "Notifiche" };

export default async function PaginaErrori() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_eventi", { p_tipo: "errore", p_limite: 200 });
  const elenco = (data ?? []) as unknown as EventoAdmin[];
  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="titolo text-[1.75rem]">errori</h1>
      <p className="mt-1 text-[0.875rem] text-tenue">Gli ultimi errori delle letture di Claude e delle notifiche</p>
      <section className="mt-6 overflow-hidden rounded-[20px] bg-superficie p-2 ring-1 ring-linea">
        {elenco.length === 0 ? <p className="px-4 py-6 text-tenue">Nessun errore.</p> : null}
        {elenco.map((e) => (
          <div key={e.id} className="border-t border-linea px-4 py-3 first-of-type:border-0">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem]">
              <span className="font-semibold">{DOVE[e.dove ?? ""] ?? e.dove ?? "App"}</span>
              <span className="text-tenue">
                {quando(e.creato_il)}
                {e.casa ? ` · ${e.casa}` : ""}
                {e.utente ? ` · ${e.utente}` : ""}
              </span>
            </p>
            {e.messaggio ? <p className="mt-0.5 text-[0.8125rem] text-tenue">{e.messaggio}</p> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
