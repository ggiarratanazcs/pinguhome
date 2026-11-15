import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppWallet } from "@/components/wallet/app-wallet";

export const metadata = { title: "Wallet" };

export default async function PaginaWallet({ searchParams }: PageProps<"/wallet">) {
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const [{ data: carte }, { data: documenti }] = await Promise.all([
    supabase.from("carte").select("*").eq("famiglia_id", famiglia.id).order("creata_il"),
    supabase.from("documenti").select("*").eq("famiglia_id", famiglia.id).order("nome"),
  ]);
  const { vista } = await searchParams;
  return (
    <AppWallet
      famigliaId={famiglia.id}
      userId={profilo.id}
      membri={membri}
      iniziali={carte ?? []}
      documenti={documenti ?? []}
      vistaIniziale={vista === "documenti" ? "documenti" : "carte"}
    />
  );
}
