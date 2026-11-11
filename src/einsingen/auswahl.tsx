import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { EinsingenKontext } from './daten'

// Auswahl fürs Einsingen: welche Einträge (Übungen oder Gruppen) in welcher Reihenfolge als Folien exportiert werden.
// Sie ist kein Probenplan und liegt nur auf diesem Gerät, bis sie geleert wird; getrennt von der Auswahl im Reiter „Übungen“.
// Neu Ausgewähltes kommt an seinen Platz in der Reihenfolge der Liste (Phase, dann reihenfolge.md);
// mit den Pfeilen lässt sich die Reihenfolge danach ändern.

const SPEICHER_SCHLUESSEL = 'dirigenten-einsingen-auswahl'

type Kontext = {
  ids: string[]
  enthaelt: (id: string) => boolean
  /** Fügt hinzu oder entfernt; gibt zurück, ob die Übung danach in der Auswahl ist */
  umschalten: (id: string) => boolean
  entfernen: (id: string) => void
  verschieben: (id: string, richtung: -1 | 1) => void
  leeren: () => void
}

const AuswahlKontext = createContext<Kontext | null>(null)

function gemerkt(): string[] {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) ?? '[]')
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function EinsingAuswahlProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(gemerkt)
  const einsingen = useContext(EinsingenKontext)
  const d = einsingen?.stand.art === 'bereit' ? einsingen.stand.d : null

  // Platz jedes Eintrags in der Liste (Phase, dann reihenfolge.md)
  const rang = useMemo(() => new Map((d?.phasen ?? []).flatMap((p) => p.eintraege).map((e, i) => [e.id, i])), [d])

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(ids))
    } catch {
      // ohne Merken weiter
    }
  }, [ids])

  const enthaelt = useCallback((id: string) => ids.includes(id), [ids])

  const umschalten = useCallback(
    (id: string) => {
      const drin = ids.includes(id)
      setIds((alt) => {
        if (alt.includes(id)) return alt.filter((x) => x !== id)
        const r = rang.get(id) ?? Infinity
        const platz = alt.findIndex((x) => (rang.get(x) ?? Infinity) > r)
        return platz < 0 ? [...alt, id] : [...alt.slice(0, platz), id, ...alt.slice(platz)]
      })
      return !drin
    },
    [ids, rang],
  )

  const entfernen = useCallback((id: string) => setIds((alt) => alt.filter((x) => x !== id)), [])

  const verschieben = useCallback((id: string, richtung: -1 | 1) => {
    setIds((alt) => {
      const i = alt.indexOf(id)
      const j = i + richtung
      if (i < 0 || j < 0 || j >= alt.length) return alt
      const neu = [...alt]
      ;[neu[i], neu[j]] = [neu[j], neu[i]]
      return neu
    })
  }, [])

  const leeren = useCallback(() => setIds([]), [])

  const wert = useMemo(
    () => ({ ids, enthaelt, umschalten, entfernen, verschieben, leeren }),
    [ids, enthaelt, umschalten, entfernen, verschieben, leeren],
  )
  return <AuswahlKontext.Provider value={wert}>{children}</AuswahlKontext.Provider>
}

export function useEinsingAuswahl() {
  const k = useContext(AuswahlKontext)
  if (!k) throw new Error('useEinsingAuswahl außerhalb von EinsingAuswahlProvider')
  return k
}
