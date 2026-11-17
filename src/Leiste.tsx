import { Kalender, MenueSymbol, Noten, Stimmgabel } from './symbole'

// 'sammlung' ist die bisherige Übungssammlung: kein eigener Reiter in der Leiste, erreichbar über das Menü (übergangsweise)
export type Reiter = 'woche' | 'lieder' | 'uebungen' | 'menue' | 'sammlung'

// Ein Reiter „Übungen“ für Lesen und Auswählen (Daniel, 18.11.2026; vorher zwei Reiter „Übungen“ und „Einsingen“):
// ausgewählt wird in der Liste, gelesen auf der Themen- und Familienseite. Symbol: Stimmgabel (Daniel, 18.11.2026).
const REITER: { id: Reiter; text: string; Symbol: typeof Kalender }[] = [
  { id: 'woche', text: 'Wochenplan', Symbol: Kalender },
  { id: 'lieder', text: 'Lieder', Symbol: Noten },
  { id: 'uebungen', text: 'Übungen', Symbol: Stimmgabel },
  { id: 'menue', text: 'Menü', Symbol: MenueSymbol },
]

export default function Leiste({
  aktiv,
  onWechsel,
  seitlich,
}: {
  aktiv: Reiter
  onWechsel: (r: Reiter) => void
  seitlich?: boolean
}) {
  return (
    <nav className={seitlich ? 'tabs seite' : 'tabs'} aria-label="Hauptnavigation">
      {REITER.map(({ id, text, Symbol }) => (
        <button
          key={id}
          type="button"
          className="tab"
          aria-current={aktiv === id || (aktiv === 'sammlung' && id === 'menue') ? 'page' : undefined}
          onClick={() => onWechsel(id)}
        >
          <Symbol />
          <span>{text}</span>
        </button>
      ))}
    </nav>
  )
}
