// Aufbau von dirigenten-inhalt.json aus dem privaten Repo dirigenten-app-uebungen (neuer Aufbau seit 14.11.2026):
// Themenseiten zum Vorbereiten und Familien von Übungen (eine Grundübung, darunter Stufen).
// build_inhalt.py prüft die Dateien und schreibt die Datei; die App liest sie nur.

export const FORMATE = [1]

/** Was auf der Folie steht: der Titel, darunter optional eine Zeile Text oder Stichpunkte */
export type Folie = { titel: string; text?: string | string[] }

/** Angaben, die eine Grundübung hat und eine Stufe überschreiben kann */
export type Angaben = {
  ziel?: string
  /** wörtlich sagbar */
  ansage?: string
  /** ein Merkmal je Eintrag */
  gelingt?: string[]
  fehler?: string
  korrektur?: string
  folie?: Folie
  /** ABC-Noten, Abspieltempo als Q:-Zeile */
  noten?: string
  /** Lageangabe unter den Noten, nur für die Dirigenten */
  lage?: string
  notenHinweis?: string
}

export type Grunduebung = Angaben & { id: 'grund'; name: string; ziel: string; ansage: string; gelingt: string[]; fehler: string; korrektur: string; folie: Folie }

/** Eine Stufe gibt an, was sich ändert; alles Weitere gilt wie in der Grundübung, wenn es fehlt */
export type Stufe = Angaben & { id: string; name: string; aenderung: string }

export type Familie = {
  /** Dateiname ohne .md, feste Kennung */
  id: string
  name: string
  /** Lockern, Atem, Stimme oder Gehör */
  phase: string
  /** Kennung des Themas; fehlt, solange die Familie auf keiner Themenseite steht */
  thema?: string
  grund: Grunduebung
  stufen: Stufe[]
}

export type Thema = {
  id: string
  name: string
  kern: string
  /** Kennungen der Familien in ihrer Reihenfolge */
  familien: string[]
  /** Was man im Chor hört oder sieht, und welche Familie dann hilft */
  erkennen?: { zeichen: string; familie: string }[]
  /** Weitere Abschnitte, in der App eingeklappt */
  abschnitte?: { titel: string; text: string }[]
}

export type InhaltDatei = {
  format: number
  phasen: string[]
  themen: Thema[]
  /** nach Phase, Thema und Stelle im Thema geordnet */
  familien: Familie[]
}
