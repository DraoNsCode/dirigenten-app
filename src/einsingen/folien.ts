import type { jsPDF as JsPDF } from 'jspdf'
import barlow400 from '../uebungen/schriften/barlow-400.ttf?url'
import barlow600 from '../uebungen/schriften/barlow-600.ttf?url'
import dejavu from '../uebungen/schriften/dejavu-sans.ttf?url'
import dejavuFett from '../uebungen/schriften/dejavu-sans-bold.ttf?url'
import cormorant600 from './schriften/cormorant-garamond-600.ttf?url'
import barlowSchmal600 from './schriften/barlow-condensed-600.ttf?url'
import { ladeAbcjs } from '../uebungen/Noten'
import { KURZ_APP, notenZeichnen, type Abcjs } from './zeichnen'
import { naechsteProbe, type Folie } from './folie'
import { ladeLogo, type Logo } from './logo'

// Folien fürs Einsingen als PDF (16:9). Eine Folie je ausgewählter Grundübung oder Stufe: oben links der Folientitel, darüber die Dachzeile
// mit der Phase, darunter die Noten, eine Textzeile (mittig) oder Stichpunkte (linksbündig am linken Rand);
// links unten die Fußzeile „CHORPROBE · 19. NOVEMBER 2026“ mit dem Datum der Deckfolie (Daniel, 17.11.2026; vorher „EINSINGEN“,
// so muss keine Übung fest dem Einsingen oder einem anderen Teil der Probe zugeordnet sein). Keine weiteren Angaben. Zwei gleiche Folien hintereinander werden eine.
// System aus der Gemeinde-Vorlage abgeleitet (helles Design, Variante B): Hellgrund, Dunkeltext,
// Titel in Cormorant Garamond an der Stelle der Überschrift der Vorlage, Dachzeile und Fußzeile in Barlow Condensed.
// Größen: Daniel, 11.11.2026 (Titel 37, Stichpunkte 26, Dachzeile 12, Fußzeile 10, Noten höchstens 1,6-fach).
//
// Vor den Übungen steht immer eine Deckfolie nach der Titelfolie der Gemeinde-Vorlage (helle Variante):
// Logo, Datum der Probe, Titel „Chorprobe“, Goldstrich (Daniel, 16.11.2026).
//
// Seit 14.11.2026 gilt die Gestaltung „gleich groß“ (siehe folieGleichGross): gleicher Aufbau, aber die Noten sind auf
// jeder Folie gleich groß und Text ohne Noten steht größer. Die Fassung vom 11.11. bleibt als 'titel-oben' erhalten.

const B = 960
const H = 540
const RAND = 64
const FARBE = { grund: '#FBFAF6', tinte: '#1A2236', grau: '#6B7180', goldbraun: '#7A5C24', gold: '#C9A25A', linie: '#E2DACB' }
const TEXT = 'EinsingText'
const NOTEN = 'EinsingNoten'
const TITEL = 'EinsingTitel'
const SCHMAL = 'EinsingSchmal'

const UNTEN = H - 40
/** Grundlinie des Titels (Stelle der Überschrift in der Vorlage) */
const TITEL_Y = 112

/** Größen auf der Folie (Punkt; Noten als größter Vergrößerungsfaktor) */
export type Groessen = { titel: number; noten: number; text: number; liste: number; dachzeile: number; fusszeile: number }
export const GROESSEN: Groessen = { titel: 37, noten: 1.6, text: 30, liste: 26, dachzeile: 12, fusszeile: 10 }

/** Gliedernde Elemente um den Titel (aus der Gemeinde-Vorlage) */
export type Struktur = {
  /** Dachzeile über dem Titel: die Phase in gesperrten Versalien, Goldbraun */
  dachzeile?: boolean
  /** kurze Goldlinie unter dem Titel */
  goldlinie?: boolean
  /** feine Trennlinie über die ganze Breite unter dem Titel */
  trennlinie?: boolean
  /** Fußzeile „Chorprobe · Datum“ links unten */
  fusszeile?: boolean
}

/** Entschieden: Dachzeile und Fußzeile, keine Linien unter dem Titel */
export const STRUKTUR: Struktur = { dachzeile: true, fusszeile: true }

