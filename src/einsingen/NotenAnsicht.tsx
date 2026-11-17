import { useEffect, useRef, useState, type RefObject } from 'react'
import type { TuneObject } from 'abcjs'
import { istRhythmus, schlag } from '../uebungen/abc'
import { metronom, spielen, stoppen, stoppenWenn, type Ereignis, type Verlauf } from '../uebungen/klang'
import { ladeAbcjs, zeilenbreite } from '../uebungen/Noten'
import { KURZ_APP, notenZeichnen, type Abcjs } from './zeichnen'

// Noten einer Grundübung oder Stufe: darüber ein Hinweis (falls vorhanden), darunter die Lageangabe,
// dann „Ausgangston“ und „Anhören“ (mit mitlaufender Markierung). Kein Transponieren.
// Ein Metronom zum Zuschalten gibt es nur, wo `mitMetronom` gesetzt ist (Übungen, bei denen es auf genaue Längen ankommt).
// Bei zwei Stimmen (Frauen und Männer in zwei verbundenen Notenzeilen) spielt „Ausgangston“ den ersten Ton jeder Stimme,
// die gleich zu Beginn singt, nacheinander von oben nach unten; wer später einsetzt, findet seinen Ton aus der Musik.
// „Anhören“ spielt beide Stimmen zusammen.
// Das Abspieltempo steht als Q:-Zeile in den ABC-Noten und wird nicht angezeigt.

/** Ohne Q:-Zeile wird mit diesem Tempo abgespielt (Schläge pro Minute) */
const GRUNDTEMPO = 72

/** Abspieltempo in Schlägen pro Minute aus der Q:-Zeile (z. B. „Q:1/4=80“) */
export function abspielTempo(abc: string): number {
  const m = /^Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/m.exec(abc)
  if (!m) return GRUNDTEMPO
  const wert = m[1] ? Number(m[1]) / Number(m[2]) : schlag(abc).laenge
  return (Number(m[3]) * wert) / schlag(abc).laenge
}

/** Breite eines Elements, gerundet auf 20 px, damit nicht bei jeder Kleinigkeit neu gezeichnet wird */
function useBreite(ref: RefObject<HTMLElement | null>): number {
  const [breite, setBreite] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const messen = () => setBreite(Math.round(el.clientWidth / 20) * 20)
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return breite
}

type Ton = { ton: number; start: number; startW: number; dauer: number; staerke: number; verlauf?: Verlauf }
type AudioEreignis = { cmd: string; pitch: number; start: number; duration: number; volume?: number; endType?: string }

/** Töne eines gezeichneten Stücks; `ganzeSek` = Dauer einer ganzen Note in Sekunden. Staccato klingt kurz. */
/** Lautstärke der Dynamikzeichen beim Anhören, als Anteil der vollen Stärke */
const DYNAMIK: Record<string, number> = { pppp: 0.2, ppp: 0.25, pp: 0.32, p: 0.45, mp: 0.62, mf: 0.8, f: 1, ff: 1.2, fff: 1.35, ffff: 1.5 }

/**
 * Lautstärke über die Zeit (in ganzen Noten) aus Dynamikzeichen (p, f …) und Gabeln (Crescendo, Decrescendo);
 * null, wenn die Noten keine Dynamik haben. Eine Gabel führt zum Zeichen an ihrem Ende, ohne Zeichen eine Stufe weiter.
 */
