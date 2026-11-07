// Kalender: Proben und Gottesdienste werden berechnet, nicht gespeichert.
// - Probe jeden Donnerstag, außer an Feiertagen
// - Sonntag: Gottesdienst vormittags und nachmittags (Palm-, Oster-, Pfingstsonntag mit eigenem Namen)
// - Feiertage mit je einem Gottesdienst; fällt einer auf einen Sonntag, ersetzt er den Sonntag

export type Termin = 'vm' | 'nm' | 'ft' | 'pr'
export type Art = 'gd' | 'pr'

export type Ereignis = {
  id: string // "JJJJ-MM-TT|termin"
  iso: string
  datum: Date
  termin: Termin
  art: Art
  name: string
}

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const ausIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const plusTage = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const heute = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
export const montagVon = (d: Date) => plusTage(d, -((d.getDay() + 6) % 7))

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** 8.11. – mit Jahr, wenn es nicht das laufende Jahr ist (8.11.2025) */
export function kurzDatum(d: Date, mitJahrWennAnders = false) {
  const s = `${d.getDate()}.${d.getMonth() + 1}.`
  return mitJahrWennAnders && d.getFullYear() !== heute().getFullYear() ? s + d.getFullYear() : s
}

const osterCache = new Map<number, Date>()
/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch) */
export function ostersonntag(y: number): Date {
  const cached = osterCache.get(y)
  if (cached) return cached
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1
  const ergebnis = new Date(y, monat - 1, tag)
  osterCache.set(y, ergebnis)
  return ergebnis
}

const feiertagCache = new Map<number, Map<string, string>>()
function feiertage(y: number) {
  const cached = feiertagCache.get(y)
  if (cached) return cached
  const o = ostersonntag(y)
  const r = new Map<string, string>([
    [iso(new Date(y, 11, 24)), 'Heiligabend'],
    [iso(new Date(y, 11, 25)), '1. Weihnachtstag'],
    [iso(new Date(y, 11, 26)), '2. Weihnachtstag'],
    [iso(new Date(y, 11, 31)), 'Silvesterabend'],
    [iso(plusTage(o, -3)), 'Gründonnerstag'],
    [iso(plusTage(o, -2)), 'Karfreitag'],
    [iso(plusTage(o, 1)), 'Ostermontag'],
    [iso(plusTage(o, 39)), 'Christi Himmelfahrt'],
    [iso(plusTage(o, 50)), 'Pfingstmontag'],
  ])
  feiertagCache.set(y, r)
  return r
}

function besondererSonntag(d: Date): string | undefined {
  const o = ostersonntag(d.getFullYear()), s = iso(d)
  if (s === iso(plusTage(o, -7))) return 'Palmsonntag'
  if (s === iso(o)) return 'Ostersonntag'
  if (s === iso(plusTage(o, 49))) return 'Pfingstsonntag'
  return undefined
}

function ereignis(d: Date, termin: Termin, name: string): Ereignis {
  const s = iso(d)
  return { id: `${s}|${termin}`, iso: s, datum: d, termin, art: termin === 'pr' ? 'pr' : 'gd', name }
}

export function ereignisseAm(d: Date): Ereignis[] {
  const feiertag = feiertage(d.getFullYear()).get(iso(d))
  const wt = d.getDay()
  const r: Ereignis[] = []
  if (wt === 4 && !feiertag) r.push(ereignis(d, 'pr', 'Probe'))
  if (feiertag) r.push(ereignis(d, 'ft', feiertag))
  else if (wt === 0) {
    const name = besondererSonntag(d) ?? 'Gottesdienst'
    r.push(ereignis(d, 'vm', `${name} vormittags`))
    r.push(ereignis(d, 'nm', `${name} nachmittags`))
  }
  return r
}

export function ereignisseDerWoche(montag: Date): Ereignis[] {
  const r: Ereignis[] = []
  for (let i = 0; i < 7; i++) r.push(...ereignisseAm(plusTage(montag, i)))
  return r
}

/** Ereignis zu einer gespeicherten Kennung; auch für Einträge, die nicht mehr zum Kalender passen */
export function ereignisAusId(id: string): Ereignis {
  const [s, t] = id.split('|')
  const d = ausIso(s)
  return (
    ereignisseAm(d).find((e) => e.id === id) ??
    ereignis(d, t as Termin, t === 'pr' ? 'Probe' : 'Gottesdienst')
  )
}

export const ereignisId = (datum: string, termin: string) => `${datum}|${termin}`

/** „Do 12.11. · Probe“ */
export const ereignisTitel = (e: Ereignis) => `${WOCHENTAGE[e.datum.getDay()]} ${kurzDatum(e.datum)} · ${e.name}`

/** „So nachmittags“, „Do Probe“ */
export const terminKurz = (e: Ereignis) => `${WOCHENTAGE[e.datum.getDay()]} ${e.name.replace('Gottesdienst ', '')}`

/** „Woche 9.–15. November“ */
export function wochenTitel(montag: Date) {
  const sonntag = plusTage(montag, 6)
  if (montag.getMonth() === sonntag.getMonth())
    return `Woche ${montag.getDate()}.–${sonntag.getDate()}. ${MONATE[sonntag.getMonth()]}`
  return `Woche ${montag.getDate()}. ${MONATE[montag.getMonth()]} – ${sonntag.getDate()}. ${MONATE[sonntag.getMonth()]}`
}

/** Abstand in Wochen zwischen den Wochen zweier Tage */
export const wochenAbstand = (d: Date, bezug: Date) =>
  Math.round((montagVon(d).getTime() - montagVon(bezug).getTime()) / (7 * 864e5))
