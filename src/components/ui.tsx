import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn, iniziali } from "@/lib/utils";

type Variante = "primario" | "scuro" | "secondario" | "fantasma" | "pericolo";

const VARIANTI: Record<Variante, string> = {
  primario: "bg-becco text-su-becco hover:bg-becco-hover active:scale-[0.98]",
  scuro: "bg-accento text-su-accento hover:bg-accento-hover active:scale-[0.98]",
  secondario: "border-[1.5px] border-linea-forte text-inchiostro hover:border-inchiostro",
  fantasma: "text-inchiostro-2 hover:bg-superficie-3",
  pericolo: "text-pericolo hover:bg-pericolo-tenue",
};

export function Pulsante({
  variante = "primario",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cn(
        "anello-focus inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-semibold transition-[background,transform,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTI[variante],
        className,
      )}
    />
  );
}

/** Campo con sola linea inferiore che si accende di arancio. */
export function Campo({
  etichetta,
  id,
  aiuto,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etichetta: string; id: string; aiuto?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[0.8125rem] text-tenue">{etichetta}</span>
      <input
        id={id}
        {...props}
        className={cn("campo-linea h-11 text-[1.0625rem] text-inchiostro placeholder:text-tenue/60", className)}
      />
      {aiuto ? <span className="text-xs text-tenue">{aiuto}</span> : null}
    </label>
  );
}

export function Messaggio({ tipo, children }: { tipo: "errore" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tipo === "errore" ? "alert" : "status"}
      className={cn(
        "border-l-[3px] py-1.5 pl-3 text-sm",
        tipo === "errore" ? "border-pericolo text-pericolo" : "border-eco text-eco",
      )}
    >
      {children}
    </p>
  );
}

export function Avatar({ nome, colore, className }: { nome: string; colore: string; className?: string }) {
  return (
    <span
      title={nome}
      className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-white ring-1 ring-white/25", className)}
      style={{ background: colore }}
    >
      {iniziali(nome)}
    </span>
  );
}