/** Oberkante der Fläche für Noten und Text: unter dem Titel (und seinen Linien), mit Abstand je nach Titelgröße */
const obenVon = (g: Groessen, s: Struktur = {}) => TITEL_Y + g.titel * 0.92 + (s.goldlinie || s.trennlinie ? 12 : 0)
/** Unterkante der Fläche */
const untenVon = (s: Struktur = {}) => (s.fusszeile ? UNTEN - 14 : UNTEN)

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
    const [t4, t6, n4, n7, c6, s6] = await Promise.all([
      base64(barlow400), base64(barlow600), base64(dejavu), base64(dejavuFett), base64(cormorant600), base64(barlowSchmal600),
    ])
    // Auch im Browser anmelden, damit abcjs Silben und Ziffern mit derselben Schrift misst
    const faces = [new FontFace(NOTEN, `url(${dejavu})`, { weight: '400' }), new FontFace(NOTEN, `url(${dejavuFett})`, { weight: '700' })]
    for (const f of faces) {
      await f.load()
      document.fonts.add(f)
    }
    return { t4, t6, n4, n7, c6, s6 }
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
  an('barlow-condensed-600.ttf', d.s6, SCHMAL, 'normal')
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

function titelZeichnen(doc: JsPDF, f: Folie, g: Groessen, s: Struktur, fuss: string) {
  const titel = f.titel
  if (s.dachzeile && f.phase) {
    const groesse = g.dachzeile
    doc.setFont(SCHMAL, 'normal')
    doc.setFontSize(groesse)
    doc.setTextColor(FARBE.goldbraun)
    doc.text(f.phase.toLocaleUpperCase('de'), RAND, TITEL_Y - g.titel * 1.05, { align: 'left', baseline: 'alphabetic', charSpace: groesse * 0.16 })
  }
  doc.setFont(lateinisch(titel) ? TITEL : NOTEN, lateinisch(titel) ? 'normal' : 'bold')
  doc.setFontSize(passend(doc, titel, B - 2 * RAND, g.titel, Math.round(g.titel * 0.65)))
  doc.setTextColor(FARBE.tinte)
  doc.text(titel, RAND, TITEL_Y, { align: 'left', baseline: 'alphabetic' })
  if (s.goldlinie) {
    doc.setFillColor(FARBE.gold)
    doc.rect(RAND, TITEL_Y + g.titel * 0.4, 40, 1.6, 'F')
  }
  if (s.trennlinie) {
    doc.setFillColor(FARBE.linie)
    doc.rect(RAND, TITEL_Y + g.titel * (s.goldlinie ? 0.62 : 0.45), B - 2 * RAND, 0.8, 'F')
  }
  if (s.fusszeile) {
    const groesse = g.fusszeile
    doc.setFont(SCHMAL, 'normal')
    doc.setFontSize(groesse)
    doc.setTextColor(FARBE.grau)
    doc.text(fuss, RAND, H - 30, { align: 'left', baseline: 'alphabetic', charSpace: groesse * 0.16 })
  }
}

/** Was jede Folie zum Zeichnen braucht: Werkzeuge, Arbeitsbereich und der Text der Fußzeile */
type Mittel = { svg2pdf: Svg2pdf; abcjs: Abcjs; halter: HTMLElement; fuss: string }

/** Eine Textzeile groß und mittig in der Fläche */
function textZeichnen(doc: JsPDF, text: string, g: Groessen, s: Struktur) {
  const groesse = g.text
  const OBEN = obenVon(g, s)
  const UNTEN = untenVon(s)
  doc.setFont(lateinisch(text) ? TEXT : NOTEN, 'bold')
  doc.setFontSize(groesse)
  const zeilen = doc.splitTextToSize(text, B - 2 * RAND) as string[]
  const hoehe = groesse * 1.35
  const start = (OBEN + UNTEN) / 2 - ((zeilen.length - 1) * hoehe) / 2 + groesse * 0.35
  doc.setTextColor(FARBE.tinte)
  zeilen.forEach((z, i) => doc.text(z, B / 2, start + i * hoehe, { align: 'center', baseline: 'alphabetic' }))
}

