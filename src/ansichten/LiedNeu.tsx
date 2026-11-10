import { useState, type FormEvent } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { kennung, normal, notenPruefen, STATUS_TEXT, useDaten, type NeuesLied } from '../daten'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { NotenWahl } from './NotenWahl'
import { Runter } from '../symbole'

// „Lied hinzufügen“ im Menü: Lied außerhalb des Liederbuchs anlegen (Daniel, 10.11.2026).
// Kürzel ZD (deutsch) oder ZR (russisch) und die Nummer vergibt die Datenbank.
// Titel, Sprache, Thema und Schwierigkeit sind danach fest; nur die Noten lassen sich später ändern.

const SPRACHEN: ['D' | 'R', string][] = [
  ['D', 'Deutsch'],
  ['R', 'Russisch'],
]

export default function LiedNeu() {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const [sprache, setSprache] = useState<'D' | 'R' | null>(null)
  const [titel, setTitel] = useState('')
  const [datei, setDatei] = useState<File | null>(null)
  const [thema, setThema] = useState<number | null>(null)
  const [schwierigkeit, setSchwierigkeit] = useState<number | null>(null)
  const [status, setStatus] = useState('unbekannt')
  const [dirigent, setDirigent] = useState<number | null>(null)
  const [klavier, setKlavier] = useState<number | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const kuerzel = sprache ? `Z${sprache}` : null
  const naechste = kuerzel
    ? Math.max(0, ...daten.liederListe.filter((l) => l.kuerzel === kuerzel).map((l) => l.nummer)) + 1
    : null

  // Ähnliche Titel zeigen, damit kein Lied doppelt angelegt wird
  const t = normal(titel.trim())
  const aehnliche =
    t.length >= 4
      ? daten.liederListe
          .filter((l) => {
            const n = normal(l.titel)
            return n.includes(t) || (n.length >= 4 && t.includes(n))
          })
          .slice(0, 3)
      : []

  const fertig = !!sprache && titel.trim().length > 0 && !laeuft

  async function anlegen(e: FormEvent) {
    e.preventDefault()
    if (!sprache || !titel.trim() || laeuft) return
    setLaeuft(true)
    const neu: NeuesLied = {
      sprache,
      titel: titel.trim(),
      kategorie_id: thema,
      schwierigkeit,
      status,
      dirigent_id: dirigent,
      klavierspieler_id: klavier,
    }
    const lied = await daten.liedAnlegen(neu)
    if (!lied) {
      setLaeuft(false)
      return
    }
    let meldung = `${kennung(lied)} angelegt`
    if (datei) {
      const problem = await daten.notenSetzen(lied, datei)
      if (problem) meldung = `${kennung(lied)} angelegt – ${problem} Noten auf der Lied-Seite erneut hochladen.`
    }
    zeige(meldung)
    nav.ersetze({ v: 'lied', id: lied.id })
  }

  return (
    <>
      <Zurueck text="Menü" />
      <Kopf eyebrow="Außerhalb des Liederbuchs" titel="Lied hinzufügen" klein />

      <form className="formular" onSubmit={anlegen}>
        <div className="field">
          <span className="feldname" id="sprache-name">
            Sprache
          </span>
          <div className="typepick" role="group" aria-labelledby="sprache-name">
            {SPRACHEN.map(([k, name]) => (
              <button key={k} className="chip" type="button" aria-pressed={sprache === k} onClick={() => setSprache(k)}>
                {name}
              </button>
            ))}
          </div>
          {kuerzel && <p className="note">Wird als {kuerzel} {naechste} angelegt.</p>}
        </div>

        <div className="field">
          <label htmlFor="neu-titel">Titel</label>
          <input
            id="neu-titel"
            type="text"
            autoComplete="off"
            enterKeyHint="next"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            required
          />
          {aehnliche.length > 0 && (
            <div className="aehnlich" role="status">
              <span>Ähnlicher Titel schon vorhanden:</span>
              {aehnliche.map((l) => (
                <span key={l.id}>
                  <b>{kennung(l)}</b> {l.titel}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <span className="feldname">Noten (PDF)</span>
          <NotenWahl
            datei={datei}
            onWahl={(d) => {
              const problem = notenPruefen(d)
              if (problem) zeige(problem)
              else setDatei(d)
            }}
            onEntfernen={() => setDatei(null)}
          />
        </div>

        <div className="zweispaltig">
          <div className="field">
            <span className="feldname">Thema</span>
            <Auswahlbox
              name="Thema"
              wert={thema}
              optionen={daten.themen.map((x) => [x.id, x.name])}
              onWahl={setThema}
            />
          </div>
          <div className="field">
            <span className="feldname">Status</span>
            <Auswahlbox
              name="Status"
              wert={status}
              optionen={Object.entries(STATUS_TEXT).map(([k, v]) => [k, v])}
              onWahl={(w) => setStatus(w ?? 'unbekannt')}
              ohneLeer
            />
          </div>
          <div className="field">
            <span className="feldname">Dirigent</span>
            <Auswahlbox
              name="Dirigent"
              wert={dirigent}
              optionen={daten.dirigenten.map((p) => [p.id, p.name])}
              onWahl={setDirigent}
            />
          </div>
          <div className="field">
            <span className="feldname">Klavier</span>
            <Auswahlbox
              name="Klavier"
              wert={klavier}
              optionen={daten.klavierspieler.map((p) => [p.id, p.name])}
              onWahl={setKlavier}
            />
          </div>
        </div>

        <div className="field">
          <span className="feldname" id="schwierigkeit-name">
            Schwierigkeit
          </span>
          <div className="typepick" role="group" aria-labelledby="schwierigkeit-name">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className="chip stufe"
                type="button"
                aria-pressed={schwierigkeit === n}
                onClick={() => setSchwierigkeit(schwierigkeit === n ? null : n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <p className="note">
          Titel, Sprache, Thema und Schwierigkeit lassen sich später nicht ändern. Bei einem Fehler das Lied löschen
          und neu anlegen. Die Noten lassen sich jederzeit hochladen oder ersetzen.
        </p>

        <button className="primary" type="submit" disabled={!fertig}>
          {laeuft ? (datei ? 'Wird angelegt, Noten werden hochgeladen …' : 'Wird angelegt …') : 'Lied anlegen'}
        </button>
      </form>
    </>
  )
}

/** Auswahlfeld im Stil der Lied-Seite; leerer Wert = „nicht zugeordnet“ */
function Auswahlbox<T extends string | number>({
  name,
  wert,
  optionen,
  onWahl,
  ohneLeer,
}: {
  name: string
  wert: T | null
  optionen: [T, string][]
  onWahl: (w: T | null) => void
  ohneLeer?: boolean
}) {
  const aktuell = optionen.find(([k]) => k === wert)
  return (
    <span className={'selectbox breit' + (aktuell ? '' : ' empty-val')}>
      <span>{aktuell ? aktuell[1] : 'Zuordnen'}</span>
      <Runter />
      <select
        aria-label={name}
        value={wert === null ? '' : String(wert)}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') return onWahl(null)
          const treffer = optionen.find(([k]) => String(k) === v)
          onWahl(treffer ? treffer[0] : null)
        }}
      >
        {!ohneLeer && <option value="">nicht zugeordnet</option>}
        {optionen.map(([k, t]) => (
          <option key={String(k)} value={String(k)}>
            {t}
          </option>
        ))}
      </select>
    </span>
  )
}
