import { useEffect, useState } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import { Kreuz, PfeilHoch, PfeilRunter } from '../symbole'
import { MAX_SCHRITT, MIN_SCHRITT, schritteText, tonartName } from '../uebungen/abc'
import { schluesselVon, useAuswahl } from '../uebungen/auswahl'
import { punktInhalt, tonartBlock } from '../uebungen/punkt'
import { useSammlung, type Sammlung } from '../uebungen/sammlung'
import { type AuswahlPunkt } from '../uebungen/auswahl'
import { Uebernehmen } from '../symbole'

// Auswahl für die Probenfolien: Reihenfolge, Tonart je Übung, entfernen, exportieren.

export default function Auswahl() {
  const nav = useNav()
  const { stand } = useSammlung()
  const auswahl = useAuswahl()
  const s = stand.art === 'bereit' ? stand.s : null
  const n = auswahl.punkte.length

  return (
    <>
      <Zurueck text="Übungen" />
      <Kopf eyebrow="Probenfolien" titel="Auswahl" klein />

      {!s && <p className="note">{stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}</p>}

      {s && n === 0 && (
        <p className="note">Noch nichts ausgewählt. Auf einer Übung oder Erklärung „Zur Auswahl“ antippen.</p>
      )}

      {s && n > 0 && (
        <>
          <ol className="auswahl-liste">
            {auswahl.punkte.map((p, i) => {
              const k = schluesselVon(p)
              const inhalt = punktInhalt(s, p)
              const block = inhalt ? tonartBlock(inhalt.noten) : undefined
              return (
                <li key={k} className="auswahl-punkt">
                  <span className="num">{i + 1}</span>
                  <div className="main">
                    <button
                      type="button"
                      className="auswahl-titel"
                      disabled={!inhalt}
                      onClick={() => nav.geh(p.art === 'uebung' ? { v: 'uebung', id: p.id } : { v: 'erklaerung', id: p.id })}
                    >
                      {inhalt?.titel ?? `${p.id} (nicht mehr in der Sammlung)`}
                    </button>
                    {inhalt?.zusatz && <span className="meta">{inhalt.zusatz}</span>}
                    {block && (
                      <div className="transponieren klein">
                        <button
                          type="button"
                          className="rund"
                          aria-label="Einen Halbton tiefer"
                          disabled={p.schritte <= MIN_SCHRITT}
                          onClick={() => auswahl.setzeSchritte(k, p.schritte - 1)}
                        >
                          −
                        </button>
                        <span className="tonart">
                          <strong>{tonartName(block.abc, p.schritte)}</strong>
                          <span>{schritteText(p.schritte)}</span>
                        </span>
                        <button
                          type="button"
                          className="rund"
                          aria-label="Einen Halbton höher"
                          disabled={p.schritte >= MAX_SCHRITT}
                          onClick={() => auswahl.setzeSchritte(k, p.schritte + 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="auswahl-knoepfe">
                    <button type="button" className="xbtn" aria-label="Nach oben" disabled={i === 0} onClick={() => auswahl.verschieben(k, -1)}>
                      <PfeilHoch />
                    </button>
                    <button
                      type="button"
                      className="xbtn"
                      aria-label="Nach unten"
                      disabled={i === n - 1}
                      onClick={() => auswahl.verschieben(k, 1)}
                    >
                      <PfeilRunter />
                    </button>
                    <button type="button" className="xbtn" aria-label="Aus der Auswahl nehmen" onClick={() => auswahl.entfernen(k)}>
                      <Kreuz />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>

          <Export s={s} punkte={auswahl.punkte} />

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

function dateiname() {
  const d = new Date()
  const z = (n: number) => String(n).padStart(2, '0')
  return `Probenfolien ${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}.pdf`
}

/** PDF erzeugen; danach öffnen, teilen (Handy) oder herunterladen. Teilen braucht ein eigenes Antippen. */
function Export({ s, punkte }: { s: Sammlung; punkte: AuswahlPunkt[] }) {
  const [stand, setStand] = useState<ExportStand>({ art: 'bereit' })
  const url = stand.art === 'fertig' ? stand.url : null

  // Ändert sich die Auswahl, gilt das fertige PDF nicht mehr
  useEffect(() => setStand((st) => (st.art === 'fertig' ? { art: 'bereit' } : st)), [punkte])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  async function erzeugen() {
    setStand({ art: 'laeuft', n: 0, m: 0 })
    try {
      const { probenfolien } = await import('../uebungen/folien')
      const blob = await probenfolien(s, punkte, (n, m) => setStand({ art: 'laeuft', n, m }))
      const datei = new File([blob], dateiname(), { type: 'application/pdf' })
      setStand({ art: 'fertig', url: URL.createObjectURL(blob), datei })
    } catch (err) {
      setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const teilenMoeglich =
    stand.art === 'fertig' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [stand.datei] })

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
          <div className="btnrow">
            <a className="ghost export-knopf" href={stand.url} target="_blank" rel="noreferrer">
              Öffnen
            </a>
            {teilenMoeglich && (
              <button
                className="ghost"
                type="button"
                onClick={() => navigator.share({ files: [stand.datei], title: stand.datei.name }).catch(() => {})}
              >
                Teilen / Sichern
              </button>
            )}
            <a className="ghost export-knopf" href={stand.url} download={stand.datei.name}>
              Herunterladen
            </a>
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
