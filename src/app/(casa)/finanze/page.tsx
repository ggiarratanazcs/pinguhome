import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppFinanze, type VistaFinanze } from "@/components/finanze/app-finanze";

export const metadata = { title: "Finanze" };

export default async function PaginaFinanze({ searchParams }: PageProps<"/finanze">) {
  const { profilo, famiglia, membri } = await getContesto();
  const { vista } = await searchParams;
  const supabase = await createClient();
  const [conto, movimenti] = await Promise.all([
    supabase.from("conti").select("*").eq("famiglia_id", famiglia.id).maybeSingle(),
    supabase.from("movimenti").select("*").eq("famiglia_id", famiglia.id).order("data", { ascending: false }),
  ]);
  const vistaIniziale: VistaFinanze = vista === "analisi" ? "analisi" : "conto";
  return (
    <AppFinanze
      famigliaId={famiglia.id}
      userId={profilo.id}
      membri={membri}
      vistaIniziale={vistaIniziale}
      iniziali={{ conto: conto.data ?? null, movimenti: movimenti.data ?? [] }}
    />
  );
}
