import { useState, type ReactNode } from 'react'
import { Runter } from '../symbole'

// Bausteine der Themen- und Familienseiten (neuer Aufbau)

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
