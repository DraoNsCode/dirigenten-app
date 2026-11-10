import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Anmeldung from './Anmeldung'
import Leiste, { type Reiter } from './Leiste'
import { DatenProvider } from './daten'
import { MeldungProvider } from './meldung'
import {
  BereichKontext,
  LIEDER_ANFANG,
  NavKontext,
  UEBUNGEN_ANFANG,
  useLayout,
  type Ansicht,
  type LiederEinstellung,
  type Navigation,
  type UebungenEinstellung,
} from './navigation'
import { heute, wochenAbstand } from './kalender'
import Woche from './ansichten/Woche'
import Suche from './ansichten/Suche'
import Uebernehmen from './ansichten/Uebernehmen'
import Lieder from './ansichten/Lieder'
import Menue from './ansichten/Menue'
import Liste from './ansichten/Liste'
import LiedSeite from './ansichten/LiedSeite'
import LiedNeu from './ansichten/LiedNeu'
import Uebungen from './ansichten/Uebungen'
import UebungSeite from './ansichten/UebungSeite'
import ErklaerungSeite from './ansichten/ErklaerungSeite'
import { SammlungProvider } from './uebungen/sammlung'

const START: Record<Reiter, Ansicht> = {
  woche: { v: 'woche' },
  lieder: { v: 'lieder' },
  uebungen: { v: 'uebungen' },
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
        <SammlungProvider>
          <Hauptansicht email={sitzung.user.email ?? ''} />
        </SammlungProvider>
      </DatenProvider>
    </MeldungProvider>
  )
}

function Hauptansicht({ email }: { email: string }) {
  const layout = useLayout()
  const breit = layout === 'breit'
  const [reiter, setReiter] = useState<Reiter>('woche')
  const [stapel, setStapel] = useState<Ansicht[]>([START.woche])
  const [woche, setWoche] = useState(0)
  const [lieder, setLieder] = useState<LiederEinstellung>(LIEDER_ANFANG)
  const [uebungen, setUebungen] = useState<UebungenEinstellung>(UEBUNGEN_ANFANG)

  // Bereich, der beim erneuten Tippen auf den Reiter nach oben scrollt (schmal: die Ansicht, breit: die Liste links)
  const ansicht = useRef<HTMLElement>(null)
  const aktuell = useRef({ reiter, stapel })
  aktuell.current = { reiter, stapel }

  // Erneutes Tippen auf den aktiven Reiter führt ganz nach oben (bzw. schließt erst eine geöffnete Ansicht)
  const wechsleReiter = useCallback((r: Reiter) => {
    if (r === aktuell.current.reiter && aktuell.current.stapel.length === 1) {
      ansicht.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setReiter(r)
    setStapel([START[r]])
  }, [])

  const wurzel = stapel[0]
  const oben = stapel[stapel.length - 1]
  const detail = stapel.length > 1 ? oben : undefined

  const nav = useMemo<Navigation>(
    () => ({
      // Breit: eine neue Ansicht ersetzt die rechte Seite; sonst liegt sie auf dem Stapel
      geh: (a) => setStapel((s) => (breit ? [s[0], a] : [...s, a])),
      ersetze: (a) => setStapel((s) => (s.length > 1 ? [...s.slice(0, -1), a] : [...s, a])),
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
      uebungen,
      setUebungen,
      layout,
      detail,
    }),
    [woche, wechsleReiter, stapel, lieder, uebungen, layout, breit, detail],
  )

  function zeige(a: Ansicht) {
    switch (a.v) {
      case 'woche':
        return <Woche />
      case 'suche':
        return <Suche evId={a.ev} />
      case 'uebernehmen':
        return <Uebernehmen evId={a.ev} />
      case 'lieder':
        return <Lieder />
      case 'menue':
        return <Menue email={email} />
      case 'liste':
        return <Liste art={a.art} />
      case 'lied':
        return <LiedSeite key={a.id} id={a.id} />
      case 'neu':
        return <LiedNeu />
      case 'uebungen':
        return <Uebungen />
      case 'uebung':
        return <UebungSeite key={a.id} id={a.id} />
      case 'erklaerung':
        return <ErklaerungSeite key={a.id} id={a.id} />
    }
  }

  const schluessel = (a: Ansicht) => `${a.v}-${'ev' in a ? a.ev : 'id' in a ? a.id : 'art' in a ? a.art : ''}`

  return (
    <NavKontext.Provider value={nav}>
      <div className={`app ${layout}`}>
        {layout !== 'schmal' && <Leiste aktiv={reiter} onWechsel={wechsleReiter} seitlich />}
        {breit ? (
          <>
            <BereichKontext.Provider value="liste">
              <main className="view liste-bereich" key={schluessel(wurzel)} ref={ansicht}>
                <div className="inhalt">{zeige(wurzel)}</div>
              </main>
            </BereichKontext.Provider>
            <BereichKontext.Provider value="detail">
              <section className="view detail-bereich" key={detail ? schluessel(detail) : 'leer'} aria-label="Details">
                <div className="inhalt">{detail ? zeige(detail) : <LeererBereich reiter={reiter} />}</div>
              </section>
            </BereichKontext.Provider>
          </>
        ) : (
          /* key: neue Ansicht beginnt oben */
          <main className="view" key={`${stapel.length}-${schluessel(oben)}`} ref={ansicht}>
            <div className="inhalt">{zeige(oben)}</div>
          </main>
        )}
        {layout === 'schmal' && <Leiste aktiv={reiter} onWechsel={wechsleReiter} />}
      </div>
    </NavKontext.Provider>
  )
}

function LeererBereich({ reiter }: { reiter: Reiter }) {
  const text: Record<Reiter, string> = {
    woche: 'Bei einem Termin „Lied eintragen“ oder „Lied vormerken“ wählen oder ein Lied antippen – es erscheint hier.',
    lieder: 'Ein Lied auswählen, um Angaben, Noten und Hinweise zu sehen.',
    uebungen: 'Eine Übung oder Erklärung auswählen, um sie hier zu lesen.',
    menue: 'Gottesdienste, Proben oder „Lied hinzufügen“ wählen.',
  }
  return (
    <div className="leer-bereich">
      <p>{text[reiter]}</p>
    </div>
  )
}
