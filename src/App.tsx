import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { AuswahlProvider } from './uebungen/auswahl'
import Auswahl from './ansichten/Auswahl'
import Vorbereiten from './ansichten/Vorbereiten'
import Probe from './ansichten/Probe'
import ThemaSeite from './ansichten/ThemaSeite'
import FamilieSeite from './ansichten/FamilieSeite'
import { InhaltProvider } from './themen/daten'
import { ThemenAuswahlProvider } from './themen/auswahl'
import ProbeAuswahl from './ansichten/ProbeAuswahl'
import { IST_IOS, useZurueckWischen, VERSATZ } from './wischen'

const START: Record<Reiter, Ansicht> = {
  woche: { v: 'woche' },
  lieder: { v: 'lieder' },
  uebungen: { v: 'vorbereiten' },
  einsingen: { v: 'probe' },
  menue: { v: 'menue' },
  sammlung: { v: 'uebungen' },
}

/**
 * Verlauf (Daniel, 16.11.2026): Jede geöffnete Ansicht ist ein Eintrag im Browserverlauf. So funktionieren
 * die Zurück-Geste auf Android und die Zurück-Taste im Browser. Jeder Eintrag trägt den ganzen Stapel; ein
 * Reiterwechsel erzeugt keinen Zurück-Schritt (der Verlauf wird auf den ersten Eintrag zurückgesetzt).
 * Nicht auf iPhone/iPad: Dort liefe sonst die eingebaute Wischgeste von iOS parallel zur eigenen
 * (wischen.tsx) – ohne Verlaufseinträge hat die eingebaute Geste kein Ziel und bleibt untätig.
 */
