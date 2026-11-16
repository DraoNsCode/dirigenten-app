import { useState, type FormEvent } from 'react'
import { Kopf, Zurueck } from '../bausteine'
import { gottesdienstRang, kennung, liederInGottesdiensten, useDaten } from '../daten'
import { ereignisAusId, ereignisseDerWoche, ereignisTitel, kurzDatum, montagVon, terminKurz } from '../kalender'
import { useMeldung } from '../meldung'
import { useNav } from '../navigation'

// Lieder der Probe derselben Woche in einen Gottesdienst übernehmen (Eingabehilfe, keine Auswahlhilfe).
// Reihenfolge wie bei „Lied eintragen“: eintragbare oben, dann schon in diesem Gottesdienst, dann in einem anderen
// Gottesdienst dieser Woche, dann in Arbeit, unten unbekannte; innerhalb davon wie in der Probe (Daniel, 16.11.2026).

export default function Uebernehmen({ evId }: { evId: string }) {
  const nav = useNav()
  const daten = useDaten()
  const zeige = useMeldung()
  const ev = ereignisAusId(evId)
  const probe = ereignisseDerWoche(montagVon(ev.datum)).find((e) => e.art === 'pr')
  const probenLieder = probe ? daten.proEreignis.get(probe.id) ?? [] : []
  const schonDrin = new Set(daten.proEreignis.get(ev.id) ?? [])
  const inDerWoche = liederInGottesdiensten(daten.proEreignis, ev)
  const rang = (id: number) => {
    const l = daten.lieder.get(id)
    return l ? gottesdienstRang(l, schonDrin.has(id), inDerWoche.has(id)) : 99
  }
  const anzeige = [...probenLieder].sort((a, b) => rang(a) - rang(b))

  // Ein Lied steht in einer Woche höchstens in einem Gottesdienst (Daniel, 16.11.2026)
  const belegt = (id: number) => (schonDrin.has(id) ? undefined : daten.schonInDerWoche(ev, id))

  // Vorausgewählt: erlernte Lieder, die in dieser Woche noch in keinem Gottesdienst stehen
  const [gewaehlt, setGewaehlt] = useState<Set<number>>(
    () =>
      new Set(
        probenLieder.filter((id) => !schonDrin.has(id) && !belegt(id) && daten.lieder.get(id)?.status === 'erlernt'),
      ),
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
      <Zurueck text="Wochenplan" />
      <Kopf eyebrow={ereignisTitel(ev)} titel="Aus der Probe übernehmen" klein />
      <p className="note">
        {probe ? `Lieder der Probe vom ${kurzDatum(probe.datum)}` : 'Lieder der Probe.'} Wähle aus, was gesungen wird.
      </p>
      <form onSubmit={absenden}>
        <div>
          {anzeige.map((id) => {
            const l = daten.lieder.get(id)
            if (!l) return null
            const drin = schonDrin.has(id)
            const anderswo = belegt(id)
            const erlernt = l.status === 'erlernt'
            const zusatz = drin
              ? 'bereits eingetragen'
              : anderswo
                ? `schon ${terminKurz(anderswo)} eingetragen`
                : erlernt
                  ? ''
                  : 'noch nicht erlernt'
            return (
              <label key={id} className={'checkrow' + (erlernt && !drin && !anderswo ? '' : ' dim')}>
                <input
                  type="checkbox"
                  checked={drin || (!anderswo && gewaehlt.has(id))}
                  disabled={drin || !!anderswo || !erlernt}
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
