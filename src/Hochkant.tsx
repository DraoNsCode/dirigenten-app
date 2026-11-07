import { useEffect, useState } from 'react'

// Querformat sperren (Daniel, 7.11.2026): Auf dem Handy zeigt die App im Querformat nur den Hinweis,
// das Handy hochkant zu halten. Eine echte Sperre erlaubt das iPhone Web-Apps nicht; Android beachtet
// zusätzlich „orientation: portrait“ im Manifest. Die Noten öffnen sich außerhalb der App und drehen frei mit.
// Tablets und Computer (kürzere Bildschirmseite ab 600 px) sind nicht betroffen.

function istHandyQuer(): boolean {
  const kurzeSeite = Math.min(window.screen.width, window.screen.height)
  if (kurzeSeite >= 600) return false
  const typ = window.screen.orientation?.type
  if (typ) return typ.startsWith('landscape')
  const winkel = (window as unknown as { orientation?: number }).orientation
  return typeof winkel === 'number' ? Math.abs(winkel) === 90 : window.innerWidth > window.innerHeight
}

export default function Hochkant() {
  const [quer, setQuer] = useState(istHandyQuer)

  useEffect(() => {
    const pruefen = () => setQuer(istHandyQuer())
    window.screen.orientation?.addEventListener('change', pruefen)
    window.addEventListener('orientationchange', pruefen)
    window.addEventListener('resize', pruefen)
    return () => {
      window.screen.orientation?.removeEventListener('change', pruefen)
      window.removeEventListener('orientationchange', pruefen)
      window.removeEventListener('resize', pruefen)
    }
  }, [])

  if (!quer) return null
  return (
    <div className="hochkant" role="alert">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
      <p>Bitte das Handy hochkant halten.</p>
    </div>
  )
}
