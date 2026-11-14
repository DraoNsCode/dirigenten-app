import { Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { useInhalt } from '../themen/daten'
import { Ladezustand, ThemenLeiste } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Reiter „Übungen“ (Zugang zum Vorbereiten): je Thema die Themenseite und darunter ihre Familien, zum Lesen.
// Derselbe Inhalt steht im Reiter „Einsingen“ zum schnellen Auswählen für die Probe.

export default function Vorbereiten() {
  const nav = useNav()
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const offen = nav.detail?.v === 'thema' || nav.detail?.v === 'familie' ? `${nav.detail.v}:${nav.detail.id}` : ''

  const familienZeile = (f: Familie) => (
    <li key={f.id}>
      <button className="listbtn" type="button" aria-current={offen === `familie:${f.id}` ? 'true' : undefined} onClick={() => nav.geh({ v: 'familie', id: f.id })}>
        <span className="main">
          <span className="title">{f.name}</span>
          <span className="meta ein-ziel">{f.grund.ziel}</span>
        </span>
      </button>
    </li>
  )

  return (
    <div className="stapel">
      <Kopf eyebrow="Vorbereiten" titel="Übungen" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {d?.themen.map((t) => (
        <section key={t.id} className="section">
          <button
            className="listbtn th-themazeile"
            type="button"
            aria-current={offen === `thema:${t.id}` ? 'true' : undefined}
            onClick={() => nav.geh({ v: 'thema', id: t.id })}
          >
            <span className="main">
              <span className="th-themaname">{t.name}</span>
              <span className="meta ein-ziel">{t.kern}</span>
            </span>
          </button>
          <ul className="list">
            {t.familien
              .map((id) => d.familie.get(id))
              .filter((f): f is Familie => !!f)
              .map(familienZeile)}
          </ul>
        </section>
      ))}

      {!!d?.ohneThema.length && (
        <section className="section">
          <h3>Noch ohne Themenseite</h3>
          <ul className="list">{d.ohneThema.map(familienZeile)}</ul>
        </section>
      )}
      <ThemenLeiste />
    </div>
  )
}
