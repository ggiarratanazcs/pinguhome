// Tipi del database Supabase "pinguhome" (generati dallo schema; rigenerare dopo ogni migrazione).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

type Tabella<R, I, U = Partial<R>> = { Row: R; Insert: I; Update: U; Relationships: Rel[] };

export type Dispensa = {
  aggiornata_il: string;
  famiglia_id: string;
  id: string;
  nome: string;
  posizione: string;
  prodotto_id: string | null;
  quantita: number;
  scadenza: string | null;
  scorta_minima: number | null;
  unita: string;
};

export type Famiglia = {
  codice_invito: string;
  creata_da: string | null;
  creata_il: string;
  id: string;
  /** I posti di "In casa" che la casa gestisce; null = non ancora scelti */
  luoghi: string[] | null;
  nome: string;
};

export type Lista = {
  archiviata: boolean;
  colore: string;
  creata_il: string;
  famiglia_id: string;
  id: string;
  nome: string;
  ordine: number;
};

export type Membro = {
  entrato_il: string;
  famiglia_id: string;
  ruolo: string;
  user_id: string;
};

export type Prodotto = {
  abituale: boolean;
  creato_il: string;
  eco: boolean;
  famiglia_id: string;
  id: string;
  /** Tolto dagli abituali: non ricompare anche se si ricompra spesso */
  nascosto: boolean;
  nome: string;
  reparto_id: string | null;
  ultimo_acquisto: string | null;
  unita: string;
  volte_acquistato: number;
};

export type Profilo = {
  colore: string;
  cornice: "scorrimento" | "polaroid";
  creato_il: string;
  email: string;
  famiglia_attiva: string | null;
  id: string;
  mascotte: string;
  mascotte_path: string | null;
  nome: string;
  tema: string;
  tutorial_visto_il: string | null;
};

export type Reparto = {
  famiglia_id: string;
  icona: string;
  id: string;
  nome: string;
  ordine: number;
};

export type VoceLista = {
  aggiunta_da: string | null;
  creata_il: string;
  eco: boolean;
  famiglia_id: string;
  id: string;
  lista_id: string;
  nome: string;
  note: string | null;
  presa: boolean;
  presa_da: string | null;
  presa_il: string | null;
  prodotto_id: string | null;
  quantita: number;
  reparto_id: string | null;
  unita: string;
  urgente: boolean;
};

export type ProdottoSpesa = {
  nome: string;
  quantita: number;
  unita: string;
  prezzo?: number | null;
  /** Reparto (es. "Frutta e verdura"), quando lo indica la lettura dello scontrino */
  reparto?: string | null;
  /** Voce della lista da comprare a cui corrisponde, quando la indica la lettura dello scontrino */
  in_lista?: string | null;
};

export type Spesa = {
  creata_il: string;
  data: string;
  famiglia_id: string;
  id: string;
  importo: number;
  lista_id: string | null;
  negozio: string | null;
  note: string | null;
  num_prodotti: number;
  origine: "carrello" | "manuale" | "scontrino";
  pagata_da: string | null;
  prodotti: ProdottoSpesa[];
  scontrino_path: string | null;
};

export type Impegno = {
  categoria: "casa" | "appuntamento" | "scadenza" | "viaggio" | "altro";
  creato_da: string | null;
  creato_il: string;
  data: string;
  famiglia_id: string;
  id: string;
  importo: number | null;
  note: string | null;
  ora: string | null;
  per_chi: string | null;
  promemoria: number | null;
  ricorrenza: "nessuna" | "settimanale" | "mensile" | "annuale";
  titolo: string;
};

export type PushIscrizione = {
  auth: string;
  creata_il: string;
  dispositivo: string | null;
  endpoint: string;
  id: string;
  p256dh: string;
  user_id: string;
};

export type ImpegnoFatto = {
  data: string;
  famiglia_id: string;
  fatto_da: string | null;
  fatto_il: string;
  impegno_id: string;
};

export type Conto = {
  aggiornato_da: string | null;
  aggiornato_il: string;
  data_saldo: string;
  famiglia_id: string;
  saldo: number;
};

