// Reads a Yeditepe-style timetable screenshot (days across, hours down, course
// codes like "VCD 421" in the cells) into setup classes.
//
// Engine-agnostic: the browser passes a Tesseract.js worker running on the
// device, and scripts/test-ocr.mjs passes the same engine running in Node, so
// desktop tests exercise exactly the code that ships. Self-contained on purpose
// (type-only imports) so Node can run it directly.
import type { SetupClass } from "./types"

export type OcrBox = { text: string; confidence: number; x0: number; y0: number; x1: number; y1: number }
export type OcrResult = { words: OcrBox[]; lines: OcrBox[] }
export type OcrRequest = {
  /** Tesseract page segmentation mode: "11" sparse text, "6" uniform block */
  psm: string
  rect?: { left: number; top: number; width: number; height: number }
  whitelist?: string
}
export type OcrEngine = { recognize: (image: unknown, request: OcrRequest) => Promise<OcrResult> }

export type ScheduleCell = { code: string; day: number; hour: number }
export type ScheduleImport = {
  classes: SetupClass[]
  cells: ScheduleCell[]
  hoursPerWeek: number
  warnings: string[]
}

export class ScheduleReadError extends Error {}

const DAY_HEADERS: RegExp[] = [
  /^(pzt|mon)/i,
  /^(sal|tue)/i,
  /^([cçg][aä]r|wed)/i,
  /^(per|thu)/i,
  /^(cum|fri)/i,
]

const LETTER_FIXES: Record<string, string> = { "0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "6": "G" }
const DIGIT_FIXES: Record<string, string> = {
  O: "0", o: "0", D: "0", Q: "0", I: "1", l: "1", i: "1", "|": "1", "!": "1",
  S: "5", s: "5", B: "8", Z: "2", z: "2", G: "6", b: "6", g: "9", T: "7",
}

const center = (b: OcrBox) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })
const clean = (t: string) => t.replace(/[^\p{L}\p{N}|!]/gu, "")
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

function asPrefix(raw: string): string | null {
  const t = clean(raw)
  if (t.length < 2 || t.length > 5) return null
  const letters = [...t].map((c) => LETTER_FIXES[c] ?? c).join("").toUpperCase()
  if (!/^[A-ZÇĞİÖŞÜ]+$/.test(letters)) return null
  // Real course prefixes are written in capitals; this skips words like "Program".
  const upperish = [...t].filter((c) => c === c.toUpperCase()).length >= t.length - 1
  return upperish ? letters : null
}

function asNumber(raw: string): string | null {
  const t = clean(raw)
  if (t.length < 3 || t.length > 4) return null
  const digitsAlready = [...t.slice(0, 3)].filter((c) => /\d/.test(c)).length
  if (digitsAlready < 2) return null
  const fixed = [...t.slice(0, 3)].map((c) => DIGIT_FIXES[c] ?? c).join("")
  const suffix = t.slice(3).toUpperCase()
  return /^\d{3}$/.test(fixed) && /^[A-Z]?$/.test(suffix) ? fixed + suffix : null
}

