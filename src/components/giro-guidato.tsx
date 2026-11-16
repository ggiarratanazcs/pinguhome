"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { Mascotte } from "@/components/mascotte";
import { Pulsante } from "@/components/ui";

/** Evento per riaprire il giro da Impostazioni */
export const EVENTO_GIRO = "uchi:giro-guidato";

export type Passo = { percorso: string; bersaglio: string; titolo: string; testo: string };

/** I passi del giro: ogni passo apre la sezione vera e illumina il comando di cui parla. */
const PASSI: Passo[] = [
  {
    percorso: "/",
    bersaglio: "indicatori",
    titolo: "la home",
    testo: "A colpo d'occhio: quante cose ci sono da comprare, gli impegni dei prossimi 30 giorni e quanto resta sul conto. Tocca per entrare.",
  },
  {
    percorso: "/spesa",
    bersaglio: "liste",
    titolo: "le liste",
    testo: "Supermercato, casa, farmacia: un tocco per cambiare lista, il + per crearne una nuova.",
  },
  {
    percorso: "/spesa",
    bersaglio: "aggiungi",
    titolo: "cosa manca?",
    testo: "Scrivi qui, anche «2 kg mele»: finisce da solo nel reparto giusto. Al supermercato spunti e chiudi il carrello.",
  },
  {
    percorso: "/spesa",
    bersaglio: "schede-spesa",
    titolo: "tutto sulla spesa",
    testo: "In casa trovi frigo, freezer, dispensa, bagno e ripostiglio. In Spese carichi lo scontrino, in Analisi vedi come spendete.",
  },
  {
    percorso: "/agenda",
    bersaglio: "nuovo-impegno",
    titolo: "l'agenda",
    testo: "Con il + aggiungi appuntamenti e scadenze, anche ogni mese e con l'importo. Vi avvisiamo prima che arrivino.",
  },
  {
    percorso: "/finanze",
    bersaglio: "residuo",
    titolo: "le finanze",
    testo: "Il residuo del conto si aggiorna da solo con le spese e le scadenze pagate. A mano inserite solo il resto.",
  },
  {
    percorso: "/impostazioni",
    bersaglio: "notifiche",
    titolo: "fatta vostra",
    testo: "Qui attivi le notifiche, scegli la mascotte, il tema e le foto della home. Il giro lo ritrovi qui sotto, quando vuoi.",
  },
];

type Rettangolo = { top: number; left: number; width: number; height: number };

