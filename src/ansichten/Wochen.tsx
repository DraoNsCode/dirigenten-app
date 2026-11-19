import { Kopf, Zurueck } from '../bausteine'
import { useDaten } from '../daten'
import {
  besondereTage,
  ereignisseDerWoche,
  heute,
  kalenderwoche,
  montagVon,
  plusTage,
  wochenAbstand,
  wochenMonat,
  wochenSpanne,
} from '../kalender'
import { useNav } from '../navigation'
import { Haken, Rechts } from '../symbole'

// Wochenübersicht (Daniel, 19.11.2026): ersetzt die Menüpunkte „Gottesdienste“ und „Proben“.
// Liste nach Kalenderwochen mit Datum von–bis, nach Monaten gegliedert: aktueller Monat und die nächsten drei vollen
// Monate (Daniel, 19.11.2026; vorher 2 Wochen zurück und 3 Monate voraus).
// Ein kurzer Hinweis zeigt, ob in einer Woche schon etwas eingetragen ist. Antippen öffnet die Woche im Wochenplan.
// Erreichbar über das Menü und über ein kleines Symbol im Kopf des Wochenplans.
// Name „Wochenübersicht“: Claudes Vorschlag (Daniel: „Kalender oder etwas Besseres“), noch nicht beurteilt.

const MONATE_VORAUS = 3

/** Wochen des aktuellen Monats und der nächsten drei vollen Monate (Monat einer Woche = Monat ihres Donnerstags) */
function wochen() {
  const jetzt = heute()
  const ersterTag = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1)
  const letzterTag = new Date(jetzt.getFullYear(), jetzt.getMonth() + MONATE_VORAUS + 1, 0)
  const r: Date[] = []
  for (let m = montagVon(ersterTag); plusTage(m, 3) <= letzterTag; m = plusTage(m, 7)) if (plusTage(m, 3) >= ersterTag) r.push(m)
  return r
}

export default function Wochen() {
  const nav = useNav()
  // nach Monaten gegliedert (eine Woche gehört zum Monat ihres Donnerstags)
  const gruppen: (ReturnType<typeof wochenMonat> & { wochen: Date[] })[] = []
  for (const montag of wochen()) {
    const m = wochenMonat(montag)
    const letzte = gruppen[gruppen.length - 1]
    if (letzte && letzte.monat === m.monat && letzte.jahr === m.jahr) letzte.wochen.push(montag)
    else gruppen.push({ ...m, wochen: [montag] })
  }
  // Am PC (breit) steht der Wochenplan links: die Übersicht bleibt rechts offen, und die dort gezeigte Woche ist markiert
  const nebenWochenplan = nav.layout === 'breit' && nav.aktiv === 'woche'
  const markiert = nebenWochenplan ? nav.woche : 0

  function oeffnen(montag: Date) {
    if (nebenWochenplan) nav.setWoche(wochenAbstand(montag, heute()))
    else nav.zurWoche(montag)
  }

  return (
    <>
      <Zurueck text={nav.vorher?.v === 'woche' ? 'Wochenplan' : 'Menü'} />
      <Kopf eyebrow="Übersicht" titel="Wochenübersicht" klein />
      {gruppen.map((g) => (
        <section className="wochen-gruppe" key={`${g.jahr}-${g.monat}`}>
          <h3>
            {g.name}
            {g.jahr !== heute().getFullYear() && ` ${g.jahr}`}
          </h3>
          <ul className="list">
            {g.wochen.map((montag) => (
              <WochenZeile key={montag.getTime()} montag={montag} markiert={markiert} onOeffnen={oeffnen} />
            ))}
          </ul>
        </section>
      ))}
      <p className="note">Aktueller Monat und die nächsten drei Monate. Antippen öffnet die Woche im Wochenplan.</p>
    </>
  )
}

function WochenZeile({ montag, markiert, onOeffnen }: { montag: Date; markiert: number; onOeffnen: (m: Date) => void }) {
  const daten = useDaten()
  const ereignisse = ereignisseDerWoche(montag)
  const mitLiedern = (art: 'pr' | 'gd') =>
    ereignisse.filter((e) => e.art === art && (daten.proEreignis.get(e.id) ?? []).length > 0).length
  const gdGesamt = ereignisse.filter((e) => e.art === 'gd').length
  const pr = mitLiedern('pr'), gd = mitLiedern('gd')
  // Hinweis nur, wenn schon etwas eingetragen ist
  const stand = [pr > 0 ? 'Probe' : '', gd > 0 ? `${gd} von ${gdGesamt} Gottesdiensten` : ''].filter(Boolean).join(' · ')
  const abstand = wochenAbstand(montag, heute())
  const tage = besondereTage(montag)
  return (
    <li>
      <button className="listbtn" type="button" aria-current={abstand === markiert ? 'true' : undefined} onClick={() => onOeffnen(montag)}>
        <span className="num kw">KW {kalenderwoche(montag)}</span>
        <span className="main">
          <span className="title">
            {wochenSpanne(montag)}
            {abstand === 0 && <span className="diese-woche"> · diese Woche</span>}
          </span>
          {(tage.length > 0 || stand) && (
            <span className="meta">
              {tage.length > 0 && <span className="besondere-tage">{tage.join(', ')}</span>}
              {stand && (
                <span className="wochen-stand">
                  <Haken size={14} />
                  {stand}
                </span>
              )}
            </span>
          )}
        </span>
        <Rechts size={18} />
      </button>
    </li>
  )
}
