import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/config";
import type { Database } from "@/lib/database.types";

/** Percorsi raggiungibili senza essere autenticati. */
const PERCORSI_PUBBLICI = ["/accesso", "/auth"];

/**
 * Aggiorna la sessione Supabase a ogni richiesta e rimanda alla pagina di
 * accesso chi non è autenticato. È un controllo "ottimistico": la sicurezza
 * vera sui dati è garantita dalle policy RLS del database.
 */
export async function aggiornaSessione(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const autenticato = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const pubblico = PERCORSI_PUBBLICI.some((p) => pathname.startsWith(p));

  if (!autenticato && !pubblico) {
    const url = request.nextUrl.clone();
    url.pathname = "/accesso";
    url.search = pathname === "/" ? "" : `?da=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (autenticato && pathname === "/accesso") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
