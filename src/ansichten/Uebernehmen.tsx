import { useState, type FormEvent } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { kennung, useDaten } from '../daten'
import { ereignisAusId, ereignisseDerWoche, ereignisTitel, kurzDatum, montagVon } from '../kalender'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'

// Lieder der Probe derselben Woche in einen Gottesdienst übernehmen (Eingabehilfe, keine Auswahlhilfe).

export default function Uebernehmen({ evId }: { evId: string }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const ev = ereignisAusId(evId)
  const probe = ereignisseDerWoche(montagVon(ev.datum)).find((e) => e.art === 'pr')
  const probenLieder = probe ? daten.proEreignis.get(probe.id) ?? [] : []
  const schonDrin = new Set(daten.proEreignis.get(ev.id) ?? [])

  // Vorausgewählt: erlernte Lieder, die noch nicht eingetragen sind
  const [gewaehlt, setGewaehlt] = useState<Set<number>>(
    () => new Set(probenLieder.filter((id) => !schonDrin.has(id) && daten.lieder.get(id)?.status === 'erlernt')),
  )
  const [laeuft, setLaeuft] = useState(false)

  function umschalten(id: number) {
    setGewaehlt((alt) => {
      const neu = new Set(alt)
      if (neu.has(id)) neu.delete(id)
      else neu.add(id)
      return neu
    })
  }

  async function absenden(e: FormEvent) {
    e.preventDefault()
    setLaeuft(true)
    const ids = probenLieder.filter((id) => gewaehlt.has(id))
    const n = await daten.uebernehmen(ev, ids)
    setLaeuft(false)
    if (n > 0 || ids.length === 0) {
      zeige(n === 0 ? 'Nichts übernommen' : n === 1 ? '1 Lied übernommen' : `${n} Lieder übernommen`)
      nav.zurueck()
    }
  }

  return (
    <>
      <Zurueck text="Als Nächstes" />
      <Kopf eyebrow={ereignisTitel(ev)} titel="Aus der Probe übernehmen" klein />
      <p className="note">
        {probe ? `Lieder der Probe vom ${kurzDatum(probe.datum)}` : 'Lieder der Probe.'} Wähle aus, was gesungen wird.
      </p>
      <form onSubmit={absenden}>
        <div>
          {probenLieder.map((id) => {
            const l = daten.lieder.get(id)
            if (!l) return null
            const drin = schonDrin.has(id)
            const erlernt = l.status === 'erlernt'
            const zusatz = drin ? 'bereits eingetragen' : erlernt ? '' : 'noch nicht erlernt'
            return (
              <label key={id} className={'checkrow' + (erlernt && !drin ? '' : ' dim')}>
                <input
                  type="checkbox"
                  checked={drin || gewaehlt.has(id)}
                  disabled={drin || !erlernt}
                  onChange={() => umschalten(id)}
                />
                <span className="num">{kennung(l)}</span>
                <span className="main">
                  <span className="title">{l.titel}</span>
                  {zusatz && <span className="meta">{zusatz}</span>}
                </span>
              </label>
            )
          })}
        </div>
        <button className="primary" type="submit" disabled={laeuft} style={{ marginTop: 12 }}>
          {laeuft ? 'Übernehme …' : 'Übernehmen'}
        </button>
      </form>
    </>
  )
}
