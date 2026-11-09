import { Suspense } from "react";
import { ModuloAccesso } from "./modulo-accesso";

export const metadata = { title: "Accesso" };

export default function PaginaAccesso() {
  return (
    <Suspense>
      <ModuloAccesso />
    </Suspense>
  );
}
