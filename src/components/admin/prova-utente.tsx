"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

/** "Prova": manda una notifica di prova ai dispositivi di un utente. */
export function ProvaUtente({ utente }: { utente: string }) {
  const [stato, setStato] = useState<"pronto" | "invio" | "fatto" | string>("pronto");

  async function prova() {
    setStato("invio");
    const r = await fetch("/api/admin/notifica", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ utente }) });
    const j = await r.json().catch(() => null);
    setStato(r.ok ? "fatto" : (j?.errore ?? "Invio non riuscito"));
  }

  if (stato !== "pronto" && stato !== "invio" && stato !== "fatto") return <span className="max-w-48 text-right text-[0.75rem] text-pericolo">{stato}</span>;
  return (
    <button
      onClick={prova}
      disabled={stato === "invio"}
      className="anello-focus flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium ring-1 ring-linea transition hover:bg-superficie-2 disabled:opacity-60"
    >
      {stato === "invio" ? <Loader2 className="size-4 animate-spin" /> : stato === "fatto" ? <Check className="size-4 text-eco" /> : <Send className="size-4" />}
      {stato === "fatto" ? "Inviata" : "Prova"}
    </button>
  );
}
