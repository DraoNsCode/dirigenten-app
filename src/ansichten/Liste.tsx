import { Kopf, Zurueck } from '../bausteine'
import { useDaten } from '../daten'
import { ereignisAusId, ereignisseDerWoche, ereignisTitel, heute, montagVon, plusTage } from '../kalender'
import { useNav } from '../navigation'
import { Rechts } from '../symbole'

// Menü → Gottesdienste / Proben: alle Termine mit Einträgen und die nächsten vier Wochen.
// Antippen springt in die jeweilige Woche, dort wird nachgetragen oder korrigiert.

export default function Liste({ art }: { art: 'gd' | 'pr' }) {
  const nav = useNav()
  const daten = useDaten()
  const ids = new Set(daten.ereignisIds.filter((id) => (id.endsWith('|pr') ? 'pr' : 'gd') === art))
  for (let w = 0; w < 4; w++)
    ereignisseDerWoche(plusTage(montagVon(heute()), w * 7)).forEach((e) => {
      if (e.art === art) ids.add(e.id)
    })
  const ereignisse = Array.from(ids)
    .sort((a, b) => b.localeCompare(a))
    .map(ereignisAusId)

  return (
    <>
      <Zurueck text="Menü" />
      <Kopf eyebrow="Übersicht" titel={art === 'pr' ? 'Proben' : 'Gottesdienste'} klein />
      <ul className="list">
        {ereignisse.map((e) => {
          const n = (daten.proEreignis.get(e.id) ?? []).length
          return (
            <li key={e.id}>
              <button className="listbtn" type="button" onClick={() => nav.zurWoche(e.datum)}>
                <span className="main">
                  <span className="title">{ereignisTitel(e)}</span>
                  <span className="meta">{n ? (n === 1 ? '1 Lied' : `${n} Lieder`) : 'noch leer'}</span>
                </span>
                <Rechts size={18} />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
