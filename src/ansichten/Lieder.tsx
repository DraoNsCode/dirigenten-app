import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Datei } from '../symbole'

// Reiter „Lieder“ – im Grundgerüst nur eine Verbindungsprüfung:
// Sind die Lieder aus der Datenbank und die Noten aus dem Speicher erreichbar?
// Kommt im nächsten Bauschritt: Liedliste mit Suche, Filtern und Lied-Seite.

type Pruefung =
  | { stand: 'laeuft' }
  | { stand: 'ok'; anzahl: number; notenUrl: string | null }
  | { stand: 'fehler'; text: string }

export default function Lieder() {
  const [pruefung, setPruefung] = useState<Pruefung>({ stand: 'laeuft' })

  useEffect(() => {
    let aktiv = true
    ;(async () => {
      const { count, error } = await supabase.from('lieder').select('id', { count: 'exact', head: true })
      if (!aktiv) return
      if (error) return setPruefung({ stand: 'fehler', text: 'Datenbank nicht erreichbar: ' + error.message })

      const { data: lied } = await supabase
        .from('lieder')
        .select('noten_pfad')
        .eq('kuerzel', 'D')
        .eq('nummer', 1)
        .maybeSingle()
      let notenUrl: string | null = null
      if (lied?.noten_pfad) {
        const { data } = await supabase.storage.from('noten').createSignedUrl(lied.noten_pfad, 600)
        notenUrl = data?.signedUrl ?? null
      }
      if (aktiv) setPruefung({ stand: 'ok', anzahl: count ?? 0, notenUrl })
    })()
    return () => {
      aktiv = false
    }
  }, [])

  return (
    <>
      <header className="head">
        <div className="eyebrow">Repertoire</div>
        <h1>Lieder</h1>
        <div className="goldline" />
      </header>
      <section className="card" aria-live="polite">
        <h2>Verbindung</h2>
        {pruefung.stand === 'laeuft' && <p className="note">Wird geprüft …</p>}
        {pruefung.stand === 'fehler' && <p className="status-fehler">{pruefung.text}</p>}
        {pruefung.stand === 'ok' && (
          <>
            <p className="status-ok">{pruefung.anzahl} Lieder in der Datenbank.</p>
            {pruefung.notenUrl ? (
              <a className="textbtn" href={pruefung.notenUrl} target="_blank" rel="noopener noreferrer">
                <Datei />
                Noten von D 1 öffnen
              </a>
            ) : (
              <p className="status-fehler">Noten nicht erreichbar.</p>
            )}
          </>
        )}
      </section>
      <p className="note">Die Liedliste mit Suche und Filtern kommt im nächsten Bauschritt.</p>
    </>
  )
}
