import { useEffect, useState } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Kreuz, PfeilHoch, PfeilRunter, Uebernehmen } from '../symbole'
import { useEinsingen, type Eintrag } from '../einsingen/daten'
import { useEinsingAuswahl } from '../einsingen/auswahl'
import { folienDateiname, gleicheFolieWieDavor } from '../einsingen/folie'

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
          <Export eintraege={vorhanden} />

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

type ExportStand =
  | { art: 'bereit' }
  | { art: 'laeuft'; n: number; m: number }
  | { art: 'fertig'; url: string; datei: File }
  | { art: 'fehler'; text: string }

/** PDF erzeugen; danach öffnen, teilen (Handy) oder herunterladen. Teilen braucht ein eigenes Antippen. */
function Export({ eintraege }: { eintraege: Eintrag[] }) {
  const [stand, setStand] = useState<ExportStand>({ art: 'bereit' })
  const url = stand.art === 'fertig' ? stand.url : null
  const kennung = eintraege.map((e) => e.id).join(',')

  // Ändert sich die Auswahl, gilt das fertige PDF nicht mehr
  useEffect(() => setStand((st) => (st.art === 'fertig' ? { art: 'bereit' } : st)), [kennung])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  async function erzeugen() {
    setStand({ art: 'laeuft', n: 0, m: 0 })
    try {
      const { einsingFolien } = await import('../einsingen/folien')
      const blob = await einsingFolien(eintraege, (n, m) => setStand({ art: 'laeuft', n, m }))
      const datei = new File([blob], folienDateiname(), { type: 'application/pdf' })
      setStand({ art: 'fertig', url: URL.createObjectURL(blob), datei })
    } catch (err) {
      setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const teilenMoeglich =
    stand.art === 'fertig' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [stand.datei] })
  // Handy: Teilen ist der zuverlässige Weg. In einer App auf dem Home-Bildschirm (iPhone) öffnen
  // Links auf die erzeugte Datei oft nichts; dort gibt es nur Teilen/Sichern.
  const handy = window.matchMedia('(pointer: coarse)').matches
  const homeBildschirm =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const nurTeilen = teilenMoeglich && handy && homeBildschirm

  function teilen() {
    if (stand.art !== 'fertig') return
    navigator.share({ files: [stand.datei], title: stand.datei.name }).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError') setStand({ art: 'fehler', text: `Teilen nicht möglich (${err.message})` })
    })
  }

  return (
    <section className="card export">
      <h2>Probenfolien</h2>
      {stand.art === 'bereit' && (
        <button className="primary" type="button" onClick={erzeugen}>
          <Uebernehmen />
          Als PDF exportieren
        </button>
      )}
      {stand.art === 'laeuft' && (
        <p className="note" aria-live="polite">
          {stand.m ? `Erstelle Folie ${stand.n} von ${stand.m} …` : 'Bereite vor …'}
        </p>
      )}
      {stand.art === 'fertig' && (
        <>
          <p className="note">{stand.datei.name} ist fertig.</p>
          {teilenMoeglich && handy && (
            <button className="primary" type="button" onClick={teilen}>
              <Uebernehmen />
              PDF teilen oder sichern
            </button>
          )}
          <div className="btnrow">
            {!nurTeilen && (
              <a className="ghost export-knopf" href={stand.url} target="_blank" rel="noreferrer">
                Öffnen
              </a>
            )}
            {!nurTeilen && (
              <a className="ghost export-knopf" href={stand.url} download={stand.datei.name}>
                Herunterladen
              </a>
            )}
            {teilenMoeglich && !handy && (
              <button className="ghost" type="button" onClick={teilen}>
                Teilen
              </button>
            )}
            <button className="ghost plain" type="button" onClick={erzeugen}>
              Neu erstellen
            </button>
          </div>
        </>
      )}
      {stand.art === 'fehler' && (
        <>
          <p className="fehler">Das PDF konnte nicht erstellt werden: {stand.text}</p>
          <button className="textbtn" type="button" onClick={erzeugen}>
            Noch einmal versuchen
          </button>
        </>
      )}
    </section>
  )
}
