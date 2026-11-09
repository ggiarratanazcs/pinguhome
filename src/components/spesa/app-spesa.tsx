"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Dispensa, Lista, Prodotto, Reparto, Spesa, VoceLista } from "@/lib/database.types";
import type { MembroCasa } from "@/lib/sessione";
import { indovinaReparto, interpretaVoce, posizioneDaReparto } from "@/lib/spesa";
import { caricaScontrino } from "@/lib/scontrini";
import { cn } from "@/lib/utils";
import { VistaLista } from "./vista-lista";
import { VistaDispensa } from "./vista-dispensa";
import { VistaAbituali } from "./vista-abituali";
import { VistaSpese } from "./vista-spese";
import { PinguinoSezione } from "@/components/mascotte";
import type { Posa } from "@/components/pinguini";

export type DatiSpesa = {
  liste: Lista[];
  reparti: Reparto[];
  voci: VoceLista[];
  prodotti: Prodotto[];
  dispensa: Dispensa[];
  spese: Spesa[];
};

type Vista = "lista" | "dispensa" | "abituali" | "spese";

/** Cosa fa il pinguino in ogni sezione. */
const POSE_SEZIONE: Record<Vista, Posa> = { lista: "carrello", dispensa: "scatola", abituali: "stella", spese: "scontrino" };

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
        eco: false,
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
    async (voce: VoceLista, modifiche: Partial<Pick<VoceLista, "quantita" | "unita" | "urgente" | "note" | "reparto_id" | "nome">>) => {
      setDati((d) => ({ ...d, voci: aggiornaPerId(d.voci, { ...voce, ...modifiche }) }));
      await supabase.from("voci_lista").update(modifiche).eq("id", voce.id);
      // Il reparto resta sul prodotto, così vale anche la prossima volta
      if (voce.prodotto_id && "reparto_id" in modifiche) {
        const perProdotto: Partial<Prodotto> = { reparto_id: modifiche.reparto_id ?? null };
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

  /** Svuota il carrello senza chiudere la spesa: le voci tornano "da prendere", niente viene eliminato. */
  const rimettiInLista = useCallback(async () => {
    const prese = dati.voci.filter((v) => v.lista_id === listaId && v.presa);
    if (prese.length === 0) return;
    const ids = prese.map((v) => v.id);
    setDati((d) => ({
      ...d,
      voci: d.voci.map((v) => (ids.includes(v.id) ? { ...v, presa: false, presa_da: null, presa_il: null } : v)),
    }));
    const { error } = await supabase.from("voci_lista").update({ presa: false, presa_da: null, presa_il: null }).in("id", ids);
    if (error) {
      setDati((d) => ({ ...d, voci: d.voci.map((v) => prese.find((p) => p.id === v.id) ?? v) }));
      avvisa("Non sono riuscito a svuotare il carrello: riprova.");
      return;
    }
    avvisa(`${prese.length} ${prese.length === 1 ? "prodotto rimesso" : "prodotti rimessi"} in lista`);
  }, [avvisa, dati.voci, listaId, setDati, supabase]);

  /** Toglie dalla lista ciò che è nel carrello; se richiesto lo mette in dispensa. */
  const chiudiSpesa = useCallback(
    async ({ importo, data, inDispensa, scontrino }: { importo: number; data: string; inDispensa: boolean; scontrino?: File | null }) => {
      const prese = dati.voci.filter((v) => v.lista_id === listaId && v.presa);
      if (prese.length === 0) return;
      const scontrino_path = scontrino ? await caricaScontrino(supabase, famigliaId, scontrino) : null;
      if (scontrino && !scontrino_path) avvisa("Lo scontrino non si è caricato: la spesa la salvo lo stesso.");
      // La spesa resta nel calendario con importo, giorno e cosa avete preso
      const spesa: Spesa = {
        id: crypto.randomUUID(),
        famiglia_id: famigliaId,
        lista_id: listaId,
        data,
        importo,
        prodotti: prese.map((v) => ({ nome: v.nome, quantita: Number(v.quantita), unita: v.unita })),
        num_prodotti: prese.length,
        pagata_da: userId,
        note: null,
        negozio: null,
        origine: "carrello",
        scontrino_path,
        creata_il: new Date().toISOString(),
      };
      setDati((d) => ({ ...d, spese: aggiornaPerId(d.spese, spesa) }));
      const { error } = await supabase.from("spese").insert(spesa);
      if (error) {
        setDati((d) => ({ ...d, spese: d.spese.filter((s) => s.id !== spesa.id) }));
        avvisa("Non sono riuscito a salvare la spesa: riprova.");
        return;
      }
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
      avvisa(`Carrello chiuso: ${importo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`);
    },
    [avvisa, dati.dispensa, dati.reparti, dati.voci, famigliaId, listaId, setDati, supabase, userId],
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
    async (p: Prodotto, modifiche: Partial<Pick<Prodotto, "abituale" | "reparto_id" | "unita">>) => {
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
        scadenza: null,
        scorta_minima: null,
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

  /** Spesa inserita dalla sezione Spese: a mano oppure letta da uno scontrino. */
  const creaSpesa = useCallback(
    async (nuova: {
      data: string;
      importo: number;
      lista_id: string | null;
      negozio: string | null;
      prodotti: Spesa["prodotti"];
      origine: "manuale" | "scontrino";
      scontrino?: File | null;
    }) => {
      const scontrino_path = nuova.scontrino ? await caricaScontrino(supabase, famigliaId, nuova.scontrino) : null;
      if (nuova.scontrino && !scontrino_path) avvisa("Lo scontrino non si è caricato: la spesa la salvo lo stesso.");
      const spesa: Spesa = {
        id: crypto.randomUUID(),
        famiglia_id: famigliaId,
        lista_id: nuova.lista_id,
        data: nuova.data,
        importo: nuova.importo,
        prodotti: nuova.prodotti,
        num_prodotti: nuova.prodotti.length,
        pagata_da: userId,
        note: null,
        negozio: nuova.negozio,
        origine: nuova.origine,
        scontrino_path,
        creata_il: new Date().toISOString(),
      };
      setDati((d) => ({ ...d, spese: aggiornaPerId(d.spese, spesa) }));
      const { error } = await supabase.from("spese").insert(spesa);
      if (error) {
        setDati((d) => ({ ...d, spese: d.spese.filter((s) => s.id !== spesa.id) }));
        avvisa("Non sono riuscito a salvare la spesa: riprova.");
        return false;
      }
      avvisa(`Spesa salvata: ${nuova.importo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`);
      return true;
    },
    [avvisa, famigliaId, setDati, supabase, userId],
  );

  /** Allega (o sostituisce) lo scontrino di una spesa già salvata. */
  const allegaScontrino = useCallback(
    async (s: Spesa, file: File) => {
      const percorso = await caricaScontrino(supabase, famigliaId, file);
      if (!percorso) {
        avvisa("Lo scontrino non si è caricato: riprova.");
        return;
      }
      if (s.scontrino_path) await supabase.storage.from("scontrini").remove([s.scontrino_path]);
      setDati((d) => ({ ...d, spese: aggiornaPerId(d.spese, { ...s, scontrino_path: percorso }) }));
      await supabase.from("spese").update({ scontrino_path: percorso }).eq("id", s.id);
      avvisa("Scontrino allegato");
    },
    [avvisa, famigliaId, setDati, supabase],
  );

  const modificaSpesa = useCallback(
    async (s: Spesa, modifiche: Partial<Pick<Spesa, "importo" | "data" | "note" | "negozio">>) => {
      setDati((d) => ({ ...d, spese: aggiornaPerId(d.spese, { ...s, ...modifiche }) }));
      await supabase.from("spese").update(modifiche).eq("id", s.id);
    },
    [setDati, supabase],
  );

  const eliminaSpesa = useCallback(
    async (s: Spesa) => {
      setDati((d) => ({ ...d, spese: d.spese.filter((x) => x.id !== s.id) }));
      await supabase.from("spese").delete().eq("id", s.id);
      if (s.scontrino_path) await supabase.storage.from("scontrini").remove([s.scontrino_path]);
    },
    [setDati, supabase],
  );

  return { aggiungi, segnaPresa, modificaVoce, elimina, chiudiSpesa, rimettiInLista, creaLista, modificaProdotto, salvaDispensa, eliminaDispensa, creaSpesa, allegaScontrino, modificaSpesa, eliminaSpesa };
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
      .on("postgres_changes", { event: "*", schema: "public", table: "spese", filter: filtro }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setDati((d) => ({ ...d, spese: d.spese.filter((x) => x.id !== id) }));
        } else setDati((d) => ({ ...d, spese: aggiornaPerId(d.spese, p.new as Spesa) }));
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
  const altri = membri.filter((m) => m.id !== userId && inLinea.includes(m.id));

  const schede: { id: Vista; nome: string }[] = [
    { id: "lista", nome: "Da comprare" },
    { id: "dispensa", nome: "In casa" },
    { id: "abituali", nome: "Abituali" },
    { id: "spese", nome: "Spese" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-4 md:px-12 md:pt-10">
      {/* Sezioni del modulo, come parole */}
      <nav className="senza-barra -mx-5 flex items-center gap-5 overflow-x-auto whitespace-nowrap px-5 text-[0.9375rem] md:mx-0 md:gap-6 md:px-0">
        {schede.map((s) => {
          const attiva = vista === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setVista(s.id)}
              className={cn("anello-focus relative pb-1.5 transition-colors", attiva ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro")}
            >
              {s.nome}
              {attiva ? <motion.span layoutId="sezione-spesa" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-becco" /> : null}
            </button>
          );
        })}
        {altri.length > 0 ? (
          <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-tenue">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-eco opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-eco" />
            </span>
            {altri.map((m) => m.nome.split(" ")[0]).join(", ")} sta guardando
          </span>
        ) : null}
      </nav>

      {/* Titolo: nome della lista come parola grande, le altre liste accanto più piccole */}
      {vista === "lista" ? (
        <header className="mt-5 md:mt-8">
          <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
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
          </div>
          <PinguinoSezione posa="carrello" className="-mb-1 w-14 md:w-20" />
          </div>
          {vociLista.length > 0 ? <Avanzamento fatte={prese} totale={vociLista.length} /> : null}
        </header>
      ) : (
        <header className="mt-5 flex items-end justify-between gap-4 md:mt-8">
          <div className="min-w-0">
          <h1 className="titolo titolo-pagina">{vista === "dispensa" ? "in casa" : vista === "abituali" ? "abituali" : "spese"}</h1>
          <p className="mt-2 max-w-xl text-[0.9375rem] text-tenue">
            {vista === "dispensa"
              ? "Quello che avete in frigo, nel freezer e in dispensa."
              : vista === "abituali"
                ? "I prodotti che comprate. Un tocco e tornano nella lista."
                : "Carrelli chiusi e spese aggiunte a mano o da uno scontrino, giorno per giorno."}
          </p>
          </div>
          <PinguinoSezione posa={POSE_SEZIONE[vista]} className="-mb-1 w-14 shrink-0 md:w-20" />
        </header>
      )}

      {/* Cambio di sezione immediato: nessuna attesa per l'uscita della vista precedente */}
      <motion.div key={vista} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }} className="pb-16">
          {vista === "lista" && lista ? (
            <VistaLista lista={lista} voci={vociLista} dati={dati} membri={membri} userId={userId} azioni={azioni} />
          ) : null}
          {vista === "dispensa" ? <VistaDispensa dati={dati} lista={lista} azioni={azioni} avvisa={avvisa} /> : null}
          {vista === "abituali" ? <VistaAbituali dati={dati} lista={lista} azioni={azioni} avvisa={avvisa} /> : null}
          {vista === "spese" ? <VistaSpese dati={dati} liste={liste} membri={membri} userId={userId} azioni={azioni} /> : null}
      </motion.div>

      {/* Avvisi brevi */}
      <AnimatePresence>
        {avviso ? (
          <motion.div
            key={avviso.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-dorso px-5 py-3 text-sm font-medium text-su-dorso shadow-xl lg:bottom-10"
          >
            {avviso.testo}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Barra di avanzamento sottile: quanto della lista è già nel carrello. */
function Avanzamento({ fatte, totale }: { fatte: number; totale: number }) {
  const quota = totale ? fatte / totale : 0;
  return (
    <div className="mt-4 flex items-center gap-4">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-superficie-3">
        <motion.div
          className={cn("h-full rounded-full", quota === 1 ? "bg-eco" : "bg-becco")}
          initial={false}
          animate={{ width: `${quota * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="numeri shrink-0 text-[0.8125rem] text-tenue">
        <span className="font-semibold text-inchiostro">{fatte}</span> di {totale} nel carrello
      </p>
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
  const attiva = liste.find((l) => l.id === corrente);
  const altre = liste.filter((l) => l.id !== corrente);
  return (
    <div>
      <h1 className="titolo titolo-pagina break-words">{attiva?.nome ?? "lista"}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        {altre.map((l) => {
          const daPrendere = voci.filter((v) => v.lista_id === l.id && !v.presa).length;
          return (
            <button key={l.id} onClick={() => onScegli(l.id)} className="anello-focus group flex items-center gap-2 text-tenue hover:text-inchiostro">
              <span className="size-2 rounded-full" style={{ background: l.colore }} />
              <span className="underline decoration-linea-forte decoration-1 underline-offset-4 group-hover:decoration-inchiostro">{l.nome}</span>
              {daPrendere > 0 ? <span className="numeri text-[0.8125rem]">{daPrendere}</span> : null}
            </button>
          );
        })}
        {nuova === null ? (
          <button onClick={() => setNuova("")} className="anello-focus flex items-center gap-1 text-tenue hover:text-inchiostro">
            <Plus className="size-4" /> nuova lista
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
              className="campo-linea h-8 w-40 text-[0.9375rem]"
            />
          </form>
        )}
      </div>
    </div>
  );
}
