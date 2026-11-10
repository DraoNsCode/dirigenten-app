// Aufbau von uebungen.json aus dem privaten Repo chor-uebungen (Format „muster-1“).
// Die Felder beschreibt dort die README, Abschnitt „Muster“. Die App liest die Datei nur.

export const FORMAT = 'muster-1'

export type Stand = 'entwurf' | 'abgenommen' | 'ueberarbeiten'
export type Rahmen = 'chor' | 'gruppe' | 'allein'
export type NotenArt = 'singen' | 'sprechen' | 'klatschen' | 'hoeren'

export type Notenblock = {
  abc: string
  /** Schläge pro Minute, so wie dirigiert wird; im 6/8 ist der Schlag die punktierte Viertel */
  tempo: number
  hinweis?: string
  art?: NotenArt
  /** Wiederholung in Halbtonschritten relativ zur Notation */
  sequenz?: { von: number; bis: number; zurueck?: boolean }
}

export type Grafik = { datei: string; beschreibung?: string }

export type Liedstelle = {
  nr: number
  teil: 'deutsch' | 'russisch'
  stelle?: string
  hinweis?: string
  titel?: string
  seite_pdf?: number
}

export type Stufe = {
  stufe: number
  schwierigkeit?: number
  aenderung: string
  tempo?: number
  noten?: Notenblock[]
}

type Gemeinsam = {
  id: string
  titel: string
  stand: Stand
  /** Kennungen der Bereiche; der erste ist der Hauptbereich */
  bereiche: string[]
  themen?: string[]
  grafik?: Grafik
  noten?: Notenblock[]
  quellen?: string[]
  liederbuch?: Liedstelle[]
  /** Kennung des Inhalts; ändert sich bei jeder inhaltlichen Änderung */
  fassung: string
}

export type Uebung = Gemeinsam & {
  schwierigkeit?: number
  ziel: string
  stichwort?: string
  bild?: string
  rahmen?: Rahmen[]
  ablauf: string[]
  achten?: string[]
  varianten?: string[]
  silben?: string[]
  selbstkontrolle?: string
  pruefbar?: string[]
  erklaerungen?: string[]
  /** Nur bei Übungen ohne Noten: Tempo zum Zählen */
  tempo?: number
  familie?: string
  stufe?: number
  stufen?: Stufe[]
}

export type Erklaerung = Gemeinsam & {
  kern: string
  text?: string
  /** Übungen, die auf diese Erklärung verweisen (von build.py ergänzt) */
  uebungen?: string[]
}

export type Bereich = { nr: number; id: string; name: string; merkliste?: string[] }
export type Gruppe = { id: string; name: string; bereiche: Bereich[] }

export type SammlungDatei = {
  format: string
  erzeugt: string
  gruppen: Gruppe[]
  uebungen: Uebung[]
  erklaerungen: Erklaerung[]
  /** Familie -> Kennungen der Übungen in Stufenfolge */
  familien: Record<string, string[]>
}

/** Pfad (z. B. „grafiken/ankertoene.svg“) -> SVG-Text */
export type GrafikDatei = Record<string, string>
