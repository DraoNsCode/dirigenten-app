import { normal } from '../daten'
import type { Erklaerung, Stand, Uebung } from './typen'

// Texte und kleine Hilfen für die Anzeige der Übungssammlung

export const STAND_TEXT: Record<Stand, string> = { entwurf: 'Entwurf', abgenommen: 'Abgenommen', ueberarbeiten: 'Überarbeiten' }
export const SCHWIERIGKEIT_TEXT: Record<number, string> = { 1: 'leicht', 2: 'mittel', 3: 'anspruchsvoll' }
export const RAHMEN_TEXT: Record<string, string> = { chor: 'Chor', gruppe: 'Kleingruppe', allein: 'allein' }
export const PRUEFBAR_TEXT: Record<string, string> = {
  tonhoehe: 'Tonhöhe',
  rhythmus: 'Rhythmus',
  einsatz: 'Einsatzzeitpunkt',
  dauer: 'Dauer',
  gleichmaessigkeit: 'Gleichmäßigkeit',
  lautstaerke: 'Lautstärke',
}

/** Alle Schwierigkeiten einer Übung (bei Stufen in einer Datei: je Stufe) */
export function schwierigkeiten(u: Uebung): number[] {
  const s = new Set<number>()
  if (u.schwierigkeit) s.add(u.schwierigkeit)
  for (const st of u.stufen ?? []) if (st.schwierigkeit) s.add(st.schwierigkeit)
  return [...s].sort()
}

/** „leicht“, „leicht bis mittel“ */
export function schwierigkeitText(u: Uebung): string {
  const s = schwierigkeiten(u)
  if (!s.length) return ''
  const a = SCHWIERIGKEIT_TEXT[s[0]]
  const b = SCHWIERIGKEIT_TEXT[s[s.length - 1]]
  return a === b ? a : `${a} bis ${b}`
}

export type Eintrag = { art: 'uebung'; e: Uebung } | { art: 'erklaerung'; e: Erklaerung }

/** Durchsucht Titel, Stichwort, Ziel, Kern und Themen */
export function passtSuche(x: Eintrag, q: string): boolean {
  if (!q) return true
  const felder =
    x.art === 'uebung'
      ? [x.e.titel, x.e.stichwort, x.e.ziel, ...(x.e.themen ?? [])]
      : [x.e.titel, x.e.kern, ...(x.e.themen ?? [])]
  return felder.some((f) => f && normal(f).includes(q))
}

/** Reihenfolge in einem Bereich: Erklärungen zuerst, dann Übungen nach Schwierigkeit, Familien in Stufenfolge */
export function vergleich(a: Eintrag, b: Eintrag): number {
  if (a.art !== b.art) return a.art === 'erklaerung' ? -1 : 1
  if (a.art === 'uebung' && b.art === 'uebung') {
    const sa = schwierigkeiten(a.e)[0] ?? 9
    const sb = schwierigkeiten(b.e)[0] ?? 9
    const fa = a.e.familie ?? ''
    const fb = b.e.familie ?? ''
    if (fa && fa === fb) return (a.e.stufe ?? 0) - (b.e.stufe ?? 0)
    if (sa !== sb) return sa - sb
  }
  return a.e.titel.localeCompare(b.e.titel, 'de')
}

/** Quelle als Text und Link (eine Adresse am Ende wird zum Link) */
export function quelleTeilen(q: string): { text: string; url?: string } {
  const m = /^(.*?)[\s:–-]*(https?:\/\/\S+)\s*$/.exec(q)
  return m ? { text: m[1].trim() || m[2], url: m[2] } : { text: q }
}
