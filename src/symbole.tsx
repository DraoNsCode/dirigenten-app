// Symbole (Linien-Icons, 24er-Raster), übernommen aus dem Prototyp.

type Props = { size?: number }

const basis = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export function Kalender({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function Noten({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  )
}

export function Stimmgabel({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M8.5 3v7.5a3.5 3.5 0 0 0 7 0V3" />
      <path d="M12 14v7" />
    </svg>
  )
}

export function MenueSymbol({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function Plus({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Abmelden({ size = 20 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

export function Datei({ size = 20 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  )
}

export function Links({ size = 22 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function Rechts({ size = 22 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function Kreuz({ size = 16 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function Haken({ size = 18 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2.2}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function Uebernehmen({ size = 18 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

export function Info({ size = 14 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  )
}

export function Lupe({ size = 18 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

export function Runter({ size = 14 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function PfeilHoch({ size = 18 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  )
}

export function PfeilRunter({ size = 18 }: Props) {
  return (
    <svg {...basis(size)} strokeWidth={2}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

/** Einsingen: Stimme mit Schallbögen */
export function Einsingen({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  )
}

export function Folien({ size = 22 }: Props) {
  return (
    <svg {...basis(size)}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v4M8 20h8" />
    </svg>
  )
}
