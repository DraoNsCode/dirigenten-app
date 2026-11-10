import { useEffect, useRef, useState, type RefObject } from 'react'
import type { TuneObject } from 'abcjs'
import { MAX_SCHRITT, MIN_SCHRITT, istRhythmus, schlag, schritteText, sequenzSchritte, stimmen, taktwechsel, tonartName } from './abc'
import { metronom, metronomTakte, spielen, stoppen, stoppenWenn, type Ereignis, type Marke } from './klang'
import type { Notenblock } from './typen'

// Ein Notenblock: Noten zeichnen (abcjs), transponieren, Ansicht für Männerstimmen,
// anhören mit Notenmarkierung, Ausgangston, Sequenz und Metronom.
// Die Darstellung folgt der Vorschau der Übungssammlung.

type Abcjs = typeof import('abcjs')
let abcjsLaden: Promise<Abcjs> | null = null
/** abcjs erst laden, wenn Noten gezeigt werden (eigene Datei, hält die App klein) */
export function ladeAbcjs(): Promise<Abcjs> {
  abcjsLaden ??= import('abcjs').then((m) => ((m as unknown as { default?: Abcjs }).default ?? m) as Abcjs)
  return abcjsLaden
}

export type Stimme = 'frauen' | 'maenner'

/** Was ein Notenblock ist: gesungen (ein- oder mehrstimmig), Rhythmus oder nur zum Anhören */
export function blockArt(b: Notenblock) {
  const art = b.art ?? 'singen'
  const rhythmus = art === 'sprechen' || art === 'klatschen' || istRhythmus(b.abc)
  const hoeren = art === 'hoeren'
  const satz = stimmen(b.abc)
  return { art, rhythmus, hoeren, satz: satz.length > 1 ? satz : null, einstimmig: !rhythmus && !hoeren && satz.length <= 1 }
}

/** ABC so, wie es gezeigt wird: Schrift für Silben, Männerstimmen, Transposition */
export function abcFuerAnsicht(abcjs: Abcjs, b: Notenblock, schritte: number, stimme: Stimme, schrift = 'Barlow'): string {
  // Silben und Ziffern in einer geladenen Schrift setzen, damit abcjs ihre Breite richtig misst
  let abc = b.abc.replace(/^(X:.*)$/m, `$1\n%%vocalfont ${schrift} 13 bold\n%%annotationfont ${schrift} 12`)
  let verschiebung = schritte
  if (stimme === 'maenner' && blockArt(b).einstimmig) {
    abc = abc.replace(/^K:(.*)$/m, (_, k: string) => (/clef=/.test(k) ? `K:${k}` : `K:${k.trim()} clef=bass`))
    verschiebung -= 12
  }
  if (verschiebung === 0) return abc
  return abcjs.strTranspose(abc, abcjs.parseOnly(abc), verschiebung)
}

/** Noten auf ihren Inhalt zuschneiden und mittig zeigen, statt die volle Zeilenbreite zu reservieren */
export function zuschneiden(svg: SVGSVGElement | null) {
  if (!svg) return
  try {
    const bb = svg.getBBox()
    const rand = 10
    if (!bb.width) return
    const w = bb.width + 2 * rand
    const h = bb.height + 2 * rand
    svg.setAttribute('viewBox', [bb.x - rand, bb.y - rand, w, h].join(' '))
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    Object.assign(svg.style, { display: 'block', width: `${Math.round(w * 1.45)}px`, maxWidth: '100%', height: 'auto', margin: '0 auto' })
    // abcjs setzt am Container eine feste Höhe mit overflow:hidden; die schneidet den Satz unten ab
    const eltern = svg.parentElement
    if (eltern) Object.assign(eltern.style, { height: '', overflow: '' })
  } catch {
    // ohne Zuschnitt zeigen
  }
}

/**
 * Zeichnet die Noten in `ziel` mit einer Notenzeile von `breite` Einheiten.
 * abcjs bricht zu lange Zeilen um; danach werden die Takte gleichmäßig auf die Zeilen verteilt,
 * damit keine fast leere letzte Zeile entsteht.
 */
