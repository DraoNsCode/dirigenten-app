import { useState } from 'react'
import { Fehlerkarte, Kopf } from '../bausteine'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Haken, Plus, Rechts, Runter } from '../symbole'
import { useInhalt, type Inhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitName } from '../themen/folie'
import { ThemenLeiste, ThemenWahlKnopf } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Reiter „Themen“ (neuer Aufbau, ein Inhalt mit zwei Zugängen), oben ein Umschalter:
// - „Vorbereiten“: je Thema die Themenseite und darunter ihre Familien, zum Lesen.
// - „Probe“: die Familien nach Phasen, zum schnellen Auswählen für die Probenfolien – ohne Lesetext.
// Solange gebaut wird, stehen beide Zugänge in diesem Reiter; später werden daraus zwei Reiter (Daniel, 14.11.2026).

type Zugang = 'vorbereiten' | 'probe'
const ZUGANG_SCHLUESSEL = 'dirigenten-themen-zugang'

function gemerkterZugang(): Zugang {
  try {
    return localStorage.getItem(ZUGANG_SCHLUESSEL) === 'probe' ? 'probe' : 'vorbereiten'
  } catch {
    return 'vorbereiten'
  }
}

export default function Themen() {
  const { stand, neuLaden } = useInhalt()
  const [zugang, setZugang] = useState<Zugang>(gemerkterZugang)
  const d = stand.art === 'bereit' ? stand.d : null

  function wechsle(z: Zugang) {
    setZugang(z)
    try {
      localStorage.setItem(ZUGANG_SCHLUESSEL, z)
    } catch {
      // ohne Merken weiter
    }
  }

  return (
    <div className="stapel">
      <Kopf eyebrow={zugang === 'probe' ? 'Übungen für die Probe' : 'Vorbereiten'} titel="Themen" />

      <div className="th-umschalter" role="group" aria-label="Zugang">
        <button type="button" aria-pressed={zugang === 'vorbereiten'} onClick={() => wechsle('vorbereiten')}>
          Vorbereiten
        </button>
        <button type="button" aria-pressed={zugang === 'probe'} onClick={() => wechsle('probe')}>
          Probe
        </button>
      </div>

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

      {d && (zugang === 'probe' ? <Probe d={d} /> : <Vorbereiten d={d} />)}
      <ThemenLeiste />
    </div>
  )
}

// ---------- Vorbereiten ----------

function Vorbereiten({ d }: { d: Inhalt }) {
  const nav = useNav()
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
    <>
      {d.themen.map((t) => (
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

      {!!d.ohneThema.length && (
        <section className="section">
          <h3>Noch ohne Themenseite</h3>
          <ul className="list">{d.ohneThema.map(familienZeile)}</ul>
        </section>
      )}
    </>
  )
}

// ---------- Probe ----------

/** Phasen ohne Familien erscheinen nicht; jede Familie ist eine Zeile, ihre Stufen klappen darunter auf */
function Probe({ d }: { d: Inhalt }) {
  const phasen = d.phasen.filter((p) => p.familien.length)
  return (
    <>
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
      {phasen.length < d.phasen.length && (
        <p className="note">
          Noch ohne Übungen:{' '}
          {d.phasen
            .filter((p) => !p.familien.length)
            .map((p) => p.name)
            .join(', ')}
          .
        </p>
      )}
    </>
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
