import { useMemo } from 'react'
import { Kopf } from '../bausteine'
import { probeZeile } from '../einsingen/folie'
import { useNav } from '../navigation'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitVon } from '../themen/folie'
import { Ladezustand, ThemenLeiste } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Reiter „Folien“ (Daniel, 18.11.2026): möglichst schnelles und übersichtliches Auswählen und Export der Probenfolien.
// Gelesen wird im Reiter „Übungen“. Später kommen die Lieder als zweiter Block dazu.
// Aufbau (Claudes Vorschlag, noch nicht beurteilt):
// - Block „Übungen“, nach Phasen gegliedert. Je Familie eine Zeile: links der Name, rechts kleine Schalter für die
//   Grundübung (G) und die Stufen (1, 2, …) – ohne Aufklappen. Unter dem Namen steht, was ausgewählt ist.
// - Ein Tipp auf den Namen öffnet die Familienseite (dort lässt sich ebenfalls auswählen).
// - Schmal: Leiste unten „Auswahl (n): Folien erstellen“. Breit: rechts steht immer die Auswahl mit dem Export.

export default function FolienListe() {
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null

  // Familien in der Reihenfolge der Datei (Phase, Thema, Stelle im Thema), nach Phasen gruppiert
  const phasen = useMemo(() => {
    const m = new Map<string, Familie[]>()
    for (const f of d?.familien ?? []) m.set(f.phase, [...(m.get(f.phase) ?? []), f])
    return [...m]
  }, [d])

  return (
    <div className="stapel">
      <Kopf eyebrow={probeZeile()} titel="Folien" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {d && (
        <>
          <div className="fo-blockkopf">
            <h2 className="fo-block">Übungen</h2>
            <p className="note">G = Grundübung, Zahlen = Stufen. Name antippen: Seite lesen.</p>
          </div>
          {phasen.map(([phase, familien]) => (
            <section key={phase} className="section">
              <h3>{phase}</h3>
              <ul className="list">
                {familien.map((f) => (
                  <FamilienZeile key={f.id} f={f} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <ThemenLeiste />
    </div>
  )
}

/** Was von einer Familie ausgewählt ist, in der Reihenfolge der Familie: „Grundübung · Stufe 2: In einem Schlag“ */
function gewaehltText(f: Familie, einheiten: string[]): string {
  return ['grund', ...f.stufen.map((s) => s.id)]
    .filter((e) => einheiten.includes(e))
    .map((e) => {
      const x = einheitVon(f, e)
      return !x ? e : x.nr === 0 ? 'Grundübung' : `Stufe ${x.nr}: ${x.a.name}`
    })
    .join(' · ')
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
      <button className="listbtn fo-name" type="button" aria-current={offen ? 'true' : undefined} onClick={() => nav.geh({ v: 'familie', id: f.id })}>
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
