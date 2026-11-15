import { Bell, HardDrive, House, ScanLine, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { costoDollari, dollari, peso, type Panoramica } from "@/lib/admin";
import { PannelloCase } from "@/components/admin/pannello-case";

function Numero({ icona: Icona, valore, etichetta }: { icona: typeof House; valore: string; etichetta: string }) {
  return (
    <div className="rounded-[20px] bg-superficie p-5 ring-1 ring-linea">
      <Icona className="size-5 text-tenue" />
      <p className="titolo-normale numeri mt-3 text-[1.75rem] leading-none">{valore}</p>
      <p className="mt-1.5 text-[0.8125rem] text-tenue">{etichetta}</p>
    </div>
  );
}

export default async function PaginaPanoramica() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_panoramica");
  const p = data as unknown as Panoramica;
  const costo = costoDollari(p.token_ingresso_mese, p.token_uscita_mese);
  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="titolo text-[1.75rem]">panoramica</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        <Numero icona={House} valore={String(p.case)} etichetta="case" />
        <Numero icona={Users} valore={String(p.utenti)} etichetta="utenti" />
        <Numero icona={Bell} valore={String(p.dispositivi)} etichetta="dispositivi con notifiche" />
        <Numero icona={HardDrive} valore={peso(p.spazio)} etichetta="foto e scontrini" />
        <Numero icona={ScanLine} valore={String(p.letture_mese)} etichetta={`letture Claude questo mese · ~${dollari(costo)}`} />
      </div>
      <div className="mt-8">
        <PannelloCase case={p.elenco} />
      </div>
    </div>
  );
}
