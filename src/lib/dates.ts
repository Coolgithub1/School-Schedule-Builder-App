export const DAY_START = 8
export const DAY_END = 20
export const DAY_SPAN = DAY_END - DAY_START
export const HOURS = Array.from({ length: DAY_SPAN }, (_, i) => DAY_START + i)

export const WEEKDAYS = [
  { short: "MON", letter: "M", label: "Monday" },
  { short: "TUE", letter: "T", label: "Tuesday" },
  { short: "WED", letter: "W", label: "Wednesday" },
  { short: "THU", letter: "T", label: "Thursday" },
  { short: "FRI", letter: "F", label: "Friday" },
]

/** Start-time choices: 8:00 AM … 7:30 PM in half-hour steps */
export const TIME_OPTIONS = Array.from(
  { length: DAY_SPAN * 2 },
  (_, i) => DAY_START + i / 2,
)
export const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4]

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

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

export function formatTime(h: number) {
  const hour = Math.floor(h)
  const minutes = Math.round((h - hour) * 60)
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${pad(minutes)} ${hour >= 12 ? "PM" : "AM"}`
}

export function timeParts(h: number) {
  const [time, suffix] = formatTime(h).split(" ")
  return { time, suffix }
}

export function hourLabel(h: number) {
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${h >= 12 ? "PM" : "AM"}`
}

export function formatHours(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function formatDuration(d: number) {
  if (d < 1) return `${Math.round(d * 60)} min`
  return `${formatHours(d)} hr${d === 1 ? "" : "s"}`
}

export function weekRangeLabel(wk: string, withYear = true) {
  const start = fromKey(wk)
  const end = addDays(start, 4)
  const sm = MONTHS[start.getMonth()]
  const em = MONTHS[end.getMonth()]
  const range =
    sm === em
      ? `${sm} ${start.getDate()}–${end.getDate()}`
      : `${sm} ${start.getDate()} – ${em} ${end.getDate()}`
  return withYear ? `${range}, ${end.getFullYear()}` : range
}

export function relativeWeekLabel(offset: number, wk: string) {
  if (offset === 0) return "This week"
  if (offset === 1) return "Next week"
  if (offset === -1) return "Last week"
  return weekRangeLabel(wk, false)
}

export function daysUntil(key: string) {
  const diff = fromKey(key).getTime() - startOfDay().getTime()
  return Math.round(diff / 86_400_000)
}

export function dueLabel(key: string) {
  const n = daysUntil(key)
  if (n < -1) return `${-n} days late`
  if (n === -1) return "Yesterday"
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  const date = fromKey(key)
  if (n < 7) return date.toLocaleDateString("en-US", { weekday: "long" })
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function longDateLabel(date = new Date()) {
  return date
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase()
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
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
