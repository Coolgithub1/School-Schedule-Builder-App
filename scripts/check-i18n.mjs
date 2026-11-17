// Lists English UI strings that have no Turkish translation in src/lib/tr.ts.
//   node scripts/check-i18n.mjs          (exit code 1 if anything is missing)
//   node scripts/check-i18n.mjs --keys   (print every key, for writing translations)
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const files = []
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(f.name)) files.push(p)
  }
}
walk(path.join(root, "src"))

const keys = new Set()
for (const f of files) {
  const src = fs.readFileSync(f, "utf8")
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1])
}
// Strings translated indirectly (t(variable))
const indirect = [
  "Class", "Study", "Activity", "Add class", "Add study time", "Add activity",
  "New class", "New study session", "New activity",
  "Schedule", "Overview", "Study goals", "Goals", "Actions", "Deadlines",
]
indirect.forEach((k) => keys.add(k))
const overview = fs.readFileSync(path.join(root, "src/screens/Overview.tsx"), "utf8")
for (const m of overview.match(/const QUOTES = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)) keys.add(m[1])
const ocr = fs.readFileSync(path.join(root, "src/lib/scheduleOcr.ts"), "utf8")
for (const m of ocr.matchAll(/ScheduleReadError\(\s*"([^"]+)"/g)) keys.add(m[1])
for (const m of ocr.matchAll(/warnings\.push\("([^"]+)"\)/g)) keys.add(m[1])

const sorted = [...keys].sort()
if (process.argv.includes("--keys")) {
  console.log(JSON.stringify(sorted, null, 1))
  process.exit(0)
}
const tr = fs.readFileSync(path.join(root, "src/lib/tr.ts"), "utf8")
const missing = sorted.filter((k) => !tr.includes(JSON.stringify(k)))
if (missing.length) {
  console.log(`Missing Turkish for ${missing.length} of ${sorted.length} strings:`)
  for (const k of missing) console.log("  " + JSON.stringify(k))
  process.exit(1)
}
console.log(`All ${sorted.length} UI strings have Turkish translations.`)
