# PinguHome

La casa, la spesa e le cose di tutti i giorni, in due.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (database, autenticazione, tempo reale) · Vercel (regione Dublino, vicino al database).

## Moduli
- **Spesa** — liste condivise in tempo reale, aggiunta rapida in linguaggio naturale ("2 kg mele"), reparto automatico, voci urgenti, carrello che finisce in casa
- **In casa** — frigo, freezer e dispensa con le quantità e "rimetti in lista"
- **Abituali** — i prodotti della casa e i preferiti
- **Spese** — chiusura del carrello con importo, giorno e scontrino facoltativo; "+ Nuova spesa" a mano o leggendo uno scontrino (Claude via API, serve ANTHROPIC_API_KEY su Vercel); calendario mensile con totali
- **Agenda** — impegni condivisi o personali, aggiunta veloce in linguaggio naturale ("domani alle 18 dentista", "il 5 affitto ogni mese"), ricorrenze, calendario mensile e prossimi giorni
- In arrivo: Finanze

## Temi
Banchisa (predefinito), Notte polare, Aurora. L’interfaccia è il pinguino: barra laterale = dorso, foglio dei contenuti = pancia, arancio = becco. Cliccando la mascotte la barra si richiude. Per aggiungerne uno: blocco in `src/app/globals.css` + voce in `src/lib/temi.ts`.

## Database
Progetto Supabase `pinguhome` (eu-west-1). Le migrazioni sono in `supabase/`. Tutte le tabelle hanno RLS: ogni dato appartiene a una "casa" (famiglia) e lo vedono solo i suoi membri. Si entra in una casa con il codice invito (Impostazioni → Casa).

## Sviluppo
```
npm install
npm run dev
```