const MIT_VERLAUF = !IST_IOS
type VerlaufsEintrag = { dirigentenApp: 1; tiefe: number; reiter: Reiter; stapel: Ansicht[]; generation: number }
const istEintrag = (x: unknown): x is VerlaufsEintrag => !!x && (x as VerlaufsEintrag).dirigentenApp === 1
const gleich = (a: Ansicht[], b: Ansicht[]) => JSON.stringify(a) === JSON.stringify(b)

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
          <AuswahlProvider>
            <InhaltProvider>
              <ThemenAuswahlProvider>
                <Hauptansicht email={sitzung.user.email ?? ''} />
              </ThemenAuswahlProvider>
            </InhaltProvider>
          </AuswahlProvider>
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

  // ---------- Verlauf ----------
  /** Tiefe des angezeigten Eintrags im Verlauf (0 = erster Eintrag der App) */
  const tiefe = useRef(0)
  /** Scrollstand je Stapelplatz, damit eine Ansicht beim Zurückgehen dort steht, wo man sie verlassen hat */
  const scrollMerker = useRef<number[]>([])
  const scrollZiel = useRef<number | null>(null)
  /** Eintrag, der nach dem Zurückspulen des Verlaufs (Reiterwechsel) gesetzt wird */
  const ruecksetzen = useRef<VerlaufsEintrag | null>(null)
  /** Jeder Neubeginn (Start, Reiterwechsel) ist eine neue Generation; ältere Einträge (z. B. „vorwärts“
   *  in einen verlassenen Reiter) werden nicht angezeigt */
  const generation = useRef(Date.now())
  const ignoriereNaechstes = useRef(false)
  const eintrag = (t: number, r: Reiter, s: Ansicht[]): VerlaufsEintrag => ({
    dirigentenApp: 1,
    tiefe: t,
    reiter: r,
    stapel: s,
    generation: generation.current,
  })

  const setze = useCallback((r: Reiter, s: Ansicht[]) => {
    aktuell.current = { reiter: r, stapel: s }
    setReiter(r)
    setStapel(s)
  }, [])
  const merkeScroll = () => {
    scrollMerker.current[aktuell.current.stapel.length - 1] = ansicht.current?.scrollTop ?? 0
  }

  /** Neue Ansicht: neuer Eintrag im Verlauf */
  const vorwaerts = useCallback((s: Ansicht[]) => {
    merkeScroll()
    if (MIT_VERLAUF) {
      tiefe.current += 1
      history.pushState(eintrag(tiefe.current, aktuell.current.reiter, s), '')
    }
    setze(aktuell.current.reiter, s)
  }, [setze])

  /** Oberste Ansicht austauschen, ohne Zurück-Schritt */
  const ersetzeOben = useCallback((s: Ansicht[]) => {
    if (MIT_VERLAUF) history.replaceState(eintrag(tiefe.current, aktuell.current.reiter, s), '')
    setze(aktuell.current.reiter, s)
  }, [setze])

  /** Neu beginnen (Reiterwechsel, Sprung in eine Woche): keine Zurück-Schritte */
  const neuBeginnen = useCallback((r: Reiter, s: Ansicht[]) => {
    setze(r, s)
    scrollMerker.current = []
    if (!MIT_VERLAUF) return
    generation.current += 1
    const e = eintrag(0, r, s)
    const d = tiefe.current
    tiefe.current = 0
    if (d > 0) {
      ruecksetzen.current = e
      history.go(-d)
    } else history.replaceState(e, '')
  }, [setze])

  const zurueck = useCallback(() => {
    const s = aktuell.current.stapel
    if (s.length <= 1) return
    const neu = s.slice(0, -1)
    merkeScroll()
    scrollZiel.current = scrollMerker.current[neu.length - 1] ?? null
    // Sofort umschalten; ein folgendes popstate bringt denselben Stapel und ändert nichts mehr
    setze(aktuell.current.reiter, neu)
    if (!MIT_VERLAUF) return
    const d = tiefe.current
    if (d > 0) {
      tiefe.current = d - 1
      history.back()
    } else history.replaceState(eintrag(0, aktuell.current.reiter, neu), '')
  }, [setze])

  useEffect(() => {
    if (!MIT_VERLAUF) return
    // Nach einem Neuladen liegen ältere Einträge davor: die Tiefe des Eintrags behalten,
    // damit die Tiefe immer dem Abstand zum ersten Eintrag der App entspricht
    tiefe.current = istEintrag(history.state) ? history.state.tiefe : 0
    history.replaceState(eintrag(tiefe.current, aktuell.current.reiter, aktuell.current.stapel), '')
    const beiPop = (e: PopStateEvent) => {
      if (ignoriereNaechstes.current) {
        ignoriereNaechstes.current = false
        return
      }
      const z = ruecksetzen.current
      if (z) {
        ruecksetzen.current = null
        history.replaceState(z, '')
        return
      }
      if (!istEintrag(e.state)) return
      const { reiter: r, stapel: s, tiefe: t } = e.state
      if (e.state.generation !== generation.current) {
        // Eintrag aus einem verlassenen Reiter oder einer früheren Sitzung: zurück an die aktuelle Stelle
        if (t !== tiefe.current) {
          ignoriereNaechstes.current = true
          history.go(tiefe.current - t)
        } else history.replaceState(eintrag(t, aktuell.current.reiter, aktuell.current.stapel), '')
        return
      }
      if (t === tiefe.current && r === aktuell.current.reiter && gleich(s, aktuell.current.stapel)) return
      merkeScroll()
      tiefe.current = t
      scrollZiel.current = scrollMerker.current[s.length - 1] ?? null
      flushSync(() => setze(r, s))
    }
    window.addEventListener('popstate', beiPop)
    return () => window.removeEventListener('popstate', beiPop)
  }, [])

  // Zurück-Wischen auf iPhone/iPad: eigene Geste, die Leiste bleibt stehen (siehe wischen.tsx)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const { unterlage, unterlageRef, schleierRef } = useZurueckWischen({
    kannZurueck: () => layoutRef.current !== 'breit' && aktuell.current.stapel.length > 1,
    ansicht,
    zurueck,
  })
  // Die vorherige Ansicht unter der aktuellen dort zeigen, wo man sie verlassen hat
  useLayoutEffect(() => {
    if (unterlage && unterlageRef.current) unterlageRef.current.scrollTop = scrollMerker.current[stapel.length - 2] ?? 0
  }, [unterlage, unterlageRef])

  // Scrollstand nach dem Zurückgehen wiederherstellen (breit: die Liste links bleibt ohnehin stehen)
  useLayoutEffect(() => {
    if (scrollZiel.current == null) return
    if (layout !== 'breit' && ansicht.current) ansicht.current.scrollTop = scrollZiel.current
    scrollZiel.current = null
  }, [stapel, layout])

  // Erneutes Tippen auf den aktiven Reiter führt ganz nach oben (bzw. schließt erst eine geöffnete Ansicht)
  const wechsleReiter = useCallback((r: Reiter) => {
    if (r === aktuell.current.reiter && aktuell.current.stapel.length === 1) {
      ansicht.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    neuBeginnen(r, [START[r]])
  }, [neuBeginnen])

  const wurzel = stapel[0]
  const oben = stapel[stapel.length - 1]
  const detail = stapel.length > 1 ? oben : undefined

  const nav = useMemo<Navigation>(
    () => ({
      // Breit: eine neue Ansicht ersetzt die rechte Seite; sonst liegt sie auf dem Stapel
      geh: (a) => {
        const s = aktuell.current.stapel
        if (!breit) vorwaerts([...s, a])
        else if (s.length > 1) ersetzeOben([s[0], a])
        else vorwaerts([s[0], a])
      },
      ersetze: (a) => {
        const s = aktuell.current.stapel
        if (s.length > 1) ersetzeOben([...s.slice(0, -1), a])
        else vorwaerts([...s, a])
      },
      zurueck,
      reiter: wechsleReiter,
      zurWoche: (datum) => {
        setWoche(wochenAbstand(datum, heute()))
        neuBeginnen('woche', [START.woche])
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
    [woche, wechsleReiter, stapel, lieder, uebungen, layout, breit, detail, vorwaerts, ersetzeOben, zurueck, neuBeginnen],
  )

  // Die Unterlage beim Zurück-Wischen zeigt die vorherige Ansicht genau so, wie sie nach dem Zurückgehen aussieht
  const navUnten = useMemo<Navigation>(() => {
    const n = stapel.length - 1
    return { ...nav, detail: n > 1 ? stapel[n - 1] : undefined, vorher: n > 1 ? stapel[n - 2] : undefined }
  }, [nav, stapel])

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
      case 'auswahl':
        return <Auswahl />
      case 'vorbereiten':
        return <Vorbereiten />
      case 'probe':
        return <Probe />
      case 'thema':
        return <ThemaSeite key={a.id} id={a.id} />
      case 'familie':
        return <FamilieSeite key={a.id} id={a.id} />
      case 'probe-auswahl':
        return <ProbeAuswahl />
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
          <>
            {/* key: neue Ansicht beginnt oben */}
            <main className="view" key={`${stapel.length}-${schluessel(oben)}`} ref={ansicht}>
              <div className="inhalt">{zeige(oben)}</div>
            </main>
            {unterlage && stapel.length > 1 && (
              // Rahmen in der Größe der Ansicht: die versetzte Unterlage überdeckt nie die Leiste
              <div className="unterlage-rahmen" style={unterlage} aria-hidden="true" inert>
                <main
                  className="view unterlage"
                  ref={unterlageRef}
                  style={{ transform: `translateX(${-VERSATZ * unterlage.width}px)` }}
                >
                  <NavKontext.Provider value={navUnten}>
                    <div className="inhalt">{zeige(stapel[stapel.length - 2])}</div>
                  </NavKontext.Provider>
                </main>
                <div className="wisch-schleier" ref={schleierRef} />
              </div>
            )}
          </>
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
    uebungen: 'Ein Thema oder eine Familie antippen, um sie hier zu lesen.',
    einsingen: 'Übungen mit + auswählen; „Lesen“ zeigt eine Familie hier.',
    sammlung: 'Eine Übung oder Erklärung auswählen, um sie hier zu lesen.',
    menue: 'Gottesdienste, Proben oder „Lied hinzufügen“ wählen.',
  }
  return (
    <div className="leer-bereich">
      <p>{text[reiter]}</p>
    </div>
  )
}
