"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, ChevronLeft, ImageIcon, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Carta, Documento } from "@/lib/database.types";
import { VistaDocumenti } from "./vista-documenti";
import { BloccoDocumenti } from "./blocco-documenti";
import { CONTENITORE, TestataSezione } from "@/components/testata-sezione";
import type { MembroCasa } from "@/lib/sessione";
import { insegnaNegozio } from "@/lib/spesa";
import { preparaFile } from "@/lib/scontrini";
import { registraServiceWorker } from "@/lib/notifiche";
import { coloreInsegna, disegnaCodice, formatoDaNumero, leggiCodiceDaFoto, leggiTessera, numeroLeggibile, TAVOLOZZA, type Formato } from "@/lib/wallet";
import { Pulsante } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Tessera } from "./tessera";

function aggiornaPerId<T extends { id: string }>(elenco: T[], riga: T) {
  const i = elenco.findIndex((x) => x.id === riga.id);
  if (i === -1) return [...elenco, riga];
  const copia = elenco.slice();
  copia[i] = { ...copia[i], ...riga };
  return copia;
}

/* ---------- Pagina ---------- */

export function AppWallet({
  famigliaId,
  userId,
  membri,
  iniziali,
  documenti,
  vistaIniziale = "carte",
}: {
  famigliaId: string;
  userId: string;
  membri: MembroCasa[];
  iniziali: Carta[];
  documenti: Documento[];
  vistaIniziale?: "carte" | "documenti";
}) {
  const supabase = useMemo(() => createClient(), []);
  const [vista, setVista] = useState<"carte" | "documenti">(vistaIniziale);
  const [carte, setCarte] = useState<Carta[]>(iniziali);
  const [aperta, setAperta] = useState<string | null>(null);
  const [maschera, setMaschera] = useState<{ carta: Carta | null } | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avvisa = useCallback((t: string) => {
    setAvviso(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAvviso(null), 2600);
  }, []);

  const nomeDi = useCallback((id: string | null) => (id ? (membri.find((m) => m.id === id)?.nome.split(" ")[0] ?? null) : null), [membri]);

  // Il service worker tiene una copia di questa pagina: senza linea al supermercato le carte si aprono lo stesso
  useEffect(() => {
    registraServiceWorker();
  }, []);

  // Tempo reale: le carte aggiunte dall'altra persona arrivano subito
  useEffect(() => {
    const canale = supabase
      .channel(`carte-${famigliaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "carte", filter: `famiglia_id=eq.${famigliaId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setCarte((x) => x.filter((c) => c.id !== id));
        } else setCarte((x) => aggiornaPerId(x, p.new as Carta));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canale);
    };
  }, [famigliaId, supabase]);

  async function salva(c: Carta, foto: Blob | null) {
    let riga = c;
    if (foto) {
      const percorso = `${famigliaId}/${c.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("carte").upload(percorso, foto, { contentType: "image/jpeg" });
      if (!error) {
        if (c.foto_path) await supabase.storage.from("carte").remove([c.foto_path]);
        riga = { ...c, foto_path: percorso };
      }
    }
    const prima = carte.find((x) => x.id === riga.id);
    setCarte((x) => aggiornaPerId(x, riga));
    const { error } = await supabase.from("carte").upsert({
      id: riga.id,
      famiglia_id: famigliaId,
      negozio: riga.negozio,
      numero: riga.numero,
      formato: riga.formato,
      colore: riga.colore,
      titolare: riga.titolare,
      foto_path: riga.foto_path,
    });
    if (error) {
      setCarte((x) => (prima ? aggiornaPerId(x, prima) : x.filter((y) => y.id !== riga.id)));
      avvisa("Non sono riuscito a salvare la carta");
    }
  }

  async function elimina(c: Carta) {
    setAperta(null);
    setCarte((x) => x.filter((y) => y.id !== c.id));
    const { error } = await supabase.from("carte").delete().eq("id", c.id);
    if (error) {
      setCarte((x) => aggiornaPerId(x, c));
      avvisa("Non sono riuscito a eliminarla");
    } else if (c.foto_path) await supabase.storage.from("carte").remove([c.foto_path]);
  }

  const cartaAperta = carte.find((c) => c.id === aperta) ?? null;

  return (
    <div className={cn(CONTENITORE, "pb-16")}>
      <TestataSezione
        titolo="wallet"
        schede={[
          { id: "carte", nome: "Carte" },
          { id: "documenti", nome: "Documenti" },
        ]}
        attiva={vista}
        onScheda={setVista}
      >
        {vista === "carte" ? (
          <Pulsante onClick={() => setMaschera({ carta: null })} className="h-11 px-5">
            <Plus className="size-5" strokeWidth={2.4} /> Nuova carta
          </Pulsante>
        ) : null}
      </TestataSezione>

      <nav className="flex items-center gap-5 text-[0.9375rem] md:gap-6 lg:hidden">
        {(
          [
            ["carte", "Carte"],
            ["documenti", "Documenti"],
          ] as const
        ).map(([id, nome]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={cn("anello-focus relative pb-1.5 transition-colors", vista === id ? "font-semibold text-inchiostro" : "text-tenue hover:text-inchiostro")}
          >
            {nome}
            {vista === id ? <motion.span layoutId="sezione-wallet" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-becco" /> : null}
          </button>
        ))}
      </nav>

      {vista === "documenti" ? (
        <BloccoDocumenti>
          <VistaDocumenti famigliaId={famigliaId} iniziali={documenti} avvisa={avvisa} />
        </BloccoDocumenti>
      ) : (
        <div className="mt-6 lg:mt-0">
      <div className="flex items-center justify-between">
            <p className="text-[0.875rem] text-tenue">{carte.length === 1 ? "1 carta" : `${carte.length} carte`}</p>
            <button
              onClick={() => setMaschera({ carta: null })}
              aria-label="Nuova carta"
              className="anello-focus grid size-11 lg:hidden shrink-0 place-items-center rounded-full bg-becco text-su-becco shadow-[0_10px_24px_-12px_var(--becco)] transition hover:bg-becco-hover active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.4} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5">
            <AnimatePresence initial={false}>
              {carte.map((c) => (
                <motion.button
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  onClick={() => setAperta(c.id)}
                  className="anello-focus block rounded-[18px] transition-transform active:scale-[0.97]"
                  aria-label={`Carta ${c.negozio}`}
                >
                  <Tessera negozio={c.negozio} colore={c.colore} titolare={nomeDi(c.titolare)} />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AnimatePresence>
        {cartaAperta ? (
          <DettaglioCarta
            key={cartaAperta.id}
            carta={cartaAperta}
            titolare={nomeDi(cartaAperta.titolare)}
            onChiudi={() => setAperta(null)}
            onModifica={() => setMaschera({ carta: cartaAperta })}
            onFoto={(blob) => salva(cartaAperta, blob)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {maschera ? (
          <MascheraCarta
            carta={maschera.carta}
            famigliaId={famigliaId}
            userId={userId}
            membri={membri}
            onAnnulla={() => setMaschera(null)}
            onElimina={
              maschera.carta
                ? () => {
                    const c = maschera.carta!;
                    setMaschera(null);
                    elimina(c);
                  }
                : undefined
            }
            onSalva={async (c, foto) => {
              setMaschera(null);
              await salva(c, foto);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {avviso ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-x-0 bottom-24 z-[70] mx-auto w-fit max-w-[90vw] truncate rounded-full bg-dorso px-5 py-3 text-sm font-medium text-su-dorso shadow-xl lg:bottom-10"
          >
            {avviso}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Alla cassa ---------- */

function DettaglioCarta({
  carta,
  titolare,
  onChiudi,
  onModifica,
  onFoto,
}: {
  carta: Carta;
  titolare: string | null;
  onChiudi: () => void;
  onModifica: () => void;
  onFoto: (blob: Blob) => Promise<void>;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [carico, setCarico] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    disegnaCodice(carta.numero, carta.formato).then((s) => vivo && setSvg(s));
    return () => {
      vivo = false;
    };
  }, [carta.numero, carta.formato]);

  // Schermo sempre acceso mentre la carta è aperta
  useEffect(() => {
    let blocco: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((b) => (blocco = b))
      .catch(() => {});
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      blocco?.release().catch(() => {});
    };
  }, [onChiudi]);

  async function mostraFoto() {
    if (!carta.foto_path) return input.current?.click();
    const supabase = createClient();
    const { data } = await supabase.storage.from("carte").createSignedUrl(carta.foto_path, 60 * 10);
    if (data?.signedUrl) setFoto(data.signedUrl);
  }

  async function nuovaFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCarico(true);
    try {
      const { blob } = await preparaFile(file);
      await onFoto(blob);
    } finally {
      setCarico(false);
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Carta ${carta.negozio}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="pt-sicuro pb-sicuro fixed inset-0 z-[60] overflow-y-auto bg-superficie"
    >
      <div className="mx-auto w-full max-w-md px-5 pb-10">
        <div className="flex h-14 items-center">
          <button onClick={onChiudi} aria-label="Indietro" className="anello-focus -ml-1 grid size-10 place-items-center rounded-full bg-superficie-2 hover:bg-superficie-3">
            <ChevronLeft className="size-5" />
          </button>
        </div>

        <Tessera negozio={carta.negozio} colore={carta.colore} titolare={titolare} />

        <div className="mt-5 rounded-[24px] bg-white px-5 pb-4 pt-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.4)]">
          {svg ? (
            <div
              className={cn("mx-auto [&>svg]:h-auto [&>svg]:w-full", carta.formato === "qrcode" ? "w-3/5" : "w-full")}
              // SVG generato in locale dal numero della carta
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="grid h-32 place-items-center">
              <Loader2 className="size-6 animate-spin text-tenue" />
            </div>
          )}
          <p className="numeri mt-3 break-all text-center text-[1.25rem] font-semibold tracking-wide text-[#11152a]">{numeroLeggibile(carta.numero)}</p>
        </div>
        <p className="mt-3 text-center text-[0.8125rem] text-tenue">Se la cassa non lo legge, alza la luminosità</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-[0.875rem] font-medium">
          <button onClick={mostraFoto} disabled={carico} className="anello-focus flex h-12 items-center justify-center gap-2 rounded-full bg-superficie-2 transition hover:bg-superficie-3 disabled:opacity-60">
            {carico ? <Loader2 className="size-4 animate-spin" /> : carta.foto_path ? <ImageIcon className="size-4" /> : <Camera className="size-4" />} Foto della tessera
          </button>
          <button onClick={onModifica} className="anello-focus flex h-12 items-center justify-center gap-2 rounded-full bg-superficie-2 transition hover:bg-superficie-3">
            <Pencil className="size-4" /> Modifica
          </button>
        </div>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={nuovaFoto} />
      </div>

      <AnimatePresence>
        {foto ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-sicuro fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4"
            onClick={() => setFoto(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={`Tessera ${carta.negozio}`} className="max-h-[80dvh] max-w-full rounded-[16px] object-contain" />
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] flex gap-3">
              <button
                onClick={(e) => (e.stopPropagation(), setFoto(null), input.current?.click())}
                className="anello-focus flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-[0.875rem] font-medium text-white"
              >
                <Camera className="size-4" /> Cambia foto
              </button>
              <button onClick={() => setFoto(null)} aria-label="Chiudi" className="anello-focus grid size-11 place-items-center rounded-full bg-white/15 text-white">
                <X className="size-5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Nuova / modifica ---------- */

function MascheraCarta({
  carta,
  famigliaId,
  userId,
  membri,
  onAnnulla,
  onSalva,
  onElimina,
}: {
  carta: Carta | null;
  famigliaId: string;
  userId: string;
  membri: MembroCasa[];
  onAnnulla: () => void;
  onSalva: (c: Carta, foto: Blob | null) => Promise<void>;
  onElimina?: () => void;
}) {
  const [negozio, setNegozio] = useState(carta?.negozio ?? "");
  const [numero, setNumero] = useState(carta?.numero ?? "");
  const [qr, setQr] = useState(carta?.formato === "qrcode");
  const [colore, setColore] = useState(carta?.colore ?? TAVOLOZZA[0]);
  const [coloreToccato, setColoreToccato] = useState(Boolean(carta));
  const [titolare, setTitolare] = useState<string | null>(carta ? carta.titolare : userId);
  const [formatoLetto, setFormatoLetto] = useState<Formato | null>(carta?.formato ?? null);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [lettura, setLettura] = useState<"no" | "in-corso" | "fatta" | string>("no");
  const [conferma, setConferma] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onAnnulla();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onAnnulla]);

  function scriviNegozio(v: string) {
    setNegozio(v);
    if (!coloreToccato) {
      const c = coloreInsegna(v);
      if (c) setColore(c);
    }
  }

  async function fotografa(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLettura("in-corso");
    try {
      const { blob, dataUrl } = await preparaFile(file);
      setFoto(blob);
      if (!dataUrl) throw new Error("Serve una foto.");
      // Il codice si legge sul telefono; l'insegna (e il numero, se il codice non si legge) li legge Claude
      const [codice, letta] = await Promise.all([leggiCodiceDaFoto(dataUrl), leggiTessera(dataUrl).catch(() => null)]);
      if (letta?.negozio) scriviNegozio(letta.negozio);
      const n = codice?.numero ?? letta?.numero ?? null;
      const f = codice?.formato ?? letta?.formato ?? null;
      if (n) setNumero(n);
      if (f) {
        setQr(f === "qrcode");
        setFormatoLetto(f);
      }
      setLettura(n || letta?.negozio ? "fatta" : "Non riesco a leggerla: scrivi il numero qui sotto.");
    } catch (err) {
      setLettura(err instanceof Error ? err.message : "Non riesco a leggerla: scrivi il numero qui sotto.");
    }
  }

  const valido = negozio.trim() && numero.trim();

  function invia(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    const n = qr ? numero.trim() : numero.replace(/\s/g, "");
    // Il tipo letto dalla foto vale finché il numero non viene ritoccato a mano
    const formato: Formato = qr ? "qrcode" : formatoLetto && formatoLetto !== "qrcode" ? formatoLetto : formatoDaNumero(n);
    onSalva(
      {
        id: carta?.id ?? crypto.randomUUID(),
        famiglia_id: famigliaId,
        negozio: insegnaNegozio(negozio) ?? negozio.trim(),
        numero: n,
        formato,
        colore,
        titolare,
        foto_path: carta?.foto_path ?? null,
        creata_da: carta?.creata_da ?? userId,
        creata_il: carta?.creata_il ?? new Date().toISOString(),
      },
      foto,
    );
  }

  const chi = [...membri.map((m) => ({ id: m.id as string | null, nome: m.id === userId ? "Io" : m.nome.split(" ")[0] })), { id: null as string | null, nome: "Di casa" }];

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
        aria-label={carta ? "Modifica carta" : "Nuova carta"}
        onSubmit={invia}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="pb-sicuro max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[28px] bg-superficie p-5 shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-24 shrink-0">
            <Tessera negozio={negozio.trim() || "carta"} colore={colore} piccola />
          </div>
          <p className="titolo flex-1 text-[1.0625rem]">{carta ? "modifica carta" : "nuova carta"}</p>
        </div>

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={lettura === "in-corso"}
          className="anello-focus mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-superficie-2 text-[0.9375rem] font-semibold transition hover:bg-superficie-3 disabled:opacity-70"
        >
          {lettura === "in-corso" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {lettura === "in-corso" ? "Leggo la tessera…" : "Fotografa la tessera"}
        </button>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={fotografa} />
        {lettura !== "no" && lettura !== "in-corso" && lettura !== "fatta" ? <p className="mt-2 text-center text-[0.8125rem] text-pericolo">{lettura}</p> : null}

        <div className="mt-4 grid gap-4 text-[0.8125rem] text-tenue">
          <label className="flex flex-col gap-1">
            Negozio
            <input value={negozio} onChange={(e) => scriviNegozio(e.target.value)} placeholder="Es. Coop" required className="campo-linea h-11 text-[1.0625rem] text-inchiostro" />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <label className="flex flex-col gap-1">
              Numero
              <input
                value={numero}
                onChange={(e) => (setNumero(e.target.value), setFormatoLetto(null))}
                inputMode={qr ? "text" : "numeric"}
                autoComplete="off"
                required
                className="numeri campo-linea h-11 text-[1.0625rem] text-inchiostro"
              />
            </label>
            <div className="flex rounded-full bg-superficie-2 p-1 text-[0.8125rem]" role="group" aria-label="Codice">
              {[
                { v: false, nome: "Barre" },
                { v: true, nome: "QR" },
              ].map((o) => (
                <button
                  key={o.nome}
                  type="button"
                  onClick={() => setQr(o.v)}
                  aria-pressed={qr === o.v}
                  className={cn("anello-focus h-8 rounded-full px-3 transition", qr === o.v ? "bg-dorso font-semibold text-su-dorso" : "text-tenue")}
                >
                  {o.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            Colore
            <div className="flex flex-wrap gap-2">
              {[...new Set([colore, ...TAVOLOZZA])].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => (setColore(c), setColoreToccato(true))}
                  aria-label={`Colore ${c}`}
                  aria-pressed={colore === c}
                  className={cn("anello-focus size-8 rounded-full transition", colore === c && "ring-2 ring-inchiostro ring-offset-2 ring-offset-superficie")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[0.875rem]" role="group" aria-label="Di chi">
            <span>Di chi</span>
            {chi.map((c) => (
              <button
                key={c.id ?? "casa"}
                type="button"
                onClick={() => setTitolare(c.id)}
                aria-pressed={titolare === c.id}
                className={cn(
                  "anello-focus underline-offset-4 transition",
                  titolare === c.id ? "font-semibold text-inchiostro underline decoration-becco decoration-2" : "text-tenue hover:text-inchiostro",
                )}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {onElimina ? (
            conferma ? (
              <span className="flex items-center gap-1">
                <Pulsante type="button" variante="pericolo" className="h-10 px-4" onClick={onElimina}>
                  Elimina
                </Pulsante>
                <Pulsante type="button" variante="fantasma" className="h-10 px-3" onClick={() => setConferma(false)}>
                  No
                </Pulsante>
              </span>
            ) : (
              <button type="button" onClick={() => setConferma(true)} aria-label="Elimina carta" className="anello-focus grid size-10 place-items-center rounded-full text-tenue hover:bg-pericolo-tenue hover:text-pericolo">
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
            <Pulsante type="submit" disabled={!valido || lettura === "in-corso"}>
              Salva
            </Pulsante>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}