function dynamik(tune: TuneObject): { stufe: (t: number) => number; grenzen: number[] } | null {
  type El = { el_type?: string; duration?: number; decoration?: string[] }
  const marken: { t: number; l: number }[] = []
  const gabeln: { von: number; bis: number; auf: boolean }[] = []
  const offen: Record<string, number> = {}
  let t = 0
  for (const zeile of tune.lines ?? []) {
    for (const el of (zeile.staff?.[0]?.voices?.[0] ?? []) as El[]) {
      for (const d of el.decoration ?? []) {
        const art = d.slice(0, -1)
        if (d in DYNAMIK) marken.push({ t, l: DYNAMIK[d] })
        else if (d === 'crescendo(' || d === 'diminuendo(') offen[art] = t
        else if ((d === 'crescendo)' || d === 'diminuendo)') && art in offen) {
          gabeln.push({ von: offen[art], bis: t, auf: art === 'crescendo' })
          delete offen[art]
        }
      }
      if (el.el_type === 'note') t += el.duration ?? 0
    }
  }
  if (!marken.length && !gabeln.length) return null
  // Stärke an jedem Zeitpunkt, an dem sich etwas ändert, der Reihe nach: Eine Gabel beginnt bei der Stärke, die gerade gilt,
  // und endet beim Zeichen an ihrem Ende, ohne Zeichen eine Stufe weiter. Danach gilt die erreichte Stärke weiter.
  const grenzen = [...new Set([0, ...marken.map((m) => m.t), ...gabeln.flatMap((g) => [g.von, g.bis])])].sort((a, b) => a - b)
  const gleich = (a: number, b: number) => Math.abs(a - b) < 1e-9
  const punkte: { t: number; l: number }[] = []
  let l = 0.8
  for (const zeit of grenzen) {
    const marke = marken.find((m) => gleich(m.t, zeit))
    const endet = gabeln.find((g) => gleich(g.bis, zeit))
    if (endet) {
      const anfang = punkte.find((pt) => gleich(pt.t, endet.von))?.l ?? l
      l = marke ? marke.l : anfang * (endet.auf ? 1.5 : 0.65)
    } else if (marke) l = marke.l
    punkte.push({ t: zeit, l })
  }
  const gleitend = (a: number, b: number) => gabeln.some((g) => g.von <= a + 1e-9 && g.bis >= b - 1e-9)
  const stufe = (x: number) => {
    let i = punkte.length - 1
    while (i > 0 && punkte[i].t > x + 1e-9) i--
    const a = punkte[i]
    const b = punkte[i + 1]
    return b && gleitend(a.t, b.t) ? a.l + ((b.l - a.l) * (x - a.t)) / (b.t - a.t) : a.l
  }
  return { stufe, grenzen }
}

function toene(tune: TuneObject, ganzeSek: number): Ton[] {
  const r: Ton[] = []
  const dyn = dynamik(tune)
  for (const spur of tune.setUpAudio({}).tracks) {
    for (const e of spur as AudioEreignis[]) {
      if (e.cmd !== 'note') continue
      const dauer = e.duration * ganzeSek
      // Mit Dynamik: Stärke am Tonbeginn und Verlauf bis zum Tonende (auch über Haltebögen hinweg)
      let verlauf: Verlauf | undefined
      if (dyn) {
        const ende = e.start + e.duration
        const innen = dyn.grenzen.filter((g) => g > e.start + 1e-9 && g < ende - 1e-9).flatMap((g) => [g - 1e-4, g])
        verlauf = [e.start, ...innen, ende - 1e-6].map((x) => ({ t: (x - e.start) * ganzeSek, staerke: 100 * dyn.stufe(x) }))
      }
      r.push({
        ton: e.pitch,
        start: e.start * ganzeSek,
        startW: e.start,
        dauer: e.endType === 'staccato' ? Math.min(dauer * 0.4, 0.25) : dauer,
        staerke: verlauf ? verlauf[0].staerke : e.volume || 90,
        verlauf,
      })
    }
  }
  return r.sort((a, b) => a.start - b.start)
}

/** Erster Ton jeder Stimme, die gleich zu Beginn singt, von oben nach unten (einstimmig: ein Ton) */
function anfangstoene(tune: TuneObject): number[] {
  const erste: AudioEreignis[] = []
  for (const spur of tune.setUpAudio({}).tracks) {
    let erster: AudioEreignis | null = null
    for (const e of spur as AudioEreignis[]) if (e.cmd === 'note' && (!erster || e.start < erster.start)) erster = e
    if (erster) erste.push(erster)
  }
  const beginn = Math.min(...erste.map((e) => e.start))
  return erste.filter((e) => e.start < beginn + 1e-6).map((e) => e.pitch).sort((a, b) => b - a)
}

/** Zeitpunkte (ms), zu denen Noten markiert werden */
function notenMarken(abcjs: Abcjs, tune: TuneObject, viertelProMinute: number): { ms: number; els: Element[] }[] {
  try {
    return new abcjs.TimingCallbacks(tune, { qpm: viertelProMinute }).noteTimings
      .filter((ev) => ev.type === 'event' && ev.elements)
      .map((ev) => ({ ms: ev.milliseconds, els: (ev.elements ?? []).flat() }))
  } catch {
    return []
  }
}

