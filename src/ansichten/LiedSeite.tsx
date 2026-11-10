import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { kennung, STATUS_TEXT, useDaten, type Lied } from '../daten'
import type { Zeile } from '../datenbank.types'
import { ausIso, ereignisAusId, ereignisTitel, heute, iso, kurzDatum } from '../kalender'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { supabase } from '../supabase'
import { Datei, Plus, Runter } from '../symbole'
import { DateiKnopf } from './NotenWahl'

// Lied-Seite: Angaben zum Lied, Status ändern, Noten öffnen, gesungen am, Hinweise.
// Schwierigkeit und Thema sind fest eingestellt und hier nur zu sehen.
// Lieder außerhalb des Liederbuchs (ZD/ZR): Noten hochladen, ersetzen, entfernen; Lied ganz löschen.

type Hinweis = Zeile<'hinweise'>
type Art = 'notiz' | 'problem' | 'uebeansatz'
const ARTEN: [Art, string][] = [
  ['notiz', 'Notiz'],
  ['problem', 'Problem'],
  ['uebeansatz', 'Übeansatz'],
]
const ART_TEXT: Record<string, string> = Object.fromEntries(ARTEN)
const ART_KLASSE: Record<string, string> = { notiz: 'notiz', problem: 'problem', uebeansatz: 'uebe' }

const ZURUECK_TEXT: Record<string, string> = { woche: 'Wochenplan', lieder: 'Lieder', menue: 'Menü', uebung: 'Übung', erklaerung: 'Erklärung' }

