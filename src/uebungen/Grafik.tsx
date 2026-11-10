import { useEffect, useRef, useState } from 'react'
import { abcMidi } from './abc'
import { spielen } from './klang'
import type { Grafik as GrafikAngabe } from './typen'

// Grafik als eingebettetes SVG, damit sie die Farben der App übernimmt (auch im Dunkelmodus).
// Elemente mit data-ton (Tonname in ABC, bezogen auf C-Dur) und data-ziffer lassen sich antippen und anhören.

/** SVG-Text in ein Element umwandeln; Skripte und Ereignis-Attribute werden entfernt */
export function svgAus(text: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null
  svg.querySelectorAll('script, foreignObject').forEach((n) => n.remove())
  for (const n of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    for (const a of Array.from(n.attributes)) {
      if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name)
    }
  }
  return document.importNode(svg, true) as unknown as SVGSVGElement
}

/** Macht Töne in der Grafik anklickbar; gibt zurück, ob es welche gibt */
function toeneAnklickbar(svg: SVGSVGElement): boolean {
  const toene = svg.querySelectorAll<SVGElement>('[data-ton]')
  let gefunden = false
  toene.forEach((n) => {
    const midi = abcMidi(n.getAttribute('data-ton'))
    if (midi === null) return
    gefunden = true
    n.setAttribute('tabindex', '0')
    n.setAttribute('role', 'button')
    n.setAttribute('aria-label', `Ziffer ${n.getAttribute('data-ziffer') ?? ''} anhören`)
    const hoeren = () => {
      spielen([{ ton: midi, start: 0, dauer: 0.9 }])
      n.classList.add('ton-an')
      window.setTimeout(() => n.classList.remove('ton-an'), 500)
    }
    n.addEventListener('click', hoeren)
    n.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault()
        hoeren()
      }
    })
  })
  return gefunden
}

export default function Grafik({ grafik, svgText }: { grafik: GrafikAngabe; svgText: string | undefined }) {
  const halter = useRef<HTMLDivElement>(null)
  const [fehlt, setFehlt] = useState(false)
  const [mitToenen, setMitToenen] = useState(false)

  useEffect(() => {
    const h = halter.current
    if (!h) return
    const svg = svgText ? svgAus(svgText) : null
    setFehlt(!svg)
    if (!svg) return
    // Titel und Beschreibung stehen in der Bildunterschrift; im SVG würden sie doppelt vorgelesen
    svg.removeAttribute('aria-labelledby')
    svg.removeAttribute('role')
    const toene = toeneAnklickbar(svg)
    if (!toene) svg.setAttribute('aria-hidden', 'true')
    setMitToenen(toene)
    h.replaceChildren(svg)
    return () => h.replaceChildren()
  }, [svgText])

  return (
    <figure className="grafik">
      <div ref={halter} role={mitToenen ? 'group' : 'img'} aria-label={grafik.beschreibung ?? 'Grafik'} />
      {mitToenen && <p className="grafik-hinweis">Ziffern antippen, um den Ton zu hören.</p>}
      {fehlt && <p className="note">Die Grafik {grafik.datei} fehlt.</p>}
      {grafik.beschreibung && <figcaption>{grafik.beschreibung}</figcaption>}
    </figure>
  )
}