export type Movimento = {
  categoria: string;
  chi: string | null;
  creato_da: string | null;
  creato_il: string;
  data: string;
  descrizione: string;
  famiglia_id: string;
  id: string;
  impegno_data: string | null;
  impegno_id: string | null;
  importo: number;
  origine: "manuale" | "spesa" | "agenda";
  ricorrenza: "nessuna" | "settimanale" | "mensile" | "annuale";
  spesa_id: string | null;
  tipo: "entrata" | "uscita";
};

export type Foto = {
  altezza: number | null;
  caricata_da: string | null;
  creata_il: string;
  famiglia_id: string;
  id: string;
  larghezza: number | null;
  path: string;
};

export type Carta = {
  colore: string;
  creata_da: string | null;
  creata_il: string;
  famiglia_id: string;
  foto_path: string | null;
  formato: "ean13" | "ean8" | "upca" | "code128" | "code39" | "qrcode";
  id: string;
  negozio: string;
  numero: string;
  titolare: string | null;
};

type Opz<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      carte: Tabella<Carta, Opz<Carta, "colore" | "creata_da" | "creata_il" | "foto_path" | "formato" | "id" | "titolare">>;
      dispensa: Tabella<Dispensa, Opz<Dispensa, "aggiornata_il" | "id" | "posizione" | "prodotto_id" | "quantita" | "scadenza" | "scorta_minima" | "unita">>;
      famiglie: Tabella<Famiglia, Opz<Famiglia, "codice_invito" | "creata_da" | "creata_il" | "id" | "luoghi">>;
      liste: Tabella<Lista, Opz<Lista, "archiviata" | "colore" | "creata_il" | "id" | "ordine">>;
      membri: Tabella<Membro, Opz<Membro, "entrato_il" | "ruolo">>;
      prodotti: Tabella<Prodotto, Opz<Prodotto, "abituale" | "creato_il" | "eco" | "id" | "nascosto" | "reparto_id" | "ultimo_acquisto" | "unita" | "volte_acquistato">>;
      profili: Tabella<Profilo, Opz<Profilo, "colore" | "cornice" | "creato_il" | "tutorial_visto_il" | "email" | "famiglia_attiva" | "mascotte" | "mascotte_path" | "nome" | "tema">>;
      impegni: Tabella<Impegno, Opz<Impegno, "categoria" | "creato_da" | "creato_il" | "id" | "importo" | "note" | "ora" | "per_chi" | "promemoria" | "ricorrenza">>;
      push_iscrizioni: Tabella<PushIscrizione, Opz<PushIscrizione, "id" | "user_id" | "dispositivo" | "creata_il">>;
      impegni_fatti: Tabella<ImpegnoFatto, Opz<ImpegnoFatto, "fatto_da" | "fatto_il">>;
      foto: Tabella<Foto, Opz<Foto, "altezza" | "caricata_da" | "creata_il" | "id" | "larghezza">>;
      conti: Tabella<Conto, Opz<Conto, "aggiornato_da" | "aggiornato_il" | "data_saldo">>;
      movimenti: Tabella<
        Movimento,
        Opz<Movimento, "categoria" | "chi" | "creato_da" | "creato_il" | "descrizione" | "id" | "impegno_data" | "impegno_id" | "origine" | "ricorrenza" | "spesa_id">
      >;
      spese: Tabella<Spesa, Opz<Spesa, "creata_il" | "data" | "id" | "lista_id" | "negozio" | "note" | "num_prodotti" | "origine" | "pagata_da" | "prodotti" | "scontrino_path">>;
      reparti: Tabella<Reparto, Opz<Reparto, "icona" | "id" | "ordine">>;
      voci_lista: Tabella<
        VoceLista,
        Opz<VoceLista, "aggiunta_da" | "creata_il" | "eco" | "id" | "note" | "presa" | "presa_da" | "presa_il" | "prodotto_id" | "quantita" | "reparto_id" | "unita" | "urgente">
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      crea_famiglia: { Args: { p_nome: string }; Returns: string };
      segna_presa: { Args: { p_presa: boolean; p_voce: string }; Returns: undefined };
      unisciti_famiglia: { Args: { p_codice: string }; Returns: string };
      promemoria_dati: { Args: { p_segreto: string }; Returns: Json };
      promemoria_registra: { Args: { p_segreto: string; p_inviati: Json; p_scadute: string[] }; Returns: undefined };
      attivita_dati: { Args: { p_segreto: string; p_famiglia: string; p_autore: string; p_lista: string | null }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
