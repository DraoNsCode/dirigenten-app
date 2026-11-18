import { useMemo, useState } from 'react'
import { Kopf } from '../bausteine'
import { probeZeile } from '../einsingen/folie'
import { useNav } from '../navigation'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { gewaehltText } from '../themen/folie'
import { Ladezustand, ThemenLeiste } from '../themen/Teile'
import { Rechts } from '../symbole'
import type { Familie } from '../themen/typen'

// Reiter „Folien“ (Daniel, 18.11.2026): möglichst schnelles und übersichtliches Auswählen und Export der Probenfolien.
// Gelesen wird im Reiter „Übungen“. Später kommen die Lieder als zweiter Block dazu.
// Aufbau (Claudes Vorschlag, noch nicht beurteilt):
// - Block „Übungen“, nach Themen gegliedert (wie im Reiter „Übungen“; Thema und Phase entsprechen sich). Die Themen
//   sind eingeklappt und lassen sich aufklappen (Daniel, 18.11.2026); im Kopf steht nur, wie viel daraus ausgewählt
//   ist (Daniel: keine Zahl der Übungen).
//   Aufgeklappt bleibt, solange die App offen ist.
// - Je Familie eine Zeile: links der Name, rechts kleine Schalter für die Grundübung (G) und die Stufen (1, 2, …).
//   Unter dem Namen steht, was ausgewählt ist.
// - Ein Tipp auf den Namen öffnet die Familienseite: am PC rechts, auf Handy und Tablet im Reiter „Übungen“
//   (Daniel, 18.11.2026); zurück in „Folien“ über den Reiter.
// - Schmal: Leiste unten „Auswahl (n): Folien erstellen“. Breit: rechts steht immer die Auswahl mit dem Export.

export default function FolienListe() {
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null

  // Themen mit ihren Familien in der Reihenfolge des Reiters „Übungen“; Familien ohne Thema am Ende
  const gruppen = useMemo(() => {
    if (!d) return []
    const g = d.themen
      .filter((t) => t.familien.length)
      .map((t) => ({ id: t.id, name: t.name, familien: t.familien.map((id) => d.familie.get(id)).filter((f): f is Familie => !!f) }))
    if (d.ohneThema.length) g.push({ id: '-', name: 'Noch ohne Thema', familien: d.ohneThema })
    return g
  }, [d])
  const [offen, setOffenState] = useState<Set<string>>(offeneThemen)
  const umschalten = (id: string) => {
    const neu = new Set(offen)
    if (neu.has(id)) neu.delete(id)
    else neu.add(id)
    offeneThemen = neu
    setOffenState(neu)
  }

  return (
    <div className="stapel">
      <Kopf eyebrow={probeZeile()} titel="Folien" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {d && (
        <>
          <p className="note fo-hinweis">G = Grundübung, Zahlen = Stufen. Name antippen: Seite lesen.</p>
          <div className="fo-themen">
            {gruppen.map((g) => (
              <ThemaGruppe key={g.id} id={g.id} name={g.name} familien={g.familien} offen={offen.has(g.id)} umschalten={umschalten} />
            ))}
          </div>
        </>
      )}
      <ThemenLeiste />
    </div>
  )
}

/** Aufgeklappte Themen; bleibt erhalten, solange die App offen ist (auch beim Reiterwechsel) */
let offeneThemen = new Set<string>()

function ThemaGruppe({
  id,
  name,
  familien,
  offen,
  umschalten,
}: {
  id: string
  name: string
  familien: Familie[]
  offen: boolean
  umschalten: (id: string) => void
}) {
  const auswahl = useThemenAuswahl()
  const n = familien.reduce((s, f) => s + auswahl.vonFamilie(f.id).length, 0)
  const listeId = `fo-thema-${id}`
  return (
    <section className={'fo-thema' + (offen ? ' offen' : '')}>
      <button type="button" className="fo-themakopf" aria-expanded={offen} aria-controls={listeId} onClick={() => umschalten(id)}>
        <Rechts size={16} />
        <span className="fo-themaname">{name}</span>
        {n > 0 && <span className="fo-zahl">{n} ausgewählt</span>}
      </button>
      {offen && (
        <ul className="list" id={listeId}>
          {familien.map((f) => (
            <FamilienZeile key={f.id} f={f} />
          ))}
        </ul>
      )}
    </section>
  )
}


function FamilienZeile({ f }: { f: Familie }) {
  const nav = useNav()
  const auswahl = useThemenAuswahl()
  const gewaehlt = auswahl.vonFamilie(f.id)
  const offen = nav.detail?.v === 'familie' && nav.detail.id === f.id
  const einheiten = [{ id: 'grund', kurz: 'G', name: `Grundübung: ${f.grund.name}` }, ...f.stufen.map((s, i) => ({ id: s.id, kurz: String(i + 1), name: `Stufe ${i + 1}: ${s.name}` }))]
  const unter = gewaehlt.length ? gewaehltText(f, gewaehlt) : f.grund.name !== f.name ? f.grund.name : ''

  return (
    <li className="fo-familie">
      <button
        className="listbtn fo-name"
        type="button"
        aria-current={offen ? 'true' : undefined}
        onClick={() => (nav.layout === 'breit' ? nav.geh({ v: 'familie', id: f.id }) : nav.inUebungen({ v: 'familie', id: f.id }))}
      >
        <span className="main">
          <span className="title">{f.name}</span>
          {unter && <span className={'meta ein-ziel' + (gewaehlt.length ? ' pr-gewaehlt' : '')}>{unter}</span>}
        </span>
      </button>
      <div className="fo-schalter" role="group" aria-label={`${f.name}: Grundübung und Stufen`}>
        {einheiten.map((e) => {
          const drin = gewaehlt.includes(e.id)
          return (
            <button
              key={e.id}
              type="button"
              className={'fo-chip' + (drin ? ' drin' : '')}
              aria-pressed={drin}
              aria-label={`${f.name}, ${e.name}`}
              title={e.name}
              onClick={() => auswahl.umschalten({ familie: f.id, einheit: e.id })}
            >
              {e.kurz}
            </button>
          )
        })}
      </div>
    </li>
  )
}
