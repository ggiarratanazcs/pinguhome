"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const CHIAVE = "uchi:pulizia-file";
/** Le foto dei prodotti non comprati da tanto si tolgono dopo questi giorni */
const GIORNI_PRODOTTI = 60;

/**
 * Pulizia dello spazio, una volta al giorno per dispositivo, in silenzio:
 * - scontrini più vecchi del mese scorso: via l'immagine, la spesa (importo, negozio, prodotti) resta;
 * - foto dei prodotti non comprati da 60 giorni e non in lista: via la foto, il prodotto resta.
 */
export function PuliziaFile({ famigliaId }: { famigliaId: string }) {
  useEffect(() => {
    const oggi = new Date().toLocaleDateString("sv-SE");
    try {
      if (localStorage.getItem(CHIAVE) === oggi) return;
      localStorage.setItem(CHIAVE, oggi);
    } catch {}

    const t = setTimeout(async () => {
      const supabase = createClient();
      const d = new Date();
      const inizioMeseScorso = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString("sv-SE");

      // Scontrini
      const { data: spese } = await supabase
        .from("spese")
        .select("id, scontrino_path")
        .eq("famiglia_id", famigliaId)
        .not("scontrino_path", "is", null)
        .lt("data", inizioMeseScorso)
        .limit(100);
      if (spese?.length) {
        const { error } = await supabase.storage.from("scontrini").remove(spese.map((s) => s.scontrino_path!));
        if (!error) await supabase.from("spese").update({ scontrino_path: null }).in("id", spese.map((s) => s.id));
      }

      // Foto dei prodotti
      const limite = Date.now() - GIORNI_PRODOTTI * 86_400_000;
      const [{ data: prodotti }, { data: inLista }] = await Promise.all([
        supabase.from("prodotti").select("id, foto_path, ultimo_acquisto, creato_il").eq("famiglia_id", famigliaId).not("foto_path", "is", null),
        supabase.from("voci_lista").select("prodotto_id").eq("famiglia_id", famigliaId).eq("presa", false).not("prodotto_id", "is", null),
      ]);
      const usati = new Set((inLista ?? []).map((v) => v.prodotto_id));
      const vecchi = (prodotti ?? []).filter((p) => !usati.has(p.id) && new Date(p.ultimo_acquisto ?? p.creato_il).getTime() < limite);
      if (vecchi.length) {
        const { error } = await supabase.storage.from("prodotti").remove(vecchi.map((p) => p.foto_path!));
        if (!error) await supabase.from("prodotti").update({ foto_path: null }).in("id", vecchi.map((p) => p.id));
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [famigliaId]);
  return null;
}
