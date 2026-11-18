import { useRef, type RefObject } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { kennung, useDaten } from '../daten'
import { useNav } from '../navigation'
import { supabase } from '../supabase'
import { Kreuz } from '../symbole'
import Export from '../einsingen/Export'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { useLiederAuswahl } from '../lieder/auswahl'
import { einheitName, folienFolge, folieVon, gleicheFolieWieDavor, wahlAus } from '../themen/folie'
import { probeZeile } from '../einsingen/folie'
import { zurueckText } from '../themen/Teile'
import { useZiehen, vorschau, type Geist as GeistDaten, type Zug } from './ziehen'

// Auswahl für die Probenfolien (Reiter „Folien“): oben der Export als PDF, darunter die Reihenfolge der Folien in zwei
// Blöcken – zuerst die Übungen, dann die Lieder (Daniel, 18.11.2026). Breit steht sie rechts, solange keine andere
// Ansicht offen ist (fest: ohne Zurück/Schließen).
// Jeder Punkt ist eine Grundübung oder Stufe einer Familie bzw. ein Lied. Die Reihenfolge ändert man per Ziehen
// wie im Wochenplan (Finger: lange drücken; Maus: ziehen) – Daniel, 16.11.2026; je Block für sich.
// Bei Liedern: wie viele Systeme höchstens auf eine Folie kommen, 2 oder 3 zum Ausprobieren (Daniel, 18.11.2026).

