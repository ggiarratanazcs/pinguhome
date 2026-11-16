"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, KeyRound, Loader2, Pause, Play, Send, Trash2, UserMinus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { peso, quando, type CasaAdmin } from "@/lib/admin";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

function Avatar({ nome, colore, className }: { nome: string; colore: string; className?: string }) {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-white ring-2 ring-superficie", className)} style={{ background: colore }}>
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

/** Elenco delle case e, accanto, la scheda di quella scelta con le azioni. */
export function PannelloCase({ case: elenco }: { case: CasaAdmin[] }) {
  const [scelta, setScelta] = useState<string | null>(elenco[0]?.id ?? null);
  const casa = elenco.find((c) => c.id === scelta) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="overflow-hidden rounded-[20px] bg-superficie p-2 ring-1 ring-linea">
        <div className="hidden grid-cols-[1.5fr_1fr_0.8fr_0.7fr_20px] gap-3 px-4 py-3 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue md:grid">
          <span>Casa</span>
          <span>Ultima attività</span>
          <span>Creata</span>
          <span>Spazio</span>
          <span />
        </div>
        {elenco.length === 0 ? <p className="px-4 py-6 text-tenue">Nessuna casa.</p> : null}
        {elenco.map((c) => (
          <button
            key={c.id}
            onClick={() => setScelta(c.id)}
            aria-pressed={scelta === c.id}
            className={cn(
              "anello-focus grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[14px] px-4 py-3.5 text-left transition md:grid-cols-[1.5fr_1fr_0.8fr_0.7fr_20px]",
              scelta === c.id ? "bg-superficie-2" : "hover:bg-superficie-2/60",
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex -space-x-2">
                {c.membri.slice(0, 3).map((m) => (
                  <Avatar key={m.id} nome={m.nome} colore={m.colore} />
                ))}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{c.nome}</span>
                  {c.sospesa_il ? <span className="rounded-full bg-pericolo-tenue px-2 py-0.5 text-[0.6875rem] font-semibold text-pericolo">sospesa</span> : null}
                </span>
                <span className="block truncate text-[0.75rem] text-tenue">
                  {c.membri.map((m) => m.nome).join(" e ") || "nessun membro"}
                  <span className="md:hidden"> · {quando(c.ultima)}</span>
                </span>
              </span>
            </span>
            <span className="hidden text-[0.875rem] md:block">{quando(c.ultima)}</span>
            <span className="hidden text-[0.875rem] text-tenue md:block">{quando(c.creata_il)}</span>
            <span className="numeri hidden text-[0.875rem] md:block">{peso(c.spazio)}</span>
            <ChevronRight className="size-4 text-tenue" />
          </button>
        ))}
      </section>

      {casa ? <SchedaCasa key={casa.id} casa={casa} onEliminata={() => setScelta(null)} /> : null}
    </div>
  );
}

function SchedaCasa({ casa, onEliminata }: { casa: CasaAdmin; onEliminata: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [codice, setCodice] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [conferma, setConferma] = useState<null | "elimina" | { togli: string }>(null);

  async function esegui(chiave: string, fn: () => Promise<string | null | void>) {
    setInCorso(chiave);
    setMessaggio(null);
    try {
      const m = await fn();
      if (m) setMessaggio(m);
      router.refresh();
    } catch (e) {
      setMessaggio(e instanceof Error ? e.message : "Qualcosa non ha funzionato");
    } finally {
      setInCorso(null);
    }
  }

  const nuovoCodice = () =>
    esegui("codice", async () => {
      const { data, error } = await supabase.rpc("admin_nuovo_codice", { p_casa: casa.id });
      if (error) throw new Error("Non sono riuscito a cambiare il codice");
      setCodice(data);
      return null;
    });

  const mostraCodice = () =>
    esegui("vedi", async () => {
      const { data } = await supabase.rpc("admin_codice", { p_casa: casa.id });
      setCodice(data ?? null);
      return null;
    });

  const notifica = () =>
    esegui("notifica", async () => {
      const r = await fetch("/api/admin/notifica", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ casa: casa.id }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.errore ?? "Invio non riuscito");
      return j.inviate === 1 ? "Notifica inviata a 1 dispositivo" : `Notifica inviata a ${j.inviate} dispositivi`;
    });

  const sospendi = () =>
    esegui("sospendi", async () => {
      const { error } = await supabase.rpc("admin_sospendi", { p_casa: casa.id, p_sospesa: !casa.sospesa_il });
      if (error) throw new Error("Non sono riuscito a cambiare lo stato");
      return null;
    });

  const togli = (utente: string) =>
    esegui(`togli-${utente}`, async () => {
      setConferma(null);
      const { error } = await supabase.rpc("admin_togli_membro", { p_casa: casa.id, p_utente: utente });
      if (error) throw new Error("Non sono riuscito a toglierlo");
      return null;
    });

  const elimina = () =>
    esegui("elimina", async () => {
      setConferma(null);
      // I file restano nello storage, ma senza casa nessuno può più leggerli (l'admin non ha accesso ai file)
      const { error } = await supabase.rpc("admin_elimina_casa", { p_casa: casa.id });
      if (error) throw new Error("Non sono riuscito a eliminare la casa");
      onEliminata();
      return null;
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-fit rounded-[20px] bg-superficie p-6 ring-1 ring-linea xl:sticky xl:top-8"
    >
      <p className="titolo text-[1.25rem]">{casa.nome.toLowerCase()}</p>
      <p className="text-[0.8125rem] text-tenue">
        Creata {quando(casa.creata_il)} ·{" "}
        {casa.sospesa_il ? <span className="font-semibold text-pericolo">sospesa</span> : <span className="font-semibold text-eco">attiva</span>}
      </p>

      <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Membri</p>
      {casa.membri.map((m) => (
        <div key={m.id} className="mt-2 flex items-center gap-3">
          <Avatar nome={m.nome} colore={m.colore} className="ring-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{m.nome}</span>
            <span className="block text-[0.75rem] text-tenue">
              {m.dispositivi === 0 ? "notifiche spente" : m.dispositivi === 1 ? "1 dispositivo con notifiche" : `${m.dispositivi} dispositivi con notifiche`}
            </span>
          </span>
          {typeof conferma === "object" && conferma?.togli === m.id ? (
            <span className="flex items-center gap-1">
              <Pulsante variante="pericolo" className="h-8 px-3 text-[0.8125rem]" onClick={() => togli(m.id)}>
                Togli
              </Pulsante>
              <button onClick={() => setConferma(null)} aria-label="Annulla" className="grid size-8 place-items-center rounded-full text-tenue hover:bg-superficie-2">
                <X className="size-4" />
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConferma({ togli: m.id })}
              aria-label={`Togli ${m.nome} dalla casa`}
              title="Togli dalla casa"
              className="anello-focus grid size-8 place-items-center rounded-full text-tenue transition hover:bg-pericolo-tenue hover:text-pericolo"
            >
              {inCorso === `togli-${m.id}` ? <Loader2 className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
            </button>
          )}
        </div>
      ))}

      <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Uso</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[0.75rem] text-tenue">
        {[
          [peso(casa.spazio), "spazio"],
          [String(casa.letture), "letture"],
          [String(casa.carte), "carte"],
        ].map(([v, e]) => (
          <span key={e} className="rounded-[12px] bg-superficie-2 py-2">
            <span className="numeri block text-[1rem] font-semibold text-inchiostro">{v}</span>
            {e}
          </span>
        ))}
      </div>

      <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Codice invito</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="numeri flex-1 text-[1.125rem] font-semibold tracking-[0.2em]">{codice ?? "••••••"}</span>
        {codice ? null : (
          <button onClick={mostraCodice} className="anello-focus text-[0.8125rem] text-tenue underline underline-offset-4 hover:text-inchiostro">
            Mostra
          </button>
        )}
      </div>

      <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-wider text-tenue">Azioni</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[0.8125rem] font-medium">
        <Azione onClick={nuovoCodice} carico={inCorso === "codice"} icona={KeyRound}>
          Nuovo codice
        </Azione>
        <Azione onClick={notifica} carico={inCorso === "notifica"} icona={Send}>
          Notifica di prova
        </Azione>
        <Azione onClick={sospendi} carico={inCorso === "sospendi"} icona={casa.sospesa_il ? Play : Pause}>
          {casa.sospesa_il ? "Riattiva" : "Sospendi"}
        </Azione>
        <Azione onClick={() => setConferma("elimina")} carico={inCorso === "elimina"} icona={Trash2} pericolo>
          Elimina casa
        </Azione>
      </div>

      <AnimatePresence>
        {conferma === "elimina" ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-[16px] bg-pericolo-tenue p-4 text-[0.875rem]">
              <p>
                Elimino <strong>{casa.nome}</strong> con tutti i suoi dati? Non si può annullare.
              </p>
              <div className="mt-3 flex gap-2">
                <Pulsante onClick={elimina} className="h-9 bg-pericolo px-4 text-sm text-white hover:bg-pericolo hover:brightness-95">
                  Sì, elimina
                </Pulsante>
                <Pulsante variante="fantasma" onClick={() => setConferma(null)} className="h-9 px-4 text-sm">
                  Annulla
                </Pulsante>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {messaggio ? <p className="mt-3 text-[0.8125rem] text-tenue">{messaggio}</p> : null}
    </motion.section>
  );
}

function Azione({
  onClick,
  carico,
  icona: Icona,
  pericolo = false,
  children,
}: {
  onClick: () => void;
  carico: boolean;
  icona: typeof KeyRound;
  pericolo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={carico}
      className={cn(
        "anello-focus flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 ring-1 transition disabled:opacity-60",
        pericolo ? "text-pericolo ring-pericolo/40 hover:bg-pericolo-tenue" : "ring-linea hover:bg-superficie-2",
      )}
    >
      {carico ? <Loader2 className="size-4 animate-spin" /> : <Icona className="size-4" />}
      {children}
    </button>
  );
}
