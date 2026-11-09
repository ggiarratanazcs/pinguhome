import { cn } from "@/lib/utils";

/** Il pinguino di PinguHome: piumaggio, pancia, becco arancio e una foglia sulla testa. */
export function Pinguino({ className, foglia = true }: { className?: string; foglia?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("shrink-0", className)}>
      <path d="M32 6C19.5 6 12.5 17.5 12.5 33c0 14 7.5 25 19.5 25s19.5-11 19.5-25C51.5 17.5 44.5 6 32 6z" fill="#13242b" />
      <path d="M32 19c-7.6 0-11.5 7.6-11.5 16.4 0 9.8 4.9 17.6 11.5 17.6s11.5-7.8 11.5-17.6C43.5 26.6 39.6 19 32 19z" fill="#ffffff" />
      <circle cx="26" cy="18.5" r="3.6" fill="#ffffff" />
      <circle cx="38" cy="18.5" r="3.6" fill="#ffffff" />
      <circle cx="26.8" cy="18.8" r="1.8" fill="#13242b" />
      <circle cx="37.2" cy="18.8" r="1.8" fill="#13242b" />
      <path d="M28.6 23.2h6.8L32 27.6z" fill="var(--becco)" />
      <ellipse cx="25.5" cy="58.2" rx="5.2" ry="2.3" fill="var(--becco)" />
      <ellipse cx="38.5" cy="58.2" rx="5.2" ry="2.3" fill="var(--becco)" />
      {foglia ? (
        <>
          <path d="M33 7.2c1.6-4.4 7.4-6 11.4-3.6-1.2 4.4-6.6 6.4-11.4 3.6z" fill="var(--eco)" />
          <path d="M33.4 7c2.6-1.6 5.4-2.4 8-2.6" stroke="#ffffff" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.7" />
        </>
      ) : null}
    </svg>
  );
}

/** Marchio completo: pinguino + scritta. */
export function Marchio({ className, compatto = false }: { className?: string; compatto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-[12px] bg-accento-tenue">
        <Pinguino className="size-8" />
      </span>
      {compatto ? null : (
        <span className="titolo text-[1.2rem] leading-none">
          Pingu<span className="text-accento">Home</span>
        </span>
      )}
    </span>
  );
}