const LISTE = 'auswahl'
const LIEDER = 'lieder'
const fingerGeraet = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function ProbeAuswahl({ fest }: { fest?: boolean }) {
  const nav = useNav()
  const { stand } = useInhalt()
  const daten = useDaten()
  const auswahl = useThemenAuswahl()
  const lieder = useLiederAuswahl()
  const d = stand.art === 'bereit' ? stand.d : null
  const nU = auswahl.schluessel.length
  const nL = lieder.ids.length

  const flaeche = useRef<HTMLDivElement>(null)
  const { zug, geist, geistRef, griff } = useZiehen<string>(flaeche, (z: Zug<string>) => {
    const neu = vorschau(z, LISTE, auswahl.schluessel)
    if (neu.some((s, i) => s !== auswahl.schluessel[i])) auswahl.ordnen(neu)
  })
  const liedFlaeche = useRef<HTMLDivElement>(null)
  const liedZiehen = useZiehen<number>(liedFlaeche, (z: Zug<number>) => {
    const neu = vorschau(z, LIEDER, lieder.ids)
    if (neu.some((s, i) => s !== lieder.ids[i])) lieder.ordnen(neu)
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
  const liedListe = vorschau(liedZiehen.zug, LIEDER, lieder.ids)
  const gewaehlteLieder = lieder.ids.map((id) => daten.lieder.get(id)).filter((l) => !!l?.noten_pfad)

  const bereit = !!d || nU === 0
  const leer = nU === 0 && nL === 0

  async function erzeuge(fortschritt: (n: number, m: number) => void) {
    // Noten der Lieder laden (privater Speicher „noten“)
    const quellen = []
    for (const l of gewaehlteLieder) {
      if (!l?.noten_pfad) continue
      const { data, error } = await supabase.storage.from('noten').download(l.noten_pfad)
      if (error || !data) throw new Error(`Noten von ${kennung(l)} nicht geladen${error ? ` (${error.message})` : ''}`)
      quellen.push({ kennung: kennung(l), titel: l.titel, daten: new Uint8Array(await data.arrayBuffer()) })
    }
    const { folienPdf } = await import('../einsingen/folien')
    return folienPdf(folien, fortschritt, undefined, undefined, quellen.length ? { quellen, proFolie: lieder.proFolie } : undefined)
  }

  return (
    <>
      {!fest && <Zurueck text={zurueckText(nav.vorher)} />}
      <Kopf eyebrow={probeZeile()} titel="Auswahl" klein />

      {!bereit && <p className="note">{stand.art === 'fehler' ? 'Die Themen konnten nicht geladen werden.' : 'Lädt …'}</p>}

      {bereit && leer && (
        <p className="note">
          Noch nichts ausgewählt. {fest ? 'Links' : 'In der Liste'} bei einer Übung die Grundübung (G) oder eine Stufe antippen, unter „Lieder“ ein
          Lied mit + auswählen.
        </p>
      )}

      {bereit && !leer && (
        <>
          {(folien.length > 0 || gewaehlteLieder.length > 0) && (
            <Export
              kennung={[...auswahl.schluessel, ...lieder.ids.map((id) => `lied:${id}`), `je:${lieder.proFolie}`].join(',')}
              erzeuge={erzeuge}
            />
          )}

          {nU > 0 && (
            <section className="section">
              {nL > 0 && <h3>Übungen</h3>}
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
              {geist && <GeistUebung geist={geist} geistRef={geistRef} nummer={(zug?.index ?? 0) + 1} />}
            </section>
          )}

          {nL > 0 && (
            <section className="section">
              <h3>Lieder</h3>
              <div ref={liedFlaeche}>
                <ol className="auswahl-liste" data-zug-liste={LIEDER} data-zug-art={LIEDER}>
                  {liedListe.map((id, i) => {
                    const l = daten.lieder.get(id)
                    return (
                      <li
                        key={id}
                        className={'auswahl-punkt' + (liedZiehen.zug?.id === id ? ' platzhalter' : '')}
                        data-zug-zeile={id}
                        {...liedZiehen.griff({ id, von: LIEDER, art: LIEDER, startIndex: lieder.ids.indexOf(id) })}
                      >
                        <span className="num">{i + 1}</span>
                        <div className="main">
                          <button type="button" className="auswahl-titel" disabled={!l} onClick={() => nav.geh({ v: 'lied', id })}>
                            {l ? l.titel : `Lied ${id} (nicht mehr vorhanden)`}
                          </button>
                          {l && (
                            <span className="meta">
                              <span>{kennung(l)}</span>
                              {!l.noten_pfad && <span>keine Noten hinterlegt</span>}
                            </span>
                          )}
                        </div>
                        <div className="auswahl-knoepfe">
                          <button type="button" className="xbtn" aria-label="Aus der Auswahl nehmen" onClick={() => lieder.entfernen(id)}>
                            <Kreuz />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
              {liedZiehen.geist && (
                <GeistLied geist={liedZiehen.geist} geistRef={liedZiehen.geistRef} nummer={(liedZiehen.zug?.index ?? 0) + 1} />
              )}
              <div className="fo-systeme">
                <span className="fo-systeme-text">Noten je Folie</span>
                <div className="filterreihe" role="group" aria-label="Systeme je Folie">
                  {([2, 3] as const).map((n) => (
                    <button key={n} type="button" className="chip" aria-pressed={lieder.proFolie === n} onClick={() => lieder.setProFolie(n)}>
                      {n} Systeme
                    </button>
                  ))}
                </div>
                <p className="note">Zum Ausprobieren am Beamer. Dreizeilige Systeme brauchen mehr Platz.</p>
              </div>
            </section>
          )}

          {nU + nL > 1 && (
            <p className="note">
              {fingerGeraet() ? 'Lange drücken, um einen Eintrag zu verschieben.' : 'Einträge lassen sich mit der Maus verschieben.'}
            </p>
          )}

          <button
            className="textbtn gefahr"
            type="button"
            onClick={() => {
              auswahl.leeren()
              lieder.leeren()
            }}
          >
            Auswahl leeren
          </button>
        </>
      )}
    </>
  )
}

/** Die gezogene Übung, die unter Finger oder Maus schwebt */
function GeistUebung({ geist, geistRef, nummer }: { geist: GeistDaten<string>; geistRef: RefObject<HTMLDivElement | null>; nummer: number }) {
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

/** Das gezogene Lied */
function GeistLied({ geist, geistRef, nummer }: { geist: GeistDaten<number>; geistRef: RefObject<HTMLDivElement | null>; nummer: number }) {
  const daten = useDaten()
  const l = daten.lieder.get(geist.id)
  return (
    <div
      ref={geistRef}
      className="zug-geist auswahl"
      aria-hidden="true"
      style={{ top: geist.top, left: geist.left - 12, width: geist.width + 24 }}
    >
      <span className="num">{nummer}</span>
      <span className="title">{l ? `${kennung(l)} · ${l.titel}` : String(geist.id)}</span>
    </div>
  )
}
