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
    <main className="foglio pt-sicuro">
      <div className="mx-auto flex max-w-3xl flex-col px-6 py-10 md:py-16">
        <Marchio />
        <div className="mt-14 md:mt-20">
          <h1 className="titolo text-[2.75rem] md:text-[4rem]">
            ciao {(profilo.nome || "").toLowerCase()},<br />
            dove vivete?
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] text-inchiostro-2">
            Crea la vostra casa e manda il codice a chi vive con te, oppure entra con il codice che ti hanno mandato.
          </p>
        </div>
        <SceltaCasa />
      </div>
    </main>
  );
}
