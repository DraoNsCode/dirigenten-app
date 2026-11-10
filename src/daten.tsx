import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Zeile } from './datenbank.types'
import { ereignisId, heute, type Ereignis } from './kalender'
import { useMeldung } from './meldung'

export type Lied = Zeile<'lieder'>
export type Thema = Zeile<'kategorien'>
export type Person = Zeile<'dirigenten'>
export type Eintrag = Pick<Zeile<'eintraege'>, 'datum' | 'termin' | 'lied_id' | 'erstellt_am'>

export type LiedAenderung = Partial<Pick<Lied, 'status' | 'dirigent_id' | 'klavierspieler_id'>>

/** Angaben für ein neues Lied außerhalb des Liederbuchs; Kürzel (ZD/ZR) und Nummer vergibt die Datenbank */
export type NeuesLied = Pick<Lied, 'titel' | 'kategorie_id' | 'schwierigkeit' | 'status' | 'dirigent_id' | 'klavierspieler_id'> & {
  sprache: 'D' | 'R'
}

/** Größte erlaubte Noten-Datei (wie im Speicher eingestellt) */
export const NOTEN_MAX_BYTES = 20 * 1024 * 1024

/** Prüft eine gewählte Noten-Datei; gibt einen Hinweistext zurück oder null, wenn sie passt */
export function notenPruefen(datei: File): string | null {
  const istPdf = datei.type === 'application/pdf' || /\.pdf$/i.test(datei.name)
  if (!istPdf) return 'Bitte eine PDF-Datei wählen.'
  if (datei.size > NOTEN_MAX_BYTES) return 'Die PDF ist größer als 20 MB.'
  return null
}

type Stand = { art: 'laedt' } | { art: 'bereit' } | { art: 'fehler'; text: string }

type Statistik = {
  /** wie oft im laufenden Kalenderjahr in Gottesdiensten eingetragen */
  anzahlJahr: Map<number, number>
  /** letztes Datum (JJJJ-MM-TT) eines Gottesdienstes mit diesem Lied */
  zuletzt: Map<number, string>
}

type DatenKontext = {
  stand: Stand
  lieder: Map<number, Lied>
  liederListe: Lied[]
  /** Themen (in der Datenbank: kategorien), in Anzeigereihenfolge */
  themen: Thema[]
  dirigenten: Person[]
  klavierspieler: Person[]
  /** Lied-IDs je Ereignis-Kennung, in der Reihenfolge des Eintragens */
  proEreignis: Map<string, number[]>
  /** Ereignis-Kennungen, zu denen es Einträge gibt */
  ereignisIds: string[]
  offeneHinweise: Map<number, number>
  statistik: Statistik
  neuLaden: () => Promise<void>
  eintragen: (ev: Ereignis, liedId: number) => Promise<boolean>
  entfernen: (ev: Ereignis, liedId: number) => Promise<boolean>
  uebernehmen: (ev: Ereignis, liedIds: number[]) => Promise<number>
  /** In der App änderbare Angaben eines Liedes: Status, Dirigent, Klavierspieler */
  aendereLied: (liedId: number, aenderung: LiedAenderung) => Promise<boolean>
  /** Anzahl offener Hinweise eines Liedes nach Änderungen auf der Lied-Seite */
  setzeOffeneHinweise: (liedId: number, anzahl: number) => void
  /** Lied außerhalb des Liederbuchs anlegen; gibt das neue Lied zurück oder null */
  liedAnlegen: (neu: NeuesLied) => Promise<Lied | null>
  /** Noten eines Zettel-Liedes hochladen, ersetzen (datei) oder entfernen (null); gibt einen Fehlertext oder null zurück */
  notenSetzen: (lied: Lied, datei: File | null) => Promise<string | null>
  /** Zettel-Lied ganz löschen, mit Einträgen und Hinweisen; vorher wird `davor` ausgeführt (z. B. Seite schließen) */
  liedLoeschen: (liedId: number, davor?: () => void) => Promise<boolean>
}

const Kontext = createContext<DatenKontext | null>(null)

export function useDaten() {
  const k = useContext(Kontext)
  if (!k) throw new Error('useDaten außerhalb von DatenProvider')
  return k
}

const SEITE = 1000 // Supabase liefert höchstens 1000 Zeilen je Anfrage

