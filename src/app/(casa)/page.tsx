import { createClient } from "@/lib/supabase/server";
import { getContesto } from "@/lib/sessione";
import { VistaHome } from "@/components/home/vista-home";
import { occorrenze, piuGiorni } from "@/lib/agenda";
import { residuo } from "@/lib/finanze";

function saluto(ora: number) {
  if (ora < 6) return "notte fonda";
  if (ora < 13) return "buongiorno";
  if (ora < 18) return "buon pomeriggio";
  return "buonasera";
}

/** Giorno della settimana o data breve dell'ultima spesa, rispetto a oggi. */
function quando(data: string, oggi: string) {
  const giorni = Math.round((Date.parse(`${oggi}T12:00:00`) - Date.parse(`${data}T12:00:00`)) / 86_400_000);
  if (giorni <= 0) return "oggi";
  if (giorni === 1) return "ieri";
  const d = new Date(`${data}T12:00:00`);
  if (giorni < 7) return d.toLocaleDateString("it-IT", { weekday: "long" });
  return `il ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`;
}

export default async function Home() {
  const { profilo, famiglia, membri } = await getContesto();
  const supabase = await createClient();
  const f = famiglia.id;

  const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const anno = Number(oggi.slice(0, 4));
  const mese = Number(oggi.slice(5, 7)) - 1;
  // Ultimi sei mesi, dal più vecchio al corrente
  const mesi = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(anno, mese - 5 + i, 1));
    return {
      chiave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      etichetta: d.toLocaleDateString("it-IT", { month: "long", timeZone: "UTC" }),
    };
  });

  const [{ data: voci }, { data: liste }, { data: dispensa }, { data: spese }, { data: reparti }, { data: impegni }, { data: conto }, { data: movimenti }] = await Promise.all([
    supabase.from("voci_lista").select("lista_id, presa, urgente").eq("famiglia_id", f),
    supabase.from("liste").select("id, nome, colore").eq("famiglia_id", f).eq("archiviata", false).order("ordine"),
    supabase.from("dispensa").select("posizione").eq("famiglia_id", f),
    supabase
      .from("spese")
      .select("importo, data, negozio, lista_id, pagata_da, creata_il")
      .eq("famiglia_id", f)
      .gte("data", `${mesi[0].chiave}-01`)
      .lte("data", oggi)
      .order("data", { ascending: false })
      .order("creata_il", { ascending: false }),
    supabase.from("reparti").select("*").eq("famiglia_id", f),
    supabase.from("impegni").select("data, ricorrenza").eq("famiglia_id", f),
    supabase.from("conti").select("*").eq("famiglia_id", f).maybeSingle(),
    supabase.from("movimenti").select("*").eq("famiglia_id", f),
  ]);
  const impegni30 = (impegni ?? []).reduce((t, i) => t + occorrenze(i as { data: string; ricorrenza: "nessuna" | "settimanale" | "mensile" | "annuale" }, oggi, piuGiorni(oggi, 29)).length, 0);
  const impegniSettimana = (impegni ?? []).reduce((t, i) => t + occorrenze(i as { data: string; ricorrenza: "nessuna" | "settimanale" | "mensile" | "annuale" }, oggi, piuGiorni(oggi, 6)).length, 0);

  const inCasa: Record<string, number> = {};
  for (const d of dispensa ?? []) inCasa[d.posizione] = (inCasa[d.posizione] ?? 0) + 1;

  const ultima = spese?.[0];
  const listaUltima = ultima ? liste?.find((l) => l.id === ultima.lista_id)?.nome : undefined;
  const chiUltima = ultima ? membri.find((m) => m.id === ultima.pagata_da) : undefined;
  const ora = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));

  return (
    <VistaHome
      dati={{
        nome: profilo.nome.split(" ")[0] || "pinguino",
        saluto: saluto(ora),
        data: new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }),
        famigliaId: f,
        liste: (liste ?? []).map((l) => {
          const proprie = (voci ?? []).filter((v) => v.lista_id === l.id);
          return {
            ...l,
            daPrendere: proprie.filter((v) => !v.presa).length,
            presi: proprie.filter((v) => v.presa).length,
            urgenti: proprie.filter((v) => !v.presa && v.urgente).length,
          };
        }),
        mesi: mesi.map((m) => ({
          etichetta: m.etichetta,
          totale: (spese ?? []).filter((s) => s.data.startsWith(m.chiave)).reduce((t, s) => t + Number(s.importo), 0),
        })),
        ultimaSpesa: ultima
          ? {
              importo: Number(ultima.importo),
              quando: quando(ultima.data, oggi),
              dove: ultima.negozio ? `da ${ultima.negozio}` : listaUltima ? `lista ${listaUltima}` : "",
              chi: chiUltima ? (chiUltima.id === profilo.id ? "te" : chiUltima.nome.split(" ")[0]) : "",
            }
          : null,
        inCasa,
        reparti: reparti ?? [],
        impegniSettimana,
        impegni30,
        residuo: residuo(conto ?? null, movimenti ?? [], oggi),
      }}
    />
  );
}
