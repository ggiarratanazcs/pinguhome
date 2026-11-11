"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import type { Profilo } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export type FotoCornice = { id: string; path: string; url: string };

const DURATA = 6000;
const VALIDITA_LINK = 60 * 60 * 12;

/**
 * Cornice della home. Due stili, scelti in Impostazioni → Foto:
 * - scorrimento: una foto alla volta, dissolvenza e zoom lento;
 * - polaroid: su una tinta unica arrivano polaroid appuntate finché è piena, poi si staccano e si ricomincia.
 * L'ordine delle foto lo decide il server, a caso, a ogni apertura.
 */
export function CorniceFoto({
  famigliaId,
  iniziali,
  stile,
  data,
  saluto,
}: {
  famigliaId: string;
  iniziali: FotoCornice[];
  stile: Profilo["cornice"];
  data: string;
  saluto: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [foto, setFoto] = useState<FotoCornice[]>(iniziali);
  const polaroid = stile === "polaroid";

  // Le foto caricate o tolte dall'altra persona arrivano subito
  useEffect(() => {
    const canale = supabase
      .channel(`foto-${famigliaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "foto", filter: `famiglia_id=eq.${famigliaId}` }, async (p) => {
        const r = p.new as { id: string; path: string };
        const { data: s } = await supabase.storage.from("foto").createSignedUrl(r.path, VALIDITA_LINK);
        if (s?.signedUrl) setFoto((x) => (x.some((f) => f.id === r.id) ? x : [...x, { id: r.id, path: r.path, url: s.signedUrl }]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "foto", filter: `famiglia_id=eq.${famigliaId}` }, (p) => {
        const id = (p.old as { id: string }).id;
        setFoto((x) => x.filter((f) => f.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [famigliaId, supabase]);

  const conFoto = foto.length > 0;
  const chiaro = conFoto || polaroid;

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-[28px] md:aspect-[16/9] md:rounded-[36px]",
        polaroid ? "bg-dorso" : "bg-lastra",
      )}
    >
      {conFoto ? polaroid ? <Polaroid foto={foto} /> : <Scorrimento foto={foto} /> : null}

      {/* Data e saluto sopra le foto */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-10",
          conFoto && !polaroid && "bg-linear-to-t from-black/55 via-black/25 to-transparent",
          chiaro ? "text-white" : "text-inchiostro",
        )}
      >
        <p className={cn("text-[0.8125rem] first-letter:uppercase", chiaro ? "text-white/85" : "text-tenue")}>{data}</p>
        <p className="titolo mt-0.5 text-[1.5rem] leading-tight md:text-[2rem]">{saluto}</p>
      </div>
    </div>
  );
}

/* ---------- Scorrimento ---------- */

function Scorrimento({ foto }: { foto: FotoCornice[] }) {
  const [indice, setIndice] = useState(0);
  const [giro, setGiro] = useState(0);
  const n = foto.length;
  const attuale = foto[indice % n];

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % n), DURATA);
    return () => clearInterval(t);
  }, [n, giro]);

  return (
    <motion.div
      className="absolute inset-0 touch-pan-y"
      onPanEnd={(_, info) => {
        if (n < 2 || Math.abs(info.offset.x) < 40) return;
        setIndice((i) => (i + (info.offset.x < 0 ? 1 : -1) + n) % n);
        setGiro((g) => g + 1);
      }}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={attuale.id}
          src={attuale.url}
          alt=""
          draggable={false}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.9 }, scale: { duration: DURATA / 1000 + 1, ease: "linear" } }}
          className="absolute inset-0 size-full select-none object-cover"
        />
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Polaroid ---------- */

const ARRIVO = 1100; // tra una polaroid e l'altra
const SOSTA = 4500; // quando è piena, prima di staccarle
const DISTACCO = 1400;
const PUNTINE = ["#e0625a", "#ff9f1c", "#5a8fe6", "#3fa36a", "#f2c94c"];

type Appuntata = { chiave: string; foto: FotoCornice; slot: number; rot: number; dx: number; dy: number; puntina: string };

function sottoscriviSchermo(cb: () => void) {
  const m = window.matchMedia("(min-width: 768px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

function caso(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function mescola<T>(elenco: T[]) {
  const c = elenco.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function Polaroid({ foto }: { foto: FotoCornice[] }) {
  const largo = useSyncExternalStore(sottoscriviSchermo, () => window.matchMedia("(min-width: 768px)").matches, () => false);
  const colonne = largo ? 6 : 4;
  const righe = 2;
  const posti = colonne * righe;
  const [appuntate, setAppuntate] = useState<Appuntata[]>([]);
  const [staccate, setStaccate] = useState(false);
  const elenco = useRef(foto);
  useEffect(() => {
    elenco.current = foto;
  }, [foto]);
  const n = foto.length;

  useEffect(() => {
    if (!n) return;
    const timer: ReturnType<typeof setTimeout>[] = [];
    let cursore = 0;
    let numeroGiro = 0;

    const giro = () => {
      numeroGiro++;
      const g = numeroGiro;
      // Mai la stessa foto due volte nello stesso giro
      const quante = Math.min(posti, elenco.current.length);
      const slot = mescola(Array.from({ length: posti }, (_, i) => i)).slice(0, quante);
      setStaccate(false);
      setAppuntate([]);
      slot.forEach((s, k) => {
        timer.push(
          setTimeout(() => {
            const f = elenco.current[cursore++ % elenco.current.length];
            if (!f) return;
            setAppuntate((x) => [
              ...x,
              {
                chiave: `${g}-${s}`,
                foto: f,
                slot: s,
                rot: caso(-11, 11),
                dx: caso(-0.08, 0.08),
                dy: caso(-0.08, 0.08),
                puntina: PUNTINE[Math.floor(Math.random() * PUNTINE.length)],
              },
            ]);
          }, 300 + k * ARRIVO),
        );
      });
      const piena = 300 + quante * ARRIVO + SOSTA;
      timer.push(setTimeout(() => setStaccate(true), piena));
      timer.push(setTimeout(giro, piena + DISTACCO));
    };

    giro();
    return () => timer.forEach(clearTimeout);
  }, [n, posti]);

  // Zona utile: sopra la fascia con data e saluto
  const altezzaUtile = 74;
  const larghezzaSlot = 100 / colonne;
  const altezzaSlot = altezzaUtile / righe;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <AnimatePresence>
        {appuntate.map((p, i) => {
          const col = p.slot % colonne;
          const riga = Math.floor(p.slot / colonne);
          return (
            <motion.div
              key={p.chiave}
              className="absolute"
              style={{
                width: `${larghezzaSlot * 0.74}%`,
                left: `${(col + 0.13 + p.dx) * larghezzaSlot}%`,
                top: `${riga * altezzaSlot + 4 + p.dy * altezzaSlot}%`,
              }}
              initial={{ opacity: 0, y: -26, scale: 1.25, rotate: p.rot }}
              animate={
                staccate
                  ? { opacity: 0, y: 140, rotate: p.rot + (p.rot > 0 ? 25 : -25), scale: 0.95, transition: { duration: 0.8, ease: [0.5, 0, 0.9, 0.4], delay: i * 0.05 } }
                  : { opacity: 1, y: 0, scale: 1, rotate: p.rot, transition: { type: "spring", stiffness: 260, damping: 16 } }
              }
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <div className="relative rounded-[2px] bg-white p-[6%] pb-[20%] shadow-[0_8px_16px_rgba(10,14,30,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.foto.url} alt="" draggable={false} className="block aspect-square w-full select-none object-cover" />
                {/* Puntina */}
                <span
                  className="absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-1/3 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.45)] md:size-3.5"
                  style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75) 0 18%, transparent 20%), ${p.puntina}` }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
