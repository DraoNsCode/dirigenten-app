import { useState } from 'react'
import { Kopf } from '../bausteine'
import { useNav } from '../navigation'
import { supabase } from '../supabase'
import { Abmelden, Datei, Plus, Rechts, Wochen } from '../symbole'

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
      <Kopf eyebrow="Weitere Funktionen" titel="Menü" />

      <ul className="menu">
        <li>
          <button className="menubtn" type="button" onClick={() => nav.geh({ v: 'wochen' })}>
            <Wochen />
            <span className="main">
              <span className="t">Wochenübersicht</span>
              <span className="d">Kalenderwochen dieses Monats und der nächsten drei; antippen führt in die Woche</span>
            </span>
            <Rechts size={18} />
          </button>
        </li>
        <li>
          <button className="menubtn" type="button" onClick={() => nav.geh({ v: 'neu' })}>
            <Plus />
            <span className="main">
              <span className="t">Lied hinzufügen</span>
              <span className="d">Lied außerhalb des Liederbuchs anlegen, Noten als PDF</span>
            </span>
            <Rechts size={18} />
          </button>
        </li>
        <li>
          {/* Übergangsweise: die frühere Sammlung, bis der Reiter „Übungen“ sie ersetzt */}
          <button className="menubtn" type="button" onClick={() => nav.reiter('sammlung')}>
            <Datei />
            <span className="main">
              <span className="t">Bisherige Übungssammlung</span>
              <span className="d">Übergangsweise: die frühere Sammlung mit Übungen und Erklärungen</span>
            </span>
            <Rechts size={18} />
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
