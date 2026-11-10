import { useEffect, useRef, useState } from 'react'
import type { Grafik as GrafikAngabe } from './typen'

// Grafik als eingebettetes SVG, damit sie die Farben der App übernimmt (auch im Dunkelmodus).

/** SVG-Text in ein Element umwandeln; Skripte und Ereignis-Attribute werden entfernt */
function svgAus(text: string): SVGSVGElement | null {
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

export default function Grafik({ grafik, svgText }: { grafik: GrafikAngabe; svgText: string | undefined }) {
  const halter = useRef<HTMLDivElement>(null)
  const [fehlt, setFehlt] = useState(false)

  useEffect(() => {
    const h = halter.current
    if (!h) return
    const svg = svgText ? svgAus(svgText) : null
    setFehlt(!svg)
    if (!svg) return
    // Titel und Beschreibung stehen in der Bildunterschrift; im SVG würden sie doppelt vorgelesen
    svg.removeAttribute('aria-labelledby')
    svg.setAttribute('aria-hidden', 'true')
    h.replaceChildren(svg)
    return () => h.replaceChildren()
  }, [svgText])

  return (
    <figure className="grafik">
      <div ref={halter} role="img" aria-label={grafik.beschreibung ?? 'Grafik'} />
      {fehlt && <p className="note">Die Grafik {grafik.datei} fehlt.</p>}
      {grafik.beschreibung && <figcaption>{grafik.beschreibung}</figcaption>}
    </figure>
  )
}