async function alleEintraege(): Promise<Eintrag[]> {
  const r: Eintrag[] = []
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await supabase
      .from('eintraege')
      .select('datum, termin, lied_id, erstellt_am')
      .order('erstellt_am')
      .order('id')
      .range(von, von + SEITE - 1)
    if (error) throw error
    r.push(...data)
    if (data.length < SEITE) return r
  }
}

const istDoppelt = (e: { code?: string } | null) => e?.code === '23505'

export function DatenProvider({ children }: { children: ReactNode }) {
  const zeige = useMeldung()
  const [stand, setStand] = useState<Stand>({ art: 'laedt' })
  const [liederListe, setLiederListe] = useState<Lied[]>([])
  const [themen, setThemen] = useState<Thema[]>([])
  const [dirigenten, setDirigenten] = useState<Person[]>([])
  const [klavierspieler, setKlavierspieler] = useState<Person[]>([])
  const [eintraege, setEintraege] = useState<Eintrag[]>([])
  const [offeneHinweise, setOffeneHinweise] = useState<Map<number, number>>(new Map())
  const zuletztGeladen = useRef(0)

  const neuLaden = useCallback(async () => {
    try {
      const [l, e, h, k, d, kl] = await Promise.all([
        supabase.from('lieder').select('*').order('kuerzel').order('nummer'),
        alleEintraege(),
        supabase.from('hinweise').select('lied_id').eq('geschlossen', false),
        supabase.from('kategorien').select('*').order('reihenfolge'),
        supabase.from('dirigenten').select('*').order('reihenfolge'),
        supabase.from('klavierspieler').select('*').order('reihenfolge'),
      ])
      for (const r of [l, h, k, d, kl]) if (r.error) throw r.error
      const zaehler = new Map<number, number>()
      for (const x of h.data ?? []) zaehler.set(x.lied_id, (zaehler.get(x.lied_id) ?? 0) + 1)
      setLiederListe(l.data ?? [])
      setThemen(k.data ?? [])
      setDirigenten(d.data ?? [])
      setKlavierspieler(kl.data ?? [])
      setEintraege(e)
      setOffeneHinweise(zaehler)
      setStand({ art: 'bereit' })
      zuletztGeladen.current = Date.now()
    } catch (err) {
      const text = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
      setStand((s) => (s.art === 'bereit' ? s : { art: 'fehler', text }))
      if (zuletztGeladen.current) zeige('Aktualisieren fehlgeschlagen – keine Verbindung?')
    }
  }, [zeige])

  // Beim Start laden; beim Zurückkehren in die App neu laden (Änderungen des anderen Dirigenten)
  useEffect(() => {
    neuLaden()
    const sichtbar = () => {
      if (document.visibilityState === 'visible' && Date.now() - zuletztGeladen.current > 20_000) neuLaden()
    }
    document.addEventListener('visibilitychange', sichtbar)
    return () => document.removeEventListener('visibilitychange', sichtbar)
  }, [neuLaden])

  const lieder = useMemo(() => new Map(liederListe.map((l) => [l.id, l])), [liederListe])

  const proEreignis = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const e of eintraege) {
      const id = ereignisId(e.datum, e.termin)
      const liste = m.get(id)
      if (liste) liste.push(e.lied_id)
      else m.set(id, [e.lied_id])
    }
    return m
  }, [eintraege])

  const ereignisIds = useMemo(() => Array.from(proEreignis.keys()), [proEreignis])

  const statistik = useMemo<Statistik>(() => {
    const jahr = String(heute().getFullYear())
    const anzahlJahr = new Map<number, number>()
    const zuletzt = new Map<number, string>()
    for (const e of eintraege) {
      if (e.termin === 'pr') continue
      if (e.datum.startsWith(jahr)) anzahlJahr.set(e.lied_id, (anzahlJahr.get(e.lied_id) ?? 0) + 1)
      const z = zuletzt.get(e.lied_id)
      if (!z || e.datum > z) zuletzt.set(e.lied_id, e.datum)
    }
    return { anzahlJahr, zuletzt }
  }, [eintraege])

  const eintragen = useCallback(
    async (ev: Ereignis, liedId: number) => {
      if (proEreignis.get(ev.id)?.includes(liedId)) return true
      const neu: Eintrag = { datum: ev.iso, termin: ev.termin, lied_id: liedId, erstellt_am: new Date().toISOString() }
      setEintraege((alt) => [...alt, neu])
      const { error } = await supabase.from('eintraege').insert({ datum: ev.iso, termin: ev.termin, lied_id: liedId })
      if (error && !istDoppelt(error)) {
        setEintraege((alt) => alt.filter((x) => x !== neu))
        zeige('Nicht gespeichert – keine Verbindung?')
        return false
      }
      return true
    },
    [proEreignis, zeige],
  )

  const entfernen = useCallback(
    async (ev: Ereignis, liedId: number) => {
      const vorher = eintraege
      setEintraege((alt) => alt.filter((x) => !(x.datum === ev.iso && x.termin === ev.termin && x.lied_id === liedId)))
      const { error } = await supabase
        .from('eintraege')
        .delete()
        .eq('datum', ev.iso)
        .eq('termin', ev.termin)
        .eq('lied_id', liedId)
      if (error) {
        setEintraege(vorher)
        zeige('Nicht entfernt – keine Verbindung?')
        return false
      }
      return true
    },
    [eintraege, zeige],
  )

  const uebernehmen = useCallback(
    async (ev: Ereignis, liedIds: number[]) => {
      const schon = new Set(proEreignis.get(ev.id) ?? [])
      const offen = liedIds.filter((id) => !schon.has(id))
      if (!offen.length) return 0
      const jetzt = Date.now()
      const neu: Eintrag[] = offen.map((id, i) => ({
        datum: ev.iso,
        termin: ev.termin,
        lied_id: id,
        erstellt_am: new Date(jetzt + i).toISOString(),
      }))
      setEintraege((alt) => [...alt, ...neu])
      const zeilen = offen.map((id) => ({ datum: ev.iso, termin: ev.termin, lied_id: id }))
      let { error } = await supabase.from('eintraege').insert(zeilen)
      if (istDoppelt(error)) {
        // Der andere Dirigent hat inzwischen etwas eingetragen: einzeln versuchen
        error = null
        for (const z of zeilen) {
          const r = await supabase.from('eintraege').insert(z)
          if (r.error && !istDoppelt(r.error)) error = r.error
        }
      }
      if (error) {
        setEintraege((alt) => alt.filter((x) => !neu.includes(x)))
        zeige('Nicht übernommen – keine Verbindung?')
        return 0
      }
      return offen.length
    },
    [proEreignis, zeige],
  )

  const aendereLied = useCallback(
    async (liedId: number, aenderung: LiedAenderung) => {
      const vorher = liederListe.find((l) => l.id === liedId)
      const setze = (teil: LiedAenderung) =>
        setLiederListe((alt) => alt.map((l) => (l.id === liedId ? { ...l, ...teil } : l)))
      setze(aenderung)
      const { error } = await supabase.from('lieder').update(aenderung).eq('id', liedId)
      if (error) {
        if (vorher) setze({ status: vorher.status, dirigent_id: vorher.dirigent_id, klavierspieler_id: vorher.klavierspieler_id })
        zeige('Nicht gespeichert – keine Verbindung?')
        return false
      }
      return true
    },
    [liederListe, zeige],
  )

  const setzeOffeneHinweise = useCallback((liedId: number, anzahl: number) => {
    setOffeneHinweise((alt) => {
      const neu = new Map(alt)
      if (anzahl > 0) neu.set(liedId, anzahl)
      else neu.delete(liedId)
      return neu
    })
  }, [])

  const liedAnlegen = useCallback(
    async (neu: NeuesLied) => {
      const { data, error } = await supabase.from('lieder').insert(neu).select().single()
      if (error || !data) {
        zeige('Nicht angelegt – keine Verbindung?')
        return null
      }
      setLiederListe((alt) => [...alt, data].sort(nachKennung))
      return data
    },
    [zeige],
  )

  const notenSetzen = useCallback(async (lied: Lied, datei: File | null) => {
    const speicher = supabase.storage.from('noten')
    const alt = lied.noten_pfad
    let pfad: string | null = null
    if (datei) {
      const problem = notenPruefen(datei)
      if (problem) return problem
      // Eindeutiger Dateiname je Hochladen, z. B. zettel/ZD003-1731250000000.pdf
      pfad = `zettel/${lied.kuerzel}${String(lied.nummer).padStart(3, '0')}-${Date.now()}.pdf`
      const hoch = await speicher.upload(pfad, datei, { contentType: 'application/pdf', upsert: false })
      if (hoch.error) return 'Noten nicht hochgeladen – keine Verbindung?'
    }
    const { error } = await supabase.from('lieder').update({ noten_pfad: pfad }).eq('id', lied.id)
    if (error) {
      if (pfad) speicher.remove([pfad])
      return 'Nicht gespeichert – keine Verbindung?'
    }
    setLiederListe((liste) => liste.map((l) => (l.id === lied.id ? { ...l, noten_pfad: pfad } : l)))
    // Die alte Datei wird nicht mehr gebraucht
    if (alt?.startsWith('zettel/')) speicher.remove([alt])
    return null
  }, [])

  const liedLoeschen = useCallback(
    async (liedId: number, davor?: () => void) => {
      const { data, error } = await supabase.rpc('lied_loeschen', { lied: liedId })
      if (error) {
        if (error.code === 'P0002') {
          zeige('Lied nicht gefunden – schon gelöscht?')
          neuLaden()
        } else zeige('Nicht gelöscht – keine Verbindung?')
        return false
      }
      davor?.()
      setLiederListe((alt) => alt.filter((l) => l.id !== liedId))
      setEintraege((alt) => alt.filter((e) => e.lied_id !== liedId))
      setOffeneHinweise((alt) => {
        const neu = new Map(alt)
        neu.delete(liedId)
        return neu
      })
      if (data?.startsWith('zettel/')) supabase.storage.from('noten').remove([data])
      return true
    },
    [zeige, neuLaden],
  )

  const wert: DatenKontext = {
    stand,
    lieder,
    liederListe,
    themen,
    dirigenten,
    klavierspieler,
    proEreignis,
    ereignisIds,
    offeneHinweise,
    statistik,
    neuLaden,
    eintragen,
    entfernen,
    uebernehmen,
    aendereLied,
    setzeOffeneHinweise,
    liedAnlegen,
    notenSetzen,
    liedLoeschen,
  }
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>
}

