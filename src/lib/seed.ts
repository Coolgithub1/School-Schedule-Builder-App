import { addDays, nowHours, todayIndex, toKey, weekKey } from "./dates"
import { makeEvent, uid } from "./schedule"
import type { Profile, ScheduleEvent, SetupClass, Task } from "./types"

export const CLASS_PRESETS: SetupClass[] = [
  { id: "calc", name: "Calculus II", days: [0, 2, 4], start: 9, duration: 1.5, location: "Room B-204" },
  { id: "hist", name: "World History", days: [1, 3], start: 10, duration: 1.5, location: "Lecture Hall 1" },
  { id: "phys", name: "Physics Lab", days: [1], start: 13, duration: 2, location: "Science 118" },
]

export const DEMO_USER = { name: "Maya Singh", email: "maya@north.edu" }

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? ""
  const parts = local.split(/[._\-+\d]+/).filter(Boolean)
  if (!parts.length) return "Student"
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" ")
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? "S").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

export function createProfile(name: string, email: string): Profile {
  return {
    name,
    email,
    studyGoal: 8,
    focusPref: "morning",
    reminders: true,
    emailDigest: false,
  }
}

export function seedEvents(): ScheduleEvent[] {
  const wk = weekKey(0)
  const today = todayIndex()
  const now = nowHours()
  const base: Parameters<typeof makeEvent>[0][] = [
    { title: "Calculus II", detail: "Room B-204", day: 0, start: 9, duration: 1.5, type: "class" },
    { title: "Calculus review", detail: "Practice set 4", day: 0, start: 15, duration: 1.5, type: "study" },
    { title: "World History", detail: "Lecture Hall 1", day: 1, start: 10, duration: 1.5, type: "class" },
    { title: "Physics Lab", detail: "Science 118", day: 1, start: 13, duration: 2, type: "class" },
    { title: "History reading", detail: "Chapter 8", day: 1, start: 17, duration: 1, type: "study" },
    { title: "Calculus II", detail: "Room B-204", day: 2, start: 9, duration: 1.5, type: "class" },
    { title: "History essay outline", detail: "Library, 2nd floor", day: 2, start: 13, duration: 1.5, type: "study" },
    { title: "Design Club", detail: "Studio 3", day: 2, start: 16, duration: 1.5, type: "activity" },
    { title: "World History", detail: "Lecture Hall 1", day: 3, start: 10, duration: 1.5, type: "class" },
    { title: "Physics focus", detail: "Lab report", day: 3, start: 14, duration: 1.5, type: "study" },
    { title: "Calculus II", detail: "Room B-204", day: 4, start: 9, duration: 1.5, type: "class" },
    { title: "Weekly reset", detail: "Plan next week", day: 4, start: 15, duration: 1, type: "study" },
  ]
  return base.map((fields) => {
    const event = makeEvent(fields)
    const finished =
      event.day < today || (event.day === today && event.start + event.duration <= now)
    if (event.type === "study" && finished) event.completedWeeks = [wk]
    return event
  })
}

export function seedTasks(): Task[] {
  const due = (n: number) => toKey(addDays(new Date(), n))
  return [
    { id: uid(), title: "Calculus problem set 5", subject: "Calculus II", due: due(1), done: false },
    { id: uid(), title: "Lab report draft", subject: "Physics Lab", due: due(3), done: false },
    { id: uid(), title: "Read chapter 9", subject: "World History", due: due(6), done: false },
    { id: uid(), title: "Essay topic proposal", subject: "World History", due: due(-2), done: true },
  ]
}
