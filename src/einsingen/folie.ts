import { ereignisseAm, heute, iso, kurzDatum, plusTage } from '../kalender'

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

/** Dachzeile im Reiter „Folien“: für welche Probe die Folien sind, wie im Wochenplan („Do 19.11. · Probe“) */
export function probeZeile(): string {
  const d = naechsteProbe()
  return `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]} ${kurzDatum(d)} · Probe`
}

/** „Chorprobe 2026-11-19.pdf“ – nach der nächsten Probe benannt, wie Deckfolie und Fußzeile (Daniel, 17.11.2026) */
export const folienDateiname = () => `Chorprobe ${iso(naechsteProbe())}.pdf`
