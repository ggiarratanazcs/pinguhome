import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppWallet } from "@/components/wallet/app-wallet";

export const metadata = { title: "Wallet" };

export default async function PaginaWallet() {
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const { data: carte } = await supabase.from("carte").select("*").eq("famiglia_id", famiglia.id).order("creata_il");
  return <AppWallet famigliaId={famiglia.id} userId={profilo.id} membri={membri} iniziali={carte ?? []} />;
}
