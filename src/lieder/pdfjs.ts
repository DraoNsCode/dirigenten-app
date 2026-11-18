// pdf.js (Mozilla) wird erst geladen, wenn es gebraucht wird (legacy-Ausgabe, auch für ältere iPhones).
// Genutzt von der Folienansicht und von der Notenanalyse der Lieder.

export type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

let pdfjsLaden: Promise<Pdfjs> | null = null

export function ladePdfjs(): Promise<Pdfjs> {
  pdfjsLaden ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })()
  pdfjsLaden.catch(() => (pdfjsLaden = null))
  return pdfjsLaden
}
