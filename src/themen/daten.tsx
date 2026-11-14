import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { FORMATE, type Familie, type InhaltDatei, type Thema } from './typen'

// Themen und Familien (neuer Aufbau): Der GitHub-Ablauf im privaten Repo dirigenten-app-uebungen lädt bei jeder
// Änderung dirigenten-inhalt.json in den privaten Supabase-Speicher „uebungen“ (nur angemeldete Konten).
// Geladen wird erst, wenn die Ansicht sie braucht; danach bleibt sie im Speicher der App.

const SPEICHER = 'uebungen'
const DATEI = 'dirigenten-inhalt.json'
/** Nach so langer Abwesenheit wird beim Zurückkehren in die App neu geladen */
const NEU_NACH_MS = 10 * 60_000

export type Inhalt = {
  themen: Thema[]
  thema: Map<string, Thema>
  familie: Map<string, Familie>
  /** Familien, die auf keiner Themenseite stehen */
  ohneThema: Familie[]
}

export type InhaltStand = { art: 'leer' } | { art: 'laedt' } | { art: 'bereit'; d: Inhalt } | { art: 'fehler'; text: string; fehlt?: boolean }

type Kontext = { stand: InhaltStand; anfordern: () => void; neuLaden: () => void }

export const InhaltKontext = createContext<Kontext | null>(null)

export function aufbereiten(datei: InhaltDatei): Inhalt {
  return {
    themen: datei.themen,
    thema: new Map(datei.themen.map((t) => [t.id, t])),
    familie: new Map(datei.familien.map((f) => [f.id, f])),
    ohneThema: datei.familien.filter((f) => !f.thema),
  }
}

function fehlerText(err: unknown): { text: string; fehlt?: boolean } {
  const text = err instanceof Error ? err.message : ((err as { message?: string })?.message ?? String(err))
  return /not.?found|nicht gefunden/i.test(text) ? { text, fehlt: true } : { text }
}

export function InhaltProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<InhaltStand>({ art: 'leer' })
  const laeuft = useRef(false)
  const geladenUm = useRef(0)

  const neuLaden = useCallback(async () => {
    if (laeuft.current) return
    laeuft.current = true
    setStand((s) => (s.art === 'bereit' ? s : { art: 'laedt' }))
    try {
      const { data, error } = await supabase.storage.from(SPEICHER).download(DATEI)
      if (error) throw error
      const datei = JSON.parse(await data.text()) as InhaltDatei
      if (!FORMATE.includes(datei.format)) {
        throw new Error(`Die Themen haben das Format ${datei.format}, die App kennt ${FORMATE.join(' und ')}. Die App muss angepasst werden.`)
      }
      setStand({ art: 'bereit', d: aufbereiten(datei) })
      geladenUm.current = Date.now()
    } catch (err) {
      // Schon Geladenes bleibt stehen, wenn das Aktualisieren scheitert
      setStand((s) => (s.art === 'bereit' ? s : { art: 'fehler', ...fehlerText(err) }))
    } finally {
      laeuft.current = false
    }
  }, [])

  const anfordern = useCallback(() => {
    if (!geladenUm.current && !laeuft.current) neuLaden()
  }, [neuLaden])

  useEffect(() => {
    const sichtbar = () => {
      if (document.visibilityState === 'visible' && geladenUm.current && Date.now() - geladenUm.current > NEU_NACH_MS) neuLaden()
    }
    document.addEventListener('visibilitychange', sichtbar)
    return () => document.removeEventListener('visibilitychange', sichtbar)
  }, [neuLaden])

  const wert = useMemo(() => ({ stand, anfordern, neuLaden }), [stand, anfordern, neuLaden])
  return <InhaltKontext.Provider value={wert}>{children}</InhaltKontext.Provider>
}

/** Zugriff auf Themen und Familien; lädt sie beim ersten Gebrauch */
export function useInhalt() {
  const k = useContext(InhaltKontext)
  if (!k) throw new Error('useInhalt außerhalb von InhaltProvider')
  const { anfordern } = k
  useEffect(() => anfordern(), [anfordern])
  return k
}
