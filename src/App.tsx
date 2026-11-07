import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Anmeldung from './Anmeldung'
import Leiste, { type Reiter } from './Leiste'
import Woche from './ansichten/Woche'
import Lieder from './ansichten/Lieder'
import Menue from './ansichten/Menue'

export default function App() {
  // undefined = wird noch geprüft, null = nicht angemeldet
  const [sitzung, setSitzung] = useState<Session | null | undefined>(undefined)
  const [reiter, setReiter] = useState<Reiter>('woche')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSitzung(data.session))
    const { data } = supabase.auth.onAuthStateChange((_ereignis, session) => setSitzung(session))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sitzung === undefined) {
    return (
      <div className="app">
        <div className="laden">Lädt …</div>
      </div>
    )
  }

  if (!sitzung) return <Anmeldung />

  return (
    <div className="app">
      <main className="view" key={reiter}>
        {reiter === 'woche' && <Woche />}
        {reiter === 'lieder' && <Lieder />}
        {reiter === 'menue' && <Menue email={sitzung.user.email ?? ''} />}
      </main>
      <Leiste aktiv={reiter} onWechsel={setReiter} />
    </div>
  )
}
