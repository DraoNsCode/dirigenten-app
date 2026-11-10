import type { jsPDF as JsPDF } from 'jspdf'
import barlow400 from './schriften/barlow-400.ttf?url'
import barlow600 from './schriften/barlow-600.ttf?url'
import dejavu from './schriften/dejavu-sans.ttf?url'
import dejavuFett from './schriften/dejavu-sans-bold.ttf?url'
import { schlag, tonartName } from './abc'
import type { AuswahlPunkt } from './auswahl'
import { svgAus } from './Grafik'
import { abcFuerAnsicht, blockArt, ladeAbcjs, zeichnen } from './Noten'
import { punktInhalt, tonartBlock, type PunktInhalt } from './punkt'
import type { Sammlung } from './sammlung'
import type { Grafik, Notenblock } from './typen'

// Probenfolien als PDF (16:9). Muster zum Abstimmen mit Daniel; Aufbau einer Folie:
//   Bereich (klein) · Tonart und Tempo (rechts) · Titel · eine Zeile Stichwort/Kern/Stufe · Noten oder Grafik.
// Mehrere Notenblöcke einer Übung bekommen je eine eigene Folie.
// Schriften werden eingebettet: Barlow für Texte, DejaVu Sans für Noten (Kyrillisch, ♯, ♭).

const B = 960
const H = 540
const RAND = 48
const FARBE = { tinte: '#1a2236', grau: '#6b7180', label: '#7a5c24', gold: '#c9a25a', marine: '#14244a' }
const TEXT = 'FolienText'
const NOTEN = 'FolienNoten'

type Folie = {
  bereich: string
  titel: string
  unterzeile?: string
  tonart?: string
  tempo?: string
  inhalt: { art: 'noten'; block: Notenblock; schritte: number } | { art: 'grafik'; grafik: Grafik } | { art: 'liste'; punkte: string[] } | { art: 'leer' }
}

// ---------- Folien aus der Auswahl ----------

function folienFuer(s: Sammlung, p: AuswahlPunkt, inhalt: PunktInhalt): Folie[] {
  const e = inhalt.art === 'uebung' ? inhalt.u : inhalt.e
  const b = s.bereiche.get(e.bereiche[0])
  const bereich = b ? `${b.nr} · ${b.name}` : ''
  const titel = inhalt.zusatz && inhalt.art === 'uebung' ? `${inhalt.titel} – ${inhalt.zusatz}` : inhalt.titel
  const tb = tonartBlock(inhalt.noten)
  const tonart = tb ? tonartName(tb.abc, p.schritte) : undefined
  const tempoText = (n?: Notenblock, t?: number) => {
    if (n) return `${schlag(n.abc).zeichen} = ${n.tempo}`
    return t ? `♩ = ${t}` : undefined
  }

  let grund: string | undefined
  if (inhalt.art === 'erklaerung') grund = inhalt.e.kern
  else if (inhalt.stufe) grund = inhalt.stufe.aenderung
  else grund = inhalt.u.stichwort

  const folien: Folie[] = []
  const grafik = e.grafik
  if (inhalt.art === 'erklaerung' && grafik) folien.push({ bereich, titel, unterzeile: grund, inhalt: { art: 'grafik', grafik } })
  inhalt.noten.forEach((n, i) => {
    const mehrere = inhalt.noten.length > 1
    folien.push({
      bereich,
      titel,
      unterzeile: mehrere && n.hinweis ? n.hinweis : i === 0 ? grund : undefined,
      tonart: blockArt(n).rhythmus ? undefined : tonartName(n.abc, p.schritte),
      tempo: tempoText(n),
      inhalt: { art: 'noten', block: n, schritte: p.schritte },
    })
  })
  if (!folien.length) {
    const tempo = inhalt.art === 'uebung' ? tempoText(undefined, inhalt.tempo) : undefined
    if (grafik) folien.push({ bereich, titel, unterzeile: grund, tempo, inhalt: { art: 'grafik', grafik } })
    else if (inhalt.art === 'uebung') folien.push({ bereich, titel, unterzeile: grund, tempo, inhalt: { art: 'liste', punkte: inhalt.u.ablauf } })
    else folien.push({ bereich, titel, unterzeile: grund, inhalt: { art: 'leer' } })
  }
  if (folien.length && !folien[0].tonart && tonart) folien[0].tonart = tonart
  return folien
}

// ---------- Schriften ----------

