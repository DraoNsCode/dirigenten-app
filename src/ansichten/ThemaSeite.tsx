import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Rechts } from '../symbole'
import { Abschnitt } from '../uebungen/Teile'
import { useInhalt } from '../themen/daten'
import { Absaetze, Klappe } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Themenseite (neuer Aufbau): immer sichtbar sind der Kern, „Im Chor erkennen“ und die Familien;
// die weiteren Abschnitte stehen eingeklappt darunter.

export default function ThemaSeite({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const t = d?.thema.get(id)

  if (!d || !t) {
    return (
      <>
        <Zurueck text="Themen" />
        <p className="note">{stand.art === 'bereit' ? 'Thema nicht gefunden.' : stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>
      </>
    )
  }

  const familien = t.familien.map((fid) => d.familie.get(fid)).filter((f): f is Familie => !!f)
  const oeffne = (fid: string) => nav.geh({ v: 'familie', id: fid })

  return (
    <>
      <Zurueck text="Themen" />
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

      <Abschnitt titel="Familien">
        <ul className="list">
          {familien.map((f) => (
            <li key={f.id}>
              <button className="listbtn" type="button" onClick={() => oeffne(f.id)}>
                <span className="main">
                  <span className="title">{f.name}</span>
                  <span className="meta ein-ziel">{f.grund.ziel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Abschnitt>

      {!!t.abschnitte?.length && (
        <div className="th-klappen">
          {t.abschnitte.map((a) => (
            <Klappe key={a.titel} titel={a.titel}>
              <Absaetze text={a.text} />
            </Klappe>
          ))}
        </div>
      )}
    </>
  )
}
