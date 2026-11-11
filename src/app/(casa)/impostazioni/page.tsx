import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { Impostazioni } from "./impostazioni";

export const metadata = { title: "Impostazioni" };

export default async function PaginaImpostazioni() {
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const { data: righe } = await supabase.from("foto").select("id, path").eq("famiglia_id", famiglia.id).order("creata_il", { ascending: false });
  const firmati = righe?.length ? ((await supabase.storage.from("foto").createSignedUrls(righe.map((r) => r.path), 60 * 60 * 12)).data ?? []) : [];
  const foto = (righe ?? []).flatMap((r, i) => (firmati[i]?.signedUrl ? [{ id: r.id, path: r.path, url: firmati[i].signedUrl }] : []));
  return <Impostazioni profilo={profilo} famiglia={famiglia} membri={membri} foto={foto} />;
}
