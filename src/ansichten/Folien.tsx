import { useMemo, useState } from 'react'
import { Kopf } from '../bausteine'
import { kennung, sucheLieder, useDaten, type Lied } from '../daten'
import { naechsteProbe, probeZeile } from '../einsingen/folie'
import { ereignisseAm, kurzDatum } from '../kalender'
import { useLiederAuswahl } from '../lieder/auswahl'
import { useNav } from '../navigation'
import { Haken, Lupe, Plus } from '../symbole'
import { useInhalt } from '../themen/daten'
import { useThemenAuswahl } from '../themen/auswahl'
import { einheitVon } from '../themen/folie'
import { Ladezustand, ThemenLeiste } from '../themen/Teile'
import type { Familie } from '../themen/typen'

// Reiter „Folien“ (Daniel, 18.11.2026): möglichst schnelles und übersichtliches Auswählen und Export der Probenfolien,
// in zwei Blöcken: zuerst Übungen, dann Lieder. Gelesen wird im Reiter „Übungen“.
// Aufbau (Claudes Vorschlag, noch nicht beurteilt):
// - Oben ein Umschalter „Übungen | Lieder“; jeder Block hat seine eigene Liste.
// - Übungen nach Phasen gegliedert. Je Familie eine Zeile: links der Name, rechts kleine Schalter für die
//   Grundübung (G) und die Stufen (1, 2, …) – ohne Aufklappen. Unter dem Namen steht, was ausgewählt ist.
//   Ein Tipp auf den Namen öffnet die Familienseite (dort lässt sich ebenfalls auswählen).
// - Lieder: Suche nach Nummer oder Titel; ohne Suche die für die nächste Probe vorgemerkten Lieder (Wochenplan) und die
//   schon ausgewählten. Ausgewählt wird einzeln (Daniel). Ein Tipp auf das Lied öffnet seine Seite.
// - Schmal: Leiste unten „Auswahl (n): Folien erstellen“. Breit: rechts steht immer die Auswahl mit dem Export.

type Block = 'uebungen' | 'lieder'
/** Bleibt erhalten, solange die App offen ist */
let gemerkterBlock: Block = 'uebungen'
let gemerkteSuche = ''

export default function FolienListe() {
  const auswahl = useThemenAuswahl()
  const lieder = useLiederAuswahl()
  const [block, setBlockState] = useState<Block>(gemerkterBlock)
  const setBlock = (b: Block) => {
    gemerkterBlock = b
    setBlockState(b)
  }

  return (
    <div className="stapel">
      <Kopf eyebrow={probeZeile()} titel="Folien" />
      <div className="fo-umschalter" role="tablist" aria-label="Block">
        <button type="button" role="tab" aria-selected={block === 'uebungen'} onClick={() => setBlock('uebungen')}>
          Übungen{auswahl.schluessel.length ? ` (${auswahl.schluessel.length})` : ''}
        </button>
        <button type="button" role="tab" aria-selected={block === 'lieder'} onClick={() => setBlock('lieder')}>
          Lieder{lieder.ids.length ? ` (${lieder.ids.length})` : ''}
        </button>
      </div>
      {block === 'uebungen' ? <UebungenBlock /> : <LiederBlock />}
      <ThemenLeiste />
    </div>
  )
}

// ---------- Übungen ----------

