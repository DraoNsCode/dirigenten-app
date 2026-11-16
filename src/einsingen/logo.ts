import { supabase } from '../supabase'

// Gemeindelogo für die Deckfolie der Probenfolien: Dornenkrone, die in eine Königskrone übergeht (Design-System
// „Baptistengemeinde Hanau“). Es liegt privat im Supabase-Speicher „uebungen“ – hochgeladen vom GitHub-Ablauf des
// privaten Repos dirigenten-app-uebungen (bilder/) – und nicht in diesem öffentlichen Repository (Daniel, 16.11.2026).
// Nicht verzerren, nicht umfärben, nicht mit Text überlagern.

const SPEICHER = 'uebungen'
const DATEI = 'logo-gemeinde.png'

export type Logo = { daten: string; breite: number; hoehe: number }

let geladen: Promise<Logo> | null = null

export function ladeLogo(): Promise<Logo> {
  geladen ??= (async () => {
    const { data: blob, error } = await supabase.storage.from(SPEICHER).download(DATEI)
    if (error) throw error
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const bild = await createImageBitmap(blob)
    const logo = { daten: btoa(s), breite: bild.width, hoehe: bild.height }
    bild.close()
    return logo
  })()
  geladen.catch(() => (geladen = null))
  return geladen
}
