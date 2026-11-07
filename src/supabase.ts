import { createClient } from '@supabase/supabase-js'
import type { Database } from './datenbank.types'

// Öffentliche Angaben: Projektadresse und öffentlicher Schlüssel (publishable key).
// Sie dürfen im Code stehen; geschützt werden die Daten durch Anmeldung und Zugriffsregeln.
// Der geheime Schlüssel (service_role / secret) gehört NIE in diesen Code.
const SUPABASE_URL = 'https://ogajbvuvehudedkdhadx.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HZd-uDrhZvZPNOAnP5ZuJA_DhYuCBNc'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Einmal anmelden pro Gerät: Die Sitzung bleibt gespeichert und wird automatisch erneuert.
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'chorapp-anmeldung',
  },
})