/** Stichpunkte linksbündig am linken Rand, direkt unter dem Titel */
function listeZeichnen(doc: JsPDF, punkte: string[], g: Groessen, s: Struktur) {
  const UNTEN = untenVon(s)
  const groesse = g.liste
  const zeilenhoehe = groesse * 1.3
  const abstand = groesse * 0.55
  const einzug = Math.round(groesse * 0.87)
  let y = obenVon(g, s) + groesse * 0.87
  doc.setTextColor(FARBE.tinte)
  doc.setFillColor(FARBE.tinte)
  for (const punkt of punkte) {
    doc.setFont(lateinisch(punkt) ? TEXT : NOTEN, 'bold')
    doc.setFontSize(groesse)
    const zeilen = doc.splitTextToSize(punkt, B - 2 * RAND - einzug) as string[]
    if (y + (zeilen.length - 1) * zeilenhoehe > UNTEN) break
    doc.circle(RAND + groesse * 0.17, y - groesse * 0.33, groesse * 0.13, 'F')
    zeilen.forEach((z, i) => doc.text(z, RAND + einzug, y + i * zeilenhoehe, { align: 'left', baseline: 'alphabetic' }))
    y += (zeilen.length - 1) * zeilenhoehe + zeilenhoehe + abstand
  }
}

