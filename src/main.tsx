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
import Hochkant from './Hochkant'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Hochkant />
  </StrictMode>,
)
