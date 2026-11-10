// Hilfen rund um ABC-Noten: Tonart, Schlag, Stimmen. Übertragen aus der Vorschau der Übungssammlung.

const DUR = ['C', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H']
const MOLL = ['c', 'cis', 'd', 'es', 'e', 'f', 'fis', 'g', 'gis', 'a', 'b', 'h']
const STUFE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Transponieren: so weit nach unten und oben (Halbtöne) */
export const MIN_SCHRITT = -5
export const MAX_SCHRITT = 7

function tonart(abc: string): { halbton: number; moll: boolean } | null {
  const m = /^K:\s*([A-G])([#b]?)\s*(m(?:in)?)?(?![a-z])/m.exec(abc)
  if (!m) return null
  const s = STUFE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  return { halbton: (s + 12) % 12, moll: !!m[3] }
}

/** „G-Dur“, „e-Moll“ – nach Verschiebung um `schritte` Halbtöne */
export function tonartName(abc: string, schritte = 0): string {
  const k = tonart(abc)
  if (!k) return ''
  const i = (((k.halbton + schritte) % 12) + 12) % 12
  return k.moll ? `${MOLL[i]}-Moll` : `${DUR[i]}-Dur`
}

export function schritteText(s: number): string {
  if (s === 0) return 'Original'
  const n = Math.abs(s)
  return `${s > 0 ? '+' : '−'}${n} ${n === 1 ? 'Halbton' : 'Halbtöne'}`
}

export const istRhythmus = (abc: string) => /^K:.*clef=perc/m.test(abc)

export function stimmen(abc: string): string[] {
  const namen: string[] = []
  for (const m of abc.matchAll(/^V:\s*(\S+)/gm)) if (!namen.includes(m[1])) namen.push(m[1])
  return namen
}

/** Schlag aus der Taktangabe: im 6/8, 9/8, 12/8 eine punktierte Viertel, sonst der Nenner */
export function schlag(abc: string) {
  const m = /^M:\s*(\d+)\/(\d+)/m.exec(abc)
  const zaehler = m ? +m[1] : 4
  const nenner = m ? +m[2] : 4
  const zusammengesetzt = nenner === 8 && zaehler % 3 === 0
  return {
    /** Länge eines Schlags in ganzen Noten */
    laenge: zusammengesetzt ? 3 / 8 : 1 / nenner,
    proTakt: zusammengesetzt ? zaehler / 3 : zaehler,
    zeichen: zusammengesetzt ? '♩.' : nenner === 8 ? '♪' : nenner === 2 ? '𝅗𝅥' : '♩',
  }
}

/** Wechselt die Taktart im Stück? */
export function taktwechsel(abc: string): boolean {
  const rumpf = abc.split(/^K:.*$/m)[1] ?? ''
  return /\[M:|^M:/m.test(rumpf)
}

/** Durchgänge einer Sequenz in Halbtönen relativ zur Notation */
export function sequenzSchritte(seq: { von: number; bis: number; zurueck?: boolean }): number[] {
  const r: number[] = []
  const richtung = seq.bis > seq.von ? 1 : -1
  for (let k = seq.von; k !== seq.bis + richtung; k += richtung) r.push(k)
  if (seq.zurueck) for (let k = seq.bis - richtung; k !== seq.von - richtung; k -= richtung) r.push(k)
  return r
}

/** Tonname in ABC (bezogen auf C-Dur, z. B. „E“, „c“, „^F“) -> MIDI-Nummer */
export function abcMidi(ton: string | null): number | null {
  const m = /^([_^=]*)([A-Ga-g])([,']*)$/.exec(String(ton ?? '').trim())
  if (!m) return null
  let p = 60 + STUFE[m[2].toUpperCase()] + (m[2] === m[2].toLowerCase() ? 12 : 0)
  for (const c of m[1]) p += c === '^' ? 1 : c === '_' ? -1 : 0
  for (const c of m[3]) p += c === "'" ? 12 : -12
  return p
}
