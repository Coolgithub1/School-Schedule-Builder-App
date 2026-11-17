// Browser wrapper around Tesseract.js: OCR runs in a Web Worker on the user's
// device, using engine files served by this app (see scripts/copy-ocr-assets.mjs).
import { createWorker, OEM } from "tesseract.js"
import type { OcrBox, OcrEngine, OcrResult } from "./scheduleOcr"

export type OcrProgress = { stage: "loading" | "reading"; progress: number }

type TBox = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }
type TBlock = { paragraphs: { lines: (TBox & { words: TBox[] })[] }[] }

const toBox = (b: TBox): OcrBox => ({ text: b.text, confidence: b.confidence, ...b.bbox })

function flatten(blocks: TBlock[] | null | undefined): OcrResult {
  const words: OcrBox[] = []
  const lines: OcrBox[] = []
  for (const block of blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines) {
        lines.push(toBox(line))
        for (const w of line.words) words.push(toBox(w))
      }
  return { words, lines }
}

export async function createDeviceOcr(onProgress?: (p: OcrProgress) => void) {
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return
      onProgress(
        m.status === "recognizing text"
          ? { stage: "reading", progress: m.progress }
          : { stage: "loading", progress: m.progress },
      )
    },
  })

  const engine: OcrEngine = {
    async recognize(image, { psm, rect, whitelist }) {
      await worker.setParameters({
        tessedit_pageseg_mode: psm as never,
        tessedit_char_whitelist: whitelist ?? "",
      })
      const { data } = await worker.recognize(image as File, rect ? { rectangle: rect } : {}, { blocks: true })
      return flatten(data.blocks as unknown as TBlock[])
    },
  }
  return { engine, terminate: () => worker.terminate() }
}
