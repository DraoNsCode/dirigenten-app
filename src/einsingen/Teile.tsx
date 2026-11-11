import { useMeldung } from '../meldung'
import { useBereich, useNav } from '../navigation'
import { Folien, Haken, Plus, Rechts } from '../symbole'
import { useEinsingAuswahl } from './auswahl'

// Bausteine für die Auswahl im Reiter „Einsingen“

/** Runder Knopf zum Auswählen (Plus) bzw. Abwählen (Haken) */
export function WahlKnopf({ id, name }: { id: string; name: string }) {
  const auswahl = useEinsingAuswahl()
  const zeige = useMeldung()
  const drin = auswahl.enthaelt(id)
  return (
    <button
      type="button"
      className={'ein-wahl' + (drin ? ' drin' : '')}
      aria-pressed={drin}
      aria-label={drin ? `${name} aus der Auswahl nehmen` : `${name} zur Auswahl`}
      onClick={() => {
        const jetzt = auswahl.umschalten(id)
        zeige(jetzt ? `Zur Auswahl hinzugefügt (${auswahl.ids.length + 1})` : 'Aus der Auswahl genommen')
      }}
    >
      {drin ? <Haken size={18} /> : <Plus size={18} />}
    </button>
  )
}

/** Leiste unten, solange etwas ausgewählt ist; im breiten Modus nur links in der Liste */
export function EinsingLeiste() {
  const auswahl = useEinsingAuswahl()
  const nav = useNav()
  const bereich = useBereich()
  const n = auswahl.ids.length
  if (!n || bereich === 'detail') return null
  return (
    <div className="auswahl-leiste">
      <button
        type="button"
        className="primary links"
        aria-current={nav.detail?.v === 'einsingen-auswahl' ? 'true' : undefined}
        onClick={() => nav.geh({ v: 'einsingen-auswahl' })}
      >
        <Folien />
        <span>Auswahl ({n}): Folien erstellen</span>
        <Rechts size={18} />
      </button>
    </div>
  )
}
