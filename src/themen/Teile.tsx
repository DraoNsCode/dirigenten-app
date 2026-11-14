import { useState, type ReactNode } from 'react'
import { useMeldung } from '../meldung'
import { useBereich, useNav, type Ansicht } from '../navigation'
import { Folien, Haken, Plus, Rechts, Runter } from '../symbole'
import { Fehlerkarte } from '../bausteine'
import { useThemenAuswahl } from './auswahl'
import type { InhaltStand } from './daten'
import type { Wahl } from './folie'

// Bausteine der Reiter „Übungen“ und „Einsingen“ (Themen- und Familienseiten, Auswahl)

/** Was beim Laden oder bei einem Fehler statt der Liste steht */
export function Ladezustand({ stand, neuLaden }: { stand: InhaltStand; neuLaden: () => void }) {
  if (stand.art === 'leer' || stand.art === 'laedt') return <p className="note">Lädt …</p>
  if (stand.art !== 'fehler') return null
  if (!stand.fehlt) return <Fehlerkarte text={stand.text} nochmal={neuLaden} />
  return (
    <section className="card">
      <h2>Noch keine Übungen</h2>
      <p>Die Übungen sind noch nicht hochgeladen.</p>
      <button className="textbtn" type="button" onClick={neuLaden}>
        Noch einmal versuchen
      </button>
    </section>
  )
}

/** Beschriftung von „Zurück“ je nach der Ansicht, von der aus geöffnet wurde */
export function zurueckText(vorher: Ansicht | undefined, themaName?: (id: string) => string | undefined): string {
  switch (vorher?.v) {
    case 'vorbereiten':
      return 'Übungen'
    case 'probe':
      return 'Einsingen'
    case 'probe-auswahl':
      return 'Auswahl'
    case 'thema':
      return themaName?.(vorher.id) ?? 'Thema'
    default:
      return 'Zurück'
  }
}

/** Text mit Leerzeilen als Absätze */
export function Absaetze({ text }: { text: string }) {
  return (
    <div className="ue-text">
      {text.split(/\n\s*\n/).map((absatz, i) => (
        <p key={i}>{absatz.trim()}</p>
      ))}
    </div>
  )
}

/** Eingeklappter Abschnitt: zeigt nur die Überschrift, öffnet sich beim Antippen */
export function Klappe({ titel, zusatz, children }: { titel: ReactNode; zusatz?: ReactNode; children: ReactNode }) {
  const [offen, setOffen] = useState(false)
  return (
    <section className="th-klappe">
      <button type="button" className="th-klappenkopf" aria-expanded={offen} onClick={() => setOffen(!offen)}>
        <span className="th-klappentitel">
          {titel}
          {zusatz}
        </span>
        <Runter size={16} />
      </button>
      {offen && <div className="th-klappeninhalt">{children}</div>}
    </section>
  )
}

/** Runder Knopf zum Auswählen (Plus) bzw. Abwählen (Haken) einer Grundübung oder Stufe */
export function ThemenWahlKnopf({ wahl, name }: { wahl: Wahl; name: string }) {
  const auswahl = useThemenAuswahl()
  const zeige = useMeldung()
  const drin = auswahl.enthaelt(wahl)
  return (
    <button
      type="button"
      className={'ein-wahl' + (drin ? ' drin' : '')}
      aria-pressed={drin}
      aria-label={drin ? `${name} aus der Auswahl nehmen` : `${name} zur Auswahl`}
      onClick={() => {
        const jetzt = auswahl.umschalten(wahl)
        zeige(jetzt ? `Zur Auswahl hinzugefügt (${auswahl.schluessel.length + 1})` : 'Aus der Auswahl genommen')
      }}
    >
      {drin ? <Haken size={18} /> : <Plus size={18} />}
    </button>
  )
}

/** Leiste unten, solange etwas ausgewählt ist; im breiten Modus nur links in der Liste */
export function ThemenLeiste() {
  const auswahl = useThemenAuswahl()
  const nav = useNav()
  const bereich = useBereich()
  const n = auswahl.schluessel.length
  if (!n || bereich === 'detail') return null
  return (
    <div className="auswahl-leiste">
      <button
        type="button"
        className="primary links"
        aria-current={nav.detail?.v === 'probe-auswahl' ? 'true' : undefined}
        onClick={() => nav.geh({ v: 'probe-auswahl' })}
      >
        <Folien />
        <span>Auswahl ({n}): Folien erstellen</span>
        <Rechts size={18} />
      </button>
    </div>
  )
}
