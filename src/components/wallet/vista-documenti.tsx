"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Car, ChevronRight, ExternalLink, FileText, House, Image as IconaImmagine, Loader2, Plus, Receipt, Search, Trash2, Upload, Users, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Documento } from "@/lib/database.types";
import { preparaFile } from "@/lib/scontrini";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";

const CATEGORIE: { id: Documento["categoria"]; nome: string; icona: LucideIcon }[] = [
  { id: "casa", nome: "Casa", icona: House },
  { id: "auto", nome: "Auto", icona: Car },
  { id: "garanzie", nome: "Garanzie", icona: Receipt },
  { id: "persone", nome: "Persone", icona: Users },
  { id: "altro", nome: "Altro", icona: FileText },
];

/** Entro quanti giorni una scadenza si fa notare */
const AVVISO_GIORNI = 60;

function giorniA(data: string) {
  const oggi = new Date();
  oggi.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${data}T12:00:00`).getTime() - oggi.getTime()) / 86_400_000);
}

function etichettaScadenza(data: string) {
  const g = giorniA(data);
  if (g < 0) return { testo: "scaduto", urgente: true };
  if (g === 0) return { testo: "scade oggi", urgente: true };
  if (g <= 31) return { testo: g === 1 ? "scade domani" : `scade tra ${g} giorni`, urgente: true };
  if (g <= AVVISO_GIORNI) return { testo: `scade tra ${Math.round(g / 30)} mesi`, urgente: false };
  return null;
}

function dataBreve(data: string) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

function peso(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`;
}

function aggiornaPerId<T extends { id: string }>(elenco: T[], riga: T) {
  const i = elenco.findIndex((x) => x.id === riga.id);
  if (i === -1) return [...elenco, riga];
  const copia = elenco.slice();
  copia[i] = { ...copia[i], ...riga };
  return copia;
}

