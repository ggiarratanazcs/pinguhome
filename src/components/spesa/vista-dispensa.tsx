"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Minus, Plus, Refrigerator, ShoppingCart, Snowflake, Trash2, Warehouse } from "lucide-react";
import type { Dispensa, Lista } from "@/lib/database.types";
import { etichettaScadenza, giorniAScadenza, interpretaVoce, POSIZIONI, UNITA } from "@/lib/spesa";
import { Pulsante } from "@/components/ui";
import { Pinguino } from "@/components/pinguino";
import { cn, formattaQuantita } from "@/lib/utils";
import type { AzioniSpesa, DatiSpesa } from "./app-spesa";

const ICONE_POSIZIONE = { frigo: Refrigerator, freezer: Snowflake, dispensa: Warehouse } as const;

export function VistaDispensa({
  dati,
  lista,
  azioni,
  avvisa,
}: {
  dati: DatiSpesa;
  lista: Lista | undefined;
  azioni: AzioniSpesa;
  avvisa: (t: string) => void;
}) {
  const [filtro, setFiltro] = useState<"tutto" | "scadenza" | "scorta">("tutto");

  const righe = useMemo(() => {
    let r = dati.dispensa.slice();
    if (filtro === "scadenza") r = r.filter((x) => (giorniAScadenza(x.scadenza) ?? 99) <= 3);
    if (filtro === "scorta") r = r.filter((x) => x.scorta_minima !== null && Number(x.quantita) <= Number(x.scorta_minima));
    return r.sort((a, b) => (giorniAScadenza(a.scadenza) ?? 9999) - (giorniAScadenza(b.scadenza) ?? 9999) || a.nome.localeCompare(b.nome));
  }, [dati.dispensa, filtro]);

  const inScadenza = dati.dispensa.filter((x) => (giorniAScadenza(x.scadenza) ?? 99) <= 3).length;
  const sottoScorta = dati.dispensa.filter((x) => x.scorta_minima !== null && Number(x.quantita) <= Number(x.scorta_minima)).length;

  async function ricompra(r: Dispensa) {
    if (!lista) return;
    await azioni.aggiungi(r.nome, { quantita: 1, unita: r.unita });
    avvisa(`${r.nome} aggiunto a ${lista.nome}`);
  }

  return (
    <div className="mt-6">
      <NuovaInDispensa onSalva={azioni.salvaDispensa} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Filtro attivo={filtro === "tutto"} onClick={() => setFiltro("tutto")}>
          Tutto <span className="numeri text-tenue">{dati.dispensa.length}</span>
        </Filtro>
        <Filtro attivo={filtro === "scadenza"} onClick={() => setFiltro("scadenza")} tono="becco">
          <AlertTriangle className="size-3.5" /> In scadenza <span className="numeri">{inScadenza}</span>
        </Filtro>
        <Filtro attivo={filtro === "scorta"} onClick={() => setFiltro("scorta")} tono="pericolo">
          Sotto scorta <span className="numeri">{sottoScorta}</span>
        </Filtro>
      </div>

      {dati.dispensa.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Pinguino className="size-20" />
          <p className="titolo mt-4 text-xl">Dispensa vuota</p>
          <p className="mt-1 max-w-sm text-sm text-tenue">
            Chiudi una spesa con “metti in dispensa” oppure aggiungi qui quello che hai già in casa, con la scadenza: ti avviso prima che vada sprecato.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {POSIZIONI.map((pos) => {
            const elenco = righe.filter((r) => r.posizione === pos.id);
            const Icona = ICONE_POSIZIONE[pos.id];
            return (
              <section key={pos.id} className="min-w-0">
                <h2 className="mb-2 flex items-center gap-2 px-1 text-[0.8125rem] font-semibold text-inchiostro-2">
                  <Icona className="size-4 text-accento" /> {pos.nome}
                  <span className="numeri font-normal text-tenue">{elenco.length}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {elenco.map((r) => (
                      <RigaDispensa key={r.id} riga={r} azioni={azioni} onRicompra={() => ricompra(r)} />
                    ))}
                  </AnimatePresence>
                  {elenco.length === 0 ? (
                    <li className="rounded-[16px] border border-dashed border-linea px-4 py-6 text-center text-sm text-tenue">Niente qui</li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Filtro({
  attivo,
  onClick,
  tono,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  tono?: "becco" | "pericolo";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "anello-focus flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium transition",
        attivo
          ? tono === "becco"
            ? "border-transparent bg-becco-tenue text-[color-mix(in_oklab,var(--becco),black_35%)]"
            : tono === "pericolo"
              ? "border-transparent bg-pericolo-tenue text-pericolo"
              : "border-transparent bg-inchiostro text-sfondo"
          : "border-linea bg-superficie text-inchiostro-2 hover:border-linea-forte",
      )}
    >
      {children}
    </button>
  );
}

function RigaDispensa({ riga, azioni, onRicompra }: { riga: Dispensa; azioni: AzioniSpesa; onRicompra: () => void }) {
  const giorni = giorniAScadenza(riga.scadenza);
  const etichetta = etichettaScadenza(giorni);
  const q = Number(riga.quantita);
  const passo = ["kg", "l"].includes(riga.unita) ? 0.5 : ["g", "ml"].includes(riga.unita) ? 100 : 1;
  const sotto = riga.scorta_minima !== null && q <= Number(riga.scorta_minima);
  const [modifica, setModifica] = useState(false);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn("carta p-3.5", giorni !== null && giorni < 0 && "border-pericolo/40")}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => setModifica((m) => !m)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium">{riga.nome}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {etichetta ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                  giorni! < 0 ? "bg-pericolo-tenue text-pericolo" : giorni! <= 3 ? "bg-becco-tenue text-[color-mix(in_oklab,var(--becco),black_35%)]" : "bg-superficie-3 text-tenue",
                )}
              >
                {etichetta}
              </span>
            ) : (
              <span className="text-[0.6875rem] text-tenue">Senza scadenza</span>
            )}
            {sotto ? <span className="rounded-md bg-pericolo-tenue px-1.5 py-0.5 text-[0.6875rem] font-semibold text-pericolo">Sotto scorta</span> : null}
          </div>
        </button>
        <div className="flex h-8 items-center rounded-lg border border-linea">
          <button
            onClick={() => (q - passo <= 0 ? azioni.eliminaDispensa(riga) : azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: q - passo }))}
            className="grid size-8 place-items-center text-tenue hover:text-inchiostro"
            aria-label="Consuma"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="numeri min-w-10 text-center text-xs font-semibold">
            {formattaQuantita(q)} <span className="font-normal text-tenue">{riga.unita}</span>
          </span>
          <button
            onClick={() => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, quantita: q + passo })}
            className="grid size-8 place-items-center text-tenue hover:text-inchiostro"
            aria-label="Aggiungi"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {sotto ? (
        <button onClick={onRicompra} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-accento hover:underline">
          <ShoppingCart className="size-4" /> Rimetti in lista
        </button>
      ) : null}

      <AnimatePresence initial={false}>
        {modifica ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-linea pt-3 text-sm">
              <label className="flex flex-col gap-1 text-xs text-tenue">
                Scadenza
                <input
                  type="date"
                  defaultValue={riga.scadenza ?? ""}
                  onChange={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, scadenza: e.target.value || null })}
                  className="h-9 rounded-lg border border-linea bg-superficie-2 px-2 text-sm text-inchiostro"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-tenue">
                Scorta minima
                <input
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={riga.scorta_minima ?? ""}
                  onBlur={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, scorta_minima: e.target.value === "" ? null : Number(e.target.value) })}
                  className="h-9 rounded-lg border border-linea bg-superficie-2 px-2 text-sm text-inchiostro"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-tenue">
                Dove
                <select
                  value={riga.posizione}
                  onChange={(e) => azioni.salvaDispensa({ id: riga.id, nome: riga.nome, posizione: e.target.value })}
                  className="h-9 rounded-lg border border-linea bg-superficie-2 px-2 text-sm text-inchiostro"
                >
                  {POSIZIONI.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-end">
                <button onClick={() => azioni.eliminaDispensa(riga)} className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-pericolo hover:bg-pericolo-tenue">
                  <Trash2 className="size-4" /> Finito
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function NuovaInDispensa({ onSalva }: { onSalva: AzioniSpesa["salvaDispensa"] }) {
  const [aperta, setAperta] = useState(false);

  async function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = interpretaVoce(String(f.get("nome") ?? ""));
    if (!v.nome) return;
    await onSalva({
      nome: v.nome,
      quantita: v.quantita,
      unita: v.unita ?? String(f.get("unita") ?? "pz"),
      posizione: String(f.get("posizione") ?? "dispensa"),
      scadenza: String(f.get("scadenza") ?? "") || null,
    });
    e.currentTarget.reset();
  }

  if (!aperta) {
    return (
      <Pulsante variante="secondario" onClick={() => setAperta(true)} className="h-12 w-full justify-start rounded-[20px] px-4 text-tenue md:w-auto">
        <Plus className="size-4 text-accento" /> Aggiungi quello che hai in casa
      </Pulsante>
    );
  }

  return (
    <form onSubmit={invia} className="carta grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_110px_140px_160px_auto] md:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-tenue">
        Prodotto
        <input name="nome" required autoFocus placeholder="Es. 1 l latte" className="h-10 rounded-[10px] border border-linea bg-superficie-2 px-3 text-sm text-inchiostro outline-none focus:border-accento" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tenue">
        Unità
        <select name="unita" className="h-10 rounded-[10px] border border-linea bg-superficie-2 px-2 text-sm text-inchiostro">
          {UNITA.map((u) => <option key={u}>{u}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tenue">
        Dove
        <select name="posizione" defaultValue="dispensa" className="h-10 rounded-[10px] border border-linea bg-superficie-2 px-2 text-sm text-inchiostro">
          {POSIZIONI.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tenue">
        Scadenza
        <input name="scadenza" type="date" className="h-10 rounded-[10px] border border-linea bg-superficie-2 px-2 text-sm text-inchiostro" />
      </label>
      <div className="flex gap-2">
        <Pulsante type="submit" className="h-10 flex-1">Aggiungi</Pulsante>
        <Pulsante type="button" variante="fantasma" onClick={() => setAperta(false)} className="h-10 px-3">Chiudi</Pulsante>
      </div>
    </form>
  );
}
