import { useEffect, useRef, useState, type RefObject } from 'react'
import { ladeAbcjs, zeichnen, zeilenbreite } from '../uebungen/Noten'

// Noten einer Übung fürs Einsingen: darüber ein Hinweis (falls vorhanden), darunter die Lageangabe.
// Das Abspieltempo steht als Q:-Zeile in den ABC-Noten und wird nicht angezeigt.

/** ABC so, wie es gezeigt wird: Schrift für Silben und Ziffern, ohne Tempoangabe */
export function abcZumZeigen(abc: string, schrift = 'Barlow'): string {
  return abc
    .replace(/^Q:.*\n?/m, '')
    .replace(/^(X:.*)$/m, `$1\n%%vocalfont ${schrift} 13 bold\n%%annotationfont ${schrift} 12`)
}

/** Breite eines Elements, gerundet auf 20 px, damit nicht bei jeder Kleinigkeit neu gezeichnet wird */
function useBreite(ref: RefObject<HTMLElement | null>): number {
  const [breite, setBreite] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const messen = () => setBreite(Math.round(el.clientWidth / 20) * 20)
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return breite
}

export default function NotenAnsicht({ abc, hinweis, lage }: { abc: string; hinweis?: string; lage?: string }) {
  const ziel = useRef<HTMLDivElement>(null)
  const breite = useBreite(ziel)
  const [fehler, setFehler] = useState(false)

  useEffect(() => {
    if (!breite) return
    let aktiv = true
    ladeAbcjs()
      .then((abcjs) => {
        if (!aktiv || !ziel.current) return
        try {
          zeichnen(abcjs, ziel.current, abcZumZeigen(abc), zeilenbreite(breite))
          setFehler(false)
        } catch {
          setFehler(true)
        }
      })
      .catch(() => aktiv && setFehler(true))
    return () => {
      aktiv = false
    }
  }, [abc, breite])

  return (
    <div className="notenblock">
      {hinweis && <p className="noten-hinweis">{hinweis}</p>}
      <div className="noten" ref={ziel} />
      {fehler && <p className="note">Die Noten konnten nicht dargestellt werden.</p>}
      {lage && <p className="ein-lage">{lage}</p>}
    </div>
  )
}
