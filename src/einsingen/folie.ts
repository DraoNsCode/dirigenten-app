import type { EinsingUebung } from './typen'

// Was auf der Folie einer Übung steht: der Folientitel (ersatzweise der Name),
// darunter die Noten, sonst der Folientext, sonst nichts.

export type Folie = {
  titel: string
  inhalt: { art: 'noten'; abc: string } | { art: 'text'; text: string } | { art: 'leer' }
}

export function folieVon(u: EinsingUebung): Folie {
  const titel = u.folientitel || u.name
  if (u.noten) return { titel, inhalt: { art: 'noten', abc: u.noten.replace(/^Q:.*\n?/m, '') } }
  if (u.folientext) return { titel, inhalt: { art: 'text', text: u.folientext } }
  return { titel, inhalt: { art: 'leer' } }
}

const gleich = (a: Folie, b: Folie) => JSON.stringify(a) === JSON.stringify(b)

/** Folien in der Reihenfolge der Übungen; zwei gleiche Folien hintereinander werden eine */
export function folienFolge(uebungen: EinsingUebung[]): Folie[] {
  const r: Folie[] = []
  for (const u of uebungen) {
    const f = folieVon(u)
    if (!r.length || !gleich(r[r.length - 1], f)) r.push(f)
  }
  return r
}

/** Für jede Übung: hat sie dieselbe Folie wie die davor? */
export function gleicheFolieWieDavor(uebungen: (EinsingUebung | undefined)[]): boolean[] {
  return uebungen.map((u, i) => {
    const davor = uebungen[i - 1]
    return !!(u && davor && gleich(folieVon(u), folieVon(davor)))
  })
}
