import { ladePdfjs } from './pdfjs'

// Notenanalyse für die Liedfolien (Claude, 18.11.2026): findet auf jeder Seite eines Noten-PDFs die Systeme und schneidet
// die Seite in waagrechte Streifen („Bänder“), je System eins. Gelesen werden nur die Zeichendaten des PDFs (pdf.js,
// Operatorliste), nichts wird gezeichnet:
// - Notenlinien: lange, flache Striche; je fünf mit gleichem Abstand sind eine Notenzeile.
// - Notenzeilen, die ein senkrechter Strich verbindet (Taktstrich, Akkolade), gehören zu einem System.
// - Geschnitten wird in der größten Lücke ohne Tinte zwischen zwei Systemen; über dem ersten und unter dem letzten
//   System einer Seite in der größten Lücke innerhalb eines Fensters (so bleibt der Liedtitel draußen, Tempo und
//   Dynamik bleiben drin).
// - Text unter dem letzten System einer Seite (z. B. weitere Strophen) wird ein eigenes Band ohne Notenzeilen.
// - Seiten ohne erkennbare Notenlinien (Scans, nachgezeichnete Noten) werden ein Band über die ganze Seite.
// Am 18.11.2026 an allen 158 Liedern geprüft: 147 mit Notenlinien erkannt, 11 Scans oder nachgezeichnet.

/** Ein Streifen einer Notenseite in Punkten, von oben links der Seitenansicht (pdf.js-Ansicht, Maßstab 1) */
export type Band = {
  seite: number
  oben: number
  unten: number
  links: number
  rechts: number
  /** Notenzeilen im System; 0 = Text ohne Noten oder nicht erkannt */
  zeilen: number
  /** Seite ohne erkannte Notenlinien (Scan): das Band ist die ganze Seite */
  ganzeSeite?: boolean
}

export type NotenSeite = {
  /** Ansicht der Seite in PDF-Koordinaten [x0, y0, x1, y1] (pdf.js page.view) */
  ansicht: number[]
  baender: Band[]
  /** Notenlinien gefunden */
  erkannt: boolean
  /** Linienabstand in Punkten (0, wenn nicht erkannt) */
  linienabstand: number
}

