import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { formatTime, weekKey, WEEKDAYS } from "./dates"
import { findConflicts } from "./schedule"
import { createProfile, nameFromEmail, seedEvents, seedTasks } from "./seed"
import type {
  AppData,
  AuthMode,
  FocusPref,
  Profile,
  ScheduleEvent,
  Screen,
  Task,
} from "./types"

const STORAGE_KEY = "studyflow:v1"
const EMPTY: AppData = {
  profile: null,
  signedIn: false,
  onboarded: false,
  events: [],
  tasks: [],
}

function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed || !Array.isArray(parsed.events) || !Array.isArray(parsed.tasks))
      return EMPTY
    return { ...EMPTY, ...parsed }
  } catch {
    return EMPTY
  }
}

function initialScreen(data: AppData): Screen {
  if (!data.signedIn || !data.profile) return "welcome"
  return data.onboarded ? "overview" : "setup"
}

export type DrawerState = {
  eventId: string | null
  prefill: Partial<ScheduleEvent>
  weekStart: string
}

export type Toast = {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

type ToastAction = { label: string; run: () => void }
type SignInResult = { ok: true; next: Screen } | { ok: false; error: string }

type StoreValue = {
  data: AppData
  profile: Profile
  screen: Screen
  navigate: (screen: Screen) => void
  authMode: AuthMode
  startAuth: (mode: AuthMode) => void
  setAuthMode: (mode: AuthMode) => void

  weekOffset: number
  setWeekOffset: Dispatch<SetStateAction<number>>
  viewWeek: string

  drawer: DrawerState | null
  openNewEvent: (prefill?: Partial<ScheduleEvent>, weekStart?: string) => void
  openEvent: (id: string, weekStart?: string) => void
  closeDrawer: () => void
  paletteOpen: boolean
  setPaletteOpen: Dispatch<SetStateAction<boolean>>
  settingsOpen: boolean
  setSettingsOpen: Dispatch<SetStateAction<boolean>>
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>

  toasts: Toast[]
  toast: (message: string, action?: ToastAction) => void
  dismissToast: (id: number) => void

  signIn: (
    mode: AuthMode,
    input: { name?: string; email: string; google?: boolean },
  ) => SignInResult
  signOut: () => void
  completeSetup: (input: {
    events: ScheduleEvent[]
    studyGoal: number
    focusPref: FocusPref
  }) => void
  updateProfile: (patch: Partial<Profile>) => void
  saveEvent: (event: ScheduleEvent) => void
  deleteEvent: (id: string) => void
  moveEvent: (id: string, day: number, start: number) => void
  toggleDone: (id: string, wk: string) => void
  addTask: (task: Task) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  resetDemo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const dataRef = useRef(data)
  dataRef.current = data

  const [screen, setScreen] = useState<Screen>(() => initialScreen(data))
  const [authMode, setAuthMode] = useState<AuthMode>("register")
  const [weekOffset, setWeekOffset] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const viewWeek = weekKey(weekOffset)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage unavailable — the app still works for this session */
    }
  }, [data])

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      const id = ++toastId.current
      setToasts((list) => [
        ...list.slice(-2),
        { id, message, actionLabel: action?.label, onAction: action?.run },
      ])
      window.setTimeout(() => dismissToast(id), action ? 6000 : 3800)
    },
    [dismissToast],
  )

  const navigate = useCallback((next: Screen) => {
    setScreen(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const startAuth = useCallback(
    (mode: AuthMode) => {
      setAuthMode(mode)
      navigate("auth")
    },
    [navigate],
  )

  const openNewEvent = useCallback(
    (prefill: Partial<ScheduleEvent> = {}, weekStart?: string) => {
      setMenuOpen(false)
      setDrawer({ eventId: null, prefill, weekStart: weekStart ?? weekKey(weekOffset) })
    },
    [weekOffset],
  )

  const openEvent = useCallback(
    (id: string, weekStart?: string) => {
      setDrawer({ eventId: id, prefill: {}, weekStart: weekStart ?? weekKey(weekOffset) })
    },
    [weekOffset],
  )

  const closeDrawer = useCallback(() => setDrawer(null), [])

  const signIn: StoreValue["signIn"] = (mode, input) => {
    const email = input.email.trim().toLowerCase()
    const current = dataRef.current
    if (mode === "login") {
      if (current.profile) {
        if (input.google || current.profile.email.toLowerCase() === email) {
          setData((d) => ({ ...d, signedIn: true }))
          return { ok: true, next: current.onboarded ? "overview" : "setup" }
        }
        return {
          ok: false,
          error: `No account found for ${email}. Try ${current.profile.email}, or create a new account.`,
        }
      }
      setData({
        profile: createProfile(input.name?.trim() || nameFromEmail(email), email),
        signedIn: true,
        onboarded: true,
        events: seedEvents(),
        tasks: seedTasks(),
      })
      return { ok: true, next: "overview" }
    }
    setData({
      profile: createProfile(input.name?.trim() || nameFromEmail(email), email),
      signedIn: true,
      onboarded: false,
      events: [],
      tasks: [],
    })
    return { ok: true, next: "setup" }
  }

  const signOut = () => {
    setData((d) => ({ ...d, signedIn: false }))
    setDrawer(null)
    setSettingsOpen(false)
    setPaletteOpen(false)
    setWeekOffset(0)
    navigate("welcome")
    toast("You’re signed out. Your schedule is saved on this device.")
  }

  const completeSetup: StoreValue["completeSetup"] = ({ events, studyGoal, focusPref }) => {
    setData((d) => ({
      ...d,
      onboarded: true,
      events,
      profile: d.profile ? { ...d.profile, studyGoal, focusPref } : d.profile,
    }))
  }

  const updateProfile = (patch: Partial<Profile>) => {
    setData((d) => (d.profile ? { ...d, profile: { ...d.profile, ...patch } } : d))
  }

  const saveEvent = (event: ScheduleEvent) => {
    setData((d) => {
      const exists = d.events.some((e) => e.id === event.id)
      return {
        ...d,
        events: exists
          ? d.events.map((e) => (e.id === event.id ? event : e))
          : [...d.events, event],
      }
    })
  }

  const deleteEvent = (id: string) => {
    const event = dataRef.current.events.find((e) => e.id === id)
    if (!event) return
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }))
    toast(`Removed “${event.title}”`, {
      label: "Undo",
      run: () => setData((d) => ({ ...d, events: [...d.events, event] })),
    })
  }

  const moveEvent = (id: string, day: number, start: number) => {
    const event = dataRef.current.events.find((e) => e.id === id)
    if (!event) return
    const previous = { day: event.day, start: event.start }
    const clash = findConflicts(
      dataRef.current.events,
      event.weekStart ?? viewWeek,
      day,
      start,
      event.duration,
      id,
    )[0]
    setData((d) => ({
      ...d,
      events: d.events.map((e) => (e.id === id ? { ...e, day, start } : e)),
    }))
    toast(
      `Moved “${event.title}” to ${WEEKDAYS[day].label}, ${formatTime(start)}${
        clash ? ` — overlaps ${clash.title}` : ""
      }`,
      {
        label: "Undo",
        run: () =>
          setData((d) => ({
            ...d,
            events: d.events.map((e) => (e.id === id ? { ...e, ...previous } : e)),
          })),
      },
    )
  }

  const toggleDone = (id: string, wk: string) => {
    setData((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id !== id
          ? e
          : {
              ...e,
              completedWeeks: e.completedWeeks.includes(wk)
                ? e.completedWeeks.filter((w) => w !== wk)
                : [...e.completedWeeks, wk],
            },
      ),
    }))
  }

  const addTask = (task: Task) => {
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }))
    toast(`Added “${task.title}”`)
  }

  const toggleTask = (id: string) => {
    const task = dataRef.current.tasks.find((t) => t.id === id)
    if (!task) return
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
    if (!task.done)
      toast(`Nice work — “${task.title}” is done`, {
        label: "Undo",
        run: () =>
          setData((d) => ({
            ...d,
            tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: false } : t)),
          })),
      })
  }

  const deleteTask = (id: string) => {
    const task = dataRef.current.tasks.find((t) => t.id === id)
    if (!task) return
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
    toast(`Deleted “${task.title}”`, {
      label: "Undo",
      run: () => setData((d) => ({ ...d, tasks: [...d.tasks, task] })),
    })
  }

  const resetDemo = () => {
    setData((d) => ({
      ...d,
      onboarded: true,
      events: seedEvents(),
      tasks: seedTasks(),
    }))
    setWeekOffset(0)
    toast("Sample schedule restored")
  }

  const value: StoreValue = {
    data,
    profile: data.profile ?? createProfile("Student", ""),
    screen,
    navigate,
    authMode,
    startAuth,
    setAuthMode,
    weekOffset,
    setWeekOffset,
    viewWeek,
    drawer,
    openNewEvent,
    openEvent,
    closeDrawer,
    paletteOpen,
    setPaletteOpen,
    settingsOpen,
    setSettingsOpen,
    menuOpen,
    setMenuOpen,
    toasts,
    toast,
    dismissToast,
    signIn,
    signOut,
    completeSetup,
    updateProfile,
    saveEvent,
    deleteEvent,
    moveEvent,
    toggleDone,
    addTask,
    toggleTask,
    deleteTask,
    resetDemo,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error("useStore must be used inside <StoreProvider>")
  return store
}

/** Re-renders every 30 seconds so time-based UI (now line, greetings) stays fresh. */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
