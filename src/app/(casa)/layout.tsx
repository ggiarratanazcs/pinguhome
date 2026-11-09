import { getContesto } from "@/lib/sessione";
import { BarraInferiore, BarraLaterale } from "@/components/navigazione";
import { SincronizzaTema } from "@/components/sincronizza-tema";

export default async function LayoutCasa({ children }: LayoutProps<"/">) {
  const { profilo, famiglia, membri } = await getContesto();
  return (
    <div className="flex min-h-dvh">
      <SincronizzaTema tema={profilo.tema} />
      <BarraLaterale casa={famiglia.nome} membri={membri} />
      <div className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</div>
      <BarraInferiore />
    </div>
  );
}
