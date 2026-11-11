import { ereignisseAm, heute, iso, plusTage } from '../kalender'
import type { Eintrag } from './daten'
import type { EinsingUebung } from './typen'

// Was auf der Folie eines Eintrags steht.
// Übung: der Folientitel (ersatzweise der Name), darunter die Noten, sonst der Folientext
// (eine Zeile oder Stichpunkte), sonst nichts.
// Gruppe: ihr Folientitel und je Übung ein Stichpunkt.

export type Folie = {
  titel: string
  inhalt:
    | { art: 'noten'; abc: string }
    | { art: 'text'; text: string }
    | { art: 'liste'; punkte: string[] }
    | { art: 'leer' }
}

/** Stichpunkt einer Übung in einer Gruppe: Folientitel, dahinter der Folientext */
function stichpunkt(u: EinsingUebung): string {
  const titel = u.folientitel || u.name
  const text = Array.isArray(u.folientext) ? u.folientext.join(', ') : u.folientext
  return text ? `${titel}: ${text}` : titel
}

export function folieVon(e: Eintrag): Folie {
  if (e.art === 'gruppe') return { titel: e.folientitel || e.name, inhalt: { art: 'liste', punkte: e.teile.map(stichpunkt) } }
  const u = e.u
  const titel = u.folientitel || u.name
  if (u.noten) return { titel, inhalt: { art: 'noten', abc: u.noten.replace(/^Q:.*\n?/m, '') } }
  if (Array.isArray(u.folientext)) return { titel, inhalt: { art: 'liste', punkte: u.folientext } }
  if (u.folientext) return { titel, inhalt: { art: 'text', text: u.folientext } }
  return { titel, inhalt: { art: 'leer' } }
}

const gleich = (a: Folie, b: Folie) => JSON.stringify(a) === JSON.stringify(b)

/** Folien in der Reihenfolge der Einträge; zwei gleiche Folien hintereinander werden eine */
export function folienFolge(eintraege: Eintrag[]): Folie[] {
  const r: Folie[] = []
  for (const e of eintraege) {
    const f = folieVon(e)
    if (!r.length || !gleich(r[r.length - 1], f)) r.push(f)
  }
  return r
}

/** Für jeden Eintrag: hat er dieselbe Folie wie der davor? */
export function gleicheFolieWieDavor(eintraege: (Eintrag | undefined)[]): boolean[] {
  return eintraege.map((e, i) => {
    const davor = eintraege[i - 1]
    return !!(e && davor && gleich(folieVon(e), folieVon(davor)))
  })
}

/** Datum der nächsten Probe (heute, wenn heute Probe ist) */
export function naechsteProbe(): Date {
  const start = heute()
  for (let i = 0; i < 60; i++) {
    const d = plusTage(start, i)
    if (ereignisseAm(d).some((e) => e.art === 'pr')) return d
  }
  return start
}

/** „Einsingen 2026-11-12.pdf“ – nach der nächsten Probe benannt */
export const folienDateiname = () => `Einsingen ${iso(naechsteProbe())}.pdf`
