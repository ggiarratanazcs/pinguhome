import { getContesto } from "@/lib/sessione";
import { BarraInferiore, BarraLaterale, TestataMobile } from "@/components/navigazione";
import { SincronizzaTema } from "@/components/sincronizza-tema";
import { FornitoreMascotte } from "@/components/mascotte";
import { AvvioServiceWorker } from "@/components/notifiche";
import { GiroGuidato } from "@/components/giro-guidato";
import { PuliziaFile } from "@/components/pulizia-file";

export default async function LayoutCasa({ children }: LayoutProps<"/">) {
  const { profilo, famiglia, membri } = await getContesto();
  // Casa sospesa dall'amministratore: al posto delle sezioni, un avviso
  if (famiglia.sospesa_il) {
    return (
      <main className="foglio pt-sicuro flex min-h-dvh flex-col items-start justify-center px-6 md:px-16">
        <div className="max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icona-512.png" alt="" className="size-14 rounded-[14px]" />
          <h1 className="titolo mt-6 text-[1.75rem]">casa sospesa</h1>
          <p className="mt-2 text-tenue">Al momento Uchi non è disponibile per {famiglia.nome}.</p>
          <form action="/auth/esci" method="post" className="mt-6">
            <button type="submit" className="anello-focus text-[0.9375rem] font-semibold underline decoration-becco decoration-2 underline-offset-4">
              Esci
            </button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <FornitoreMascotte tipo={profilo.mascotte} percorso={profilo.mascotte_path}>
    <div className="flex min-h-dvh bg-dorso">
      <SincronizzaTema tema={profilo.tema} />
      <AvvioServiceWorker />
      <BarraLaterale casa={famiglia.nome} membri={membri} />
      {/* Sotto l'ora e la batteria: sempre il blu della testata (iOS 26 ci mette sopra un velo sfocato) */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-dorso lg:hidden" />
      <div className="foglio relative min-w-0 flex-1 pb-28 lg:pb-0">
        <TestataMobile casa={famiglia.nome} />
        {children}
      </div>
      <BarraInferiore />
      <GiroGuidato profiloId={profilo.id} daMostrare={!profilo.tutorial_visto_il} />
      <PuliziaFile famigliaId={famiglia.id} />
    </div>
    </FornitoreMascotte>
  );
}