type M = number[]
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]
const ap = (m: M, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const EINS: M = [1, 0, 0, 1, 0, 0]

type Kasten = { x0: number; y0: number; x1: number; y1: number }
type Linie = { x0: number; x1: number; y: number }
type Zeile = { oben: number; unten: number; x0: number; x1: number; sp: number }
type System = { oben: number; unten: number; x0: number; x1: number; zeilen: number }

const median = (z: number[]) => {
  if (!z.length) return 0
  const s = [...z].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Lücken ohne Tinte im Bereich [a, b] (Tinte als senkrechte Intervalle) */
function luecken(tinte: [number, number][], a: number, b: number): [number, number][] {
  const r: [number, number][] = []
  let y = a
  for (const [t0, t1] of tinte) {
    if (t1 <= y) continue
    if (t0 >= b) break
    if (t0 > y) r.push([y, Math.min(t0, b)])
    y = Math.max(y, t1)
    if (y >= b) break
  }
  if (y < b) r.push([y, b])
  return r
}

/** Mitte der größten Lücke in [a, b]; ohne Lücke `ersatz` */
function schnitt(tinte: [number, number][], a: number, b: number, ersatz: number): number {
  if (b <= a) return ersatz
  let best: [number, number] | null = null
  for (const l of luecken(tinte, a, b)) if (!best || l[1] - l[0] > best[1] - best[0]) best = l
  return best && best[1] - best[0] > 0.5 ? (best[0] + best[1]) / 2 : ersatz
}

export async function notenAnalysieren(daten: Uint8Array): Promise<NotenSeite[]> {
  const pdfjs = await ladePdfjs()
  const OPS = pdfjs.OPS
  // Kopie: pdf.js übergibt die Daten an seinen Worker
  const aufgabe = pdfjs.getDocument({ data: daten.slice() })
  const doc = await aufgabe.promise
  const seiten: NotenSeite[] = []
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const vp = page.getViewport({ scale: 1 })
      const ol = await page.getOperatorList()
      const W = vp.width
      const Hs = vp.height

      let ctm: M = vp.transform.slice()
      const stapel: M[] = []
      let tm: M = EINS, tlm: M = EINS
      let schrift = 0, fuehrung = 0
      const linien: Linie[] = []
      const senk: { x: number; y0: number; y1: number }[] = []
      const pfade: Kasten[] = []
      const texte: { x0: number; x1: number; grund: number; groesse: number }[] = []

      const textBei = (glyphen: unknown[]) => {
        const m = mul(ctm, tm)
        const o = ap(m, 0, 0)
        let breite = 0
        for (const g of glyphen) if (g && typeof g === 'object' && 'width' in g) breite += Number((g as { width: number }).width) || 0
        const e = ap(m, (breite * schrift) / 1000, 0)
        const groesse = Math.abs(schrift) * Math.hypot(m[2], m[3])
        texte.push({ x0: Math.min(o[0], e[0]), x1: Math.max(o[0], e[0]), grund: o[1], groesse })
      }

      for (let k = 0; k < ol.fnArray.length; k++) {
        const f = ol.fnArray[k]
        const a = ol.argsArray[k] as unknown[]
        if (f === OPS.save) stapel.push(ctm.slice())
        else if (f === OPS.restore) ctm = stapel.pop() ?? ctm
        else if (f === OPS.transform) ctm = mul(ctm, a as M)
        else if (f === OPS.paintFormXObjectBegin) {
          stapel.push(ctm.slice())
          if (a[0]) ctm = mul(ctm, Array.from(a[0] as ArrayLike<number>))
        } else if (f === OPS.paintFormXObjectEnd) ctm = stapel.pop() ?? ctm
        else if (f === OPS.constructPath) {
          // Pfade nur zum Beschneiden (endPath) zeichnen nichts
          if (a[0] === OPS.endPath) continue
          const mm = a[2] as ArrayLike<number> | null | undefined
          if (!mm || mm.length < 4) continue
          const pkte = [ap(ctm, mm[0], mm[1]), ap(ctm, mm[2], mm[1]), ap(ctm, mm[0], mm[3]), ap(ctm, mm[2], mm[3])]
          const x0 = Math.min(...pkte.map((q) => q[0])), x1 = Math.max(...pkte.map((q) => q[0]))
          const y0 = Math.min(...pkte.map((q) => q[1])), y1 = Math.max(...pkte.map((q) => q[1]))
          if (!isFinite(x0 + x1 + y0 + y1)) continue
          // Rahmen um die ganze Seite nicht als Tinte zählen
          if (x1 - x0 > W * 0.95 && y1 - y0 > Hs * 0.5) continue
          if (x1 - x0 > W * 0.25 && y1 - y0 < 1.5) linien.push({ x0, x1, y: (y0 + y1) / 2 })
          if (x1 - x0 < 3 && y1 - y0 > 12) senk.push({ x: (x0 + x1) / 2, y0, y1 })
          pfade.push({ x0, y0, x1, y1 })
        } else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject || f === OPS.paintImageMaskXObject) {
          const pkte = [ap(ctm, 0, 0), ap(ctm, 1, 0), ap(ctm, 0, 1), ap(ctm, 1, 1)]
          pfade.push({
            x0: Math.min(...pkte.map((q) => q[0])),
            x1: Math.max(...pkte.map((q) => q[0])),
            y0: Math.min(...pkte.map((q) => q[1])),
            y1: Math.max(...pkte.map((q) => q[1])),
          })
        } else if (f === OPS.beginText) {
          tm = EINS
          tlm = EINS
        } else if (f === OPS.setTextMatrix) {
          const m = (a.length === 1 ? a[0] : a) as ArrayLike<number>
          tm = Array.from(m).slice(0, 6)
          tlm = tm
        } else if (f === OPS.moveText) {
          tlm = mul(tlm, [1, 0, 0, 1, Number(a[0]), Number(a[1])])
          tm = tlm
        } else if (f === OPS.setLeadingMoveText) {
          fuehrung = -Number(a[1])
          tlm = mul(tlm, [1, 0, 0, 1, Number(a[0]), Number(a[1])])
          tm = tlm
        } else if (f === OPS.setLeading) fuehrung = Number(a[0])
        else if (f === OPS.nextLine) {
          tlm = mul(tlm, [1, 0, 0, 1, 0, -fuehrung])
          tm = tlm
        } else if (f === OPS.setFont) schrift = Number(a[1]) || 0
        else if (f === OPS.showText || f === OPS.showSpacedText) {
          const g = a[0]
          if (Array.isArray(g)) textBei(g)
        }
      }

      // ---------- Notenzeilen ----------
      linien.sort((x, y) => x.y - y.y)
      const eindeutig: Linie[] = []
      for (const l of linien) {
        const v = eindeutig[eindeutig.length - 1]
        if (v && Math.abs(v.y - l.y) < 0.6 && l.x0 < v.x1 && l.x1 > v.x0) {
          v.x0 = Math.min(v.x0, l.x0)
          v.x1 = Math.max(v.x1, l.x1)
        } else eindeutig.push({ ...l })
      }
      const zeilenListe: Zeile[] = []
      for (let i = 0; i + 4 < eindeutig.length; ) {
        const g = eindeutig.slice(i, i + 5)
        const d = g.slice(1).map((l, k) => l.y - g[k].y)
        const m = d.reduce((x, y) => x + y) / 4
        const gleich = m > 1.5 && m < 20 && d.every((v) => Math.abs(v - m) < m * 0.3)
        const ueberlappt = g.every((l) => l.x0 < g[0].x1 && l.x1 > g[0].x0)
        if (gleich && ueberlappt) {
          zeilenListe.push({ oben: g[0].y, unten: g[4].y, x0: Math.min(...g.map((l) => l.x0)), x1: Math.max(...g.map((l) => l.x1)), sp: m })
          i += 5
        } else i++
      }

      const view = Array.from(page.view)
      if (!zeilenListe.length) {
        // Nicht erkannt: ein Band über alles, was auf der Seite steht
        const alle: Kasten[] = [...pfade, ...texte.map((t) => ({ x0: t.x0, x1: t.x1, y0: t.grund - t.groesse * 0.75, y1: t.grund + t.groesse * 0.25 }))]
        const k = alle.length
          ? { x0: Math.min(...alle.map((q) => q.x0)), x1: Math.max(...alle.map((q) => q.x1)), y0: Math.min(...alle.map((q) => q.y0)), y1: Math.max(...alle.map((q) => q.y1)) }
          : { x0: 0, x1: W, y0: 0, y1: Hs }
        const rand = 2
        seiten.push({
          ansicht: view,
          erkannt: false,
          linienabstand: 0,
          baender: [{ seite: p - 1, oben: Math.max(0, k.y0 - rand), unten: Math.min(Hs, k.y1 + rand), links: Math.max(0, k.x0 - rand), rechts: Math.min(W, k.x1 + rand), zeilen: 0, ganzeSeite: true }],
        })
        continue
      }

      const sp = median(zeilenListe.map((z) => z.sp))

      // ---------- Systeme ----------
      const systeme: System[] = []
      for (const z of zeilenListe) {
        const v = systeme[systeme.length - 1]
        const verbunden = !!v && senk.some((s) => s.y0 <= v.unten + 1 && s.y1 >= z.oben - 1 && s.x >= Math.min(v.x0, z.x0) - 30 && s.x <= Math.max(v.x1, z.x1) + 2)
        if (v && verbunden) {
          v.unten = z.unten
          v.x0 = Math.min(v.x0, z.x0)
          v.x1 = Math.max(v.x1, z.x1)
          v.zeilen++
        } else systeme.push({ oben: z.oben, unten: z.unten, x0: z.x0, x1: z.x1, zeilen: 1 })
      }

      // ---------- Tinte (senkrechte Intervalle) ----------
      // Musiksymbole stehen in einer Schrift, deren Größe etwa vier Linienabstände beträgt; sie reichen nur wenig über
      // ihre Grundlinie hinaus. Übrige Schrift: Ober- und Unterlänge nach der Schriftgröße.
      const kaesten: Kasten[] = [...pfade]
      for (const t of texte) {
        const musik = Math.abs(t.groesse - 4 * sp) < sp
        const y0 = musik ? t.grund - sp : t.grund - t.groesse * 0.75
        const y1 = musik ? t.grund + sp * 0.5 : t.grund + t.groesse * 0.22
        kaesten.push({ x0: t.x0, x1: Math.max(t.x1, t.x0 + 1), y0, y1 })
      }
      const intervalle = kaesten.map((k) => [k.y0, k.y1] as [number, number]).sort((x, y) => x[0] - y[0])
      const tinte: [number, number][] = []
      for (const iv of intervalle) {
        const v = tinte[tinte.length - 1]
        if (v && iv[0] <= v[1] + 0.3) v[1] = Math.max(v[1], iv[1])
        else tinte.push([iv[0], iv[1]])
      }

      // ---------- Schnitte ----------
      const abstaende = systeme.slice(1).map((s, i) => s.oben - systeme[i].unten)
      const G = abstaende.length ? median(abstaende) : 12 * sp
      const schnitte: number[] = []
      const erstes = systeme[0]
      schnitte.push(schnitt(tinte, Math.max(0, erstes.oben - G * 0.75), erstes.oben - sp, erstes.oben - G / 2))
      for (let i = 0; i + 1 < systeme.length; i++) {
        const a = systeme[i].unten, b = systeme[i + 1].oben
        schnitte.push(schnitt(tinte, a + sp, b - sp, (a + b) / 2))
      }
      const letztes = systeme[systeme.length - 1]
      schnitte.push(schnitt(tinte, letztes.unten + sp, Math.min(Hs, letztes.unten + G * 1.2), letztes.unten + G / 2))

      // Band auf die Tinte zwischen zwei Schnitten verkleinern (mit etwas Rand)
      const RAND = Math.max(1.5, sp * 0.4)
      const zuschnitt = (oben: number, unten: number, zeilen: number): Band | null => {
        const drin = kaesten.filter((k) => (k.y0 + k.y1) / 2 >= oben && (k.y0 + k.y1) / 2 <= unten)
        if (!drin.length) return null
        const y0 = Math.max(oben, Math.min(...drin.map((k) => k.y0)))
        const y1 = Math.min(unten, Math.max(...drin.map((k) => k.y1)))
        const x0 = Math.min(...drin.map((k) => k.x0))
        const x1 = Math.max(...drin.map((k) => k.x1))
        // Der Rand geht nie über die Schnittlinie: Nachbarsysteme überlappen nicht
        return {
          seite: p - 1,
          oben: Math.max(0, oben, y0 - RAND),
          unten: Math.min(Hs, unten, y1 + RAND),
          links: Math.max(0, x0 - RAND),
          rechts: Math.min(W, x1 + RAND),
          zeilen,
        }
      }
      const baender: Band[] = []
      systeme.forEach((s, i) => {
        const b = zuschnitt(schnitte[i], schnitte[i + 1], s.zeilen)
        if (b) baender.push(b)
      })

      // Text unter dem letzten System (z. B. weitere Strophen); Seitenzahlen und Kleines bleiben draußen
      // Nur der zusammenhängende Block direkt darunter: Eine Seitenzahl weiter unten bleibt draußen
      const alleReste = tinte.filter(([t0]) => t0 >= schnitte[schnitte.length - 1])
      const rest: [number, number][] = []
      for (const iv of alleReste) {
        if (rest.length && iv[0] - rest[rest.length - 1][1] > 4 * sp) break
        rest.push(iv)
      }
      if (rest.length) {
        const r0 = rest[0][0], r1 = rest[rest.length - 1][1]
        const hoehe = rest.reduce((s, [t0, t1]) => s + (t1 - t0), 0)
        if (hoehe > 4 * sp && rest.length >= 2) {
          const b = zuschnitt(r0 - 0.1, r1 + 0.1, 0)
          if (b && b.unten - b.oben > 4 * sp) baender.push(b)
        }
      }

      seiten.push({ ansicht: view, erkannt: true, linienabstand: sp, baender })
    }
  } finally {
    try {
      await aufgabe.destroy()
    } catch {
      // egal
    }
  }
  return seiten
}
