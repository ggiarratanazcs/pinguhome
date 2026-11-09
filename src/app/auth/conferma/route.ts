import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Destinazione dei link inviati per email (conferma registrazione, recupero password). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codice = searchParams.get("code");
  const next = searchParams.get("next");
  const destinazione = next?.startsWith("/") ? next : "/";

  const supabase = await createClient();

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destinazione, origin));
  } else if (codice) {
    const { error } = await supabase.auth.exchangeCodeForSession(codice);
    if (!error) return NextResponse.redirect(new URL(destinazione, origin));
  }

  return NextResponse.redirect(new URL("/accesso?errore=link", origin));
}
