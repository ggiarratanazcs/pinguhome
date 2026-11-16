"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

function ascolta(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Vero sugli schermi da PC (da 1024 px in su), dove le schede si aprono di lato invece che sopra la pagina. */
export function useDesktop() {
  return useSyncExternalStore(ascolta, () => window.matchMedia(QUERY).matches, () => false);
}
