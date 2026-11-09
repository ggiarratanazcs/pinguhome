import { Marchio, Pinguino } from "@/components/pinguino";

export default function LayoutAccesso({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-dorso lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Il dorso: mascotte grande su una lastra di ghiaccio */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-su-dorso lg:flex">
        <p className="titolo text-[1.25rem]">pinguhome</p>
        <div className="relative mx-auto w-full max-w-[360px]">
          <div aria-hidden className="absolute inset-x-[-10%] bottom-[-6%] top-[42%] rounded-[50%] bg-lastra" />
          <Pinguino className="relative w-full" />
        </div>
        <p className="titolo max-w-md text-[2rem]">la casa, in due.</p>
      </aside>

      <main className="foglio pt-sicuro flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Marchio className="mb-14 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
