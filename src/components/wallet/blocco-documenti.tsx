"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { motion } from "motion/react";
import { Delete, Fingerprint, KeyRound, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * Blocco dei Documenti, per dispositivo: Face ID / impronta (WebAuthn del telefono) oppure un codice di 4 cifre.
 * Una volta sbloccati restano aperti per 5 minuti. È un blocco dell'app: i file restano protetti dalle regole del database.
 */

const CHIAVE = "uchi:blocco-documenti";
const CHIAVE_SBLOCCO = "uchi:documenti-sbloccati-fino";
const DURATA = 5 * 60 * 1000;

type Impostazione = { metodo: "biometria"; credenziale: string } | { metodo: "codice"; sale: string; impronta: string };

function leggi(): Impostazione | null {
  try {
    const v = localStorage.getItem(CHIAVE);
    return v ? (JSON.parse(v) as Impostazione) : null;
  } catch {
    return null;
  }
}

function salva(v: Impostazione | null) {
  try {
    if (v) localStorage.setItem(CHIAVE, JSON.stringify(v));
    else localStorage.removeItem(CHIAVE);
  } catch {}
}

function sbloccatoAdesso() {
  try {
    return Number(sessionStorage.getItem(CHIAVE_SBLOCCO) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function segnaSbloccato() {
  try {
    sessionStorage.setItem(CHIAVE_SBLOCCO, String(Date.now() + DURATA));
  } catch {}
}

function aBase64(b: ArrayBuffer | Uint8Array) {
  const byte = b instanceof Uint8Array ? b : new Uint8Array(b);
  return btoa(String.fromCharCode(...byte));
}

function daBase64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function hash(codice: string, sale: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${sale}:${codice}`));
  return aBase64(d);
}

async function biometriaDisponibile() {
  try {
    return Boolean(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch {
    return false;
  }
}

async function registraBiometria(): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Uchi", id: location.hostname },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "documenti", displayName: "Documenti di Uchi" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return cred ? aBase64(cred.rawId) : null;
  } catch {
    return null;
  }
}

async function verificaBiometria(credenziale: string) {
  try {
    const r = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: daBase64(credenziale) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(r);
  } catch {
    return false;
  }
}

const nessunAscolto = () => () => {};

export function BloccoDocumenti({ children }: { children: React.ReactNode }) {
  // Lettura iniziale solo nel browser (sul server il blocco è sempre chiuso)
  const pronto = useSyncExternalStore(nessunAscolto, () => true, () => false);
  const [stato, setStato] = useState<"controllo" | "imposta" | "chiuso" | "aperto">("controllo");

  useEffect(() => {
    if (!pronto) return;
    const t = setTimeout(() => setStato(leggi() ? (sbloccatoAdesso() ? "aperto" : "chiuso") : "imposta"), 0);
    return () => clearTimeout(t);
  }, [pronto]);

  // Passati i 5 minuti si richiude
  useEffect(() => {
    if (stato !== "aperto") return;
    const i = setInterval(() => !sbloccatoAdesso() && setStato("chiuso"), 15_000);
    return () => clearInterval(i);
  }, [stato]);

  if (stato === "aperto") return <>{children}</>;
  if (stato === "controllo") return <div className="mt-16 grid place-items-center text-tenue"><Loader2 className="size-6 animate-spin" /></div>;
  if (stato === "imposta")
    return (
      <Imposta
        onFatto={() => {
          segnaSbloccato();
          setStato("aperto");
        }}
      />
    );
  return (
    <Sblocca
      onAperto={() => {
        segnaSbloccato();
        setStato("aperto");
      }}
      onReimposta={() => {
        salva(null);
        setStato("imposta");
      }}
    />
  );
}

function Cornice({ titolo, testo, children }: { titolo: string; testo: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 flex max-w-sm flex-col items-center text-center">
      <span className="grid size-16 place-items-center rounded-[20px] bg-superficie-2 text-inchiostro">
        <Lock className="size-7" />
      </span>
      <p className="titolo mt-5 text-[1.375rem]">{titolo}</p>
      <p className="mt-1 text-[0.9375rem] text-tenue">{testo}</p>
      <div className="mt-6 w-full">{children}</div>
    </motion.div>
  );
}

/** Tastierino del codice di 4 cifre */
function Codice({ onCompleto, errore }: { onCompleto: (c: string) => void; errore?: string | null }) {
  const [cifre, setCifre] = useState("");
  const scrivi = (n: string) =>
    setCifre((c) => {
      const nuovo = (c + n).slice(0, 4);
      if (nuovo.length === 4) setTimeout(() => (onCompleto(nuovo), setCifre("")), 120);
      return nuovo;
    });
  return (
    <div>
      <div className={cn("flex justify-center gap-4", errore && "text-pericolo")}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-4 rounded-full transition-colors", i < cifre.length ? "bg-inchiostro" : "bg-superficie-3")} />
        ))}
      </div>
      {errore ? <p className="mt-3 text-[0.8125rem] text-pericolo">{errore}</p> : null}
      <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map((t, i) =>
          t === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => (t === "←" ? setCifre((c) => c.slice(0, -1)) : scrivi(t))}
              aria-label={t === "←" ? "Cancella" : t}
              className="anello-focus numeri grid h-14 place-items-center rounded-full bg-superficie-2 text-[1.375rem] transition active:scale-95 active:bg-superficie-3"
            >
              {t === "←" ? <Delete className="size-5" /> : t}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function Imposta({ onFatto }: { onFatto: () => void }) {
  const [biometria, setBiometria] = useState<boolean | null>(null);
  const [fase, setFase] = useState<"scelta" | "codice" | "conferma">("scelta");
  const [primo, setPrimo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    biometriaDisponibile().then(setBiometria);
  }, []);

  async function conBiometria() {
    setErrore(null);
    const id = await registraBiometria();
    if (!id) return setErrore("Face ID non attivato: puoi usare un codice.");
    salva({ metodo: "biometria", credenziale: id });
    onFatto();
  }

  async function codiceScritto(c: string) {
    if (fase === "codice") {
      setPrimo(c);
      setFase("conferma");
      setErrore(null);
      return;
    }
    if (c !== primo) {
      setFase("codice");
      setErrore("I due codici non coincidono, riprova.");
      return;
    }
    const sale = aBase64(crypto.getRandomValues(new Uint8Array(16)));
    salva({ metodo: "codice", sale, impronta: await hash(c, sale) });
    onFatto();
  }

  if (fase !== "scelta")
    return (
      <Cornice titolo={fase === "codice" ? "scegli un codice" : "ripeti il codice"} testo="4 cifre, solo per i documenti su questo dispositivo.">
        <Codice onCompleto={codiceScritto} errore={errore} />
      </Cornice>
    );

  return (
    <Cornice titolo="proteggi i documenti" testo="Su questo dispositivo i documenti si aprono solo con il tuo volto, l'impronta o un codice.">
      <div className="flex flex-col gap-2">
        {biometria ? (
          <Pulsante onClick={conBiometria} className="h-12 w-full">
            <Fingerprint className="size-5" /> Usa Face ID o impronta
          </Pulsante>
        ) : null}
        <Pulsante variante={biometria ? "secondario" : "primario"} onClick={() => setFase("codice")} className="h-12 w-full">
          <KeyRound className="size-5" /> Usa un codice
        </Pulsante>
        {biometria === null ? <Loader2 className="mx-auto mt-2 size-5 animate-spin text-tenue" /> : null}
        {errore ? <p className="mt-2 text-[0.8125rem] text-pericolo">{errore}</p> : null}
      </div>
    </Cornice>
  );
}

function Sblocca({ onAperto, onReimposta }: { onAperto: () => void; onReimposta: () => void }) {
  const [imp] = useState(leggi);
  const [errore, setErrore] = useState<string | null>(null);
  const [dimenticato, setDimenticato] = useState(false);
  const tentato = useRef(false);

  async function biometria() {
    if (imp?.metodo !== "biometria") return;
    setErrore(null);
    if (await verificaBiometria(imp.credenziale)) onAperto();
    else setErrore("Non riconosciuto. Riprova.");
  }

  // Con Face ID parte subito la richiesta
  useEffect(() => {
    if (imp?.metodo === "biometria" && !tentato.current) {
      tentato.current = true;
      const t = setTimeout(() => {
        verificaBiometria(imp.credenziale).then((ok) => (ok ? onAperto() : undefined));
      }, 0);
      return () => clearTimeout(t);
    }
  }, [imp, onAperto]);

  async function codice(c: string) {
    if (imp?.metodo !== "codice") return;
    if ((await hash(c, imp.sale)) === imp.impronta) onAperto();
    else setErrore("Codice sbagliato.");
  }

  if (dimenticato) return <Reimposta onFatto={onReimposta} onAnnulla={() => setDimenticato(false)} />;

  return (
    <Cornice titolo="documenti bloccati" testo={imp?.metodo === "biometria" ? "Sblocca con Face ID o con l'impronta." : "Scrivi il codice."}>
      {imp?.metodo === "biometria" ? (
        <div className="flex flex-col items-center gap-3">
          <Pulsante onClick={biometria} className="h-12 w-full">
            <Fingerprint className="size-5" /> Sblocca
          </Pulsante>
          {errore ? <p className="text-[0.8125rem] text-pericolo">{errore}</p> : null}
        </div>
      ) : (
        <Codice onCompleto={codice} errore={errore} />
      )}
      <button onClick={() => setDimenticato(true)} className="anello-focus mt-6 text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
        {imp?.metodo === "biometria" ? "Non funziona? Usa la password" : "Codice dimenticato?"}
      </button>
    </Cornice>
  );
}

/** Si riparte con la password dell'account */
function Reimposta({ onFatto, onAnnulla }: { onFatto: () => void; onAnnulla: () => void }) {
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [carico, setCarico] = useState(false);

  async function invia(e: FormEvent) {
    e.preventDefault();
    setCarico(true);
    setErrore(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    const { error } = email ? await supabase.auth.signInWithPassword({ email, password }) : { error: new Error("nessuna email") };
    setCarico(false);
    if (error) return setErrore("Password sbagliata.");
    onFatto();
  }

  return (
    <Cornice titolo="usa la password" testo="Scrivi la password del tuo account per scegliere di nuovo come bloccare i documenti.">
      <form onSubmit={invia} className="flex flex-col gap-3 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          placeholder="Password"
          className="campo-linea h-12 text-[1.0625rem]"
        />
        {errore ? <p className="text-[0.8125rem] text-pericolo">{errore}</p> : null}
        <div className="mt-2 flex gap-2">
          <Pulsante type="submit" disabled={!password || carico} className="flex-1">
            {carico ? <Loader2 className="size-4 animate-spin" /> : null} Continua
          </Pulsante>
          <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
            Annulla
          </Pulsante>
        </div>
      </form>
    </Cornice>
  );
}
