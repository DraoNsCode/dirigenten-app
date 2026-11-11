import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Abschnitt } from '../uebungen/Teile'
import NotenAnsicht from '../einsingen/NotenAnsicht'
import { useEinsingen } from '../einsingen/daten'

// Seite einer Übung fürs Einsingen, in der Lesereihenfolge des Dirigenten:
// Titel, Noten mit Lageangabe, Ziel; Ablauf und Achten ergänzen nur, was dort noch nicht steht.

/** Text mit Leerzeilen als Absätze */
function Text({ text }: { text: string }) {
  return (
    <div className="ue-text">
      {text.split(/\n\s*\n/).map((absatz, i) => (
        <p key={i}>{absatz.trim()}</p>
      ))}
    </div>
  )
}

export default function EinsingenUebung({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useEinsingen()
  const zurueck = nav.vorher?.v === 'einsingen' ? 'Einsingen' : 'Zurück'
  const u = stand.art === 'bereit' ? stand.d.uebungen.get(id) : undefined

  if (!u) {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">
          {stand.art === 'bereit' ? 'Übung nicht gefunden.' : stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}
        </p>
      </>
    )
  }

  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf eyebrow={u.phase} titel={u.name} klein />
      {u.noten && <NotenAnsicht abc={u.noten} hinweis={u.notenHinweis} lage={u.lage} />}
      <p className="ue-ziel">{u.ziel}</p>
      <Abschnitt titel="Ablauf">
        <Text text={u.ablauf} />
      </Abschnitt>
      {u.achten && (
        <Abschnitt titel="Achten">
          <Text text={u.achten} />
        </Abschnitt>
      )}
    </>
  )
}
