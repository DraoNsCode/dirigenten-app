import { useEffect, useRef, useState, type RefObject } from 'react'
import type { TuneObject } from 'abcjs'
import { MAX_SCHRITT, MIN_SCHRITT, istRhythmus, schlag, schritteText, sequenzSchritte, stimmen, tonartName } from './abc'
import type { Notenblock } from './typen'

// Ein Notenblock: Noten zeichnen (abcjs), transponieren, Ansicht für Männerstimmen.
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
export function abcFuerAnsicht(abcjs: Abcjs, b: Notenblock, schritte: number, stimme: Stimme): string {
  let abc = b.abc.replace(/^(X:.*)$/m, '$1\n%%vocalfont Barlow 13 bold')
  let verschiebung = schritte
  if (stimme === 'maenner' && blockArt(b).einstimmig) {
    abc = abc.replace(/^K:(.*)$/m, (_, k: string) => (/clef=/.test(k) ? `K:${k}` : `K:${k.trim()} clef=bass`))
    verschiebung -= 12
  }
  if (verschiebung === 0) return abc
  return abcjs.strTranspose(abc, abcjs.parseOnly(abc), verschiebung)
}

/** Noten auf ihren Inhalt zuschneiden und mittig zeigen, statt die volle Zeilenbreite zu reservieren */
function zuschneiden(svg: SVGSVGElement | null) {
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
 * Zeichnet die Noten in `ziel`, passend zur verfügbaren Breite (Pixel).
 * Die Notenzeile wird so breit gesetzt, dass die Noten etwa 1,1-fach vergrößert erscheinen;
 * abcjs bricht lange Zeilen dafür selbst um.
 */
export function zeichnen(abcjs: Abcjs, ziel: HTMLElement, abc: string, verfuegbar: number): TuneObject {
  const breite = Math.max(280, Math.min(560, Math.round(verfuegbar / 1.1)))
  const tune = abcjs.renderAbc(ziel, abc, {
    add_classes: true,
    staffwidth: breite,
    wrap: { minSpacing: 1.3, maxSpacing: 2.4, preferredMeasuresPerLine: 4 },
    minPadding: 8,
    paddingtop: 0,
    paddingbottom: 0,
    paddingleft: 0,
    paddingright: 0,
    foregroundColor: 'currentColor',
  })[0]
  zuschneiden(ziel.querySelector('svg'))
  return tune
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

export default function Noten({ block, ueberschrift }: { block: Notenblock; ueberschrift?: string }) {
  const art = blockArt(block)
  const [schritte, setSchritte] = useState(0)
  const [stimme, setStimme] = useState<Stimme>('frauen')
  const [fehler, setFehler] = useState(false)
  const ziel = useRef<HTMLDivElement>(null)
  const tune = useRef<TuneObject | null>(null)
  const breite = useBreite(ziel)
  const takt = schlag(block.abc)
  const sequenz = block.sequenz ? sequenzSchritte(block.sequenz) : []

  useEffect(() => {
    if (!breite) return
    let aktiv = true
    ladeAbcjs()
      .then((abcjs) => {
        if (!aktiv || !ziel.current) return
        try {
          tune.current = zeichnen(abcjs, ziel.current, abcFuerAnsicht(abcjs, block, schritte, stimme), breite)
          setFehler(false)
        } catch {
          tune.current = null
          setFehler(true)
        }
      })
      .catch(() => aktiv && setFehler(true))
    return () => {
      aktiv = false
    }
  }, [block, schritte, stimme, breite])

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
              <strong>{tonartName(block.abc, schritte) || 'Tonart'}</strong>
              <span>{schritteText(schritte)}</span>
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
      <p className="noten-tempo">
        {takt.zeichen} = {block.tempo}
      </p>
    </div>
  )
}