async function base64(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Schrift nicht geladen (${r.status})`)
  const bytes = new Uint8Array(await r.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

let schriftenGeladen: Promise<Record<string, string>> | null = null
function ladeSchriften() {
  schriftenGeladen ??= (async () => {
    const [t4, t6, n4, n7] = await Promise.all([base64(barlow400), base64(barlow600), base64(dejavu), base64(dejavuFett)])
    // Auch im Browser anmelden, damit abcjs Silben und Ziffern mit derselben Schrift misst
    const faces = [new FontFace(NOTEN, `url(${dejavu})`, { weight: '400' }), new FontFace(NOTEN, `url(${dejavuFett})`, { weight: '700' })]
    for (const f of faces) {
      await f.load()
      document.fonts.add(f)
    }
    return { t4, t6, n4, n7 }
  })()
  schriftenGeladen.catch(() => (schriftenGeladen = null))
  return schriftenGeladen
}

function schriftenAnmelden(doc: JsPDF, d: Record<string, string>) {
  const an = (datei: string, daten: string, familie: string, stil: string) => {
    doc.addFileToVFS(datei, daten)
    doc.addFont(datei, familie, stil)
  }
  an('barlow-400.ttf', d.t4, TEXT, 'normal')
  an('barlow-600.ttf', d.t6, TEXT, 'bold')
  an('dejavu-sans.ttf', d.n4, NOTEN, 'normal')
  an('dejavu-sans-bold.ttf', d.n7, NOTEN, 'bold')
  // Kursiv gibt es nicht eingebettet; aufrecht ist besser als ein Ersatz aus Times
  doc.addFont('barlow-400.ttf', TEXT, 'italic')
  doc.addFont('barlow-600.ttf', TEXT, 'bolditalic')
  doc.addFont('dejavu-sans.ttf', NOTEN, 'italic')
  doc.addFont('dejavu-sans-bold.ttf', NOTEN, 'bolditalic')
}

/** Barlow kennt nur lateinische Schrift; sonst DejaVu */
const familieFuer = (t: string) => (/[^\u0000-ɏ‐-⁞]/.test(t) ? NOTEN : TEXT)

// ---------- Zeichnen ----------

function text(doc: JsPDF, t: string, x: number, y: number, groesse: number, stil: 'normal' | 'bold', farbe: string, opt: { align?: 'left' | 'right'; abstand?: number } = {}) {
  doc.setFont(familieFuer(t), stil)
  doc.setFontSize(groesse)
  doc.setTextColor(farbe)
  doc.text(t, x, y, { align: opt.align ?? 'left', charSpace: opt.abstand ?? 0, baseline: 'alphabetic' })
}

/** Text umbrechen; höchstens `maxZeilen`, sonst mit … kürzen. Gibt die y-Position unter dem Text zurück */
function absatz(doc: JsPDF, t: string, x: number, y: number, breite: number, groesse: number, stil: 'normal' | 'bold', farbe: string, maxZeilen: number, zeilenhoehe = 1.2) {
  doc.setFont(familieFuer(t), stil)
  doc.setFontSize(groesse)
  let zeilen: string[] = doc.splitTextToSize(t, breite)
  if (zeilen.length > maxZeilen) {
    zeilen = zeilen.slice(0, maxZeilen)
    zeilen[maxZeilen - 1] = zeilen[maxZeilen - 1].replace(/\s*\S*$/, ' …')
  }
  zeilen.forEach((z, i) => text(doc, z, x, y + i * groesse * zeilenhoehe, groesse, stil, farbe))
  return y + (zeilen.length - 1) * groesse * zeilenhoehe
}

/** Grafik der Sammlung für das PDF: Farben und Schrift fest einsetzen (svg2pdf kennt keine CSS-Variablen) */
function grafikFuerPdf(svgText: string): SVGSVGElement | null {
  const farben: Record<string, string> = { accent: FARBE.marine, 'accent-ink': '#ffffff', 'accent-soft': '#e7ebf3', surface: '#ffffff', warn: FARBE.label }
  const t = svgText
    .replace(/var\(--([a-z-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name: string, ersatz?: string) => farben[name] ?? ersatz?.trim() ?? FARBE.tinte)
    .replace(/currentColor/g, FARBE.tinte)
  const svg = svgAus(t)
  if (!svg) return null
  // Barlow ist schmaler als die Schrift der Vorschau und passt in die Grafik; für ♯, ♭ usw. DejaVu
  svg.querySelectorAll('[font-family]').forEach((n) => n.removeAttribute('font-family'))
  svg.querySelectorAll('text').forEach((n) => n.setAttribute('font-family', familieFuer(n.textContent ?? '')))
  return svg
}

function notenFuerPdf(abcjs: Awaited<ReturnType<typeof ladeAbcjs>>, halter: HTMLElement, block: Notenblock, schritte: number): SVGSVGElement | null {
  const ziel = document.createElement('div')
  halter.append(ziel)
  zeichnen(abcjs, ziel, abcFuerAnsicht(abcjs, block, schritte, 'frauen', NOTEN), 620, FARBE.tinte)
  const svg = ziel.querySelector('svg')
  if (!svg) return null
  svg.querySelectorAll('text').forEach((n) => {
    n.setAttribute('font-family', NOTEN)
    // Hinweise über den Noten wie „(2)“ grau
    if (n.closest('.abcjs-annotation')) n.setAttribute('fill', FARBE.grau)
  })
  return svg
}

type Svg2pdf = typeof import('svg2pdf.js').svg2pdf

async function svgEinsetzen(svg2pdf: Svg2pdf, doc: JsPDF, svg: SVGSVGElement, x: number, y: number, breite: number, hoehe: number, maxSkala: number) {
  const vb = svg.viewBox.baseVal
  const w = vb && vb.width ? vb.width : svg.getBBox().width
  const h = vb && vb.height ? vb.height : svg.getBBox().height
  if (!w || !h) return
  const skala = Math.min(breite / w, hoehe / h, maxSkala)
  const bw = w * skala
  const bh = h * skala
  await svg2pdf(svg, doc, { x: x + (breite - bw) / 2, y: y + Math.max(0, (hoehe - bh) / 2.5), width: bw, height: bh })
}

async function folieZeichnen(
  doc: JsPDF,
  f: Folie,
  nr: number,
  gesamt: number,
  mittel: { svg2pdf: Svg2pdf; abcjs: Awaited<ReturnType<typeof ladeAbcjs>>; halter: HTMLElement; grafiken: Record<string, string> },
) {
  const innen = B - 2 * RAND
  // Kopf
  if (f.bereich) text(doc, f.bereich.toLocaleUpperCase('de'), RAND, 52, 12, 'bold', FARBE.label, { abstand: 1.2 })
  // Rechts oben: Tonart, davor das Tempo
  let rechts = B - RAND
  if (f.tonart) {
    text(doc, f.tonart, rechts, 52, 15, 'bold', FARBE.tinte, { align: 'right' })
    rechts -= doc.getTextWidth(f.tonart) + 14
  }
  if (f.tempo) text(doc, f.tempo, rechts, 52, 13, 'normal', FARBE.grau, { align: 'right' })
  let y = absatz(doc, f.titel, RAND, 98, innen, 34, 'bold', FARBE.tinte, 2, 1.12)
  doc.setFillColor(FARBE.gold)
  doc.rect(RAND, y + 14, 40, 2, 'F')
  y += 16
  if (f.unterzeile) y = absatz(doc, f.unterzeile, RAND, y + 32, innen, 20, 'normal', FARBE.grau, 2, 1.25)
  const oben = y + 28
  const unten = H - 40
  const hoehe = unten - oben

  if (f.inhalt.art === 'noten') {
    const svg = notenFuerPdf(mittel.abcjs, mittel.halter, f.inhalt.block, f.inhalt.schritte)
    if (svg) await svgEinsetzen(mittel.svg2pdf, doc, svg, RAND, oben, innen, hoehe, 1.9)
  } else if (f.inhalt.art === 'grafik') {
    const t = mittel.grafiken[f.inhalt.grafik.datei]
    const svg = t ? grafikFuerPdf(t) : null
    if (svg) {
      mittel.halter.append(svg)
      await svgEinsetzen(mittel.svg2pdf, doc, svg, RAND, oben, innen, hoehe, 1.4)
    }
  } else if (f.inhalt.art === 'liste') {
    let ly = oben + 18
    f.inhalt.punkte.slice(0, 6).forEach((pt, i) => {
      if (ly > unten - 10) return
      text(doc, `${i + 1}.`, RAND, ly, 20, 'bold', FARBE.label)
      ly = absatz(doc, pt, RAND + 30, ly, innen - 30, 20, 'normal', FARBE.tinte, 2, 1.25) + 34
    })
  }

  text(doc, `${nr} / ${gesamt}`, B - RAND, H - 22, 10, 'normal', FARBE.grau, { align: 'right' })
}

/** Erzeugt die Probenfolien als PDF; `fortschritt` meldet „Folie n von m“ */
export async function probenfolien(s: Sammlung, punkte: AuswahlPunkt[], fortschritt?: (n: number, m: number) => void): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }, abcjs, schriften] = await Promise.all([import('jspdf'), import('svg2pdf.js'), ladeAbcjs(), ladeSchriften()])
  const folien = punkte.flatMap((p) => {
    const inhalt = punktInhalt(s, p)
    return inhalt ? folienFuer(s, p, inhalt) : []
  })
  if (!folien.length) throw new Error('Keine Folien')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [B, H], compress: true })
  schriftenAnmelden(doc, schriften)
  doc.setProperties({ title: 'Probenfolien', creator: 'Dirigenten-App' })

  // Unsichtbarer Arbeitsbereich, in dem abcjs zeichnet und misst
  const halter = document.createElement('div')
  Object.assign(halter.style, { position: 'fixed', left: '-20000px', top: '0', width: '900px', opacity: '0', pointerEvents: 'none' })
  halter.setAttribute('aria-hidden', 'true')
  document.body.append(halter)
  try {
    for (let i = 0; i < folien.length; i++) {
      if (i > 0) doc.addPage([B, H], 'landscape')
      fortschritt?.(i + 1, folien.length)
      await folieZeichnen(doc, folien[i], i + 1, folien.length, { svg2pdf, abcjs, halter, grafiken: s.grafiken })
      halter.replaceChildren()
    }
  } finally {
    halter.remove()
  }
  return doc.output('blob')
}