/** Joins "VCD" + "421" (or a single "VCD421") into course codes with positions. */
function findCodes(words: OcrBox[]): { code: string; x: number; y: number; h: number }[] {
  const codes: { code: string; x: number; y: number; h: number }[] = []
  const used = new Set<number>()
  const sorted = [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
  sorted.forEach((w, i) => {
    if (used.has(i) || w.confidence < 45) return
    const h = w.y1 - w.y0
    const joined = clean(w.text).match(/^([A-Za-z]{2,5})(\d{3}[A-Za-z]?)$/)
    if (joined) {
      const c = center(w)
      codes.push({ code: `${joined[1].toUpperCase()} ${joined[2].toUpperCase()}`, x: c.x, y: c.y, h })
      used.add(i)
      return
    }
    const prefix = asPrefix(w.text)
    if (!prefix) return
    const j = sorted.findIndex(
      (n, k) =>
        !used.has(k) &&
        k !== i &&
        n.x0 > w.x0 &&
        n.x0 - w.x1 < h * 2.5 &&
        Math.abs(center(n).y - center(w).y) < h * 0.6,
    )
    if (j === -1) return
    const number = asNumber(sorted[j].text)
    if (!number) return
    used.add(i)
    used.add(j)
    const n = sorted[j]
    codes.push({ code: `${prefix} ${number}`, x: (w.x0 + n.x1) / 2, y: (center(w).y + center(n).y) / 2, h })
  })
  return codes
}

/** x-centre of each weekday column, interpolating any header OCR missed. */
function findDayColumns(words: OcrBox[]) {
  const found: { index: number; x: number; box: OcrBox }[] = []
  for (const w of words) {
    const t = clean(w.text)
    if (t.length < 3 || t.length > 5) continue
    const index = DAY_HEADERS.findIndex((re) => re.test(t))
    if (index !== -1 && !found.some((f) => f.index === index)) found.push({ index, x: center(w).x, box: w })
  }
  if (found.length < 2) return null
  // Fit x = a + b·index so missing headers can be inferred.
  const n = found.length
  const mi = found.reduce((s, f) => s + f.index, 0) / n
  const mx = found.reduce((s, f) => s + f.x, 0) / n
  const b =
    found.reduce((s, f) => s + (f.index - mi) * (f.x - mx), 0) /
    found.reduce((s, f) => s + (f.index - mi) ** 2, 0)
  const a = mx - b * mi
  return {
    centers: [0, 1, 2, 3, 4].map((i) => a + b * i),
    spacing: b,
    headerBottom: Math.max(...found.map((f) => f.box.y1)),
    headerCenterY: median(found.map((f) => center(f.box).y)),
    left: Math.min(...found.map((f) => f.box.x0)),
  }
}

/** Reads the "9-10", "10-11"… labels and fits y = a + b·hour. */
function fitHourRows(lines: OcrBox[], offset: { left: number; top: number }) {
  const points: { hour: number; y: number }[] = []
  for (const line of lines) {
    for (const m of line.text.matchAll(/(\d{1,2})\s*[-–—]\s*(\d{1,2})/g)) {
      const start = Number(m[1])
      const end = Number(m[2])
      if (end === start + 1 && start >= 6 && start <= 22 && !points.some((p) => p.hour === start))
        points.push({ hour: start, y: offset.top + (line.y0 + line.y1) / 2 })
    }
  }
  if (points.length < 2) return null
  const n = points.length
  const mh = points.reduce((s, p) => s + p.hour, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  const b =
    points.reduce((s, p) => s + (p.hour - mh) * (p.y - my), 0) /
    points.reduce((s, p) => s + (p.hour - mh) ** 2, 0)
  if (!(b > 0)) return null
  return { hourAt: (y: number) => Math.round(mh + (y - my) / b), count: n }
}

const uid = () => Math.random().toString(36).slice(2, 10)

/** Merges per-hour cells into classes: consecutive hours become one block; days sharing a block share a class. */
export function cellsToClasses(cells: ScheduleCell[]): SetupClass[] {
  const byCode = new Map<string, Map<number, number[]>>()
  for (const c of cells) {
    const days = byCode.get(c.code) ?? new Map<number, number[]>()
    const hours = days.get(c.day) ?? []
    if (!hours.includes(c.hour)) hours.push(c.hour)
    days.set(c.day, hours)
    byCode.set(c.code, days)
  }
  const classes: SetupClass[] = []
  for (const [code, days] of byCode) {
    const groups = new Map<string, { start: number; duration: number; days: number[] }>()
    for (const [day, hours] of days) {
      hours.sort((a, b) => a - b)
      let start = hours[0]
      let prev = hours[0]
      const flush = (end: number) => {
        const key = `${start}-${end}`
        const g = groups.get(key) ?? { start, duration: end - start + 1, days: [] }
        g.days.push(day)
        groups.set(key, g)
      }
      for (const h of hours.slice(1)) {
        if (h !== prev + 1) {
          flush(prev)
          start = h
        }
        prev = h
      }
      flush(prev)
    }
    for (const g of [...groups.values()].sort((a, b) => a.start - b.start))
      classes.push({ id: uid(), name: code, days: g.days.sort(), start: g.start, duration: g.duration, location: "" })
  }
  return classes.sort((a, b) => a.days[0] - b.days[0] || a.start - b.start)
}

export async function readSchedule(engine: OcrEngine, image: unknown): Promise<ScheduleImport> {
  const warnings: string[] = []
  const first = await engine.recognize(image, { psm: "11" })
  const columns = findDayColumns(first.words)
  if (!columns)
    throw new ScheduleReadError(
      "We couldn’t find the day headers (Pzt, Sal, Çar, Per, Cum). Make sure the whole timetable is in the screenshot.",
    )
  const codes = findCodes(first.words).filter((c) => c.y > columns.headerBottom)
  if (!codes.length)
    throw new ScheduleReadError("We found the timetable but no course codes in it. Try a sharper screenshot.")

  // Second pass: only the time column, digits only — the grey labels are easy to miss in the full page.
  const stripRight = Math.min(columns.left, ...codes.map((c) => c.x - c.h * 2.5)) - 4
  const maxY = Math.max(...first.words.map((w) => w.y1))
  const rect = {
    left: 0,
    top: Math.round(columns.headerBottom + 4),
    width: Math.max(40, Math.round(stripRight)),
    height: Math.max(40, Math.round(maxY - columns.headerBottom)),
  }
  const timeCol = await engine.recognize(image, { psm: "6", rect, whitelist: "0123456789-" })
  // Tesseract reports rectangle results in full-image coordinates already.
  const rows = fitHourRows(timeCol.lines, { left: 0, top: 0 })
  let hourAt: (y: number) => number
  if (rows) {
    hourAt = rows.hourAt
  } else {
    // Fallback: rows are evenly spaced and the Yeditepe grid starts at 9:00.
    const ys = [...new Set(codes.map((c) => Math.round(c.y)))].sort((a, b) => a - b)
    const gaps = ys.slice(1).map((y, i) => y - ys[i]).filter((g) => g > codes[0].h * 1.5)
    const rowH = gaps.length ? Math.min(...gaps) : codes[0].h * 6
    const firstRowY = columns.headerCenterY + rowH * 0.84
    hourAt = (y) => 9 + Math.round((y - firstRowY) / rowH)
    warnings.push("We couldn’t read the time column, so we assumed the timetable starts at 9:00. Double-check the times.")
  }

  const cells: ScheduleCell[] = []
  for (const c of codes) {
    let day = 0
    let best = Infinity
    columns.centers.forEach((x, i) => {
      const d = Math.abs(c.x - x)
      if (d < best) {
        best = d
        day = i
      }
    })
    if (best > Math.abs(columns.spacing) * 0.75) continue
    const hour = hourAt(c.y)
    if (hour < 7 || hour > 21) continue
    if (!cells.some((x) => x.code === c.code && x.day === day && x.hour === hour)) cells.push({ code: c.code, day, hour })
  }
  if (!cells.length) throw new ScheduleReadError("We couldn’t line the course codes up with days and hours.")

  const classes = cellsToClasses(cells)
  if (classes.some((c) => c.start < 8 || c.start + c.duration > 20))
    warnings.push("Some classes fall outside 8 AM – 8 PM and may not show on the calendar.")
  return { classes, cells, hoursPerWeek: cells.length, warnings }
}
