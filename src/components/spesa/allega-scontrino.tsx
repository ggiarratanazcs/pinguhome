"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Scelta facoltativa dello scontrino: foto dalla fotocamera/galleria o PDF. */
export function AllegaScontrino({
  file,
  onCambia,
  etichetta = "Allega lo scontrino",
  scuro = false,
}: {
  file: File | null;
  onCambia: (f: File | null) => void;
  etichetta?: string;
  scuro?: boolean;
}) {
  const campo = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={campo}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onCambia(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <span className={cn("flex max-w-full items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 text-[0.875rem]", scuro ? "bg-dorso-2 text-su-dorso" : "bg-superficie-3")}>
          <Paperclip className="size-4 shrink-0" />
          <span className="truncate">{file.name || "scontrino"}</span>
          <button
            type="button"
            onClick={() => {
              onCambia(null);
              if (campo.current) campo.current.value = "";
            }}
            aria-label="Togli lo scontrino"
            className="anello-focus grid size-6 shrink-0 place-items-center rounded-full hover:bg-linea"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => campo.current?.click()}
          className="anello-focus flex items-center gap-2 text-[0.875rem] font-semibold underline decoration-becco decoration-2 underline-offset-4"
        >
          <Paperclip className="size-4" /> {etichetta}
        </button>
      )}
    </div>
  );
}
