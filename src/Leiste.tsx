import { Kalender, MenueSymbol, Noten } from './symbole'

export type Reiter = 'woche' | 'lieder' | 'menue'

const REITER: { id: Reiter; text: string; Symbol: typeof Kalender }[] = [
  { id: 'woche', text: 'Als Nächstes', Symbol: Kalender },
  { id: 'lieder', text: 'Lieder', Symbol: Noten },
  { id: 'menue', text: 'Menü', Symbol: MenueSymbol },
]

export default function Leiste({ aktiv, onWechsel }: { aktiv: Reiter; onWechsel: (r: Reiter) => void }) {
  return (
    <nav className="tabs" aria-label="Hauptnavigation">
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
