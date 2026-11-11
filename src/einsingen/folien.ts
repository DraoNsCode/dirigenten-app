import type { jsPDF as JsPDF } from 'jspdf'
import barlow400 from '../uebungen/schriften/barlow-400.ttf?url'
import barlow600 from '../uebungen/schriften/barlow-600.ttf?url'
import dejavu from '../uebungen/schriften/dejavu-sans.ttf?url'
import dejavuFett from '../uebungen/schriften/dejavu-sans-bold.ttf?url'
import cormorant600 from './schriften/cormorant-garamond-600.ttf?url'
import { ladeAbcjs } from '../uebungen/Noten'
import { notenZeichnen, type Abcjs } from './zeichnen'
import { folienFolge, type Folie } from './folie'
import type { Eintrag } from './daten'

// Folien fürs Einsingen als PDF (16:9). Eine Folie je Eintrag: oben links der Folientitel, darunter die Noten,
// eine Textzeile (mittig) oder Stichpunkte (linksbündig am linken Rand). Keine weiteren Angaben.
// Zwei gleiche Folien hintereinander werden eine.
// System aus der Gemeinde-Vorlage abgeleitet (helles Design, Variante B): Hellgrund, Dunkeltext,
// Titel in Cormorant Garamond an der Stelle der Überschrift der Vorlage.

const B = 960
const H = 540
const RAND = 64
const FARBE = { grund: '#FBFAF6', tinte: '#1A2236', grau: '#6B7180' }
const TEXT = 'EinsingText'
const NOTEN = 'EinsingNoten'
const TITEL = 'EinsingTitel'

/** Fläche für Noten und Text unter dem Titel */
const OBEN = 156
const UNTEN = H - 40

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
    const [t4, t6, n4, n7, c6] = await Promise.all([base64(barlow400), base64(barlow600), base64(dejavu), base64(dejavuFett), base64(cormorant600)])
    // Auch im Browser anmelden, damit abcjs Silben und Ziffern mit derselben Schrift misst
    const faces = [new FontFace(NOTEN, `url(${dejavu})`, { weight: '400' }), new FontFace(NOTEN, `url(${dejavuFett})`, { weight: '700' })]
    for (const f of faces) {
      await f.load()
      document.fonts.add(f)
    }
    return { t4, t6, n4, n7, c6 }
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
  an('cormorant-garamond-600.ttf', d.c6, TITEL, 'normal')
  // Kursiv gibt es nicht eingebettet; aufrecht ist besser als ein Ersatz aus Times
  doc.addFont('dejavu-sans.ttf', NOTEN, 'italic')
  doc.addFont('dejavu-sans-bold.ttf', NOTEN, 'bolditalic')
}

/** Barlow und Cormorant kennen hier nur lateinische Schrift; sonst DejaVu */
const lateinisch = (t: string) => !/[^\u0000-ɏ‐-⁞]/.test(t)

// ---------- Zeichnen ----------

/** Schriftgröße, bei der der Text in die Breite passt (höchstens `groesse`, mindestens `min`) */
function passend(doc: JsPDF, t: string, breite: number, groesse: number, min: number): number {
  doc.setFontSize(groesse)
  const w = doc.getTextWidth(t)
  return w <= breite ? groesse : Math.max(min, Math.floor((groesse * breite) / w))
}

function titelZeichnen(doc: JsPDF, titel: string) {
  doc.setFont(lateinisch(titel) ? TITEL : NOTEN, lateinisch(titel) ? 'normal' : 'bold')
  doc.setFontSize(passend(doc, titel, B - 2 * RAND, 48, 30))
  doc.setTextColor(FARBE.tinte)
  doc.text(titel, RAND, 112, { align: 'left', baseline: 'alphabetic' })
}

/** Eine Textzeile groß und mittig in der Fläche */
function textZeichnen(doc: JsPDF, text: string) {
  const groesse = 36
  doc.setFont(lateinisch(text) ? TEXT : NOTEN, 'bold')
  doc.setFontSize(groesse)
  const zeilen = doc.splitTextToSize(text, B - 2 * RAND) as string[]
  const hoehe = groesse * 1.35
  const start = (OBEN + UNTEN) / 2 - ((zeilen.length - 1) * hoehe) / 2 + groesse * 0.35
  doc.setTextColor(FARBE.tinte)
  zeilen.forEach((z, i) => doc.text(z, B / 2, start + i * hoehe, { align: 'center', baseline: 'alphabetic' }))
}

