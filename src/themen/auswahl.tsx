import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { InhaltKontext } from './daten'
import { wahlSchluessel, type Wahl } from './folie'

// Auswahl im neuen Aufbau: welche Grundübungen und Stufen in welcher Reihenfolge als Folien exportiert werden.
// Von einer Familie lassen sich mehrere Stufen zugleich auswählen (Daniel, 14.11.2026).
// Sie ist kein Probenplan und liegt nur auf diesem Gerät, bis sie geleert wird; getrennt von den Auswahlen der Reiter
// „Übungen“ und „Einsingen“. Neu Ausgewähltes kommt an seinen Platz in der Reihenfolge der Liste
// (Phase, Familie, Grundübung vor den Stufen); mit den Pfeilen lässt sich die Reihenfolge danach ändern.

const SPEICHER_SCHLUESSEL = 'dirigenten-themen-auswahl'

type Kontext = {
  /** Schlüssel „familie/einheit“ in der Reihenfolge der Folien */
  schluessel: string[]
  enthaelt: (w: Wahl) => boolean
  /** Ausgewählte Einheiten einer Familie */
  vonFamilie: (familie: string) => string[]
  /** Fügt hinzu oder entfernt; gibt zurück, ob die Einheit danach in der Auswahl ist */
  umschalten: (w: Wahl) => boolean
  entfernen: (schluessel: string) => void
  /** Nimmt alle Einheiten einer Familie aus der Auswahl */
  familieEntfernen: (familie: string) => void
  verschieben: (schluessel: string, richtung: -1 | 1) => void
  leeren: () => void
}

const AuswahlKontext = createContext<Kontext | null>(null)

function gemerkt(): string[] {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) ?? '[]')
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string' && x.includes('/')) : []
  } catch {
    return []
  }
}

export function ThemenAuswahlProvider({ children }: { children: ReactNode }) {
  const [schluessel, setSchluessel] = useState<string[]>(gemerkt)
  const inhalt = useContext(InhaltKontext)
  const d = inhalt?.stand.art === 'bereit' ? inhalt.stand.d : null

  // Platz jeder Einheit in der Liste: Familie für Familie, die Grundübung vor ihren Stufen
  const rang = useMemo(() => {
    const r = new Map<string, number>()
    for (const f of d?.familien ?? []) for (const einheit of ['grund', ...f.stufen.map((s) => s.id)]) r.set(wahlSchluessel({ familie: f.id, einheit }), r.size)
    return r
  }, [d])

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(schluessel))
    } catch {
      // ohne Merken weiter
    }
  }, [schluessel])

  const enthaelt = useCallback((w: Wahl) => schluessel.includes(wahlSchluessel(w)), [schluessel])
  const vonFamilie = useCallback(
    (familie: string) => schluessel.filter((s) => s.startsWith(familie + '/')).map((s) => s.slice(familie.length + 1)),
    [schluessel],
  )

  const umschalten = useCallback(
    (w: Wahl) => {
      const s = wahlSchluessel(w)
      const drin = schluessel.includes(s)
      setSchluessel((alt) => {
        if (alt.includes(s)) return alt.filter((x) => x !== s)
        const r = rang.get(s) ?? Infinity
        const platz = alt.findIndex((x) => (rang.get(x) ?? Infinity) > r)
        return platz < 0 ? [...alt, s] : [...alt.slice(0, platz), s, ...alt.slice(platz)]
      })
      return !drin
    },
    [schluessel, rang],
  )

  const entfernen = useCallback((s: string) => setSchluessel((alt) => alt.filter((x) => x !== s)), [])
  const familieEntfernen = useCallback((familie: string) => setSchluessel((alt) => alt.filter((x) => !x.startsWith(familie + '/'))), [])

  const verschieben = useCallback((s: string, richtung: -1 | 1) => {
    setSchluessel((alt) => {
      const i = alt.indexOf(s)
      const j = i + richtung
      if (i < 0 || j < 0 || j >= alt.length) return alt
      const neu = [...alt]
      ;[neu[i], neu[j]] = [neu[j], neu[i]]
      return neu
    })
  }, [])

  const leeren = useCallback(() => setSchluessel([]), [])

  const wert = useMemo(
    () => ({ schluessel, enthaelt, vonFamilie, umschalten, entfernen, familieEntfernen, verschieben, leeren }),
    [schluessel, enthaelt, vonFamilie, umschalten, entfernen, familieEntfernen, verschieben, leeren],
  )
  return <AuswahlKontext.Provider value={wert}>{children}</AuswahlKontext.Provider>
}

export function useThemenAuswahl() {
  const k = useContext(AuswahlKontext)
  if (!k) throw new Error('useThemenAuswahl außerhalb von ThemenAuswahlProvider')
  return k
}
