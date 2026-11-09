"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Home, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Messaggio, Pulsante } from "@/components/ui";

export function SceltaCasa() {
  const router = useRouter();
  const [inCorso, setInCorso] = useState<"crea" | "entra" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function crea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = String(new FormData(e.currentTarget).get("nome") ?? "");
    setInCorso("crea");
    setErrore(null);
    const { error } = await createClient().rpc("crea_famiglia", { p_nome: nome });
    if (error) {
      setErrore("Non sono riuscito a creare la casa. Riprova.");
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
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <form onSubmit={crea} className="carta flex flex-col p-6">
        <span className="grid size-11 place-items-center rounded-[14px] bg-accento-tenue text-accento">
          <Home className="size-5" />
        </span>
        <h2 className="titolo mt-5 text-xl">Crea la casa</h2>
        <p className="mt-1.5 text-sm text-tenue">Ti preparo reparti e due liste pronte: Supermercato e Cose per la casa.</p>
        <input
          name="nome"
          placeholder="Es. Casa Firenze"
          required
          className="mt-5 h-12 rounded-[14px] border border-linea bg-superficie-2 px-4 outline-none transition focus:border-accento focus:ring-4 focus:ring-accento-tenue"
        />
        <Pulsante type="submit" disabled={inCorso !== null} className="mt-3">
          {inCorso === "crea" ? <Loader2 className="size-4 animate-spin" /> : null}
          Crea e inizia <ArrowRight className="size-4" />
        </Pulsante>
      </form>

      <form onSubmit={entra} className="carta flex flex-col p-6">
        <span className="grid size-11 place-items-center rounded-[14px] bg-becco-tenue text-[color-mix(in_oklab,var(--becco),black_35%)]">
          <KeyRound className="size-5" />
        </span>
        <h2 className="titolo mt-5 text-xl">Ho un codice invito</h2>
        <p className="mt-1.5 text-sm text-tenue">Sono 6 caratteri: li trovi in Impostazioni → Casa.</p>
        <input
          name="codice"
          placeholder="ABC123"
          required
          maxLength={6}
          autoCapitalize="characters"
          className="numeri mt-5 h-12 rounded-[14px] border border-linea bg-superficie-2 px-4 text-lg font-semibold uppercase tracking-[0.3em] outline-none transition focus:border-accento focus:ring-4 focus:ring-accento-tenue"
        />
        <Pulsante type="submit" variante="secondario" disabled={inCorso !== null} className="mt-3">
          {inCorso === "entra" ? <Loader2 className="size-4 animate-spin" /> : null}
          Entra nella casa
        </Pulsante>
      </form>

      {errore ? <div className="md:col-span-2"><Messaggio tipo="errore">{errore}</Messaggio></div> : null}
    </div>
  );
}
