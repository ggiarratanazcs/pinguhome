/** Temi disponibili. Il tema attivo è applicato come data-theme sull'elemento <html>. */
export const TEMI = [
  {
    id: "banchisa",
    nome: "Banchisa",
    descrizione: "Ghiaccio, piume blu notte e becco arancio",
    anteprima: { sfondo: "#e8f0f6", dorso: "#1d2340", foglio: "#ffffff", becco: "#ff9f1c" },
  },
  {
    id: "notte-polare",
    nome: "Notte polare",
    descrizione: "Tutto spento, tranne il becco",
    anteprima: { sfondo: "#0b0f20", dorso: "#0b0f20", foglio: "#141a33", becco: "#ffa62e" },
  },
  {
    id: "aurora",
    nome: "Aurora",
    descrizione: "Ghiaccio lilla e guance rosa",
    anteprima: { sfondo: "#eeeaf7", dorso: "#3a2350", foglio: "#ffffff", becco: "#f2789b" },
  },
] as const;

export type IdTema = (typeof TEMI)[number]["id"];
export const TEMA_PREDEFINITO: IdTema = "banchisa";
export const CHIAVE_TEMA = "ph-tema";
export const CHIAVE_BARRA = "ph-barra";

export function temaValido(t: string | null | undefined): IdTema {
  return (TEMI.find((x) => x.id === t)?.id ?? TEMA_PREDEFINITO) as IdTema;
}

/** Applica tema e stato della barra salvati prima del primo disegno (niente lampeggio). */
export const SCRIPT_AVVIO = `try{var d=document.documentElement,t=localStorage.getItem("${CHIAVE_TEMA}");if(t)d.dataset.theme=t;if(localStorage.getItem("${CHIAVE_BARRA}")==="chiusa")d.dataset.barra="chiusa"}catch(e){}`;

/** Applica il tema alla pagina e lo ricorda su questo dispositivo. */
export function applicaTema(t: IdTema) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(CHIAVE_TEMA, t);
  } catch {}
}

/** Apre o chiude la barra laterale e ricorda la scelta. */
export function alternaBarra() {
  const d = document.documentElement;
  const chiusa = d.dataset.barra !== "chiusa";
  if (chiusa) d.dataset.barra = "chiusa";
  else delete d.dataset.barra;
  try {
    localStorage.setItem(CHIAVE_BARRA, chiusa ? "chiusa" : "aperta");
  } catch {}
}
