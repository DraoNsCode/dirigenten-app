import type { ReactNode } from 'react'
import { Datei, Kreuz } from '../symbole'

// Auswahl einer Noten-PDF für Lieder außerhalb des Liederbuchs.

/** Knopf, der die Dateiauswahl öffnet (auf dem iPhone: Dateien-App) */
export function DateiKnopf({
  onWahl,
  className,
  deaktiviert,
  children,
}: {
  onWahl: (datei: File) => void
  className: string
  deaktiviert?: boolean
  children: ReactNode
}) {
  return (
    <label className={className + ' dateiknopf' + (deaktiviert ? ' aus' : '')}>
      <input
        type="file"
        accept="application/pdf,.pdf"
        disabled={deaktiviert}
        onChange={(e) => {
          const d = e.target.files?.[0]
          e.target.value = '' // dieselbe Datei lässt sich erneut wählen
          if (d) onWahl(d)
        }}
      />
      {children}
    </label>
  )
}

export const groesse = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Gewählte Datei anzeigen oder eine wählen lassen */
export function NotenWahl({
  datei,
  onWahl,
  onEntfernen,
}: {
  datei: File | null
  onWahl: (datei: File) => void
  onEntfernen: () => void
}) {
  if (!datei) {
    return (
      <DateiKnopf className="dateifeld" onWahl={onWahl}>
        <Datei />
        <span>PDF auswählen</span>
        <span className="later">wahlweise</span>
      </DateiKnopf>
    )
  }
  return (
    <div className="dateifeld gewaehlt">
      <Datei />
      <span className="dateiname">{datei.name}</span>
      <span className="later">{groesse(datei.size)}</span>
      <button className="xbtn" type="button" aria-label="Gewählte PDF entfernen" onClick={onEntfernen}>
        <Kreuz />
      </button>
    </div>
  )
}
