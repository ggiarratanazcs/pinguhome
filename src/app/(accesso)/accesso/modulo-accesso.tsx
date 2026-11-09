"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Campo, Messaggio, Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

type Modo = "accesso" | "registrazione" | "recupero";

function traduciErrore(messaggio: string) {
  if (/invalid login credentials/i.test(messaggio)) return "Email o password non corrette.";
  if (/email not confirmed/i.test(messaggio)) return "Devi prima confermare l'email.";
  if (/already registered/i.test(messaggio)) return "Questa email è già registrata: accedi.";
  if (/password should be/i.test(messaggio)) return "La password deve avere almeno 6 caratteri.";
  if (/rate limit/i.test(messaggio)) return "Troppi tentativi ravvicinati. Riprova tra qualche minuto.";
  return "Operazione non riuscita. Controlla i dati e riprova.";
}

const TITOLI: Record<Modo, [string, string]> = {
  accesso: ["bentornato", "Entra nella vostra casa."],
  registrazione: ["nuovo account", "Dopo crei la casa, oppure entri con il codice che ti hanno mandato."],
  recupero: ["password persa", "Ti mandiamo un link per sceglierne una nuova."],
};

export function ModuloAccesso() {
  const router = useRouter();
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>("accesso");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(
    params.get("errore") === "link" ? "Il link è scaduto o è già stato usato." : null,
  );
  const [ok, setOk] = useState<string | null>(null);

  function cambia(m: Modo) {
    setModo(m);
    setErrore(null);
    setOk(null);
  }

  async function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dati = new FormData(e.currentTarget);
    const email = String(dati.get("email") ?? "").trim();
    const password = String(dati.get("password") ?? "");
    setInCorso(true);
    setErrore(null);
    setOk(null);
    const supabase = createClient();

    if (modo === "accesso") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrore(traduciErrore(error.message));
        setInCorso(false);
        return;
      }
      const da = params.get("da");
      router.replace(da?.startsWith("/") ? da : "/");
      router.refresh();
      return;
    }

    if (modo === "registrazione") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome: String(dati.get("nome") ?? "").trim() },
          emailRedirectTo: `${window.location.origin}/auth/conferma?next=/benvenuto`,
        },
      });
      setInCorso(false);
      if (error) return setErrore(traduciErrore(error.message));
      if (data.session) {
        router.replace("/benvenuto");
        router.refresh();
        return;
      }
      setOk("Ti abbiamo mandato un'email: conferma l'indirizzo e poi accedi.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/conferma?next=/impostazioni`,
    });
    setInCorso(false);
    if (error) return setErrore(traduciErrore(error.message));
    setOk("Se l'indirizzo è registrato, riceverai il link entro pochi minuti.");
  }

  const [titolo, sottotitolo] = TITOLI[modo];

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={modo}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <h1 className="titolo text-[2.25rem]">{titolo}</h1>
          <p className="mt-3 text-[0.9375rem] text-tenue">{sottotitolo}</p>

          <form onSubmit={invia} className="mt-10 flex flex-col gap-6">
            {modo === "registrazione" ? (
              <Campo etichetta="Come ti chiami" id="nome" name="nome" autoComplete="given-name" required />
            ) : null}
            <Campo etichetta="Email" id="email" name="email" type="email" autoComplete="email" required />
            {modo !== "recupero" ? (
              <Campo
                etichetta="Password"
                id="password"
                name="password"
                type="password"
                minLength={6}
                autoComplete={modo === "accesso" ? "current-password" : "new-password"}
                required
              />
            ) : null}
            {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
            {ok ? <Messaggio tipo="ok">{ok}</Messaggio> : null}
            <Pulsante type="submit" disabled={inCorso} className="mt-2 h-12 self-start px-8">
              {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
              {modo === "accesso" ? "Accedi" : modo === "registrazione" ? "Crea account" : "Invia il link"}
            </Pulsante>
          </form>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {modo !== "accesso" ? <Collegamento onClick={() => cambia("accesso")}>Ho già un account</Collegamento> : null}
        {modo !== "registrazione" ? <Collegamento onClick={() => cambia("registrazione")}>Crea un account</Collegamento> : null}
        {modo === "accesso" ? <Collegamento onClick={() => cambia("recupero")} tenue>Password dimenticata?</Collegamento> : null}
      </div>
    </div>
  );
}

function Collegamento({ onClick, children, tenue }: { onClick: () => void; children: React.ReactNode; tenue?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("anello-focus underline underline-offset-4", tenue ? "text-tenue decoration-linea-forte" : "font-semibold text-inchiostro decoration-becco decoration-2")}
    >
      {children}
    </button>
  );
}
