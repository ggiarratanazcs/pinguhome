import { cn } from "@/lib/utils";

/** La mascotte di PinguHome: il pinguino con gli occhiali da sole. */
export function Pinguino({ className, alt = "" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/pinguino-256.png" alt={alt} draggable={false} className={cn("h-auto shrink-0 select-none object-contain", className)} />;
}

/** Marchio: mascotte + nome. */
export function Marchio({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Pinguino className="w-10" />
      <span className="titolo text-[1.125rem]">pinguhome</span>
    </span>
  );
}
