import { useState } from 'react'
import { Gesungen, HinweisMarke, Kopf, Zurueck } from '../bausteine'
import { gottesdienstRang, kennung, liederInGottesdiensten, normal, STATUS_TEXT, sucheLieder, useDaten, type Lied } from '../daten'
import { ereignisAusId, ereignisseDerWoche, ereignisTitel, kurzDatum, montagVon, terminKurz, type Ereignis } from '../kalender'
import { useMeldung } from '../meldung'
import { Haken, Lupe, Plus } from '../symbole'

// Lied für einen Gottesdienst eintragen oder für die Probe vormerken.
// Für Gottesdienste stehen nur erlernte Lieder zur Auswahl; die anderen erscheinen ausgegraut.
// Beim Gottesdienst stehen oben die eintragbaren Lieder, darunter die schon in einem Gottesdienst dieser Woche,
// dann in Arbeit, unten unbekannte (Daniel, 7.11. und 16.11.2026) – bei den Liedern aus der Probe und in den Suchtreffern.

export default function Suche({ evId }: { evId: string }) {
  const daten = useDaten()
  const [eingabe, setEingabe] = useState('')
  const ev = ereignisAusId(evId)
  const istProbe = ev.art === 'pr'
  const wochenEreignisse = ereignisseDerWoche(montagVon(ev.datum))
  const eingetragen = liederInGottesdiensten(daten.proEreignis, ev)
  const nachRang = (a: Lied, b: Lied) => gottesdienstRang(a, eingetragen.has(a.id)) - gottesdienstRang(b, eingetragen.has(b.id))

  // Beim Gottesdienst zuerst die Lieder der Probe derselben Woche anbieten
  const probe = !istProbe ? wochenEreignisse.find((e) => e.art === 'pr') : undefined
  const q = normal(eingabe.trim()).replace(/\s/g, '')
  const ausProbe = (probe ? daten.proEreignis.get(probe.id) ?? [] : [])
    .map((id) => daten.lieder.get(id))
    .filter((l): l is Lied => !!l)
    .filter((l) => !q || normal(l.titel).replace(/\s/g, '').includes(q) || normal(l.kuerzel + l.nummer) === q || String(l.nummer) === q)
    .sort(nachRang)

  // Treffer: bei der Probe in Such-Reihenfolge, beim Gottesdienst nach Rang (sortieren ist stabil)
  const treffer = istProbe
    ? sucheLieder(daten.liederListe, eingabe, 40)
    : sucheLieder(daten.liederListe, eingabe).sort(nachRang).slice(0, 40)

  return (
    <>
      <Zurueck text="Wochenplan" />
      <Kopf eyebrow={ereignisTitel(ev)} titel={istProbe ? 'Lied vormerken' : 'Lied eintragen'} klein />
      <div className="search">
        <Lupe />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Lied suchen, Nummer oder Titel"
          placeholder="Nummer oder Titel, z. B. 74 oder R 13"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          autoFocus
        />
      </div>
      {!istProbe && <p className="note">Eintragen lassen sich nur erlernte Lieder.</p>}
      <div className="section">
        {probe && ausProbe.length > 0 && (
          <>
            <h3>Aus der Probe vom {kurzDatum(probe.datum)}</h3>
            <div>
              {ausProbe.map((l) => (
                <Treffer key={l.id} ev={ev} lied={l} />
              ))}
            </div>
          </>
        )}
        {eingabe.trim() ? (
          <>
            <h3>{treffer.length ? 'Treffer' : 'Keine Treffer'}</h3>
            <div>
              {treffer.map((l) => (
                <Treffer key={l.id} ev={ev} lied={l} />
              ))}
            </div>
          </>
        ) : (
          !(probe && ausProbe.length) && <p className="empty">Nummer oder Titel eingeben.</p>
        )}
      </div>
    </>
  )
}

function Treffer({ ev, lied }: { ev: Ereignis; lied: Lied }) {
  const daten = useDaten()
  const zeige = useMeldung()
  const istProbe = ev.art === 'pr'
  const drin = (daten.proEreignis.get(ev.id) ?? []).includes(lied.id)
  // Ein Lied steht in einer Woche höchstens in einem Gottesdienst (Daniel, 16.11.2026)
  const belegt = drin ? undefined : daten.schonInDerWoche(ev, lied.id)
  const ausgegraut = (!istProbe && lied.status !== 'erlernt') || !!belegt
  const hinweise = daten.offeneHinweise.get(lied.id) ?? 0
  const gesungenBekannt = daten.statistik.anzahlJahr.has(lied.id) || daten.statistik.zuletzt.has(lied.id)

  async function hinzufuegen() {
    if (await daten.eintragen(ev, lied.id)) zeige(`${kennung(lied)} ${istProbe ? 'vorgemerkt' : 'eingetragen'}`)
  }

  return (
    <div className={'row' + (ausgegraut ? ' dim' : '')}>
      <span className="num">{kennung(lied)}</span>
      <div className="main">
        <span className="title">{lied.titel}</span>
        <span className="meta">
          {belegt ? (
            `schon ${terminKurz(belegt)} eingetragen`
          ) : ausgegraut ? (
            'noch nicht erlernt'
          ) : istProbe ? (
            <>
              {STATUS_TEXT[lied.status] ?? lied.status}
              {gesungenBekannt && (
                <>
                  {' · '}
                  <Gesungen liedId={lied.id} />
                </>
              )}
            </>
          ) : (
            <Gesungen liedId={lied.id} />
          )}
          {!ausgegraut && istProbe && <HinweisMarke n={hinweise} />}
        </span>
      </div>
      {ausgegraut ? null : drin ? (
        <span className="addbtn done" aria-label="schon eingetragen">
          <Haken />
        </span>
      ) : (
        <button
          className="addbtn"
          type="button"
          aria-label={`${kennung(lied)} ${istProbe ? 'vormerken' : 'eintragen'}`}
          onClick={hinzufuegen}
        >
          <Plus size={18} />
        </button>
      )}
    </div>
  )
}
