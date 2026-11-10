import { Kalender, MenueSymbol, Noten, Stimmgabel } from './symbole'

export type Reiter = 'woche' | 'lieder' | 'uebungen' | 'menue'

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
          aria-current={aktiv === id ? 'page' : undefined}
          onClick={() => onWechsel(id)}
        >
          <Symbol />
          <span>{text}</span>
        </button>
      ))}
    </nav>
  )
}