/** Stichpunkte linksbündig am linken Rand, direkt unter dem Titel */
function listeZeichnen(doc: JsPDF, punkte: string[]) {
  const groesse = 30
  const zeilenhoehe = groesse * 1.3
  const abstand = groesse * 0.55
  const einzug = 26
  let y = 182
  doc.setTextColor(FARBE.tinte)
  doc.setFillColor(FARBE.tinte)
  for (const punkt of punkte) {
    doc.setFont(lateinisch(punkt) ? TEXT : NOTEN, 'bold')
    doc.setFontSize(groesse)
    const zeilen = doc.splitTextToSize(punkt, B - 2 * RAND - einzug) as string[]
    if (y + (zeilen.length - 1) * zeilenhoehe > UNTEN) break
    doc.circle(RAND + 5, y - groesse * 0.33, 4, 'F')
    zeilen.forEach((z, i) => doc.text(z, RAND + einzug, y + i * zeilenhoehe, { align: 'left', baseline: 'alphabetic' }))
    y += (zeilen.length - 1) * zeilenhoehe + zeilenhoehe + abstand
  }
}

function notenFuerPdf(abcjs: Abcjs, halter: HTMLElement, abc: string): SVGSVGElement | null {
  const ziel = document.createElement('div')
  halter.append(ziel)
  notenZeichnen(abcjs, ziel, abc, 620, NOTEN, FARBE.tinte)
  const svg = ziel.querySelector('svg')
  if (!svg) return null
  svg.querySelectorAll('text').forEach((n) => {
    n.setAttribute('font-family', NOTEN)
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

async function folieZeichnen(doc: JsPDF, f: Folie, mittel: { svg2pdf: Svg2pdf; abcjs: Abcjs; halter: HTMLElement }) {
  doc.setFillColor(FARBE.grund)
  doc.rect(0, 0, B, H, 'F')
  titelZeichnen(doc, f.titel)
  if (f.inhalt.art === 'noten') {
    const svg = notenFuerPdf(mittel.abcjs, mittel.halter, f.inhalt.abc)
    if (svg) await svgEinsetzen(mittel.svg2pdf, doc, svg, RAND, OBEN, B - 2 * RAND, UNTEN - OBEN, 1.9)
  } else if (f.inhalt.art === 'text') {
    textZeichnen(doc, f.inhalt.text)
  } else if (f.inhalt.art === 'liste') {
    listeZeichnen(doc, f.inhalt.punkte)
  }
}

/** Erzeugt die Folien als PDF; `fortschritt` meldet „Folie n von m“ */
export async function einsingFolien(eintraege: Eintrag[], fortschritt?: (n: number, m: number) => void): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }, abcjs, schriften] = await Promise.all([import('jspdf'), import('svg2pdf.js'), ladeAbcjs(), ladeSchriften()])
  const folien = folienFolge(eintraege)
  if (!folien.length) throw new Error('Keine Folien')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [B, H], compress: true })
  schriftenAnmelden(doc, schriften)
  doc.setProperties({ title: 'Einsingen', creator: 'Dirigenten-App' })

  // Unsichtbarer Arbeitsbereich, in dem abcjs zeichnet und misst
  const halter = document.createElement('div')
  Object.assign(halter.style, { position: 'fixed', left: '-20000px', top: '0', width: '900px', opacity: '0', pointerEvents: 'none' })
  halter.setAttribute('aria-hidden', 'true')
  document.body.append(halter)
  try {
    for (let i = 0; i < folien.length; i++) {
      if (i > 0) doc.addPage([B, H], 'landscape')
      fortschritt?.(i + 1, folien.length)
      await folieZeichnen(doc, folien[i], { svg2pdf, abcjs, halter })
      halter.replaceChildren()
    }
  } finally {
    halter.remove()
  }
  return doc.output('blob')
}
