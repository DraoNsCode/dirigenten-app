import { Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { Rechts } from '../symbole'
import { useInhalt } from '../themen/daten'
import { Ladezustand, ThemenWahlKnopf } from '../themen/Teile'
import { useThemenAuswahl } from '../themen/auswahl'
import { gewaehltText } from '../themen/folie'
import type { Familie, Thema } from '../themen/typen'

// Reiter „Übungen“: zum Lesen und Vorbereiten (Daniel, 18.11.2026: Ausgewählt und exportiert wird im Reiter „Folien“).
// Gliederung (Claudes Vorschlag vom 18.11.2026, nach Daniels Wunsch „optisch besser strukturiert“):
// - Je Thema eine Karte. Kopf: Name des Themas und sein Kernsatz; ein Tipp öffnet die Themenseite.
//   Darunter die Familien; ein Tipp öffnet ihre Seite (breit: rechts).
// - Am Ende die Themen ohne Familien als Lesetexte, ebenfalls als Karte („Zum Lesen“).
// - „›“ heißt überall: öffnet eine Seite. Rechts daneben „+“: wählt die Grundübung für die Probenfolien aus
//   (Daniel, 18.11.2026: auswählen auch im Reiter „Übungen“, „einfach überall das Plus“); Stufen auf der Familienseite.
//   Unter dem Namen steht in Gold, was von der Familie ausgewählt ist.

export default function Vorbereiten() {
  const nav = useNav()
  const { stand, neuLaden } = useInhalt()
  const d = stand.art === 'bereit' ? stand.d : null
  const offen = nav.detail?.v === 'thema' || nav.detail?.v === 'familie' ? `${nav.detail.v}:${nav.detail.id}` : ''
  const mitFamilien = d?.themen.filter((t) => t.familien.length) ?? []
  const lesetexte = d?.themen.filter((t) => !t.familien.length) ?? []

  return (
    <div className="stapel">
      <Kopf eyebrow="Vorbereiten" titel="Übungen" />
      <Ladezustand stand={stand} neuLaden={neuLaden} />

      {d && (
        <div className="ue-themen">
          {mitFamilien.map((t) => (
            <section key={t.id} className="ue-thema" aria-label={t.name}>
              <ThemaKopf t={t} aktiv={offen === `thema:${t.id}`} />
              <ul className="ue-familien">
                {t.familien
                  .map((id) => d.familie.get(id))
                  .filter((f): f is Familie => !!f)
                  .map((f) => (
                    <FamilienZeile key={f.id} f={f} aktiv={offen === `familie:${f.id}`} />
                  ))}
              </ul>
            </section>
          ))}

          {!!d.ohneThema.length && (
            <section className="ue-thema" aria-label="Noch ohne Themenseite">
              <div className="ue-themakopf statisch">
                <span className="ue-thematext">
                  <span className="ue-themaname">Noch ohne Themenseite</span>
                </span>
              </div>
              <ul className="ue-familien">
                {d.ohneThema.map((f) => (
                  <FamilienZeile key={f.id} f={f} aktiv={offen === `familie:${f.id}`} />
                ))}
              </ul>
            </section>
          )}

          {!!lesetexte.length && (
            <section className="ue-thema ue-lesen" aria-label="Zum Lesen">
              <div className="ue-themakopf statisch">
                <span className="ue-thematext">
                  <span className="ue-themaname">Zum Lesen</span>
                  <span className="ue-kern">Hintergrund für die Dirigenten, ohne eigene Übungen</span>
                </span>
              </div>
              <ul className="ue-familien">
                {lesetexte.map((t) => (
                  <li key={t.id}>
                    <button
                      className="ue-zeile"
                      type="button"
                      aria-current={offen === `thema:${t.id}` ? 'true' : undefined}
                      onClick={() => nav.geh({ v: 'thema', id: t.id })}
                    >
                      <span className="main">
                        <span className="title">{t.name}</span>
                        <span className="meta ein-ziel">{t.kern}</span>
                      </span>
                      <Rechts size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/** Kopf einer Themenkarte: Name und Kernsatz; ein Tipp öffnet die Themenseite */
function ThemaKopf({ t, aktiv }: { t: Thema; aktiv: boolean }) {
  const nav = useNav()
  return (
    <button type="button" className="ue-themakopf" aria-current={aktiv ? 'true' : undefined} onClick={() => nav.geh({ v: 'thema', id: t.id })}>
      <span className="ue-thematext">
        <span className="ue-themaname">{t.name}</span>
        {t.kern && <span className="ue-kern">{t.kern}</span>}
      </span>
      <Rechts size={18} />
    </button>
  )
}

/** Unter dem Namen: die Grundübung (wenn sie anders heißt) und die Zahl der Stufen; ohne beides das Ziel */
export function familienZusatz(f: Familie): string {
  const stufen = !f.stufen.length ? '' : f.stufen.length === 1 ? '1 Stufe' : `${f.stufen.length} Stufen`
  const teile = [f.grund.name !== f.name ? f.grund.name : '', stufen].filter(Boolean)
  return teile.length ? teile.join(' · ') : f.grund.ziel
}

/** Eine Familie; ein Tipp öffnet ihre Seite, „+“ wählt die Grundübung aus */
function FamilienZeile({ f, aktiv }: { f: Familie; aktiv: boolean }) {
  const nav = useNav()
  const auswahl = useThemenAuswahl()
  const gewaehlt = auswahl.vonFamilie(f.id)
  return (
    <li className="ue-mitwahl">
      <button className="ue-zeile" type="button" aria-current={aktiv ? 'true' : undefined} onClick={() => nav.geh({ v: 'familie', id: f.id })}>
        <span className="main">
          <span className="title">{f.name}</span>
          <span className={'meta ein-ziel' + (gewaehlt.length ? ' pr-gewaehlt' : '')}>
            {gewaehlt.length ? gewaehltText(f, gewaehlt) : familienZusatz(f)}
          </span>
        </span>
        <Rechts size={16} />
      </button>
      <ThemenWahlKnopf wahl={{ familie: f.id, einheit: 'grund' }} name={`${f.name}, Grundübung`} />
    </li>
  )
}
