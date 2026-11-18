import { useRef, type RefObject } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Kreuz } from '../symbole'
import Export from '../einsingen/Export'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitName, folienFolge, folieVon, gleicheFolieWieDavor, wahlAus } from '../themen/folie'
import { probeZeile } from '../einsingen/folie'
import { zurueckText } from '../themen/Teile'
import { useZiehen, vorschau, type Geist as GeistDaten, type Zug } from './ziehen'

// Auswahl für die Probenfolien (Reiter „Folien“): oben der Export als PDF, darunter die Reihenfolge der Folien.
// Breit steht sie rechts, solange keine andere Ansicht offen ist (fest: ohne Zurück/Schließen).
// Jeder Punkt ist eine Grundübung oder Stufe einer Familie. Die Reihenfolge ändert man per Ziehen
// wie im Wochenplan (Finger: lange drücken; Maus: ziehen) – Daniel, 16.11.2026.

const LISTE = 'auswahl'
const fingerGeraet = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function ProbeAuswahl({ fest }: { fest?: boolean }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const auswahl = useThemenAuswahl()
  const d = stand.art === 'bereit' ? stand.d : null
  const n = auswahl.schluessel.length

  const flaeche = useRef<HTMLDivElement>(null)
  const { zug, geist, geistRef, griff } = useZiehen<string>(flaeche, (z: Zug<string>) => {
    const neu = vorschau(z, LISTE, auswahl.schluessel)
    if (neu.some((s, i) => s !== auswahl.schluessel[i])) auswahl.ordnen(neu)
  })

  const punkt = (s: string) => {
    const w = wahlAus(s)
    const f = d?.familie.get(w.familie)
    return { s, w, f, folie: f ? folieVon(f, w.einheit) : undefined }
  }
  // Angezeigt wird während des Ziehens schon die neue Reihenfolge; exportiert wird die gespeicherte
  const punkte = vorschau(zug, LISTE, auswahl.schluessel).map(punkt)
  const gleich = gleicheFolieWieDavor(punkte.map((p) => p.folie))
  const folien = folienFolge(auswahl.schluessel.map(punkt).map((p) => p.folie))

  return (
    <>
      {!fest && <Zurueck text={zurueckText(nav.vorher)} />}
      <Kopf eyebrow={probeZeile()} titel="Auswahl" klein />

      {!d && <p className="note">{stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>}

      {d && n === 0 && (
        <p className="note">
          Noch nichts ausgewählt. {fest ? 'Links' : 'In der Liste'} bei einer Übung die Grundübung (G) oder eine Stufe antippen.
        </p>
      )}

      {d && n > 0 && (
        <>
          {folien.length > 0 && (
            <Export
              kennung={auswahl.schluessel.join(',')}
              erzeuge={async (fortschritt) => (await import('../einsingen/folien')).folienPdf(folien, fortschritt)}
            />
          )}

          <div ref={flaeche}>
            <ol className="auswahl-liste" data-zug-liste={LISTE} data-zug-art={LISTE}>
              {punkte.map((p, i) => (
                <li
                  key={p.s}
                  className={'auswahl-punkt' + (zug?.id === p.s ? ' platzhalter' : '')}
                  data-zug-zeile={p.s}
                  {...griff({ id: p.s, von: LISTE, art: LISTE, startIndex: auswahl.schluessel.indexOf(p.s) })}
                >
                  <span className="num">{i + 1}</span>
                  <div className="main">
                    <button type="button" className="auswahl-titel" disabled={!p.folie} onClick={() => nav.geh({ v: 'familie', id: p.w.familie, stufe: p.w.einheit })}>
                      {p.f && p.folie ? p.f.name : `${p.s} (nicht mehr vorhanden)`}
                    </button>
                    {p.f && p.folie && (
                      <span className="meta">
                        <span>{p.f.phase}</span>
                        <span>{einheitName(p.f, p.w.einheit)}</span>
                        {gleich[i] && <span>gleiche Folie wie davor</span>}
                      </span>
                    )}
                  </div>
                  <div className="auswahl-knoepfe">
                    <button type="button" className="xbtn" aria-label="Aus der Auswahl nehmen" onClick={() => auswahl.entfernen(p.s)}>
                      <Kreuz />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {n > 1 && (
            <p className="note">
              {fingerGeraet() ? 'Lange drücken, um eine Übung zu verschieben.' : 'Übungen lassen sich mit der Maus verschieben.'}
            </p>
          )}
          {geist && <Geist geist={geist} geistRef={geistRef} nummer={(zug?.index ?? 0) + 1} />}

          <button className="textbtn gefahr" type="button" onClick={auswahl.leeren}>
            Auswahl leeren
          </button>
        </>
      )}
    </>
  )
}

/** Die gezogene Übung, die unter Finger oder Maus schwebt */
function Geist({ geist, geistRef, nummer }: { geist: GeistDaten<string>; geistRef: RefObject<HTMLDivElement | null>; nummer: number }) {
  const { stand } = useInhalt()
  const w = wahlAus(geist.id)
  const f = stand.art === 'bereit' ? stand.d.familie.get(w.familie) : undefined
  return (
    <div
      ref={geistRef}
      className="zug-geist auswahl"
      aria-hidden="true"
      style={{ top: geist.top, left: geist.left - 12, width: geist.width + 24 }}
    >
      <span className="num">{nummer}</span>
      <span className="title">{f ? `${f.name} · ${einheitName(f, w.einheit)}` : geist.id}</span>
    </div>
  )
}