export default function NotenAnsicht({
  abc,
  hinweis,
  lage,
  mitMetronom = false,
}: {
  abc: string
  hinweis?: string
  lage?: string
  /** bietet ein Metronom zum Zuschalten an */
  mitMetronom?: boolean
}) {
  const ziel = useRef<HTMLDivElement>(null)
  const breite = useBreite(ziel)
  const [fehler, setFehler] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const gezeichnet = useRef<{ abcjs: Abcjs; tune: TuneObject } | null>(null)
  const spielId = useRef<number | null>(null)

  const rhythmus = istRhythmus(abc)
  // Bei gesungenen Noten läuft das Metronom zuerst mit; gesprochene Rhythmen sind selbst Schläge
  const [klick, setKlick] = useState(!rhythmus)
  const takt = schlag(abc)
  const tempo = abspielTempo(abc)
  const ganzeSek = 60 / (tempo * takt.laenge)

  useEffect(() => {
    if (!breite) return
    let aktiv = true
    ladeAbcjs()
      .then((abcjs) => {
        if (!aktiv || !ziel.current) return
        stoppenWenn(spielId.current)
        try {
          const tune = notenZeichnen(abcjs, ziel.current, abc, zeilenbreite(breite), undefined, undefined, { kurzBis: KURZ_APP, kompakt: true })
          gezeichnet.current = { abcjs, tune }
          setFehler(false)
        } catch {
          gezeichnet.current = null
          setFehler(true)
        }
      })
      .catch(() => aktiv && setFehler(true))
    return () => {
      aktiv = false
    }
  }, [abc, breite])

  // Beim Verlassen der Seite verstummen
  useEffect(() => () => stoppenWenn(spielId.current), [])

  function markierungWeg() {
    ziel.current?.querySelectorAll('.is-on').forEach((n) => n.classList.remove('is-on'))
  }

  function ausgangston() {
    const g = gezeichnet.current
    if (!g) return
    const t = anfangstoene(g.tune)
    if (!t.length) return
    setLaeuft(false)
    spielId.current = spielen(t.length === 1 ? [{ ton: t[0], start: 0, dauer: 1.6 }] : t.map((ton, i) => ({ ton, start: i * 1.3, dauer: 1.15 })))
  }

  /** Was erklingt: Töne, bei Rhythmen Schläge (der erste im Takt betont) */
  function ereignisse(tune: TuneObject): Ereignis[] {
    const t = toene(tune, ganzeSek)
    if (!rhythmus) return t
    const taktW = takt.laenge * takt.proTakt
    return t.map((e): Ereignis => {
      const imTakt = e.startW % taktW
      return { schlag: 'sprechen', staerke: imTakt < 1e-6 ? 1 : 0.7, start: e.start, dauer: 0.1 }
    })
  }

  function anhoeren() {
    if (laeuft) return stoppen()
    const g = gezeichnet.current
    if (!g) return
    let ev = ereignisse(g.tune)
    let marken = notenMarken(g.abcjs, g.tune, 240 / ganzeSek)
    if (mitMetronom && klick && ev.length) {
      // Wie in der bisherigen Sammlung: ein Takt Vorzählen, dann läuft das Metronom bis zum letzten Schlag mit
      const schlagSek = takt.laenge * ganzeSek
      const versatz = schlagSek * takt.proTakt
      const ende = ev.reduce((m, e) => Math.max(m, e.start + (e.dauer ?? 0.1)), 0)
      ev = ev.map((e) => ({ ...e, start: e.start + versatz }))
      ev = [...ev, ...metronom(0, versatz + Math.ceil((ende - 1e-6) / schlagSek) * schlagSek, schlagSek, takt.proTakt)]
      marken = marken.map((m) => ({ ...m, ms: m.ms + versatz * 1000 }))
    }
    const id = spielen(ev, {
      marken,
      beiMarke: (m) => {
        markierungWeg()
        m.els.forEach((n) => n.classList.add('is-on'))
      },
      beimEnde: () => {
        markierungWeg()
        setLaeuft(false)
      },
    })
    spielId.current = id
    if (id !== null) setLaeuft(true)
  }

  return (
    <div className="notenblock ein-noten">
      {hinweis && <p className="noten-hinweis">{hinweis}</p>}
      <div className="noten" ref={ziel} />
      {fehler && <p className="note">Die Noten konnten nicht dargestellt werden.</p>}
      {lage && <p className="ein-lage">{lage}</p>}
      <div className="abspielen">
        {!rhythmus && (
          <button type="button" className="ghost" onClick={ausgangston} disabled={fehler}>
            Ausgangston
          </button>
        )}
        <button type="button" className="ghost voll" onClick={anhoeren} disabled={fehler}>
          {laeuft ? 'Stopp' : 'Anhören'}
        </button>
        {mitMetronom && (
          <button
            type="button"
            className="ghost plain metro"
            aria-pressed={klick}
            title="Einen Takt vorzählen und die Schläge mitklicken"
            onClick={() => setKlick(!klick)}
            disabled={laeuft}
          >
            Metronom
          </button>
        )}
      </div>
    </div>
  )
}
