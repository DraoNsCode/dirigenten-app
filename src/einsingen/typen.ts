// Aufbau von dirigenten-uebungen.json aus dem privaten Repo dirigenten-app-uebungen.
// build.py prüft die Übungen, ordnet sie nach reihenfolge.md und schreibt die Datei; die App liest sie nur.

export const FORMAT = 1

export type EinsingUebung = {
  /** Dateiname ohne .md, feste Kennung */
  id: string
  name: string
  /** Lockern, Atem, Stimme oder Gehör */
  phase: string
  folientitel?: string
  /** Zeile auf der Folie, wenn die Übung keine Noten hat */
  folientext?: string
  /** ABC-Noten */
  noten?: string
  /** Lageangabe unter den Noten, nur für die Dirigenten */
  lage?: string
  /** Hinweis über den Noten */
  notenHinweis?: string
  ziel: string
  ablauf: string
  achten?: string
}

export type EinsingDatei = {
  format: number
  /** Phasen in ihrer Reihenfolge */
  phasen: string[]
  /** nach Phase und innerhalb der Phase nach reihenfolge.md geordnet */
  uebungen: EinsingUebung[]
}
