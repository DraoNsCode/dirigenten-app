import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Auswahl für den Export als Probenfolien. Sie ist kein Probenplan und wird nicht in der Datenbank gespeichert;
// damit sie einen Neustart der App übersteht, merkt sich das Gerät sie (nur dieses Gerät).

export type AuswahlPunkt = {
  art: 'uebung' | 'erklaerung'
  id: string
  /** Bei Übungen mit Stufen in einer Datei: die gewählte Stufe */
  stufe?: number
  /** Transposition in Halbtönen für den Export */
  schritte: number
}

export const schluesselVon = (p: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>) => `${p.art}:${p.id}:${p.stufe ?? ''}`

type Kontext = {
  punkte: AuswahlPunkt[]
  enthaelt: (p: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>) => boolean
  umschalten: (p: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>) => boolean
  entfernen: (schluessel: string) => void
  verschieben: (schluessel: string, richtung: -1 | 1) => void
  setzeSchritte: (schluessel: string, schritte: number) => void
  leeren: () => void
}

const SPEICHER_SCHLUESSEL = 'chorapp-uebungsauswahl'
const AuswahlKontext = createContext<Kontext | null>(null)

function gemerkt(): AuswahlPunkt[] {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) ?? '[]')
    return Array.isArray(d) ? d.filter((p) => p && typeof p.id === 'string' && (p.art === 'uebung' || p.art === 'erklaerung')) : []
  } catch {
    return []
  }
}

export function AuswahlProvider({ children }: { children: ReactNode }) {
  const [punkte, setPunkte] = useState<AuswahlPunkt[]>(gemerkt)

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(punkte))
    } catch {
      // ohne Merken weiter
    }
  }, [punkte])

  const enthaelt = useCallback((p: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>) => punkte.some((x) => schluesselVon(x) === schluesselVon(p)), [punkte])

  /** Fügt hinzu oder entfernt; gibt zurück, ob der Punkt danach in der Auswahl ist */
  const umschalten = useCallback(
    (p: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>) => {
      const k = schluesselVon(p)
      const drin = punkte.some((x) => schluesselVon(x) === k)
      setPunkte((alt) => (drin ? alt.filter((x) => schluesselVon(x) !== k) : [...alt, { ...p, schritte: 0 }]))
      return !drin
    },
    [punkte],
  )

  const entfernen = useCallback((k: string) => setPunkte((alt) => alt.filter((x) => schluesselVon(x) !== k)), [])

  const verschieben = useCallback((k: string, richtung: -1 | 1) => {
    setPunkte((alt) => {
      const i = alt.findIndex((x) => schluesselVon(x) === k)
      const j = i + richtung
      if (i < 0 || j < 0 || j >= alt.length) return alt
      const neu = [...alt]
      ;[neu[i], neu[j]] = [neu[j], neu[i]]
      return neu
    })
  }, [])

  const setzeSchritte = useCallback(
    (k: string, schritte: number) => setPunkte((alt) => alt.map((x) => (schluesselVon(x) === k ? { ...x, schritte } : x))),
    [],
  )

  const leeren = useCallback(() => setPunkte([]), [])

  const wert = useMemo(
    () => ({ punkte, enthaelt, umschalten, entfernen, verschieben, setzeSchritte, leeren }),
    [punkte, enthaelt, umschalten, entfernen, verschieben, setzeSchritte, leeren],
  )
  return <AuswahlKontext.Provider value={wert}>{children}</AuswahlKontext.Provider>
}

export function useAuswahl() {
  const k = useContext(AuswahlKontext)
  if (!k) throw new Error('useAuswahl außerhalb von AuswahlProvider')
  return k
}
