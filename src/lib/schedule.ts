import { DAY_END, DAY_START, nowHours, todayIndex } from "./dates"
import type {
  FocusPref,
  ScheduleEvent,
  SetupActivity,
  SetupClass,
} from "./types"

export const uid = () => Math.random().toString(36).slice(2, 10)

type EventInput = Partial<ScheduleEvent> &
  Pick<ScheduleEvent, "title" | "day" | "start" | "duration" | "type">

export function makeEvent(fields: EventInput): ScheduleEvent {
  return {
    id: uid(),
    detail: "",
    notes: "",
    recurring: true,
    completedWeeks: [],
    ...fields,
  }
}

export function eventsForWeek(events: ScheduleEvent[], wk: string) {
  return events.filter((e) => e.recurring || e.weekStart === wk)
}

export function eventsForDay(events: ScheduleEvent[], wk: string, day: number) {
  return eventsForWeek(events, wk)
    .filter((e) => e.day === day)
    .sort((a, b) => a.start - b.start)
}

export const isDone = (event: ScheduleEvent, wk: string) =>
  event.completedWeeks.includes(wk)

export function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur && bStart < aStart + aDur
}

export function findConflicts(
  events: ScheduleEvent[],
  wk: string,
  day: number,
  start: number,
  duration: number,
  excludeId?: string,
) {
  return eventsForDay(events, wk, day).filter(
    (e) => e.id !== excludeId && overlaps(start, duration, e.start, e.duration),
  )
}

export function busyHours(events: ScheduleEvent[], wk: string, day: number) {
  return eventsForDay(events, wk, day).reduce((sum, e) => sum + e.duration, 0)
}

export function findFreeSlot(
  events: ScheduleEvent[],
  wk: string,
  day: number,
  duration: number,
  pref: FocusPref,
  after = DAY_START,
): number | null {
  const latest = DAY_END - duration
  const candidates: number[] = []
  const pushRange = (from: number) => {
    for (let s = from; s <= latest; s += 0.5)
      if (!candidates.includes(s)) candidates.push(s)
  }
  if (pref === "evening") pushRange(15)
  pushRange(DAY_START)
  const dayEvents = eventsForDay(events, wk, day)
  return (
    candidates.find(
      (s) =>
        s >= after &&
        !dayEvents.some((e) => overlaps(s, duration, e.start, e.duration)),
    ) ?? null
  )
}

export function focusStats(events: ScheduleEvent[], wk: string, goal: number) {
  const study = eventsForWeek(events, wk).filter((e) => e.type === "study")
  const perDay = [0, 1, 2, 3, 4].map((day) => {
    const list = study.filter((e) => e.day === day)
    return {
      planned: list.reduce((s, e) => s + e.duration, 0),
      completed: list.filter((e) => isDone(e, wk)).reduce((s, e) => s + e.duration, 0),
    }
  })
  const planned = perDay.reduce((s, d) => s + d.planned, 0)
  const completed = perDay.reduce((s, d) => s + d.completed, 0)
  return {
    planned,
    completed,
    goal,
    perDay,
    remaining: Math.max(0, goal - completed),
    pct: goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0,
  }
}

/** Finds an open focus slot on the lightest remaining day of the week. */
export function suggestBlock(
  events: ScheduleEvent[],
  wk: string,
  pref: FocusPref,
  weekOffset: number,
  duration = 1.5,
) {
  if (weekOffset < 0) return null
  const today = todayIndex()
  if (weekOffset === 0 && today > 4) return null
  const firstDay = weekOffset === 0 ? today : 0
  const days = [0, 1, 2, 3, 4]
    .filter((d) => d >= firstDay)
    .sort((a, b) => busyHours(events, wk, a) - busyHours(events, wk, b))
  for (const day of days) {
    const after =
      weekOffset === 0 && day === today
        ? Math.ceil(nowHours() * 2) / 2
        : DAY_START
    const start = findFreeSlot(events, wk, day, duration, pref, after)
    if (start !== null) return { day, start, duration }
  }
  return null
}

export function largestGap(
  events: ScheduleEvent[],
  wk: string,
  day: number,
  after = DAY_START,
) {
  let cursor = Math.max(DAY_START, after)
  let best: { start: number; duration: number } | null = null
  const consider = (start: number, end: number) => {
    if (end - start > (best?.duration ?? 0)) best = { start, duration: end - start }
  }
  for (const e of eventsForDay(events, wk, day)) {
    if (e.start > cursor) consider(cursor, e.start)
    cursor = Math.max(cursor, e.start + e.duration)
  }
  if (DAY_END > cursor) consider(cursor, DAY_END)
  return best as { start: number; duration: number } | null
}

export function subjectMatches(text: string, subject: string) {
  const words = subject
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4)
  const haystack = text.toLowerCase()
  return words.some((w) => haystack.includes(w))
}

export function classSubjects(events: ScheduleEvent[]) {
  return [...new Set(events.filter((e) => e.type === "class").map((e) => e.title))]
}

/** Turns onboarding answers into a recurring weekly schedule. */
export function generateSchedule({
  classes,
  activities,
  studyHours,
  pref,
}: {
  classes: SetupClass[]
  activities: SetupActivity[]
  studyHours: number
  pref: FocusPref
}): ScheduleEvent[] {
  const events: ScheduleEvent[] = []

  for (const c of classes)
    for (const day of c.days)
      events.push(
        makeEvent({
          title: c.name,
          detail: c.location || "Class",
          day,
          start: c.start,
          duration: c.duration,
          type: "class",
        }),
      )

  for (const a of activities)
    if (a.name.trim())
      events.push(
        makeEvent({
          title: a.name.trim(),
          detail: "Activity",
          day: a.day,
          start: a.start,
          duration: a.duration,
          type: "activity",
        }),
      )

  // Split study time into 1.5h blocks; fold a leftover half hour into the last block.
  const blocks: number[] = []
  let remaining = studyHours
  while (remaining >= 1.5) {
    blocks.push(1.5)
    remaining -= 1.5
  }
  if (remaining === 0.5 && blocks.length) blocks[blocks.length - 1] = 2
  else if (remaining > 0) blocks.push(remaining)

  const subjects = classes.map((c) => c.name)
  blocks.forEach((duration, i) => {
    const subject = subjects.length ? subjects[i % subjects.length] : "Study"
    const dayOrder = [0, 1, 2, 3, 4].sort(
      (a, b) => busyHours(events, "", a) - busyHours(events, "", b) || a - b,
    )
    for (const day of dayOrder) {
      const start = findFreeSlot(events, "", day, duration, pref)
      if (start !== null) {
        events.push(
          makeEvent({
            title: `${subject.replace(/\s+(lab|ii|iii|i|101)$/i, "")} review`,
            detail: "Focus block",
            day,
            start,
            duration,
            type: "study",
          }),
        )
        break
      }
    }
  })

  return events
}
