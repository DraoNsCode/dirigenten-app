import { istRhythmus } from './abc'
import type { AuswahlPunkt } from './auswahl'
import type { Sammlung } from './sammlung'
import type { Erklaerung, Notenblock, Stufe, Uebung } from './typen'

// Was zu einem Punkt der Auswahl gehört: Eintrag, gewählte Stufe und die Noten, die für ihn gelten.

export type PunktInhalt =
  | { art: 'uebung'; titel: string; zusatz?: string; u: Uebung; stufe?: Stufe; noten: Notenblock[]; tempo?: number }
  | { art: 'erklaerung'; titel: string; zusatz?: string; e: Erklaerung; noten: Notenblock[] }

export function punktInhalt(s: Sammlung, p: AuswahlPunkt): PunktInhalt | null {
  if (p.art === 'erklaerung') {
    const e = s.erklaerungen.get(p.id)
    return e ? { art: 'erklaerung', titel: e.titel, zusatz: 'Erklärung', e, noten: e.noten ?? [] } : null
  }
  const u = s.uebungen.get(p.id)
  if (!u) return null
  const stufe = p.stufe !== undefined ? u.stufen?.find((st) => st.stufe === p.stufe) : undefined
  return {
    art: 'uebung',
    titel: u.titel,
    zusatz: stufe ? `Stufe ${stufe.stufe}` : u.familie && u.stufe ? `Stufe ${u.stufe}` : undefined,
    u,
    stufe,
    noten: stufe?.noten ?? u.noten ?? [],
    tempo: stufe?.tempo ?? u.tempo,
  }
}

/** Notenblock, nach dem sich die Tonart eines Punkts richtet (der erste mit Tonhöhen) */
export function tonartBlock(noten: Notenblock[]): Notenblock | undefined {
  return noten.find((n) => n.art !== 'sprechen' && n.art !== 'klatschen' && !istRhythmus(n.abc))
}
