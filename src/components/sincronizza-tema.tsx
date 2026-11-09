"use client";

import { useEffect } from "react";
import { applicaTema, temaValido } from "@/lib/temi";

/** Allinea il tema della pagina a quello salvato nel profilo (vale su tutti i dispositivi). */
export function SincronizzaTema({ tema }: { tema: string }) {
  useEffect(() => {
    applicaTema(temaValido(tema));
  }, [tema]);
  return null;
}