export default function LiedSeite({ id }: { id: number }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const lied = daten.lieder.get(id)
  const [noten, setNoten] = useState<{ pfad: string; url: string } | null>(null)
  const pfad = lied?.noten_pfad ?? null
  // Link gilt nur für die Datei, für die er erzeugt wurde (nach dem Ersetzen neu erzeugen)
  const notenUrl = noten && noten.pfad === pfad ? noten.url : null

  // Noten-Link vorab erzeugen, damit „Noten öffnen“ ein direkter Link ist (zuverlässig auf dem iPhone)
  useEffect(() => {
    if (!pfad) return
    let aktiv = true
    supabase.storage
      .from('noten')
      .createSignedUrl(pfad, 3600)
      .then(({ data, error }) => {
        if (aktiv) setNoten({ pfad, url: error || !data ? 'fehler' : data.signedUrl })
      })
    return () => {
      aktiv = false
    }
  }, [pfad])

  if (!lied) {
    return (
      <>
        <Zurueck text="Zurück" />
        <p className="note">{daten.stand.art === 'laedt' ? 'Lädt …' : 'Lied nicht gefunden.'}</p>
      </>
    )
  }

  const jahr = heute().getFullYear()
  const anzahl = daten.statistik.anzahlJahr.get(id) ?? 0
  const zuletzt = daten.statistik.zuletzt.get(id)
  const thema = daten.themen.find((t) => t.id === lied.kategorie_id)
  const gesungenAm = daten.ereignisIds
    .filter((eid) => !eid.endsWith('|pr') && (daten.proEreignis.get(eid) ?? []).includes(id))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 6)
    .map(ereignisAusId)
  const seiten =
    lied.buchseite_von == null
      ? ''
      : lied.buchseite_bis && lied.buchseite_bis > lied.buchseite_von
        ? `Buchseiten ${lied.buchseite_von}–${lied.buchseite_bis}`
        : `Buchseite ${lied.buchseite_von}`
  const herkunft = lied.im_buch ? `${lied.sprache === 'R' ? 'Russisch' : 'Deutsch'} · Nr. ${lied.nummer}` : `Zettel · ${kennung(lied)}`

  async function statusAendern(status: string) {
    if (await daten.aendereLied(id, { status })) zeige(`Status: ${STATUS_TEXT[status] ?? status}`)
  }

  async function personAendern(feld: 'dirigent_id' | 'klavierspieler_id', wert: string) {
    const neu = wert === '' ? null : Number(wert)
    const liste = feld === 'dirigent_id' ? daten.dirigenten : daten.klavierspieler
    const name = liste.find((p) => p.id === neu)?.name
    const titel = feld === 'dirigent_id' ? 'Dirigent' : 'Klavier'
    if (await daten.aendereLied(id, { [feld]: neu })) zeige(name ? `${titel}: ${name}` : `${titel}: nicht zugeordnet`)
  }

  return (
    <>
      <Zurueck text={(nav.vorher && ZURUECK_TEXT[nav.vorher.v]) ?? 'Zurück'} />
      <Kopf eyebrow={herkunft} titel={lied.titel} klein />

      <dl className="facts">
        <div>
          <dt>Status</dt>
          <dd>
            <span className="selectbox">
              <span>{STATUS_TEXT[lied.status] ?? lied.status}</span>
              <Runter />
              <select aria-label="Status" value={lied.status} onChange={(e) => statusAendern(e.target.value)}>
                {Object.entries(STATUS_TEXT).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </span>
          </dd>
        </div>
        <div>
          <dt>Schwierigkeit</dt>
          <dd>{lied.schwierigkeit ? `${lied.schwierigkeit} von 5` : <span className="later">nicht angegeben</span>}</dd>
        </div>
        <div>
          <dt>Thema</dt>
          <dd>{thema ? thema.name : <span className="later">noch nicht zugeordnet</span>}</dd>
        </div>
        <div>
          <dt>Dirigent</dt>
          <dd>
            <PersonAuswahl
              name="Dirigent"
              wert={lied.dirigent_id}
              personen={daten.dirigenten}
              onWahl={(w) => personAendern('dirigent_id', w)}
            />
          </dd>
        </div>
        <div>
          <dt>Klavier</dt>
          <dd>
            <PersonAuswahl
              name="Klavierspieler"
              wert={lied.klavierspieler_id}
              personen={daten.klavierspieler}
              onWahl={(w) => personAendern('klavierspieler_id', w)}
            />
          </dd>
        </div>
        <div>
          <dt>Gesungen {jahr}</dt>
          <dd>
            <span className={`lbl c${Math.min(anzahl, 5)}`}>{anzahl}</span>
            <span className="later">{zuletzt ? `zuletzt ${kurzDatum(ausIso(zuletzt), true)}` : 'noch nicht'}</span>
          </dd>
        </div>
      </dl>

      {lied.noten_pfad &&
        (notenUrl && notenUrl !== 'fehler' ? (
          <a className="primary links" href={notenUrl} target="_blank" rel="noopener noreferrer">
            <Datei />
            <span>Noten öffnen</span>
            {seiten && <span className="sub">{seiten}</span>}
          </a>
        ) : (
          <button className="primary links" type="button" disabled>
            <Datei />
            <span>{notenUrl === 'fehler' ? 'Noten nicht erreichbar' : 'Noten werden vorbereitet …'}</span>
          </button>
        ))}
      {!lied.im_buch && <ZettelNoten lied={lied} />}

      {gesungenAm.length > 0 && (
        <section className="section">
          <h3>Gesungen am</h3>
          <ul className="history">
            {gesungenAm.map((e) => (
              <li key={e.id}>{ereignisTitel(e)}{e.datum.getFullYear() !== jahr ? ` ${e.datum.getFullYear()}` : ''}</li>
            ))}
          </ul>
        </section>
      )}

      <Hinweise liedId={id} />

      {!lied.im_buch && <LiedLoeschen lied={lied} />}
    </>
  )
}

// ---------- Lieder außerhalb des Liederbuchs ----------

