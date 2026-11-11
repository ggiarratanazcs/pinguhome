"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { preparaFile } from "@/lib/scontrini";
import type { Profilo } from "@/lib/database.types";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FotoSalvata = { id: string; path: string; url: string };
type Stile = Profilo["cornice"];

const STILI: { id: Stile; nome: string }[] = [
  { id: "scorrimento", nome: "Scorrimento" },
  { id: "polaroid", nome: "Polaroid" },
];

/** Impostazioni → Foto: stile della cornice in home, caricamento ed eliminazione delle foto. */
export function GestioneFoto({
  famigliaId,
  userId,
  stileIniziale,
  iniziali,
}: {
  famigliaId: string;
  userId: string;
  stileIniziale: Stile;
  iniziali: FotoSalvata[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stile, setStile] = useState<Stile>(stileIniziale);
  const [foto, setFoto] = useState<FotoSalvata[]>(iniziali);
  const [carico, setCarico] = useState(0);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function scegli(s: Stile) {
    setStile(s);
    await supabase.from("profili").update({ cornice: s }).eq("id", userId);
  }

  async function carica(e: ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!file.length) return;
    setCarico(file.length);
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
        if (riga) setFoto((x) => [{ id: riga.id, path, url: URL.createObjectURL(blob) }, ...x]);
      } finally {
        setCarico((c) => Math.max(0, c - 1));
      }
    }
  }

  async function elimina(f: FotoSalvata) {
    setDaEliminare(null);
    setFoto((x) => x.filter((y) => y.id !== f.id));
    await supabase.from("foto").delete().eq("id", f.id);
    await supabase.storage.from("foto").remove([f.path]);
  }

  return (
    <div>
      <div className="grid max-w-md grid-cols-2 gap-4">
        {STILI.map((s) => {
          const attivo = stile === s.id;
          return (
            <button key={s.id} onClick={() => scegli(s.id)} aria-pressed={attivo} className="anello-focus group text-left">
              <div
                className={cn(
                  "relative h-24 overflow-hidden rounded-[18px] bg-dorso ring-offset-2 ring-offset-superficie transition",
                  attivo ? "ring-[3px] ring-becco" : "ring-1 ring-linea group-hover:ring-linea-forte",
                )}
              >
                {s.id === "scorrimento" ? (
                  <div className="absolute inset-0 bg-[linear-gradient(160deg,#f6c89f,#7a8fc9_60%,#4c5f9c)]" />
                ) : (
                  <>
                    {[
                      { l: "10%", t: "14%", r: -8, c: "#f2b48a" },
                      { l: "40%", t: "8%", r: 6, c: "#8fc0e0" },
                      { l: "68%", t: "18%", r: -4, c: "#a6d6a8" },
                      { l: "26%", t: "52%", r: 9, c: "#e8a3bd" },
                    ].map((p, i) => (
                      <span key={i} className="absolute w-[22%] rounded-[2px] bg-white p-[3px] pb-[8px] shadow" style={{ left: p.l, top: p.t, rotate: `${p.r}deg` }}>
                        <span className="block aspect-square" style={{ background: p.c }} />
                      </span>
                    ))}
                  </>
                )}
              </div>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                {s.nome}
                {attivo ? <Check className="size-4 text-becco-scuro" strokeWidth={3} /> : null}
              </p>
            </button>
          );
        })}
      </div>

      <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={carica} />
      <Pulsante variante="secondario" className="mt-6" onClick={() => input.current?.click()} disabled={carico > 0}>
        {carico ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        Aggiungi foto
      </Pulsante>

      {foto.length ? (
        <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          <AnimatePresence initial={false}>
            {foto.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative aspect-square overflow-hidden rounded-[14px] bg-superficie-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
                {daEliminare === f.id ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <div className="flex flex-col items-stretch gap-1.5">
                      <button onClick={() => elimina(f)} className="anello-focus rounded-full bg-pericolo px-3 py-1 text-[0.75rem] font-semibold text-white">
                        Elimina
                      </button>
                      <button onClick={() => setDaEliminare(null)} className="anello-focus rounded-full bg-white/90 px-3 py-1 text-[0.75rem] text-dorso">
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDaEliminare(f.id)}
                    aria-label="Elimina la foto"
                    className="anello-focus absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
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
