import { useEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

// Zurück-Wischen auf iPhone und iPad, nachgebaut (Daniel, 16.11.2026):
// Die eingebaute Geste von iOS verschiebt ein Bild der ganzen Seite – samt Leiste unten. Deshalb wird sie
// am linken Rand gesperrt und hier nachgebaut: Nur die Ansicht folgt dem Finger, darunter liegt die vorherige
// Ansicht (leicht versetzt und abgedunkelt), die Leiste bleibt stehen.
// Vorwärts-Wischen vom rechten Rand ist ganz abgeschaltet.
// Gesperrt wird über das Verhindern des Berührungsbeginns am Rand (geht seit iOS 13.4). Dadurch gibt es im
// Randstreifen auch kein Antippen und kein Scrollen mehr; Antippen wird deshalb nachgebaut.
// Andere Geräte (Android, PC) behalten ihr gewohntes Verhalten.

export const IST_IOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const RAND = 24 // Breite des Randstreifens, in dem iOS seine Geste erkennt
const SCHWELLE = 10 // ab dieser Bewegung ist es kein Antippen mehr
export const VERSATZ = 0.3 // so weit liegt die vorherige Ansicht anfangs nach links versetzt (Anteil der Breite)
const DAUER = 260 // ms für das Ein- bzw. Zurückfedern
const KURVE = 'cubic-bezier(.2, .8, .2, 1)'

export type Rahmen = { top: number; left: number; width: number; height: number }

type Sitzung = {
  x0: number
  y0: number
  t0: number
  x: number
  y: number
  /** zurueck: eigene Geste möglich; tippen: nur Antippen nachbauen */
  art: 'zurueck' | 'tippen'
  aktiv: boolean
  verworfen: boolean
  /** letzte Punkte für die Geschwindigkeit */
  punkte: { x: number; t: number }[]
}

export function useZurueckWischen(o: {
  /** eigene Geste möglich (es gibt eine vorherige Ansicht, eine Ansicht im Bild) */
  kannZurueck: () => boolean
  /** iOS-Geste am linken Rand sperren */
  sperreLinks: () => boolean
  ansicht: RefObject<HTMLElement | null>
  zurueck: () => void
}) {
  const [unterlage, setUnterlage] = useState<Rahmen | null>(null)
  const unterlageRef = useRef<HTMLElement>(null)
  const schleierRef = useRef<HTMLDivElement>(null)
  const opt = useRef(o)
  opt.current = o

  useEffect(() => {
    if (!IST_IOS) return
    let s: Sitzung | null = null
    let laeuft = false // Ein- oder Zurückfedern läuft noch

    const breite = () => opt.current.ansicht.current?.getBoundingClientRect().width || window.innerWidth

    const setzeLage = (dx: number, mitAnimation: boolean) => {
      const oben = opt.current.ansicht.current
      const unten = unterlageRef.current
      const schleier = schleierRef.current
      const w = breite()
      const p = Math.min(1, Math.max(0, dx / w))
      const uebergang = mitAnimation ? `transform ${DAUER}ms ${KURVE}, opacity ${DAUER}ms ${KURVE}` : 'none'
      if (oben) {
        oben.style.transition = uebergang
        oben.style.transform = `translateX(${p * w}px)`
      }
      if (unten) {
        unten.style.transition = uebergang
        unten.style.transform = `translateX(${-VERSATZ * w * (1 - p)}px)`
      }
      if (schleier) {
        schleier.style.transition = uebergang
        schleier.style.opacity = String(1 - p)
      }
    }

    const aufraeumen = () => {
      const oben = opt.current.ansicht.current
      if (oben) {
        oben.style.transition = ''
        oben.style.transform = ''
        oben.classList.remove('wischt')
      }
      document.documentElement.classList.remove('wischt')
    }

    const vorbereiten = () => {
      const oben = opt.current.ansicht.current
      if (!oben) return
      const r = oben.getBoundingClientRect()
      setUnterlage({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    const aktivieren = () => {
      opt.current.ansicht.current?.classList.add('wischt')
      document.documentElement.classList.add('wischt')
    }

    const nachDauer = (f: () => void) => window.setTimeout(f, DAUER + 20)

    const abschliessen = () => {
      laeuft = true
      setzeLage(breite(), true)
      nachDauer(() => {
        laeuft = false
        // In einem Zug: neue Ansicht zeichnen und die Unterlage entfernen
        flushSync(() => {
          opt.current.zurueck()
          setUnterlage(null)
        })
        aufraeumen()
      })
    }

    const zurueckfedern = () => {
      laeuft = true
      setzeLage(0, true)
      nachDauer(() => {
        laeuft = false
        aufraeumen()
        setUnterlage(null)
      })
    }

    // Antippen im Randstreifen nachbauen (der verhinderte Berührungsbeginn unterdrückt den Klick)
    const tippen = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      if (!el) return
      const feld = el.closest('input, textarea, select') as HTMLElement | null
      if (feld) {
        feld.focus()
        if (feld instanceof HTMLInputElement && (feld.type === 'checkbox' || feld.type === 'radio')) feld.click()
        return
      }
      el.click()
    }

    const beginn = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        if (s && !s.aktiv) {
          s = null
          setUnterlage(null)
        }
        return
      }
      if (laeuft) {
        e.preventDefault()
        return
      }
      const t = e.touches[0]
      const links = t.clientX < RAND
      const rechts = t.clientX > window.innerWidth - RAND
      if (!links && !rechts) return
      if (links && !opt.current.sperreLinks()) return
      e.preventDefault()
      const art = links && opt.current.kannZurueck() ? 'zurueck' : 'tippen'
      s = { x0: t.clientX, y0: t.clientY, t0: e.timeStamp, x: t.clientX, y: t.clientY, art, aktiv: false, verworfen: false, punkte: [] }
      // Die vorherige Ansicht schon jetzt aufbauen, damit sie beim ersten Bewegen bereitliegt
      if (art === 'zurueck') vorbereiten()
    }

    const bewegt = (e: TouchEvent) => {
      if (!s) return
      const t = e.touches[0]
      if (!t) return
      s.x = t.clientX
      s.y = t.clientY
      const dx = s.x - s.x0
      const dy = s.y - s.y0
      if (!s.aktiv && !s.verworfen) {
        if (Math.abs(dx) < SCHWELLE && Math.abs(dy) < SCHWELLE) return
        if (s.art === 'zurueck' && dx > 0 && Math.abs(dx) > Math.abs(dy)) {
          s.aktiv = true
          aktivieren()
        } else {
          s.verworfen = true
          if (s.art === 'zurueck') setUnterlage(null)
          return
        }
      }
      if (!s.aktiv) return
      e.preventDefault()
      s.punkte.push({ x: s.x, t: e.timeStamp })
      if (s.punkte.length > 5) s.punkte.shift()
      setzeLage(Math.max(0, dx), false)
    }

    const ende = (e: TouchEvent) => {
      if (!s) return
      const fertig = s
      s = null
      if (fertig.aktiv) {
        e.preventDefault()
        const dx = fertig.x - fertig.x0
        const p = fertig.punkte
        const tempo = p.length > 1 ? (p[p.length - 1].x - p[0].x) / Math.max(1, p[p.length - 1].t - p[0].t) : 0
        if (dx > breite() * 0.35 || (tempo > 0.4 && dx > 30)) abschliessen()
        else zurueckfedern()
        return
      }
      if (fertig.art === 'zurueck') setUnterlage(null)
      if (!fertig.verworfen && e.timeStamp - fertig.t0 < 600) tippen(fertig.x0, fertig.y0)
    }

    const abbruch = () => {
      if (!s) return
      const fertig = s
      s = null
      if (fertig.aktiv) zurueckfedern()
      else if (fertig.art === 'zurueck') setUnterlage(null)
    }

    const o2 = { capture: true, passive: false } as const
    document.addEventListener('touchstart', beginn, o2)
    document.addEventListener('touchmove', bewegt, o2)
    document.addEventListener('touchend', ende, o2)
    document.addEventListener('touchcancel', abbruch, { capture: true })
    return () => {
      document.removeEventListener('touchstart', beginn, o2)
      document.removeEventListener('touchmove', bewegt, o2)
      document.removeEventListener('touchend', ende, o2)
      document.removeEventListener('touchcancel', abbruch, { capture: true })
      aufraeumen()
    }
  }, [])

  return { unterlage, unterlageRef, schleierRef }
}
