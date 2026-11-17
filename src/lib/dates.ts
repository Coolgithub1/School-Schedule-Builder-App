import { isTr, t } from "./i18n"

export const DAY_START = 8
export const DAY_END = 20
export const DAY_SPAN = DAY_END - DAY_START
export const HOURS = Array.from({ length: DAY_SPAN }, (_, i) => DAY_START + i)

const DAY_NAMES = {
  en: [
    ["MON", "M", "Monday"], ["TUE", "T", "Tuesday"], ["WED", "W", "Wednesday"],
    ["THU", "T", "Thursday"], ["FRI", "F", "Friday"],
  ],
  tr: [
    ["PZT", "P", "Pazartesi"], ["SAL", "S", "Salı"], ["ÇAR", "Ç", "Çarşamba"],
    ["PER", "P", "Perşembe"], ["CUM", "C", "Cuma"],
  ],
}
const dayName = (i: number) => DAY_NAMES[isTr() ? "tr" : "en"][i]

/** Weekday names; getters follow the active language. */
export const WEEKDAYS = [0, 1, 2, 3, 4].map((i) => ({
  get short() { return dayName(i)[0] },
  get letter() { return dayName(i)[1] },
  get label() { return dayName(i)[2] },
}))

/** Start-time choices: 8:00 AM … 7:30 PM in half-hour steps */
export const TIME_OPTIONS = Array.from(
  { length: DAY_SPAN * 2 },
  (_, i) => DAY_START + i / 2,
)
export const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4]

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
}
const month = (i: number) => MONTHS[isTr() ? "tr" : "en"][i]
const locale = () => (isTr() ? "tr-TR" : "en-US")

const pad = (n: number) => String(n).padStart(2, "0")

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeek(date = new Date()) {
  const day = startOfDay(date)
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

export function addDays(date: Date, n: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

export function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function weekKey(offset = 0) {
  return toKey(addDays(startOfWeek(), offset * 7))
}

export function weekDates(wk: string) {
  const start = fromKey(wk)
  return WEEKDAYS.map((_, i) => addDays(start, i))
}

/** 0 = Monday … 6 = Sunday */
export function todayIndex() {
  return (new Date().getDay() + 6) % 7
}

export function nowHours(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60
}

/** "2:30 PM" in English, "14:30" in Turkish (24-hour clock). */
export function formatTime(h: number) {
  const hour = Math.floor(h)
  const minutes = Math.round((h - hour) * 60)
  if (isTr()) return `${pad(hour)}:${pad(minutes)}`
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${pad(minutes)} ${hour >= 12 ? "PM" : "AM"}`
}

export function timeParts(h: number) {
  const [time, suffix = ""] = formatTime(h).split(" ")
  return { time, suffix }
}

export function hourLabel(h: number) {
  if (isTr()) return `${pad(h)}:00`
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${h >= 12 ? "PM" : "AM"}`
}

export function formatHours(n: number) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return isTr() ? s.replace(".", ",") : s
}

export function formatDuration(d: number) {
  if (d < 1) return t("{n} min", { n: Math.round(d * 60) })
  return d === 1 ? t("1 hr") : t("{n} hrs", { n: formatHours(d) })
}

export function weekRangeLabel(wk: string, withYear = true) {
  const start = fromKey(wk)
  const end = addDays(start, 4)
  const sm = month(start.getMonth())
  const em = month(end.getMonth())
  let range: string
  if (isTr())
    range = sm === em ? `${start.getDate()}–${end.getDate()} ${em}` : `${start.getDate()} ${sm} – ${end.getDate()} ${em}`
  else range = sm === em ? `${sm} ${start.getDate()}–${end.getDate()}` : `${sm} ${start.getDate()} – ${em} ${end.getDate()}`
  return withYear ? `${range}${isTr() ? "" : ","} ${end.getFullYear()}` : range
}

export function relativeWeekLabel(offset: number, wk: string) {
  if (offset === 0) return t("This week")
  if (offset === 1) return t("Next week")
  if (offset === -1) return t("Last week")
  return weekRangeLabel(wk, false)
}

export function daysUntil(key: string) {
  const diff = fromKey(key).getTime() - startOfDay().getTime()
  return Math.round(diff / 86_400_000)
}

export function dueLabel(key: string) {
  const n = daysUntil(key)
  if (n < -1) return t("{n} days late", { n: -n })
  if (n === -1) return t("Yesterday")
  if (n === 0) return t("Today")
  if (n === 1) return t("Tomorrow")
  const date = fromKey(key)
  if (n < 7) return date.toLocaleDateString(locale(), { weekday: "long" })
  return isTr() ? `${date.getDate()} ${month(date.getMonth())}` : `${month(date.getMonth())} ${date.getDate()}`
}

export function longDateLabel(date = new Date()) {
  return date
    .toLocaleDateString(locale(), { weekday: "long", month: "long", day: "numeric" })
    .toLocaleUpperCase(locale())
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return t("Good morning")
  if (h < 17) return t("Good afternoon")
  return t("Good evening")
}

export function timeZoneLabel() {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    )
  } catch {
    return ""
  }
}