/** Noten hochladen, ersetzen oder entfernen (nur Zettel-Lieder) */
function ZettelNoten({ lied }: { lied: Lied }) {
  const daten = useDaten()
  const zeige = useMeldung()
  const [laeuft, setLaeuft] = useState(false)
  const [entfernenFragen, setEntfernenFragen] = useState(false)

  async function setze(datei: File | null) {
    setLaeuft(true)
    const problem = await daten.notenSetzen(lied, datei)
    setLaeuft(false)
    setEntfernenFragen(false)
    if (problem) zeige(problem)
    else zeige(datei ? (lied.noten_pfad ? 'Noten ersetzt' : 'Noten hochgeladen') : 'Noten entfernt')
  }

  if (laeuft) return <p className="note">Noten werden gespeichert …</p>

  if (!lied.noten_pfad) {
    return (
      <DateiKnopf className="dateifeld" onWahl={setze}>
        <Datei />
        <span>Noten hochladen (PDF)</span>
      </DateiKnopf>
    )
  }

  if (entfernenFragen) {
    return (
      <div className="rueckfrage">
        <p>Noten wirklich entfernen? Die PDF wird gelöscht.</p>
        <div className="btnrow">
          <button className="ghost gefahr" type="button" onClick={() => setze(null)}>
            Entfernen
          </button>
          <button className="ghost plain" type="button" onClick={() => setEntfernenFragen(false)}>
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="btnrow">
      <DateiKnopf className="ghost" onWahl={setze}>
        Noten ersetzen
      </DateiKnopf>
      <button className="ghost plain" type="button" onClick={() => setEntfernenFragen(true)}>
        Noten entfernen
      </button>
    </div>
  )
}

/** Zettel-Lied ganz löschen: mit allen Einträgen und Hinweisen (Daniel, 10.11.2026) */
function LiedLoeschen({ lied }: { lied: Lied }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const [fragen, setFragen] = useState(false)
  const [hinweise, setHinweise] = useState<number | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const karte = useRef<HTMLElement>(null)

  // Die Rückfrage steht ganz unten: ins Bild holen
  useEffect(() => {
    if (fragen) karte.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [fragen, hinweise])

  const termine = daten.ereignisIds.filter((eid) => (daten.proEreignis.get(eid) ?? []).includes(lied.id)).length

  async function oeffnen() {
    setFragen(true)
    setHinweise(null)
    const { count } = await supabase.from('hinweise').select('id', { count: 'exact', head: true }).eq('lied_id', lied.id)
    setHinweise(count ?? 0)
  }

  async function loeschen() {
    setLaeuft(true)
    const name = kennung(lied)
    const ok = await daten.liedLoeschen(lied.id, () => nav.zurueck())
    if (ok) zeige(`${name} gelöscht`)
    else setLaeuft(false)
  }

  const mitloeschen: string[] = []
  if (termine > 0) mitloeschen.push(termine === 1 ? '1 Eintrag in Gottesdiensten oder Proben' : `${termine} Einträge in Gottesdiensten und Proben`)
  if (hinweise) mitloeschen.push(hinweise === 1 ? '1 Hinweis' : `${hinweise} Hinweise`)
  if (lied.noten_pfad) mitloeschen.push('die Noten')
  const aufzaehlung =
    mitloeschen.length > 1 ? `${mitloeschen.slice(0, -1).join(', ')} und ${mitloeschen[mitloeschen.length - 1]}` : mitloeschen[0]

  if (!fragen) {
    return (
      <button className="textbtn gefahr" type="button" onClick={oeffnen}>
        Lied löschen …
      </button>
    )
  }

  return (
    <section className="rueckfrage gefahr" aria-label="Lied löschen" ref={karte}>
      <p>
        <b>
          {kennung(lied)} „{lied.titel}“
        </b>{' '}
        endgültig löschen?
      </p>
      {hinweise === null ? (
        <p className="note">Prüft, was mitgelöscht wird …</p>
      ) : (
        <p className="note">
          {aufzaehlung ? `Mitgelöscht werden ${aufzaehlung}.` : 'Das Lied ist nirgends eingetragen und hat keine Hinweise.'} Das lässt
          sich nicht rückgängig machen.
        </p>
      )}
      <div className="btnrow">
        <button className="ghost voll-gefahr" type="button" onClick={loeschen} disabled={laeuft || hinweise === null}>
          {laeuft ? 'Wird gelöscht …' : 'Endgültig löschen'}
        </button>
        <button className="ghost plain" type="button" onClick={() => setFragen(false)} disabled={laeuft}>
          Abbrechen
        </button>
      </div>
    </section>
  )
}

function PersonAuswahl({
  name,
  wert,
  personen,
  onWahl,
}: {
  name: string
  wert: number | null
  personen: { id: number; name: string }[]
  onWahl: (w: string) => void
}) {
  const aktuell = personen.find((p) => p.id === wert)
  return (
    <span className={'selectbox' + (aktuell ? '' : ' empty-val')}>
      <span>{aktuell ? aktuell.name : 'Zuordnen'}</span>
      <Runter />
      <select aria-label={name} value={wert ?? ''} onChange={(e) => onWahl(e.target.value)}>
        <option value="">nicht zugeordnet</option>
        {personen.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </span>
  )
}

// ---------- Hinweise ----------

type Formular = { modus: 'neu' } | { modus: 'bearbeiten'; id: number }

function Hinweise({ liedId }: { liedId: number }) {
  const daten = useDaten()
  const zeige = useMeldung()
  const [hinweise, setHinweise] = useState<Hinweis[] | null>(null)
  const [fehler, setFehler] = useState(false)
  const [formular, setFormular] = useState<Formular | null>(null)
  const [zeigeGeschlossene, setZeigeGeschlossene] = useState(false)

  useEffect(() => {
    let aktiv = true
    supabase
      .from('hinweise')
      .select('*')
      .eq('lied_id', liedId)
      .order('datum', { ascending: false })
      .order('id', { ascending: false })
      .then(({ data, error }) => {
        if (!aktiv) return
        if (error) setFehler(true)
        else setHinweise(data)
      })
    return () => {
      aktiv = false
    }
  }, [liedId])

  // Zähler für Woche und Liedliste aktuell halten
  function uebernehme(neu: Hinweis[]) {
    setHinweise(neu)
    daten.setzeOffeneHinweise(liedId, neu.filter((h) => !h.geschlossen).length)
  }

  async function speichern(art: Art, text: string) {
    if (!hinweise || !formular) return false
    if (formular.modus === 'neu') {
      const { data, error } = await supabase
        .from('hinweise')
        .insert({ lied_id: liedId, art, text, datum: iso(heute()) })
        .select()
        .single()
      if (error || !data) {
        zeige('Nicht gespeichert – keine Verbindung?')
        return false
      }
      uebernehme([data, ...hinweise])
    } else {
      const hid = formular.id
      const { error } = await supabase.from('hinweise').update({ art, text }).eq('id', hid)
      if (error) {
        zeige('Nicht gespeichert – keine Verbindung?')
        return false
      }
      uebernehme(hinweise.map((h) => (h.id === hid ? { ...h, art, text } : h)))
    }
    setFormular(null)
    zeige('Hinweis gespeichert')
    return true
  }

  async function setzeGeschlossen(h: Hinweis, geschlossen: boolean) {
    if (!hinweise) return
    const { error } = await supabase.from('hinweise').update({ geschlossen }).eq('id', h.id)
    if (error) return zeige('Nicht gespeichert – keine Verbindung?')
    uebernehme(hinweise.map((x) => (x.id === h.id ? { ...x, geschlossen } : x)))
    zeige(geschlossen ? 'Hinweis geschlossen' : 'Hinweis wieder geöffnet')
  }

  const offen = (hinweise ?? []).filter((h) => !h.geschlossen)
  const geschlossen = (hinweise ?? []).filter((h) => h.geschlossen)

  return (
    <section className="hinweise" aria-label="Hinweise">
      <div className="secthead">
        <h2>Hinweise</h2>
        {!formular && hinweise && (
          <button className="textbtn" type="button" onClick={() => setFormular({ modus: 'neu' })}>
            <Plus size={18} />
            Neu
          </button>
        )}
      </div>
      {fehler && <p className="status-fehler">Hinweise konnten nicht geladen werden.</p>}
      {!hinweise && !fehler && <p className="note">Lädt …</p>}
      {formular?.modus === 'neu' && (
        <HinweisFormular onSpeichern={speichern} onAbbrechen={() => setFormular(null)} />
      )}
      {hinweise && offen.length === 0 && !formular && <p className="empty">Keine offenen Hinweise.</p>}
      {offen.map((h) =>
        formular?.modus === 'bearbeiten' && formular.id === h.id ? (
          <HinweisFormular
            key={h.id}
            start={h}
            onSpeichern={speichern}
            onAbbrechen={() => setFormular(null)}
          />
        ) : (
          <HinweisKarte
            key={h.id}
            h={h}
            onSchliessen={() => setzeGeschlossen(h, true)}
            onBearbeiten={formular ? undefined : () => setFormular({ modus: 'bearbeiten', id: h.id })}
          />
        ),
      )}
      {geschlossen.length > 0 && (
        <button className="textbtn light" type="button" onClick={() => setZeigeGeschlossene(!zeigeGeschlossene)}>
          {zeigeGeschlossene ? 'Geschlossene ausblenden' : `Geschlossene anzeigen (${geschlossen.length})`}
        </button>
      )}
      {zeigeGeschlossene &&
        geschlossen.map((h) => <HinweisKarte key={h.id} h={h} onWiederOeffnen={() => setzeGeschlossen(h, false)} />)}
    </section>
  )
}

function HinweisKarte({
  h,
  onSchliessen,
  onBearbeiten,
  onWiederOeffnen,
}: {
  h: Hinweis
  onSchliessen?: () => void
  onBearbeiten?: () => void
  onWiederOeffnen?: () => void
}) {
  return (
    <article className={'notecard' + (h.geschlossen ? ' closed' : '')}>
      <div className="notetop">
        <span className={`tag ${ART_KLASSE[h.art] ?? 'notiz'}`}>
          {ART_TEXT[h.art] ?? h.art}
          {h.geschlossen ? ' · geschlossen' : ''}
        </span>
        <span className="note">{kurzDatum(ausIso(h.datum), true)}</span>
      </div>
      <p>{h.text}</p>
      <div className="btnrow">
        {h.geschlossen ? (
          <button className="ghost plain" type="button" onClick={onWiederOeffnen}>
            Wieder öffnen
          </button>
        ) : (
          <>
            <button className="ghost" type="button" onClick={onSchliessen}>
              Schließen
            </button>
            {onBearbeiten && (
              <button className="ghost plain" type="button" onClick={onBearbeiten}>
                Bearbeiten
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function HinweisFormular({
  start,
  onSpeichern,
  onAbbrechen,
}: {
  start?: Hinweis
  onSpeichern: (art: Art, text: string) => Promise<boolean>
  onAbbrechen: () => void
}) {
  const [art, setArt] = useState<Art>((start?.art as Art) ?? 'notiz')
  const [text, setText] = useState(start?.text ?? '')
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLaeuft(true)
    const ok = await onSpeichern(art, text.trim())
    if (!ok) setLaeuft(false)
  }

  return (
    <form className="notecard" onSubmit={absenden}>
      <div className="field">
        <span className="feldname">Art</span>
        <div className="typepick" role="group" aria-label="Art">
          {ARTEN.map(([k, t]) => (
            <button key={k} className="chip" type="button" aria-pressed={art === k} onClick={() => setArt(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="hinweistext">Text</label>
        <textarea id="hinweistext" value={text} onChange={(e) => setText(e.target.value)} autoFocus required />
      </div>
      <div className="btnrow">
        <button className="ghost" type="submit" disabled={laeuft || !text.trim()}>
          {laeuft ? 'Speichert …' : 'Speichern'}
        </button>
        <button className="ghost plain" type="button" onClick={onAbbrechen}>
          Abbrechen
        </button>
      </div>
    </form>
  )
}

