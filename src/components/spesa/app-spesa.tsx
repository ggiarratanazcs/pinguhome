"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, ListChecks, Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Dispensa, Lista, Prodotto, Reparto, VoceLista } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { indovinaReparto, interpretaVoce, posizioneDaReparto } from "@/lib/spesa";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { VistaLista } from "./vista-lista";
import { VistaDispensa } from "./vista-dispensa";
import { VistaAbituali } from "./vista-abituali";

export type DatiSpesa = {
  liste: Lista[];
  reparti: Reparto[];
  voci: VoceLista[];
  prodotti: Prodotto[];
  dispensa: Dispensa[];
};

type Vista = "lista" | "dispensa" | "abituali";

export type AzioniSpesa = ReturnType<typeof useAzioni>;

function aggiornaPerId<T extends { id: string }>(elenco: T[], riga: T) {
  const i = elenco.findIndex((x) => x.id === riga.id);
  if (i === -1) return [...elenco, riga];
  const copia = elenco.slice();
  copia[i] = { ...copia[i], ...riga };
  return copia;
}

function useAzioni(params: {
  famigliaId: string;
  userId: string;
  dati: DatiSpesa;
  setDati: React.Dispatch<React.SetStateAction<DatiSpesa>>;
  listaId: string;
  avvisa: (t: string) => void;
}) {
  const { famigliaId, userId, dati, setDati, listaId, avvisa } = params;
  const supabase = useMemo(() => createClient(), []);

  const assicuraProdotto = useCallback(
    async (nome: string, unita: string | null): Promise<Prodotto | null> => {
      const esistente = dati.prodotti.find((p) => p.nome.toLowerCase() === nome.toLowerCase());
      if (esistente) return esistente;
      const reparto_id = indovinaReparto(nome, dati.reparti);
      const { data, error } = await supabase
        .from("prodotti")
        .insert({ famiglia_id: famigliaId, nome, reparto_id, unita: unita ?? "pz" })
        .select()
        .single();
      if (error || !data) return null;
      setDati((d) => ({ ...d, prodotti: aggiornaPerId(d.prodotti, data) }));
      return data;
    },
    [dati.prodotti, dati.reparti, famigliaId, setDati, supabase],
  );

  /** Aggiunge alla lista corrente; se il prodotto è già in lista (non preso) somma la quantità. */
  const aggiungi = useCallback(
    async (testo: string, opzioni?: { lista?: string; quantita?: number; unita?: string }) => {
      const v = interpretaVoce(testo);
      if (!v.nome) return;
      const lista = opzioni?.lista ?? listaId;
      const prodotto = await assicuraProdotto(v.nome, opzioni?.unita ?? v.unita);
      const quantita = opzioni?.quantita ?? v.quantita;
      const unita = opzioni?.unita ?? v.unita ?? prodotto?.unita ?? "pz";

      const gia = dati.voci.find(
        (x) => x.lista_id === lista && !x.presa && x.nome.toLowerCase() === v.nome.toLowerCase() && x.unita === unita,
      );
      if (gia) {
        const nuova = { ...gia, quantita: Number(gia.quantita) + quantita };
        setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, nuova) }));
        await supabase.from("voci_lista").update({ quantita: nuova.quantita }).eq("id", gia.id);
        avvisa(`${gia.nome}: quantità aggiornata`);
        return;
      }

      const temporanea: VoceLista = {
        id: crypto.randomUUID(),
        famiglia_id: famigliaId,
        lista_id: lista,
        prodotto_id: prodotto?.id ?? null,
        reparto_id: prodotto?.reparto_id ?? indovinaReparto(v.nome, dati.reparti),
        nome: prodotto?.nome ?? v.nome,
        quantita,
        unita,
        note: null,
        eco: prodotto?.eco ?? false,
        urgente: false,
        presa: false,
        presa_da: null,
        presa_il: null,
        aggiunta_da: userId,
        creata_il: new Date().toISOString(),
      };
      setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, temporanea) }));
      const { error } = await supabase.from("voci_lista").insert(temporanea);
      if (error) {
        setDati((d) => ({ ...d, voci: d.voci.filter((x) => x.id !== temporanea.id) }));
        avvisa("Non sono riuscito ad aggiungere la voce");
      }
    },
    [assicuraProdotto, avvisa, dati.reparti, dati.voci, famigliaId, listaId, setDati, supabase, userId],
  );

  const segnaPresa = useCallback(
    async (voce: VoceLista) => {
      const presa = !voce.presa;
      setDati((d) => ({
        ...d,
        voci: aggiornaPerId(d.voci, { ...voce, presa, presa_da: presa ? userId : null, presa_il: presa ? new Date().toISOString() : null }),
      }));
      if (navigator.vibrate) navigator.vibrate(8);
      const { error } = await supabase.rpc("segna_presa", { p_voce: voce.id, p_presa: presa });
      if (error) setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, voce) }));
    },
    [setDati, supabase, userId],
  );

  const modificaVoce = useCallback(
    async (voce: VoceLista, modifiche: Partial<Pick<VoceLista, "quantita" | "unita" | "eco" | "urgente" | "note" | "reparto_id" | "nome">>) => {
      setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, { ...voce, ...modifiche }) }));
      await supabase.from("voci_lista").update(modifiche).eq("id", voce.id);
      // Eco e reparto restano sul prodotto, così valgono anche la prossima volta
      if (voce.prodotto_id && ("eco" in modifiche || "reparto_id" in modifiche)) {
        const perProdotto: Partial<Prodotto> = {};
        if ("eco" in modifiche) perProdotto.eco = modifiche.eco;
        if ("reparto_id" in modifiche) perProdotto.reparto_id = modifiche.reparto_id ?? null;
        setDati((d) => ({ ...d, prodotti: d.prodotti.map((p) => (p.id === voce.prodotto_id ? { ...p, ...perProdotto } : p)) }));
        await supabase.from("prodotti").update(perProdotto).eq("id", voce.prodotto_id);
      }
    },
    [setDati, supabase],
  );

  const elimina = useCallback(
    async (voce: VoceLista) => {
      setDati((d) => ({ ...d, voci: d.voci.filter((x) => x.id !== voce.id) }));
      await supabase.from("voci_lista").delete().eq("id", voce.id);
    },
    [setDati, supabase],
  );

  /** Toglie dalla lista ciò che è nel carrello; se richiesto lo mette in dispensa. */
  const chiudiSpesa = useCallback(
    async (inDispensa: boolean) => {
      const prese = dati.voci.filter((v) => v.lista_id === listaId && v.presa);
      if (prese.length === 0) return;
      if (inDispensa) {
        const nuove: Dispensa[] = [];
        const mappaAggiornate = new Map<string, Dispensa>();
        for (const v of prese) {
          const stessa = (x: Dispensa) => x.nome.toLowerCase() === v.nome.toLowerCase() && x.unita === v.unita;
          const nuovaUguale = nuove.find(stessa);
          const esistente = dati.dispensa.find(stessa);
          if (nuovaUguale) {
            nuovaUguale.quantita = Number(nuovaUguale.quantita) + Number(v.quantita);
          } else if (esistente) {
            const base = mappaAggiornate.get(esistente.id) ?? esistente;
            mappaAggiornate.set(esistente.id, { ...base, quantita: Number(base.quantita) + Number(v.quantita) });
          } else {
            const reparto = dati.reparti.find((r) => r.id === v.reparto_id)?.nome;
            nuove.push({
              id: crypto.randomUUID(),
              famiglia_id: famigliaId,
              prodotto_id: v.prodotto_id,
              nome: v.nome,
              quantita: Number(v.quantita),
              unita: v.unita,
              posizione: posizioneDaReparto(reparto),
              scadenza: null,
              scorta_minima: null,
              aggiornata_il: new Date().toISOString(),
            });
          }
        }
        const aggiornate = [...mappaAggiornate.values()];
        setDati((d) => ({
          ...d,
          dispensa: [...aggiornate, ...nuove].reduce((acc, r) => aggiornaPerId(acc, { ...r }), d.dispensa),
        }));
        if (nuove.length) await supabase.from("dispensa").insert(nuove);
        for (const a of aggiornate) await supabase.from("dispensa").update({ quantita: a.quantita, aggiornata_il: new Date().toISOString() }).eq("id", a.id);
      }
      const ids = prese.map((v) => v.id);
      setDati((d) => ({ ...d, voci: d.voci.filter((x) => !ids.includes(x.id)) }));
      await supabase.from("voci_lista").delete().in("id", ids);
      avvisa(inDispensa ? `${prese.length} prodotti messi in dispensa` : "Carrello svuotato");
    },
    [avvisa, dati.dispensa, dati.reparti, dati.voci, famigliaId, listaId, setDati, supabase],
  );

  const creaLista = useCallback(
    async (nome: string) => {
      const colori = ["#0d5f6b", "#e08a2e", "#2f8f62", "#7a5cc2", "#c4493a", "#3a7bd5"];
      const { data } = await supabase
        .from("liste")
        .insert({ famiglia_id: famigliaId, nome, colore: colori[dati.liste.length % colori.length], ordine: dati.liste.length + 1 })
        .select()
        .single();
      if (data) setDati((d) => ({ ...d, liste: aggiornaPerId(d.liste, data) }));
      return data;
    },
    [dati.liste.length, famigliaId, setDati, supabase],
  );

  const modificaProdotto = useCallback(
    async (p: Prodotto, modifiche: Partial<Pick<Prodotto, "abituale" | "eco" | "reparto_id" | "unita">>) => {
      setDati((d) => ({ ...d, prodotti: aggiornaPerId(d.prodotti, { ...p, ...modifiche }) }));
      await supabase.from("prodotti").update(modifiche).eq("id", p.id);
    },
    [setDati, supabase],
  );

  const salvaDispensa = useCallback(
    async (riga: Partial<Dispensa> & { nome: string }) => {
      if (riga.id) {
        const { id, ...resto } = riga;
        const attuale = dati.dispensa.find((x) => x.id === id);
        if (!attuale) return;
        setDati((d) => ({ ...d, dispensa: aggiornaPerId(d.dispensa, { ...attuale, ...resto }) }));
        await supabase.from("dispensa").update({ ...resto, aggiornata_il: new Date().toISOString() }).eq("id", id);
        return;
      }
      const prodotto = await assicuraProdotto(riga.nome, riga.unita ?? null);
      const nuova: Dispensa = {
        id: crypto.randomUUID(),
        famiglia_id: famigliaId,
        prodotto_id: prodotto?.id ?? null,
        nome: prodotto?.nome ?? riga.nome,
        quantita: riga.quantita ?? 1,
        unita: riga.unita ?? prodotto?.unita ?? "pz",
        posizione: riga.posizione ?? "dispensa",
        scadenza: riga.scadenza ?? null,
        scorta_minima: riga.scorta_minima ?? null,
        aggiornata_il: new Date().toISOString(),
      };
      setDati((d) => ({ ...d, dispensa: aggiornaPerId(d.dispensa, nuova) }));
      await supabase.from("dispensa").insert(nuova);
    },
    [assicuraProdotto, dati.dispensa, famigliaId, setDati, supabase],
  );

  const eliminaDispensa = useCallback(
    async (riga: Dispensa) => {
      setDati((d) => ({ ...d, dispensa: d.dispensa.filter((x) => x.id !== riga.id) }));
      await supabase.from("dispensa").delete().eq("id", riga.id);
    },
    [setDati, supabase],
  );

  return { aggiungi, segnaPresa, modificaVoce, elimina, chiudiSpesa, creaLista, modificaProdotto, salvaDispensa, eliminaDispensa };
}

