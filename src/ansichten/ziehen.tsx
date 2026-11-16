import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { RAND as WISCH_RAND } from '../wischen'

// Einträge in Listen ziehen und ablegen (Daniel, 16.11.2026) – im Wochenplan (Lieder in Probe und
// Gottesdiensten) und in der Auswahl der Probenfolien:
// - Finger: lange drücken (ohne zu bewegen), dann ziehen. Kurzes Antippen öffnet weiter den Eintrag,
//   Scrollen bleibt normal.
// - Maus: einfach ziehen.
// - Listen derselben Art nehmen einander Einträge ab (z. B. Gottesdienste untereinander); gesperrte nicht.
// Während des Ziehens zeigt die Liste schon die neue Reihenfolge (Platzhalter), die gezogene Zeile
// schwebt unter dem Finger. Am oberen und unteren Rand scrollt die Ansicht mit.
//
// Kennzeichnung im HTML: Liste = data-zug-liste (Kennung), data-zug-art, data-zug-gesperrt="ja";
// Zeile = data-zug-zeile (Kennung des Eintrags).

export type Zug<T extends string | number = string> = {
  id: T
  /** Liste, aus der der Eintrag kommt */
  von: string
  art: string
  /** Liste, in der er gerade landen würde (= von, wenn das Ziel nicht passt) */
  ziel: string
  /** Stelle im Ziel, gezählt ohne den gezogenen Eintrag */
  index: number
  startIndex: number
}

export type ZeilenInfo<T extends string | number = string> = { id: T; von: string; art: string; startIndex: number }

export type Geist<T extends string | number = string> = { top: number; left: number; width: number; id: T }

export type Griff<T extends string | number = string> = (info: ZeilenInfo<T>) => {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void
}

type Sitzung<T extends string | number> = ZeilenInfo<T> & {
  geraet: 'finger' | 'maus'
  zeile: HTMLElement
  startX: number
  startY: number
  x: number
  y: number
  aktiv: boolean
  ziel: string
  index: number
  timer?: number
  bild?: number
  scroller: HTMLElement | null
  weg: () => void
}

const HALTEN_MS = 400 // so lange gedrückt halten, bis das Ziehen beginnt
const TOLERANZ = 10 // so weit darf sich der Finger beim Halten bewegen (sonst: Scrollen/Wischen)
const MAUS_SCHWELLE = 5
const RAND = 64 // Randbereich, in dem mitgescrollt wird
const TEMPO = 14 // höchstens so viele Pixel je Bild

/** Eine Liste, wie sie während des Ziehens aussieht */
export function vorschau<T extends string | number>(zug: Zug<T> | null, listeId: string, liste: T[]): T[] {
  if (!zug) return liste
  let l = listeId === zug.von ? liste.filter((id) => id !== zug.id) : liste
  if (listeId === zug.ziel) {
    l = [...l]
    l.splice(Math.min(zug.index, l.length), 0, zug.id)
  }
  return l
}

function scrollbarerVorfahr(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return document.scrollingElement as HTMLElement | null
}