export function zeichnen(abcjs: Abcjs, ziel: HTMLElement, abc: string, breite: number, farbe = 'currentColor'): TuneObject {
  const grund = { add_classes: true, staffwidth: breite, minPadding: 8, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, foregroundColor: farbe }
  let tune = abcjs.renderAbc(ziel, abc, { ...grund, wrap: { minSpacing: 1.4, maxSpacing: 2.4, preferredMeasuresPerLine: 8 } })[0]
  const zeilen = (tune.lines ?? []).filter((l) => l.staff)
  let takte = 0
  for (const z of zeilen) for (const x of z.staff?.[0]?.voices?.[0] ?? []) if ((x as { el_type?: string }).el_type === 'bar') takte++
  if (zeilen.length > 1 && takte > zeilen.length) {
    const proZeile = Math.ceil(takte / zeilen.length)
    const umbrueche: number[] = []
    for (let i = proZeile - 1; i < takte - 1; i += proZeile) umbrueche.push(i)
    // abcjs erwartet je Notenabschnitt eine Liste der letzten Takte einer Zeile; die Typen sagen fälschlich number[]
    tune = abcjs.renderAbc(ziel, abc, { ...grund, lineBreaks: [umbrueche] as unknown as number[] })[0]
  }
  zuschneiden(ziel.querySelector('svg'))
  return tune
}

/** Notenzeile für die App: etwa 1,1-fach vergrößert in der verfügbaren Breite (Pixel) */
export const zeilenbreite = (verfuegbar: number) => Math.max(280, Math.min(560, Math.round(verfuegbar / 1.1)))

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

type Abspiel = { tune: TuneObject; abcjs: Abcjs }
type Ton = { ton: number; start: number; startW: number; dauer: number; staerke: number }

/** Töne eines gezeichneten Stücks; `ganzeSek` = Dauer einer ganzen Note in Sekunden */
function toene(tune: TuneObject, ganzeSek: number): Ton[] {
  const r: Ton[] = []
  for (const spur of tune.setUpAudio({}).tracks) {
    for (const e of spur as { cmd: string; pitch: number; start: number; duration: number; volume?: number }[]) {
      if (e.cmd === 'note') r.push({ ton: e.pitch, start: e.start * ganzeSek, startW: e.start, dauer: e.duration * ganzeSek, staerke: e.volume || 90 })
    }
  }
  return r.sort((a, b) => a.start - b.start)
}

/** Beginn jedes Takts in Sekunden (qpm = Schläge pro Minute) */
function taktAnfaenge({ tune, abcjs }: Abspiel, tempo: number): number[] {
  const s: number[] = []
  try {
    for (const ev of new abcjs.TimingCallbacks(tune, { qpm: tempo }).noteTimings) {
      if (ev.type !== 'event' || !ev.measureStart) continue
      const t = ev.milliseconds / 1000
      if (!s.length || t > s[s.length - 1] + 1e-6) s.push(t)
    }
  } catch {
    return []
  }
  return s
}

/** Zeitpunkte, zu denen Noten markiert werden */
function notenMarken({ tune, abcjs }: Abspiel, tempo: number): (Marke & { els: Element[] })[] {
  try {
    return new abcjs.TimingCallbacks(tune, { qpm: tempo }).noteTimings
      .filter((ev) => ev.type === 'event' && ev.elements)
      .map((ev) => ({ ms: ev.milliseconds, els: (ev.elements ?? []).flat() }))
  } catch {
    return []
  }
}

