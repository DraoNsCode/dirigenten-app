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
  | { v: 'neu' }
  | { v: 'uebungen' }
  | { v: 'uebung'; id: string }
  | { v: 'erklaerung'; id: string }
  | { v: 'auswahl' }
  | { v: 'einsingen' }
  | { v: 'einsingen-uebung'; id: string }
  | { v: 'einsingen-auswahl' }
  | { v: 'einsingen-gruppe'; id: string }
  | { v: 'themen' }
  | { v: 'thema'; id: string }
  | { v: 'familie'; id: string }

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

/** Einstellungen im Reiter Übungen; bleiben erhalten, solange die App offen ist */
export type UebungenEinstellung = {
  suche: string
  /** Kennung eines Bereichs oder 'alle' */
  bereich: string
  schwierigkeit: 'alle' | '1' | '2' | '3'
  stand: 'alle' | 'entwurf' | 'abgenommen' | 'ueberarbeiten'
  art: 'alle' | 'uebung' | 'erklaerung'
}

export const UEBUNGEN_ANFANG: UebungenEinstellung = {
  suche: '',
  bereich: 'alle',
  schwierigkeit: 'alle',
  stand: 'alle',
  art: 'alle',
}

export type Navigation = {
  geh: (a: Ansicht) => void
  /** oberste Ansicht durch eine andere ersetzen (z. B. nach dem Anlegen eines Liedes dessen Seite) */
  ersetze: (a: Ansicht) => void
  zurueck: () => void
  reiter: (r: Reiter) => void
  /** Woche mit diesem Datum unter „Wochenplan“ öffnen */
  zurWoche: (datum: Date) => void
  /** Wochen-Abstand zur aktuellen Woche (0 = diese Woche) */
  woche: number
  setWoche: (w: number) => void
  /** Ansicht, von der aus die aktuelle geöffnet wurde (für die Beschriftung von „Zurück“) */
  vorher: Ansicht | undefined
  lieder: LiederEinstellung
  setLieder: (e: LiederEinstellung) => void
  uebungen: UebungenEinstellung
  setUebungen: (e: UebungenEinstellung) => void
  /** Anzeigemodus nach Bildschirmbreite */
  layout: Layout
  /** Im breiten Modus die Ansicht im rechten Bereich (sonst die oberste Ansicht, falls nicht die Wurzel) */
  detail: Ansicht | undefined
}

/**
 * Anzeigemodi (Daniel, 8.11.2026: Stufe 1 und 2; Handy quer ordentlich umsetzen statt sperren)
 * - schmal: Handy hochkant, unter 600 px – Leiste unten, eine Ansicht
 * - mittel: 600 bis 899 px (Tablet hochkant) und jedes Handy quer – Seitenleiste, eine Ansicht
 * - breit: ab 900 px Breite und mindestens 500 px Höhe (Tablet quer, Laptop, PC) – Seitenleiste, links Liste, rechts Detail
 * Handys quer bekommen nie zwei Bereiche, auch große iPhones mit über 900 px Breite nicht (Daniel, 8.11.2026).
 */
export type Layout = 'schmal' | 'mittel' | 'breit'

/** Unter dieser Höhe gilt ein Querformat als Handy */
const HANDY_HOEHE = 500

const bestimmeLayout = (): Layout => {
  const w = window.innerWidth
  const h = window.innerHeight
  const handyQuer = w > h && h < HANDY_HOEHE
  if (w >= 900 && !handyQuer) return 'breit'
  // Handy quer: wenig Höhe – Seitenleiste statt Leiste unten, eine Ansicht
  if (w >= 600 || handyQuer) return 'mittel'
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
