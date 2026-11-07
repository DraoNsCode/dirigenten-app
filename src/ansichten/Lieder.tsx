import { useLayoutEffect, useMemo, useRef } from 'react'
import { Fehlerkarte, Gesungen, HinweisMarke, Kopf } from '../bausteine'
import { kennung, nachKennung, STATUS_RANG, STATUS_TEXT, sucheLieder, useDaten, type Lied } from '../daten'
import { LIEDER_ANFANG, useNav, type LiederEinstellung } from '../navigation'
import { Lupe, Rechts, Runter } from '../symbole'

// Reiter „Lieder“: Suche, drei Auswahlmenüs (Herkunft, Status, Thema), Sortierung.
// Festgelegt von Daniel am 7.11.2026, siehe Phasenplan.

const HERKUNFT: [LiederEinstellung['herkunft'], string][] = [
  ['alle', 'Alle'],
  ['D', 'Deutsch'],
  ['R', 'Russisch'],
  ['zettel', 'Zettel'],
]
const STATUS: [LiederEinstellung['status'], string][] = [
  ['alle', 'Alle'],
  ['erlernt', 'Erlernt'],
  ['in_arbeit', 'In Arbeit'],
  ['unbekannt', 'Unbekannt'],
]
const SORTIERUNG: [LiederEinstellung['sortierung'], string][] = [
  ['haeufigkeit', 'Häufigkeit'],
  ['laengst', 'am längsten nicht gesungen'],
  ['nummer', 'Nummer'],
  ['titel', 'Titel'],
]

// Scrollposition merken, wenn ein Lied geöffnet wird, und beim Zurückkommen wiederherstellen
let gemerkteScrollposition: number | null = null

