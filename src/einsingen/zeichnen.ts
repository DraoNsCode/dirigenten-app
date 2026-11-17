import type { TuneObject } from 'abcjs'
import { UMBRUCH, ladeAbcjs, zeichnen, zuschneiden } from '../uebungen/Noten'

// Noten fürs Einsingen zeichnen (App und Folien):
// - Kurze Übungen werden nie umgebrochen: bis drei Takte (drei Takte brachen am Handy in 2 + 1 um; in der Foliengestaltung vom 11.11. bis zwei);
//   zu breite Zeilen werden verkleinert (CSS max-width bzw. Skalierung im PDF). Takte, in denen nur Pausen stehen, zählen dabei nicht mit:
//   Sie brauchen kaum Platz, und eine stille Strecke soll nicht über zwei Zeilen zerrissen werden (Daniel, 17.11.2026: Folie mit zwei Takten Pause).
// - Silben und Ziffern stehen mittig unter ihrem Notenkopf (abcjs setzt sie um eine halbe Kopfbreite zu weit links).
// - Berührt eine Silbe einen Bogen, eine Hilfslinie oder eine tiefe Note, rückt die ganze Silbenzeile tiefer (%%vocalspace).
// - Die Tempoangabe (Q:) wird nicht gezeigt.
// - Gabeln halten kleinen Abstand zu p, f usw. und zueinander; Atemzeichen stehen nach der Note, kurz vor der nächsten;
//   Dynamik schwebt nicht unnötig hoch über dem System; zwischen zwei Notenzeilen bleibt Luft, auch wenn über der
//   zweiten eine Beschriftung steht (Daniel, 17.11.2026: Gabeln mit Abstand, „sauber umgesetzte optische Darstellung“).
// - Eine Zeile „%Varianten: …“ in den Noten: andere Wörter auf denselben Rhythmus, klein und heller unter dem Wort ihres Abschnitts.
// - Zwei Stimmen (Frauen im Violin-, Männer im Bassschlüssel) stehen in zwei verbundenen Notenzeilen mit Klammer und durchgehenden
//   Taktstrichen (Daniel, 17.11.2026: „wie im Liederbuch“); in den Noten „%%score {Frauen | Maenner}“. Eine Notenzeile mit beiden
//   Systemen ist eine Zeile (eine Gruppe abcjs-staff-wrapper).
// - In der App (kompakt): Längere Übungen werden versuchsweise 1,2- und 1,5-mal so breit gezeichnet und dann auf die Bildschirmbreite
//   verkleinert, aber nur, wenn dabei Zeilen wegfallen (Daniel, 17.11.2026: „lieber kleiner und kompakt“). Die Folien bleiben, wie sie sind.

export type Abcjs = Awaited<ReturnType<typeof ladeAbcjs>>

/** Bis zu so vielen Takten mit Noten wird eine Übung nie umgebrochen, sondern verkleinert: Folien vom 11.11. und App bzw. Folien seit 14.11. */
export const KURZ_FOLIE = 2
export const KURZ_APP = 3

/** Breiten, mit denen eine längere Übung in der App versuchsweise gezeichnet wird (1,5-fach: etwa 70 % der üblichen Größe) */
const KOMPAKT = [1.2, 1.5]

/** Wie viele Zeilen abcjs bei dieser Breite braucht (ein Probedurchgang ohne Feinheiten) */
function zeilenBei(abcjs: Abcjs, ziel: HTMLElement, text: string, breite: number): number {
  const grund = { staffwidth: breite, minPadding: 8, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, wrap: UMBRUCH }
  return (abcjs.renderAbc(ziel, text, grund)[0]?.lines ?? []).filter((l) => l.staff).length
}

/** Mindestabstand zwischen Silben und den Zeichen darüber (SVG-Einheiten) */
const ABSTAND = 7

/** ABC so, wie es gezeigt wird: Schrift für Silben und Ziffern, Abstand der Silben, ohne Tempoangabe */
export function abcZumZeigen(abc: string, schrift = 'Barlow', silbenAbstand = 0, natuerlich = false): string {
  const kopf = [`%%vocalfont ${schrift} 13 bold`, `%%annotationfont ${schrift} 13 bold`]
  // Die letzte (bei kurzen Übungen: einzige) Zeile nicht in die Breite ziehen
  if (natuerlich) kopf.push('%%stretchlast false')
  if (silbenAbstand > 0) kopf.push(`%%vocalspace ${silbenAbstand.toFixed(1)}`)
  return abc.replace(/^Q:.*\n?/m, '').replace(/^(X:.*)$/m, `$1\n${kopf.join('\n')}`)
}

