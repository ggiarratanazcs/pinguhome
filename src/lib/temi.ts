/** Temi disponibili. Il tema attivo è applicato come data-theme sull'elemento <html>. */
export const TEMI = [
  {
    id: "banchisa",
    nome: "Banchisa",
    descrizione: "Ghiaccio, mare artico e becco arancio",
    anteprima: ["#eef4f5", "#0d5f6b", "#f2a33a", "#13242b"],
  },
  {
    id: "notte-polare",
    nome: "Notte polare",
    descrizione: "Buio artico con l'aurora verde",
    anteprima: ["#0a1418", "#5fd3a5", "#f2a33a", "#e6f1f2"],
  },
  {
    id: "colonia",
    nome: "Colonia",
    descrizione: "Sabbia, alga e piumaggio reale",
    anteprima: ["#f4f1ea", "#2f6b4f", "#e9b23c", "#1d1f1c"],
  },
] as const;

export type IdTema = (typeof TEMI)[number]["id"];
export const TEMA_PREDEFINITO: IdTema = "banchisa";
export const CHIAVE_TEMA = "ph-tema";

export function temaValido(t: string | null | undefined): IdTema {
  return (TEMI.find((x) => x.id === t)?.id ?? TEMA_PREDEFINITO) as IdTema;
}

/** Applica subito il tema salvato, prima del primo disegno (niente lampeggio). */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CHIAVE_TEMA}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

/** Applica il tema alla pagina e lo ricorda su questo dispositivo. */
export function applicaTema(t: IdTema) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(CHIAVE_TEMA, t);
  } catch {}
}