export default function Lieder() {
  const nav = useNav()
  const daten = useDaten()
  const e = nav.lieder
  const setze = (teil: Partial<LiederEinstellung>) => nav.setLieder({ ...e, ...teil })
  const istAnfang = JSON.stringify(e) === JSON.stringify(LIEDER_ANFANG)
  const filterAktiv = e.herkunft !== 'alle' || e.status !== 'alle' || e.thema !== 'alle'
  const wurzel = useRef<HTMLDivElement>(null)

  const passt = useMemo(() => {
    return (l: Lied) =>
      (e.herkunft === 'alle' ||
        (e.herkunft === 'zettel' ? !l.im_buch : l.im_buch && l.sprache === e.herkunft)) &&
      (e.status === 'alle' || l.status === e.status) &&
      (e.thema === 'alle' || l.kategorie_id === e.thema)
  }, [e.herkunft, e.status, e.thema])

  const sortiert = useMemo(() => {
    const { anzahlJahr, zuletzt } = daten.statistik
    const rang = (l: Lied) => STATUS_RANG[l.status] ?? 9
    const vergleich: Record<LiederEinstellung['sortierung'], (a: Lied, b: Lied) => number> = {
      // häufigste oben; bei gleicher Häufigkeit erlernt, in Arbeit, unbekannt; dann Nummer
      haeufigkeit: (a, b) =>
        (anzahlJahr.get(b.id) ?? 0) - (anzahlJahr.get(a.id) ?? 0) || rang(a) - rang(b) || nachKennung(a, b),
      // erlernte zuerst; innerhalb: nie gesungen, dann am längsten her; dann Nummer
      laengst: (a, b) =>
        rang(a) - rang(b) || (zuletzt.get(a.id) ?? '').localeCompare(zuletzt.get(b.id) ?? '') || nachKennung(a, b),
      nummer: nachKennung,
      titel: (a, b) => a.titel.localeCompare(b.titel, 'de') || nachKennung(a, b),
    }
    return [...daten.liederListe].sort(vergleich[e.sortierung])
  }, [daten.liederListe, daten.statistik, e.sortierung])

  const suche = e.suche.trim()
  const treffer = suche ? sucheLieder(daten.liederListe, suche) : []
  const liste = suche ? treffer.filter(passt) : sortiert.filter(passt)
  const weitere = suche && filterAktiv ? treffer.filter((l) => !passt(l)) : []

  useLayoutEffect(() => {
    if (daten.stand.art !== 'bereit' || gemerkteScrollposition === null) return
    const view = wurzel.current?.closest('.view')
    if (view) view.scrollTop = gemerkteScrollposition
    gemerkteScrollposition = null
  }, [daten.stand.art])

  function oeffne(l: Lied) {
    gemerkteScrollposition = wurzel.current?.closest('.view')?.scrollTop ?? null
    nav.geh({ v: 'lied', id: l.id })
  }

  const gesamt = daten.liederListe.length
  const zaehler = suche
    ? `${liste.length} Treffer`
    : filterAktiv
      ? `${liste.length} von ${gesamt}`
      : `${gesamt} Lieder`

  return (
    <div ref={wurzel} className="stapel">
      <Kopf eyebrow="Repertoire" titel="Lieder" />
      <div className="search">
        <Lupe />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Lieder durchsuchen"
          placeholder="Nummer oder Titel, z. B. D 74"
          value={e.suche}
          onChange={(ev) => setze({ suche: ev.target.value })}
        />
      </div>

      <div className="filterreihe" role="group" aria-label="Filter">
        <Auswahl
          name="Herkunft"
          wert={e.herkunft}
          optionen={HERKUNFT}
          onWahl={(w) => setze({ herkunft: w as LiederEinstellung['herkunft'] })}
        />
        <Auswahl
          name="Status"
          wert={e.status}
          optionen={STATUS}
          onWahl={(w) => setze({ status: w as LiederEinstellung['status'] })}
        />
        <Auswahl
          name="Thema"
          wert={e.thema === 'alle' ? 'alle' : String(e.thema)}
          optionen={[['alle', 'Alle'], ...daten.themen.map((t): [string, string] => [String(t.id), t.name])]}
          onWahl={(w) => setze({ thema: w === 'alle' ? 'alle' : Number(w) })}
        />
      </div>

      <div className="sortrow">
        <label className="sortsel">
          {suche ? 'Treffer nach Nummer' : `Sortiert nach: ${SORTIERUNG.find(([k]) => k === e.sortierung)?.[1]}`}
          {!suche && <Runter />}
          {!suche && (
            <select
              aria-label="Sortierung"
              value={e.sortierung}
              onChange={(ev) => setze({ sortierung: ev.target.value as LiederEinstellung['sortierung'] })}
            >
              {SORTIERUNG.map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </label>
        <span className="zaehler">{daten.stand.art === 'bereit' ? zaehler : ''}</span>
      </div>
      {!istAnfang && (
        <button className="textbtn light zuruecksetzen" type="button" onClick={() => nav.setLieder(LIEDER_ANFANG)}>
          Auf Anfang zurücksetzen
        </button>
      )}

      {daten.stand.art === 'laedt' && <p className="note">Lädt …</p>}
      {daten.stand.art === 'fehler' && <Fehlerkarte text={daten.stand.text} nochmal={daten.neuLaden} />}
      {daten.stand.art === 'bereit' && (
        <>
          <ul className="list" aria-label="Liedliste">
            {liste.map((l) => (
              <LiedZeile key={l.id} lied={l} onOeffne={oeffne} />
            ))}
            {liste.length === 0 && (
              <li>
                <p className="empty liste-leer">
                  {suche
                    ? weitere.length
                      ? 'Keine Treffer mit diesen Filtern.'
                      : 'Keine Treffer.'
                    : 'Keine Lieder für diese Auswahl.'}
                </p>
              </li>
            )}
          </ul>
          {weitere.length > 0 && (
            <section className="section">
              <h3>Weitere Treffer</h3>
              <ul className="list">
                {weitere.map((l) => (
                  <LiedZeile key={l.id} lied={l} onOeffne={oeffne} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Auswahl({
  name,
  wert,
  optionen,
  onWahl,
}: {
  name: string
  wert: string
  optionen: [string, string][]
  onWahl: (w: string) => void
}) {
  const aktiv = wert !== 'alle'
  const text = aktiv ? optionen.find(([k]) => k === wert)?.[1] ?? name : name
  return (
    <label className={'chip' + (aktiv ? ' on' : '')}>
      <span className="chiptext">{text}</span>
      <Runter />
      <select aria-label={name} value={wert} onChange={(ev) => onWahl(ev.target.value)}>
        {optionen.map(([k, t]) => (
          <option key={k} value={k}>
            {k === 'alle' ? `${name}: alle` : t}
          </option>
        ))}
      </select>
    </label>
  )
}

function LiedZeile({ lied, onOeffne }: { lied: Lied; onOeffne: (l: Lied) => void }) {
  const daten = useDaten()
  const hinweise = daten.offeneHinweise.get(lied.id) ?? 0
  const jeGesungen = daten.statistik.zuletzt.has(lied.id)
  const unbekannt = lied.status === 'unbekannt'
  return (
    <li className={unbekannt ? 'dim' : undefined}>
      <button className="listbtn" type="button" onClick={() => onOeffne(lied)}>
        <span className="num">{kennung(lied)}</span>
        <span className="main">
          <span className="title">{lied.titel}</span>
          <span className="meta">
            {lied.status !== 'erlernt' && <span className="vermerk">{STATUS_TEXT[lied.status] ?? lied.status}</span>}
            {(lied.status === 'erlernt' || jeGesungen) && <Gesungen liedId={lied.id} />}
            <HinweisMarke n={hinweise} />
          </span>
        </span>
        <Rechts size={18} />
      </button>
    </li>
  )
}
