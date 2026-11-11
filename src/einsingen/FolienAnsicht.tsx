import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Kreuz } from '../symbole'

// Folienansicht fürs Handy: zeigt das exportierte PDF in der App, eine Folie unter der anderen.
// iPhone-Web-Apps auf dem Home-Bildschirm öffnen erzeugte Dateien über Links oft nicht; deshalb zeichnet
// pdf.js (Mozilla) die Seiten hier selbst. pdf.js wird erst beim Öffnen geladen (legacy-Ausgabe, auch für ältere iPhones).
// Daniel, 11.11.2026: Weg A, keine Ablage in Supabase.

type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

let pdfjsLaden: Promise<Pdfjs> | null = null
function ladePdfjs(): Promise<Pdfjs> {
  pdfjsLaden ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })()
  pdfjsLaden.catch(() => (pdfjsLaden = null))
  return pdfjsLaden
}

type Stand = { art: 'laedt' } | { art: 'bereit'; n: number } | { art: 'fehler'; text: string }

export default function FolienAnsicht({ datei, titel, onSchliessen }: { datei: Blob; titel: string; onSchliessen: () => void }) {
  const [stand, setStand] = useState<Stand>({ art: 'laedt' })
  const seiten = useRef<HTMLDivElement>(null)

  // Seiten zeichnen: so breit, dass sie auch quer gehalten scharf bleiben
  useEffect(() => {
    let aktiv = true
    let aufgabe: ReturnType<Pdfjs['getDocument']> | null = null
    ;(async () => {
      try {
        const pdfjs = await ladePdfjs()
        const daten = new Uint8Array(await datei.arrayBuffer())
        if (!aktiv) return
        aufgabe = pdfjs.getDocument({ data: daten })
        const pdf = await aufgabe.promise
        if (!aktiv) return
        setStand({ art: 'bereit', n: pdf.numPages })
        const ziel = seiten.current
        if (!ziel) return
        ziel.replaceChildren()
        const pixel = Math.min(2400, Math.round(Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1)))
        for (let i = 1; i <= pdf.numPages && aktiv; i++) {
          const seite = await pdf.getPage(i)
          const viewport = seite.getViewport({ scale: pixel / seite.getViewport({ scale: 1 }).width })
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          canvas.className = 'folie-seite'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `Folie ${i} von ${pdf.numPages}`)
          ziel.append(canvas)
          await seite.render({ canvas, viewport }).promise
        }
      } catch (err) {
        if (aktiv) setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) })
      }
    })()
    return () => {
      aktiv = false
      void (aufgabe as ReturnType<Pdfjs['getDocument']> | null)?.destroy()
    }
  }, [datei])

  // Escape schließt (Tastatur am Tablet oder PC)
  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === 'Escape' && onSchliessen()
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [onSchliessen])

  return createPortal(
    <div className="folien-ansicht" role="dialog" aria-modal="true" aria-label={titel}>
      <div className="folien-kopf">
        <span className="folien-titel">
          {titel}
          {stand.art === 'bereit' && <span className="folien-zahl">{stand.n === 1 ? '1 Folie' : `${stand.n} Folien`}</span>}
        </span>
        <button type="button" className="folien-schliessen" onClick={onSchliessen}>
          <Kreuz size={18} />
          Schließen
        </button>
      </div>
      {stand.art === 'laedt' && <p className="folien-hinweis">Folien werden geöffnet …</p>}
      {stand.art === 'fehler' && <p className="folien-hinweis">Die Folien konnten nicht angezeigt werden: {stand.text}</p>}
      <div className="folien-seiten" ref={seiten} />
    </div>,
    document.body,
  )
}