// ---------- Hilfen für die Anzeige ----------

export const kennung = (l: Pick<Lied, 'kuerzel' | 'nummer'>) => `${l.kuerzel} ${l.nummer}`

export const STATUS_TEXT: Record<string, string> = {
  unbekannt: 'unbekannt',
  in_arbeit: 'in Arbeit',
  erlernt: 'erlernt',
}

/** Reihenfolge für Sortierungen: erlernt vor in Arbeit vor unbekannt */
export const STATUS_RANG: Record<string, number> = { erlernt: 0, in_arbeit: 1, unbekannt: 2 }

/** Nach Kennung sortieren: D, R, dann ZD, ZR (außerhalb des Liederbuchs), jeweils nach Nummer */
export const nachKennung = (a: Lied, b: Lied) => a.kuerzel.localeCompare(b.kuerzel) || a.nummer - b.nummer

/** Suchtext vereinheitlichen: Kleinbuchstaben, ohne Akzente/Umlautpunkte, ohne Apostrophe */
export const normal = (s: string) =>
  s
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, '')

/** Lieder nach Kennung („D 74“, „74“, „r13“, „R“) oder Titel suchen */
export function sucheLieder(liste: Lied[], eingabe: string, max = Infinity): Lied[] {
  const q = normal(eingabe.trim())
  if (!q) return []
  const kuerzel = new Set(liste.map((l) => normal(l.kuerzel)))
  const m = q.match(/^([^\d\s]*)\s*(\d*)$/)
  const istKennung = m && (m[2] !== '' || kuerzel.has(m[1])) && (m[1] === '' || kuerzel.has(m[1]))
  let r: Lied[]
  if (istKennung && m) {
    const k = m[1], n = m[2]
    r = liste.filter((l) => (!k || normal(l.kuerzel) === k) && (!n || String(l.nummer).startsWith(n)))
    r.sort(
      (a, b) =>
        Number(String(b.nummer) === n) - Number(String(a.nummer) === n) ||
        a.kuerzel.localeCompare(b.kuerzel) ||
        a.nummer - b.nummer,
    )
  } else {
    r = liste.filter((l) => normal(l.titel).includes(q))
  }
  return r.slice(0, max)
}
