import { useState } from 'react'
import { Kopf } from '../bausteine'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Haken, Plus, Rechts, Runter } from '../symbole'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitName } from '../themen/folie'
import { Ladezustand, ThemenLeiste, ThemenWahlKnopf } from '../themen/Teile'
import type { Familie, Thema } from '../themen/typen'

// Reiter „Übungen“ (Daniel, 18.11.2026: ein Reiter statt „Übungen“ und „Einsingen“):
// ausgewählt wird in der Liste, gelesen auf der Themen- und Familienseite.
// - Je Thema eine Überschrift; „Thema ›“ öffnet die Themenseite. Darunter die Familien mit + für die Grundübung und
//   aufklappbaren Stufen, die sich einzeln auswählen lassen.
// - Breit (PC): Ein Klick auf eine Familie klappt links ihre Stufen auf und zeigt rechts ihre Seite; ist die Seite
//   schon offen, klappt der Klick nur auf oder zu.
// - Schmal (Handy): Ein Tipp klappt die Familie auf, „Lesen“ öffnet ihre Seite. Aufgeklappte Familien bleiben offen,
//   wenn man von der Seite zurückkommt.
// - Am Ende die Themen ohne Familien als Lesetexte („Zum Lesen“).

/** Aufgeklappte Familien; bleiben erhalten, solange die App offen ist (auch wenn die Liste neu gezeichnet wird) */
const aufgeklappt = new Set<string>()

export default function Vorbereiten() {
  const nav = useNav()
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const offen = nav.detail?.v === 'thema' || nav.detail?.v === 'familie' ? `${nav.detail.v}:${nav.detail.id}` : ''
  const mitFamilien = d?.themen.filter((t) => t.familien.length) ?? []
  const lesetexte = d?.themen.filter((t) => !t.familien.length) ?? []

  return (
    <div className="stapel">
      <Kopf eyebrow="Vorbereiten" titel="Übungen" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {d &&
        mitFamilien.map((t) => (
          <section key={t.id} className="section">
            <ThemaKopf t={t} aktiv={offen === `thema:${t.id}`} />
            <ul className="list">
              {t.familien
                .map((id) => d.familie.get(id))
                .filter((f): f is Familie => !!f)
                .map((f) => (
                  <FamilienZeile key={f.id} f={f} aktiv={offen === `familie:${f.id}`} />
                ))}
            </ul>
          </section>
        ))}

      {!!d?.ohneThema.length && (
        <section className="section">
          <h3>Noch ohne Themenseite</h3>
          <ul className="list">
            {d.ohneThema.map((f) => (
              <FamilienZeile key={f.id} f={f} aktiv={offen === `familie:${f.id}`} />
            ))}
          </ul>
        </section>
      )}

      {!!lesetexte.length && (
        <section className="section">
          <h3>Zum Lesen</h3>
          <ul className="list">
            {lesetexte.map((t) => (
              <li key={t.id}>
                <button
                  className="listbtn"
                  type="button"
                  aria-current={offen === `thema:${t.id}` ? 'true' : undefined}
                  onClick={() => nav.geh({ v: 'thema', id: t.id })}
                >
                  <span className="main">
                    <span className="title">{t.name}</span>
                    <span className="meta ein-ziel">{t.kern}</span>
                  </span>
                  <Rechts size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ThemenLeiste />
    </div>
  )
}

/** Überschrift eines Themas; „Thema ›“ öffnet die Themenseite */
function ThemaKopf({ t, aktiv }: { t: Thema; aktiv: boolean }) {
  const nav = useNav()
  return (
    <button type="button" className="th-listenkopf" aria-current={aktiv ? 'true' : undefined} onClick={() => nav.geh({ v: 'thema', id: t.id })}>
      <span className="th-listenkopf-name">{t.name}</span>
      <span className="th-listenkopf-verweis">
        Thema
        <Rechts size={14} />
      </span>
    </button>
  )
}

/** Eine Familie: Name und was gewählt ist, + für die Grundübung, aufgeklappt die Grundübung und die Stufen */
function FamilienZeile({ f, aktiv }: { f: Familie; aktiv: boolean }) {
  const nav = useNav()
  const auswahl = useThemenAuswahl()
  const zeige = useMeldung()
  const breit = nav.layout === 'breit'
  const [auf, setAuf] = useState(() => aufgeklappt.has(f.id))
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

  function setze(neu: boolean) {
    if (neu) aufgeklappt.add(f.id)
    else aufgeklappt.delete(f.id)
    setAuf(neu)
  }

  function tippen() {
    if (breit && !aktiv) {
      setze(true)
      nav.geh({ v: 'familie', id: f.id })
    } else setze(!auf)
  }

  // Der Knopf an der Zeile wählt die Grundübung; ist schon etwas gewählt, nimmt er alles dieser Familie heraus
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
        <button className="listbtn" type="button" aria-expanded={auf} aria-current={aktiv ? 'true' : undefined} onClick={tippen}>
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
      {auf && (
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
          {!breit && (
            <li>
              <button className="th-verweis" type="button" onClick={() => nav.geh({ v: 'familie', id: f.id })}>
                <Rechts size={16} />
                Lesen
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
