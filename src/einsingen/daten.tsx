import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { FORMAT, type EinsingDatei, type EinsingUebung } from './typen'

// Übungen fürs Einsingen: Der GitHub-Ablauf im privaten Repo dirigenten-app-uebungen lädt bei jeder Änderung
// dirigenten-uebungen.json in den privaten Supabase-Speicher „uebungen“ (nur angemeldete Konten).
// Geladen wird erst, wenn die Ansicht sie braucht; danach bleibt sie im Speicher der App.

const SPEICHER = 'uebungen'
const DATEI = 'dirigenten-uebungen.json'
/** Nach so langer Abwesenheit wird beim Zurückkehren in die App neu geladen */
const NEU_NACH_MS = 10 * 60_000

export type Phase = { name: string; uebungen: EinsingUebung[] }
export type Einsingen = { phasen: Phase[]; uebungen: Map<string, EinsingUebung> }

export type EinsingStand =
  | { art: 'leer' }
  | { art: 'laedt' }
  | { art: 'bereit'; d: Einsingen }
  | { art: 'fehler'; text: string; fehlt?: boolean }

type Kontext = { stand: EinsingStand; anfordern: () => void; neuLaden: () => void }

export const EinsingenKontext = createContext<Kontext | null>(null)

export function aufbereiten(datei: EinsingDatei): Einsingen {
  const phasen: Phase[] = datei.phasen.map((name) => ({ name, uebungen: datei.uebungen.filter((u) => u.phase === name) }))
  return { phasen, uebungen: new Map(datei.uebungen.map((u) => [u.id, u])) }
}

function fehlerText(err: unknown): { text: string; fehlt?: boolean } {
  const text = err instanceof Error ? err.message : ((err as { message?: string })?.message ?? String(err))
  return /not.?found|nicht gefunden/i.test(text) ? { text, fehlt: true } : { text }
}

export function EinsingenProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<EinsingStand>({ art: 'leer' })
  const laeuft = useRef(false)
  const geladenUm = useRef(0)

  const neuLaden = useCallback(async () => {
    if (laeuft.current) return
    laeuft.current = true
    setStand((s) => (s.art === 'bereit' ? s : { art: 'laedt' }))
    try {
      const { data, error } = await supabase.storage.from(SPEICHER).download(DATEI)
      if (error) throw error
      const datei = JSON.parse(await data.text()) as EinsingDatei
      if (datei.format !== FORMAT) {
        throw new Error(`Die Übungen haben das Format ${datei.format}, die App kennt ${FORMAT}. Die App muss angepasst werden.`)
      }
      setStand({ art: 'bereit', d: aufbereiten(datei) })
      geladenUm.current = Date.now()
    } catch (err) {
      // Schon geladene Übungen bleiben stehen, wenn das Aktualisieren scheitert
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
  return <EinsingenKontext.Provider value={wert}>{children}</EinsingenKontext.Provider>
}

/** Zugriff auf die Übungen fürs Einsingen; lädt sie beim ersten Gebrauch */
export function useEinsingen() {
  const k = useContext(EinsingenKontext)
  if (!k) throw new Error('useEinsingen außerhalb von EinsingenProvider')
  const { anfordern } = k
  useEffect(() => anfordern(), [anfordern])
  return k
}
