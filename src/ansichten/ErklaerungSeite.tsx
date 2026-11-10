import { Kopf, Zurueck } from '../bausteine'
import { useNav } from '../navigation'
import Grafik from '../uebungen/Grafik'
import Noten from '../uebungen/Noten'
import { schwierigkeitText } from '../uebungen/anzeige'
import { useSammlung } from '../uebungen/sammlung'
import { Abschnitt, AuswahlKnopf, Liederbuch, Marken, Quellen, StandMarke, Verweise } from '../uebungen/Teile'
import { ZURUECK_TEXT } from './UebungSeite'

// Seite einer Erklärung: Kern, kurzer Text, Grafik, Noten und die Übungen, die auf sie verweisen.

export default function ErklaerungSeite({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useSammlung()
  const zurueck = (nav.vorher && ZURUECK_TEXT[nav.vorher.v]) ?? 'Zurück'
  const s = stand.art === 'bereit' ? stand.s : null
  const e = s?.erklaerungen.get(id)

  if (!s || !e) {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">
          {stand.art === 'bereit' ? 'Erklärung nicht gefunden.' : stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}
        </p>
      </>
    )
  }

  const haupt = s.bereiche.get(e.bereiche[0])
  const weitere = e.bereiche.slice(1).map((b) => s.bereiche.get(b)?.name ?? b)
  const uebungen = (e.uebungen ?? []).map((u) => s.uebungen.get(u)).filter((u) => !!u)
  const absaetze = (e.text ?? '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)

  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf eyebrow={haupt ? `Erklärung · ${haupt.nr} ${haupt.name}` : 'Erklärung'} titel={e.titel} klein />

      <p className="ue-ziel">{e.kern}</p>
      <AuswahlKnopf punkt={{ art: 'erklaerung', id: e.id }} />

      <dl className="facts">
        <div>
          <dt>Stand</dt>
          <dd>
            <StandMarke stand={e.stand} />
          </dd>
        </div>
        {weitere.length > 0 && (
          <div>
            <dt>Auch in</dt>
            <dd>{weitere.join(', ')}</dd>
          </div>
        )}
      </dl>

      {absaetze.length > 0 && (
        <div className="ue-text">
          {absaetze.map((a, i) => (
            <p key={i}>{a}</p>
          ))}
        </div>
      )}

      {e.grafik && <Grafik grafik={e.grafik} svgText={s.grafiken[e.grafik.datei]} />}

      {e.noten?.map((n, i) => (
        <Noten key={i} block={n} ueberschrift={e.noten!.length > 1 ? n.hinweis : undefined} />
      ))}

      {uebungen.length > 0 && (
        <Abschnitt titel="Übungen dazu">
          <Verweise
            eintraege={uebungen.map((u) => ({
              titel: u.titel,
              zusatz: [schwierigkeitText(u), u.stichwort].filter(Boolean).join(' · '),
              ziel: () => nav.geh({ v: 'uebung', id: u.id }),
            }))}
          />
        </Abschnitt>
      )}

      <Liederbuch stellen={e.liederbuch} />
      <Quellen quellen={e.quellen} />

      <section className="ue-weiteres">
        <Marken titel="Themen" werte={e.themen} />
        <p className="note">
          Kennung {e.id} · Fassung {e.fassung}
        </p>
      </section>
    </>
  )
}
