import { cn } from "@/lib/utils";

function scuro(colore: string) {
  return `color-mix(in srgb, ${colore} 70%, black)`;
}

/** La tessera disegnata: colore del negozio, nome e titolare (niente loghi). */
export function Tessera({ negozio, colore, titolare, piccola = false, className }: { negozio: string; colore: string; titolare?: string | null; piccola?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden text-left text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)]",
        piccola ? "rounded-[9px] p-1.5" : "rounded-[18px] p-3.5",
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${colore}, ${scuro(colore)})` }}
    >
      <span aria-hidden className={cn("pointer-events-none absolute rounded-full bg-white/10", piccola ? "-right-3 -top-5 size-14" : "-right-6 -top-10 size-28")} />
      <span className={cn("titolo relative leading-tight", piccola ? "line-clamp-1 text-[0.6rem]" : "line-clamp-2 text-[1.15rem]")}>{negozio.toLowerCase()}</span>
      {!piccola && titolare ? <span className="relative text-[0.75rem] text-white/80">{titolare}</span> : null}
    </span>
  );
}
