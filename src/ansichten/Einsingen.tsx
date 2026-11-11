import { useLayoutEffect, useRef, useState } from 'react'
import { Fehlerkarte, Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { Runter } from '../symbole'
import { uebungenVon, useEinsingen, type Eintrag, type Phase } from '../einsingen/daten'
import { useEinsingAuswahl } from '../einsingen/auswahl'
import { EinsingLeiste, WahlKnopf } from '../einsingen/Teile'

// Reiter „Einsingen“: die Übungen nach Phasen, jede Phase auf- und zuklappbar.
// Unter dem Namen steht das Ziel (bei einer Gruppe die Namen ihrer Übungen), auf eine Zeile gekürzt;
// rechts der Knopf zum Auswählen. Keine Suche, keine Filter.

/** Welche Phasen zugeklappt sind, merkt sich das Gerät */
const ZU_SCHLUESSEL = 'dirigenten-einsingen-zu'

function gemerktZu(): Set<string> {
  try {
    const d = JSON.parse(localStorage.getItem(ZU_SCHLUESSEL) ?? '[]')
    return new Set(Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function merkeZu(zu: Set<string>) {
  try {
    localStorage.setItem(ZU_SCHLUESSEL, JSON.stringify([...zu]))
  } catch {
    // ohne Merken weiter
  }
}

// Scrollposition merken, wenn eine Übung geöffnet wird, und beim Zurückkommen wiederherstellen
let gemerkteScrollposition: number | null = null

export default function Einsingen() {
  const nav = useNav()
  const { stand, neuLaden } = useEinsingen()
  const wurzel = useRef<HTMLDivElement>(null)
  const [zu, setZu] = useState<Set<string>>(gemerktZu)
  const d = stand.art === 'bereit' ? stand.d : null

  useLayoutEffect(() => {
    if (stand.art !== 'bereit' || gemerkteScrollposition === null) return
    const view = wurzel.current?.closest('.view')
    if (view) view.scrollTop = gemerkteScrollposition
    gemerkteScrollposition = null
  }, [stand.art])

  function umklappen(phase: string) {
    const neu = new Set(zu)
    if (neu.has(phase)) neu.delete(phase)
    else neu.add(phase)
    setZu(neu)
    merkeZu(neu)
  }

  function oeffne(e: Eintrag) {
    if (nav.layout !== 'breit') gemerkteScrollposition = wurzel.current?.closest('.view')?.scrollTop ?? null
    nav.geh(e.art === 'gruppe' ? { v: 'einsingen-gruppe', id: e.id } : { v: 'einsingen-uebung', id: e.id })
  }

  const gewaehlt = nav.detail?.v === 'einsingen-uebung' || nav.detail?.v === 'einsingen-gruppe' ? nav.detail.id : ''

  return (
    <div ref={wurzel} className="stapel">
      <Kopf eyebrow="Übungen für die Probe" titel="Einsingen" />

      {(stand.art === 'leer' || stand.art === 'laedt') && <p className="note">Lädt …</p>}
      {stand.art === 'fehler' &&
        (stand.fehlt ? (
          <section className="card">
            <h2>Noch keine Übungen</h2>
            <p>Die Übungen fürs Einsingen sind noch nicht hochgeladen.</p>
            <button className="textbtn" type="button" onClick={neuLaden}>
              Noch einmal versuchen
            </button>
          </section>
        ) : (
          <Fehlerkarte text={stand.text} nochmal={neuLaden} />
        ))}

      {d?.phasen.map((p) => (
        <PhaseAbschnitt key={p.name} p={p} offen={!zu.has(p.name)} onUmklappen={() => umklappen(p.name)} gewaehlt={gewaehlt} onOeffne={oeffne} />
      ))}
      <EinsingLeiste />
    </div>
  )
}

function PhaseAbschnitt({
  p,
  offen,
  onUmklappen,
  gewaehlt,
  onOeffne,
}: {
  p: Phase
  offen: boolean
  onUmklappen: () => void
  gewaehlt: string
  onOeffne: (e: Eintrag) => void
}) {
  // Gezählt werden Übungen; eine ausgewählte Gruppe zählt mit allen ihren Übungen
  const n = p.eintraege.reduce((s, e) => s + uebungenVon(e).length, 0)
  const auswahl = useEinsingAuswahl()
  const gewaehltN = p.eintraege.filter((e) => auswahl.enthaelt(e.id)).reduce((s, e) => s + uebungenVon(e).length, 0)
  return (
    <section className="section ein-phase">
      <button type="button" className="ein-phasenkopf" aria-expanded={offen} onClick={onUmklappen}>
        <span className="ein-phasenname">{p.name}</span>
        <span className="ein-phasenzahl">
          {n === 1 ? '1 Übung' : `${n} Übungen`}
          {!offen && gewaehltN > 0 && ` · ${gewaehltN} ausgewählt`}
        </span>
        <Runter size={16} />
      </button>
      {offen && (
        <ul className="list">
          {p.eintraege.map((e) => (
            <li key={e.id} className="ein-zeile">
              <button className="listbtn" type="button" aria-current={gewaehlt === e.id ? 'true' : undefined} onClick={() => onOeffne(e)}>
                <span className="main">
                  <span className="title">{e.name}</span>
                  <span className="meta ein-ziel">{e.art === 'gruppe' ? e.teile.map((u) => u.name).join(' · ') : e.u.ziel}</span>
                </span>
              </button>
              <WahlKnopf id={e.id} name={e.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
