import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Mail,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  UserRound,
  X,
} from "lucide-react"
import {
  daysUntil,
  dueLabel,
  formatHours,
  formatTime,
  nowHours,
  todayIndex,
  weekKey,
} from "../lib/dates"
import { getLang, t } from "../lib/i18n"
import { eventsForDay, focusStats } from "../lib/schedule"
import { initials } from "../lib/seed"
import { useStore } from "../lib/store"
import type { AppScreen, EventType } from "../lib/types"
import { CommandPalette } from "./CommandPalette"
import { EventDrawer } from "./EventDrawer"
import { SettingsModal } from "./SettingsModal"
import { TypeIcon, TYPE_META, typeLabel } from "./TypeIcon"
import { Logo, Switch } from "./ui"

const NAV: { id: AppScreen; label: string; icon: typeof CalendarDays }[] = [
  { id: "planner", label: "Schedule", icon: CalendarDays },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "goals", label: "Study goals", icon: Target },
]

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)

export function AppShell({ children }: { children: ReactNode }) {
  const {
    paletteOpen,
    setPaletteOpen,
    drawer,
    closeDrawer,
    settingsOpen,
    setSettingsOpen,
    menuOpen,
    setMenuOpen,
  } = useStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (e.key !== "Escape") return
      if (paletteOpen) setPaletteOpen(false)
      else if (drawer) closeDrawer()
      else if (settingsOpen) setSettingsOpen(false)
      else if (menuOpen) setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paletteOpen, drawer, settingsOpen, menuOpen, setPaletteOpen, closeDrawer, setSettingsOpen, setMenuOpen])

  return (
    <main className="app-shell">
      <Sidebar />
      <section className="app-main">
        <Topbar />
        {children}
      </section>
      <MobileNav />
      {menuOpen && (
        <div className="menu-backdrop" onMouseDown={() => setMenuOpen(false)}>
          <div onMouseDown={(e) => e.stopPropagation()}>
            <Sidebar drawer />
          </div>
        </div>
      )}
      <EventDrawer />
      <CommandPalette />
      {settingsOpen && <SettingsModal />}
    </main>
  )
}

function Sidebar({ drawer = false }: { drawer?: boolean }) {
  const { screen, navigate, profile, data, setSettingsOpen, setMenuOpen } = useStore()
  const stats = focusStats(data.events, weekKey(0), profile.studyGoal)

  return (
    <aside className={drawer ? "sidebar sidebar-drawer" : "sidebar"}>
      <div className="sidebar-top">
        <Logo onClick={() => navigate("overview")} />
        {drawer && (
          <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label={t("Close menu")}>
            <X size={18} />
          </button>
        )}
      </div>
      <nav>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={screen === id ? "active" : ""}
            onClick={() => navigate(id)}
            aria-label={t(label)}
            title={t(label)}
          >
            <Icon size={19} /> {t(label)}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <button className="focus-card" onClick={() => navigate("goals")}>
        <span>
          <Sparkles size={15} />
        </span>
        <strong>{stats.remaining > 0 ? t("Stay in your flow") : t("Goal reached!")}</strong>
        <p>
          {stats.remaining > 0
            ? t("You have {n} study hours left this week.", { n: formatHours(stats.remaining) })
            : t("You hit your weekly study goal. Enjoy the downtime.")}
        </p>
        <div>
          <i style={{ width: `${stats.pct}%` }} />
        </div>
      </button>
      <button className="profile-row" onClick={() => setSettingsOpen(true)} title={t("Profile & settings")}>
        <span>{initials(profile.name)}</span>
        <div>
          <strong>{profile.name}</strong>
          <small>{profile.email}</small>
        </div>
        <Settings2 size={17} />
      </button>
    </aside>
  )
}

type Notice = {
  id: string
  kind: "event" | "task"
  title: string
  meta: string
}

function useNotices(): Notice[] {
  const { data } = useStore()
  const today = todayIndex()
  const now = nowHours()
  const notices: Notice[] = []
  if (today < 5)
    eventsForDay(data.events, weekKey(0), today)
      .filter((e) => e.start > now)
      .slice(0, 3)
      .forEach((e) =>
        notices.push({
          id: e.id,
          kind: "event",
          title: t("{title} at {time}", { title: e.title, time: formatTime(e.start) }),
          meta: e.detail || typeLabel(e.type),
        }),
      )
  data.tasks
    .filter((task) => !task.done && daysUntil(task.due) <= 2)
    .sort((a, b) => a.due.localeCompare(b.due))
    .forEach((task) =>
      notices.push({
        id: task.id,
        kind: "task",
        title: task.title,
        meta: `${
          daysUntil(task.due) < 0
            ? t("Overdue")
            : t("Due {when}", { when: dueLabel(task.due).toLocaleLowerCase(getLang()) })
        } · ${task.subject}`,
      }),
    )
  return notices
}

