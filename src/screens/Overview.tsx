import { useState } from "react"
import { CalendarDays, Check, ChevronRight, Plus, RefreshCw, Sparkles } from "lucide-react"
import {
  addDays,
  DAY_START,
  dueLabel,
  daysUntil,
  formatDuration,
  formatHours,
  greeting,
  longDateLabel,
  timeParts,
  todayIndex,
  weekKey,
  WEEKDAYS,
} from "../lib/dates"
import { classSubjects, eventsForDay, focusStats, largestGap } from "../lib/schedule"
import { firstName } from "../lib/seed"
import { useNow, useStore } from "../lib/store"
import type { ScheduleEvent } from "../lib/types"
import { ProgressRing } from "../components/ui"
import { TypeIcon } from "../components/TypeIcon"
import { getLang, t } from "../lib/i18n"

const QUOTES = [
  "Small steps, every day, add up to remarkable progress.",
  "You don’t have to do it all today. Just the next right thing.",
  "Rest is part of the plan, not a break from it.",
  "Consistency beats intensity. Show up, then show up again.",
  "Future you is already grateful for the work you do today.",
]

const SUBJECT_COLORS = ["purple", "orange", "green"]

type TimelineRow =
  | { kind: "event"; start: number; event: ScheduleEvent }
  | { kind: "gap"; start: number; duration: number }

