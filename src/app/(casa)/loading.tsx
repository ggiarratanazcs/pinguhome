/** Mostrato subito al cambio di sezione, mentre arrivano i dati: la barra resta ferma, il foglio si prepara. */
export default function Caricamento() {
  return (
    <div aria-busy="true" aria-label="Caricamento" className="mx-auto w-full max-w-[1120px] animate-pulse px-5 pt-4 md:px-12 md:pt-10">
      <div className="flex gap-5">
        {[88, 60, 70, 52].map((w, i) => (
          <div key={i} className="h-4 rounded-full bg-superficie-3" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-8 h-8 w-56 rounded-full bg-superficie-3" />
      <div className="mt-3 h-3 w-40 rounded-full bg-superficie-2" />
      <div className="mt-8 h-11 rounded-full bg-superficie-2" />
      <ul className="mt-8">
        {[70, 55, 80, 45, 62, 50].map((w, i) => (
          <li key={i} className="flex items-center gap-4 border-b border-linea py-4">
            <span className="size-[26px] rounded-full bg-superficie-3" />
            <span className="h-4 rounded-full bg-superficie-3" style={{ width: `${w}%` }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
