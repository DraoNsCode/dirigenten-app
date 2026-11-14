import { useState } from 'react'
import { Kopf } from '../bausteine'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Haken, Plus, Rechts, Runter } from '../symbole'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitName } from '../themen/folie'
import { Ladezustand, ThemenLeiste, ThemenWahlKnopf } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Reiter „Einsingen“ (Zugang für die Probe): die Familien nach Phasen, zum schnellen Auswählen für die
// Probenfolien – ohne Lesetext. Phasen ohne Familien erscheinen nicht. Jede Familie ist eine Zeile; ihre
// Grundübung und ihre Stufen klappen darunter auf und lassen sich einzeln auswählen, auch mehrere zugleich.
// Derselbe Inhalt steht im Reiter „Übungen“ zum Lesen und Vorbereiten.

export default function Probe() {
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const phasen = d?.phasen.filter((p) => p.familien.length) ?? []
  const ohne = d?.phasen.filter((p) => !p.familien.length).map((p) => p.name) ?? []

  return (
    <div className="stapel">
      <Kopf eyebrow="Übungen für die Probe" titel="Einsingen" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {phasen.map((p) => (
        <section key={p.name} className="section">
          <h3>{p.name}</h3>
          <ul className="list">
            {p.familien.map((f) => (
              <ProbeFamilie key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ))}
      {d && ohne.length > 0 && <p className="note">Noch ohne Übungen: {ohne.join(', ')}.</p>}
      <ThemenLeiste />
    </div>
  )
}

function ProbeFamilie({ f }: { f: Familie }) {
  const nav = useNav()
  const auswahl = useThemenAuswahl()
  const zeige = useMeldung()
  const [offen, setOffen] = useState(false)
  const gewaehlt = auswahl.vonFamilie(f.id)
  const n = gewaehlt.length

  // Unter dem Namen: was ausgewählt ist, sonst die Grundübung und wie viele Stufen es gibt
  const stufen = f.stufen.length === 1 ? '1 Stufe' : `${f.stufen.length} Stufen`
  const zusatz =
    n > 1
      ? `${n} ausgewählt`
      : n === 1
        ? einheitName(f, gewaehlt[0])
        : [f.grund.name !== f.name ? f.grund.name : 'Grundübung', f.stufen.length ? stufen : ''].filter(Boolean).join(' · ')

  function knopf() {
    if (n) {
      auswahl.familieEntfernen(f.id)
      zeige('Aus der Auswahl genommen')
    } else {
      auswahl.umschalten({ familie: f.id, einheit: 'grund' })
      zeige(`Zur Auswahl hinzugefügt (${auswahl.schluessel.length + 1})`)
    }
  }

  return (
    <li className="pr-familie">
      <div className="ein-zeile">
        <button className="listbtn" type="button" aria-expanded={offen} onClick={() => setOffen(!offen)}>
          <span className="main">
            <span className="title">{f.name}</span>
            <span className={'meta ein-ziel' + (n ? ' pr-gewaehlt' : '')}>{zusatz}</span>
          </span>
          <Runter size={16} />
        </button>
        <button
          type="button"
          className={'ein-wahl' + (n ? ' drin' : '')}
          aria-pressed={n > 0}
          aria-label={n ? `${f.name} aus der Auswahl nehmen` : `${f.name}, Grundübung zur Auswahl`}
          onClick={knopf}
        >
          {n ? <Haken size={18} /> : <Plus size={18} />}
        </button>
      </div>
      {offen && (
        <ul className="pr-stufen">
          {[{ id: 'grund', name: f.grund.name }, ...f.stufen].map((e, i) => (
            <li key={e.id}>
              <span className="pr-stufenname">
                <span className="pr-stufennr">{i === 0 ? 'Grundübung' : `Stufe ${i}`}</span>
                {e.name}
              </span>
              <ThemenWahlKnopf wahl={{ familie: f.id, einheit: e.id }} name={i === 0 ? `${f.name}, Grundübung` : `Stufe ${i}, ${e.name}`} />
            </li>
          ))}
          <li>
            <button className="th-verweis" type="button" onClick={() => nav.geh({ v: 'familie', id: f.id })}>
              <Rechts size={16} />
              Lesen
            </button>
          </li>
        </ul>
      )}
    </li>
  )
}