export function OverviewScreen() {
  const { data, profile, navigate, openEvent, openNewEvent, toggleTask } = useStore()
  const now = useNow()
  const today = todayIndex()
  const weekend = today > 4
  const focusDay = weekend ? 0 : today
  const focusWeek = weekKey(weekend ? 1 : 0)
  const focusDate = weekend ? addDays(now, 7 - today) : now
  const nowH = now.getHours() + now.getMinutes() / 60

  const dayEvents = eventsForDay(data.events, focusWeek, focusDay)
  const gap = largestGap(
    data.events,
    focusWeek,
    focusDay,
    weekend ? DAY_START : Math.ceil(nowH * 2) / 2,
  )
  const rows: TimelineRow[] = [
    ...dayEvents.map((event) => ({ kind: "event" as const, start: event.start, event })),
    ...(gap && gap.duration >= 1
      ? [{ kind: "gap" as const, start: gap.start, duration: gap.duration }]
      : []),
  ].sort((a, b) => a.start - b.start)

  const stats = focusStats(data.events, weekKey(0), profile.studyGoal)
  const expected = (stats.goal * Math.min(today + 1, 5)) / 5
  const status =
    stats.pct >= 100
      ? t("Goal reached — amazing week.")
      : stats.completed >= expected - 0.01
        ? t("You’re right on track.")
        : stats.planned < stats.goal
          ? t("Plan {n} more hrs to reach your goal.", { n: formatHours(stats.goal - stats.planned) })
          : t("One study session today keeps you on pace.")
  const maxPlanned = Math.max(1, ...stats.perDay.map((d) => d.planned))

  const subjects = classSubjects(data.events)
  const upcoming = data.tasks
    .filter((task) => !task.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4)

  const [quote, setQuote] = useState(() => Number(weekKey(0).slice(-2)) % QUOTES.length)

  return (
    <div className="overview-content">
      <div className="overview-heading">
        <div>
          <span className="page-kicker">{longDateLabel(now)}</span>
          <h1>
            {greeting(now)}, {firstName(profile.name)}.
          </h1>
          <p>{t("Here’s what your week looks like at a glance.")}</p>
        </div>
        <button className="button button-primary" onClick={() => navigate("planner")}>
          <CalendarDays size={16} /> {t("Open schedule")}
        </button>
      </div>
      <div className="overview-grid">
        <section className="overview-card today-card">
          <header>
            <div>
              <span>{weekend ? `${t("UP NEXT")} · ${WEEKDAYS[0].label.toLocaleUpperCase(getLang())}` : t("TODAY")}</span>
              <h2>{weekend ? t("Enjoy your weekend") : t("Your next few hours")}</h2>
            </div>
            <strong>{focusDate.getDate()}</strong>
          </header>
          <div className="timeline">
            {rows.length === 0 && (
              <div className="timeline-empty">
                <Sparkles size={18} />
                <strong>{t("Nothing scheduled")}</strong>
                <button onClick={() => openNewEvent({ day: focusDay }, focusWeek)}>
                  <TypeIcon type="study" size={14} /> {t("Add study time")}
                </button>
              </div>
            )}
            {rows.map((row) => {
              const { time, suffix } = timeParts(row.start)
              if (row.kind === "gap")
                return (
                  <div className="timeline-item open-time" key="gap">
                    <span>
                      {time}
                      <br />
                      <small>{suffix}</small>
                    </span>
                    <i />
                    <div>
                      <strong>{t("Free time to study")}</strong>
                      <small>{t("{d} available", { d: formatDuration(row.duration) })}</small>
                    </div>
                    <button
                      onClick={() =>
                        openNewEvent(
                          {
                            type: "study",
                            title: t("Study session"),
                            day: focusDay,
                            start: row.start,
                            duration: Math.min(1.5, row.duration),
                            recurring: false,
                          },
                          focusWeek,
                        )
                      }
                      aria-label={t("Plan a study session in this window")}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )
              const { event } = row
              const past = !weekend && event.start + event.duration <= nowH
              const live = !weekend && event.start <= nowH && nowH < event.start + event.duration
              return (
                <div
                  className={`timeline-item ${past ? "past" : ""} ${live ? "live" : ""}`}
                  key={event.id}
                >
                  <span>
                    {time}
                    <br />
                    <small>{suffix}</small>
                  </span>
                  <i className={event.type} />
                  <div>
                    <strong>
                      {event.title}
                      {live && <em className="live-pill">{t("Now")}</em>}
                    </strong>
                    <small>
                      {event.detail ? `${event.detail} · ` : ""}
                      {formatDuration(event.duration)}
                    </small>
                  </div>
                  <button
                    onClick={() => openEvent(event.id, focusWeek)}
                    aria-label={t("Open {title}", { title: event.title })}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="overview-card focus-summary">
          <header>
            <span>{t("WEEKLY STUDY")}</span>
            <button onClick={() => navigate("goals")}>{t("View goals")}</button>
          </header>
          <div className="focus-chart">
            <ProgressRing value={stats.pct} large />
            <div>
              <h2>{t("{done} of {goal} hours", { done: formatHours(stats.completed), goal: stats.goal })}</h2>
              <p>{status}</p>
            </div>
          </div>
          <div className="bar-chart">
            {stats.perDay.map((d, index) => (
              <div
                key={index}
                className={!weekend && index === today ? "today" : ""}
                title={t("{day}: {done} of {planned} hrs done", { day: WEEKDAYS[index].label, done: formatHours(d.completed), planned: formatHours(d.planned) })}
              >
                <i style={{ height: `${(d.planned / maxPlanned) * 100}%` }}>
                  <b style={{ height: d.planned ? `${(d.completed / d.planned) * 100}%` : 0 }} />
                </i>
                <span>{WEEKDAYS[index].letter}</span>
              </div>
            ))}
          </div>
          <div className="bar-legend">
            <span>
              <i className="done" /> {t("Completed")}
            </span>
            <span>
              <i /> {t("Planned")}
            </span>
          </div>
        </section>

        <section className="overview-card upcoming-card">
          <header>
            <div>
              <span>{t("UPCOMING")}</span>
              <h2>{t("Deadlines & events")}</h2>
            </div>
            <button onClick={() => navigate("goals")}>{t("See all")}</button>
          </header>
          <div className="upcoming-list">
            {upcoming.length === 0 && (
              <div className="upcoming-empty">
                <p>{t("No deadlines coming up.")}</p>
                <button onClick={() => navigate("goals")}>
                  <Plus size={14} /> {t("Add a deadline")}
                </button>
              </div>
            )}
            {upcoming.map((task) => {
              const color = SUBJECT_COLORS[subjects.indexOf(task.subject) % 3] ?? "gray"
              const days = daysUntil(task.due)
              return (
                <div key={task.id}>
                  <button
                    className={`task-check ${color}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={t("Mark {title} done", { title: task.title })}
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.subject}</small>
                  </span>
                  <b className={days < 0 ? "overdue" : days <= 1 ? "soon" : ""}>
                    {dueLabel(task.due)}
                  </b>
                </div>
              )
            })}
          </div>
        </section>

        <section className="quote-card">
          <button
            onClick={() => setQuote((q) => (q + 1) % QUOTES.length)}
            aria-label={t("Show another reminder")}
            title={t("Another one")}
          >
            <RefreshCw size={15} />
          </button>
          <Sparkles size={20} />
          <p>“{t(QUOTES[quote])}”</p>
          <span>{t("Your reminder for the week")}</span>
        </section>
      </div>
    </div>
  )
}
