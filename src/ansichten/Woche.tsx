import { useRef, type RefObject } from 'react'
import { Fehlerkarte, HinweisMarke, Kopf } from '../bausteine'
import { kennung, useDaten } from '../daten'
import { ereignisseDerWoche, ereignisTitel, heute, montagVon, plusTage, terminKurz, wochenTitel, type Ereignis } from '../kalender'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Kreuz, Links, Plus, Rechts, Uebernehmen, Wochen } from '../symbole'
import { useZiehen, vorschau, type Geist as GeistDaten, type Griff, type Zug } from './ziehen'

// Startseite „Wochenplan“: alle Termine einer Woche in Datumsreihenfolge.
// Lieder lassen sich per Ziehen umsortieren und zwischen Gottesdiensten verschieben (siehe ziehen.tsx).

const fingerGeraet = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function Woche() {
  const nav = useNav()
  const daten = useDaten()
  const montag = plusTage(montagVon(heute()), nav.woche * 7)
  const ereignisse = ereignisseDerWoche(montag)
  const probe = ereignisse.find((e) => e.art === 'pr')
  const probenLieder = probe ? daten.proEreignis.get(probe.id) ?? [] : []
  const zeige = useMeldung()

  const flaeche = useRef<HTMLDivElement>(null)
  const { zug, geist, geistRef, griff, ziehtGerade } = useZiehen<number>(flaeche, absetzen)

  async function absetzen(z: Zug<number>) {
    const von = ereignisse.find((e) => e.id === z.von)
    const nach = ereignisse.find((e) => e.id === z.ziel)
    if (!von || !nach) return
    const alt = daten.proEreignis.get(nach.id) ?? []
    const neu = vorschau(z, nach.id, alt)
    if (von.id === nach.id && neu.every((id, i) => id === alt[i])) return
    const ok = await daten.ablegen(z.id, von, nach, neu)
    const l = daten.lieder.get(z.id)
    if (ok && von.id !== nach.id) zeige(`${l ? kennung(l) : 'Lied'} nach ${terminKurz(nach)} verschoben`)
  }

  // Wischen wechselt die Woche
  const start = useRef<{ x: number; y: number } | null>(null)
  const beiStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }
  const beiEnde = (e: React.TouchEvent) => {
    if (!start.current) return
    if (ziehtGerade()) {
      start.current = null
      return
    }
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x, dy = t.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) nav.setWoche(nav.woche + (dx < 0 ? 1 : -1))
  }

  const wochenwahl = (
    <div className="weekrow">
      <button
        className="iconbtn"
        type="button"
        aria-label="Wochenübersicht"
        title="Wochenübersicht"
        aria-pressed={nav.detail?.v === 'wochen' ? true : undefined}
        onClick={() => (nav.detail?.v === 'wochen' ? nav.zurueck() : nav.geh({ v: 'wochen' }))}
      >
        <Wochen size={21} />
      </button>
      <button className="iconbtn" type="button" aria-label="Vorherige Woche" onClick={() => nav.setWoche(nav.woche - 1)}>
        <Links />
      </button>
      <button className="pill-btn" type="button" aria-pressed={nav.woche === 0} onClick={() => nav.setWoche(0)}>
        Heute
      </button>
      <button className="iconbtn" type="button" aria-label="Nächste Woche" onClick={() => nav.setWoche(nav.woche + 1)}>
        <Rechts />
      </button>
    </div>
  )

  return (
    <div className="wischflaeche" ref={flaeche} onTouchStart={beiStart} onTouchEnd={beiEnde}>
      <Kopf eyebrow={wochenTitel(montag)} titel="Wochenplan" rechts={wochenwahl} />
      {daten.stand.art === 'laedt' && <p className="note">Lädt …</p>}
      {daten.stand.art === 'fehler' && <Fehlerkarte text={daten.stand.text} nochmal={daten.neuLaden} />}
      {daten.stand.art === 'bereit' &&
        ereignisse.map((ev) => (
          <Termin key={ev.id} ev={ev} probenLieder={probenLieder} zug={zug} griff={griff} />
        ))}
      <p className="note">
        {fingerGeraet()
          ? 'Wischen wechselt die Woche. Lange drücken, um ein Lied zu verschieben.'
          : 'Lieder lassen sich mit der Maus verschieben.'}
      </p>
      {geist && <Geist geist={geist} geistRef={geistRef} />}
    </div>
  )
}

