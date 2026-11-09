import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { AppAgenda } from "@/components/agenda/app-agenda";

export const metadata = { title: "Agenda" };

export default async function PaginaAgenda() {
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const [impegni, fatti] = await Promise.all([
    supabase.from("impegni").select("*").eq("famiglia_id", famiglia.id).order("data"),
    supabase.from("impegni_fatti").select("*").eq("famiglia_id", famiglia.id),
  ]);
  return <AppAgenda famigliaId={famiglia.id} userId={profilo.id} membri={membri} iniziali={{ impegni: impegni.data ?? [], fatti: fatti.data ?? [] }} />;
}
