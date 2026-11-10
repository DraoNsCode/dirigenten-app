import { Kopf, Zurueck } from '../bausteine'
import { useNav, type Ansicht } from '../navigation'
import Grafik from '../uebungen/Grafik'
import Noten from '../uebungen/Noten'
import { PRUEFBAR_TEXT, RAHMEN_TEXT, SCHWIERIGKEIT_TEXT, schwierigkeitText } from '../uebungen/anzeige'
import { useSammlung } from '../uebungen/sammlung'
import { Abschnitt, AuswahlKnopf, AuswahlLeiste, Liederbuch, Liste, Marken, Quellen, StandMarke, Verweise } from '../uebungen/Teile'

// Seite einer Übung: zunächst alle Angaben aus der Sammlung, damit Daniel die Einträge durchsehen kann.
// Welche Angaben die App später zeigt, wird danach ausgewählt.

export const ZURUECK_TEXT: Partial<Record<Ansicht['v'], string>> = {
  uebungen: 'Übungen',
  uebung: 'Übung',
  erklaerung: 'Erklärung',
  lied: 'Lied',
  auswahl: 'Auswahl',
}

export default function UebungSeite({ id }: { id: string }) {
  const nav = useNav()
  const { stand } = useSammlung()
  const zurueck = (nav.vorher && ZURUECK_TEXT[nav.vorher.v]) ?? 'Zurück'
  const s = stand.art === 'bereit' ? stand.s : null
  const u = s?.uebungen.get(id)

  if (!s || !u) {
    return (
      <>
        <Zurueck text={zurueck} />
        <p className="note">{stand.art === 'bereit' ? 'Übung nicht gefunden.' : stand.art === 'fehler' ? 'Die Übungen konnten nicht geladen werden.' : 'Lädt …'}</p>
      </>
    )
  }

  const haupt = s.bereiche.get(u.bereiche[0])
  const weitere = u.bereiche.slice(1).map((b) => s.bereiche.get(b)?.name ?? b)
  const familie = u.familie ? (s.familien[u.familie] ?? []) : []
  const erklaerungen = (u.erklaerungen ?? []).map((e) => s.erklaerungen.get(e)).filter((e) => !!e)

  return (
    <>
      <Zurueck text={zurueck} />
      <Kopf eyebrow={haupt ? `${haupt.nr} · ${haupt.name}` : 'Übung'} titel={u.titel} klein />

      <p className="ue-ziel">{u.ziel}</p>
      {u.stufen?.length ? (
        <p className="note">Für die Probenfolien unten bei den Stufen eine Stufe auswählen.</p>
      ) : (
        <AuswahlKnopf punkt={{ art: 'uebung', id: u.id }} />
      )}
      {(u.stichwort || u.bild) && (
        <div className="ue-bild">
          {u.stichwort && <p className="ue-stichwort">{u.stichwort}</p>}
          {u.bild && <p>{u.bild}</p>}
        </div>
      )}

      <dl className="facts">
        {schwierigkeitText(u) && (
          <div>
            <dt>Schwierigkeit</dt>
            <dd>{schwierigkeitText(u)}</dd>
          </div>
        )}
        <div>
          <dt>Stand</dt>
          <dd>
            <StandMarke stand={u.stand} />
          </dd>
        </div>
        {u.rahmen?.length ? (
          <div>
            <dt>Geht mit</dt>
            <dd>{u.rahmen.map((r) => RAHMEN_TEXT[r] ?? r).join(', ')}</dd>
          </div>
        ) : null}
        {u.tempo ? (
          <div>
            <dt>Tempo</dt>
            <dd>♩ = {u.tempo}</dd>
          </div>
        ) : null}
        {weitere.length > 0 && (
          <div className="breit">
            <dt>Auch in</dt>
            <dd>{weitere.join(', ')}</dd>
          </div>
        )}
      </dl>

      {u.grafik && <Grafik grafik={u.grafik} svgText={s.grafiken[u.grafik.datei]} />}

      {u.noten?.map((n, i) => (
        <Noten key={i} block={n} ueberschrift={u.noten!.length > 1 ? n.hinweis : undefined} />
      ))}

      <Abschnitt titel="Ablauf">
        <Liste eintraege={u.ablauf} nummeriert />
      </Abschnitt>

      {u.stufen?.length ? (
        <Abschnitt titel="Stufen">
          <ul className="ue-stufen">
            {u.stufen.map((st) => (
              <li key={st.stufe}>
                <div className="ue-stufenkopf">
                  <strong>Stufe {st.stufe}</strong>
                  {st.schwierigkeit ? <span className="meta">{SCHWIERIGKEIT_TEXT[st.schwierigkeit]}</span> : null}
                  {st.tempo ? <span className="meta">♩ = {st.tempo}</span> : null}
                </div>
                <p>{st.aenderung}</p>
                <AuswahlKnopf punkt={{ art: 'uebung', id: u.id, stufe: st.stufe }} text={`Stufe ${st.stufe} zur Auswahl`} />
                {st.noten?.map((n, i) => (
                  <Noten key={i} block={n} ueberschrift={st.noten!.length > 1 ? n.hinweis : undefined} />
                ))}
              </li>
            ))}
          </ul>
        </Abschnitt>
      ) : null}

      {u.achten?.length ? (
        <Abschnitt titel="Worauf achten">
          <Liste eintraege={u.achten} />
        </Abschnitt>
      ) : null}

      {u.varianten?.length ? (
        <Abschnitt titel="Varianten">
          <Liste eintraege={u.varianten} />
        </Abschnitt>
      ) : null}

      {u.silben?.length ? (
        <Abschnitt titel="Silben zum Wechseln">
          <p className="ue-silben">{u.silben.join(' · ')}</p>
        </Abschnitt>
      ) : null}

      {u.selbstkontrolle && (
        <Abschnitt titel="Selbstkontrolle">
          <p className="ue-text">{u.selbstkontrolle}</p>
        </Abschnitt>
      )}

      {familie.length > 1 && (
        <Abschnitt titel="Familie">
          <Verweise
            eintraege={familie.map((fid) => {
              const f = s.uebungen.get(fid)
              return {
                titel: f?.titel ?? fid,
                zusatz: [f?.stufe ? `Stufe ${f.stufe}` : '', f && schwierigkeitText(f)].filter(Boolean).join(' · '),
                aktuell: fid === u.id,
                ziel: () => nav.ersetze({ v: 'uebung', id: fid }),
              }
            })}
          />
        </Abschnitt>
      )}

      {erklaerungen.length > 0 && (
        <Abschnitt titel="Erklärungen dazu">
          <Verweise
            eintraege={erklaerungen.map((e) => ({ titel: e.titel, zusatz: e.kern, ziel: () => nav.geh({ v: 'erklaerung', id: e.id }) }))}
          />
        </Abschnitt>
      )}

      <Liederbuch stellen={u.liederbuch} />
      <Quellen quellen={u.quellen} />

      <section className="ue-weiteres">
        <Marken titel="Themen" werte={u.themen} />
        <Marken titel="Für die Sänger-App messbar" werte={u.pruefbar?.map((p) => PRUEFBAR_TEXT[p] ?? p)} />
        <p className="note">
          Kennung {u.id} · Fassung {u.fassung}
        </p>
      </section>
      <AuswahlLeiste />
    </>
  )
}
