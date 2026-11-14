import type { Folie } from '../einsingen/folie'
import type { Angaben, Familie } from './typen'

// Was auf der Folie einer Grundübung oder Stufe steht.
// Titel und Text kommen aus der eigenen Folie der Stufe, sonst aus der Folie der Grundübung.
// Noten: die eigenen der Stufe; hat sie keine, die der Grundübung – außer die Stufe bringt eine eigene Folie mit Text mit.

/** Kennung einer auswählbaren Einheit: Familie und Grundübung („grund“) oder Stufe */
export type Wahl = { familie: string; einheit: string }
export const wahlSchluessel = (w: Wahl) => `${w.familie}/${w.einheit}`
export function wahlAus(schluessel: string): Wahl {
  const i = schluessel.indexOf('/')
  return { familie: schluessel.slice(0, i), einheit: schluessel.slice(i + 1) }
}

/** Die Einheit einer Familie: Grundübung oder Stufe, mit ihrer Nummer (0 = Grundübung) */
export function einheitVon(f: Familie, einheit: string): { nr: number; a: Angaben & { name: string } } | undefined {
  if (einheit === 'grund') return { nr: 0, a: f.grund }
  const i = f.stufen.findIndex((s) => s.id === einheit)
  return i < 0 ? undefined : { nr: i + 1, a: f.stufen[i] }
}

/** „Grundübung“ oder „Stufe 2 · An- und abschwellen auf s“ */
export function einheitName(f: Familie, einheit: string): string {
  const e = einheitVon(f, einheit)
  if (!e) return einheit
  return e.nr === 0 ? 'Grundübung' : `Stufe ${e.nr} · ${e.a.name}`
}

export function folieVon(f: Familie, einheit: string): Folie | undefined {
  const e = einheitVon(f, einheit)
  if (!e) return undefined
  const folie = e.a.folie ?? f.grund.folie
  const noten = e.a.noten ?? (e.a.folie?.text ? undefined : f.grund.noten)
  const phase = f.phase
  if (noten) return { titel: folie.titel, phase, inhalt: { art: 'noten', abc: noten.replace(/^Q:.*\n?/m, '') } }
  if (Array.isArray(folie.text)) return { titel: folie.titel, phase, inhalt: { art: 'liste', punkte: folie.text } }
  if (folie.text) return { titel: folie.titel, phase, inhalt: { art: 'text', text: folie.text } }
  return { titel: folie.titel, phase, inhalt: { art: 'leer' } }
}

const gleich = (a: Folie | undefined, b: Folie | undefined) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b)

/** Folien in der Reihenfolge der Auswahl; zwei gleiche Folien hintereinander werden eine */
export function folienFolge(folien: (Folie | undefined)[]): Folie[] {
  const r: Folie[] = []
  for (const f of folien) if (f && !gleich(r[r.length - 1], f)) r.push(f)
  return r
}

/** Für jede Folie: ist sie dieselbe wie die davor? */
export const gleicheFolieWieDavor = (folien: (Folie | undefined)[]): boolean[] => folien.map((f, i) => gleich(f, folien[i - 1]))
