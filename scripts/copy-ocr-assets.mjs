// Copies the on-device OCR engine (Tesseract.js worker + WebAssembly core) and
// the English model into public/ocr so the app serves them itself — screenshots
// are read entirely in the browser and nothing is fetched from third-party CDNs.
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const out = path.join(root, "public/ocr")
fs.mkdirSync(out, { recursive: true })

const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // The worker picks one of these depending on the device's WebAssembly SIMD support.
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  // "best_int": the more accurate LSTM model, and only ~3 MB compressed.
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
]

for (const [from, to] of files) {
  const src = path.join(root, from)
  const dest = path.join(out, to)
  if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) continue
  fs.copyFileSync(src, dest)
}
console.log(`OCR assets ready in public/ocr (${files.length} files)`)
