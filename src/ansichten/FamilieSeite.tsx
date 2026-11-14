import { useState } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Runter } from '../symbole'
import { Abschnitt } from '../uebungen/Teile'
import NotenAnsicht from '../einsingen/NotenAnsicht'
import { useInhalt } from '../themen/daten'
import type { Angaben, Folie, Stufe } from '../themen/typen'

// Familienseite (neuer Aufbau): die Grundübung in der Lesereihenfolge des Dirigenten – Noten, Ziel, Ansage,
// „Gelingt, wenn“, typischer Fehler –, darunter die Stufen. Eine Stufe zeigt, was sich ändert; hat sie eigene
// Noten, Texte oder eine eigene Folie, lässt sie sich aufklappen. Nur zum Lesen, noch ohne Auswahl.

/** Was auf der Folie steht, in einer Zeile */
function folienzeile(f: Folie, mitNoten: boolean): string {
  const text = Array.isArray(f.text) ? f.text.join(' · ') : f.text
  return [f.titel, text, mitNoten ? 'Noten' : undefined].filter(Boolean).join(' · ')
}

/** Ansage, „Gelingt, wenn“ und typischer Fehler – jeweils nur, wenn angegeben */
function Durchfuehrung({ a }: { a: Angaben }) {
  return (
    <>
      {a.ansage && (
        <div className="th-ansage">
          <span className="th-marke">Ansage</span>
          <p>„{a.ansage}“</p>
        </div>
      )}
      {!!a.gelingt?.length && (
        <Abschnitt titel="Gelingt, wenn">
          <ul className="ue-liste">
            {a.gelingt.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </Abschnitt>
      )}
      {a.fehler && (
        <Abschnitt titel="Typischer Fehler">
          <dl className="th-paar">
            <div>
              <dt>Fehler</dt>
              <dd>{a.fehler}</dd>
            </div>
            {a.korrektur && (
              <div>
                <dt>Korrektur</dt>
                <dd>{a.korrektur}</dd>
              </div>
            )}
          </dl>
        </Abschnitt>
      )}
    </>
  )
}

function StufenZeile({ nr, s }: { nr: number; s: Stufe }) {
  const [offen, setOffen] = useState(false)
  const eigenes = !!(s.noten || s.folie || s.ziel || s.ansage || s.gelingt?.length || s.fehler)
  const kopf = (
    <>
      <span className="th-stufennr">{nr}</span>
      <span className="th-stufentext">
        <span className="th-stufenname">{s.name}</span>
        <span className="th-aenderung">{s.aenderung}</span>
      </span>
    </>
  )
  return (
    <li className="th-stufe">
      {eigenes ? (
        <button type="button" className="th-stufenkopf" aria-expanded={offen} onClick={() => setOffen(!offen)}>
          {kopf}
          <Runter size={16} />
        </button>
      ) : (
        <div className="th-stufenkopf">{kopf}</div>
      )}
      {offen && (
        <div className="th-stufeninhalt">
          {s.noten && <NotenAnsicht abc={s.noten} hinweis={s.notenHinweis} lage={s.lage} />}
          {s.ziel && <p className="ue-ziel">{s.ziel}</p>}
          <Durchfuehrung a={s} />
          {s.folie && <p className="th-folie">Auf der Folie: {folienzeile(s.folie, !!s.noten)}</p>}
        </div>
      )}
    </li>
  )
}

export default function FamilieSeite({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const f = d?.familie.get(id)
  const vorher = nav.vorher
  const zurueck = vorher?.v === 'thema' ? (d?.thema.get(vorher.id)?.name ?? 'Thema') : vorher?.v === 'themen' ? 'Themen' : 'Zurück'

  if (!f) {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">{stand.art === 'bereit' ? 'Familie nicht gefunden.' : stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>
      </>
    )
  }

  const g = f.grund
  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf eyebrow={f.phase} titel={f.name} klein />

      <section className="ein-teil">
        {g.name !== f.name && <h2 className="ein-teilname">{g.name}</h2>}
        {g.noten && <NotenAnsicht abc={g.noten} hinweis={g.notenHinweis} lage={g.lage} />}
        <p className="ue-ziel">{g.ziel}</p>
        <Durchfuehrung a={g} />
        <p className="th-folie">Auf der Folie: {folienzeile(g.folie, !!g.noten)}</p>
      </section>

      {!!f.stufen.length && (
        <Abschnitt titel="Stufen">
          <ol className="th-stufen">
            {f.stufen.map((s, i) => (
              <StufenZeile key={s.id} nr={i + 1} s={s} />
            ))}
          </ol>
        </Abschnitt>
      )}
    </>
  )
}