function Topbar() {
  const {
    profile,
    updateProfile,
    toast,
    setMenuOpen,
    setPaletteOpen,
    setSettingsOpen,
    openEvent,
    navigate,
  } = useStore()
  const notices = useNotices()
  const [bellOpen, setBellOpen] = useState(false)
  const [seenCount, setSeenCount] = useState(0)
  const anchorRef = useRef<HTMLDivElement>(null)
  const unread = profile.reminders && notices.length > seenCount

  useEffect(() => {
    if (!bellOpen) return
    const onDown = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [bellOpen])

  const toggleDigest = () => {
    const next = !profile.emailDigest
    updateProfile({ emailDigest: next })
    toast(
      next
        ? t("Weekly digest turned on — summaries go to {email}", { email: profile.email })
        : t("Weekly email digest turned off"),
    )
  }

  return (
    <header className="app-topbar">
      <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label={t("Open menu")}>
        <Menu size={20} />
      </button>
      <button className="topbar-search" onClick={() => setPaletteOpen(true)}>
        <Search size={17} />
        <span>{t("Search your schedule")}</span>
        <kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
      </button>
      <div className="topbar-actions">
        <button
          className="icon-button mobile-search"
          onClick={() => setPaletteOpen(true)}
          aria-label={t("Search")}
        >
          <Search size={18} />
        </button>
        <div className="popover-anchor" ref={anchorRef}>
          <button
            className={`icon-button ${unread ? "has-dot" : ""}`}
            onClick={() => {
              setBellOpen((open) => !open)
              setSeenCount(notices.length)
            }}
            aria-label={t("Notifications")}
            aria-expanded={bellOpen}
          >
            {profile.reminders ? <BellRing size={19} /> : <Bell size={19} />}
          </button>
          {bellOpen && (
            <div className="popover" role="dialog" aria-label={t("Notifications")}>
              <header>
                <strong>{t("Notifications")}</strong>
                <label>
                  {t("Reminders")}
                  <Switch
                    checked={profile.reminders}
                    label={t("Reminders")}
                    onChange={(reminders) => {
                      updateProfile({ reminders })
                      toast(reminders ? t("Reminders turned on") : t("Reminders paused"))
                    }}
                  />
                </label>
              </header>
              {!profile.reminders ? (
                <p className="popover-empty">
                  {t("Reminders are paused. Turn them on to see what’s coming up.")}
                </p>
              ) : notices.length === 0 ? (
                <p className="popover-empty">
                  <Check size={16} /> {t("You’re all caught up.")}
                </p>
              ) : (
                <ul>
                  {notices.map((n) => (
                    <li key={n.id} className={n.kind}>
                      <button
                        onClick={() => {
                          setBellOpen(false)
                          if (n.kind === "event") openEvent(n.id, weekKey(0))
                          else navigate("goals")
                        }}
                      >
                        <span>
                          {n.kind === "event" ? <Clock size={15} /> : <ClipboardList size={15} />}
                        </span>
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.meta}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button
          className={`sync-button ${profile.emailDigest ? "synced" : ""}`}
          onClick={toggleDigest}
          aria-pressed={profile.emailDigest}
          title={t("Weekly schedule summary by email")}
        >
          <Mail size={17} /> {profile.emailDigest ? t("Digest on") : t("Email digest")}
          {profile.emailDigest && <Check size={14} />}
        </button>
        <button
          className="top-avatar"
          onClick={() => setSettingsOpen(true)}
          aria-label={t("Profile & settings")}
        >
          {initials(profile.name)}
        </button>
      </div>
    </header>
  )
}

/** Small sheet asking what to add, so the "+" never drops students into an unlabeled form. */
export function AddChooser({
  onClose,
  className = "",
  prefill = {},
  weekStart,
}: {
  onClose: () => void
  className?: string
  prefill?: { day?: number }
  weekStart?: string
}) {
  const { openNewEvent } = useStore()
  return (
    <>
      <div className="add-chooser-scrim" onMouseDown={onClose} />
      <div className={`add-chooser ${className}`} role="menu" aria-label={t("What do you want to add?")}>
        <strong>{t("What do you want to add?")}</strong>
        {(["class", "study", "activity"] as EventType[]).map((type) => (
          <button
            key={type}
            role="menuitem"
            className={`add-choice type-${type}`}
            onClick={() => {
              onClose()
              openNewEvent({ ...prefill, type, recurring: type !== "study" }, weekStart)
            }}
          >
            <span className="add-choice-icon">
              <TypeIcon type={type} size={18} />
            </span>
            <span>
              <b>{t(TYPE_META[type].add)}</b>
              <small>
                {type === "class"
                  ? t("A lecture, lab or section")
                  : type === "study"
                    ? t("Time to review or do homework")
                    : t("Clubs, work, gym…")}
              </small>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function MobileNav() {
  const { screen, navigate, setSettingsOpen } = useStore()
  const [choosing, setChoosing] = useState(false)
  const tab = (id: AppScreen, label: string, Icon: typeof CalendarDays) => (
    <button className={screen === id ? "active" : ""} onClick={() => navigate(id)}>
      <Icon size={19} />
      <span>{t(label)}</span>
    </button>
  )
  return (
    <nav className="mobile-bottom-nav" aria-label={t("Primary navigation")}>
      {tab("overview", "Overview", LayoutDashboard)}
      {tab("planner", "Schedule", CalendarDays)}
      <button
        className={`mobile-add-button ${choosing ? "open" : ""}`}
        onClick={() => setChoosing((c) => !c)}
        aria-label={t("Add to your schedule")}
        aria-expanded={choosing}
      >
        <Plus size={22} />
      </button>
      {tab("goals", "Goals", Target)}
      <button onClick={() => setSettingsOpen(true)}>
        <UserRound size={19} />
        <span>{t("Profile")}</span>
      </button>
      {choosing && <AddChooser onClose={() => setChoosing(false)} className="from-nav" />}
    </nav>
  )
}
