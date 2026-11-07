import { useState } from 'react'
import { supabase } from '../supabase'
import { Abmelden, Kalender, Noten, Plus } from '../symbole'

declare const __STAND__: string

export default function Menue({ email }: { email: string }) {
  const [laeuft, setLaeuft] = useState(false)

  async function abmelden() {
    setLaeuft(true)
    await supabase.auth.signOut()
    // Nach dem Abmelden zeigt die App von selbst wieder die Anmeldung.
  }

  return (
    <>
      <header className="head">
        <div className="eyebrow">Seltener gebraucht</div>
        <h1>Menü</h1>
        <div className="goldline" />
      </header>

      <ul className="menu">
        <li>
          <button className="menubtn" type="button" disabled>
            <Kalender />
            <span className="main">
              <span className="t">Gottesdienste</span>
              <span className="d">kommt mit der Woche</span>
            </span>
          </button>
        </li>
        <li>
          <button className="menubtn" type="button" disabled>
            <Noten />
            <span className="main">
              <span className="t">Proben</span>
              <span className="d">kommt mit der Woche</span>
            </span>
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
