import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/config";
import type { Database } from "@/lib/database.types";

/**
 * Client Supabase lato server (Server Components, Server Actions, Route Handlers).
 * Legge la sessione dai cookie della richiesta: va usato solo dentro un <Suspense>
 * o in codice che gira a richiesta.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chiamato da un Server Component: il refresh della sessione
            // è comunque gestito dal proxy.
          }
        },
      },
    },
  );
}
