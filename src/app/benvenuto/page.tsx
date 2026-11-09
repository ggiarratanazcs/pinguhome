import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfilo } from "@/lib/sessione";
import { Marchio } from "@/components/pinguino";
import { SceltaCasa } from "./scelta-casa";

export const metadata = { title: "Benvenuto" };

export default async function Benvenuto() {
  const profilo = await getProfilo();
  const supabase = await createClient();
  const { data } = await supabase.from("membri").select("famiglia_id").eq("user_id", profilo.id).limit(1);
  if (data && data.length > 0) redirect("/");

  return (
    <main className="pt-sicuro mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10 md:py-16">
      <Marchio />
      <div className="mt-14 md:mt-20">
        <p className="sovratitolo">Primo passo</p>
        <h1 className="titolo mt-3 text-[2.5rem] leading-[1.02] md:text-[3.25rem]">
          Ciao {profilo.nome || "!"}, <br className="hidden md:block" />
          dove vivono i tuoi pinguini?
        </h1>
        <p className="mt-4 max-w-xl text-[1.0625rem] text-tenue">
          Crea la vostra casa e condividi il codice con chi vive con te, oppure entra con il codice che ti hanno mandato.
        </p>
      </div>
      <SceltaCasa />
    </main>
  );
}
