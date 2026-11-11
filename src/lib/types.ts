export type Screen = "welcome" | "auth" | "setup" | "planner" | "overview" | "goals"
export type AppScreen = "planner" | "overview" | "goals"
export type AuthMode = "login" | "register"
export type EventType = "class" | "study" | "activity"
export type FocusPref = "morning" | "evening"

export type ScheduleEvent = {
  id: string
  title: string
  /** Location or short descriptor shown on the block */
  detail: string
  notes: string
  /** 0 = Monday … 4 = Friday */
  day: number
  /** Hours from midnight, in 0.5 steps (e.g. 13.5 = 1:30 PM) */
  start: number
  duration: number
  type: EventType
  /** Recurring blocks appear every week; one-off blocks only in `weekStart` */
  recurring: boolean
  weekStart?: string
  /** Week keys (Monday yyyy-mm-dd) in which this block was completed */
  completedWeeks: string[]
}

export type Task = {
  id: string
  title: string
  subject: string
  due: string
  done: boolean
}

export type Profile = {
  name: string
  email: string
  studyGoal: number
  focusPref: FocusPref
  reminders: boolean
  emailDigest: boolean
}

export type AppData = {
  profile: Profile | null
  signedIn: boolean
  onboarded: boolean
  events: ScheduleEvent[]
  tasks: Task[]
}

export type SetupClass = {
  id: string
  name: string
  days: number[]
  start: number
  duration: number
  location: string
}

export type SetupActivity = {
  id: string
  name: string
  day: number
  start: number
  duration: number
}