/** Die gezogene Zeile, die unter Finger oder Maus schwebt */
function Geist({ geist, geistRef }: { geist: GeistDaten<number>; geistRef: RefObject<HTMLDivElement | null> }) {
  const daten = useDaten()
  const l = daten.lieder.get(geist.id)
  if (!l) return null
  return (
    <div
      ref={geistRef}
      className="zug-geist"
      aria-hidden="true"
      style={{ top: geist.top, left: geist.left - 12, width: geist.width + 24 }}
    >
      <span className="num">{kennung(l)}</span>
      <span className="title">{l.titel}</span>
    </div>
  )
}

function Termin({ ev, probenLieder, zug, griff }: { ev: Ereignis; probenLieder: number[]; zug: Zug<number> | null; griff: Griff<number> }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const gespeichert = daten.proEreignis.get(ev.id) ?? []
  const liste = vorschau(zug, ev.id, gespeichert)
  const istProbe = ev.art === 'pr'
  // Während des Ziehens: passt dieser Termin als Ziel? (gleiche Art; ein Lied je Woche nur in einem Gottesdienst)
  const gesperrt = !!zug && (zug.art !== ev.art || (zug.von !== ev.id && gespeichert.includes(zug.id)))
  const istZiel = !!zug && zug.ziel === ev.id
  // Breiter Modus: der Termin, dessen „Lied eintragen“ rechts offen ist, wird hervorgehoben
  const aktiv = nav.detail && 'ev' in nav.detail && nav.detail.ev === ev.id
  const offenesLied = nav.detail?.v === 'lied' ? nav.detail.id : undefined

  async function entfernen(liedId: number) {
    const l = daten.lieder.get(liedId)
    if (await daten.entfernen(ev, liedId)) zeige(`${l ? kennung(l) : 'Lied'} entfernt`)
  }

  return (
    <section
      className={'card ereignis' + (aktiv ? ' aktiv' : '') + (istZiel ? ' ziel' : '') + (gesperrt ? ' gesperrt' : '')}
      aria-label={ereignisTitel(ev)}
      data-zug-liste={ev.id}
      data-zug-art={ev.art}
      data-zug-gesperrt={gesperrt ? 'ja' : undefined}
    >
      <div className="cardhead">
        <h2>{ereignisTitel(ev)}</h2>
        {liste.length > 0 && <span className="count">{liste.length === 1 ? '1 Lied' : `${liste.length} Lieder`}</span>}
      </div>
      {liste.length === 0 && (
        <p className="empty">{istProbe ? 'Noch keine Lieder vorgemerkt.' : 'Noch keine Lieder eingetragen.'}</p>
      )}
      {liste.map((id) => {
        const l = daten.lieder.get(id)
        if (!l) return null
        // Das gezogene Lied kann auch in einem anderen Termin stehen (z. B. Probe und Gottesdienst)
        const platzhalter = zug?.id === id && zug.ziel === ev.id
        return (
          <div
            className={'row' + (id === offenesLied ? ' gewaehlt' : '') + (platzhalter ? ' platzhalter' : '')}
            key={id}
            data-zug-zeile={id}
            {...griff({ id, von: ev.id, art: ev.art, startIndex: gespeichert.indexOf(id) })}
          >
            <span className="num">{kennung(l)}</span>
            <button className="main" type="button" onClick={() => nav.geh({ v: 'lied', id })}>
              <span className="title">{l.titel}</span>
              {(daten.offeneHinweise.get(id) ?? 0) > 0 && (
                <span className="meta">
                  <HinweisMarke n={daten.offeneHinweise.get(id) ?? 0} />
                </span>
              )}
            </button>
            <button className="xbtn" type="button" aria-label={`${kennung(l)} entfernen`} onClick={() => entfernen(id)}>
              <Kreuz />
            </button>
          </div>
        )
      })}
      <div className="actions">
        <button className="textbtn" type="button" onClick={() => nav.geh({ v: 'suche', ev: ev.id })}>
          <Plus size={18} />
          {istProbe ? 'Lied vormerken' : 'Lied eintragen'}
        </button>
        {!istProbe && probenLieder.length > 0 && (
          <button className="textbtn light" type="button" onClick={() => nav.geh({ v: 'uebernehmen', ev: ev.id })}>
            <Uebernehmen />
            Aus der Probe übernehmen
          </button>
        )}
      </div>
    </section>
  )
}
