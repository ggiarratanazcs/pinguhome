import { getContesto } from "@/lib/sessione";
import { Impostazioni } from "./impostazioni";

export const metadata = { title: "Impostazioni" };

export default async function PaginaImpostazioni() {
  const { profilo, famiglia, membri } = await getContesto();
  return <Impostazioni profilo={profilo} famiglia={famiglia} membri={membri} />;
}
