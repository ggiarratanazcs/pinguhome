import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppSpesa } from "@/components/spesa/app-spesa";

export const metadata = { title: "Spesa" };

export default async function PaginaSpesa({ searchParams }: PageProps<"/spesa">) {
  const { vista } = await searchParams;
  const vistaIniziale = (["lista", "dispensa", "abituali", "spese", "analisi"] as const).find((v) => v === vista) ?? "lista";
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const f = famiglia.id;
  const [liste, reparti, voci, prodotti, dispensa, spese] = await Promise.all([
    supabase.from("liste").select("*").eq("famiglia_id", f).order("ordine"),
    supabase.from("reparti").select("*").eq("famiglia_id", f).order("ordine"),
    supabase.from("voci_lista").select("*").eq("famiglia_id", f).order("creata_il"),
    supabase.from("prodotti").select("*").eq("famiglia_id", f),
    supabase.from("dispensa").select("*").eq("famiglia_id", f),
    supabase.from("spese").select("*").eq("famiglia_id", f).order("data", { ascending: false }),
  ]);

  return (
    <AppSpesa
      vistaIniziale={vistaIniziale}
      famigliaId={f}
      userId={profilo.id}
      membri={membri}
      iniziali={{
        liste: liste.data ?? [],
        reparti: reparti.data ?? [],
        voci: voci.data ?? [],
        prodotti: prodotti.data ?? [],
        dispensa: dispensa.data ?? [],
        spese: spese.data ?? [],
      }}
    />
  );
}