/** I documenti di casa: contratti, polizze, libretti, garanzie. File privati della casa. */
export function VistaDocumenti({ famigliaId, iniziali, avvisa }: { famigliaId: string; iniziali: Documento[]; avvisa: (t: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [documenti, setDocumenti] = useState<Documento[]>(iniziali);
  const [cerca, setCerca] = useState("");
  const [filtro, setFiltro] = useState<Documento["categoria"] | "tutti">("tutti");
  const [maschera, setMaschera] = useState<{ documento: Documento | null } | null>(null);

  useEffect(() => {
    const canale = supabase
      .channel(`documenti-${famigliaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documenti", filter: `famiglia_id=eq.${famigliaId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setDocumenti((x) => x.filter((d) => d.id !== id));
        } else setDocumenti((x) => aggiornaPerId(x, p.new as Documento));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [famigliaId, supabase]);

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return documenti
      .filter((d) => (filtro === "tutti" || d.categoria === filtro) && (!q || d.nome.toLowerCase().includes(q) || (d.note ?? "").toLowerCase().includes(q)))
      .sort((a, b) => {
        // In alto quelli che stanno per scadere, poi in ordine di nome
        const sa = a.scadenza && giorniA(a.scadenza) <= AVVISO_GIORNI ? giorniA(a.scadenza) : Infinity;
        const sb = b.scadenza && giorniA(b.scadenza) <= AVVISO_GIORNI ? giorniA(b.scadenza) : Infinity;
        return sa - sb || a.nome.localeCompare(b.nome);
      });
  }, [documenti, cerca, filtro]);

  async function apri(d: Documento) {
    // La finestra si apre subito (Safari blocca quelle aperte dopo un'attesa), poi riceve il link
    const finestra = window.open("", "_blank");
    const { data } = await supabase.storage.from("documenti").createSignedUrl(d.file_path, 60 * 10);
    if (!data?.signedUrl) {
      finestra?.close();
      return avvisa("Non riesco ad aprire il documento");
    }
    if (finestra) finestra.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  /** Il promemoria in Agenda: una settimana prima della scadenza */
  async function promemoria(d: Documento, vuole: boolean): Promise<string | null> {
    if (!vuole || !d.scadenza) {
      if (d.impegno_id) await supabase.from("impegni").delete().eq("id", d.impegno_id);
      return null;
    }
    const riga = { titolo: `Scade: ${d.nome}`, data: d.scadenza, categoria: "scadenza" as const, promemoria: 10080, famiglia_id: famigliaId };
    if (d.impegno_id) {
      const { error } = await supabase.from("impegni").update(riga).eq("id", d.impegno_id);
      if (!error) return d.impegno_id;
    }
    const { data } = await supabase.from("impegni").insert(riga).select("id").single();
    return data?.id ?? null;
  }

  async function salva(d: Documento, file: File | null, vuolePromemoria: boolean) {
    let riga = d;
    if (file) {
      const { blob, tipo } = await preparaFile(file);
      const estensione = tipo === "application/pdf" ? "pdf" : "jpg";
      const percorso = `${famigliaId}/${d.id}-${Date.now()}.${estensione}`;
      const { error } = await supabase.storage.from("documenti").upload(percorso, blob, { contentType: tipo });
      if (error) return avvisa(/size|large/i.test(error.message) ? "Il file è troppo grande (massimo 20 MB)" : "Non sono riuscito a caricare il file");
      if (d.file_path) await supabase.storage.from("documenti").remove([d.file_path]);
      riga = { ...d, file_path: percorso, tipo_file: tipo, dimensione: blob.size };
    }
    riga = { ...riga, impegno_id: await promemoria(riga, vuolePromemoria) };
    setDocumenti((x) => aggiornaPerId(x, riga));
    const { error } = await supabase.from("documenti").upsert({
      id: riga.id,
      famiglia_id: famigliaId,
      nome: riga.nome,
      categoria: riga.categoria,
      scadenza: riga.scadenza,
      note: riga.note,
      file_path: riga.file_path,
      tipo_file: riga.tipo_file,
      dimensione: riga.dimensione,
      impegno_id: riga.impegno_id,
    });
    if (error) avvisa("Non sono riuscito a salvare il documento");
  }

  async function elimina(d: Documento) {
    setDocumenti((x) => x.filter((y) => y.id !== d.id));
    const { error } = await supabase.from("documenti").delete().eq("id", d.id);
    if (error) {
      setDocumenti((x) => [...x, d]);
      return avvisa("Non sono riuscito a eliminarlo");
    }
    await supabase.storage.from("documenti").remove([d.file_path]);
  }

  return (
    <div className="mt-6 max-w-3xl lg:mt-0 lg:max-w-none">
      <div className="flex items-center gap-2">
        <label className="flex h-11 flex-1 lg:max-w-md items-center gap-2 rounded-full bg-superficie-2 px-4 text-tenue focus-within:ring-2 focus-within:ring-becco">
          <Search className="size-4 shrink-0" />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca" className="h-full min-w-0 flex-1 bg-transparent text-[1rem] text-inchiostro outline-none placeholder:text-tenue" />
        </label>
        <button
          onClick={() => setMaschera({ documento: null })}
          aria-label="Nuovo documento"
          className="anello-focus ml-auto grid size-11 shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </button>
      </div>

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 text-[0.8125rem] [scrollbar-width:none] md:mx-0 md:px-0">
        {[{ id: "tutti" as const, nome: "Tutti" }, ...CATEGORIE].map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            aria-pressed={filtro === c.id}
            className={cn("anello-focus shrink-0 rounded-full px-3 py-1.5 transition", filtro === c.id ? "bg-dorso font-semibold text-su-dorso" : "bg-superficie-2 text-tenue hover:text-inchiostro")}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {documenti.length === 0 ? (
        <button
          onClick={() => setMaschera({ documento: null })}
          className="anello-focus mt-5 flex w-full items-center gap-4 rounded-[22px] border-2 border-dashed border-linea-forte p-5 text-left text-tenue transition hover:border-becco hover:text-inchiostro"
        >
          <FileText className="size-8 shrink-0" />
          <span>Contratto d&apos;affitto, polizze, libretti, garanzie: un PDF o una foto, sempre a portata di mano.</span>
        </button>
      ) : visibili.length === 0 ? (
        <p className="mt-6 text-tenue">Nessun documento trovato.</p>
      ) : null}

      <ul className="mt-3 lg:grid lg:grid-cols-2 lg:gap-x-10 2xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {visibili.map((d) => {
            const cat = CATEGORIE.find((c) => c.id === d.categoria) ?? CATEGORIE[4];
            const Icona = d.tipo_file.startsWith("image/") ? IconaImmagine : cat.icona;
            const avviso = d.scadenza ? etichettaScadenza(d.scadenza) : null;
            const sotto = [cat.nome, d.scadenza ? `scade il ${dataBreve(d.scadenza)}` : d.tipo_file === "application/pdf" ? "PDF" : "foto"].join(" · ");
            return (
              <motion.li key={d.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-linea last:border-0">
                <button onClick={() => setMaschera({ documento: d })} className="anello-focus flex w-full items-center gap-3 rounded-[12px] py-3 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-superficie-2 text-tenue">
                    <Icona className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{d.nome}</span>
                    <span className="block truncate text-[0.75rem] text-tenue">{sotto}</span>
                  </span>
                  {avviso ? (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold", avviso.urgente ? "bg-pericolo-tenue text-pericolo" : "bg-becco-tenue text-becco-scuro")}>{avviso.testo}</span>
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-tenue" />
                  )}
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <AnimatePresence>
        {maschera ? (
          <MascheraDocumento
            documento={maschera.documento}
            onAnnulla={() => setMaschera(null)}
            onApri={apri}
            onSalva={async (d, file, prom) => {
              await salva(d, file, prom);
              setMaschera(null);
            }}
            onElimina={async (d) => {
              setMaschera(null);
              await elimina(d);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MascheraDocumento({
  documento,
  onAnnulla,
  onApri,
  onSalva,
  onElimina,
}: {
  documento: Documento | null;
  onAnnulla: () => void;
  onApri: (d: Documento) => void;
  onSalva: (d: Documento, file: File | null, promemoria: boolean) => Promise<void>;
  onElimina: (d: Documento) => Promise<void>;
}) {
  const [nome, setNome] = useState(documento?.nome ?? "");
  const [categoria, setCategoria] = useState<Documento["categoria"]>(documento?.categoria ?? "casa");
  const [scadenza, setScadenza] = useState(documento?.scadenza ?? "");
  const [note, setNote] = useState(documento?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [promemoria, setPromemoria] = useState(Boolean(documento?.impegno_id));
  const [salvo, setSalvo] = useState(false);
  const [conferma, setConferma] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onAnnulla();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnulla]);

  function scegli(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFile(f);
    if (!nome.trim()) setNome(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 80));
  }

  const valido = nome.trim() && (file || documento);

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setSalvo(true);
    await onSalva(
      {
        id: documento?.id ?? crypto.randomUUID(),
        famiglia_id: documento?.famiglia_id ?? "",
        nome: nome.trim(),
        categoria,
        scadenza: scadenza || null,
        note: note.trim() || null,
        file_path: documento?.file_path ?? "",
        tipo_file: documento?.tipo_file ?? "",
        dimensione: documento?.dimensione ?? 0,
        impegno_id: documento?.impegno_id ?? null,
        caricato_da: documento?.caricato_da ?? null,
        creato_il: documento?.creato_il ?? new Date().toISOString(),
      },
      file,
      promemoria && Boolean(scadenza),
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-dorso/45 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={onAnnulla}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label={documento ? documento.nome : "Nuovo documento"}
        onSubmit={invia}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="pb-sicuro relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[28px] bg-superficie p-5 shadow-2xl"
      >
        <button type="button" onClick={onAnnulla} aria-label="Chiudi" className="anello-focus absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-superficie-2 text-tenue hover:text-inchiostro">
          <X className="size-4" />
        </button>
        <p className="titolo pr-12 text-[1.25rem]">{documento ? "documento" : "nuovo documento"}</p>

        {/* Il file: si apre, si sostituisce o si sceglie */}
        <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-superficie-2 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-superficie text-tenue">
            {(file?.type ?? documento?.tipo_file ?? "").startsWith("image/") ? <IconaImmagine className="size-5" /> : <FileText className="size-5" />}
          </span>
          <span className="min-w-0 flex-1 text-[0.875rem]">
            {file ? (
              <>
                <span className="block truncate">{file.name}</span>
                <span className="block text-[0.75rem] text-tenue">{peso(file.size)} · da caricare</span>
              </>
            ) : documento ? (
              <>
                <span className="block truncate">{documento.tipo_file === "application/pdf" ? "PDF" : "Foto"}</span>
                <span className="block text-[0.75rem] text-tenue">{peso(documento.dimensione)}</span>
              </>
            ) : (
              <span className="text-tenue">Un PDF o una foto, fino a 20 MB</span>
            )}
          </span>
          {documento && !file ? (
            <button type="button" onClick={() => onApri(documento)} className="anello-focus flex h-9 items-center gap-1.5 rounded-full bg-dorso px-3 text-[0.8125rem] font-semibold text-su-dorso">
              <ExternalLink className="size-4" /> Apri
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="anello-focus flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold ring-1 ring-linea hover:bg-superficie-3"
          >
            <Upload className="size-4" /> {documento || file ? "Cambia" : "Scegli"}
          </button>
          <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={scegli} />
        </div>

        <div className="mt-4 grid gap-4 text-[0.8125rem] text-tenue">
          <label className="flex flex-col gap-1">
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Contratto d'affitto" required maxLength={80} className="campo-linea h-11 text-[1.0625rem] text-inchiostro" />
          </label>

          <div className="flex flex-wrap gap-2">
            {CATEGORIE.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id)}
                aria-pressed={categoria === c.id}
                className={cn("anello-focus flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.875rem] transition", categoria === c.id ? "bg-dorso font-semibold text-su-dorso" : "bg-superficie-2 text-tenue hover:text-inchiostro")}
              >
                <c.icona className="size-4" />
                {c.nome}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            Scade il (facoltativo)
            <input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="campo-linea h-11 text-[1rem] text-inchiostro" />
          </label>

          {scadenza ? (
            <button type="button" role="switch" aria-checked={promemoria} onClick={() => setPromemoria((p) => !p)} className="anello-focus flex items-center gap-3 rounded-[16px] bg-superficie-2 p-3 text-left">
              <Bell className="size-5 shrink-0 text-tenue" />
              <span className="flex-1 text-[0.875rem] text-inchiostro">
                Promemoria in Agenda
                <br />
                <span className="text-tenue">una settimana prima della scadenza</span>
              </span>
              <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", promemoria ? "bg-becco" : "bg-superficie-3")}>
                <motion.span layout className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow", promemoria ? "right-0.5" : "left-0.5")} />
              </span>
            </button>
          ) : null}

          <label className="flex flex-col gap-1">
            Note (facoltative)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Es. numero di polizza, a chi chiamare" className="campo-linea h-11 text-[1rem] text-inchiostro" />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {documento ? (
            conferma ? (
              <span className="flex items-center gap-1">
                <Pulsante type="button" variante="pericolo" className="h-10 px-4" onClick={() => onElimina(documento)}>
                  Elimina
                </Pulsante>
                <Pulsante type="button" variante="fantasma" className="h-10 px-3" onClick={() => setConferma(false)}>
                  No
                </Pulsante>
              </span>
            ) : (
              <button type="button" onClick={() => setConferma(true)} aria-label="Elimina documento" className="anello-focus grid size-10 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
                <Trash2 className="size-[18px]" />
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Pulsante type="button" variante="fantasma" onClick={onAnnulla}>
              Annulla
            </Pulsante>
            <Pulsante type="submit" disabled={!valido || salvo}>
              {salvo ? <Loader2 className="size-4 animate-spin" /> : null}
              Salva
            </Pulsante>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}
