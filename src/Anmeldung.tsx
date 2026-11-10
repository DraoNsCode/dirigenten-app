import { useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

function fehlertext(error: AuthError): string {
  if (error.code === 'invalid_credentials') return 'E-Mail oder Passwort stimmt nicht.'
  if (error.status === 429) return 'Zu viele Versuche. Bitte einen Moment warten und dann noch einmal versuchen.'
  if (error.name === 'AuthRetryableFetchError' || !error.status) return 'Keine Verbindung. Bitte prüfe das Internet und versuche es noch einmal.'
  return 'Anmeldung nicht möglich: ' + error.message
}

export default function Anmeldung() {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function anmelden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaeuft(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: passwort })
    setLaeuft(false)
    if (error) setFehler(fehlertext(error))
    // Bei Erfolg wechselt die App von selbst zur Startseite (siehe App.tsx).
  }

  return (
    <div className="login">
      <header className="head">
        <div className="eyebrow">Gemeindechor</div>
        <h1>Dirigenten-App</h1>
        <div className="goldline" />
      </header>
      <p className="note">
        Nur für die Dirigenten. Einmal anmelden, danach bleibt dieses Handy angemeldet.
      </p>
      <form onSubmit={anmelden} noValidate>
        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="passwort">Passwort</label>
          <input
            id="passwort"
            type="password"
            autoComplete="current-password"
            required
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
          />
        </div>
        {fehler && (
          <p className="fehler" role="alert">
            {fehler}
          </p>
        )}
        <button className="primary" type="submit" disabled={laeuft || !email.trim() || !passwort}>
          {laeuft ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
