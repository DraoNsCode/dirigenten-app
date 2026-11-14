import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Kreuz, PfeilHoch, PfeilRunter } from '../symbole'
import Export from '../einsingen/Export'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitName, folienFolge, folieVon, gleicheFolieWieDavor, wahlAus } from '../themen/folie'
import { zurueckText } from '../themen/Teile'

// Auswahl für die Probenfolien: oben der Export als PDF, darunter die Reihenfolge der Folien.
// Jeder Punkt ist eine Grundübung oder Stufe einer Familie.

export default function ProbeAuswahl() {
  const nav = useNav()
  const { stand } = useInhalt()
  const auswahl = useThemenAuswahl()
  const d = stand.art === 'bereit' ? stand.d : null
  const n = auswahl.schluessel.length
  const punkte = auswahl.schluessel.map((s) => {
    const w = wahlAus(s)
    const f = d?.familie.get(w.familie)
    return { s, w, f, folie: f ? folieVon(f, w.einheit) : undefined }
  })
  const gleich = gleicheFolieWieDavor(punkte.map((p) => p.folie))
  const folien = folienFolge(punkte.map((p) => p.folie))

  return (
    <>
      <Zurueck text={zurueckText(nav.vorher)} />
      <Kopf eyebrow="Probenfolien" titel="Auswahl" klein />

      {!d && <p className="note">{stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>}

      {d && n === 0 && <p className="note">Noch nichts ausgewählt. Im Reiter „Einsingen“ rechts neben einer Übung auf + tippen.</p>}

      {d && n > 0 && (
        <>
          {folien.length > 0 && (
            <Export
              kennung={auswahl.schluessel.join(',')}
              erzeuge={async (fortschritt) => (await import('../einsingen/folien')).folienPdf(folien, fortschritt)}
            />
          )}

          <ol className="auswahl-liste">
            {punkte.map((p, i) => (
              <li key={p.s} className="auswahl-punkt">
                <span className="num">{i + 1}</span>
                <div className="main">
                  <button type="button" className="auswahl-titel" disabled={!p.folie} onClick={() => nav.geh({ v: 'familie', id: p.w.familie })}>
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
                  <button type="button" className="xbtn" aria-label="Nach oben" disabled={i === 0} onClick={() => auswahl.verschieben(p.s, -1)}>
                    <PfeilHoch />
                  </button>
                  <button type="button" className="xbtn" aria-label="Nach unten" disabled={i === n - 1} onClick={() => auswahl.verschieben(p.s, 1)}>
                    <PfeilRunter />
                  </button>
                  <button type="button" className="xbtn" aria-label="Aus der Auswahl nehmen" onClick={() => auswahl.entfernen(p.s)}>
                    <Kreuz />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <button className="textbtn gefahr" type="button" onClick={auswahl.leeren}>
            Auswahl leeren
          </button>
        </>
      )}
    </>
  )
}
