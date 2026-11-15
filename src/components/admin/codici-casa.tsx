"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { quando } from "@/lib/admin";
import { cn } from "@/lib/utils";

export type CodiceCasa = { codice: string; creato_il: string; scade_il: string; usato_il: string | null; usato_da: string | null; casa: string | null };

/** Codici per creare una casa nuova: valgono una volta sola e scadono dopo 14 giorni. */
export function CodiciCasa({ iniziali }: { iniziali: CodiceCasa[] }) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);
  const [copiato, setCopiato] = useState<string | null>(null);

  async function nuovo() {
    setInCorso(true);
    const { data } = await createClient().rpc("admin_crea_codice_casa");
    setInCorso(false);
    if (data) copia(data);
    router.refresh();
  }

  async function copia(codice: string) {
    const testo = `Crea la tua casa su Uchi con il codice ${codice}: ${window.location.origin}/accesso?codice=${codice}`;
    try {
      if (navigator.share) await navigator.share({ title: "Uchi", text: testo });
      else await navigator.clipboard.writeText(testo);
      setCopiato(codice);
      setTimeout(() => setCopiato(null), 2000);
    } catch {}
  }

  async function annulla(codice: string) {
    await createClient().rpc("admin_annulla_codice_casa", { p_codice: codice });
    router.refresh();
  }

  const adesso = Date.now();
  return (
    <section className="rounded-[20px] bg-superficie p-6 ring-1 ring-linea">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="titolo text-[1.125rem]">codici per case nuove</p>
          <p className="text-[0.8125rem] text-tenue">Valgono una volta sola e scadono dopo 14 giorni. Per entrare in una casa che c&apos;è già basta il suo codice invito.</p>
        </div>
        <button
          onClick={nuovo}
          disabled={inCorso}
          className="anello-focus flex h-10 items-center gap-2 rounded-full bg-becco px-4 text-[0.875rem] font-semibold text-su-becco transition hover:bg-becco-hover disabled:opacity-60"
        >
          {inCorso ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nuovo codice per una casa
        </button>
      </div>
      {iniziali.length ? (
        <ul className="mt-4">
          {iniziali.map((c) => {
            const scaduto = !c.usato_il && new Date(c.scade_il).getTime() < adesso;
            return (
              <li key={c.codice} className="flex items-center gap-3 border-t border-linea py-3 first:border-0">
                <span className={cn("numeri w-28 shrink-0 font-semibold tracking-[0.15em]", (c.usato_il || scaduto) && "text-tenue line-through decoration-tenue/50")}>{c.codice}</span>
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-tenue">
                  {c.usato_il
                    ? `Usato da ${c.usato_da ?? "—"} ${quando(c.usato_il)}${c.casa ? ` · ${c.casa}` : " · casa non ancora creata"}`
                    : scaduto
                      ? "Scaduto"
                      : `Libero · scade ${quando(c.scade_il)}`}
                </span>
                {!c.usato_il && !scaduto ? (
                  <span className="flex shrink-0 items-center">
                    <button onClick={() => copia(c.codice)} aria-label="Condividi il codice" title="Condividi" className="anello-focus grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro">
                      {copiato === c.codice ? <Check className="size-4 text-eco" /> : <Copy className="size-4" />}
                    </button>
                    <button onClick={() => annulla(c.codice)} aria-label="Annulla il codice" title="Annulla" className="anello-focus grid size-8 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
                      <X className="size-4" />
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
