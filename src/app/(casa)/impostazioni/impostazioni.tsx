"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, KeyRound, LogOut, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Famiglia, Profilo } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { applicaTema, TEMI, temaValido, type IdTema } from "@/lib/temi";
import { Avatar, Campo, Messaggio, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

const COLORI = ["#0d5f6b", "#e08a2e", "#2f8f62", "#7a5cc2", "#c4493a", "#3a7bd5", "#d14d8a", "#13242b"];

export function Impostazioni({ profilo, famiglia, membri }: { profilo: Profilo; famiglia: Famiglia; membri: MembroCasa[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [tema, setTema] = useState<IdTema>(temaValido(profilo.tema));
  const [colore, setColore] = useState(profilo.colore);
  const [copiato, setCopiato] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);

  async function scegliTema(t: IdTema) {
    setTema(t);
    applicaTema(t);
    await supabase.from("profili").update({ tema: t }).eq("id", profilo.id);
  }

  async function salvaProfilo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = String(new FormData(e.currentTarget).get("nome") ?? "").trim();
    await supabase.from("profili").update({ nome, colore }).eq("id", profilo.id);
    setEsito("Profilo salvato");
    router.refresh();
  }

  async function salvaCasa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = String(new FormData(e.currentTarget).get("casa") ?? "").trim();
    if (!nome) return;
    await supabase.from("famiglie").update({ nome }).eq("id", famiglia.id);
    setEsito("Casa aggiornata");
    router.refresh();
  }

  async function cambiaPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const { error } = await supabase.auth.updateUser({ password });
    setEsito(error ? "Password non aggiornata: almeno 6 caratteri." : "Password aggiornata");
    if (!error) form.reset();
  }

  async function condividi() {
    const testo = `Entra nella nostra casa su PinguHome con il codice ${famiglia.codice_invito}: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "PinguHome", text: testo });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(famiglia.codice_invito);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 1800);
  }

  return (
    <main className="pt-sicuro mx-auto w-full max-w-[920px] px-5 pt-8 md:px-10 md:pt-12">
      <p className="sovratitolo">Impostazioni</p>
      <h1 className="titolo mt-2 text-[2.25rem] leading-none md:text-[3rem]">Tu e la casa</h1>

      {esito ? <div className="mt-6"><Messaggio tipo="ok">{esito}</Messaggio></div> : null}

      <Sezione titolo="Aspetto" descrizione="Il tema vale su tutti i tuoi dispositivi.">
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMI.map((t) => {
            const attivo = tema === t.id;
            return (
              <button
                key={t.id}
                onClick={() => scegliTema(t.id)}
                className={cn(
                  "anello-focus relative overflow-hidden rounded-[18px] border p-3 text-left transition",
                  attivo ? "border-accento ring-4 ring-accento-tenue" : "border-linea hover:border-linea-forte",
                )}
              >
                <div className="relative h-24 overflow-hidden rounded-[12px]" style={{ background: t.anteprima[0] }}>
                  <div className="absolute left-3 top-3 h-2.5 w-16 rounded-full" style={{ background: t.anteprima[3], opacity: 0.85 }} />
                  <div className="absolute left-3 top-8 h-2 w-24 rounded-full" style={{ background: t.anteprima[3], opacity: 0.25 }} />
                  <div className="absolute bottom-3 left-3 h-7 w-20 rounded-lg" style={{ background: t.anteprima[1] }} />
                  <div className="absolute bottom-3 right-3 size-7 rounded-full" style={{ background: t.anteprima[2] }} />
                </div>
                <p className="mt-3 font-semibold">{t.nome}</p>
                <p className="text-xs text-tenue">{t.descrizione}</p>
                {attivo ? (
                  <motion.span layoutId="tema-scelto" className="absolute right-5 top-5 grid size-6 place-items-center rounded-full bg-accento text-su-accento">
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Sezione>

      <Sezione titolo="Il tuo profilo" descrizione="Il colore distingue le tue voci in lista.">
        <form onSubmit={salvaProfilo} className="flex flex-col gap-4">
          <Campo etichetta="Nome" id="nome" name="nome" defaultValue={profilo.nome} required />
          <div>
            <p className="text-[0.8125rem] font-medium text-inchiostro-2">Colore</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORI.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColore(c)}
                  aria-label={c}
                  className={cn("size-9 rounded-full ring-offset-2 ring-offset-superficie transition", colore === c && "ring-2 ring-inchiostro")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Pulsante type="submit" className="self-start">Salva profilo</Pulsante>
        </form>
      </Sezione>

      <Sezione titolo="Casa" descrizione="Chi entra con il codice vede e modifica le stesse liste.">
        <form onSubmit={salvaCasa} className="flex items-end gap-2">
          <div className="flex-1"><Campo etichetta="Nome della casa" id="casa" name="casa" defaultValue={famiglia.nome} /></div>
          <Pulsante type="submit" variante="secondario" className="h-12">Salva</Pulsante>
        </form>

        <div className="mt-5 flex flex-col gap-4 rounded-[18px] bg-accento-tenue p-5 sm:flex-row sm:items-center">
          <KeyRound className="size-6 text-accento" />
          <div className="flex-1">
            <p className="text-sm text-inchiostro-2">Codice invito</p>
            <p className="numeri titolo text-[1.75rem] tracking-[0.25em] text-accento">{famiglia.codice_invito}</p>
          </div>
          <Pulsante onClick={condividi} className="h-10 text-sm">
            {copiato ? <Check className="size-4" /> : <Share2 className="size-4" />}
            {copiato ? "Copiato" : "Condividi"}
          </Pulsante>
        </div>

        <ul className="mt-5 flex flex-col divide-y divide-linea">
          {membri.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar nome={m.nome} colore={m.colore} className="size-9" />
              <span className="flex-1 font-medium">{m.nome}{m.id === profilo.id ? <span className="text-tenue"> · tu</span> : null}</span>
              <span className="text-xs uppercase tracking-wider text-tenue">{m.ruolo}</span>
            </li>
          ))}
        </ul>
      </Sezione>

      <Sezione titolo="Sicurezza" descrizione={profilo.email}>
        <form onSubmit={cambiaPassword} className="flex items-end gap-2">
          <div className="flex-1"><Campo etichetta="Nuova password" id="password" name="password" type="password" minLength={6} autoComplete="new-password" required /></div>
          <Pulsante type="submit" variante="secondario" className="h-12">Cambia</Pulsante>
        </form>
        <form action="/auth/esci" method="post" className="mt-5">
          <Pulsante variante="pericolo" className="h-10 text-sm"><LogOut className="size-4" /> Esci da PinguHome</Pulsante>
        </form>
      </Sezione>
    </main>
  );
}

function Sezione({ titolo, descrizione, children }: { titolo: string; descrizione?: string; children: ReactNode }) {
  return (
    <section className="mt-10 grid gap-5 border-t border-linea pt-8 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="titolo text-lg">{titolo}</h2>
        {descrizione ? <p className="mt-1 text-sm text-tenue">{descrizione}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
