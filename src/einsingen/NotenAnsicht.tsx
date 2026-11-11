import { useEffect, useRef, useState, type RefObject } from 'react'
import type { TuneObject } from 'abcjs'
import { istRhythmus, schlag } from '../uebungen/abc'
import { spielen, stoppen, stoppenWenn, type Ereignis } from '../uebungen/klang'
import { ladeAbcjs, zeichnen, zeilenbreite } from '../uebungen/Noten'

// Noten einer Übung fürs Einsingen: darüber ein Hinweis (falls vorhanden), darunter die Lageangabe,
// dann „Ausgangston“ und „Anhören“ (mit mitlaufender Markierung). Kein Metronom, kein Transponieren.
// Das Abspieltempo steht als Q:-Zeile in den ABC-Noten und wird nicht angezeigt.

type Abcjs = Awaited<ReturnType<typeof ladeAbcjs>>

/** Ohne Q:-Zeile wird mit diesem Tempo abgespielt (Schläge pro Minute) */
const GRUNDTEMPO = 72

/** ABC so, wie es gezeigt wird: Schrift für Silben und Ziffern, ohne Tempoangabe */
export function abcZumZeigen(abc: string, schrift = 'Barlow'): string {
  return abc
    .replace(/^Q:.*\n?/m, '')
    .replace(/^(X:.*)$/m, `$1\n%%vocalfont ${schrift} 13 bold\n%%annotationfont ${schrift} 12`)
}

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

type Ton = { ton: number; start: number; startW: number; dauer: number; staerke: number }
type AudioEreignis = { cmd: string; pitch: number; start: number; duration: number; volume?: number; endType?: string }

/** Töne eines gezeichneten Stücks; `ganzeSek` = Dauer einer ganzen Note in Sekunden. Staccato klingt kurz. */
function toene(tune: TuneObject, ganzeSek: number): Ton[] {
  const r: Ton[] = []
  for (const spur of tune.setUpAudio({}).tracks) {
    for (const e of spur as AudioEreignis[]) {
      if (e.cmd !== 'note') continue
      const dauer = e.duration * ganzeSek
      r.push({
        ton: e.pitch,
        start: e.start * ganzeSek,
        startW: e.start,
        dauer: e.endType === 'staccato' ? Math.min(dauer * 0.4, 0.25) : dauer,
        staerke: e.volume || 90,
      })
    }
  }
  return r.sort((a, b) => a.start - b.start)
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

export default function NotenAnsicht({ abc, hinweis, lage }: { abc: string; hinweis?: string; lage?: string }) {
  const ziel = useRef<HTMLDivElement>(null)
  const breite = useBreite(ziel)
  const [fehler, setFehler] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const gezeichnet = useRef<{ abcjs: Abcjs; tune: TuneObject } | null>(null)
  const spielId = useRef<number | null>(null)

  const rhythmus = istRhythmus(abc)
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
          const tune = zeichnen(abcjs, ziel.current, abcZumZeigen(abc), zeilenbreite(breite))
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
    const t = toene(g.tune, ganzeSek)
    if (!t.length) return
    setLaeuft(false)
    spielId.current = spielen([{ ton: t[0].ton, start: 0, dauer: 1.6 }])
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
    const id = spielen(ereignisse(g.tune), {
      marken: notenMarken(g.abcjs, g.tune, 240 / ganzeSek),
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
    <div className="notenblock">
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
      </div>
    </div>
  )
}
