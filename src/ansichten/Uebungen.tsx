import { useLayoutEffect, useMemo, useRef } from 'react'
import { Fehlerkarte, Kopf } from '../bausteine'
import { normal } from '../daten'
import { UEBUNGEN_ANFANG, useNav, type UebungenEinstellung } from '../navigation'
import { Lupe, Rechts, Runter } from '../symbole'
import { STAND_TEXT, passtSuche, schwierigkeiten, schwierigkeitText, vergleich, type Eintrag } from '../uebungen/anzeige'
import { useSammlung, type Sammlung } from '../uebungen/sammlung'

// Reiter „Übungen“: alle Einträge der Übungssammlung, nach Gruppe und Bereich geordnet,
// mit Suche und Filtern (Bereich, Schwierigkeit, Stand, Art).

const SCHWIERIGKEIT: [UebungenEinstellung['schwierigkeit'], string][] = [
  ['alle', 'Alle'],
  ['1', 'Leicht'],
  ['2', 'Mittel'],
  ['3', 'Anspruchsvoll'],
]
const STAND: [UebungenEinstellung['stand'], string][] = [
  ['alle', 'Alle'],
  ['entwurf', 'Entwurf'],
  ['abgenommen', 'Abgenommen'],
  ['ueberarbeiten', 'Überarbeiten'],
]
const ART: [UebungenEinstellung['art'], string][] = [
  ['alle', 'Alle'],
  ['uebung', 'Übungen'],
  ['erklaerung', 'Erklärungen'],
]

// Scrollposition merken, wenn ein Eintrag geöffnet wird, und beim Zurückkommen wiederherstellen
let gemerkteScrollposition: number | null = null

type Abschnitt = { gruppe: string; bereich: string; nr: number; eintraege: Eintrag[] }

function abschnitte(s: Sammlung, e: UebungenEinstellung): Abschnitt[] {
  const q = normal(e.suche.trim())
  const alle: Eintrag[] = [
    ...[...s.erklaerungen.values()].map((x): Eintrag => ({ art: 'erklaerung', e: x })),
    ...[...s.uebungen.values()].map((x): Eintrag => ({ art: 'uebung', e: x })),
  ]
  const passend = alle.filter(
    (x) =>
      (e.art === 'alle' || x.art === e.art) &&
      (e.stand === 'alle' || x.e.stand === e.stand) &&
      (e.bereich === 'alle' || x.e.bereiche.includes(e.bereich)) &&
      (e.schwierigkeit === 'alle' || (x.art === 'uebung' && schwierigkeiten(x.e).includes(Number(e.schwierigkeit)))) &&
      passtSuche(x, q),
  )
  // Einordnen unter dem Hauptbereich (bzw. dem gefilterten Bereich)
  const proBereich = new Map<string, Eintrag[]>()
  for (const x of passend) {
    const b = e.bereich !== 'alle' ? e.bereich : x.e.bereiche[0]
    const liste = proBereich.get(b)
    if (liste) liste.push(x)
    else proBereich.set(b, [x])
  }
  const r: Abschnitt[] = []
  for (const g of s.gruppen) {
    for (const b of g.bereiche) {
      const liste = proBereich.get(b.id)
      if (liste?.length) r.push({ gruppe: `${g.id} · ${g.name}`, bereich: b.name, nr: b.nr, eintraege: liste.sort(vergleich) })
    }
  }
  return r
}