export function GiroGuidato({ profiloId, daMostrare, passi = PASSI }: { profiloId: string; daMostrare: boolean; passi?: Passo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [fase, setFase] = useState<"intro" | number | null>(daMostrare ? "intro" : null);
  const [rett, setRett] = useState<Rettangolo | null>(null);
  const passo = typeof fase === "number" ? passi[fase] : null;

  // Riapertura da Impostazioni
  useEffect(() => {
    const apri = () => setFase("intro");
    window.addEventListener(EVENTO_GIRO, apri);
    return () => window.removeEventListener(EVENTO_GIRO, apri);
  }, []);

  const chiudi = useCallback(async () => {
    setFase(null);
    setRett(null);
    await supabase.from("profili").update({ tutorial_visto_il: new Date().toISOString() }).eq("id", profiloId);
  }, [profiloId, supabase]);

  // Porta nella sezione del passo
  useEffect(() => {
    if (passo && pathname !== passo.percorso) router.push(passo.percorso);
  }, [passo, pathname, router]);

  // Trova il comando da illuminare, portalo in vista e seguilo se la pagina si muove
  useLayoutEffect(() => {
    if (!passo || pathname !== passo.percorso) return;
    let fermo = false;
    let el: Element | null = null;
    const misura = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRett({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const inizio = performance.now();
    const cerca = () => {
      if (fermo) return;
      // Il primo visibile: su PC alcuni comandi del telefono sono nascosti
      el = [...document.querySelectorAll(`[data-giro="${passo.bersaglio}"]`)].find((x) => x.getBoundingClientRect().width > 0) ?? null;
      if (!el) {
        if (performance.now() - inizio < 5000) requestAnimationFrame(cerca);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(misura, 350);
      setTimeout(misura, 700);
    };
    cerca();
    window.addEventListener("resize", misura);
    window.addEventListener("scroll", misura, true);
    return () => {
      fermo = true;
      window.removeEventListener("resize", misura);
      window.removeEventListener("scroll", misura, true);
    };
  }, [passo, pathname]);

  useEffect(() => {
    if (fase === null) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && chiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fase, chiudi]);

  function avanti() {
    if (typeof fase !== "number") return;
    setRett(null);
    if (fase + 1 < passi.length) setFase(fase + 1);
    else chiudi();
  }

  return (
    <AnimatePresence>
      {fase === "intro" ? (
        <Intro key="intro" onInizia={() => setFase(0)} onSalta={chiudi} />
      ) : passo ? (
        <motion.div key="giro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" aria-live="polite">
          {/* Velo che blocca i tocchi, con il buco sul comando illuminato */}
          <div className="absolute inset-0" />
          {rett ? (
            <motion.div
              className="pointer-events-none absolute rounded-[22px] ring-[3px] ring-becco"
              initial={false}
              animate={{ top: rett.top - 8, left: rett.left - 8, width: rett.width + 16, height: rett.height + 16 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              style={{ boxShadow: "0 0 0 9999px rgba(12, 16, 34, 0.62)" }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(12,16,34,0.62)]" />
          )}
          <Fumetto
            rett={rett}
            passo={passo}
            numero={(fase as number) + 1}
            totale={passi.length}
            ultimo={(fase as number) + 1 === passi.length}
            onAvanti={avanti}
            onSalta={chiudi}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------- La presentazione del nome ---------- */

function Intro({ onInizia, onSalta }: { onInizia: () => void; onSalta: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-y-auto bg-dorso px-8 py-12 text-center text-su-dorso"
      role="dialog"
      aria-modal="true"
      aria-label="Benvenuti in Uchi"
    >
      <button onClick={onSalta} className="anello-focus absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] rounded-full px-3 py-1.5 text-[0.875rem] text-su-dorso-tenue hover:text-su-dorso">
        Salta
      </button>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="text-[1.25rem] tracking-[0.5em] text-su-dorso-tenue"
        lang="ja"
        style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif' }}
      >
        うち
      </motion.p>
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        className="mt-1 text-[7.5rem] leading-none md:text-[9rem]"
        lang="ja"
        style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif' }}
      >
        家
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="max-w-sm">
        <p className="titolo mt-6 text-[2.25rem] leading-none">uchi</p>
        <p className="mt-5 text-[1rem] leading-relaxed text-su-dorso-tenue">
          In giapponese <span className="text-su-dorso">uchi</span> è la casa. Ma vuol dire anche <span className="text-su-dorso">«noi»</span>: chi sta dentro, la
          propria cerchia.
        </p>
        <p className="mt-3 text-[1rem] leading-relaxed text-su-dorso">La nostra casa, noi due.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.5 }} className="mt-10 flex flex-col items-center gap-5">
        <Mascotte className="w-20" />
        <Pulsante onClick={onInizia}>Fammi vedere</Pulsante>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Il fumetto con la spiegazione ---------- */

function Fumetto({
  rett,
  passo,
  numero,
  totale,
  ultimo,
  onAvanti,
  onSalta,
}: {
  rett: Rettangolo | null;
  passo: Passo;
  numero: number;
  totale: number;
  ultimo: boolean;
  onAvanti: () => void;
  onSalta: () => void;
}) {
  // Sotto il comando se c'è spazio, altrimenti sopra; senza comando, in basso
  const altezzaSchermo = typeof window === "undefined" ? 800 : window.innerHeight;
  const sotto = rett ? altezzaSchermo - (rett.top + rett.height) > 260 : true;
  const stile: React.CSSProperties = rett
    ? sotto
      ? { top: rett.top + rett.height + 20 }
      : { bottom: altezzaSchermo - rett.top + 20 }
    : { bottom: 110 };

  return (
    <motion.div
      key={numero}
      initial={{ opacity: 0, y: sotto ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-x-4 mx-auto max-w-sm rounded-[24px] bg-superficie p-5 shadow-2xl"
      style={stile}
      role="dialog"
      aria-label={passo.titolo}
    >
      <p className="numeri text-[0.75rem] text-tenue">
        {numero} di {totale}
      </p>
      <p className="titolo mt-1 text-[1.25rem]">{passo.titolo}</p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-inchiostro-2">{passo.testo}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: totale }, (_, i) => (
            <span key={i} className={i + 1 === numero ? "h-1.5 w-4 rounded-full bg-becco" : "size-1.5 rounded-full bg-linea-forte"} />
          ))}
        </div>
        <div className="flex gap-1">
          {!ultimo ? (
            <Pulsante variante="fantasma" onClick={onSalta} className="h-10 px-3 text-sm">
              Salta
            </Pulsante>
          ) : null}
          <Pulsante onClick={onAvanti} className="h-10 px-5 text-sm">
            {ultimo ? "Fine" : "Avanti"}
          </Pulsante>
        </div>
      </div>
    </motion.div>
  );
}
