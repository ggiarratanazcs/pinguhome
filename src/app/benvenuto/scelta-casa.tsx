"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Messaggio, Pulsante } from "@/components/ui";

export function SceltaCasa() {
  const router = useRouter();
  const [inCorso, setInCorso] = useState<"crea" | "entra" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [serveCodice, setServeCodice] = useState(false);

  async function crea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get("nome") ?? "");
    const codice = String(f.get("codice_casa") ?? "").trim();
    setInCorso("crea");
    setErrore(null);
    const { error } = await createClient().rpc("crea_famiglia", { p_nome: nome, p_codice: codice || null });
    if (error) {
      // Per una casa nuova serve il codice dato dall'amministratore
      if (/codice_casa_mancante/i.test(error.message)) {
        setServeCodice(true);
        setErrore(codice ? "Codice per la casa nuova non valido o già usato." : "Per creare una casa nuova serve il codice che ti hanno dato.");
      } else setErrore("Non sono riuscito a creare la casa. Riprova.");
      setInCorso(null);
      return;
    }
    router.replace("/spesa");
    router.refresh();
  }

  async function entra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const codice = String(new FormData(e.currentTarget).get("codice") ?? "");
    setInCorso("entra");
    setErrore(null);
    const { error } = await createClient().rpc("unisciti_famiglia", { p_codice: codice });
    if (error) {
      setErrore(/non valido/i.test(error.message) ? "Codice non valido: controllalo e riprova." : "Non sono riuscito a entrare. Riprova.");
      setInCorso(null);
      return;
    }
    router.replace("/spesa");
    router.refresh();
  }

  return (
    <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-8">
      <form onSubmit={crea} className="flex flex-col rounded-[28px] bg-superficie-2 p-6 md:p-7">
        <h2 className="titolo text-[1.25rem]">crea la casa</h2>
        <p className="mt-2 text-[0.9375rem] text-tenue">Trovi già i reparti e due liste: Supermercato e Cose per la casa.</p>
        <input name="nome" placeholder="Es. Casa Firenze" required className="campo-linea mt-6 h-12 text-[1.125rem]" />
        {serveCodice ? (
          <input
            name="codice_casa"
            placeholder="Codice per la casa nuova"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            className="campo-linea numeri mt-4 h-12 text-[1.125rem] uppercase tracking-[0.2em]"
          />
        ) : null}
        <Pulsante type="submit" disabled={inCorso !== null} className="mt-6 self-start">
          {inCorso === "crea" ? <Loader2 className="size-4 animate-spin" /> : null}
          Crea la casa
        </Pulsante>
      </form>

      <form onSubmit={entra} className="flex flex-col rounded-[28px] bg-dorso p-6 text-su-dorso md:p-7">
        <h2 className="titolo text-[1.25rem]">ho un codice</h2>
        <p className="mt-2 text-[0.9375rem] text-su-dorso-tenue">Sono 6 caratteri: chi ha creato la casa li trova in Impostazioni.</p>
        <input
          name="codice"
          placeholder="ABC123"
          required
          maxLength={6}
          autoCapitalize="characters"
          className="campo-linea numeri mt-6 h-12 border-su-dorso-tenue text-[1.5rem] font-semibold uppercase tracking-[0.3em] text-su-dorso placeholder:text-su-dorso-tenue/50"
        />
        <Pulsante type="submit" disabled={inCorso !== null} className="mt-6 self-start">
          {inCorso === "entra" ? <Loader2 className="size-4 animate-spin" /> : null}
          Entra nella casa
        </Pulsante>
      </form>

      {errore ? <div className="md:col-span-2"><Messaggio tipo="errore">{errore}</Messaggio></div> : null}
    </div>
  );
}