export function AppSpesa({
  iniziali,
  famigliaId,
  userId,
  membri,
}: {
  iniziali: DatiSpesa;
  famigliaId: string;
  userId: string;
  membri: MembroCasa[];
}) {
  const [dati, setDati] = useState<DatiSpesa>(iniziali);
  const [vista, setVista] = useState<Vista>("lista");
  const [listaId, setListaId] = useState<string>(iniziali.liste[0]?.id ?? "");
  const [inLinea, setInLinea] = useState<string[]>([]);
  const [avviso, setAvviso] = useState<{ id: number; testo: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avvisa = useCallback((testo: string) => {
    setAvviso({ id: Date.now(), testo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAvviso(null), 2600);
  }, []);

  const azioni = useAzioni({ famigliaId, userId, dati, setDati, listaId, avvisa });

  // Tempo reale: le modifiche dell'altra persona arrivano subito; presenza di chi è in linea
  useEffect(() => {
    const supabase = createClient();
    const filtro = `famiglia_id=eq.${famigliaId}`;
    const canale = supabase
      .channel(`casa-${famigliaId}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "voci_lista", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setDati((d) => ({ ...d, voci: d.voci.filter((x) => x.id !== id) }));
        } else setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, p.new as VoceLista) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dispensa", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setDati((d) => ({ ...d, dispensa: d.dispensa.filter((x) => x.id !== id) }));
        } else setDati((d) => ({ ...d, dispensa: aggiornaPerId(d.dispensa, p.new as Dispensa) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "liste", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setDati((d) => ({ ...d, liste: d.liste.filter((x) => x.id !== id) }));
        } else setDati((d) => ({ ...d, liste: aggiornaPerId(d.liste, p.new as Lista) }));
      })
      .on("presence", { event: "sync" }, () => setInLinea(Object.keys(canale.presenceState())))
      .subscribe((stato) => {
        if (stato === "SUBSCRIBED") canale.track({ da: Date.now() });
      });
    // Al ritorno sulla scheda ricarica ciò che può essere cambiato nel frattempo
    const alRitorno = async () => {
      if (document.visibilityState !== "visible") return;
      const [{ data: voci }, { data: dispensa }] = await Promise.all([
        supabase.from("voci_lista").select("*").eq("famiglia_id", famigliaId),
        supabase.from("dispensa").select("*").eq("famiglia_id", famigliaId),
      ]);
      setDati((d) => ({ ...d, voci: voci ?? d.voci, dispensa: dispensa ?? d.dispensa }));
    };
    document.addEventListener("visibilitychange", alRitorno);
    return () => {
      document.removeEventListener("visibilitychange", alRitorno);
      supabase.removeChannel(canale);
    };
  }, [famigliaId, userId]);

  const liste = useMemo(() => dati.liste.filter((l) => !l.archiviata).sort((a, b) => a.ordine - b.ordine), [dati.liste]);
  const lista = liste.find((l) => l.id === listaId) ?? liste[0];
  const vociLista = useMemo(() => dati.voci.filter((v) => v.lista_id === lista?.id), [dati.voci, lista?.id]);
  const prese = vociLista.filter((v) => v.presa).length;

  const schede: { id: Vista; nome: string; icona: typeof ListChecks }[] = [
    { id: "lista", nome: "Lista", icona: ListChecks },
    { id: "dispensa", nome: "Dispensa", icona: Archive },
    { id: "abituali", nome: "Abituali", icona: Star },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pt-6 md:px-10 md:pt-10">
      {/* Testata */}
      <header className="pt-sicuro flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="sovratitolo">Spesa</p>
          <h1 className="titolo mt-2 truncate text-[1.875rem] leading-none sm:text-[2.25rem] md:text-[3rem]">
            {vista === "lista" ? lista?.nome ?? "Lista" : vista === "dispensa" ? "Dispensa" : "Abituali"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {vista === "lista" && vociLista.length > 0 ? <Avanzamento fatte={prese} totale={vociLista.length} /> : null}
          <div className="hidden items-center -space-x-2 sm:flex">
            {membri.map((m) => (
              <span key={m.id} className="relative">
                <Avatar nome={m.nome} colore={m.colore} className="size-9" />
                {inLinea.includes(m.id) ? (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-eco ring-2 ring-sfondo" title="In linea" />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Schede */}
      <div className="mt-7 flex items-center gap-1 border-b border-linea">
        {schede.map((s) => {
          const attiva = vista === s.id;
          const Icona = s.icona;
          return (
            <button
              key={s.id}
              onClick={() => setVista(s.id)}
              className={cn(
                "anello-focus relative flex h-11 items-center gap-2 px-3 text-[0.9375rem] font-medium transition-colors",
                attiva ? "text-inchiostro" : "text-tenue hover:text-inchiostro-2",
              )}
            >
              <Icona className="size-4" strokeWidth={attiva ? 2.3 : 1.8} />
              {s.nome}
              {attiva ? (
                <motion.span layoutId="scheda-spesa" className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-accento" />
              ) : null}
            </button>
          );
        })}
      </div>

      {vista === "lista" ? (
        <SelettoreListe
          liste={liste}
          voci={dati.voci}
          corrente={lista?.id}
          onScegli={setListaId}
          onCrea={async (nome) => {
            const nuova = await azioni.creaLista(nome);
            if (nuova) setListaId(nuova.id);
          }}
        />
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={vista}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="pb-16"
        >
          {vista === "lista" && lista ? (
            <VistaLista lista={lista} voci={vociLista} dati={dati} membri={membri} userId={userId} azioni={azioni} />
          ) : null}
          {vista === "dispensa" ? <VistaDispensa dati={dati} lista={lista} azioni={azioni} avvisa={avvisa} /> : null}
          {vista === "abituali" ? <VistaAbituali dati={dati} lista={lista} azioni={azioni} avvisa={avvisa} /> : null}
        </motion.div>
      </AnimatePresence>

      {/* Avvisi brevi */}
      <AnimatePresence>
        {avviso ? (
          <motion.div
            key={avviso.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-0 bottom-28 z-50 mx-auto w-fit rounded-full bg-inchiostro px-5 py-2.5 text-sm font-medium text-sfondo shadow-xl lg:bottom-10"
          >
            {avviso.testo}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Avanzamento({ fatte, totale }: { fatte: number; totale: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const quota = totale ? fatte / totale : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="numeri text-[0.9375rem] font-semibold">
          {fatte}
          <span className="text-tenue">/{totale}</span>
        </p>
        <p className="text-xs text-tenue">nel carrello</p>
      </div>
      <svg viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--linea)" strokeWidth="4" />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={quota === 1 ? "var(--eco)" : "var(--accento)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - quota) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
    </div>
  );
}

function SelettoreListe({
  liste,
  voci,
  corrente,
  onScegli,
  onCrea,
}: {
  liste: Lista[];
  voci: VoceLista[];
  corrente: string | undefined;
  onScegli: (id: string) => void;
  onCrea: (nome: string) => void;
}) {
  const [nuova, setNuova] = useState<string | null>(null);
  return (
    <div className="senza-barra -mx-5 mt-4 flex items-center gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
      {liste.map((l) => {
        const daPrendere = voci.filter((v) => v.lista_id === l.id && !v.presa).length;
        const attiva = l.id === corrente;
        return (
          <button
            key={l.id}
            onClick={() => onScegli(l.id)}
            className={cn(
              "anello-focus flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-3 text-sm font-medium transition",
              attiva ? "bg-superficie text-inchiostro ring-1 ring-linea shadow-sm" : "text-tenue hover:bg-superficie-3",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: l.colore }} />
            {l.nome}
            {daPrendere > 0 ? <span className="numeri text-xs text-tenue">{daPrendere}</span> : null}
          </button>
        );
      })}
      {nuova === null ? (
        <button
          onClick={() => setNuova("")}
          className="anello-focus flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-sm text-tenue hover:bg-superficie-3 hover:text-inchiostro"
        >
          <Plus className="size-4" /> Nuova lista
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (nuova.trim()) onCrea(nuova.trim());
            setNuova(null);
          }}
        >
          <input
            autoFocus
            value={nuova}
            onChange={(e) => setNuova(e.target.value)}
            onBlur={() => setNuova(null)}
            placeholder="Es. Farmacia"
            className="h-9 w-40 rounded-[10px] border border-accento bg-superficie px-3 text-sm outline-none ring-4 ring-accento-tenue"
          />
        </form>
      )}
    </div>
  );
}
