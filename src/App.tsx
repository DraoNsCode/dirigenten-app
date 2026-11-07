import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Anmeldung from './Anmeldung'
import Leiste, { type Reiter } from './Leiste'
import { DatenProvider } from './daten'
import { MeldungProvider } from './meldung'
import { LIEDER_ANFANG, NavKontext, type Ansicht, type LiederEinstellung, type Navigation } from './navigation'
import { heute, wochenAbstand } from './kalender'
import Woche from './ansichten/Woche'
import Suche from './ansichten/Suche'
import Uebernehmen from './ansichten/Uebernehmen'
import Lieder from './ansichten/Lieder'
import Menue from './ansichten/Menue'
import Liste from './ansichten/Liste'
import LiedSeite from './ansichten/LiedSeite'

const START: Record<Reiter, Ansicht> = {
  woche: { v: 'woche' },
  lieder: { v: 'lieder' },
  menue: { v: 'menue' },
}

export default function App() {
  // undefined = wird noch geprüft, null = nicht angemeldet
  const [sitzung, setSitzung] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSitzung(data.session))
    const { data } = supabase.auth.onAuthStateChange((_ereignis, session) => setSitzung(session))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sitzung === undefined) {
    return (
      <div className="app">
        <div className="laden">Lädt …</div>
      </div>
    )
  }

  if (!sitzung) return <Anmeldung />

  return (
    <MeldungProvider>
      <DatenProvider>
        <Hauptansicht email={sitzung.user.email ?? ''} />
      </DatenProvider>
    </MeldungProvider>
  )
}

function Hauptansicht({ email }: { email: string }) {
  const [reiter, setReiter] = useState<Reiter>('woche')
  const [stapel, setStapel] = useState<Ansicht[]>([START.woche])
  const [woche, setWoche] = useState(0)
  const [lieder, setLieder] = useState<LiederEinstellung>(LIEDER_ANFANG)

  const ansicht = useRef<HTMLElement>(null)
  const aktuell = useRef({ reiter, stapel })
  aktuell.current = { reiter, stapel }

  // Erneutes Tippen auf den aktiven Reiter führt ganz nach oben
  const wechsleReiter = useCallback((r: Reiter) => {
    if (r === aktuell.current.reiter && aktuell.current.stapel.length === 1) {
      ansicht.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setReiter(r)
    setStapel([START[r]])
  }, [])

  const nav = useMemo<Navigation>(
    () => ({
      geh: (a) => setStapel((s) => [...s, a]),
      zurueck: () => setStapel((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      reiter: wechsleReiter,
      zurWoche: (datum) => {
        setWoche(wochenAbstand(datum, heute()))
        setReiter('woche')
        setStapel([START.woche])
      },
      woche,
      setWoche,
      vorher: stapel.length > 1 ? stapel[stapel.length - 2] : undefined,
      lieder,
      setLieder,
    }),
    [woche, wechsleReiter, stapel, lieder],
  )

  const oben = stapel[stapel.length - 1]

  return (
    <NavKontext.Provider value={nav}>
      <div className="app">
        {/* key: neue Ansicht beginnt oben */}
        <main className="view" key={`${stapel.length}-${oben.v}`} ref={ansicht}>
          {oben.v === 'woche' && <Woche />}
          {oben.v === 'suche' && <Suche evId={oben.ev} />}
          {oben.v === 'uebernehmen' && <Uebernehmen evId={oben.ev} />}
          {oben.v === 'lieder' && <Lieder />}
          {oben.v === 'menue' && <Menue email={email} />}
          {oben.v === 'liste' && <Liste art={oben.art} />}
          {oben.v === 'lied' && <LiedSeite key={oben.id} id={oben.id} />}
        </main>
        <Leiste aktiv={reiter} onWechsel={wechsleReiter} />
      </div>
    </NavKontext.Provider>
  )
}
