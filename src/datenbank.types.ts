// Datentypen der Datenbank, erzeugt aus Supabase (generate_typescript_types).
// Bei Änderungen an den Tabellen neu erzeugen.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      dirigenten: {
        Row: { id: number; name: string; reihenfolge: number }
        Insert: { id: number; name: string; reihenfolge: number }
        Update: { id?: number; name?: string; reihenfolge?: number }
        Relationships: []
      }
      klavierspieler: {
        Row: { id: number; name: string; reihenfolge: number }
        Insert: { id: number; name: string; reihenfolge: number }
        Update: { id?: number; name?: string; reihenfolge?: number }
        Relationships: []
      }
      eintraege: {
        Row: {
          datum: string
          erstellt_am: string
          id: number
          lied_id: number
          termin: string
        }
        Insert: {
          datum: string
          erstellt_am?: string
          id?: never
          lied_id: number
          termin: string
        }
        Update: {
          datum?: string
          erstellt_am?: string
          id?: never
          lied_id?: number
          termin?: string
        }
        Relationships: [
          {
            foreignKeyName: 'eintraege_lied_id_fkey'
            columns: ['lied_id']
            isOneToOne: false
            referencedRelation: 'lieder'
            referencedColumns: ['id']
          },
        ]
      }
      hinweise: {
        Row: {
          art: string
          datum: string
          erstellt_am: string
          geaendert_am: string
          geschlossen: boolean
          id: number
          lied_id: number
          text: string
        }
        Insert: {
          art: string
          datum?: string
          erstellt_am?: string
          geaendert_am?: string
          geschlossen?: boolean
          id?: never
          lied_id: number
          text: string
        }
        Update: {
          art?: string
          datum?: string
          erstellt_am?: string
          geaendert_am?: string
          geschlossen?: boolean
          id?: never
          lied_id?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hinweise_lied_id_fkey'
            columns: ['lied_id']
            isOneToOne: false
            referencedRelation: 'lieder'
            referencedColumns: ['id']
          },
        ]
      }
      kategorien: {
        Row: {
          id: number
          ist_fest: boolean
          name: string
          reihenfolge: number
        }
        Insert: {
          id: number
          ist_fest?: boolean
          name: string
          reihenfolge: number
        }
        Update: {
          id?: number
          ist_fest?: boolean
          name?: string
          reihenfolge?: number
        }
        Relationships: []
      }
      lieder: {
        Row: {
          buchseite_bis: number | null
          buchseite_von: number | null
          dirigent_id: number | null
          erstellt_am: string
          geaendert_am: string
          id: number
          im_buch: boolean
          kategorie_id: number | null
          klavierspieler_id: number | null
          kuerzel: string
          noten_pfad: string | null
          nummer: number
          schwierigkeit: number | null
          sprache: string
          status: string
          titel: string
        }
        Insert: {
          buchseite_bis?: number | null
          buchseite_von?: number | null
          dirigent_id?: number | null
          erstellt_am?: string
          geaendert_am?: string
          id?: never
          im_buch?: boolean
          kategorie_id?: number | null
          klavierspieler_id?: number | null
          /** vergibt die Datenbank bei Zettel-Liedern selbst */
          kuerzel?: string
          noten_pfad?: string | null
          nummer?: number
          schwierigkeit?: number | null
          sprache: string
          status?: string
          titel: string
        }
        Update: {
          buchseite_bis?: number | null
          buchseite_von?: number | null
          dirigent_id?: number | null
          erstellt_am?: string
          geaendert_am?: string
          id?: never
          im_buch?: boolean
          kategorie_id?: number | null
          klavierspieler_id?: number | null
          kuerzel?: string
          noten_pfad?: string | null
          nummer?: number
          schwierigkeit?: number | null
          sprache?: string
          status?: string
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lieder_kategorie_id_fkey'
            columns: ['kategorie_id']
            isOneToOne: false
            referencedRelation: 'kategorien'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      lied_loeschen: {
        Args: { lied: number }
        Returns: string | null
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type Tabellen = Database['public']['Tables']

/** Eine Zeile der Tabelle, z. B. Zeile<'lieder'> */
export type Zeile<T extends keyof Tabellen> = Tabellen[T]['Row']
