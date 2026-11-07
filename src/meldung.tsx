import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// Kurze Rückmeldung unten über der Leiste („D 47 eingetragen“)

const Kontext = createContext<(text: string) => void>(() => {})

export const useMeldung = () => useContext(Kontext)

export function MeldungProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('')
  const [sichtbar, setSichtbar] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const zeige = useCallback((t: string) => {
    setText(t)
    setSichtbar(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSichtbar(false), 2000)
  }, [])

  return (
    <Kontext.Provider value={zeige}>
      {children}
      <div className={'toast' + (sichtbar ? ' show' : '')} role="status" aria-live="polite">
        {text}
      </div>
    </Kontext.Provider>
  )
}
