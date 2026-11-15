import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Utilizzo = { input_tokens?: number; output_tokens?: number } | undefined;

/** Registra una lettura di Claude (per la console di admin: quante e quanti token, non cosa). */
export async function registraLettura(supabase: SupabaseClient<Database>, tipo: "scontrino" | "tessera" | "prodotto", uso: Utilizzo) {
  await supabase.rpc("registra_evento", { p_tipo: tipo, p_ingresso: uso?.input_tokens ?? null, p_uscita: uso?.output_tokens ?? null }).then(
    () => undefined,
    () => undefined,
  );
}

/** Registra un errore (dove e un messaggio breve), senza dati delle case. */
export async function registraErrore(supabase: SupabaseClient<Database>, dove: string, messaggio: string) {
  await supabase.rpc("registra_evento", { p_tipo: "errore", p_dove: dove, p_messaggio: messaggio }).then(
    () => undefined,
    () => undefined,
  );
}
