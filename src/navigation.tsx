import { createContext, useContext } from 'react'
import type { Reiter } from './Leiste'

// Ansichten innerhalb eines Reiters liegen als Stapel übereinander (zurück = oberste entfernen).
export type Ansicht =
  | { v: 'woche' }
  | { v: 'suche'; ev: string }
  | { v: 'uebernehmen'; ev: string }
  | { v: 'lieder' }
  | { v: 'menue' }
  | { v: 'liste'; art: 'gd' | 'pr' }
  | { v: 'lied'; id: number }

/** Einstellungen im Reiter Lieder; bleiben erhalten, solange die App offen ist */
export type LiederEinstellung = {
  suche: string
  herkunft: 'alle' | 'D' | 'R' | 'zettel'
  status: 'alle' | 'erlernt' | 'in_arbeit' | 'unbekannt'
  thema: 'alle' | number
  sortierung: 'haeufigkeit' | 'laengst' | 'nummer' | 'titel'
}

export const LIEDER_ANFANG: LiederEinstellung = {
  suche: '',
  herkunft: 'alle',
  status: 'alle',
  thema: 'alle',
  sortierung: 'haeufigkeit',
}

export type Navigation = {
  geh: (a: Ansicht) => void
  zurueck: () => void
  reiter: (r: Reiter) => void
  /** Woche mit diesem Datum unter „Als Nächstes“ öffnen */
  zurWoche: (datum: Date) => void
  /** Wochen-Abstand zur aktuellen Woche (0 = diese Woche) */
  woche: number
  setWoche: (w: number) => void
  /** Ansicht, von der aus die aktuelle geöffnet wurde (für die Beschriftung von „Zurück“) */
  vorher: Ansicht | undefined
  lieder: LiederEinstellung
  setLieder: (e: LiederEinstellung) => void
}

export const NavKontext = createContext<Navigation | null>(null)

export function useNav() {
  const n = useContext(NavKontext)
  if (!n) throw new Error('useNav außerhalb der App')
  return n
}
