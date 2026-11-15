import { cn } from "@/lib/utils";

/** La mascotte di Uchi: il pinguino con gli occhiali da sole. */
export function Pinguino({ className, alt = "" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/pinguino-256.png" alt={alt} draggable={false} className={cn("h-auto shrink-0 select-none object-contain", className)} />;
}

/** Marchio: l'icona dell'app e accanto il nome, piccolo. */
export function Marchio({ className, chiaro = false }: { className?: string; chiaro?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icona-512.png" alt="" draggable={false} className={cn("size-8 shrink-0 select-none rounded-[9px]", chiaro && "ring-1 ring-white/10")} />
      <span className={cn("titolo text-[0.9375rem]", chiaro && "text-su-dorso")}>uchi</span>
    </span>
  );
}
