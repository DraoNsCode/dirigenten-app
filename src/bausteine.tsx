import type { ReactNode } from 'react'
import { useDaten } from './daten'
import { ausIso, heute, kurzDatum } from './kalender'
import { useBereich, useNav } from './navigation'
import { Info, Kreuz, Links } from './symbole'

export function Kopf({ eyebrow, titel, klein, rechts }: { eyebrow: string; titel: string; klein?: boolean; rechts?: ReactNode }) {
  const h1 = <h1 className={klein ? 'small' : undefined}>{titel}</h1>
  return (
    <header className="head">
      <div className="eyebrow">{eyebrow}</div>
      {rechts ? (
        <div className="headrow">
          {h1}
          {rechts}
        </div>
      ) : (
        h1
      )}
      <div className="goldline" />
    </header>
  )
}

export function Zurueck({ text }: { text: string }) {
  const nav = useNav()
  const bereich = useBereich()
  if (bereich === 'detail') {
    return (
      <button className="back schliessen" type="button" onClick={nav.zurueck}>
        <Kreuz size={18} />
        Schließen
      </button>
    )
  }
  return (
    <button className="back" type="button" onClick={nav.zurueck}>
      <Links size={20} />
      {text}
    </button>
  )
}

export function HinweisMarke({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="hint">
      <Info />
      {n === 1 ? '1 Hinweis' : `${n} Hinweise`}
    </span>
  )
}

/** Label „wie oft gesungen“ (laufendes Jahr) und „zuletzt gesungen“ */
export function Gesungen({ liedId }: { liedId: number }) {
  const { statistik } = useDaten()
  const n = statistik.anzahlJahr.get(liedId) ?? 0
  const z = statistik.zuletzt.get(liedId)
  const jahr = heute().getFullYear()
  return (
    <>
      <span className={`lbl c${Math.min(n, 5)}`} aria-label={`${jahr} ${n}-mal gesungen`}>
        {n}
      </span>
      {z ? `zuletzt ${kurzDatum(ausIso(z), true)}` : `${jahr} noch nicht gesungen`}
    </>
  )
}

export function Fehlerkarte({ text, nochmal }: { text: string; nochmal: () => void }) {
  return (
    <section className="card">
      <h2>Keine Verbindung</h2>
      <p>Die Daten konnten nicht geladen werden. Bitte prüfe das Internet.</p>
      <p className="note">{text}</p>
      <button className="textbtn" type="button" onClick={nochmal}>
        Noch einmal versuchen
      </button>
    </section>
  )
}
