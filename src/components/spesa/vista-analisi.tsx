"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Lista, Spesa } from "@/lib/database.types";
import { indovinaReparto } from "@/lib/spesa";
import { cn } from "@/lib/utils";
import type { DatiSpesa } from "./app-spesa";

type Periodo = "mese" | "trimestre" | "anno";
type Vista = "lista" | "reparto" | "negozio";
type Fetta = { id: string; nome: string; valore: number; colore: string; euro?: number };

const PERIODI: { id: Periodo; nome: string }[] = [
  { id: "mese", nome: "Mese" },
  { id: "trimestre", nome: "3 mesi" },
  { id: "anno", nome: "Anno" },
];

const VISTE: { id: Vista; nome: string }[] = [
  { id: "lista", nome: "Lista" },
  { id: "reparto", nome: "Reparto" },
  { id: "negozio", nome: "Negozio" },
];

/** Un colore fisso per ogni reparto, nell'ordine dei reparti. */
const COLORI_REPARTO = ["#4caf6e", "#d9a35b", "#e0625a", "#f2c94c", "#b07a4a", "#5aa9e6", "#8e7cc3", "#2bb3a6", "#e88bb0", "#8a8f99", "#c3c7d1"];
const COLORI = ["var(--becco)", "var(--inchiostro)", "#5aa9e6", "#2bb3a6", "#e88bb0", "#8e7cc3", "#d9a35b"];
const GRIGIO = "#c3c7d1";
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function euro(n: number, decimali = false) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: decimali ? 2 : 0, maximumFractionDigits: decimali ? 2 : 0 });
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function maiuscola(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function chiaveNegozio(n: string | null) {
  return (n ?? "").toLowerCase().replace(/[.,;:'"]/g, " ").replace(/\s+/g, " ").trim();
}

function nomeNegozio(chiave: string) {
  return chiave.replace(/(^|\s)(\p{L})/gu, (_, sp: string, l: string) => sp + l.toUpperCase());
}

/** Intervallo del periodo scelto e di quello precedente, come date "aaaa-mm-gg". */
function intervalli(periodo: Periodo, oggi: Date) {
  const a = oggi.getFullYear();
  const m = oggi.getMonth();
  const mesi = periodo === "mese" ? 1 : periodo === "trimestre" ? 3 : 12;
  const inizio = new Date(a, m - mesi + 1, 1);
  const fine = new Date(a, m + 1, 0);
  const inizioPrima = new Date(a, m - 2 * mesi + 1, 1);
  const giorni = Math.round((oggi.getTime() - inizio.getTime()) / 86_400_000) + 1;
  // Confronto alla pari: stessi giorni trascorsi nel periodo precedente
  const finePrimaIntera = new Date(a, m - mesi + 1, 0);
  const finePrimaPari = new Date(inizioPrima);
  finePrimaPari.setDate(finePrimaPari.getDate() + giorni - 1);
  const finePrima = finePrimaPari < finePrimaIntera ? finePrimaPari : finePrimaIntera;
  return { inizio: iso(inizio), fine: iso(fine), inizioPrima: iso(inizioPrima), finePrima: iso(finePrima), giorni, mesi };
}

export function VistaAnalisi({ dati, liste }: { dati: DatiSpesa; liste: Lista[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("mese");
  const [vista, setVista] = useState<Vista>("lista");

  const oggi = useMemo(() => new Date(), []);
  const int = useMemo(() => intervalli(periodo, oggi), [periodo, oggi]);
  const spese = useMemo(() => dati.spese.filter((s) => s.data >= int.inizio && s.data <= int.fine), [dati.spese, int]);
  const prima = useMemo(() => dati.spese.filter((s) => s.data >= int.inizioPrima && s.data <= int.finePrima), [dati.spese, int]);

  const totale = spese.reduce((t, s) => t + Number(s.importo), 0);
  const totalePrima = prima.reduce((t, s) => t + Number(s.importo), 0);
  const variazione = totalePrima > 0 ? Math.round(((totale - totalePrima) / totalePrima) * 100) : null;
  const confronto =
    periodo === "mese"
      ? `su ${new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1).toLocaleDateString("it-IT", { month: "long" })}`
      : periodo === "trimestre"
        ? "sui 3 mesi prima"
        : "sull'anno prima";
  const media = spese.length ? totale / spese.length : 0;
  const settimanale = totale / Math.max(1, int.giorni / 7);
  const ogniGiorni = spese.length ? int.giorni / spese.length : 0;

  const giornoPreferito = useMemo(() => {
    const conta = Array(7).fill(0) as number[];
    for (const s of spese) conta[new Date(`${s.data}T12:00:00`).getDay()]++;
    const max = Math.max(...conta);
    return max > 0 ? { giorno: GIORNI[conta.indexOf(max)], volte: max } : null;
  }, [spese]);

  /* ---------- Torta ---------- */

  const repartoDi = useMemo(() => {
    const perNome = new Map(dati.prodotti.map((p) => [p.nome.toLowerCase(), p.reparto_id]));
    return (nome: string) => perNome.get(nome.toLowerCase()) ?? indovinaReparto(nome, dati.reparti);
  }, [dati.prodotti, dati.reparti]);

  const fette = useMemo<Fetta[]>(() => {
    const somma = (chiave: (s: Spesa) => string) => {
      const m = new Map<string, number>();
      for (const s of spese) m.set(chiave(s), (m.get(chiave(s)) ?? 0) + Number(s.importo));
      return m;
    };

    if (vista === "lista") {
      const m = somma((s) => s.lista_id ?? "");
      return [...m.entries()]
        .map(([id, valore]) => {
          const i = liste.findIndex((l) => l.id === id);
          return { id, nome: i >= 0 ? liste[i].nome : "Senza lista", valore, colore: i >= 0 ? COLORI[i % COLORI.length] : GRIGIO };
        })
        .sort((a, b) => b.valore - a.valore);
    }

    if (vista === "negozio") {
      // Lo stesso negozio scritto in modi diversi ("esselunga", "Esselunga ") conta una volta sola
      const m = somma((s) => chiaveNegozio(s.negozio));
      const ordinate = [...m.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : b[1] - a[1]));
      return ordinate.map(([id, valore], i) => ({ id, nome: id ? nomeNegozio(id) : "Non indicato", valore, colore: id ? COLORI[i % COLORI.length] : GRIGIO }));
    }

    // Reparto: quanti prodotti comprati per reparto, e gli euro quando lo scontrino ha i prezzi
    const conta = new Map<string, { n: number; euro: number }>();
    for (const s of spese) {
      for (const p of s.prodotti ?? []) {
        const id = repartoDi(p.nome) ?? "";
        const c = conta.get(id) ?? { n: 0, euro: 0 };
        c.n += 1;
        if (typeof p.prezzo === "number") c.euro += p.prezzo;
        conta.set(id, c);
      }
    }
    return [...conta.entries()]
      .map(([id, c]) => {
        const r = dati.reparti.find((x) => x.id === id);
        return {
          id,
          nome: r?.nome ?? "Altro",
          valore: c.n,
          euro: c.euro > 0 ? c.euro : undefined,
          colore: r ? COLORI_REPARTO[(r.ordine - 1) % COLORI_REPARTO.length] : GRIGIO,
        };
      })
      .sort((a, b) => b.valore - a.valore);
  }, [vista, spese, liste, dati.reparti, repartoDi]);

  /* ---------- Barre ---------- */

  const barre = useMemo(() => {
    if (periodo === "anno") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(oggi.getFullYear(), oggi.getMonth() - 11 + i, 1);
        const pref = iso(d).slice(0, 7);
        return { nome: MESI_BREVI[d.getMonth()], valore: spese.filter((s) => s.data.startsWith(pref)).reduce((t, s) => t + Number(s.importo), 0) };
      });
    }
    // Settimane da lunedì, dentro il periodo
    const inizio = new Date(`${int.inizio}T12:00:00`);
    const lunedi = new Date(inizio);
    lunedi.setDate(inizio.getDate() - ((inizio.getDay() + 6) % 7));
    const fine = new Date(`${int.fine}T12:00:00`);
    const out: { nome: string; valore: number }[] = [];
    for (let d = new Date(lunedi); d <= fine; d.setDate(d.getDate() + 7)) {
      const da = iso(d);
      const fineSett = new Date(d);
      fineSett.setDate(d.getDate() + 6);
      const a = iso(fineSett);
      out.push({
        nome: periodo === "mese" ? `sett. ${out.length + 1}` : `${d.getDate()}/${d.getMonth() + 1}`,
        valore: spese.filter((s) => s.data >= da && s.data <= a).reduce((t, s) => t + Number(s.importo), 0),
      });
    }
    return out;
  }, [periodo, spese, int, oggi]);

  /* ---------- I più comprati ---------- */

  const piuComprati = useMemo(() => {
    const m = new Map<string, { nome: string; volte: number }>();
    for (const s of spese)
      for (const p of s.prodotti ?? []) {
        const k = p.nome.trim().toLowerCase();
        if (!k) continue;
        const c = m.get(k) ?? { nome: maiuscola(p.nome.trim()), volte: 0 };
        c.volte++;
        m.set(k, c);
      }
    return [...m.values()].sort((a, b) => b.volte - a.volte).slice(0, 5);
  }, [spese]);

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {PERIODI.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={cn(
              "anello-focus h-9 rounded-full px-4 text-[0.875rem] transition",
              periodo === p.id ? "bg-dorso font-semibold text-su-dorso" : "text-inchiostro-2 ring-[1.5px] ring-linea-forte hover:ring-inchiostro",
            )}
          >
            {p.nome}
          </button>
        ))}
      </div>

      {spese.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-tenue">Nessuna spesa in questo periodo.</p>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <Indicatore
                nome="Speso"
                valore={euro(totale)}
                nota={variazione === null ? undefined : `${variazione > 0 ? "+" : ""}${variazione}% ${confronto}`}
                tono={variazione === null ? undefined : variazione > 0 ? "su" : "giu"}
              />
              <Indicatore nome="Spesa media" valore={euro(media)} nota={`${spese.length} ${spese.length === 1 ? "spesa" : "spese"}`} />
              <Indicatore
                nome="A settimana"
                valore={euro(settimanale)}
                nota={ogniGiorni ? `ogni ${ogniGiorni.toLocaleString("it-IT", { maximumFractionDigits: 1 })} giorni` : undefined}
              />
              <Indicatore
                testo
                nome="Giorno preferito"
                valore={giornoPreferito ? maiuscola(giornoPreferito.giorno) : "—"}
                nota={giornoPreferito ? `${giornoPreferito.volte} ${giornoPreferito.volte === 1 ? "spesa" : "spese"} su ${spese.length}` : undefined}
              />
            </div>

            <section className="mt-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="titolo text-[1.125rem]">dove va la spesa</h2>
                <div className="flex gap-1">
                  {VISTE.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVista(v.id)}
                      className={cn(
                        "anello-focus h-8 rounded-full px-3 text-[0.8125rem] transition",
                        vista === v.id ? "bg-becco-tenue font-semibold text-becco-scuro" : "text-tenue ring-1 ring-linea-forte hover:text-inchiostro",
                      )}
                    >
                      {v.nome}
                    </button>
                  ))}
                </div>
              </div>
              {fette.length === 0 ? (
                <p className="py-6 text-[0.9375rem] text-tenue">Nessun prodotto registrato nelle spese di questo periodo.</p>
              ) : (
                <Torta fette={fette} conteggio={vista === "reparto"} />
              )}
            </section>
          </div>

          <div className="min-w-0">
            <section>
              <h2 className="titolo text-[1.125rem]">{periodo === "anno" ? "mese per mese" : "settimana per settimana"}</h2>
              <Barre barre={barre} />
            </section>

            {piuComprati.length ? (
              <section className="mt-9">
                <h2 className="titolo text-[1.125rem]">i più comprati</h2>
                <ul className="mt-2">
                  {piuComprati.map((p) => (
                    <li key={p.nome} className="flex items-baseline justify-between border-b border-linea py-2.5 text-[0.9375rem]">
                      <span className="truncate">{p.nome}</span>
                      <span className="numeri shrink-0 text-[0.8125rem] text-tenue">{p.volte} {p.volte === 1 ? "volta" : "volte"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      )}
      <div className="pb-16" />
    </div>
  );
}

function Indicatore({ nome, valore, nota, tono, testo }: { nome: string; valore: string; nota?: string; tono?: "su" | "giu"; testo?: boolean }) {
  return (
    <div className="rounded-[20px] bg-superficie-2 p-4">
      <p className="text-[0.8125rem] text-tenue">{nome}</p>
      <p className={cn("titolo-normale numeri mt-1 truncate leading-tight", testo ? "text-[1.125rem] sm:text-[1.5rem]" : "text-[1.5rem]")}>{valore}</p>
      {nota ? <p className={cn("mt-1 truncate text-[0.75rem]", tono === "su" ? "text-pericolo" : tono === "giu" ? "text-eco" : "text-tenue")}>{nota}</p> : null}
    </div>
  );
}

function Torta({ fette, conteggio }: { fette: Fetta[]; conteggio: boolean }) {
  const totale = fette.reduce((t, f) => t + f.valore, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const spazio = fette.length > 1 ? 1.2 : 0;
  const partenze = fette.map((_, i) => fette.slice(0, i).reduce((t, f) => t + (f.valore / totale) * C, 0));
  return (
    <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          {fette.map((f, i) => {
            const lungo = (f.valore / totale) * C;
            const tratto = Math.max(0, lungo - spazio);
            return (
              <motion.circle
                key={f.id}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={f.colore}
                strokeWidth="13"
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${tratto} ${C - tratto}` }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                strokeDashoffset={-partenze[i]}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="titolo-normale numeri text-[1.25rem] leading-none">{conteggio ? totale : euro(totale)}</p>
            {conteggio ? <p className="mt-1 text-[0.75rem] text-tenue">prodotti</p> : null}
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1">
        {fette.map((f) => (
          <li key={f.id} className="flex items-center gap-3 border-b border-linea py-2 text-[0.9375rem]">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: f.colore }} />
            <span className="min-w-0 flex-1 truncate">{f.nome}</span>
            <span className="numeri shrink-0 font-semibold">{conteggio ? f.valore : euro(f.valore)}</span>
            {conteggio && f.euro ? <span className="numeri shrink-0 text-[0.8125rem] text-tenue">{euro(f.euro, true)}</span> : null}
            <span className="numeri w-10 shrink-0 text-right text-[0.8125rem] text-tenue">{Math.round((f.valore / totale) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Barre({ barre }: { barre: { nome: string; valore: number }[] }) {
  const max = Math.max(1, ...barre.map((b) => b.valore));
  const piuAlta = barre.reduce((m, b, i) => (b.valore > barre[m].valore ? i : m), 0);
  return (
    <div className="mt-4 flex h-44 items-end gap-1.5">
      {barre.map((b, i) => (
        <div key={`${b.nome}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className={cn("numeri text-[0.6875rem]", i === piuAlta && b.valore > 0 ? "font-semibold text-inchiostro" : "text-tenue", barre.length > 8 && "hidden sm:block")}>
            {b.valore > 0 ? euro(b.valore) : ""}
          </span>
          <motion.div
            className={cn("w-full max-w-7 rounded-t-[6px]", i === piuAlta && b.valore > 0 ? "bg-becco" : "bg-linea-forte")}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(b.valore > 0 ? 3 : 0, (b.valore / max) * 100)}%` }}
            transition={{ duration: 0.5, delay: i * 0.03 }}
          />
          <span className="w-full truncate text-center text-[0.6875rem] text-tenue">{b.nome}</span>
        </div>
      ))}
    </div>
  );
}
