import { useCallback, useEffect, useState } from 'react'
import { Folien, Uebernehmen } from '../symbole'
import { folienDateiname } from './folie'
import FolienAnsicht from './FolienAnsicht'

// Karte „Probenfolien“: das PDF erzeugen und öffnen, teilen oder herunterladen.
// Genutzt von der Auswahl im Reiter „Einsingen“ und von der Auswahl im neuen Aufbau (Reiter „Themen“).

type ExportStand =
  | { art: 'bereit' }
  | { art: 'laeuft'; n: number; m: number }
  | { art: 'fertig'; url: string; datei: File }
  | { art: 'fehler'; text: string }

/**
 * PDF erzeugen; danach öffnen, teilen (Handy) oder herunterladen. Teilen braucht ein eigenes Antippen.
 * `kennung` beschreibt die Auswahl: ändert sie sich, gilt das fertige PDF nicht mehr.
 */
export default function Export({ kennung, erzeuge }: { kennung: string; erzeuge: (fortschritt: (n: number, m: number) => void) => Promise<Blob> }) {
  const [stand, setStand] = useState<ExportStand>({ art: 'bereit' })
  const [ansehen, setAnsehen] = useState(false)
  const schliessen = useCallback(() => setAnsehen(false), [])
  const url = stand.art === 'fertig' ? stand.url : null

  // Ändert sich die Auswahl, gilt das fertige PDF nicht mehr
  useEffect(() => setStand((st) => (st.art === 'fertig' ? { art: 'bereit' } : st)), [kennung])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  async function erzeugen() {
    setStand({ art: 'laeuft', n: 0, m: 0 })
    try {
      const blob = await erzeuge((n, m) => setStand({ art: 'laeuft', n, m }))
      const datei = new File([blob], folienDateiname(), { type: 'application/pdf' })
      setStand({ art: 'fertig', url: URL.createObjectURL(blob), datei })
    } catch (err) {
      setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const teilenMoeglich =
    stand.art === 'fertig' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [stand.datei] })
  // Handy: „Öffnen“ zeigt die Folien in der App (FolienAnsicht), weil Web-Apps auf dem Home-Bildschirm (iPhone)
  // Links auf die erzeugte Datei oft nicht öffnen; daneben Teilen/Sichern. PC: Öffnen im Browser, Herunterladen, Teilen.
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
          {handy && (
            <button className="primary" type="button" onClick={() => setAnsehen(true)}>
              <Folien />
              Öffnen
            </button>
          )}
          {teilenMoeglich && handy && (
            <button className="primary zweit" type="button" onClick={teilen}>
              <Uebernehmen />
              PDF teilen oder sichern
            </button>
          )}
          <div className="btnrow">
            {!handy && (
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
      {stand.art === 'fertig' && ansehen && <FolienAnsicht datei={stand.datei} titel={stand.datei.name.replace(/\.pdf$/, '')} onSchliessen={schliessen} />}
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