export default function Uebungen() {
  const nav = useNav()
  const { stand, neuLaden } = useSammlung()
  const e = nav.uebungen
  const setze = (teil: Partial<UebungenEinstellung>) => nav.setUebungen({ ...e, ...teil })
  const istAnfang = JSON.stringify(e) === JSON.stringify(UEBUNGEN_ANFANG)
  const wurzel = useRef<HTMLDivElement>(null)
  const sammlung = stand.art === 'bereit' ? stand.s : null

  const liste = useMemo(() => (sammlung ? abschnitte(sammlung, e) : []), [sammlung, e])
  const anzahl = liste.reduce((n, a) => n + a.eintraege.length, 0)
  const gesamt = sammlung ? sammlung.uebungen.size + sammlung.erklaerungen.size : 0
  const gefiltert = !istAnfang

  useLayoutEffect(() => {
    if (stand.art !== 'bereit' || gemerkteScrollposition === null) return
    const view = wurzel.current?.closest('.view')
    if (view) view.scrollTop = gemerkteScrollposition
    gemerkteScrollposition = null
  }, [stand.art])

  function oeffne(x: Eintrag) {
    if (nav.layout !== 'breit') gemerkteScrollposition = wurzel.current?.closest('.view')?.scrollTop ?? null
    nav.geh(x.art === 'uebung' ? { v: 'uebung', id: x.e.id } : { v: 'erklaerung', id: x.e.id })
  }
  const gewaehlt = nav.detail && (nav.detail.v === 'uebung' || nav.detail.v === 'erklaerung') ? `${nav.detail.v}:${nav.detail.id}` : ''

  // Bereichsauswahl nach Gruppen
  const bereichGruppen = sammlung
    ? sammlung.gruppen.map((g) => ({
        name: `${g.id} · ${g.name}`,
        optionen: g.bereiche.map((b): [string, string] => [b.id, `${b.nr} ${b.name}`]),
      }))
    : []

  return (
    <div ref={wurzel} className="stapel">
      <Kopf eyebrow="Übungssammlung" titel="Übungen" />
      <div className="search">
        <Lupe />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Übungen durchsuchen"
          placeholder="Titel, Stichwort oder Thema"
          value={e.suche}
          onChange={(ev) => setze({ suche: ev.target.value })}
        />
      </div>

      <div className="filterreihe" role="group" aria-label="Filter">
        <FilterChip name="Bereich" wert={e.bereich} gruppen={bereichGruppen} onWahl={(w) => setze({ bereich: w })} />
        <FilterChip
          name="Schwierigkeit"
          wert={e.schwierigkeit}
          optionen={SCHWIERIGKEIT}
          onWahl={(w) => setze({ schwierigkeit: w as UebungenEinstellung['schwierigkeit'] })}
        />
        <FilterChip name="Stand" wert={e.stand} optionen={STAND} onWahl={(w) => setze({ stand: w as UebungenEinstellung['stand'] })} />
        <FilterChip name="Art" wert={e.art} optionen={ART} onWahl={(w) => setze({ art: w as UebungenEinstellung['art'] })} />
      </div>

      <div className="sortrow">
        {gefiltert ? (
          <button className="textbtn light zuruecksetzen-inline" type="button" onClick={() => nav.setUebungen(UEBUNGEN_ANFANG)}>
            Auf Anfang zurücksetzen
          </button>
        ) : (
          <span />
        )}
        <span className="zaehler">{sammlung ? (gefiltert ? `${anzahl} von ${gesamt}` : `${gesamt} Einträge`) : ''}</span>
      </div>

      {(stand.art === 'leer' || stand.art === 'laedt') && <p className="note">Lädt …</p>}
      {stand.art === 'fehler' &&
        (stand.fehlt ? (
          <section className="card">
            <h2>Noch keine Übungen</h2>
            <p>Die Übungssammlung ist noch nicht hochgeladen.</p>
            <button className="textbtn" type="button" onClick={neuLaden}>
              Noch einmal versuchen
            </button>
          </section>
        ) : (
          <Fehlerkarte text={stand.text} nochmal={neuLaden} />
        ))}

      {sammlung && (
        <>
          {liste.map((a, i) => (
            <section className="section uebungs-abschnitt" key={a.nr}>
              {(i === 0 || liste[i - 1].gruppe !== a.gruppe) && <p className="gruppe-titel">{a.gruppe}</p>}
              <h3>
                {a.nr} {a.bereich}
              </h3>
              <ul className="list">
                {a.eintraege.map((x) => (
                  <EintragZeile key={`${x.art}:${x.e.id}`} x={x} onOeffne={oeffne} gewaehlt={gewaehlt === `${x.art}:${x.e.id}`} />
                ))}
              </ul>
            </section>
          ))}
          {liste.length === 0 && <p className="empty liste-leer">Keine Einträge für diese Auswahl.</p>}
        </>
      )}
    </div>
  )
}

function EintragZeile({ x, onOeffne, gewaehlt }: { x: Eintrag; onOeffne: (x: Eintrag) => void; gewaehlt: boolean }) {
  const stand = x.e.stand
  return (
    <li>
      <button className="listbtn" type="button" aria-current={gewaehlt ? 'true' : undefined} onClick={() => onOeffne(x)}>
        <span className="main">
          <span className="title">{x.e.titel}</span>
          <span className="meta">
            {x.art === 'erklaerung' ? (
              <span className="tag erklaerung">Erklärung</span>
            ) : (
              <>
                {schwierigkeitText(x.e) && <span>{schwierigkeitText(x.e)}</span>}
                {x.e.stufen?.length ? <span>{x.e.stufen.length} Stufen</span> : null}
                {x.e.stichwort && <span className="stichwort">{x.e.stichwort}</span>}
              </>
            )}
            {stand !== 'abgenommen' && <span className={`tag stand-${stand}`}>{STAND_TEXT[stand]}</span>}
          </span>
        </span>
        <Rechts size={18} />
      </button>
    </li>
  )
}

function FilterChip({
  name,
  wert,
  optionen,
  gruppen,
  onWahl,
}: {
  name: string
  wert: string
  optionen?: [string, string][]
  gruppen?: { name: string; optionen: [string, string][] }[]
  onWahl: (w: string) => void
}) {
  const aktiv = wert !== 'alle'
  const alle = [...(optionen ?? []), ...(gruppen ?? []).flatMap((g) => g.optionen)]
  const text = aktiv ? (alle.find(([k]) => k === wert)?.[1] ?? name) : name
  return (
    <label className={'chip' + (aktiv ? ' on' : '')}>
      <span className="chiptext">{text}</span>
      <Runter />
      <select aria-label={name} value={wert} onChange={(ev) => onWahl(ev.target.value)}>
        {gruppen && <option value="alle">{`${name}: alle`}</option>}
        {optionen?.map(([k, t]) => (
          <option key={k} value={k}>
            {k === 'alle' ? `${name}: alle` : t}
          </option>
        ))}
        {gruppen?.map((g) => (
          <optgroup key={g.name} label={g.name}>
            {g.optionen.map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
