import { Folien, Kalender, MenueSymbol, Noten, Stimmgabel } from './symbole'
import { useThemenAuswahl } from './themen/auswahl'

// 'sammlung' ist die bisherige Übungssammlung: kein eigener Reiter in der Leiste, erreichbar über das Menü (übergangsweise)
export type Reiter = 'woche' | 'lieder' | 'uebungen' | 'folien' | 'menue' | 'sammlung'

// Reiter „Übungen“ zum Lesen, Reiter „Folien“ zum schnellen Auswählen und Exportieren (Daniel, 18.11.2026;
// löst den einen Reiter „Übungen“ für Lesen und Auswählen vom selben Tag ab). Symbol „Übungen“: Stimmgabel (Daniel).
// Name und Symbol „Folien“: Claudes Vorschlag, noch nicht beurteilt.
const REITER: { id: Reiter; text: string; Symbol: typeof Kalender }[] = [
  { id: 'woche', text: 'Wochenplan', Symbol: Kalender },
  { id: 'lieder', text: 'Lieder', Symbol: Noten },
  { id: 'uebungen', text: 'Übungen', Symbol: Stimmgabel },
  { id: 'folien', text: 'Folien', Symbol: Folien },
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
  // Am Reiter „Folien“: wie viele Übungen ausgewählt sind – auch beim Auswählen im Reiter „Übungen“ sichtbar
  const n = useThemenAuswahl().schluessel.length
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
          {id === 'folien' && n > 0 && (
            <span className="tab-zahl" aria-label={`${n} ausgewählt`}>
              {n}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
