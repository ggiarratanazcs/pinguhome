"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Send } from "lucide-react";
import { attivaNotifiche, disattivaNotifiche, inviaProva, registraServiceWorker, statoNotifiche, type StatoNotifiche } from "@/lib/notifiche";
import { Messaggio, Pulsante } from "@/components/ui";

/** Registra il service worker all'apertura dell'app (serve per ricevere le notifiche). */
export function AvvioServiceWorker() {
  useEffect(() => {
    registraServiceWorker();
  }, []);
  return null;
}

/** Riquadro in Impostazioni per attivare le notifiche su questo dispositivo. */
export function GestioneNotifiche() {
  const [stato, setStato] = useState<StatoNotifiche | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  useEffect(() => {
    statoNotifiche().then(setStato);
  }, []);

  async function esegui(azione: () => Promise<void>) {
    setInCorso(true);
    setEsito(null);
    try {
      await azione();
    } catch (e) {
      setEsito({ tipo: "errore", testo: e instanceof Error ? e.message : "Qualcosa non è andato." });
    } finally {
      setInCorso(false);
    }
  }

  if (stato === null) return <p className="text-[0.875rem] text-tenue">Controllo le notifiche su questo dispositivo…</p>;

  return (
    <div className="flex flex-col gap-4">
      {stato === "solo-da-home" ? (
        <p className="text-[0.9375rem] text-inchiostro-2">
          Su iPhone le notifiche funzionano solo dall&apos;app sulla schermata Home: in Safari tocca <strong>Condividi</strong> → <strong>Aggiungi a schermata Home</strong>, apri PinguHome da lì e torna qui.
        </p>
      ) : stato === "non-supportate" ? (
        <p className="text-[0.9375rem] text-inchiostro-2">Questo browser non supporta le notifiche. Prova con Chrome, Edge, Firefox o con l&apos;app installata.</p>
      ) : stato === "bloccate" ? (
        <p className="text-[0.9375rem] text-inchiostro-2">Le notifiche sono bloccate per PinguHome: riattivale dalle impostazioni del browser o del telefono, poi ricarica la pagina.</p>
      ) : stato === "attive" ? (
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-eco">
          <BellRing className="size-5" /> Attive su questo dispositivo
        </p>
      ) : (
        <p className="text-[0.9375rem] text-inchiostro-2">Attivale per ricevere i promemoria dell&apos;agenda anche ad app chiusa. Vanno attivate su ogni dispositivo.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {stato === "spente" ? (
          <Pulsante disabled={inCorso} onClick={() => esegui(async () => setStato(await attivaNotifiche()))}>
            {inCorso ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Attiva le notifiche
          </Pulsante>
        ) : null}
        {stato === "attive" ? (
          <>
            <Pulsante
              variante="secondario"
              disabled={inCorso}
              onClick={() =>
                esegui(async () => {
                  await inviaProva();
                  setEsito({ tipo: "ok", testo: "Notifica di prova inviata: dovrebbe arrivare tra pochi secondi." });
                })
              }
            >
              {inCorso ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Invia una prova
            </Pulsante>
            <Pulsante
              variante="fantasma"
              disabled={inCorso}
              onClick={() =>
                esegui(async () => {
                  await disattivaNotifiche();
                  setStato("spente");
                })
              }
            >
              <BellOff className="size-4" /> Disattiva qui
            </Pulsante>
          </>
        ) : null}
      </div>
      {esito ? <Messaggio tipo={esito.tipo}>{esito.testo}</Messaggio> : null}
    </div>
  );
}
