import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { useEinsingen } from '../einsingen/daten'
import { EinsingLeiste, WahlKnopf } from '../einsingen/Teile'
import { UebungInhalt, zurueckText } from './EinsingenUebung'

// Seite einer Gruppe kurzer Übungen (festgelegt in reihenfolge.md):
// die Übungen nacheinander, jede mit eigener Überschrift, Noten, Ziel, Ablauf und Achten.
// Ausgewählt wird die Gruppe als Ganzes; auf der Folie steht je Übung ein Stichpunkt.

export default function EinsingenGruppe({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useEinsingen()
  const zurueck = zurueckText(nav.vorher)
  const e = stand.art === 'bereit' ? stand.d.eintraege.get(id) : undefined

  if (!e || e.art !== 'gruppe') {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">
          {stand.art === 'bereit' ? 'Eintrag nicht gefunden.' : stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}
        </p>
      </>
    )
  }

  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf eyebrow={e.phase} titel={e.name} klein rechts={<WahlKnopf id={e.id} name={e.name} />} />
      {e.teile.map((u) => (
        <section key={u.id} className="ein-teil">
          <h2 className="ein-teilname">{u.name}</h2>
          <UebungInhalt u={u} />
        </section>
      ))}
      <EinsingLeiste />
    </>
  )
}
