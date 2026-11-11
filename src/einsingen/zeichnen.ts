import type { TuneObject } from 'abcjs'
import { ladeAbcjs, zeichnen, zuschneiden } from '../uebungen/Noten'

// Noten fürs Einsingen zeichnen (App und Folien):
// - Übungen bis zwei Takte werden nie umgebrochen; zu breite Zeilen werden verkleinert (CSS max-width bzw. Skalierung im PDF).
// - Silben und Ziffern stehen mittig unter ihrem Notenkopf (abcjs setzt sie um eine halbe Kopfbreite zu weit links).
// - Berührt eine Silbe einen Bogen, eine Hilfslinie oder eine tiefe Note, rückt die ganze Silbenzeile tiefer (%%vocalspace).
// - Die Tempoangabe (Q:) wird nicht gezeigt.

export type Abcjs = Awaited<ReturnType<typeof ladeAbcjs>>

/** Mindestabstand zwischen Silben und den Zeichen darüber (SVG-Einheiten) */
const ABSTAND = 7

/** ABC so, wie es gezeigt wird: Schrift für Silben und Ziffern, Abstand der Silben, ohne Tempoangabe */
export function abcZumZeigen(abc: string, schrift = 'Barlow', silbenAbstand = 0): string {
  const kopf = [`%%vocalfont ${schrift} 13 bold`, `%%annotationfont ${schrift} 12`]
  if (silbenAbstand > 0) kopf.push(`%%vocalspace ${silbenAbstand.toFixed(1)}`)
  return abc.replace(/^Q:.*\n?/m, '').replace(/^(X:.*)$/m, `$1\n${kopf.join('\n')}`)
}

/** Anzahl der Takte mit Noten oder Pausen */
export function taktAnzahl(abcjs: Abcjs, abc: string): number {
  let n = 0
  try {
    for (const zeile of abcjs.parseOnly(abc)[0]?.lines ?? []) {
      for (const stimme of zeile.staff?.[0]?.voices ?? []) {
        let inhalt = false
        for (const el of stimme as { el_type?: string }[]) {
          if (el.el_type === 'note') inhalt = true
          if (el.el_type === 'bar') {
            if (inhalt) n++
            inhalt = false
          }
        }
        if (inhalt) n++
      }
    }
  } catch {
    return 99
  }
  return n
}

/** Klasse der Notenzeile eines Elements (abcjs-l0, abcjs-l1 …) */
function zeileVon(el: Element): string | undefined {
  return [...el.classList].find((c) => /^abcjs-l\d+$/.test(c))
}

/** Silben mittig unter ihren Notenkopf setzen */
function silbenMittig(svg: SVGSVGElement) {
  for (const note of svg.querySelectorAll('g.abcjs-note')) {
    const kopf = note.querySelector('.abcjs-notehead') as SVGGraphicsElement | null
    if (!kopf) continue
    const b = kopf.getBBox()
    const mitte = b.x + b.width / 2
    // abcjs setzt die Lage auch an die tspan-Elemente; beide anpassen
    note.querySelectorAll('text.abcjs-lyric, text.abcjs-lyric tspan').forEach((t) => t.setAttribute('x', mitte.toFixed(2)))
  }
}

/** Wie viel tiefer die Silben stehen müssten, damit sie nichts darüber berühren (0 = passt) */
function fehlenderAbstand(svg: SVGSVGElement): number {
  const silben = [...svg.querySelectorAll('text.abcjs-lyric')].filter((t) => t.textContent?.trim()) as SVGTextElement[]
  if (!silben.length) return 0
  // Alle gezeichneten Linien und Köpfe je Notenzeile (Silben sind Text, keine Pfade).
  // Bögen werden entlang ihrer Kurve abgetastet, alles andere als Rechteck genommen.
  type Hindernis = { x: number; y: number; breite: number; hoehe: number }
  const proZeile = new Map<string, Hindernis[]>()
  for (const p of svg.querySelectorAll('path')) {
    // Die Zeilenklasse sitzt am Pfad selbst (Bögen) oder an einer umgebenden Gruppe (Notenköpfe, Hälse, Hilfslinien)
    let z: string | undefined
    for (let e: Element | null = p; e && !z && e !== svg; e = e.parentElement) z = zeileVon(e)
    if (!z) continue
    if (p.closest('.abcjs-clef, .abcjs-time-signature, .abcjs-key-signature')) continue
    const liste = proZeile.get(z) ?? []
    if (p.matches('.abcjs-slur, .abcjs-tie')) {
      const pfad = p as SVGPathElement
      const laenge = pfad.getTotalLength()
      for (let i = 0; i <= 80; i++) {
        const pt = pfad.getPointAtLength((laenge * i) / 80)
        liste.push({ x: pt.x, y: pt.y, breite: 0, hoehe: 0 })
      }
    } else {
      const b = (p as SVGGraphicsElement).getBBox()
      liste.push({ x: b.x, y: b.y, breite: b.width, hoehe: b.height })
    }
    proZeile.set(z, liste)
  }
  let fehlt = 0
  for (const s of silben) {
    const z = zeileVon(s)
    if (!z) continue
    const sb = s.getBBox()
    // alles, was waagerecht über der Silbe liegt und oben vor ihrer Unterkante beginnt (also darüber oder hineinragend)
    const darueber = (proZeile.get(z) ?? []).filter((b) => b.x <= sb.x + sb.width + 2 && b.x + b.breite >= sb.x - 2 && b.y < sb.y + sb.height)
    const unterkante = Math.max(...darueber.map((b) => b.y + b.hoehe), -Infinity)
    if (unterkante > -Infinity) fehlt = Math.max(fehlt, unterkante + ABSTAND - sb.y)
  }
  return fehlt
}

/**
 * Zeichnet die Noten in `ziel` mit einer Notenzeile von `breite` Einheiten.
 * Rückgabe: das gezeichnete Stück (zum Abspielen und Markieren).
 */
export function notenZeichnen(abcjs: Abcjs, ziel: HTMLElement, abc: string, breite: number, schrift = 'Barlow', farbe = 'currentColor'): TuneObject {
  const kurz = taktAnzahl(abcjs, abc) <= 2
  const malen = (abstand: number): TuneObject => {
    const text = abcZumZeigen(abc, schrift, abstand)
    if (!kurz) return zeichnen(abcjs, ziel, text, breite, farbe)
    const grund = { add_classes: true, staffwidth: breite, minPadding: 8, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, foregroundColor: farbe }
    return abcjs.renderAbc(ziel, text, grund)[0]
  }
  let tune = malen(0)
  let svg = ziel.querySelector('svg')
  if (svg) {
    silbenMittig(svg)
    const fehlt = fehlenderAbstand(svg)
    // %%vocalspace ist in Punkt; abcjs rechnet mit 4/3 in SVG-Einheiten um
    if (fehlt > 0.5) {
      tune = malen((fehlt * 3) / 4)
      svg = ziel.querySelector('svg')
      if (svg) silbenMittig(svg)
    }
    zuschneiden(svg)
  }
  return tune
}
