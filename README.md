# PinguHome

La casa, la spesa e le cose di tutti i giorni, in due.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (database, autenticazione, tempo reale) · Vercel (regione Dublino, vicino al database).

## Moduli
- **Spesa** — liste condivise in tempo reale, aggiunta rapida in linguaggio naturale ("2 kg mele"), reparto automatico, voci urgenti e green, carrello che finisce in dispensa
- **Dispensa** — frigo, freezer e dispensa, scadenze, scorta minima con "rimetti in lista"
- **Abituali** — i prodotti della casa, preferiti, statistiche green
- In arrivo: Finanze, Agenda

## Temi
Banchisa (predefinito), Notte polare, Colonia. Per aggiungerne uno: blocco in `src/app/globals.css` + voce in `src/lib/temi.ts`.

## Database
Progetto Supabase `pinguhome` (eu-west-1). Le migrazioni sono in `supabase/`. Tutte le tabelle hanno RLS: ogni dato appartiene a una "casa" (famiglia) e lo vedono solo i suoi membri. Si entra in una casa con il codice invito (Impostazioni → Casa).

## Sviluppo
```
npm install
npm run dev
```
