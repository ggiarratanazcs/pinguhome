import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classi: ClassValue[]) {
  return twMerge(clsx(classi));
}

/** Formatta una quantità senza decimali inutili: 1 → "1", 1.5 → "1,5". */
export function formattaQuantita(q: number) {
  return Number.isInteger(q) ? String(q) : q.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

export function iniziali(nome: string) {
  const parti = nome.trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) return "?";
  return (parti[0][0] + (parti[1]?.[0] ?? "")).toUpperCase();
}
