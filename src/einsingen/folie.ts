import { ereignisseAm, heute, iso, plusTage } from '../kalender'

// Eine Probenfolie: der Folientitel, darüber die Phase als Dachzeile, darunter die Noten, eine Textzeile,
// Stichpunkte oder nichts. Was auf der Folie einer Übung steht, legt themen/folie.ts fest.

export type Folie = {
  titel: string
  /** Phase der Übung (für die Dachzeile über dem Titel) */
  phase: string
  inhalt:
    | { art: 'noten'; abc: string }
    | { art: 'text'; text: string }
    | { art: 'liste'; punkte: string[] }
    | { art: 'leer' }
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
