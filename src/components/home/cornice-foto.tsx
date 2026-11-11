"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { preparaFile } from "@/lib/scontrini";
import { cn } from "@/lib/utils";

export type FotoCornice = { id: string; path: string; url: string };

const DURATA = 6000;
const VALIDITA_LINK = 60 * 60 * 12;

/**
 * Cornice della home: fa girare le foto della casa in ordine casuale (deciso dal server),
 * con dissolvenza e uno zoom lento. Si scorre anche col dito.
 */
export function CorniceFoto({
  famigliaId,
  userId,
  iniziali,
  data,
  saluto,
}: {
  famigliaId: string;
  userId: string;
  iniziali: FotoCornice[];
  data: string;
  saluto: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [foto, setFoto] = useState<FotoCornice[]>(iniziali);
  const [indice, setIndice] = useState(0);
  const [pausa, setPausa] = useState(0);
  const [carico, setCarico] = useState(0);
  const [conferma, setConferma] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const n = foto.length;
  const attuale = n ? foto[indice % n] : null;

  // Avanza da sola; si riparte da capo dopo uno scorrimento a mano
  useEffect(() => {
    if (n < 2 || conferma) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % n), DURATA);
    return () => clearInterval(t);
  }, [n, pausa, conferma]);

  // Le foto caricate dall'altra persona arrivano subito
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

  function vai(passo: number) {
    if (n < 2) return;
    setIndice((i) => (i + passo + n) % n);
    setPausa((p) => p + 1);
  }

  async function carica(e: ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!file.length) return;
    setCarico(file.length);
    const nuove: FotoCornice[] = [];
    for (const f of file) {
      try {
        const { blob } = await preparaFile(f);
        const dim = await dimensioni(blob);
        const path = `${famigliaId}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("foto").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) continue;
        const { data: riga } = await supabase
          .from("foto")
          .insert({ famiglia_id: famigliaId, path, caricata_da: userId, larghezza: dim.w, altezza: dim.h })
          .select("id")
          .single();
        if (!riga) continue;
        nuove.push({ id: riga.id, path, url: URL.createObjectURL(blob) });
      } finally {
        setCarico((c) => Math.max(0, c - 1));
      }
    }
    if (nuove.length) {
      setFoto((x) => {
        const senza = x.filter((f) => !nuove.some((nf) => nf.id === f.id));
        setIndice(senza.length);
        return [...senza, ...nuove];
      });
      setPausa((p) => p + 1);
    }
  }

  async function elimina() {
    if (!attuale) return;
    setConferma(false);
    setFoto((x) => x.filter((f) => f.id !== attuale.id));
    setIndice((i) => (n > 1 ? i % (n - 1) : 0));
    await supabase.from("foto").delete().eq("id", attuale.id);
    await supabase.storage.from("foto").remove([attuale.path]);
  }

  return (
    <div className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-[28px] bg-lastra md:aspect-[16/9] md:rounded-[36px]">
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={carica} />

      {attuale ? (
        <motion.div
          className="absolute inset-0 touch-pan-y"
          onPanEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 40) vai(info.offset.x < 0 ? 1 : -1);
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
      ) : (
        <button onClick={() => input.current?.click()} className="anello-focus absolute inset-0 grid place-items-center text-tenue">
          <span className="flex flex-col items-center gap-2 pb-10 text-[0.875rem]">
            <ImagePlus className="size-9" strokeWidth={1.5} />
            Aggiungi foto
          </span>
        </button>
      )}

      {/* Data e saluto sopra la foto */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4 pt-10", attuale ? "bg-linear-to-t from-black/55 via-black/25 to-transparent text-white" : "text-inchiostro")}>
        <p className={cn("text-[0.8125rem] first-letter:uppercase", attuale ? "text-white/85" : "text-tenue")}>{data}</p>
        <p className="titolo mt-0.5 text-[1.5rem] leading-tight md:text-[2rem]">{saluto}</p>
      </div>

      {/* Comandi */}
      <div className="absolute left-3 top-3 flex gap-2">
        <button
          onClick={() => input.current?.click()}
          aria-label="Aggiungi foto"
          className="anello-focus grid size-9 place-items-center rounded-full bg-white/85 text-dorso shadow-sm backdrop-blur transition hover:bg-white"
        >
          {carico ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
        {attuale ? (
          conferma ? (
            <span className="flex items-center gap-1 rounded-full bg-white/90 py-1 pl-3 pr-1 text-[0.8125rem] text-dorso shadow-sm backdrop-blur">
              Elimino questa foto?
              <button onClick={() => setConferma(false)} className="anello-focus rounded-full px-2 py-1 hover:bg-black/5">No</button>
              <button onClick={elimina} className="anello-focus rounded-full bg-pericolo px-2.5 py-1 font-semibold text-white">Sì</button>
            </span>
          ) : (
            <button
              onClick={() => setConferma(true)}
              aria-label="Elimina questa foto"
              className="anello-focus grid size-9 place-items-center rounded-full bg-white/85 text-dorso shadow-sm backdrop-blur transition hover:bg-white"
            >
              <Trash2 className="size-4" />
            </button>
          )
        ) : null}
      </div>

      {n > 1 ? (
        <div className="absolute right-4 top-4 flex gap-1" aria-hidden="true">
          {n <= 12 ? (
            foto.map((f, i) => <span key={f.id} className={cn("h-1.5 rounded-full transition-all", i === indice % n ? "w-4 bg-white" : "w-1.5 bg-white/55")} />)
          ) : (
            <span className="numeri rounded-full bg-black/35 px-2 py-0.5 text-[0.75rem] text-white">
              {(indice % n) + 1}/{n}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

async function dimensioni(blob: Blob): Promise<{ w: number | null; h: number | null }> {
  try {
    const b = await createImageBitmap(blob);
    const r = { w: b.width, h: b.height };
    b.close();
    return r;
  } catch {
    return { w: null, h: null };
  }
}