export default function Noten({ block, ueberschrift }: { block: Notenblock; ueberschrift?: string }) {
  const art = blockArt(block)
  const [schritte, setSchritte] = useState(0)
  const [stimme, setStimme] = useState<Stimme>('frauen')
  const [fehler, setFehler] = useState(false)
  const [metro, setMetro] = useState(false)
  const [laeuft, setLaeuft] = useState<null | 'anhoeren' | 'sequenz'>(null)
  const [durchgang, setDurchgang] = useState<{ k: number; i: number } | null>(null)
  const ziel = useRef<HTMLDivElement>(null)
  const abspiel = useRef<Abspiel | null>(null)
  const spielId = useRef<number | null>(null)
  const breite = useBreite(ziel)
  const takt = schlag(block.abc)
  const tempo = block.tempo || 72
  const ganzeSek = 60 / (tempo * takt.laenge)
  const wechsel = taktwechsel(block.abc)
  const sequenz = block.sequenz ? sequenzSchritte(block.sequenz) : []

  useEffect(() => {
    if (!breite) return
    let aktiv = true
    ladeAbcjs()
      .then((abcjs) => {
        if (!aktiv || !ziel.current) return
        stoppenWenn(spielId.current)
        try {
          const tune = zeichnen(abcjs, ziel.current, abcFuerAnsicht(abcjs, block, schritte, stimme), zeilenbreite(breite))
          abspiel.current = { tune, abcjs }
          setFehler(false)
        } catch {
          abspiel.current = null
          setFehler(true)
        }
      })
      .catch(() => aktiv && setFehler(true))
    return () => {
      aktiv = false
    }
  }, [block, schritte, stimme, breite])

  // Beim Verlassen der Seite verstummen
  useEffect(() => () => stoppenWenn(spielId.current), [])

  function markierungWeg() {
    ziel.current?.querySelectorAll('.is-on').forEach((n) => n.classList.remove('is-on'))
  }

  function ausgangston() {
    const a = abspiel.current
    if (!a) return
    const t = toene(a.tune, ganzeSek)
    if (!t.length) return
    setLaeuft(null)
    spielId.current = spielen([{ ton: t[0].ton, start: 0, dauer: 1.6 }])
  }

  /** Was erklingt: Töne, oder bei Rhythmen Schläge (betont auf Taktanfang und Zählzeiten) */
  function ereignisse(a: Abspiel): Ereignis[] {
    const t = toene(a.tune, ganzeSek)
    if (!art.rhythmus) return t
    const taktW = takt.laenge * takt.proTakt
    const schlagSek = 60 / tempo
    const anfaenge = wechsel ? taktAnfaenge(a, tempo) : []
    return t.map((e): Ereignis => {
      let imTakt: number
      let aufSchlag: boolean
      if (anfaenge.length) {
        let s0 = 0
        for (const s of anfaenge) if (s <= e.start + 0.01) s0 = s
        imTakt = e.start - s0
        aufSchlag = Math.abs(imTakt / schlagSek - Math.round(imTakt / schlagSek)) < 0.02
      } else {
        imTakt = e.startW % taktW
        aufSchlag = Math.abs(imTakt / takt.laenge - Math.round(imTakt / takt.laenge)) < 1e-6
      }
      return { schlag: art.art === 'klatschen' ? 'klatschen' : 'sprechen', staerke: imTakt < 0.01 ? 1 : aufSchlag ? 0.7 : 0.4, start: e.start, dauer: 0.1 }
    })
  }

  function anhoeren() {
    if (laeuft === 'anhoeren') return stoppen()
    const a = abspiel.current
    if (!a) return
    let marken = notenMarken(a, tempo)
    let ev = ereignisse(a)
    if (metro) {
      // Ein Takt Vorzählen; ein Auftakt fällt in die letzten Schläge des Vorzähltakts
      const schlagSek = 60 / tempo
      const taktSek = schlagSek * takt.proTakt
      let auftakt = 0
      try {
        auftakt = (a.tune.getPickupLength?.() ?? 0) * ganzeSek
      } catch {
        auftakt = 0
      }
      const versatz = taktSek - auftakt
      const ende = ev.reduce((m, e) => Math.max(m, e.start + (e.dauer ?? 0.1)), 0)
      ev = ev.map((e) => ({ ...e, start: e.start + versatz }))
      const bis = versatz + Math.ceil((ende - 1e-6) / schlagSek) * schlagSek
      const anfaenge = wechsel ? taktAnfaenge(a, tempo) : []
      ev = anfaenge.length
        ? [...ev, ...metronom(0, versatz, schlagSek, takt.proTakt), ...metronomTakte(anfaenge.map((s) => s + versatz), bis, schlagSek)]
        : [...ev, ...metronom(0, bis, schlagSek, takt.proTakt)]
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
        setLaeuft(null)
      },
    })
    spielId.current = id
    if (id !== null) setLaeuft('anhoeren')
  }

  // Sequenz: vor jedem Durchgang der neue Ausgangston (ein Schlag), dann ein Schlag zum Atmen.
  // Mit Metronom bekommt jeder Durchgang ganze Takte, damit die Schläge durchlaufen.
  function sequenzAnhoeren() {
    if (laeuft === 'sequenz') return stoppen()
    const a = abspiel.current
    if (!a) return
    const basis = toene(a.tune, ganzeSek)
    if (!basis.length) return
    const schlagSek = 60 / tempo
    const taktSek = schlagSek * takt.proTakt
    const laenge = basis.reduce((m, e) => Math.max(m, e.start + e.dauer), 0)
    const luecke = metro ? taktSek : 2 * schlagSek
    const durchlauf = metro ? Math.ceil((laenge - 1e-6) / taktSek) * taktSek : laenge + 0.15
    const anfaenge = metro && wechsel ? taktAnfaenge(a, tempo) : []
    let alle: Ereignis[] = []
    let klicks: Ereignis[] = []
    const marken: (Marke & { k: number; i: number })[] = []
    let t = 0
    sequenz.forEach((k, i) => {
      const d = k - schritte
      marken.push({ ms: t * 1000, k, i })
      alle.push({ ton: basis[0].ton + d, start: t, dauer: schlagSek * 0.9, staerke: 80 })
      if (anfaenge.length) klicks = klicks.concat(metronom(t, t + luecke, schlagSek, takt.proTakt))
      t += luecke
      for (const e of basis) alle.push({ ton: e.ton + d, start: t + e.start, dauer: e.dauer, staerke: e.staerke })
      if (anfaenge.length) {
        const t1 = t
        klicks = klicks.concat(metronomTakte(anfaenge.map((s) => s + t1), t + durchlauf, schlagSek))
      }
      t += durchlauf
    })
    if (metro) alle = alle.concat(anfaenge.length ? klicks : metronom(0, t, schlagSek, takt.proTakt))
    const id = spielen(alle, {
      marken,
      beiMarke: (m) => setDurchgang({ k: m.k, i: m.i }),
      beimEnde: () => {
        setDurchgang(null)
        setLaeuft(null)
      },
    })
    spielId.current = id
    if (id !== null) setLaeuft('sequenz')
  }

  return (
    <div className="notenblock">
      {ueberschrift && <p className="noten-ueberschrift">{ueberschrift}</p>}
      <div className="noten-steuerung">
        {art.satz ? (
          <span className="noten-art">Satz für {art.satz.join(' · ')}</span>
        ) : art.rhythmus ? (
          <span className="noten-art">{art.art === 'klatschen' ? 'Geklatscht' : art.art === 'sprechen' ? 'Gesprochen' : 'Rhythmus'}</span>
        ) : art.hoeren ? (
          <span className="noten-art">Zum Anhören</span>
        ) : (
          <div className="segment" role="group" aria-label="Notation für">
            <button type="button" aria-pressed={stimme === 'frauen'} onClick={() => setStimme('frauen')}>
              Frauen
            </button>
            <button type="button" aria-pressed={stimme === 'maenner'} onClick={() => setStimme('maenner')}>
              Männer
            </button>
          </div>
        )}
        {!art.rhythmus && (
          <div className="transponieren">
            <button
              type="button"
              className="rund"
              aria-label="Einen Halbton tiefer"
              disabled={schritte <= MIN_SCHRITT}
              onClick={() => setSchritte((s) => s - 1)}
            >
              −
            </button>
            <span className="tonart" aria-live="polite">
              <strong>{tonartName(block.abc, durchgang ? durchgang.k : schritte) || 'Tonart'}</strong>
              <span>{durchgang ? `Durchgang ${durchgang.i + 1} von ${sequenz.length}` : schritteText(schritte)}</span>
            </span>
            <button
              type="button"
              className="rund"
              aria-label="Einen Halbton höher"
              disabled={schritte >= MAX_SCHRITT}
              onClick={() => setSchritte((s) => s + 1)}
            >
              +
            </button>
          </div>
        )}
      </div>

      <div className="noten" ref={ziel} />
      {fehler && <p className="note">Die Noten konnten nicht dargestellt werden.</p>}

      {block.hinweis && !ueberschrift && <p className="noten-hinweis">{block.hinweis}</p>}
      {block.sequenz && sequenz.length > 0 && (
        <p className="noten-hinweis">
          <strong>Sequenz:</strong> {tonartName(block.abc, block.sequenz.von)} bis {tonartName(block.abc, block.sequenz.bis)},
          {block.sequenz.bis > block.sequenz.von ? ' halbtonweise aufwärts' : ' halbtonweise abwärts'}
          {block.sequenz.zurueck ? ' und zurück' : ''} · {sequenz.length} Durchgänge
        </p>
      )}

      <div className="abspielen">
        {!art.rhythmus && !art.hoeren && (
          <button type="button" className="ghost" onClick={ausgangston} disabled={fehler}>
            Ausgangston
          </button>
        )}
        <button type="button" className="ghost voll" onClick={anhoeren} disabled={fehler}>
          {laeuft === 'anhoeren' ? 'Stopp' : 'Anhören'}
        </button>
        {sequenz.length > 0 && !art.rhythmus && (
          <button type="button" className="ghost" onClick={sequenzAnhoeren} disabled={fehler}>
            {laeuft === 'sequenz' ? 'Stopp' : 'Sequenz anhören'}
          </button>
        )}
        <button
          type="button"
          className="ghost plain metro"
          aria-pressed={metro}
          title="Einen Takt vorzählen und die Schläge mitklicken"
          onClick={() => setMetro((m) => !m)}
        >
          Metronom
        </button>
        <span className="noten-tempo">
          {takt.zeichen} = {tempo}
        </span>
      </div>
    </div>
  )
}
