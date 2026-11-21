"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Mic, Square, X } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { UNITA, type Posto } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";

type Modifica = {
  azione: "nuovo" | "cambia" | "finito";
  id: string | null;
  nome: string;
  quantita: number;
  unita: string;
  posizione: string;
  prima?: number;
};

type Fase = "chiuso" | "ascolto" | "scrivi" | "pensa" | "riepilogo";

// Il riconoscimento vocale del browser (Chrome, Safari): non è nei tipi di TypeScript
type Riconoscimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function creaRiconoscimento(): Riconoscimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Riconoscimento; webkitSpeechRecognition?: new () => Riconoscimento };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

const ETICHETTE = {
  nuovo: { testo: "nuovo", classe: "bg-eco-tenue text-eco" },
  cambia: { testo: "cambia", classe: "bg-becco-tenue text-becco-scuro" },
  finito: { testo: "finito", classe: "bg-pericolo-tenue text-pericolo" },
} as const;

function quanto(q: number, u: string) {
  return u === "pz" ? formattaQuantita(q) : `${formattaQuantita(q)} ${u}`;
}

/** In casa: si dice a voce cosa c'è, Claude prepara le modifiche, si correggono e si confermano. */
export function AssistenteCasa({
  dati,
  attivi,
  lista,
  azioni,
  avvisa,
}: {
  dati: DatiSpesa;
  attivi: Posto[];
  lista: Lista | undefined;
  azioni: AzioniSpesa;
  avvisa: (t: string) => void;
}) {
  const [fase, setFase] = useState<Fase>("chiuso");
  const [testo, setTesto] = useState("");
  const [provvisorio, setProvvisorio] = useState("");
  const [modifiche, setModifiche] = useState<Modifica[]>([]);
  const [comprare, setComprare] = useState<Set<string>>(new Set());
  const [aperta, setAperta] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const rico = useRef<Riconoscimento | null>(null);
  const finale = useRef("");

  function chiudi() {
    rico.current?.stop();
    rico.current = null;
    setFase("chiuso");
    setTesto("");
    setProvvisorio("");
    setModifiche([]);
    setErrore(null);
    setAperta(null);
  }

  useEffect(() => {
    if (fase === "chiuso") return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && chiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fase]);

  function inizia() {
    setErrore(null);
    finale.current = "";
    setTesto("");
    setProvvisorio("");
    const r = creaRiconoscimento();
    // Senza riconoscimento vocale nel browser: si usa il microfono della tastiera
    if (!r) return setFase("scrivi");
    r.lang = "it-IT";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let prov = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const ris = e.results[i];
        if (ris.isFinal) finale.current = `${finale.current} ${ris[0].transcript}`.trim();
        else prov += ris[0].transcript;
      }
      setTesto(finale.current);
      setProvvisorio(prov);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      rico.current = null;
      setFase("scrivi");
    };
    r.onend = () => {
      // Safari a volte si ferma da solo dopo una pausa: se stiamo ancora ascoltando, riparte
      if (rico.current === r) {
        try {
          r.start();
        } catch {
          rico.current = null;
        }
      }
    };
    rico.current = r;
    try {
      r.start();
      setFase("ascolto");
    } catch {
      rico.current = null;
      setFase("scrivi");
    }
  }

  async function capisci(nota: string) {
    const r = rico.current;
    rico.current = null;
    r?.stop();
    const pulita = nota.trim();
    if (!pulita) return chiudi();
    setFase("pensa");
    setErrore(null);
    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nota: pulita,
          posti: attivi.map((p) => ({ id: p.id, nome: p.nome })),
          righe: dati.dispensa.map((d) => ({ id: d.id, nome: d.nome, quantita: Number(d.quantita), unita: d.unita, posizione: d.posizione })),
        }),
      });
      const json = (await res.json()) as { modifiche?: Modifica[]; errore?: string };
      if (!res.ok || !json.modifiche) throw new Error(json.errore ?? "Non sono riuscito a capire la nota.");
      setModifiche(json.modifiche);
      setComprare(new Set(json.modifiche.filter((m) => m.azione === "finito").map((m) => m.nome)));
      setFase("riepilogo");
    } catch (e) {
      setTesto(pulita);
      setErrore(e instanceof Error ? e.message : "Non sono riuscito a capire la nota.");
      setFase("scrivi");
    }
  }

  async function conferma() {
    setSalvo(true);
    try {
      for (const m of modifiche) {
        const riga = m.id ? dati.dispensa.find((d) => d.id === m.id) : undefined;
        if (m.azione === "finito" || (riga && m.quantita <= 0)) {
          if (riga) await azioni.eliminaDispensa(riga as Dispensa);
        } else if (riga) {
          await azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: m.quantita, unita: m.unita, posizione: m.posizione });
        } else if (m.quantita > 0) {
          await azioni.salvaDispensa({ nome: m.nome, quantita: m.quantita, unita: m.unita, posizione: m.posizione });
        }
      }
      if (lista) {
        for (const m of modifiche) if (m.azione === "finito" && comprare.has(m.nome)) await azioni.aggiungi(m.nome, { quantita: 1, unita: m.unita });
      }
      avvisa("In casa aggiornato");
      chiudi();
    } finally {
      setSalvo(false);
    }
  }

  const cambia = (i: number, parziale: Partial<Modifica>) => setModifiche((x) => x.map((m, j) => (j === i ? { ...m, ...parziale } : m)));
  const finiti = modifiche.filter((m) => m.azione === "finito");

  return (
    <>
      <button
        onClick={inizia}
        className="anello-focus group flex w-full max-w-5xl items-center gap-4 rounded-[22px] bg-dorso p-3.5 pr-5 text-left text-su-dorso transition active:scale-[0.99]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_8px_20px_-10px_var(--becco)] transition group-hover:scale-105">
          <Mic className="size-6" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Dimmi cosa avete</span>
          <span className="block text-[0.8125rem] leading-snug text-su-dorso-tenue">Parla: «in frigo due latti, le uova sono finite…»</span>
        </span>
      </button>

      <AnimatePresence>
        {fase !== "chiuso" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-dorso/45 p-3 backdrop-blur-[3px] sm:items-center"
            onClick={fase === "riepilogo" || fase === "pensa" ? undefined : chiudi}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Dimmi cosa avete"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="pb-sicuro flex max-h-[88dvh] w-full max-w-md flex-col rounded-[30px] bg-superficie p-5 shadow-2xl"
            >
              {fase === "ascolto" ? (
                <div className="flex flex-col">
                  <p className="text-[1.0625rem] font-bold">Ti ascolto…</p>
                  <Onde />
                  <p className="min-h-[4.5rem] text-[1.0625rem] leading-relaxed text-inchiostro-2">
                    {testo || provvisorio ? (
                      <>
                        {testo} <span className="text-tenue">{provvisorio}</span>
                      </>
                    ) : (
                      <span className="text-tenue">«in frigo due latti, le uova sono finite…»</span>
                    )}
                  </p>
                  <button
                    onClick={() => capisci(`${finale.current} ${provvisorio}`)}
                    aria-label="Tocca per finire"
                    className="anello-focus mx-auto mt-5 grid size-[76px] place-items-center rounded-full bg-pericolo text-white shadow-[0_12px_28px_-12px_var(--pericolo)] transition active:scale-95"
                  >
                    <Square className="size-6 fill-current" />
                  </button>
                  <p className="mt-2 text-center text-[0.8125rem] text-tenue">Tocca per finire</p>
                </div>
              ) : null}

              {fase === "scrivi" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    capisci(testo);
                  }}
                  className="flex flex-col"
                >
                  <p className="text-[1.0625rem] font-bold">Dimmi cosa avete</p>
                  <textarea
                    autoFocus
                    value={testo}
                    onChange={(e) => setTesto(e.target.value)}
                    rows={5}
                    placeholder="«in frigo due latti, le uova sono finite…»"
                    className="mt-3 w-full resize-none rounded-[18px] bg-superficie-2 p-4 text-[1.0625rem] leading-relaxed outline-none ring-becco placeholder:text-tenue/70 focus:ring-2"
                  />
                  {errore ? <p className="mt-2 text-[0.8125rem] text-pericolo">{errore}</p> : null}
                  <div className="mt-4 flex justify-end gap-2">
                    <Pulsante type="button" variante="fantasma" onClick={chiudi}>
                      Annulla
                    </Pulsante>
                    <Pulsante type="submit" disabled={!testo.trim()}>
                      Conferma
                    </Pulsante>
                  </div>
                </form>
              ) : null}

              {fase === "pensa" ? (
                <div className="flex flex-col items-center py-10 text-tenue">
                  <Loader2 className="size-8 animate-spin text-becco" />
                </div>
              ) : null}

              {fase === "riepilogo" ? (
                <div className="flex min-h-0 flex-col">
                  <p className="text-[1.0625rem] font-bold">Ho capito questo</p>
                  <p className="mt-0.5 text-[0.8125rem] text-tenue">Tocca una riga per correggerla</p>

                  <div className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
                    {modifiche.length === 0 ? <p className="py-6 text-center text-tenue">Niente da cambiare.</p> : null}
                    {attivi
                      .filter((p) => modifiche.some((m) => m.posizione === p.id))
                      .map((p) => (
                        <section key={p.id}>
                          <p className="mb-1 mt-4 text-[0.75rem] font-bold uppercase tracking-wide text-tenue">{p.nome}</p>
                          <ul>
                            {modifiche.map((m, i) =>
                              m.posizione !== p.id ? null : (
                                <li key={i} className="border-t border-linea first:border-t-0">
                                  <button onClick={() => setAperta(aperta === i ? null : i)} className="anello-focus flex w-full items-center gap-2.5 py-2.5 text-left">
                                    <span className={cn("rounded-full px-2 py-0.5 text-[0.6875rem] font-bold", ETICHETTE[m.azione].classe)}>{ETICHETTE[m.azione].testo}</span>
                                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{m.nome}</span>
                                    <span className="numeri shrink-0 text-[0.8125rem] text-tenue">
                                      {m.prima !== undefined ? `${quanto(m.prima, m.unita)} → ${quanto(m.quantita, m.unita)}` : quanto(m.quantita, m.unita)}
                                    </span>
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {aperta === i ? (
                                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[16px] bg-superficie-2 p-2.5 text-[0.875rem]">
                                          <input
                                            value={m.nome}
                                            onChange={(e) => cambia(i, { nome: e.target.value })}
                                            disabled={m.azione !== "nuovo"}
                                            aria-label="Nome"
                                            className="campo-linea h-9 min-w-0 flex-1 basis-32 disabled:opacity-60"
                                          />
                                          <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            inputMode="decimal"
                                            value={m.quantita}
                                            onChange={(e) => {
                                              const q = Math.max(0, Number(e.target.value) || 0);
                                              cambia(i, { quantita: q, azione: m.azione === "nuovo" ? "nuovo" : q === 0 ? "finito" : "cambia" });
                                            }}
                                            aria-label="Quantità"
                                            className="campo-linea numeri h-9 w-16"
                                          />
                                          <select value={m.unita} onChange={(e) => cambia(i, { unita: e.target.value })} aria-label="Unità" className="campo-linea h-9">
                                            {UNITA.map((u) => (
                                              <option key={u}>{u}</option>
                                            ))}
                                          </select>
                                          {m.azione === "nuovo" ? (
                                            <select value={m.posizione} onChange={(e) => cambia(i, { posizione: e.target.value })} aria-label="Posto" className="campo-linea h-9">
                                              {attivi.map((x) => (
                                                <option key={x.id} value={x.id}>
                                                  {x.nome}
                                                </option>
                                              ))}
                                            </select>
                                          ) : null}
                                          <button
                                            onClick={() => (setModifiche((x) => x.filter((_, j) => j !== i)), setAperta(null))}
                                            aria-label="Togli"
                                            className="anello-focus ml-auto grid size-9 place-items-center rounded-full text-tenue hover:bg-superficie-3 hover:text-pericolo"
                                          >
                                            <X className="size-4" />
                                          </button>
                                        </div>
                                      </motion.div>
                                    ) : null}
                                  </AnimatePresence>
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                      ))}

                    {lista && finiti.length ? (
                      <section>
                        <p className="mb-1 mt-5 text-[0.75rem] font-bold uppercase tracking-wide text-tenue">Da comprare?</p>
                        <ul>
                          {finiti.map((m) => {
                            const on = comprare.has(m.nome);
                            return (
                              <li key={m.nome} className="border-t border-linea first:border-t-0">
                                <button
                                  role="checkbox"
                                  aria-checked={on}
                                  onClick={() =>
                                    setComprare((s) => {
                                      const n = new Set(s);
                                      if (on) n.delete(m.nome);
                                      else n.add(m.nome);
                                      return n;
                                    })
                                  }
                                  className="anello-focus flex w-full items-center gap-3 py-2.5 text-left"
                                >
                                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] border-2 transition", on ? "border-becco bg-becco text-su-becco" : "border-linea-forte")}>
                                    {on ? <Check className="size-3.5" strokeWidth={3.2} /> : null}
                                  </span>
                                  <span className="flex-1 text-[0.9375rem]">{m.nome}</span>
                                  <span className="truncate text-[0.8125rem] text-tenue">{lista.nome}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ) : null}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Pulsante variante="secondario" onClick={chiudi} disabled={salvo}>
                      Annulla
                    </Pulsante>
                    <Pulsante onClick={conferma} disabled={salvo || modifiche.length === 0} className="flex-1">
                      {salvo ? <Loader2 className="size-4 animate-spin" /> : null} Conferma
                    </Pulsante>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Le onde mentre si parla */
function Onde() {
  return (
    <div className="my-5 flex h-12 items-center justify-center gap-1" aria-hidden>
      {Array.from({ length: 13 }, (_, i) => (
        <motion.span
          key={i}
          className="w-[5px] rounded-full bg-becco"
          animate={{ height: [10, 18 + ((i * 7) % 26), 10] }}
          transition={{ duration: 0.9 + (i % 4) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
        />
      ))}
    </div>
  );
}
