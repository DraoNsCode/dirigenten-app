import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Kreuz, PfeilHoch, PfeilRunter } from '../symbole'
import { useEinsingen, type Eintrag } from '../einsingen/daten'
import { useEinsingAuswahl } from '../einsingen/auswahl'
import { gleicheFolieWieDavor } from '../einsingen/folie'
import Export from '../einsingen/Export'

// Auswahl fürs Einsingen: oben der Export als PDF, darunter die Reihenfolge der Folien.

export default function EinsingenAuswahl() {
  const nav = useNav()
  const { stand } = useEinsingen()
  const auswahl = useEinsingAuswahl()
  const d = stand.art === 'bereit' ? stand.d : null
  const n = auswahl.ids.length
  const eintraege = auswahl.ids.map((id) => d?.eintraege.get(id))
  const gleich = gleicheFolieWieDavor(eintraege)
  const vorhanden = eintraege.filter((e): e is Eintrag => !!e)

  return (
    <>
      <Zurueck text="Einsingen" />
      <Kopf eyebrow="Probenfolien" titel="Auswahl" klein />

      {!d && <p className="note">{stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}</p>}

      {d && n === 0 && <p className="note">Noch nichts ausgewählt. In der Liste rechts neben einer Übung auf + tippen.</p>}

      {d && n > 0 && (
        <>
          <Export
            kennung={vorhanden.map((e) => e.id).join(',')}
            erzeuge={async (fortschritt) => (await import('../einsingen/folien')).einsingFolien(vorhanden, fortschritt)}
          />

          <ol className="auswahl-liste">
            {auswahl.ids.map((id, i) => {
              const u = eintraege[i]
              return (
                <li key={id} className="auswahl-punkt">
                  <span className="num">{i + 1}</span>
                  <div className="main">
                    <button type="button" className="auswahl-titel" disabled={!u} onClick={() => nav.geh(u?.art === 'gruppe' ? { v: 'einsingen-gruppe', id } : { v: 'einsingen-uebung', id })}>
                      {u?.name ?? `${id} (nicht mehr vorhanden)`}
                    </button>
                    {u && (
                      <span className="meta">
                        <span>{u.phase}</span>
                        {gleich[i] && <span>gleiche Folie wie davor</span>}
                      </span>
                    )}
                  </div>
                  <div className="auswahl-knoepfe">
                    <button type="button" className="xbtn" aria-label="Nach oben" disabled={i === 0} onClick={() => auswahl.verschieben(id, -1)}>
                      <PfeilHoch />
                    </button>
                    <button type="button" className="xbtn" aria-label="Nach unten" disabled={i === n - 1} onClick={() => auswahl.verschieben(id, 1)}>
                      <PfeilRunter />
                    </button>
                    <button type="button" className="xbtn" aria-label="Aus der Auswahl nehmen" onClick={() => auswahl.entfernen(id)}>
                      <Kreuz />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>

          <button className="textbtn gefahr" type="button" onClick={auswahl.leeren}>
            Auswahl leeren
          </button>
        </>
      )}
    </>
  )
}
