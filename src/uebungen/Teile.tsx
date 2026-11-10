import type { ReactNode } from 'react'
import { useDaten } from '../daten'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'
import { Haken, Plus, Rechts } from '../symbole'
import { useAuswahl, type AuswahlPunkt } from './auswahl'
import { quelleTeilen, STAND_TEXT } from './anzeige'
import type { Liedstelle, Stand } from './typen'

// Bausteine der Übungs- und Erklärungsseiten

export function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="ue-abschnitt">
      <h2>{titel}</h2>
      {children}
    </section>
  )
}

export function Liste({ eintraege, nummeriert }: { eintraege?: string[]; nummeriert?: boolean }) {
  if (!eintraege?.length) return null
  const kinder = eintraege.map((t, i) => <li key={i}>{t}</li>)
  return nummeriert ? <ol className="ue-liste">{kinder}</ol> : <ul className="ue-liste">{kinder}</ul>
}

export function StandMarke({ stand }: { stand: Stand }) {
  return <span className={`tag stand-${stand}`}>{STAND_TEXT[stand]}</span>
}

/** Verweis auf einen anderen Eintrag (Übung, Erklärung) */
export function Verweise({ eintraege }: { eintraege: { titel: string; zusatz?: string; ziel: () => void; aktuell?: boolean }[] }) {
  if (!eintraege.length) return null
  return (
    <ul className="list">
      {eintraege.map((x, i) => (
        <li key={i}>
          <button className="listbtn" type="button" disabled={x.aktuell} aria-current={x.aktuell ? 'true' : undefined} onClick={x.ziel}>
            <span className="main">
              <span className="title">{x.titel}</span>
              {x.zusatz && <span className="meta">{x.zusatz}</span>}
            </span>
            {!x.aktuell && <Rechts size={18} />}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Stellen im Chorliederbuch; ein Lied der App lässt sich direkt öffnen */
export function Liederbuch({ stellen }: { stellen?: Liedstelle[] }) {
  const daten = useDaten()
  const nav = useNav()
  if (!stellen?.length) return null
  return (
    <Abschnitt titel="Im Liederbuch">
      <ul className="list">
        {stellen.map((s, i) => {
          const kuerzel = s.teil === 'russisch' ? 'R' : 'D'
          const lied = daten.liederListe.find((l) => l.im_buch && l.kuerzel === kuerzel && l.nummer === s.nr)
          const inhalt = (
            <>
              <span className="num">
                {kuerzel} {s.nr}
              </span>
              <span className="main">
                <span className="title">{lied?.titel ?? s.titel ?? 'Lied'}</span>
                {(s.stelle || s.hinweis) && (
                  <span className="meta">
                    {s.stelle && <span className="vermerk">{s.stelle}</span>}
                    {s.hinweis && <span>{s.hinweis}</span>}
                  </span>
                )}
              </span>
            </>
          )
          return (
            <li key={i}>
              {lied ? (
                <button className="listbtn" type="button" onClick={() => nav.geh({ v: 'lied', id: lied.id })}>
                  {inhalt}
                  <Rechts size={18} />
                </button>
              ) : (
                <div className="listbtn statisch">{inhalt}</div>
              )}
            </li>
          )
        })}
      </ul>
    </Abschnitt>
  )
}

export function Quellen({ quellen }: { quellen?: string[] }) {
  if (!quellen?.length) return null
  return (
    <Abschnitt titel="Beruht auf">
      <ul className="ue-liste klein">
        {quellen.map((q, i) => {
          const { text, url } = quelleTeilen(q)
          return (
            <li key={i}>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer">
                  {text}
                </a>
              ) : (
                text
              )}
            </li>
          )
        })}
      </ul>
    </Abschnitt>
  )
}

export function Marken({ titel, werte }: { titel: string; werte?: string[] }) {
  if (!werte?.length) return null
  return (
    <div className="ue-marken">
      <span className="feldname">{titel}</span>
      <div className="ue-markenreihe">
        {werte.map((w) => (
          <span key={w} className="marke">
            {w}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Knopf „Zur Auswahl“ / „In der Auswahl“ für die Probenfolien */
export function AuswahlKnopf({ punkt, text = 'Zur Auswahl' }: { punkt: Pick<AuswahlPunkt, 'art' | 'id' | 'stufe'>; text?: string }) {
  const auswahl = useAuswahl()
  const zeige = useMeldung()
  const drin = auswahl.enthaelt(punkt)
  return (
    <button
      type="button"
      className={'ghost auswahlknopf' + (drin ? ' drin' : '')}
      aria-pressed={drin}
      onClick={() => {
        const jetzt = auswahl.umschalten(punkt)
        zeige(jetzt ? `Zur Auswahl hinzugefügt (${auswahl.punkte.length + 1})` : 'Aus der Auswahl genommen')
      }}
    >
      {drin ? <Haken size={16} /> : <Plus size={16} />}
      {drin ? 'In der Auswahl' : text}
    </button>
  )
}
