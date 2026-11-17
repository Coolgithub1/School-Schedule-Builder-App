// Desktop test for screenshot import: runs the exact same parser and OCR engine
// (Tesseract.js + best_int English model) the app uses on phones.
//
//   npm run test:ocr                                  (all fixtures in test/fixtures)
//   node scripts/test-ocr.mjs path/to/schedule.png [more.png ...]
//   node scripts/test-ocr.mjs shot.png --expect "VCD 421@0:11-14,ART 207@2:9-12"
//
// --expect lists code@day:start-end blocks (day 0 = Monday); the run fails if any differ.
import { createWorker, OEM } from "tesseract.js"
import fs from "node:fs"
import path from "node:path"
import { readSchedule } from "../src/lib/scheduleOcr.ts"

const root = path.resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const expectIdx = () => args.indexOf("--expect")
const passIdx = args.indexOf("--passes")
const passes = passIdx >= 0 ? args.splice(passIdx, 2)[1].split(",") : undefined
const cliExpect = expectIdx() >= 0 ? args.splice(expectIdx(), 2)[1].split(",").map((s) => s.trim()) : null
const jobs = args.length
  ? args.map((file) => ({ file, expect: cliExpect }))
  : JSON.parse(fs.readFileSync(path.join(root, "test/fixtures/fixtures.json"), "utf8")).map((f) => ({
      file: path.join("test/fixtures", f.file),
      expect: f.expect,
    }))

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const worker = await createWorker("eng", OEM.LSTM_ONLY, {
  langPath: path.join(root, "node_modules/@tesseract.js-data/eng/4.0.0_best_int"),
  gzip: true,
  cacheMethod: "none",
})

const flatten = (data) => {
  const words = []
  const lines = []
  const box = (b) => ({ text: b.text, confidence: b.confidence, ...b.bbox })
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines) {
        lines.push(box(line))
        for (const w of line.words) words.push(box(w))
      }
  return { words, lines }
}

const engine = {
  async recognize(image, { psm, rect, whitelist, threshold }) {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: whitelist ?? "",
      thresholding_method: { global: "0", "local-otsu": "1", sauvola: "2" }[threshold ?? "global"],
    })
    const { data } = await worker.recognize(image, rect ? { rectangle: rect } : {}, { blocks: true })
    return flatten(data)
  },
}

let failed = false
for (const { file, expect: expected } of jobs) {
  const started = Date.now()
  console.log(`\n▶ ${file}`)
  try {
    const result = await readSchedule(engine, path.resolve(file), { passes })
    for (const c of result.classes)
      console.log(`  ${c.name.padEnd(9)} ${c.days.map((d) => DAYS[d]).join(", ").padEnd(14)} ${c.start}:00–${c.start + c.duration}:00`)
    console.log(`  → ${result.classes.length} classes, ${result.hoursPerWeek} hrs/week in ${((Date.now() - started) / 1000).toFixed(1)}s`)
    for (const w of result.warnings) console.log(`  ⚠ ${w}`)
    if (expected) {
      const got = result.classes.flatMap((c) => c.days.map((d) => `${c.name}@${d}:${c.start}-${c.start + c.duration}`))
      const missing = expected.filter((e) => !got.includes(e))
      const extra = got.filter((g) => !expected.includes(g))
      if (missing.length || extra.length) {
        failed = true
        console.log(`  ✗ mismatch\n    missing: ${missing.join(", ") || "—"}\n    unexpected: ${extra.join(", ") || "—"}`)
      } else console.log("  ✓ matches expected schedule")
    }
  } catch (e) {
    failed = true
    console.log(`  ✗ ${e.message}`)
  }
}
await worker.terminate()
process.exit(failed ? 1 : 0)
