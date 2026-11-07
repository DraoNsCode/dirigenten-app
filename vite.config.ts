import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Die App liegt auf GitHub Pages unter /dirigenten-app/
// Stand der App (Zeitpunkt des Bauens, deutsche Zeit) – steht im Menü,
// damit man sieht, ob ein Update angekommen ist.
const stand = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date())

export default defineConfig({
  base: '/dirigenten-app/',
  plugins: [react()],
  define: {
    __STAND__: JSON.stringify(stand),
  },
})
