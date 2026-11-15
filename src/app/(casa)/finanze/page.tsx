import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppFinanze, type VistaFinanze } from "@/components/finanze/app-finanze";

export const metadata = { title: "Finanze" };

export default async function PaginaFinanze({ searchParams }: PageProps<"/finanze">) {
  const { profilo, famiglia, membri } = await getContesto();
  const { vista } = await searchParams;
  const supabase = await createClient();
  const inizioMese = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 7) + "-01";
  const [conto, movimenti, scadenze, pagate, obiettivi, accantonamenti, budget] = await Promise.all([
    supabase.from("conti").select("*").eq("famiglia_id", famiglia.id).maybeSingle(),
    supabase.from("movimenti").select("*").eq("famiglia_id", famiglia.id).order("data", { ascending: false }),
    supabase.from("impegni").select("id, data, ricorrenza, importo, titolo").eq("famiglia_id", famiglia.id).gt("importo", 0),
    supabase.from("impegni_fatti").select("impegno_id, data").eq("famiglia_id", famiglia.id).gte("data", inizioMese),
    supabase.from("obiettivi").select("*").eq("famiglia_id", famiglia.id).order("creato_il"),
    supabase.from("accantonamenti").select("*").eq("famiglia_id", famiglia.id).order("data"),
    supabase.from("budget").select("*").eq("famiglia_id", famiglia.id),
  ]);
  const vistaIniziale: VistaFinanze = vista === "analisi" ? "analisi" : vista === "obiettivi" ? "obiettivi" : vista === "budget" ? "budget" : "conto";
  return (
    <AppFinanze
      famigliaId={famiglia.id}
      userId={profilo.id}
      membri={membri}
      vistaIniziale={vistaIniziale}
      iniziali={{ conto: conto.data ?? null, movimenti: movimenti.data ?? [], scadenze: scadenze.data ?? [],
        pagate: pagate.data ?? [],
        obiettivi: obiettivi.data ?? [],
        accantonamenti: accantonamenti.data ?? [],
        budget: budget.data ?? [],
      }}
    />
  );
}
