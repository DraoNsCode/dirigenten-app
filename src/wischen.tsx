import { useEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

// Zurück-Wischen auf iPhone und iPad, nachgebaut (Daniel, 16.11.2026):
// Die eingebaute Geste von iOS verschiebt ein Bild der ganzen Seite – samt Leiste unten. Deshalb wird sie
// hier nachgebaut: Nur die Ansicht folgt dem Finger, darunter liegt die vorherige Ansicht (leicht versetzt
// und abgedunkelt), die Leiste bleibt stehen.
// Die eingebaute Geste ist dadurch abgeschaltet, dass die App auf iOS keine Verlaufseinträge anlegt (App.tsx);
// sie hat dann weder zurück noch vorwärts ein Ziel. (Das Sperren über den Berührungsbeginn am Rand reicht in der
// App auf dem Home-Bildschirm nicht – beide Gesten liefen parallel.)
// Eine Berührung am linken Rand gehört der eigenen Geste: dort kein Scrollen, Antippen wird nachgebaut.
// Andere Geräte (Android, PC) behalten ihr gewohntes Verhalten.

export const IST_IOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const RAND = 24 // Breite des Randstreifens, in dem die Geste beginnt
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
  aktiv: boolean
  verworfen: boolean
  /** letzte Punkte für die Geschwindigkeit */
  punkte: { x: number; t: number }[]
}

export function useZurueckWischen(o: {
  /** eigene Geste möglich (es gibt eine vorherige Ansicht, eine Ansicht im Bild) */
  kannZurueck: () => boolean
  ansicht: RefObject<HTMLElement | null>
  zurueck: () => void
}) {
  const [unterlage, setUnterlage] = useState<Rahmen | null>(null)
  // Rahmen der Unterlage: unsichtbar, bis die Geste beginnt (sonst läge sie kurz über der aktuellen Ansicht)
  const rahmenRef = useRef<HTMLDivElement>(null)
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

    /** Unterlage sofort unsichtbar machen und entfernen – immer bevor die Ansicht wieder nach hinten rückt */
    const unterlageWeg = () => {
      rahmenRef.current?.classList.remove('sichtbar')
      flushSync(() => setUnterlage(null))
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
      // Sofort aufbauen (noch unsichtbar), damit sie beim ersten Bewegen bereitliegt
      flushSync(() => setUnterlage({ top: r.top, left: r.left, width: r.width, height: r.height }))
    }

    /** Ansicht nach vorn, Unterlage sichtbar – im selben Schritt, damit nichts aufblitzt */
    const aktivieren = () => {
      opt.current.ansicht.current?.classList.add('wischt')
      document.documentElement.classList.add('wischt')
      rahmenRef.current?.classList.add('sichtbar')
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
        unterlageWeg()
        aufraeumen()
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
          unterlageWeg()
        }
        return
      }
      if (laeuft) {
        e.preventDefault()
        return
      }
      const t = e.touches[0]
      if (t.clientX >= RAND || !opt.current.kannZurueck()) return
      // Die Berührung gehört der eigenen Geste (kein Scrollen, kein Klick – Antippen wird nachgebaut)
      e.preventDefault()
      s = { x0: t.clientX, y0: t.clientY, t0: e.timeStamp, x: t.clientX, y: t.clientY, aktiv: false, verworfen: false, punkte: [] }
      // Die vorherige Ansicht schon jetzt aufbauen, damit sie beim ersten Bewegen bereitliegt
      vorbereiten()
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
        if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
          s.aktiv = true
          aktivieren()
        } else {
          s.verworfen = true
          unterlageWeg()
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
      unterlageWeg()
      if (!fertig.verworfen && e.timeStamp - fertig.t0 < 600) tippen(fertig.x0, fertig.y0)
    }

    const abbruch = () => {
      if (!s) return
      const fertig = s
      s = null
      if (fertig.aktiv) zurueckfedern()
      else unterlageWeg()
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

  return { unterlage, rahmenRef, unterlageRef, schleierRef }
}
