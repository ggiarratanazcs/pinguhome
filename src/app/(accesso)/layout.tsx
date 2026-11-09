import { Marchio, Pinguino } from "@/components/pinguino";

export default function LayoutAccesso({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      {/* Pannello illustrato (schermi grandi): mare artico, banchisa e il pinguino */}
      <aside className="relative hidden overflow-hidden bg-accento text-su-accento lg:block">
        <svg aria-hidden viewBox="0 0 800 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="mare" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accento)" />
              <stop offset="1" stopColor="var(--accento-hover)" />
            </linearGradient>
          </defs>
          <rect width="800" height="900" fill="url(#mare)" />
          <circle cx="640" cy="170" r="70" fill="var(--becco)" opacity="0.9" />
          <path d="M0 640 L120 560 L210 600 L330 520 L470 610 L560 570 L800 650 V900 H0Z" fill="var(--su-accento)" opacity="0.14" />
          <path d="M0 700 L90 660 L200 690 L300 640 L420 700 L560 660 L680 700 L800 680 V900 H0Z" fill="var(--su-accento)" opacity="0.9" />
          <path d="M0 760 C120 740 240 780 400 760 S680 740 800 770 V900 H0Z" fill="var(--su-accento)" />
        </svg>
        <div className="relative flex h-full flex-col p-12">
          <span className="titolo text-2xl">PinguHome</span>
          <div className="mt-[14vh] max-w-md">
            <p className="titolo text-[3.25rem] leading-[0.95]">La casa, in due.<br />Senza sprechi.</p>
            <p className="mt-5 text-[1.0625rem] text-su-accento/80">
              Spesa condivisa in tempo reale, dispensa sotto controllo e meno cose buttate.
            </p>
          </div>
        </div>
        <Pinguino className="absolute bottom-[110px] right-24 size-40 drop-shadow-xl" />
      </aside>

      <main className="pt-sicuro flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Marchio className="mb-12" />
          {children}
        </div>
      </main>
    </div>
  );
}
