import { useRef } from 'react'
import { Fehlerkarte, HinweisMarke, Kopf } from '../bausteine'
import { kennung, useDaten } from '../daten'
import { ereignisseDerWoche, ereignisTitel, heute, montagVon, plusTage, wochenTitel, type Ereignis } from '../kalender'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Kreuz, Links, Plus, Rechts, Uebernehmen } from '../symbole'

// Startseite „Als Nächstes“: alle Termine einer Woche in Datumsreihenfolge.

export default function Woche() {
  const nav = useNav()
  const daten = useDaten()
  const montag = plusTage(montagVon(heute()), nav.woche * 7)
  const ereignisse = ereignisseDerWoche(montag)
  const probe = ereignisse.find((e) => e.art === 'pr')
  const probenLieder = probe ? daten.proEreignis.get(probe.id) ?? [] : []

  // Wischen wechselt die Woche
  const start = useRef<{ x: number; y: number } | null>(null)
  const beiStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }
  const beiEnde = (e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x, dy = t.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) nav.setWoche(nav.woche + (dx < 0 ? 1 : -1))
  }

  const wochenwahl = (
    <div className="weekrow">
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
    <div className="wischflaeche" onTouchStart={beiStart} onTouchEnd={beiEnde}>
      <Kopf eyebrow={wochenTitel(montag)} titel="Als Nächstes" rechts={wochenwahl} />
      {daten.stand.art === 'laedt' && <p className="note">Lädt …</p>}
      {daten.stand.art === 'fehler' && <Fehlerkarte text={daten.stand.text} nochmal={daten.neuLaden} />}
      {daten.stand.art === 'bereit' &&
        ereignisse.map((ev) => <Termin key={ev.id} ev={ev} probenLieder={probenLieder} />)}
      <p className="note">Wischen wechselt die Woche.</p>
    </div>
  )
}

function Termin({ ev, probenLieder }: { ev: Ereignis; probenLieder: number[] }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const liste = daten.proEreignis.get(ev.id) ?? []
  const istProbe = ev.art === 'pr'

  async function entfernen(liedId: number) {
    const l = daten.lieder.get(liedId)
    if (await daten.entfernen(ev, liedId)) zeige(`${l ? kennung(l) : 'Lied'} entfernt`)
  }

  return (
    <section className="card ereignis" aria-label={ereignisTitel(ev)}>
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
        return (
          <div className="row" key={id}>
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
