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

type RigaContesto = Profilo & {
  famiglia:
    | (Famiglia & {
        membri: { user_id: string; ruolo: string; profilo: { id: string; nome: string; colore: string } | null }[];
      })
    | null;
};

/** Id dell'utente collegato, letto dal token della sessione (senza chiamate in rete). */
const getUserId = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/accesso");
  return id;
});

/**
 * Profilo, casa attiva e membri in UNA sola richiesta al database
 * (profilo → casa → membri → profili dei membri). Chi non appartiene
 * ancora a nessuna casa viene mandato a /benvenuto.
 */
export const getContesto = cache(async (): Promise<Contesto> => {
  const userId = await getUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profili")
    .select(
      "*, famiglia:famiglie!profili_famiglia_fk(*, membri(user_id, ruolo, profilo:profili!membri_profilo_fk(id, nome, colore)))",
    )
    .eq("id", userId)
    .single();

  // Se la lettura unica non riesce si torna alle letture separate: più lente ma sempre valide
  if (error && error.code !== "PGRST116") return contestoInPiuPassi(userId);

  const riga = data as unknown as RigaContesto | null;
  if (!riga) redirect("/accesso?errore=profilo");

  let famiglia = riga.famiglia;

  // Casa attiva non impostata (caso raro): si prende la prima casa di cui si è membri e la si ricorda
  if (!famiglia) {
    const { data: prima } = await supabase.from("membri").select("famiglia_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!prima) redirect("/benvenuto");
    await supabase.from("profili").update({ famiglia_attiva: prima.famiglia_id }).eq("id", userId);
    const { data: f } = await supabase
      .from("famiglie")
      .select("*, membri(user_id, ruolo, profilo:profili!membri_profilo_fk(id, nome, colore))")
      .eq("id", prima.famiglia_id)
      .single();
    famiglia = f as unknown as RigaContesto["famiglia"];
    if (!famiglia) redirect("/benvenuto");
  }

  const { famiglia: _ignora, ...profilo } = riga;
  void _ignora;
  const { membri, ...datiFamiglia } = famiglia;

  return {
    profilo: profilo as Profilo,
    famiglia: datiFamiglia as Famiglia,
    membri: membri.map((m) => ({
      id: m.user_id,
      nome: m.profilo?.nome || "Membro",
      colore: m.profilo?.colore || "#1d2340",
      ruolo: m.ruolo,
    })),
  };
});

async function contestoInPiuPassi(userId: string): Promise<Contesto> {
  const supabase = await createClient();
  const { data: profilo } = await supabase.from("profili").select("*").eq("id", userId).single();
  if (!profilo) redirect("/accesso?errore=profilo");
  let famigliaId = profilo.famiglia_attiva;
  if (!famigliaId) {
    const { data: prima } = await supabase.from("membri").select("famiglia_id").eq("user_id", userId).limit(1).maybeSingle();
    famigliaId = prima?.famiglia_id ?? null;
  }
  if (!famigliaId) redirect("/benvenuto");
  const [{ data: famiglia }, { data: membri }] = await Promise.all([
    supabase.from("famiglie").select("*").eq("id", famigliaId).single(),
    supabase.from("membri").select("user_id, ruolo").eq("famiglia_id", famigliaId),
  ]);
  if (!famiglia) redirect("/benvenuto");
  const { data: profili } = await supabase.from("profili").select("id, nome, colore").in("id", (membri ?? []).map((m) => m.user_id));
  return {
    profilo,
    famiglia,
    membri: (membri ?? []).map((m) => {
      const p = profili?.find((x) => x.id === m.user_id);
      return { id: m.user_id, nome: p?.nome || "Membro", colore: p?.colore || "#1d2340", ruolo: m.ruolo };
    }),
  };
}

/** Solo il profilo (per /benvenuto, dove la casa può non esserci ancora). */
export const getProfilo = cache(async (): Promise<Profilo> => {
  const userId = await getUserId();
  const supabase = await createClient();
  const { data: profilo } = await supabase.from("profili").select("*").eq("id", userId).single();
  if (!profilo) redirect("/accesso?errore=profilo");
  return profilo;
});
