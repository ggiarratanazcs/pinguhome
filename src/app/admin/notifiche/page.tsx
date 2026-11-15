import { createClient } from "@/lib/supabase/server";
import { nomeDispositivo, quando, type DispositivoAdmin } from "@/lib/admin";
import { ProvaUtente } from "@/components/admin/prova-utente";

export const metadata = { title: "Notifiche · Admin" };

export default async function PaginaNotifiche() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_dispositivi");
  const elenco = (data ?? []) as unknown as DispositivoAdmin[];
  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="titolo text-[1.75rem]">notifiche</h1>
      <p className="mt-1 text-[0.875rem] text-tenue">{elenco.length === 1 ? "1 dispositivo" : `${elenco.length} dispositivi`} con le notifiche attive</p>
      <section className="mt-6 overflow-hidden rounded-[20px] bg-superficie p-2 ring-1 ring-linea">
        {elenco.length === 0 ? <p className="px-4 py-6 text-tenue">Nessun dispositivo.</p> : null}
        {elenco.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-[14px] px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {d.utente} · {nomeDispositivo(d.dispositivo)}
              </span>
              <span className="block truncate text-[0.75rem] text-tenue">
                {d.case_ ?? "nessuna casa"} · attivate {quando(d.creata_il)}
              </span>
            </span>
            <ProvaUtente utente={d.user_id} />
          </div>
        ))}
      </section>
    </div>
  );
}
