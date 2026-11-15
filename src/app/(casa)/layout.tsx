import { getContesto } from "@/lib/sessione";
import { BarraInferiore, BarraLaterale, TestataMobile } from "@/components/navigazione";
import { SincronizzaTema } from "@/components/sincronizza-tema";
import { FornitoreMascotte } from "@/components/mascotte";
import { AvvioServiceWorker } from "@/components/notifiche";
import { GiroGuidato } from "@/components/giro-guidato";

export default async function LayoutCasa({ children }: LayoutProps<"/">) {
  const { profilo, famiglia, membri } = await getContesto();
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
    </div>
    </FornitoreMascotte>
  );
}
