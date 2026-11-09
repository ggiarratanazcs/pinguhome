import { getContesto } from "@/lib/sessione";
import { BarraInferiore, BarraLaterale, TestataMobile } from "@/components/navigazione";
import { SincronizzaTema } from "@/components/sincronizza-tema";
import { FornitoreMascotte } from "@/components/mascotte";
import { AvvioServiceWorker } from "@/components/notifiche";

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
    </div>
    </FornitoreMascotte>
  );
}
