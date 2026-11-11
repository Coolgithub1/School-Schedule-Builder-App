import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  DAY_END,
  DAY_SPAN,
  DAY_START,
  formatDuration,
  formatHours,
  formatTime,
  hourLabel,
  HOURS,
  relativeWeekLabel,
  timeParts,
  timeZoneLabel,
  todayIndex,
  weekDates,
  WEEKDAYS,
  weekRangeLabel,
} from "../lib/dates"
import { eventsForWeek, focusStats, isDone, suggestBlock } from "../lib/schedule"
import { useNow, useStore } from "../lib/store"
import type { ScheduleEvent } from "../lib/types"

type DragInfo = {
  id: string
  startX: number
  startY: number
  grab: number
  duration: number
  originDay: number
  originStart: number
  day: number
  start: number
  moved: boolean
}

const pct = (hours: number) => `${(hours / DAY_SPAN) * 100}%`

export function PlannerScreen() {
  const {
    data,
    profile,
    weekOffset,
    setWeekOffset,
    viewWeek,
    openNewEvent,
    openEvent,
    deleteEvent,
    moveEvent,
  } = useStore()
  const now = useNow()
  const today = todayIndex()
  const isCurrent = weekOffset === 0
  const [editing, setEditing] = useState(false)
  const [selectedDay, setSelectedDay] = useState(today < 5 ? today : 0)
  const [hover, setHover] = useState<{ day: number; start: number } | null>(null)
  const [drag, setDrag] = useState<{ id: string; day: number; start: number } | null>(null)
  const [pointerActive, setPointerActive] = useState(false)
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragRef = useRef<DragInfo | null>(null)
  const justDragged = useRef(false)

  const weekEvents = eventsForWeek(data.events, viewWeek)
  const dates = weekDates(viewWeek)
  const stats = focusStats(data.events, viewWeek, profile.studyGoal)
  const classCount = new Set(weekEvents.filter((e) => e.type === "class").map((e) => e.title)).size
  const suggestion = suggestBlock(data.events, viewWeek, profile.focusPref, weekOffset)
  const nowH = now.getHours() + now.getMinutes() / 60
  const showNow = isCurrent && today < 5 && nowH >= DAY_START && nowH <= DAY_END
  const dayAgenda = weekEvents
    .filter((e) => e.day === selectedDay)
    .sort((a, b) => a.start - b.start)

  useEffect(() => {
    if (!pointerActive) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return
      if (!d.moved) {
        d.moved = true
        document.body.classList.add("is-dragging-event")
        setHover(null)
      }
      let day = d.day
      columnRefs.current.forEach((col, i) => {
        if (!col) return
        const r = col.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX < r.right) day = i
      })
      const rect = columnRefs.current[day]?.getBoundingClientRect()
      if (!rect) return
      const raw = DAY_START + ((e.clientY - rect.top) / rect.height) * DAY_SPAN - d.grab
      const start = Math.min(DAY_END - d.duration, Math.max(DAY_START, Math.round(raw * 2) / 2))
      if (day !== d.day || start !== d.start) {
        d.day = day
        d.start = start
        setDrag({ id: d.id, day, start })
      }
    }
    const onUp = () => {
      const d = dragRef.current
      dragRef.current = null
      setPointerActive(false)
      setDrag(null)
      document.body.classList.remove("is-dragging-event")
      if (!d) return
      if (d.moved) {
        justDragged.current = true
        window.setTimeout(() => (justDragged.current = false), 0)
        if (d.day !== d.originDay || d.start !== d.originStart) moveEvent(d.id, d.day, d.start)
      } else {
        openEvent(d.id, viewWeek)
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [pointerActive, moveEvent, openEvent, viewWeek])

  const startDrag = (e: ReactPointerEvent, event: ScheduleEvent) => {
    if (e.button !== 0) return
    const col = columnRefs.current[event.day]
    if (!col) return
    const rect = col.getBoundingClientRect()
    const pointerHour = DAY_START + ((e.clientY - rect.top) / rect.height) * DAY_SPAN
    dragRef.current = {
      id: event.id,
      startX: e.clientX,
      startY: e.clientY,
      grab: pointerHour - event.start,
      duration: event.duration,
      originDay: event.day,
      originStart: event.start,
      day: event.day,
      start: event.start,
      moved: false,
    }
    setPointerActive(true)
  }

  const slotAt = (e: ReactMouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const raw = DAY_START + Math.floor(((e.clientY - r.top) / r.height) * DAY_SPAN * 2) / 2
    return Math.min(DAY_END - 1, Math.max(DAY_START, raw))
  }

  const addSuggestion = () =>
    suggestion &&
    openNewEvent(
      {
        type: "study",
        title: "Focus session",
        detail: "Suggested by studyflow",
        day: suggestion.day,
        start: suggestion.start,
        duration: suggestion.duration,
        recurring: false,
      },
      viewWeek,
    )

  const weekSwitcher = (
    <div className="week-switcher">
      <button onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
        <ChevronLeft size={17} />
      </button>
      <strong>{relativeWeekLabel(weekOffset, viewWeek)}</strong>
      <button onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
        <ChevronRight size={17} />
      </button>
      {!isCurrent && (
        <button className="today-button" onClick={() => setWeekOffset(0)}>
          Today
        </button>
      )}
    </div>
  )

  return (
    <div className="planner-content">
      <div className="planner-heading">
        <div>
          <span className="page-kicker">MY SCHEDULE</span>
          <h1>
            {isCurrent ? "Your week, in balance." : weekOffset > 0 ? "Planning ahead." : "Looking back."}
          </h1>
          <p>
            {weekRangeLabel(viewWeek)} · {classCount} {classCount === 1 ? "class" : "classes"} ·{" "}
            {formatHours(stats.planned)} focus hours planned
          </p>
        </div>
        <div className="planner-actions">
          <button
            className={`button ${editing ? "button-dark" : "button-ghost"}`}
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
          >
            {editing ? <Check size={16} /> : <Pencil size={16} />}
            {editing ? "Done editing" : "Edit week"}
          </button>
          <button className="button button-primary" onClick={() => openNewEvent({}, viewWeek)}>
            <Plus size={17} /> Add block
          </button>
        </div>
      </div>

      {editing && (
        <p className="edit-hint">
          Editing — tap the trash icon to remove a block. You can drag blocks to a new time anytime.
        </p>
      )}

      <div className="calendar-card">
        <div className="calendar-toolbar">
          {weekSwitcher}
          <div className="legend">
            <span>
              <i className="class" />
              Class
            </span>
            <span>
              <i className="study" />
              Study
            </span>
            <span>
              <i className="activity" />
              Activity
            </span>
          </div>
        </div>
        <div className="calendar-grid">
          <div className="calendar-corner">{timeZoneLabel()}</div>
          {WEEKDAYS.map((day, index) => (
            <div
              className={`day-header ${isCurrent && index === today ? "today" : ""}`}
              key={day.short}
            >
              <span>{day.short}</span>
              <strong>{dates[index].getDate()}</strong>
            </div>
          ))}
          <div className="time-column">
            {HOURS.map((hour) => (
              <span key={hour} style={{ top: pct(hour - DAY_START) }}>
                {hourLabel(hour)}
              </span>
            ))}
          </div>
          {WEEKDAYS.map((day, dayIndex) => {
            const columnEvents = weekEvents
              .map((e) => (drag && e.id === drag.id ? { ...e, day: drag.day, start: drag.start } : e))
              .filter((e) => e.day === dayIndex)
            return (
              <div
                className={`day-column ${isCurrent && dayIndex === today ? "is-today" : ""}`}
                key={day.short}
                ref={(el) => {
                  columnRefs.current[dayIndex] = el
                }}
                style={{ backgroundSize: `100% ${100 / DAY_SPAN}%` }}
                onClick={(e) => {
                  if (justDragged.current || e.target !== e.currentTarget) return
                  openNewEvent({ day: dayIndex, start: slotAt(e), duration: 1 }, viewWeek)
                }}
                onMouseMove={(e) => {
                  if (pointerActive) return
                  if (e.target !== e.currentTarget) {
                    if (hover) setHover(null)
                    return
                  }
                  const start = slotAt(e)
                  if (!hover || hover.day !== dayIndex || hover.start !== start)
                    setHover({ day: dayIndex, start })
                }}
                onMouseLeave={() => setHover(null)}
              >
                {HOURS.map((hour) => (
                  <i className="hour-line" key={hour} style={{ height: pct(1) }} />
                ))}
                {hover && hover.day === dayIndex && !drag && (
                  <div
                    className="slot-hint"
                    style={{ top: pct(hover.start - DAY_START), height: pct(1) }}
                  >
                    <Plus size={12} /> {formatTime(hover.start)}
                  </div>
                )}
                {showNow && dayIndex === today && (
                  <div className="now-line" style={{ top: pct(nowH - DAY_START) }}>
                    <span />
                  </div>
                )}
                {columnEvents.map((event) => {
                  const done = isDone(event, viewWeek)
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      className={`calendar-event event-${event.type} ${editing ? "is-editing" : ""} ${
                        done ? "is-done" : ""
                      } ${drag?.id === event.id ? "is-dragging" : ""} ${
                        event.duration <= 0.5 ? "is-short" : ""
                      }`}
                      key={event.id}
                      style={{ top: pct(event.start - DAY_START), height: pct(event.duration) }}
                      onPointerDown={(e) => startDrag(e, event)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          openEvent(event.id, viewWeek)
                        }
                      }}
                      aria-label={`${event.title}, ${WEEKDAYS[event.day].label} ${formatTime(event.start)}${
                        done ? ", completed" : ""
                      }`}
                      title={`${event.title} · ${formatTime(event.start)}–${formatTime(event.start + event.duration)}`}
                    >
                      <strong>
                        {done && <Check size={10} strokeWidth={3} />} {event.title}
                      </strong>
                      <span>
                        {formatTime(event.start)}
                        {event.detail ? ` · ${event.detail}` : ""}
                      </span>
                      {editing && (
                        <button
                          className="event-delete"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteEvent(event.id)
                          }}
                          aria-label={`Delete ${event.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="mobile-calendar">
          <div className="mobile-week-nav">
            {weekSwitcher}
            <span>{weekRangeLabel(viewWeek, false)}</span>
          </div>
          <div className="mobile-day-picker">
            {WEEKDAYS.map((day, index) => {
              const hasEvents = weekEvents.some((e) => e.day === index)
              return (
                <button
                  className={`${selectedDay === index ? "active" : ""} ${
                    isCurrent && index === today ? "is-today" : ""
                  }`}
                  onClick={() => setSelectedDay(index)}
                  key={day.short}
                  aria-label={`${day.label} ${dates[index].getDate()}`}
                >
                  <span>{day.letter}</span>
                  <strong>{dates[index].getDate()}</strong>
                  <i style={{ opacity: hasEvents ? 1 : 0 }} />
                </button>
              )
            })}
          </div>
          <div className="mobile-agenda-heading">
            <div>
              <span>{WEEKDAYS[selectedDay].label}</span>
              <strong>
                {dayAgenda.length} {dayAgenda.length === 1 ? "block" : "blocks"} planned
              </strong>
            </div>
            <button onClick={() => openNewEvent({ day: selectedDay }, viewWeek)}>
              <Plus size={16} /> Add
            </button>
          </div>
          <div className="mobile-agenda-list">
            {dayAgenda.map((event) => {
              const { time, suffix } = timeParts(event.start)
              const done = isDone(event, viewWeek)
              return (
                <article
                  role="button"
                  tabIndex={0}
                  className={`mobile-agenda-item event-${event.type} ${done ? "is-done" : ""}`}
                  key={event.id}
                  onClick={() => openEvent(event.id, viewWeek)}
                  onKeyDown={(e) => e.key === "Enter" && openEvent(event.id, viewWeek)}
                >
                  <div className="mobile-event-time">
                    <strong>{time}</strong>
                    <span>{suffix}</span>
                  </div>
                  <i />
                  <div className="mobile-event-copy">
                    <strong>
                      {done && <Check size={11} strokeWidth={3} />} {event.title}
                    </strong>
                    <span>
                      {event.detail ? `${event.detail} · ` : ""}
                      {formatDuration(event.duration)}
                    </span>
                  </div>
                  {editing ? (
                    <button
                      className="mobile-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteEvent(event.id)
                      }}
                      aria-label={`Delete ${event.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </article>
              )
            })}
            {dayAgenda.length === 0 && (
              <button
                className="mobile-empty-day"
                onClick={() => openNewEvent({ day: selectedDay }, viewWeek)}
              >
                <Sparkles size={18} />
                <strong>A clear day</strong>
                <span>Add a study block or take time to recharge.</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="schedule-note">
        <Sparkles size={15} />
        <span>
          {suggestion ? (
            <>
              <strong>Flow tip:</strong> {WEEKDAYS[suggestion.day].label} has the most breathing
              room — {formatTime(suggestion.start)} is open for a{" "}
              {formatHours(suggestion.duration)}-hour focus session.
            </>
          ) : weekOffset < 0 ? (
            <>
              <strong>Looking back:</strong> you completed {formatHours(stats.completed)} of{" "}
              {stats.goal} focus hours this week.
            </>
          ) : (
            <>
              <strong>Flow tip:</strong> Your week is fully booked — protect some downtime too.
            </>
          )}
        </span>
        {suggestion && (
          <button onClick={addSuggestion}>
            Add it <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