function UebungenBlock() {
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null

  // Familien in der Reihenfolge der Datei (Phase, Thema, Stelle im Thema), nach Phasen gruppiert
  const phasen = useMemo(() => {
    const m = new Map<string, Familie[]>()
    for (const f of d?.familien ?? []) m.set(f.phase, [...(m.get(f.phase) ?? []), f])
    return [...m]
  }, [d])

  return (
    <>
      <p className="note fo-hinweis">G = Grundübung, Zahlen = Stufen. Name antippen: Seite lesen.</p>
      <Ladezustand stand={stand} neuLaden={neuLaden} />
      {phasen.map(([phase, familien]) => (
        <section key={phase} className="section">
          <h3>{phase}</h3>
          <ul className="list">
            {familien.map((f) => (
              <FamilienZeile key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

/** Was von einer Familie ausgewählt ist, in der Reihenfolge der Familie: „Grundübung · Stufe 2: In einem Schlag“ */
function gewaehltText(f: Familie, einheiten: string[]): string {
  return ['grund', ...f.stufen.map((s) => s.id)]
    .filter((e) => einheiten.includes(e))
    .map((e) => {
      const x = einheitVon(f, e)
      return !x ? e : x.nr === 0 ? 'Grundübung' : `Stufe ${x.nr}: ${x.a.name}`
    })
    .join(' · ')
}

function FamilienZeile({ f }: { f: Familie }) {
  const nav = useNav()
  const auswahl = useThemenAuswahl()
  const gewaehlt = auswahl.vonFamilie(f.id)
  const offen = nav.detail?.v === 'familie' && nav.detail.id === f.id
  const einheiten = [
    { id: 'grund', kurz: 'G', name: `Grundübung: ${f.grund.name}` },
    ...f.stufen.map((s, i) => ({ id: s.id, kurz: String(i + 1), name: `Stufe ${i + 1}: ${s.name}` })),
  ]
  const unter = gewaehlt.length ? gewaehltText(f, gewaehlt) : f.grund.name !== f.name ? f.grund.name : ''

  return (
    <li className="fo-familie">
      <button className="listbtn fo-name" type="button" aria-current={offen ? 'true' : undefined} onClick={() => nav.geh({ v: 'familie', id: f.id })}>
        <span className="main">
          <span className="title">{f.name}</span>
          {unter && <span className={'meta ein-ziel' + (gewaehlt.length ? ' pr-gewaehlt' : '')}>{unter}</span>}
        </span>
      </button>
      <div className="fo-schalter" role="group" aria-label={`${f.name}: Grundübung und Stufen`}>
        {einheiten.map((e) => {
          const drin = gewaehlt.includes(e.id)
          return (
            <button
              key={e.id}
              type="button"
              className={'fo-chip' + (drin ? ' drin' : '')}
              aria-pressed={drin}
              aria-label={`${f.name}, ${e.name}`}
              title={e.name}
              onClick={() => auswahl.umschalten({ familie: f.id, einheit: e.id })}
            >
              {e.kurz}
            </button>
          )
        })}
      </div>
    </li>
  )
}

// ---------- Lieder ----------

function LiederBlock() {
  const daten = useDaten()
  const lieder = useLiederAuswahl()
  const [suche, setSucheState] = useState(gemerkteSuche)
  const setSuche = (s: string) => {
    gemerkteSuche = s
    setSucheState(s)
  }

  const probe = useMemo(() => ereignisseAm(naechsteProbe()).find((e) => e.art === 'pr'), [])
  const vorgemerkt = (probe ? daten.proEreignis.get(probe.id) ?? [] : []).map((id) => daten.lieder.get(id)).filter((l): l is Lied => !!l)
  const weitere = lieder.ids.filter((id) => !vorgemerkt.some((l) => l.id === id)).map((id) => daten.lieder.get(id)).filter((l): l is Lied => !!l)
  const treffer = suche.trim() ? sucheLieder(daten.liederListe, suche, 40) : []

  return (
    <>
      <p className="note fo-hinweis">Lieder kommen nach den Übungen mit ihren Noten auf die Folien. Lied antippen: Seite öffnen.</p>
      <div className="search">
        <Lupe />
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Lied suchen"
          placeholder="Nummer oder Titel, z. B. D 74"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
      </div>
      {daten.stand.art === 'laedt' && <p className="note">Lädt …</p>}

      {suche.trim() ? (
        <section className="section">
          <h3>{treffer.length ? `${treffer.length === 40 ? 'Erste 40' : treffer.length} Treffer` : 'Keine Treffer'}</h3>
          <LiedListe liste={treffer} />
        </section>
      ) : (
        <>
          {probe && (
            <section className="section">
              <h3>Vorgemerkt für die Probe am {kurzDatum(probe.datum)}</h3>
              {vorgemerkt.length ? <LiedListe liste={vorgemerkt} /> : <p className="note">Im Wochenplan sind für diese Probe keine Lieder vorgemerkt.</p>}
            </section>
          )}
          {weitere.length > 0 && (
            <section className="section">
              <h3>Weitere ausgewählte</h3>
              <LiedListe liste={weitere} />
            </section>
          )}
        </>
      )}
    </>
  )
}

function LiedListe({ liste }: { liste: Lied[] }) {
  const nav = useNav()
  const lieder = useLiederAuswahl()
  const offen = nav.detail?.v === 'lied' ? nav.detail.id : undefined
  return (
    <ul className="list">
      {liste.map((l) => {
        const drin = lieder.enthaelt(l.id)
        return (
          <li key={l.id} className="ein-zeile fo-lied">
            <button className="listbtn" type="button" aria-current={offen === l.id ? 'true' : undefined} onClick={() => nav.geh({ v: 'lied', id: l.id })}>
              <span className="num">{kennung(l)}</span>
              <span className="main">
                <span className="title">{l.titel}</span>
                {!l.noten_pfad && <span className="meta">keine Noten hinterlegt</span>}
              </span>
            </button>
            <button
              type="button"
              className={'ein-wahl' + (drin ? ' drin' : '')}
              aria-pressed={drin}
              disabled={!l.noten_pfad}
              aria-label={drin ? `${kennung(l)} aus der Auswahl nehmen` : `${kennung(l)} zur Auswahl`}
              onClick={() => lieder.umschalten(l.id)}
            >
              {drin ? <Haken size={18} /> : <Plus size={18} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
