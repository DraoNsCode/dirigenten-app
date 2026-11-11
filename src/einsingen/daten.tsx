import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { FORMATE, type EinsingDatei, type EinsingUebung, type EintragDatei } from './typen'

// Übungen fürs Einsingen: Der GitHub-Ablauf im privaten Repo dirigenten-app-uebungen lädt bei jeder Änderung
// dirigenten-uebungen.json in den privaten Supabase-Speicher „uebungen“ (nur angemeldete Konten).
// Geladen wird erst, wenn die Ansicht sie braucht; danach bleibt sie im Speicher der App.

const SPEICHER = 'uebungen'
const DATEI = 'dirigenten-uebungen.json'
/** Nach so langer Abwesenheit wird beim Zurückkehren in die App neu geladen */
const NEU_NACH_MS = 10 * 60_000

/** Eintrag der Liste mit seinen Übungen: eine einzelne Übung oder eine Gruppe kurzer Übungen */
export type Eintrag =
  | { art: 'uebung'; id: string; name: string; phase: string; u: EinsingUebung }
  | { art: 'gruppe'; id: string; name: string; phase: string; folientitel: string; teile: EinsingUebung[] }

export type Phase = { name: string; eintraege: Eintrag[] }
export type Einsingen = { phasen: Phase[]; uebungen: Map<string, EinsingUebung>; eintraege: Map<string, Eintrag> }

/** Die Übungen eines Eintrags */
export const uebungenVon = (e: Eintrag): EinsingUebung[] => (e.art === 'uebung' ? [e.u] : e.teile)

export type EinsingStand =
  | { art: 'leer' }
  | { art: 'laedt' }
  | { art: 'bereit'; d: Einsingen }
  | { art: 'fehler'; text: string; fehlt?: boolean }

type Kontext = { stand: EinsingStand; anfordern: () => void; neuLaden: () => void }

export const EinsingenKontext = createContext<Kontext | null>(null)

export function aufbereiten(datei: EinsingDatei): Einsingen {
  const uebungen = new Map(datei.uebungen.map((u) => [u.id, u]))
  // Format 1 kennt keine Einträge: jede Übung ist einer
  const roh: EintragDatei[] = datei.eintraege ?? datei.uebungen.map((u) => ({ phase: u.phase, art: 'uebung', id: u.id }))
  const liste: Eintrag[] = []
  for (const e of roh) {
    if (e.art === 'uebung') {
      const u = uebungen.get(e.id)
      if (u) liste.push({ art: 'uebung', id: u.id, name: u.name, phase: e.phase, u })
    } else {
      const teile = e.teile.map((id) => uebungen.get(id)).filter((u): u is EinsingUebung => !!u)
      if (teile.length) liste.push({ art: 'gruppe', id: e.id, name: e.name, phase: e.phase, folientitel: e.folientitel, teile })
    }
  }
  const phasen: Phase[] = datei.phasen.map((name) => ({ name, eintraege: liste.filter((e) => e.phase === name) }))
  return { phasen, uebungen, eintraege: new Map(liste.map((e) => [e.id, e])) }
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
      if (!FORMATE.includes(datei.format)) {
        throw new Error(`Die Übungen haben das Format ${datei.format}, die App kennt ${FORMATE.join(' und ')}. Die App muss angepasst werden.`)
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
