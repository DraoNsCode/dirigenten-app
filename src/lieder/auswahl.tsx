import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Lieder für die Probenfolien (Daniel, 18.11.2026): einzeln ausgewählt, nicht automatisch aus der Probe im Wochenplan;
// auf den Folien als zweiter Block nach den Übungen. Die Auswahl liegt wie die der Übungen nur auf diesem Gerät.
// proFolie: wie viele gewöhnliche Systeme (zwei Notenzeilen) höchstens auf eine Folie kommen – zum Ausprobieren
// 2 oder 3 (Daniel: „drei Systeme zumindest probieren“).

const SPEICHER_LIEDER = 'dirigenten-folien-lieder'
const SPEICHER_SYSTEME = 'dirigenten-folien-systeme'

type Kontext = {
  ids: number[]
  enthaelt: (id: number) => boolean
  /** Fügt hinten an oder entfernt; gibt zurück, ob das Lied danach ausgewählt ist */
  umschalten: (id: number) => boolean
  entfernen: (id: number) => void
  ordnen: (reihenfolge: number[]) => void
  leeren: () => void
  proFolie: 2 | 3
  setProFolie: (n: 2 | 3) => void
}

const LiederKontext = createContext<Kontext | null>(null)

function lesen<T>(schluessel: string, pruefen: (x: unknown) => T | null, ersatz: T): T {
  try {
    const r = pruefen(JSON.parse(localStorage.getItem(schluessel) ?? 'null'))
    return r ?? ersatz
  } catch {
    return ersatz
  }
}

export function LiederAuswahlProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(() =>
    lesen(SPEICHER_LIEDER, (x) => (Array.isArray(x) ? x.filter((v): v is number => Number.isInteger(v)) : null), []),
  )
  const [proFolie, setProFolieState] = useState<2 | 3>(() => lesen(SPEICHER_SYSTEME, (x) => (x === 3 ? 3 : x === 2 ? 2 : null), 2))

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER_LIEDER, JSON.stringify(ids))
    } catch {
      // ohne Merken weiter
    }
  }, [ids])

  const setProFolie = useCallback((n: 2 | 3) => {
    setProFolieState(n)
    try {
      localStorage.setItem(SPEICHER_SYSTEME, JSON.stringify(n))
    } catch {
      // ohne Merken weiter
    }
  }, [])

  const enthaelt = useCallback((id: number) => ids.includes(id), [ids])
  const umschalten = useCallback(
    (id: number) => {
      const drin = ids.includes(id)
      setIds((alt) => (alt.includes(id) ? alt.filter((x) => x !== id) : [...alt, id]))
      return !drin
    },
    [ids],
  )
  const entfernen = useCallback((id: number) => setIds((alt) => alt.filter((x) => x !== id)), [])
  const ordnen = useCallback((reihenfolge: number[]) => {
    setIds((alt) => {
      const neu = reihenfolge.filter((x) => alt.includes(x))
      return [...neu, ...alt.filter((x) => !neu.includes(x))]
    })
  }, [])
  const leeren = useCallback(() => setIds([]), [])

  const wert = useMemo(
    () => ({ ids, enthaelt, umschalten, entfernen, ordnen, leeren, proFolie, setProFolie }),
    [ids, enthaelt, umschalten, entfernen, ordnen, leeren, proFolie, setProFolie],
  )
  return <LiederKontext.Provider value={wert}>{children}</LiederKontext.Provider>
}

export function useLiederAuswahl() {
  const k = useContext(LiederKontext)
  if (!k) throw new Error('useLiederAuswahl außerhalb von LiederAuswahlProvider')
  return k
}
