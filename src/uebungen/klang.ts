// Klang: ein kleiner Synthesizer im Browser (Web Audio), übertragen aus der Vorschau der Übungssammlung.
// Er braucht keine Klangdateien. Es spielt immer nur eine Sache; Neues beendet das Laufende.

export type Ereignis =
  | { ton: number; start: number; dauer: number; staerke?: number }
  | { schlag: 'metronom' | 'sprechen' | 'klatschen'; staerke: number; start: number; dauer?: number }

export type Marke = { ms: number }

type Laufend = { id: number; aus: GainNode; timer?: number; raf?: number; beimEnde?: () => void }

let ctx: AudioContext | null = null
let laufend: Laufend | null = null
let naechsteId = 1
let rauschen: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    // iPhone: auch bei stummgeschaltetem Gerät hörbar (Safari ab 16.4)
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/**
 * Gehaltener, stimmähnlicher Ton: weicher Einsatz, gleichbleibend bis zum Notenende, kurzes Ausklingen.
 * Folgetöne überlappen das Ausklingen, so klingt eine gebundene Linie ohne Lücke.
 */
function ton(ac: AudioContext, aus: AudioNode, midi: number, t0: number, dauer: number, staerke: number) {
  const f = hz(midi)
  const ende = t0 + Math.max(dauer, 0.12)
  const spitze = 0.22 * (staerke / 100)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(spitze, t0 + 0.035)
  g.gain.setTargetAtTime(spitze * 0.8, t0 + 0.035, 0.12)
  g.gain.setTargetAtTime(0.0001, ende, 0.035)
  const tp = ac.createBiquadFilter()
  tp.type = 'lowpass'
  tp.frequency.value = Math.min(5000, f * 6)
  const o1 = ac.createOscillator()
  const o2 = ac.createOscillator()
  const g2 = ac.createGain()
  o1.type = 'triangle'
  o1.frequency.value = f
  o2.type = 'sine'
  o2.frequency.value = f * 2
  g2.gain.value = 0.22
  o1.connect(tp)
  o2.connect(g2)
  g2.connect(tp)
  tp.connect(g)
  g.connect(aus)
  o1.start(t0)
  o2.start(t0)
  o1.stop(ende + 0.25)
  o2.stop(ende + 0.25)
}

/** Ungestimmter Schlag für Metronom, gesprochene und geklatschte Rhythmen */
function schlag(ac: AudioContext, aus: AudioNode, t0: number, staerke: number, art: 'metronom' | 'sprechen' | 'klatschen') {
  const g = ac.createGain()
  const spitze = (art === 'metronom' ? 0.28 : 0.5) * staerke
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(spitze, t0 + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (art === 'klatschen' ? 0.11 : 0.07))
  g.connect(aus)
  if (art === 'klatschen') {
    if (!rauschen) {
      rauschen = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.15), ac.sampleRate)
      const d = rauschen.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const q = ac.createBufferSource()
    const bp = ac.createBiquadFilter()
    q.buffer = rauschen
    bp.type = 'bandpass'
    bp.frequency.value = 1500
    bp.Q.value = 0.9
    q.connect(bp)
    bp.connect(g)
    q.start(t0)
    q.stop(t0 + 0.15)
  } else {
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = staerke > 0.8 ? 1180 : 880
    o.connect(g)
    o.start(t0)
    o.stop(t0 + 0.09)
  }
}

/** Beendet, was gerade spielt */
export function stoppen() {
  const l = laufend
  if (!l || !ctx) return
  laufend = null
  try {
    l.aus.gain.cancelScheduledValues(ctx.currentTime)
    l.aus.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
  } catch {
    // schon beendet
  }
  window.setTimeout(() => {
    try {
      l.aus.disconnect()
    } catch {
      // schon getrennt
    }
  }, 300)
  if (l.timer) window.clearTimeout(l.timer)
  if (l.raf) cancelAnimationFrame(l.raf)
  l.beimEnde?.()
}

/** Beendet nur, wenn `id` gerade spielt (z. B. beim Verlassen einer Seite) */
export function stoppenWenn(id: number | null) {
  if (id !== null && laufend?.id === id) stoppen()
}

/**
 * Spielt Ereignisse ab (Zeiten in Sekunden). Marken (Millisekunden) werden im Takt der Audio-Uhr gemeldet,
 * etwa um Noten mitzumarkieren. Gibt eine Kennung zurück, oder null, wenn nichts abgespielt werden kann.
 */
export function spielen<M extends Marke>(
  ereignisse: Ereignis[],
  optionen: { marken?: M[]; beiMarke?: (m: M) => void; beimEnde?: () => void } = {},
): number | null {
  stoppen()
  const ac = audio()
  if (!ac || !ereignisse.length) return null
  const aus = ac.createGain()
  aus.gain.value = 1
  aus.connect(ac.destination)
  const t0 = ac.currentTime + 0.06
  let letzte = 0
  for (const e of ereignisse) {
    if ('schlag' in e) schlag(ac, aus, t0 + e.start, e.staerke, e.schlag)
    else ton(ac, aus, e.ton, t0 + e.start, e.dauer, e.staerke ?? 90)
    letzte = Math.max(letzte, e.start + (e.dauer ?? 0.1))
  }
  const ich: Laufend = { id: naechsteId++, aus, beimEnde: optionen.beimEnde }
  laufend = ich
  const marken = optionen.marken ?? []
  if (marken.length && optionen.beiMarke) {
    const verzoegerung = (ac.outputLatency || 0) + (ac.baseLatency || 0)
    let gezeigt = -1
    const tick = () => {
      if (laufend !== ich) return
      const jetzt = (ac.currentTime - t0 - verzoegerung) * 1000
      let j = gezeigt
      while (j + 1 < marken.length && marken[j + 1].ms <= jetzt) j++
      if (j !== gezeigt) {
        gezeigt = j
        optionen.beiMarke!(marken[j])
      }
      ich.raf = requestAnimationFrame(tick)
    }
    ich.raf = requestAnimationFrame(tick)
  }
  ich.timer = window.setTimeout(() => {
    if (laufend === ich) stoppen()
  }, (letzte + 0.25) * 1000)
  return ich.id
}

/** Metronomschläge von `von` bis `bis` (Sekunden); der erste Schlag jedes Takts ist betont */
export function metronom(von: number, bis: number, schlagSek: number, proTakt: number): Ereignis[] {
  const r: Ereignis[] = []
  for (let t = von, n = 0; t < bis - 1e-6; t += schlagSek, n++) {
    r.push({ schlag: 'metronom', staerke: n % proTakt === 0 ? 1 : 0.6, start: t, dauer: 0.05 })
  }
  return r
}

/** Metronom entlang der tatsächlichen Takte (bei Taktwechsel); der erste Schlag jedes Takts ist betont */
export function metronomTakte(anfaenge: number[], bis: number, schlagSek: number): Ereignis[] {
  const r: Ereignis[] = []
  anfaenge.forEach((s, i) => {
    const e = i + 1 < anfaenge.length ? anfaenge[i + 1] : bis
    for (let t = s, n = 0; t < e - schlagSek / 4; t += schlagSek, n++) {
      r.push({ schlag: 'metronom', staerke: n === 0 ? 1 : 0.6, start: t, dauer: 0.05 })
    }
  })
  return r
}
