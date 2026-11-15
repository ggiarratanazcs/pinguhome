import type { Metadata } from "next";
import { getContesto } from "@/lib/sessione";
import { BarraInferiore, BarraLaterale, TestataMobile } from "@/components/navigazione";
import { SincronizzaTema } from "@/components/sincronizza-tema";
import { FornitoreMascotte } from "@/components/mascotte";
import { AvvioServiceWorker } from "@/components/notifiche";
import { GiroGuidato } from "@/components/giro-guidato";

/** Con una mascotte personale, l'icona per la schermata Home del telefono è la sua. */
export async function generateMetadata(): Promise<Metadata> {
  const { profilo } = await getContesto();
  if (profilo.mascotte !== "personale" || !profilo.mascotte_path) return {};
  return { icons: { apple: `/icona-app?s=180&v=${encodeURIComponent(profilo.mascotte_path)}` } };
}

export default async function LayoutCasa({ children }: LayoutProps<"/">) {
  const { profilo, famiglia, membri } = await getContesto();
  return (
    <FornitoreMascotte tipo={profilo.mascotte} percorso={profilo.mascotte_path}>
    <div className="flex min-h-dvh bg-dorso">
      <SincronizzaTema tema={profilo.tema} />
      <AvvioServiceWorker />
      <BarraLaterale casa={famiglia.nome} membri={membri} />
      <div className="foglio min-w-0 flex-1 pb-28 lg:pb-0">
        <TestataMobile casa={famiglia.nome} />
        {children}
      </div>
      <BarraInferiore />
      <GiroGuidato profiloId={profilo.id} daMostrare={!profilo.tutorial_visto_il} />
    </div>
    </FornitoreMascotte>
  );
}
