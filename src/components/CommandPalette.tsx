import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  BookOpen,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Search,
  Settings2,
  Target,
} from "lucide-react"
import { dueLabel, formatTime, WEEKDAYS } from "../lib/dates"
import { eventsForWeek } from "../lib/schedule"
import { getLang, t } from "../lib/i18n"
import { useStore } from "../lib/store"
import { TypeIcon } from "./TypeIcon"

type Item = {
  id: string
  group: string
  label: string
  hint: string
  icon: ReactNode
  tone?: string
  run: () => void
}

export function CommandPalette() {
  const { paletteOpen } = useStore()
  return paletteOpen ? <Palette /> : null
}

function Palette() {
  const {
    data,
    viewWeek,
    navigate,
    openNewEvent,
    openEvent,
    setPaletteOpen,
    setSettingsOpen,
    setWeekOffset,
  } = useStore()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const close = () => setPaletteOpen(false)

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: "a-class", group: "Actions", label: t("Add class"), hint: t("A lecture, lab or section"), icon: <TypeIcon type="class" />, tone: "class", run: () => openNewEvent({ type: "class", recurring: true }) },
      { id: "a-study", group: "Actions", label: t("Add study time"), hint: t("Time to review or do homework"), icon: <TypeIcon type="study" />, tone: "study", run: () => openNewEvent({ type: "study" }) },
      { id: "a-sched", group: "Actions", label: t("Go to Schedule"), hint: t("Weekly calendar"), icon: <CalendarDays size={16} />, run: () => navigate("planner") },
      { id: "a-over", group: "Actions", label: t("Go to Overview"), hint: t("Today at a glance"), icon: <LayoutDashboard size={16} />, run: () => navigate("overview") },
      { id: "a-goals", group: "Actions", label: t("Go to Study goals"), hint: t("Study hours and deadlines"), icon: <Target size={16} />, run: () => navigate("goals") },
      { id: "a-today", group: "Actions", label: t("Jump to this week"), hint: t("Reset the calendar to today"), icon: <CalendarCheck size={16} />, run: () => { setWeekOffset(0); navigate("planner") } },
      { id: "a-set", group: "Actions", label: t("Open settings"), hint: t("Profile, language, goals and reminders"), icon: <Settings2 size={16} />, run: () => setSettingsOpen(true) },
    ]
    const events: Item[] = eventsForWeek(data.events, viewWeek)
      .sort((a, b) => a.day - b.day || a.start - b.start)
      .map((e) => ({
        id: e.id,
        group: "Schedule",
        label: e.title,
        hint: `${WEEKDAYS[e.day].label} · ${formatTime(e.start)}${e.detail ? ` · ${e.detail}` : ""}${e.notes ? ` · ${e.notes}` : ""}`,
        icon: <TypeIcon type={e.type} />,
        tone: e.type,
        run: () => {
          navigate("planner")
          openEvent(e.id, viewWeek)
        },
      }))
    const tasks: Item[] = data.tasks
      .filter((task) => !task.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((task) => ({
        id: task.id,
        group: "Deadlines",
        label: task.title,
        hint: t("{subject} · due {when}", { subject: task.subject, when: dueLabel(task.due).toLocaleLowerCase(getLang()) }),
        icon: <ClipboardList size={16} />,
        tone: "task",
        run: () => navigate("goals"),
      }))
    return [...actions, ...events, ...tasks]
  }, [data, viewWeek, navigate, openEvent, openNewEvent, setSettingsOpen, setWeekOffset])

  const q = query.trim().toLowerCase()
  const results = q
    ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q))
    : items.filter((i) => i.group === "Actions" || items.indexOf(i) < 12)

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  const run = (item: Item | undefined) => {
    if (!item) return
    close()
    item.run()
  }

  let lastGroup = ""
  return (
    <div className="palette-backdrop" onMouseDown={close}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t("Search")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-input">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            placeholder={t("Search classes, study time, deadlines…")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === "Enter") {
                e.preventDefault()
                run(results[active])
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-results" ref={listRef}>
          {results.length === 0 && (
            <p className="palette-empty">{t("No matches for “{query}”.", { query })}</p>
          )}
          {results.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <div key={item.id}>
                {header && <div className="palette-group">{t(header)}</div>}
                <button
                  data-index={index}
                  className={`palette-item ${item.tone ? `tone-${item.tone}` : ""} ${
                    index === active ? "active" : ""
                  }`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(item)}
                >
                  <span>{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {index === active && <em>Enter ↵</em>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
