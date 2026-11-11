import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Schriften lokal mitgeliefert (keine Anfragen an Google-Server)
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import './styles.css'

import App from './App'

// Nach jeder Veröffentlichung haben nachgeladene Programmteile (z. B. der PDF-Export) neue Dateinamen;
// die alten gibt es nicht mehr. Eine App, die vorher geöffnet wurde, findet sie dann nicht
// („Importing a module script failed“). Dann einmal neu laden – mit einem Zeitstempel in der Adresse,
// damit nicht die zwischengespeicherte alte Startseite kommt. Höchstens einmal pro Minute, sonst
// erscheint der Fehler wie gewohnt.
const NEU_GELADEN = 'chorapp-neu-geladen'
window.addEventListener('vite:preloadError', (ereignis) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(NEU_GELADEN) ?? 0) < 60_000) return
    sessionStorage.setItem(NEU_GELADEN, String(Date.now()))
  } catch {
    return
  }
  ereignis.preventDefault()
  const url = new URL(window.location.href)
  url.searchParams.set('neu', String(Date.now()))
  window.location.replace(url.toString())
})
// Den Zeitstempel nach dem Neuladen wieder aus der Adresse nehmen
if (new URL(window.location.href).searchParams.has('neu')) {
  const url = new URL(window.location.href)
  url.searchParams.delete('neu')
  history.replaceState(history.state, '', url.toString())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
