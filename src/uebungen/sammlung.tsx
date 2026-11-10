import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { FORMAT, type Bereich, type Erklaerung, type GrafikDatei, type Gruppe, type SammlungDatei, type Uebung } from './typen'

// Übungssammlung: Der GitHub-Ablauf im privaten Repo chor-uebungen lädt bei jeder Änderung
// uebungen.json und grafiken.json in den privaten Supabase-Speicher „uebungen“ (nur angemeldete Konten).
// Geladen wird erst, wenn eine Übungs-Ansicht sie braucht; danach bleibt sie im Speicher der App.

const SPEICHER = 'uebungen'
/** Nach so langer Abwesenheit wird beim Zurückkehren in die App neu geladen */
const NEU_NACH_MS = 10 * 60_000

export type BereichInfo = Bereich & { gruppe: Gruppe }

export type Sammlung = {
  erzeugt: string
  gruppen: Gruppe[]
  bereiche: Map<string, BereichInfo>
  uebungen: Map<string, Uebung>
  erklaerungen: Map<string, Erklaerung>
  familien: Record<string, string[]>
  grafiken: GrafikDatei
}

type Stand = { art: 'leer' } | { art: 'laedt' } | { art: 'bereit'; s: Sammlung } | { art: 'fehler'; text: string; fehlt?: boolean }

type Kontext = { stand: Stand; anfordern: () => void; neuLaden: () => void }

const SammlungKontext = createContext<Kontext | null>(null)

async function ladeJson<T>(pfad: string): Promise<T> {
  const { data, error } = await supabase.storage.from(SPEICHER).download(pfad)
  if (error) throw error
  return JSON.parse(await data.text()) as T
}

function aufbereiten(d: SammlungDatei, grafiken: GrafikDatei): Sammlung {
  const bereiche = new Map<string, BereichInfo>()
  for (const g of d.gruppen) for (const b of g.bereiche) bereiche.set(b.id, { ...b, gruppe: g })
  return {
    erzeugt: d.erzeugt,
    gruppen: d.gruppen,
    bereiche,
    uebungen: new Map(d.uebungen.map((u) => [u.id, u])),
    erklaerungen: new Map(d.erklaerungen.map((e) => [e.id, e])),
    familien: d.familien ?? {},
    grafiken,
  }
}

function fehlerText(err: unknown): { text: string; fehlt?: boolean } {
  const text = err instanceof Error ? err.message : ((err as { message?: string })?.message ?? String(err))
  return /not.?found|nicht gefunden/i.test(text) ? { text, fehlt: true } : { text }
}

export function SammlungProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<Stand>({ art: 'leer' })
  const laeuft = useRef(false)
  const geladenUm = useRef(0)

  const neuLaden = useCallback(async () => {
    if (laeuft.current) return
    laeuft.current = true
    setStand((s) => (s.art === 'bereit' ? s : { art: 'laedt' }))
    try {
      const [d, g] = await Promise.all([ladeJson<SammlungDatei>('uebungen.json'), ladeJson<GrafikDatei>('grafiken.json')])
      if (d.format !== FORMAT) {
        throw new Error(`Die Übungsdaten haben das Format „${d.format}“, die App kennt „${FORMAT}“. Die App muss angepasst werden.`)
      }
      setStand({ art: 'bereit', s: aufbereiten(d, g) })
      geladenUm.current = Date.now()
    } catch (err) {
      // Eine schon geladene Sammlung bleibt stehen, wenn das Aktualisieren scheitert
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
  return <SammlungKontext.Provider value={wert}>{children}</SammlungKontext.Provider>
}

/** Zugriff auf die Sammlung; lädt sie beim ersten Gebrauch */
export function useSammlung() {
  const k = useContext(SammlungKontext)
  if (!k) throw new Error('useSammlung außerhalb von SammlungProvider')
  const { anfordern } = k
  useEffect(() => anfordern(), [anfordern])
  return k
}
