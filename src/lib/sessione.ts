import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Famiglia, Profilo } from "@/lib/database.types";

export type MembroCasa = { id: string; nome: string; colore: string; ruolo: string };

export type Contesto = {
  profilo: Profilo;
  famiglia: Famiglia;
  membri: MembroCasa[];
};

/** Utente collegato e suo profilo; rimanda all'accesso se manca la sessione. */
export const getProfilo = cache(async (): Promise<Profilo> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/accesso");
  const { data: profilo } = await supabase.from("profili").select("*").eq("id", userId).single();
  if (!profilo) redirect("/accesso?errore=profilo");
  return profilo;
});

/**
 * Profilo, casa attiva e membri. Chi non appartiene ancora a nessuna casa
 * viene mandato a /benvenuto per crearla o entrare con un codice.
 */
export const getContesto = cache(async (): Promise<Contesto> => {
  const profilo = await getProfilo();
  const supabase = await createClient();

  let famigliaId = profilo.famiglia_attiva;
  if (!famigliaId) {
    const { data: prima } = await supabase.from("membri").select("famiglia_id").eq("user_id", profilo.id).limit(1).maybeSingle();
    famigliaId = prima?.famiglia_id ?? null;
  }
  if (!famigliaId) redirect("/benvenuto");

  const [{ data: famiglia }, { data: membri }] = await Promise.all([
    supabase.from("famiglie").select("*").eq("id", famigliaId).single(),
    supabase.from("membri").select("user_id, ruolo").eq("famiglia_id", famigliaId),
  ]);
  if (!famiglia) redirect("/benvenuto");

  const ids = (membri ?? []).map((m) => m.user_id);
  const { data: profili } = await supabase.from("profili").select("id, nome, colore").in("id", ids);

  return {
    profilo,
    famiglia,
    membri: (membri ?? []).map((m) => {
      const p = profili?.find((x) => x.id === m.user_id);
      return { id: m.user_id, nome: p?.nome || "Membro", colore: p?.colore || "#0d5f6b", ruolo: m.ruolo };
    }),
  };
});
