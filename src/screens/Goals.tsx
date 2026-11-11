import { useRef, useState, type FormEvent } from "react"
import { ArrowRight, Check, Minus, Plus, Target, Trash2 } from "lucide-react"
import {
  addDays,
  daysUntil,
  dueLabel,
  formatHours,
  formatTime,
  toKey,
  weekKey,
  WEEKDAYS,
} from "../lib/dates"
import {
  classSubjects,
  eventsForWeek,
  focusStats,
  isDone,
  subjectMatches,
  suggestBlock,
  uid,
} from "../lib/schedule"
import { useStore } from "../lib/store"
import { ProgressRing } from "../components/ui"

export function GoalsScreen() {
  const {
    data,
    profile,
    updateProfile,
    openNewEvent,
    openEvent,
    toggleDone,
    addTask,
    toggleTask,
    deleteTask,
  } = useStore()
  const wk = weekKey(0)
  const stats = focusStats(data.events, wk, profile.studyGoal)
  const studyBlocks = eventsForWeek(data.events, wk)
    .filter((e) => e.type === "study")
    .sort((a, b) => a.day - b.day || a.start - b.start)
  const subjects = classSubjects(data.events)
  const suggestion = suggestBlock(data.events, wk, profile.focusPref, 0)

  const subjectRows = subjects.map((subject) => {
    const blocks = studyBlocks.filter((e) => subjectMatches(`${e.title} ${e.detail}`, subject))
    return {
      subject,
      planned: blocks.reduce((s, e) => s + e.duration, 0),
      completed: blocks.filter((e) => isDone(e, wk)).reduce((s, e) => s + e.duration, 0),
    }
  })
  const maxSubject = Math.max(1, ...subjectRows.map((r) => r.planned))

  const [tab, setTab] = useState<"open" | "done">("open")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState(subjects[0] ?? "General")
  const [due, setDue] = useState(toKey(addDays(new Date(), 3)))
  const titleRef = useRef<HTMLInputElement>(null)

  const tasks = data.tasks
    .filter((t) => (tab === "open" ? !t.done : t.done))
    .sort((a, b) => (tab === "open" ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due)))
  const openCount = data.tasks.filter((t) => !t.done).length

  const setGoal = (goal: number) => updateProfile({ studyGoal: Math.min(40, Math.max(1, goal)) })

  const planGap = () =>
    openNewEvent(
      suggestion
        ? {
            type: "study",
            title: "Focus session",
            day: suggestion.day,
            start: suggestion.start,
            duration: suggestion.duration,
            recurring: false,
          }
        : { type: "study" },
      wk,
    )

  const submitTask = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    addTask({ id: uid(), title: title.trim(), subject, due, done: false })
    setTitle("")
    setTab("open")
    titleRef.current?.focus()
  }

  return (
    <div className="goals-content">
      <div className="overview-heading">
        <div>
          <span className="page-kicker">STUDY GOALS</span>
          <h1>Progress you can feel.</h1>
          <p>Track focus hours for this week and keep deadlines from sneaking up on you.</p>
        </div>
        <button className="button button-primary" onClick={() => openNewEvent({ type: "study" }, wk)}>
          <Plus size={16} /> Add study block
        </button>
      </div>

      <div className="goals-grid">
        <section className="overview-card">
          <header>
            <div>
              <span>WEEKLY TARGET</span>
              <h2>Focus hours</h2>
            </div>
          </header>
          <div className="goal-hero">
            <ProgressRing value={stats.pct} large />
            <div>
              <h2 className="goal-number">
                {formatHours(stats.completed)}
                <small> / {stats.goal} hrs done</small>
              </h2>
              <p className="goal-sub">{formatHours(stats.planned)} hrs planned this week</p>
              <div className="stepper" aria-label="Weekly goal">
                <button onClick={() => setGoal(stats.goal - 1)} aria-label="Lower weekly goal">
                  <Minus size={14} />
                </button>
                <strong>Goal: {stats.goal} hrs</strong>
                <button onClick={() => setGoal(stats.goal + 1)} aria-label="Raise weekly goal">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
          {stats.planned < stats.goal ? (
            <div className="goal-note">
              <span>
                You’ve planned {formatHours(stats.planned)} of {stats.goal} hours — add{" "}
                {formatHours(stats.goal - stats.planned)} more to hit your goal.
              </span>
              <button onClick={planGap}>
                Plan the gap <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="goal-note">
              <span>
                <Target size={14} /> Your plan covers your goal. Now it’s just showing up.
              </span>
            </div>
          )}
        </section>

        <section className="overview-card">
          <header>
            <div>
              <span>BY SUBJECT</span>
              <h2>Where your focus goes</h2>
            </div>
          </header>
          <div className="subject-bars">
            {subjectRows.length === 0 && (
              <p className="card-empty">Add classes to see a breakdown by subject.</p>
            )}
            {subjectRows.map((row, i) => (
              <div className="subject-bar" key={row.subject}>
                <div className="subject-bar-label">
                  <strong>{row.subject}</strong>
                  <small>
                    {formatHours(row.completed)} / {formatHours(row.planned)} hrs
                  </small>
                </div>
                <div className={`subject-track tone-${i % 3}`}>
                  <i style={{ width: `${(row.planned / maxSubject) * 100}%` }} />
                  <b style={{ width: `${(row.completed / maxSubject) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-card">
          <header>
            <div>
              <span>THIS WEEK</span>
              <h2>Focus sessions</h2>
            </div>
            <b className="count-pill">
              {studyBlocks.filter((e) => isDone(e, wk)).length}/{studyBlocks.length} done
            </b>
          </header>
          <div className="block-list">
            {studyBlocks.length === 0 && (
              <p className="card-empty">No focus sessions yet — add one to start tracking.</p>
            )}
            {studyBlocks.map((event) => {
              const done = isDone(event, wk)
              return (
                <div className={`block-item ${done ? "done" : ""}`} key={event.id}>
                  <button
                    className={`check-box ${done ? "checked" : ""}`}
                    onClick={() => toggleDone(event.id, wk)}
                    aria-label={done ? `Mark ${event.title} not done` : `Mark ${event.title} done`}
                    aria-pressed={done}
                  >
                    {done && <Check size={13} strokeWidth={3} />}
                  </button>
                  <button className="block-copy" onClick={() => openEvent(event.id, wk)}>
                    <strong>{event.title}</strong>
                    <small>
                      {WEEKDAYS[event.day].label} · {formatTime(event.start)} · {formatHours(event.duration)} hr
                    </small>
                  </button>
                  <em>{done ? "Done" : ""}</em>
                </div>
              )
            })}
          </div>
        </section>

        <section className="overview-card deadlines-card">
          <header>
            <div>
              <span>DEADLINES</span>
              <h2>Assignments & exams</h2>
            </div>
            <div className="tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "open"}
                className={tab === "open" ? "active" : ""}
                onClick={() => setTab("open")}
              >
                Upcoming {openCount ? `(${openCount})` : ""}
              </button>
              <button
                role="tab"
                aria-selected={tab === "done"}
                className={tab === "done" ? "active" : ""}
                onClick={() => setTab("done")}
              >
                Completed
              </button>
            </div>
          </header>
          <form className="deadline-form" onSubmit={submitTask}>
            <input
              ref={titleRef}
              value={title}
              placeholder="Add a deadline, e.g. Midterm essay"
              aria-label="Deadline title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject">
              {[...subjects, "General"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              type="date"
              value={due}
              aria-label="Due date"
              onChange={(e) => e.target.value && setDue(e.target.value)}
            />
            <button type="submit" className="button button-dark">
              <Plus size={15} /> Add
            </button>
          </form>
          <div className="deadline-list">
            {tasks.length === 0 && (
              <p className="card-empty">
                {tab === "open" ? "You’re all clear. Nothing due right now." : "Completed deadlines will show up here."}
              </p>
            )}
            {tasks.map((task) => {
              const days = daysUntil(task.due)
              return (
                <div className={`deadline-item ${task.done ? "done" : ""}`} key={task.id}>
                  <button
                    className={`check-box ${task.done ? "checked" : ""}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                    aria-pressed={task.done}
                  >
                    {task.done && <Check size={13} strokeWidth={3} />}
                  </button>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.subject}</small>
                  </span>
                  <b
                    className={`due-badge ${
                      !task.done && days < 0 ? "overdue" : !task.done && days <= 1 ? "soon" : ""
                    }`}
                  >
                    {dueLabel(task.due)}
                  </b>
                  <button
                    className="row-delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
