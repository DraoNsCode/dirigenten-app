import { createContext, useContext, useEffect, useState } from 'react'
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
  /** Anzeigemodus nach Bildschirmbreite */
  layout: Layout
  /** Im breiten Modus die Ansicht im rechten Bereich (sonst die oberste Ansicht, falls nicht die Wurzel) */
  detail: Ansicht | undefined
}

/**
 * Anzeigemodi (Daniel, 8.11.2026: Stufe 1 und 2; Handy quer ordentlich umsetzen statt sperren)
 * - schmal: Handy hochkant, unter 600 px – Leiste unten, eine Ansicht
 * - mittel: 600 bis 899 px (Tablet hochkant, Handy quer) oder Handy quer mit wenig Höhe – Seitenleiste, eine Ansicht
 * - breit: ab 900 px (Tablet quer, Laptop, PC, große Handys quer) – Seitenleiste, links Liste, rechts Detail
 */
export type Layout = 'schmal' | 'mittel' | 'breit'

const bestimmeLayout = (): Layout => {
  const w = window.innerWidth
  const h = window.innerHeight
  if (w >= 900) return 'breit'
  // Handy quer: wenig Höhe – Seitenleiste statt Leiste unten, auch bei kleiner Breite
  if (w >= 600 || (w > h && h < 500)) return 'mittel'
  return 'schmal'
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState(bestimmeLayout)
  useEffect(() => {
    const pruefen = () => setLayout(bestimmeLayout())
    window.addEventListener('resize', pruefen)
    window.addEventListener('orientationchange', pruefen)
    return () => {
      window.removeEventListener('resize', pruefen)
      window.removeEventListener('orientationchange', pruefen)
    }
  }, [])
  return layout
}

/** In welchem Bereich eine Ansicht steht: einzeln (schmal/mittel), links (Liste) oder rechts (Detail) */
export type Bereich = 'einzeln' | 'liste' | 'detail'
export const BereichKontext = createContext<Bereich>('einzeln')
export const useBereich = () => useContext(BereichKontext)

export const NavKontext = createContext<Navigation | null>(null)

export function useNav() {
  const n = useContext(NavKontext)
  if (!n) throw new Error('useNav außerhalb der App')
  return n
}
