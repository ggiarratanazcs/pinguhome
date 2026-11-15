import { createClient } from "@/lib/supabase/server";
import type { Panoramica } from "@/lib/admin";
import { PannelloCase } from "@/components/admin/pannello-case";

export const metadata = { title: "Case · Admin" };

export default async function PaginaCase() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_panoramica");
  const p = data as unknown as Panoramica;
  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="titolo text-[1.75rem]">case</h1>
      <p className="mt-1 text-[0.875rem] text-tenue">{p.case === 1 ? "1 casa" : `${p.case} case`} · {p.utenti} utenti</p>
      <div className="mt-6">
        <PannelloCase case={p.elenco} />
      </div>
    </div>
  );
}
