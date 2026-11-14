import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Icona dell'app per la schermata Home del telefono: la mascotte di chi è collegato
 * sul fondo arancione. Senza mascotte personale (o senza accesso) resta il pinguino originale.
 */
export async function GET(request: NextRequest) {
  const lato = Math.min(512, Math.max(64, Number(request.nextUrl.searchParams.get("s")) || 180));
  const originale = NextResponse.redirect(new URL(lato > 200 ? "/icona-512.png" : "/apple-icon.png", request.url));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return originale;
  const { data: profilo } = await supabase.from("profili").select("mascotte, mascotte_path").eq("id", id).maybeSingle();
  if (!profilo || profilo.mascotte !== "personale" || !profilo.mascotte_path) return originale;

  const url = `${SUPABASE_URL}/storage/v1/object/public/mascotte/${profilo.mascotte_path}`;
  const margine = Math.round(lato * 0.1);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ff9f1c" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={url} width={lato - margine * 2} height={lato - margine * 2} style={{ objectFit: "contain" }} />
      </div>
    ),
    { width: lato, height: lato, headers: { "cache-control": "private, max-age=3600" } },
  );
}
