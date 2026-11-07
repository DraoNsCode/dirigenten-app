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
