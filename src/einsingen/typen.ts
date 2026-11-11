// Aufbau von dirigenten-uebungen.json aus dem privaten Repo dirigenten-app-uebungen.
// build.py prüft die Übungen, ordnet sie nach reihenfolge.md und schreibt die Datei; die App liest sie nur.
// Format 2 bringt Gruppen kurzer Übungen und Folientext als Stichpunkte; Format 1 wird weiter gelesen.

export const FORMATE = [1, 2]

export type EinsingUebung = {
  /** Dateiname ohne .md, feste Kennung */
  id: string
  name: string
  /** Lockern, Atem, Stimme oder Gehör */
  phase: string
  folientitel?: string
  /** Auf der Folie, wenn die Übung keine Noten hat: eine Zeile oder Stichpunkte */
  folientext?: string | string[]
  /** ABC-Noten, Abspieltempo als Q:-Zeile */
  noten?: string
  /** Lageangabe unter den Noten, nur für die Dirigenten */
  lage?: string
  /** Hinweis über den Noten */
  notenHinweis?: string
  ziel: string
  ablauf: string
  achten?: string
}

/** Ein Eintrag der Liste: eine Übung oder eine Gruppe kurzer Übungen (festgelegt in reihenfolge.md) */
export type EintragDatei =
  | { phase: string; art: 'uebung'; id: string }
  | { phase: string; art: 'gruppe'; id: string; name: string; folientitel: string; teile: string[] }

export type EinsingDatei = {
  format: number
  /** Phasen in ihrer Reihenfolge */
  phasen: string[]
  /** Einträge der Liste in ihrer Reihenfolge (ab Format 2) */
  eintraege?: EintragDatei[]
  /** nach Phase und innerhalb der Phase nach reihenfolge.md geordnet */
  uebungen: EinsingUebung[]
}
