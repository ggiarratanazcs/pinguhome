import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn, iniziali } from "@/lib/utils";

type Variante = "primario" | "secondario" | "fantasma" | "pericolo";

const VARIANTI: Record<Variante, string> = {
  primario:
    "bg-accento text-su-accento hover:bg-accento-hover shadow-[0_8px_20px_-10px_var(--accento)] active:translate-y-px",
  secondario: "bg-superficie text-inchiostro border border-linea hover:border-linea-forte hover:bg-superficie-2",
  fantasma: "text-inchiostro-2 hover:bg-superficie-3",
  pericolo: "bg-pericolo-tenue text-pericolo hover:brightness-95",
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
        "anello-focus inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-[0.9375rem] font-semibold transition-[background,transform,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTI[variante],
        className,
      )}
    />
  );
}

export function Campo({
  etichetta,
  id,
  aiuto,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etichetta: string; id: string; aiuto?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-inchiostro-2">{etichetta}</span>
      <input
        id={id}
        {...props}
        className={cn(
          "h-12 rounded-[14px] border border-linea bg-superficie px-4 text-[0.9375rem] text-inchiostro outline-none transition placeholder:text-tenue/70 focus:border-accento focus:ring-4 focus:ring-accento-tenue",
          className,
        )}
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
        "rounded-[14px] px-4 py-3 text-sm",
        tipo === "errore" ? "bg-pericolo-tenue text-pericolo" : "bg-eco-tenue text-eco",
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
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-white ring-2 ring-superficie",
        className,
      )}
      style={{ background: colore }}
    >
      {iniziali(nome)}
    </span>
  );
}
