import type { Band, NotenSeite } from './systeme'

// Liedfolien (Claude, 18.11.2026): Die Bänder eines Liedes (je System eins, siehe systeme.ts) werden der Reihe nach auf
// Folien verteilt und als Ausschnitte der Original-Seiten eingesetzt – als Vektorgrafik (pdf-lib), also scharf und
// ohne weißen Kasten.
// - Je Folie höchstens so viel Höhe, wie `proFolie` gewöhnliche Systeme (zwei Notenzeilen) brauchen; dreizeilige
//   Systeme nehmen entsprechend mehr Platz. Daniel, 18.11.2026: zwei und drei Systeme je Folie ausprobieren.
// - Alle Folien eines Liedes haben möglichst denselben Maßstab; eine Folie wird höchstens 8 % kleiner, damit ein knapp
//   zu hohes System nicht allein steht, und ein System, das allein nicht passt, so klein wie nötig.
// - Die Systeme stehen oben auf der Folie (unten verdecken oft die vorderen Reihen die Leinwand), waagrecht mittig.
// - Wiederholungen bleiben wie im Buch (Daniel, 18.11.2026).

/** Fläche für Noten auf einer Liedfolie (960 × 540 pt): Unten steht die Fußzeile */
export const LIED_FLAECHE = { x: 40, y: 22, b: 880, h: 472 }

/** Ein Band auf einer Folie: linke obere Ecke (Folienpunkte, von oben) und Maßstab */
export type Platz = { band: Band; x: number; y: number; s: number }

const median = (z: number[]) => {
  if (!z.length) return 0
  const s = [...z].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export function liedFolienPlanen(seiten: NotenSeite[], proFolie: number, f = LIED_FLAECHE): Platz[][] {
  const baender = seiten.flatMap((s) => s.baender)
  if (!baender.length) return []
  const h = (b: Band) => b.unten - b.oben
  const w = (b: Band) => b.rechts - b.links
  const sp = median(seiten.filter((s) => s.erkannt).map((s) => s.linienabstand)) || 4
  const zwei = baender.filter((b) => b.zeilen === 2).map(h)
  const mitNoten = baender.filter((b) => b.zeilen > 0).map(h)
  const typ = zwei.length ? median(zwei) : mitNoten.length ? median(mitNoten) : median(baender.map(h))
  // Abstand zwischen zwei Systemen auf der Folie, in Punkten der Notenseite
  const luecke = 2 * sp
  const budget = proFolie * typ + (proFolie - 1) * luecke
  const breiteMax = Math.max(...baender.filter((b) => b.zeilen > 0).map(w), 1)
  const massstab = Math.min(f.h / budget, f.b / breiteMax)

  // Der Reihe nach füllen, solange die Höhe reicht. Eine Folie darf dafür bis zu 8 % kleiner werden, damit knappe
  // Fälle – etwa eine Tempoangabe über dem ersten System – nicht allein auf einer Folie stehen.
  const platz = Math.min(f.h / massstab, budget) * 1.08
  const gruppen: Band[][] = []
  let akt: Band[] = []
  let hoehe = 0
  for (const b of baender) {
    const neu = akt.length ? hoehe + luecke + h(b) : h(b)
    if (akt.length && neu > platz) {
      gruppen.push(akt)
      akt = [b]
      hoehe = h(b)
    } else {
      akt.push(b)
      hoehe = neu
    }
  }
  if (akt.length) gruppen.push(akt)

  return gruppen.map((g) => {
    const gh = g.reduce((s, b) => s + h(b), 0) + (g.length - 1) * luecke
    const gw = Math.max(...g.map(w))
    const s = Math.min(massstab, f.h / gh, f.b / gw)
    let y = f.y
    return g.map((band) => {
      const p = { band, x: f.x + (f.b - w(band) * s) / 2, y, s }
      y += (h(band) + luecke) * s
      return p
    })
  })
}

/** Wo auf welcher Folie (Seitenindex im PDF) welche Ausschnitte welches Liedes stehen */
export type Einsatz = { seite: number; quelle: number; plaetze: Platz[] }
export type Quelle = { daten: Uint8Array; seiten: NotenSeite[] }

/** Setzt die Ausschnitte in das fertige Folien-PDF ein (Vektorgrafik, je Notenseite einmal eingebettet) */
export async function notenEinsetzen(pdf: ArrayBuffer, einsaetze: Einsatz[], quellen: Quelle[]): Promise<Uint8Array> {
  const { PDFDocument, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = await import('pdf-lib')
  const out = await PDFDocument.load(pdf)
  const eingebettet = []
  for (const q of quellen) {
    const src = await PDFDocument.load(q.daten, { ignoreEncryption: true })
    const seiten = src.getPages()
    const kaesten = seiten.map((p) => p.getMediaBox())
    const seitenEingebettet = await out.embedPages(
      seiten,
      kaesten.map((m) => ({ left: m.x, bottom: m.y, right: m.x + m.width, top: m.y + m.height })),
    )
    eingebettet.push(seitenEingebettet.map((e, i) => ({ e, mb: kaesten[i] })))
  }
  for (const a of einsaetze) {
    const page = out.getPage(a.seite)
    const H = page.getHeight()
    for (const p of a.plaetze) {
      const q = quellen[a.quelle]
      const seite = q.seiten[p.band.seite]
      const ziel = eingebettet[a.quelle][p.band.seite]
      if (!seite || !ziel) continue
      const v = seite.ansicht
      // Band in PDF-Koordinaten der Notenseite (y nach oben)
      const links = v[0] + p.band.links
      const rechts = v[0] + p.band.rechts
      const oben = v[3] - p.band.oben
      const unten = v[3] - p.band.unten
      const tb = (rechts - links) * p.s
      const th = (oben - unten) * p.s
      const tx = p.x
      const ty = H - p.y - th
      page.pushOperators(pushGraphicsState(), rectangle(tx, ty, tb, th), clip(), endPath())
      page.drawPage(ziel.e, { x: tx - (links - ziel.mb.x) * p.s, y: ty - (unten - ziel.mb.y) * p.s, xScale: p.s, yScale: p.s })
      page.pushOperators(popGraphicsState())
    }
  }
  return out.save()
}
