import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Rechts } from '../symbole'
import { Abschnitt } from '../uebungen/Teile'
import { useInhalt } from '../themen/daten'
import { Absaetze, Klappe, ThemenLeiste, ThemenWahlKnopf } from '../themen/Teile'
import { useThemenAuswahl } from '../themen/auswahl'
import { gewaehltText } from '../themen/folie'
import type { Familie } from '../themen/typen'

// Themenseite: immer sichtbar sind der Kern, „Im Chor erkennen“ und die Familien;
// die weiteren Abschnitte stehen eingeklappt darunter. Ein Thema ohne Familien ist ein Lesetext für die Dirigenten:
// Seine Abschnitte stehen offen untereinander (Daniel, 17.11.2026: „einfach gute Texte zum Lesen“).

export default function ThemaSeite({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const t = d?.thema.get(id)

  if (!d || !t) {
    return (
      <>
        <Zurueck text="Übungen" />
        <p className="note">{stand.art === 'bereit' ? 'Thema nicht gefunden.' : stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>
      </>
    )
  }

  const familien = t.familien.map((fid) => d.familie.get(fid)).filter((f): f is Familie => !!f)
  const oeffne = (fid: string) => nav.geh({ v: 'familie', id: fid })

  return (
    <>
      <Zurueck text="Übungen" />
      <Kopf eyebrow="Thema" titel={t.name} klein />
      <p className="ue-ziel">{t.kern}</p>

      {!!t.erkennen?.length && (
        <Abschnitt titel="Im Chor erkennen">
          <ul className="th-erkennen">
            {t.erkennen.map((e, i) => (
              <li key={i}>
                <span className="th-zeichen">{e.zeichen}</span>
                <button className="th-verweis" type="button" onClick={() => oeffne(e.familie)}>
                  <Rechts size={16} />
                  {d.familie.get(e.familie)?.name ?? e.familie}
                </button>
              </li>
            ))}
          </ul>
        </Abschnitt>
      )}

      {!!familien.length && (
        <Abschnitt titel="Familien">
          <ul className="list">
            {familien.map((f) => (
              <FamilienZeile key={f.id} f={f} oeffne={oeffne} />
            ))}
          </ul>
        </Abschnitt>
      )}

      {!!t.abschnitte?.length &&
        (familien.length ? (
          <div className="th-klappen">
            {t.abschnitte.map((a) => (
              <Klappe key={a.titel} titel={a.titel}>
                <Absaetze text={a.text} />
              </Klappe>
            ))}
          </div>
        ) : (
          t.abschnitte.map((a) => (
            <Abschnitt key={a.titel} titel={a.titel}>
              <Absaetze text={a.text} />
            </Abschnitt>
          ))
        ))}
      <ThemenLeiste />
    </>
  )
}

/** Familie in der Liste der Themenseite: ein Tipp öffnet sie, „+“ wählt die Grundübung aus (Daniel, 18.11.2026) */
function FamilienZeile({ f, oeffne }: { f: Familie; oeffne: (id: string) => void }) {
  const auswahl = useThemenAuswahl()
  const gewaehlt = auswahl.vonFamilie(f.id)
  return (
    <li className="ein-zeile">
      <button className="listbtn" type="button" onClick={() => oeffne(f.id)}>
        <span className="main">
          <span className="title">{f.name}</span>
          <span className={'meta ein-ziel' + (gewaehlt.length ? ' pr-gewaehlt' : '')}>{gewaehlt.length ? gewaehltText(f, gewaehlt) : f.grund.ziel}</span>
        </span>
      </button>
      <ThemenWahlKnopf wahl={{ familie: f.id, einheit: 'grund' }} name={`${f.name}, Grundübung`} />
    </li>
  )
}