function notenFuerPdf(abcjs: Abcjs, halter: HTMLElement, abc: string, zeilenbreite = 620, opt?: { kurzBis?: number; natuerlich?: boolean }): SVGSVGElement | null {
  const ziel = document.createElement('div')
  halter.append(ziel)
  notenZeichnen(abcjs, ziel, abc, zeilenbreite, NOTEN, FARBE.tinte, opt)
  const svg = ziel.querySelector('svg')
  if (!svg) return null
  svg.querySelectorAll('text').forEach((n) => {
    // Beschriftungen über den Noten (Bausteine A, B, C) stehen wie Silben und Ziffern in Dunkeltext
    n.setAttribute('font-family', NOTEN)
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

// ---------- Gestaltung „gleich groß“ (seit 14.11.2026) ----------

/** Größter Text ohne Noten (Punkt) und die Breite, bis zu der er in einer Zeile bleibt */
const TEXT_GROSS = 40
const TEXT_EINZEILIG = 0.75

/**
 * Aufbau wie „Titel oben“ (Dachzeile, Titel links oben, Fußzeile; Inhalt mittig darunter), aber:
 * - Noten haben auf jeder Folie dieselbe Größe und ihren natürlichen Abstand. Vorher wurden Übungen ab drei Takten
 *   in die Breite gezogen und dafür verkleinert, sodass Silben und Ziffern von Folie zu Folie verschieden groß waren.
 * - Text ohne Noten steht größer; eine Folge mit „ – “, die zu breit würde, steht Glied für Glied untereinander.
 */
async function folieGleichGross(
  doc: JsPDF,
  f: Folie,
  g: Groessen,
  s: Struktur,
  vermerk: string | undefined,
  mittel: Mittel,
) {
  doc.setFillColor(FARBE.grund)
  doc.rect(0, 0, B, H, 'F')
  titelZeichnen(doc, f, g, s, mittel.fuss)
  const oben = obenVon(g, s)
  const unten = untenVon(s)
  const breite = B - 2 * RAND
  if (f.inhalt.art === 'noten') {
    // Zeilenbreite so, dass die Noten bei fester Vergrößerung die Folienbreite füllen; bis drei Takte kein Umbruch
    const svg = notenFuerPdf(mittel.abcjs, mittel.halter, f.inhalt.abc, Math.floor(breite / g.noten), { kurzBis: KURZ_APP, natuerlich: true })
    if (svg) await svgEinsetzen(mittel.svg2pdf, doc, svg, RAND, oben, breite, unten - oben, g.noten)
  } else if (f.inhalt.art === 'text') {
    const text = f.inhalt.text
    doc.setFont(lateinisch(text) ? TEXT : NOTEN, 'bold')
    const passt = (t: string, groesse: number, anteil = 1) => {
      doc.setFontSize(groesse)
      return doc.getTextWidth(t) <= breite * anteil
    }
    let groesse = TEXT_GROSS
    let zeilen = [text]
    if (!passt(text, groesse, TEXT_EINZEILIG)) {
      const glieder = text.split(/\s+–\s+/)
      if (glieder.length > 1 && glieder.every((glied) => passt(glied, groesse, TEXT_EINZEILIG))) zeilen = glieder
      else {
        while (groesse > g.text && !passt(text, groesse)) groesse -= 2
        doc.setFontSize(groesse)
        zeilen = doc.splitTextToSize(text, breite) as string[]
      }
    }
    doc.setFontSize(groesse)
    const zeilenhoehe = groesse * 1.3
    const start = (oben + unten) / 2 - ((zeilen.length - 1) * zeilenhoehe) / 2 + groesse * 0.35
    doc.setTextColor(FARBE.tinte)
    zeilen.forEach((zeile, i) => doc.text(zeile, B / 2, start + i * zeilenhoehe, { align: 'center', baseline: 'alphabetic' }))
  } else if (f.inhalt.art === 'liste') {
    listeZeichnen(doc, f.inhalt.punkte, g, s)
  }
  vermerkZeichnen(doc, vermerk)
}

// ---------- Deckfolie ----------

export type Deckfolie = { titel: string; datum: Date }

/** Fußzeile jeder Übungsfolie: „CHORPROBE · 19. NOVEMBER 2026“ (Titel und Datum der Deckfolie) */
const fusszeile = (d: Deckfolie) =>
  `${d.titel} · ${d.datum.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`.toLocaleUpperCase('de')

/** „DONNERSTAG, 19. NOVEMBER 2026“ */
const datumZeile = (d: Date) =>
  d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('de')

/**
 * Titelfolie der Gemeinde-Vorlage, helle Variante (Folie „titel“ in „Folienvorlage Baptistengemeinde Hanau“),
 * von 1920 × 1080 auf 960 × 540 halbiert: mittig untereinander Logo (220 × 107,5), Dachzeile (Barlow Condensed 12,
 * gesperrt, Goldbraun), Titel (Cormorant Garamond 56), Goldstrich (40 × 1); Abstand 20. Die Zeile für Untertitel
 * oder Redner bleibt weg.
 */
function deckfolieZeichnen(doc: JsPDF, d: Deckfolie, logo: Logo | null) {
  doc.setFillColor(FARBE.grund)
  doc.rect(0, 0, B, H, 'F')
  const ABSTAND = 20
  const LOGO = { b: 220, h: 107.5 }
  const DACH = { groesse: 12, sperrung: 2, hoehe: 12 * 1.2 }
  const TITEL_GROESSE = 56
  const titelHoehe = TITEL_GROESSE * 1.05
  const hoehe = (logo ? LOGO.h + ABSTAND : 0) + DACH.hoehe + ABSTAND + titelHoehe + ABSTAND + 1
  let y = (H - hoehe) / 2

  if (logo) {
    // Seitenverhältnis behalten (wie object-fit: contain)
    const f = Math.min(LOGO.b / logo.breite, LOGO.h / logo.hoehe)
    const b = logo.breite * f
    const h = logo.hoehe * f
    doc.addImage(logo.daten, 'PNG', (B - b) / 2, y + (LOGO.h - h) / 2, b, h, 'logo', 'SLOW')
    y += LOGO.h + ABSTAND
  }

  const zeile = datumZeile(d.datum)
  doc.setFont(SCHMAL, 'normal')
  doc.setFontSize(DACH.groesse)
  doc.setTextColor(FARBE.goldbraun)
  // Mit Sperrung selbst mitteln (jsPDF rechnet die Sperrung beim Zentrieren nicht mit)
  const breite = doc.getTextWidth(zeile) + DACH.sperrung * (zeile.length - 1)
  doc.text(zeile, (B - breite) / 2, y + DACH.hoehe / 2, { baseline: 'middle', charSpace: DACH.sperrung })
  y += DACH.hoehe + ABSTAND

  doc.setFont(TITEL, 'normal')
  doc.setFontSize(passend(doc, d.titel, B - 2 * RAND, TITEL_GROESSE, 36))
  doc.setTextColor(FARBE.tinte)
  doc.text(d.titel, B / 2, y + titelHoehe / 2, { align: 'center', baseline: 'middle' })
  y += titelHoehe + ABSTAND

  doc.setFillColor(FARBE.gold)
  doc.rect((B - 40) / 2, y, 40, 1, 'F')
}

/** Nur in Vergleichs-PDFs: welche Fassung diese Seite zeigt */
function vermerkZeichnen(doc: JsPDF, vermerk: string | undefined) {
  if (!vermerk) return
  doc.setFont(TEXT, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(FARBE.grau)
  doc.text(vermerk, B - RAND, H - 18, { align: 'right', baseline: 'alphabetic' })
}

async function folieZeichnen(
  doc: JsPDF,
  f: Folie,
  g: Groessen,
  s: Struktur,
  vermerk: string | undefined,
  mittel: Mittel,
) {
  doc.setFillColor(FARBE.grund)
  doc.rect(0, 0, B, H, 'F')
  titelZeichnen(doc, f, g, s, mittel.fuss)
  if (f.inhalt.art === 'noten') {
    const svg = notenFuerPdf(mittel.abcjs, mittel.halter, f.inhalt.abc)
    const oben = obenVon(g, s)
    if (svg) await svgEinsetzen(mittel.svg2pdf, doc, svg, RAND, oben, B - 2 * RAND, untenVon(s) - oben, g.noten)
  } else if (f.inhalt.art === 'text') {
    textZeichnen(doc, f.inhalt.text, g, s)
  } else if (f.inhalt.art === 'liste') {
    listeZeichnen(doc, f.inhalt.punkte, g, s)
  }
  vermerkZeichnen(doc, vermerk)
}

/** 'titel-oben': Fassung vom 11.11.2026; 'gleich-gross': Noten überall gleich groß, Text größer (seit 14.11.2026, die übliche Fassung) */
export type Gestaltung = 'titel-oben' | 'gleich-gross'
type Variante = { groessen: Groessen; struktur?: Struktur; vermerk?: string; gestaltung?: Gestaltung }

/** Erzeugt die Folien als PDF, vorneweg die Deckfolie; `fortschritt` meldet „Folie n von m“ */
export async function folienPdf(
  liste: Folie[],
  fortschritt?: (n: number, m: number) => void,
  /** Nur zum Vergleichen: jede Folie in mehreren Fassungen, mit Vermerk */
  varianten: Variante[] = [{ groessen: GROESSEN, struktur: STRUKTUR }],
  deckfolie: Deckfolie = { titel: 'Chorprobe', datum: naechsteProbe() },
): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }, abcjs, schriften, logo] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
    ladeAbcjs(),
    ladeSchriften(),
    // Ohne Logo (z. B. keine Verbindung) entsteht die Deckfolie trotzdem
    ladeLogo().catch(() => null),
  ])
  const folien = liste.flatMap((f) => varianten.map((v) => ({ f, ...v })))
  if (!folien.length) throw new Error('Keine Folien')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [B, H], compress: true })
  schriftenAnmelden(doc, schriften)
  doc.setProperties({ title: `${deckfolie.titel} ${deckfolie.datum.toLocaleDateString('de-DE')}`, creator: 'Dirigenten-App' })

  // Unsichtbarer Arbeitsbereich, in dem abcjs zeichnet und misst
  const halter = document.createElement('div')
  Object.assign(halter.style, { position: 'fixed', left: '-20000px', top: '0', width: '900px', opacity: '0', pointerEvents: 'none' })
  halter.setAttribute('aria-hidden', 'true')
  document.body.append(halter)
  try {
    const m = folien.length + 1
    fortschritt?.(1, m)
    deckfolieZeichnen(doc, deckfolie, logo)
    for (let i = 0; i < folien.length; i++) {
      doc.addPage([B, H], 'landscape')
      fortschritt?.(i + 2, m)
      const zeichne = folien[i].gestaltung === 'titel-oben' ? folieZeichnen : folieGleichGross
      await zeichne(doc, folien[i].f, folien[i].groessen, folien[i].struktur ?? {}, folien[i].vermerk, { svg2pdf, abcjs, halter, fuss: fusszeile(deckfolie) })
      halter.replaceChildren()
    }
  } finally {
    halter.remove()
  }
  return doc.output('blob')
}
