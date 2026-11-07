import { useState } from 'react'
import { Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { supabase } from '../supabase'
import { Abmelden, Kalender, Noten, Plus, Rechts } from '../symbole'

declare const __STAND__: string

export default function Menue({ email }: { email: string }) {
  const nav = useNav()
  const [laeuft, setLaeuft] = useState(false)

  async function abmelden() {
    setLaeuft(true)
    await supabase.auth.signOut()
    // Nach dem Abmelden zeigt die App von selbst wieder die Anmeldung.
  }

  return (
    <>
      <Kopf eyebrow="Seltener gebraucht" titel="Menü" />

      <ul className="menu">
        <li>
          <button className="menubtn" type="button" onClick={() => nav.geh({ v: 'liste', art: 'gd' })}>
            <Kalender />
            <span className="main">
              <span className="t">Gottesdienste</span>
              <span className="d">Liste aller Gottesdienste; antippen führt in die Woche zum Nachtragen oder Korrigieren</span>
            </span>
            <Rechts size={18} />
          </button>
        </li>
        <li>
          <button className="menubtn" type="button" onClick={() => nav.geh({ v: 'liste', art: 'pr' })}>
            <Noten />
            <span className="main">
              <span className="t">Proben</span>
              <span className="d">Liste aller Proben; antippen führt in die Woche</span>
            </span>
            <Rechts size={18} />
          </button>
        </li>
        <li>
          <button className="menubtn" type="button" disabled>
            <Plus />
            <span className="main">
              <span className="t">Lied hinzufügen</span>
              <span className="d">kommt in einer späteren Version</span>
            </span>
          </button>
        </li>
      </ul>

      <section className="card">
        <h2>Anmeldung</h2>
        <p>Angemeldet als {email}</p>
        <button className="textbtn" type="button" onClick={abmelden} disabled={laeuft}>
          <Abmelden />
          Abmelden
        </button>
      </section>

      <p className="note">Stand der App: {__STAND__}</p>
    </>
  )
}
