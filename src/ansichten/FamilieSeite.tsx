import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Runter } from '../symbole'
import { Abschnitt } from '../uebungen/Teile'
import NotenAnsicht from '../einsingen/NotenAnsicht'
import { useInhalt } from '../themen/daten'
import { ThemenLeiste, ThemenWahlKnopf, zurueckText } from '../themen/Teile'
import type { Angaben, Folie, Stufe } from '../themen/typen'

// Familienseite: die Grundübung in der Lesereihenfolge des Dirigenten – Noten, Ziel, Ansage,
// „Gelingt, wenn“, typischer Fehler –, darunter die Stufen. Eine Stufe zeigt, was sich ändert; hat sie eigene
// Noten, Texte oder eine eigene Folie, lässt sie sich aufklappen. Nur im Reiter „Folien“ geöffnet, lassen sich die
// Grundübung (Knopf neben dem Titel) und jede Stufe für die Probenfolien auswählen; im Reiter „Übungen“ wird nur
// gelesen (Daniel, 18.11.2026).
// Aus der Auswahl geöffnet (stufe), steht die gewählte Stufe offen und markiert da, und die Seite rückt zu ihr
// (Daniel, 18.11.2026).

/** In diesen Phasen kommt es auf genaue Längen an: Die Noten bieten ein Metronom zum Zuschalten */
const METRONOM_PHASEN = ['Rhythmus']

/** Was auf der Folie steht, in einer Zeile */
function folienzeile(f: Folie, mitNoten: boolean): string {
  const text = Array.isArray(f.text) ? f.text.join(' · ') : f.text
  return [f.titel, text, mitNoten ? 'Noten' : undefined].filter(Boolean).join(' · ')
}

/** Anführungszeichen in der Ansage werden halbe (‚no‘), weil die Ansage selbst in „…“ steht. Barlow gibt dem
 *  unteren halben Zeichen (‚) eine Breite von 0,6 em; die Klasse rückt das Wort danach heran. */
function innenHalb(s: string): ReactNode {
  return s.split('„').map((teil, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="halb-unten">‚</span>}
      {teil.replace(/“/g, '‘')}
    </Fragment>
  ))
}

/** Ansage, „Gelingt, wenn“ und typischer Fehler – jeweils nur, wenn angegeben */
function Durchfuehrung({ a }: { a: Angaben }) {
  return (
    <>
      {a.ansage && (
        <div className="th-ansage">
          <span className="th-marke">Ansage</span>
          <p>„{innenHalb(a.ansage)}“</p>
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

function StufenZeile({
  nr,
  s,
  familie,
  mitMetronom,
  markiert,
  mitWahl,
}: {
  nr: number
  s: Stufe
  familie: string
  mitMetronom: boolean
  markiert: boolean
  mitWahl: boolean
}) {
  const eigenes = !!(s.noten || s.folie || s.ziel || s.ansage || s.gelingt?.length || s.fehler)
  const [offen, setOffen] = useState(markiert && eigenes)
  const zeile = useRef<HTMLLIElement>(null)

  // Zur markierten Stufe rücken; die Noten darüber werden erst nach dem Laden gezeichnet, deshalb noch einmal danach
  useEffect(() => {
    if (!markiert) return
    const hin = () => zeile.current?.scrollIntoView({ block: 'start' })
    const r = requestAnimationFrame(hin)
    const t = setTimeout(hin, 350)
    return () => {
      cancelAnimationFrame(r)
      clearTimeout(t)
    }
  }, [markiert])
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
    <li className={'th-stufe' + (markiert ? ' markiert' : '')} ref={zeile}>
      <div className="th-stufenzeile">
        {eigenes ? (
          <button type="button" className="th-stufenkopf" aria-expanded={offen} onClick={() => setOffen(!offen)}>
            {kopf}
            <Runter size={16} />
          </button>
        ) : (
          <div className="th-stufenkopf">{kopf}</div>
        )}
        {mitWahl && <ThemenWahlKnopf wahl={{ familie, einheit: s.id }} name={`Stufe ${nr}, ${s.name}`} />}
      </div>
      {offen && (
        <div className="th-stufeninhalt">
          {s.noten && <NotenAnsicht abc={s.noten} hinweis={s.notenHinweis} lage={s.lage} mitMetronom={mitMetronom} />}
          {s.ziel && <p className="ue-ziel">{s.ziel}</p>}
          <Durchfuehrung a={s} />
          {s.folie && <p className="th-folie">Auf der Folie: {folienzeile(s.folie, !!s.noten)}</p>}
        </div>
      )}
    </li>
  )
}

export default function FamilieSeite({ id, stufe }: { id: string; stufe?: string }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const f = d?.familie.get(id)
  const zurueck = zurueckText(nav.vorher, (tid) => d?.thema.get(tid)?.name)

  if (!f) {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">{stand.art === 'bereit' ? 'Familie nicht gefunden.' : stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>
      </>
    )
  }

  const g = f.grund
  const mitMetronom = METRONOM_PHASEN.includes(f.phase)
  const mitWahl = nav.aktiv === 'folien'
  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf
        eyebrow={f.phase}
        titel={f.name}
        klein
        rechts={mitWahl ? <ThemenWahlKnopf wahl={{ familie: f.id, einheit: 'grund' }} name={`${f.name}, Grundübung`} /> : undefined}
      />

      <section className="ein-teil">
        {g.name !== f.name && <h2 className="ein-teilname">{g.name}</h2>}
        {g.noten && <NotenAnsicht abc={g.noten} hinweis={g.notenHinweis} lage={g.lage} mitMetronom={mitMetronom} />}
        <p className="ue-ziel">{g.ziel}</p>
        <Durchfuehrung a={g} />
        <p className="th-folie">Auf der Folie: {folienzeile(g.folie, !!g.noten)}</p>
      </section>

      {!!f.stufen.length && (
        <Abschnitt titel="Stufen">
          <ol className="th-stufen">
            {f.stufen.map((s, i) => (
              <StufenZeile key={s.id} nr={i + 1} s={s} familie={f.id} mitMetronom={mitMetronom} markiert={s.id === stufe} mitWahl={mitWahl} />
            ))}
          </ol>
        </Abschnitt>
      )}
      <ThemenLeiste />
    </>
  )
}