export function useZiehen<T extends string | number>(flaeche: RefObject<HTMLElement | null>, ablegen: (z: Zug<T>) => void) {
  const [zug, setZug] = useState<Zug<T> | null>(null)
  const [geist, setGeist] = useState<Geist<T> | null>(null)
  const geistRef = useRef<HTMLDivElement>(null)
  const sitzung = useRef<Sitzung<T> | null>(null)
  const zuletztGezogen = useRef(0)
  const letzteBeruehrung = useRef(0)
  const ablegenRef = useRef(ablegen)
  ablegenRef.current = ablegen

  // iOS Safari: preventDefault in später angehängten touchmove-Empfängern wirkt nur,
  // wenn schon vorher ein nicht-passiver Empfänger am Fenster hängt.
  useEffect(() => {
    const nichts = () => {}
    window.addEventListener('touchmove', nichts, { passive: false })
    return () => {
      window.removeEventListener('touchmove', nichts)
      sitzung.current?.weg()
      sitzung.current = null
      document.documentElement.classList.remove('zieht')
    }
  }, [])

  const zielBestimmen = useCallback(
    (s: Sitzung<T>): { ziel: string; index: number } => {
      const heim = { ziel: s.von, index: s.startIndex }
      const wurzel = flaeche.current
      if (!wurzel) return heim
      const liste = Array.from(wurzel.querySelectorAll<HTMLElement>('[data-zug-liste]')).find((k) => {
        const r = k.getBoundingClientRect()
        return s.y >= r.top - 8 && s.y <= r.bottom + 8
      })
      // Neben den Listen (Kopf, Hinweis unten, Lücke): bisheriges Ziel behalten
      if (!liste) return { ziel: s.ziel, index: s.index }
      // Über einer Liste, die nicht passt: zurück an den Ursprung
      if (liste.dataset.zugArt !== s.art || liste.dataset.zugGesperrt === 'ja') return heim
      const zeilen = Array.from(liste.querySelectorAll<HTMLElement>('[data-zug-zeile]')).filter(
        (z) => z.dataset.zugZeile !== String(s.id),
      )
      let index = 0
      for (const z of zeilen) {
        const r = z.getBoundingClientRect()
        if (r.top + r.height / 2 < s.y) index++
      }
      return { ziel: liste.dataset.zugListe ?? s.von, index }
    },
    [flaeche],
  )

  const aktualisieren = useCallback(
    (s: Sitzung<T>) => {
      const { ziel, index } = zielBestimmen(s)
      if (ziel === s.ziel && index === s.index) return
      s.ziel = ziel
      s.index = index
      setZug((z) => (z ? { ...z, ziel, index } : z))
    },
    [zielBestimmen],
  )

  const bewegen = useCallback(
    (s: Sitzung<T>, x: number, y: number) => {
      s.x = x
      s.y = y
      if (geistRef.current) geistRef.current.style.transform = `translateY(${y - s.startY}px)`
      aktualisieren(s)
    },
    [aktualisieren],
  )

  // Am Rand mitscrollen, solange gezogen wird
  const mitscrollen = useCallback(
    (s: Sitzung<T>) => {
      const schritt = () => {
        if (sitzung.current !== s || !s.aktiv) return
        const sc = s.scroller
        if (sc) {
          const istSeite = sc === document.scrollingElement
          const oben = istSeite ? 0 : sc.getBoundingClientRect().top
          const unten = istSeite ? window.innerHeight : sc.getBoundingClientRect().bottom
          let d = 0
          if (s.y < oben + RAND) d = -Math.min(1, (oben + RAND - s.y) / RAND) * TEMPO
          else if (s.y > unten - RAND) d = Math.min(1, (s.y - (unten - RAND)) / RAND) * TEMPO
          if (d) {
            const vorher = sc.scrollTop
            sc.scrollTop += d
            if (sc.scrollTop !== vorher) aktualisieren(s)
          }
        }
        s.bild = requestAnimationFrame(schritt)
      }
      s.bild = requestAnimationFrame(schritt)
    },
    [aktualisieren],
  )

  const aktivieren = useCallback(
    (s: Sitzung<T>) => {
      if (sitzung.current !== s || s.aktiv) return
      s.aktiv = true
      s.scroller = scrollbarerVorfahr(s.zeile)
      const r = s.zeile.getBoundingClientRect()
      setGeist({ top: r.top, left: r.left, width: r.width, id: s.id })
      setZug({ id: s.id, von: s.von, art: s.art, ziel: s.von, index: s.startIndex, startIndex: s.startIndex })
      document.documentElement.classList.add('zieht')
      window.getSelection?.()?.removeAllRanges()
      if (s.geraet === 'finger') navigator.vibrate?.(12)
      mitscrollen(s)
    },
    [mitscrollen],
  )

  const beenden = useCallback((s: Sitzung<T>, absetzen: boolean) => {
    if (sitzung.current !== s) return
    sitzung.current = null
    window.clearTimeout(s.timer)
    if (s.bild) cancelAnimationFrame(s.bild)
    s.weg()
    if (!s.aktiv) return
    document.documentElement.classList.remove('zieht')
    zuletztGezogen.current = Date.now()
    // Den Klick nach dem Loslassen schlucken (sonst öffnet sich das Lied)
    const schlucken = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('click', schlucken, true)
    window.setTimeout(() => window.removeEventListener('click', schlucken, true), 400)
    setZug(null)
    setGeist(null)
    if (absetzen)
      ablegenRef.current({ id: s.id, von: s.von, art: s.art, ziel: s.ziel, index: s.index, startIndex: s.startIndex })
  }, [])

  const starten = useCallback(
    (info: ZeilenInfo<T>, geraet: Sitzung<T>['geraet'], zeile: HTMLElement, ziel: EventTarget, x: number, y: number) => {
      const s: Sitzung<T> = {
        ...info,
        geraet,
        zeile,
        startX: x,
        startY: y,
        x,
        y,
        aktiv: false,
        ziel: info.von,
        index: info.startIndex,
        scroller: null,
        weg: () => {},
      }
      sitzung.current = s

      if (geraet === 'finger') {
        // Die Empfänger hängen an der berührten Stelle selbst: Wandert die Zeile in einen anderen Termin,
        // wird sie neu erzeugt – Touch-Ereignisse gehen aber weiter an die ursprüngliche (dann gelöste) Stelle
        // und kämen sonst nicht mehr am Fenster an.
        const t = ziel as HTMLElement
        const bewegt = (e: TouchEvent) => {
          const p = e.touches[0]
          if (!p) return
          if (!s.aktiv) {
            if (Math.hypot(p.clientX - s.startX, p.clientY - s.startY) > TOLERANZ) beenden(s, false)
            return
          }
          e.preventDefault()
          bewegen(s, p.clientX, p.clientY)
        }
        const los = (e: TouchEvent) => {
          if (s.aktiv) e.preventDefault()
          beenden(s, true)
        }
        const abbruch = () => beenden(s, false)
        const zweiterFinger = (e: TouchEvent) => {
          if (e.touches.length > 1 && !s.aktiv) beenden(s, false)
        }
        const menue = (e: Event) => e.preventDefault()
        t.addEventListener('touchmove', bewegt, { passive: false })
        t.addEventListener('touchend', los, { passive: false })
        t.addEventListener('touchcancel', abbruch)
        window.addEventListener('touchstart', zweiterFinger)
        window.addEventListener('contextmenu', menue)
        s.weg = () => {
          t.removeEventListener('touchmove', bewegt)
          t.removeEventListener('touchend', los)
          t.removeEventListener('touchcancel', abbruch)
          window.removeEventListener('touchstart', zweiterFinger)
          window.removeEventListener('contextmenu', menue)
        }
        s.timer = window.setTimeout(() => aktivieren(s), HALTEN_MS)
      } else {
        const bewegt = (e: MouseEvent) => {
          if (!s.aktiv) {
            if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < MAUS_SCHWELLE) return
            aktivieren(s)
          }
          e.preventDefault()
          bewegen(s, e.clientX, e.clientY)
        }
        const los = () => beenden(s, true)
        const taste = (e: KeyboardEvent) => {
          if (e.key === 'Escape') beenden(s, false)
        }
        window.addEventListener('mousemove', bewegt)
        window.addEventListener('mouseup', los)
        window.addEventListener('keydown', taste)
        s.weg = () => {
          window.removeEventListener('mousemove', bewegt)
          window.removeEventListener('mouseup', los)
          window.removeEventListener('keydown', taste)
        }
      }
    },
    [aktivieren, beenden, bewegen],
  )

  /** Ereignis-Empfänger für eine Zeile */
  const griff: Griff<T> = useCallback(
    (info: ZeilenInfo<T>) => ({
      onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
        letzteBeruehrung.current = Date.now()
        if (sitzung.current || e.touches.length !== 1) return
        if ((e.target as Element).closest('.xbtn')) return
        const p = e.touches[0]
        // Am linken Rand beginnt das Zurück-Wischen (wischen.tsx), nicht das Ziehen
        if (p.clientX < WISCH_RAND) return
        starten(info, 'finger', e.currentTarget, e.target, p.clientX, p.clientY)
      },
      onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
        // Nachgeahmte Maus-Ereignisse nach einer Berührung nicht als Maus werten
        if (e.button !== 0 || sitzung.current || Date.now() - letzteBeruehrung.current < 1000) return
        if ((e.target as Element).closest('.xbtn')) return
        starten(info, 'maus', e.currentTarget, e.target, e.clientX, e.clientY)
      },
    }),
    [starten],
  )

  /** true, solange gezogen wird oder gerade erst losgelassen wurde (Wischen dann nicht als Wochenwechsel werten) */
  const ziehtGerade = useCallback(
    () => !!sitzung.current?.aktiv || Date.now() - zuletztGezogen.current < 400,
    [],
  )

  return { zug, geist, geistRef, griff, ziehtGerade }
}
