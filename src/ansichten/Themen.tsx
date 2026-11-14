import { Fehlerkarte, Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { useInhalt } from '../themen/daten'
import type { Familie } from '../themen/typen'

// Reiter „Themen“ (neuer Aufbau, Zugang zum Vorbereiten): je Thema die Themenseite und darunter ihre Familien.
// Nur zum Lesen – Auswahl und Export kommen später.

export default function Themen() {
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
      <Kopf eyebrow="Vorbereiten" titel="Themen" />

      {(stand.art === 'leer' || stand.art === 'laedt') && <p className="note">Lädt …</p>}
      {stand.art === 'fehler' &&
        (stand.fehlt ? (
          <section className="card">
            <h2>Noch keine Themen</h2>
            <p>Die Themen sind noch nicht hochgeladen.</p>
            <button className="textbtn" type="button" onClick={neuLaden}>
              Noch einmal versuchen
            </button>
          </section>
        ) : (
          <Fehlerkarte text={stand.text} nochmal={neuLaden} />
        ))}

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
          <ul className="list">{t.familien.map((id) => d.familie.get(id)).filter((f): f is Familie => !!f).map(familienZeile)}</ul>
        </section>
      ))}

      {!!d?.ohneThema.length && (
        <section className="section">
          <h3>Noch ohne Themenseite</h3>
          <ul className="list">{d.ohneThema.map(familienZeile)}</ul>
        </section>
      )}
    </div>
  )
}
