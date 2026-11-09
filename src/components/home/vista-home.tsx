"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Reparto } from "@/lib/database.types";
import { indovinaReparto, interpretaVoce, POSIZIONI } from "@/lib/spesa";
import { Mascotte } from "@/components/mascotte";
import { cn } from "@/lib/utils";
import { CaroselloSezioni, porteHome } from "./carosello-sezioni";

export type DatiHome = {
  nome: string;
  saluto: string;
  data: string;
  famigliaId: string;
  liste: { id: string; nome: string; colore: string; daPrendere: number; presi: number; urgenti: number }[];
  /** Totali degli ultimi 6 mesi, dal più vecchio al corrente */
  mesi: { etichetta: string; totale: number }[];
  ultimaSpesa: { importo: number; quando: string; dove: string; chi: string } | null;
  inCasa: Record<string, number>;
  reparti: Reparto[];
  impegniSettimana: number;
};

function euro(n: number, decimali = true) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: decimali ? 2 : 0, maximumFractionDigits: decimali ? 2 : 0 });
}

/** Numero che sale fino al valore all'apertura della pagina (unico movimento della Home). */
function Contatore({ valore, formato }: { valore: number; formato?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const testo = useTransform(mv, (v) => (formato ? formato(v) : String(Math.round(v))));
  useEffect(() => {
    const c = animate(mv, valore, { duration: 0.9, ease: [0.22, 0.9, 0.24, 1] });
    return () => c.stop();
  }, [mv, valore]);
  return <motion.span className="numeri">{testo}</motion.span>;
}

export function VistaHome({ dati }: { dati: DatiHome }) {
  const router = useRouter();
  const daComprare = dati.liste.reduce((t, l) => t + l.daPrendere, 0);
  const meseCorrente = dati.mesi[dati.mesi.length - 1];
  const mesePrecedente = dati.mesi[dati.mesi.length - 2];
  const totaleInCasa = Object.values(dati.inCasa).reduce((t, n) => t + n, 0);
  const massimo = Math.max(1, ...dati.mesi.map((m) => m.totale));
  const listaPrincipale = dati.liste[0];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-1 md:px-12 lg:pt-10">
      {/* Testata: il dorso del pinguino entra nella pagina */}
      <section className="relative overflow-hidden rounded-[32px] bg-dorso px-5 pb-6 pt-6 text-su-dorso md:px-10 md:pb-9 md:pt-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-dorso-2 opacity-70" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.875rem] text-su-dorso-tenue first-letter:uppercase">{dati.data}</p>
            <h1 className="titolo titolo-pagina mt-1.5">
              {dati.saluto}, {dati.nome.toLowerCase()}
            </h1>
            <div className="hidden md:block">
              {listaPrincipale ? <AggiuntaVeloce famigliaId={dati.famigliaId} lista={listaPrincipale} reparti={dati.reparti} onAggiunto={() => router.refresh()} /> : null}
            </div>
          </div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
            className="relative -mt-3 hidden w-32 shrink-0 lg:block"
          >
            <span aria-hidden className="absolute inset-x-[-8%] bottom-[-6%] top-[44%] rounded-[50%] bg-lastra" />
            <Mascotte className="relative w-full" />
          </motion.div>
        </div>

        <div className="md:hidden">
          {listaPrincipale ? <AggiuntaVeloce famigliaId={dati.famigliaId} lista={listaPrincipale} reparti={dati.reparti} onAggiunto={() => router.refresh()} /> : null}
        </div>

        <dl className="relative mt-7 grid grid-cols-3 gap-3 md:mt-8 md:max-w-2xl">
          <div>
            <dd className="titolo-normale text-[1.75rem] leading-none md:text-[2.5rem]">
              <Contatore valore={daComprare} />
            </dd>
            <dt className="mt-2 text-[0.8125rem] text-su-dorso-tenue">da comprare</dt>
          </div>
          <div>
            <dd className="titolo-normale text-[1.75rem] leading-none text-becco md:text-[2.5rem]">
              <Contatore valore={meseCorrente?.totale ?? 0} formato={(n) => euro(n, false)} />
            </dd>
            <dt className="mt-2 text-[0.8125rem] text-su-dorso-tenue">spesi a {meseCorrente?.etichetta ?? "questo mese"}</dt>
          </div>
          <div>
            <dd className="titolo-normale text-[1.75rem] leading-none md:text-[2.5rem]">
              <Contatore valore={totaleInCasa} />
            </dd>
            <dt className="mt-2 text-[0.8125rem] text-su-dorso-tenue">prodotti in casa</dt>
          </div>
        </dl>
      </section>

      <CaroselloSezioni porte={porteHome({ daComprare, spesoMese: euro(meseCorrente?.totale ?? 0, false), inCasa: totaleInCasa, impegniSettimana: dati.impegniSettimana })} />

      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        {/* Liste con avanzamento: su telefono ci sono già le carte, qui resta solo il grafico */}
        <section className="hidden md:block">
          <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.125rem]">spesa</span>
            <Link href="/spesa" className="anello-focus flex items-center gap-1 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4">
              Apri le liste <ArrowUpRight className="size-4" />
            </Link>
          </h2>
          <ul>
            {dati.liste.map((l) => {
              const totale = l.daPrendere + l.presi;
              return (
                <li key={l.id}>
                  <Link href="/spesa" className="anello-focus group block border-b border-linea py-3.5">
                    <span className="flex items-center gap-3">
                      <span className="size-2.5 rounded-full" style={{ background: l.colore }} />
                      <span className="flex-1 text-[1.0625rem] group-hover:underline group-hover:underline-offset-4">{l.nome}</span>
                      {l.urgenti ? <span className="rounded-full bg-becco-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-becco-scuro">{l.urgenti} urgenti</span> : null}
                      <span className={cn("titolo-normale numeri text-[1.375rem] leading-none", l.daPrendere ? "text-inchiostro" : "text-linea-forte")}>{l.daPrendere}</span>
                    </span>
                    {totale > 0 ? (
                      <span className="mt-2.5 ml-[22px] block h-1 overflow-hidden rounded-full bg-superficie-3">
                        <motion.span
                          className="block h-full rounded-full bg-becco"
                          initial={{ width: 0 }}
                          animate={{ width: `${(l.presi / totale) * 100}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 0.9, 0.24, 1] }}
                        />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* In casa: tre lastre di ghiaccio */}
          <div className="mt-8 grid grid-cols-3 gap-2.5">
            {POSIZIONI.map((p) => (
              <Link key={p.id} href="/spesa" className="anello-focus rounded-[20px] bg-lastra/55 px-4 py-3.5 transition hover:bg-lastra">
                <p className="titolo-normale numeri text-[1.5rem] leading-none">{dati.inCasa[p.id] ?? 0}</p>
                <p className="mt-1.5 text-[0.8125rem] text-inchiostro-2">{p.nome}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Spese: ultimi sei mesi */}
        <section>
          <h2 className="flex items-baseline justify-between border-b-2 border-inchiostro pb-2">
            <span className="titolo text-[1.125rem]">spese</span>
            {mesePrecedente && mesePrecedente.totale > 0 ? (
              <span className="text-[0.8125rem] text-tenue">
                {mesePrecedente.etichetta}: <span className="numeri font-semibold text-inchiostro">{euro(mesePrecedente.totale, false)}</span>
              </span>
            ) : null}
          </h2>
          <div className="mt-5 flex h-36 items-end gap-2.5 md:gap-3.5" role="img" aria-label="Spese degli ultimi sei mesi">
            {dati.mesi.map((m, i) => {
              const corrente = i === dati.mesi.length - 1;
              return (
                <div key={m.etichetta} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={cn("numeri text-[0.6875rem]", corrente ? "font-semibold text-inchiostro" : "text-tenue")}>
                    {m.totale > 0 ? Math.round(m.totale) : ""}
                  </span>
                  <motion.span
                    className={cn("w-full rounded-[8px]", corrente ? "bg-becco" : "bg-superficie-3")}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(3, (m.totale / massimo) * 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.22, 0.9, 0.24, 1] }}
                  />
                  <span className={cn("text-[0.75rem]", corrente ? "font-semibold" : "text-tenue")}>{m.etichetta.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          {dati.ultimaSpesa ? (
            <p className="mt-6 border-t border-linea pt-4 text-[0.9375rem] text-inchiostro-2">
              Ultima spesa: <span className="font-semibold text-inchiostro">{euro(dati.ultimaSpesa.importo)}</span> {dati.ultimaSpesa.quando}
              {dati.ultimaSpesa.dove ? `, ${dati.ultimaSpesa.dove}` : ""}
              {dati.ultimaSpesa.chi ? `, pagata da ${dati.ultimaSpesa.chi}` : ""}.
            </p>
          ) : (
            <p className="mt-6 border-t border-linea pt-4 text-[0.9375rem] text-tenue">Ancora nessuna spesa: chiudi un carrello per vederla qui.</p>
          )}
        </section>
      </div>
      <div className="pb-6" />
    </main>
  );
}

/** "Cosa manca?" direttamente dalla Home: aggiunge alla prima lista. */
function AggiuntaVeloce({
  famigliaId,
  lista,
  reparti,
  onAggiunto,
}: {
  famigliaId: string;
  lista: { id: string; nome: string };
  reparti: Reparto[];
  onAggiunto: () => void;
}) {
  const [testo, setTesto] = useState("");
  const [fatto, setFatto] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  async function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = interpretaVoce(testo);
    if (!v.nome) return;
    setTesto("");
    const reparto_id = indovinaReparto(v.nome, reparti);
    // Il prodotto entra anche negli abituali (se c'è già, lo si riusa)
    await supabase.from("prodotti").upsert({ famiglia_id: famigliaId, nome: v.nome, reparto_id, unita: v.unita ?? "pz" }, { onConflict: "famiglia_id,nome", ignoreDuplicates: true });
    const { data: prodotto } = await supabase.from("prodotti").select("id, reparto_id").eq("famiglia_id", famigliaId).eq("nome", v.nome).maybeSingle();
    await supabase.from("voci_lista").insert({
      famiglia_id: famigliaId,
      lista_id: lista.id,
      prodotto_id: prodotto?.id ?? null,
      reparto_id: prodotto?.reparto_id ?? reparto_id,
      nome: v.nome,
      quantita: v.quantita,
      unita: v.unita ?? "pz",
    });
    setFatto(`${v.nome} aggiunto a ${lista.nome}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFatto(null), 2400);
    onAggiunto();
  }

  return (
    <form onSubmit={invia} className="relative mt-6 md:w-[520px] md:max-w-full">
      <div className="flex items-center gap-2 rounded-full bg-superficie py-1.5 pl-5 pr-1.5 text-inchiostro">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={`Cosa manca? Va in ${lista.nome}`}
          enterKeyHint="done"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-tenue"
        />
        <button type="submit" disabled={!testo.trim()} aria-label="Aggiungi" className="anello-focus grid size-10 shrink-0 place-items-center rounded-full bg-becco text-su-becco transition hover:bg-becco-hover disabled:opacity-40">
          <Plus className="size-5" strokeWidth={2.4} />
        </button>
      </div>
      {fatto ? <p className="absolute left-5 top-full mt-1.5 text-[0.8125rem] text-su-dorso-tenue">{fatto}</p> : null}
    </form>
  );
}
