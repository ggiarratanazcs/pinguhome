/**
 * Indirizzo e chiave pubblica del progetto Supabase "pinguhome".
 * Sono dati pubblici per definizione (finiscono comunque nel browser): i dati sono
 * protetti dalle policy RLS del database. Le variabili d'ambiente hanno la precedenza.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rgwjxqazixrljkknlsai.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VWWurdToDlXNB4IgsET5Bw_208jJjHS";