/** Anzahl der Takte mit mindestens einer klingenden Note (Takte nur mit Pausen zählen nicht) */
export function taktAnzahl(abcjs: Abcjs, abc: string): number {
  let n = 0
  try {
    for (const zeile of abcjs.parseOnly(abc)[0]?.lines ?? []) {
      for (const stimme of zeile.staff?.[0]?.voices ?? []) {
        let inhalt = false
        for (const el of stimme as { el_type?: string }[]) {
          if (el.el_type === 'note' && !(el as { rest?: unknown }).rest) inhalt = true
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

/** Abstand der Gabeln zu p, f usw. und zwischen zwei Gabeln, die aneinanderstoßen (SVG-Einheiten; eine Zwischenlinie ist knapp 8) */
const GABEL_ABSTAND = 4

/**
 * Gabeln (Crescendo, Decrescendo) beginnen und enden mit kleinem Abstand neben p, f usw. und berühren einander nicht
 * (Daniel, 17.11.2026: „nicht auf der Dynamikbezeichnung, sondern mit kleinem Abstand“). abcjs lässt sie an der Note
 * beginnen und enden, an der auch das Zeichen steht, und zeichnet sie dadurch durch das Zeichen hindurch.
 */
function gabelnAbsetzen(svg: SVGSVGElement) {
  const z = String.raw`\s*(-?[\d.]+)\s+(-?[\d.]+)\s*`
  // Eine Gabel sind zwei gerade Linien mit gemeinsamem Anfang (Crescendo) oder Ende (Decrescendo)
  const muster = new RegExp(`^M${z}L${z}M${z}L${z}$`)
  type Gabel = { el: SVGPathElement; zeile: string; w: number[]; x1: number; x2: number; oben: number; unten: number }
  const gabeln: Gabel[] = []
  const zeichen: { zeile: string; links: number; rechts: number; oben: number; unten: number }[] = []
  for (const p of svg.querySelectorAll<SVGPathElement>('path.abcjs-dynamics')) {
    const zeile = zeileVon(p) ?? ''
    const m = (p.getAttribute('d') ?? '').match(muster)
    if (m) {
      const w = m.slice(1).map(Number)
      const ys = [w[1], w[3], w[5], w[7]]
      gabeln.push({ el: p, zeile, w, x1: w[0], x2: w[2], oben: Math.min(...ys), unten: Math.max(...ys) })
    } else {
      const b = p.getBBox()
      zeichen.push({ zeile, links: b.x, rechts: b.x + b.width, oben: b.y, unten: b.y + b.height })
    }
  }
  for (const g of gabeln) {
    const daneben = zeichen.filter((s) => s.zeile === g.zeile && s.unten > g.oben && s.oben < g.unten)
    let x1 = g.x1
    let x2 = g.x2
    for (const s of daneben) {
      if (g.x1 >= s.links - 2 && g.x1 <= s.rechts + GABEL_ABSTAND) x1 = Math.max(x1, s.rechts + GABEL_ABSTAND)
      if (g.x2 >= s.links - GABEL_ABSTAND && g.x2 <= s.rechts + 2) x2 = Math.min(x2, s.links - GABEL_ABSTAND)
    }
    // Zwei Gabeln, die sich ohne Zeichen dazwischen treffen (< >), bekommen eine kleine Lücke
    for (const h of gabeln) {
      if (h === g || h.zeile !== g.zeile) continue
      if (Math.abs(g.x2 - h.x1) < 1) x2 = Math.min(x2, g.x2 - GABEL_ABSTAND / 2)
      if (Math.abs(g.x1 - h.x2) < 1) x1 = Math.max(x1, g.x1 + GABEL_ABSTAND / 2)
    }
    // Nie kürzer als eine kurze Gabel; im Zweifel die alte Lage
    if (x2 - x1 < 8 || (x1 === g.x1 && x2 === g.x2)) continue
    const [, y1, , y2, , y3, , y4] = g.w
    const r = (v: number) => +v.toFixed(2)
    g.el.setAttribute('d', `M ${r(x1)} ${y1} L ${r(x2)} ${y2} M ${r(x1)} ${y3} L ${r(x2)} ${y4}`)
  }
}

/**
 * Atemzeichen stehen über dem System nach der Note, kurz vor der nächsten Note oder dem Taktstrich, also dort, wo die Note endet.
 * abcjs setzt sie über die Note selbst (mitten im Takt) oder auf den Taktstrich.
 */
function atemzeichenSetzen(svg: SVGSVGElement) {
  for (const komma of svg.querySelectorAll<SVGGraphicsElement>('path[data-name=","]')) {
    const gruppe = komma.parentElement
    const zeile = gruppe ? zeileVon(gruppe) : undefined
    const oberlinie = zeile ? svg.querySelector<SVGGraphicsElement>(`g.abcjs-staff.${zeile} .abcjs-top-line`) : null
    if (!gruppe || !zeile || !oberlinie) continue
    const kb = komma.getBBox()
    const kasten = (e: SVGGraphicsElement) => e.getBBox()
    const koepfe = [...svg.querySelectorAll<SVGGraphicsElement>(`g.abcjs-note.${zeile} .abcjs-notehead`)].map(kasten)
    const striche = [...svg.querySelectorAll<SVGGraphicsElement>(`g.abcjs-bar.${zeile} path[data-name="bar"]`)].map(kasten)
    let vorher: number
    let danach: number
    if (gruppe.matches('.abcjs-bar')) {
      // am Taktstrich: nach der letzten Note davor, vor dem Strich
      const strich = Math.min(...[...gruppe.querySelectorAll<SVGGraphicsElement>('path[data-name="bar"]')].map((e) => kasten(e).x))
      danach = strich
      vorher = Math.max(...koepfe.filter((b) => b.x + b.width <= strich).map((b) => b.x + b.width))
    } else {
      const kopf = gruppe.querySelector<SVGGraphicsElement>('.abcjs-notehead')
      if (!kopf) continue
      const kb2 = kasten(kopf)
      vorher = kb2.x + kb2.width
      danach = Math.min(...[...koepfe, ...striche].map((b) => b.x).filter((x) => x > vorher + 0.5))
    }
    if (!isFinite(vorher) || !isFinite(danach)) continue
    // kurz vor dem nächsten Element (dort endet die Note); ist die Lücke zu klein, mittig darin
    let mitte = danach - 8
    if (mitte - kb.width / 2 < vorher + 3) mitte = (vorher + danach) / 2
    // knapp über der obersten Linie, aber über allem, was an dieser Stelle höher liegt (Hilfslinien, Hälse, Bögen)
    const links = mitte - kb.width / 2 - 2
    const rechts = mitte + kb.width / 2 + 2
    let hoch = oberlinie.getBBox().y - 5
    for (const p of svg.querySelectorAll<SVGGraphicsElement>(`g.abcjs-note.${zeile} path, path.abcjs-slur.${zeile}`)) {
      if (p.getAttribute('data-name') === ',') continue
      const b = p.getBBox()
      if (b.x < rechts && b.x + b.width > links) hoch = Math.min(hoch, b.y - 3)
    }
    const dx = mitte - (kb.x + kb.width / 2)
    const dy = hoch - (kb.y + kb.height)
    komma.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`)
  }
}

/** Rahmen eines Elements samt eigener Verschiebung (transform="translate(…)", etwa bei versetzten Atemzeichen) */
function kasten(el: SVGGraphicsElement): DOMRect {
  const b = el.getBBox()
  const m = (el.getAttribute('transform') ?? '').match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/)
  return m ? new DOMRect(b.x + Number(m[1]), b.y + Number(m[2]), b.width, b.height) : b
}

/** Höhe der Dynamik (Mitte der Gabeln) über der obersten Notenlinie, so wie abcjs sie setzt, wenn nichts dazwischen steht */
const DYNAMIK_HOEHE = 33

/**
 * abcjs setzt p, f und Gabeln über alle Beschriftungen einer Zeile, auch wenn an ihrer Stelle nichts darunter steht
 * („Leise, aber deutlich“: das p schwebt über dem „t“ im nächsten Takt). Dann rückt die Dynamik der Zeile gemeinsam
 * bis auf die übliche Höhe herunter, aber nie auf etwas, das an ihrer Stelle höher liegt.
 */
function dynamikSenken(svg: SVGSVGElement) {
  for (const gruppe of svg.querySelectorAll<SVGGElement>('g.abcjs-staff-wrapper')) {
    const dyn = [...gruppe.querySelectorAll<SVGPathElement>('path.abcjs-dynamics')]
    const oberlinie = gruppe.querySelector<SVGGraphicsElement>('.abcjs-top-line')
    if (!dyn.length || !oberlinie) continue
    const kaesten = dyn.map((e) => e.getBBox())
    const gabeln = kaesten.filter((_, i) => !/[cC]/.test(dyn[i].getAttribute('d') ?? ''))
    // Bezug: Mitte der Gabeln; bei Zeichen allein liegt diese Mitte etwa 12 über ihrem Fuß
    const bezug = gabeln.length ? gabeln[0].y + gabeln[0].height / 2 : Math.max(...kaesten.map((b) => b.y + b.height)) - 12
    let schub = oberlinie.getBBox().y - DYNAMIK_HOEHE - bezug
    if (schub < 2) continue
    for (const el of gruppe.querySelectorAll<SVGGraphicsElement>('path, text')) {
      if (dyn.includes(el as SVGPathElement) || el.closest('.abcjs-staff')) continue
      const b = kasten(el)
      for (const k of kaesten) {
        const darunter = b.y >= k.y + k.height - 0.5
        if (darunter && b.x < k.x + k.width + 3 && b.x + b.width > k.x - 3) schub = Math.min(schub, b.y - 4 - (k.y + k.height))
      }
    }
    if (schub < 2) continue
    dyn.forEach((e) => e.setAttribute('transform', `translate(0 ${schub.toFixed(2)})`))
  }
}

/** „%Varianten: Hosianna, Maranatha | Gnade, Segen | …“ – je Abschnitt zwischen Doppelstrichen eine Gruppe anderer Wörter */
function variantenLesen(abc: string): string[][] {
  const m = abc.match(/^%\s*Varianten:\s*(.*)$/m)
  return m ? m[1].split('|').map((g) => g.split(',').map((w) => w.trim()).filter(Boolean)) : []
}

/** Schriftgröße der Varianten (SVG-Einheiten; die Silben haben 13 pt, also gut 17) */
const VARIANTE_GROESSE = 15

/**
 * Varianten sind andere Wörter auf denselben Rhythmus. Sie stehen kleiner und heller unter dem ausgeschriebenen Wort
 * ihres Abschnitts, ein Wort je Zeile (Daniel, 17.11.2026: „Ein Wort unter Noten ausschreiben, andere Worte als Varianten“).
 */
function variantenSetzen(tune: TuneObject, gruppen: string[][], schrift: string) {
  if (!gruppen.some((g) => g.length)) return
  type El = { el_type?: string; rest?: unknown; type?: string; abselem?: { elemset?: Element[] } }
  // Noten je Abschnitt; ein Doppelstrich („||“, „|]“) beendet einen Abschnitt
  const abschnitte: Element[][] = [[]]
  for (const zeile of tune.lines ?? [])
    for (const el of (zeile.staff?.[0]?.voices?.[0] ?? []) as El[]) {
      if (el.el_type === 'bar' && /^bar_thin_th(in|ick)$/.test(el.type ?? '')) abschnitte.push([])
      else if (el.el_type === 'note' && !el.rest && el.abselem?.elemset?.[0]) abschnitte[abschnitte.length - 1].push(el.abselem.elemset[0])
    }
  gruppen.forEach((woerter, i) => {
    const noten = abschnitte[i]
    if (!woerter.length || !noten?.length) return
    const zeile = zeileVon(noten[0])
    const huelle = noten[0].closest<SVGGElement>('g.abcjs-staff-wrapper')
    if (!zeile || !huelle) return
    const koepfe = noten
      .filter((n) => zeileVon(n) === zeile)
      .flatMap((n) => [...n.querySelectorAll<SVGGraphicsElement>('.abcjs-notehead')])
      .map((k) => k.getBBox())
    const silben = [...huelle.querySelectorAll<SVGTextElement>('text.abcjs-lyric')]
    if (!koepfe.length || !silben.length) return
    const mitte = (Math.min(...koepfe.map((b) => b.x)) + Math.max(...koepfe.map((b) => b.x + b.width))) / 2
    let y = Math.max(...silben.map((t) => t.getBBox().y + t.getBBox().height)) + 3
    for (const wort of woerter) {
      y += VARIANTE_GROESSE * 1.1
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      t.setAttribute('x', mitte.toFixed(2))
      t.setAttribute('y', y.toFixed(2))
      t.setAttribute('text-anchor', 'middle')
      t.setAttribute('font-family', schrift)
      t.setAttribute('font-size', String(VARIANTE_GROESSE))
      t.setAttribute('font-weight', 'normal')
      t.setAttribute('fill', silben[0].getAttribute('fill') ?? 'currentColor')
      t.setAttribute('fill-opacity', '0.62')
      // abcjs gibt den Gruppen eine Kontur; ohne „stroke=none“ erbt der Text sie und wirkt fett und dunkel
      t.setAttribute('stroke', 'none')
      t.setAttribute('class', `abcjs-variante ${zeile}`)
      t.textContent = wort
      huelle.append(t)
    }
  })
}

/** Mindestabstand zwischen zwei Notenzeilen: vom Untersten der einen (Silben) bis zum Obersten der nächsten (SVG-Einheiten) */
const ZEILEN_ABSTAND = 12

/**
 * abcjs stapelt die Silben einer Zeile und eine Beschriftung über der nächsten („dunkel“) fast ohne Abstand;
 * dann rücken die folgenden Zeilen etwas tiefer.
 */
function zeilenAbstand(svg: SVGSVGElement) {
  const zeilen = [...svg.querySelectorAll<SVGGElement>('g.abcjs-staff-wrapper')]
  const kaesten = zeilen.map((z) => z.getBBox())
  let schub = 0
  for (let i = 1; i < zeilen.length; i++) {
    const luecke = kaesten[i].y - (kaesten[i - 1].y + kaesten[i - 1].height)
    if (luecke < ZEILEN_ABSTAND) schub += ZEILEN_ABSTAND - luecke
    if (schub > 0) zeilen[i].setAttribute('transform', `translate(0 ${schub.toFixed(2)})`)
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
export function notenZeichnen(
  abcjs: Abcjs,
  ziel: HTMLElement,
  abc: string,
  breite: number,
  schrift = 'Barlow',
  farbe = 'currentColor',
  /** kurzBis: bis zu so vielen Takten kein Umbruch; natuerlich: kurze Übungen behalten ihren natürlichen Notenabstand;
   *  kompakt: längere Übungen breiter zeichnen und verkleinern, wenn dadurch Zeilen wegfallen (nur App) */
  { kurzBis = KURZ_FOLIE, natuerlich = false, kompakt = false }: { kurzBis?: number; natuerlich?: boolean; kompakt?: boolean } = {},
): TuneObject {
  const kurz = taktAnzahl(abcjs, abc) <= kurzBis
  if (!kurz && kompakt) {
    const probe = abcZumZeigen(abc, schrift)
    let zeilen = zeilenBei(abcjs, ziel, probe, breite)
    const grundbreite = breite
    for (const f of KOMPAKT) {
      if (zeilen <= 1) break
      const b = Math.round(grundbreite * f)
      const z = zeilenBei(abcjs, ziel, probe, b)
      if (z < zeilen) {
        breite = b
        zeilen = z
      }
    }
  }
  const malen = (abstand: number): TuneObject => {
    const text = abcZumZeigen(abc, schrift, abstand, natuerlich && kurz)
    if (!kurz) return zeichnen(abcjs, ziel, text, breite, farbe)
    // selectTypes: false – angetippte Noten werden nicht ausgewählt (abcjs färbt sie sonst rot)
    const grund = { add_classes: true, staffwidth: breite, minPadding: 8, paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, foregroundColor: farbe, selectTypes: false as const }
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
    if (svg) {
      gabelnAbsetzen(svg)
      atemzeichenSetzen(svg)
      dynamikSenken(svg)
      variantenSetzen(tune, variantenLesen(abc), schrift)
      zeilenAbstand(svg)
    }
    zuschneiden(svg)
  }
  return tune
}
