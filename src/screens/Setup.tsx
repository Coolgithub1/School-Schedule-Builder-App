import { useState, type FormEvent } from "react"
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import {
  DAY_END,
  DURATION_OPTIONS,
  formatDuration,
  formatTime,
  TIME_OPTIONS,
  WEEKDAYS,
} from "../lib/dates"
import { generateSchedule, uid } from "../lib/schedule"
import { CLASS_PRESETS } from "../lib/seed"
import { useStore } from "../lib/store"
import type { FocusPref, SetupActivity, SetupClass } from "../lib/types"
import { Logo } from "../components/ui"

const dayName = (d: number) => WEEKDAYS[d].label.slice(0, 3)
const describeClass = (c: SetupClass) =>
  `${c.days.map(dayName).join(" · ")}, ${formatTime(c.start)}${c.location ? ` · ${c.location}` : ""}`

export function SetupScreen() {
  const { navigate, completeSetup, profile, toast } = useStore()
  const [step, setStep] = useState(1)
  const [classes, setClasses] = useState<SetupClass[]>(CLASS_PRESETS)
  const [selected, setSelected] = useState<string[]>(CLASS_PRESETS.map((c) => c.id))
  const [addingClass, setAddingClass] = useState(false)
  const [studyHours, setStudyHours] = useState(profile.studyGoal || 8)
  const [pref, setPref] = useState<FocusPref>(profile.focusPref)
  const [activities, setActivities] = useState<SetupActivity[]>([
    { id: uid(), name: "Design Club", day: 2, start: 16, duration: 1.5 },
  ])
  const [error, setError] = useState("")

  const chosen = classes.filter((c) => selected.includes(c.id))
  const blockCount = Math.max(1, Math.round(studyHours / 1.5))

  const toggleClass = (id: string) => {
    setError("")
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }

  const removeClass = (id: string) => {
    setClasses((list) => list.filter((c) => c.id !== id))
    setSelected((list) => list.filter((x) => x !== id))
  }

  const updateActivity = (id: string, patch: Partial<SetupActivity>) =>
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const finish = () => {
    const events = generateSchedule({ classes: chosen, activities, studyHours, pref })
    completeSetup({ events, studyGoal: studyHours, focusPref: pref })
    const focusBlocks = events.filter((e) => e.type === "study").length
    toast(
      `Your week is ready — ${chosen.length} ${chosen.length === 1 ? "class" : "classes"} and ${focusBlocks} focus blocks planned`,
    )
    navigate("planner")
  }

  const next = () => {
    if (step === 1 && chosen.length === 0) {
      setError("Pick at least one class to continue.")
      return
    }
    if (step === 1 && addingClass) {
      setError("Finish adding your class first, or cancel it.")
      return
    }
    setError("")
    if (step < 3) setStep(step + 1)
    else finish()
  }

  const back = () => {
    setError("")
    if (step === 1) navigate("auth")
    else setStep(step - 1)
  }

  return (
    <main className="setup-page">
      <header className="setup-header">
        <Logo />
        <span className="setup-step">Step {step} of 3</span>
        <button className="icon-button" onClick={() => navigate("auth")} aria-label="Exit setup">
          <X size={19} />
        </button>
      </header>
      <div className="setup-progress">
        <span style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <section className="setup-content">
        {step === 1 && (
          <>
            <div className="setup-heading">
              <span className="question-number">01</span>
              <div>
                <h1>What are you taking?</h1>
                <p>Select your classes, or add your own.</p>
              </div>
            </div>
            <div className="choice-list">
              {classes.map((item, index) => {
                const isSelected = selected.includes(item.id)
                const custom = !CLASS_PRESETS.some((p) => p.id === item.id)
                return (
                  <div className={`choice-row ${custom ? "has-remove" : ""}`} key={item.id}>
                    <button
                      className={`choice-card ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleClass(item.id)}
                      aria-pressed={isSelected}
                    >
                      <span className={`subject-icon subject-${(index % 3) + 1}`}>
                        <BookOpen size={19} />
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{describeClass(item)}</small>
                      </span>
                      <i>{isSelected && <Check size={15} />}</i>
                    </button>
                    {custom && (
                      <button
                        className="row-delete"
                        onClick={() => removeClass(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )
              })}
              {addingClass ? (
                <AddClassForm
                  onCancel={() => {
                    setAddingClass(false)
                    setError("")
                  }}
                  onAdd={(c) => {
                    setClasses((list) => [...list, c])
                    setSelected((list) => [...list, c.id])
                    setAddingClass(false)
                    setError("")
                  }}
                />
              ) : (
                <button className="add-class" onClick={() => setAddingClass(true)}>
                  <Plus size={17} /> Add another class
                </button>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="setup-heading">
              <span className="question-number">02</span>
              <div>
                <h1>How do you want to study?</h1>
                <p>We’ll protect these hours around your classes.</p>
              </div>
            </div>
            <div className="study-panel">
              <div className="study-number">
                <strong>{studyHours}</strong>
                <span>hours / week</span>
              </div>
              <p className="study-hint">
                About {blockCount} focus {blockCount === 1 ? "block" : "blocks"} spread across your week
              </p>
              <input
                aria-label="Study hours per week"
                type="range"
                min="3"
                max="18"
                value={studyHours}
                onChange={(e) => setStudyHours(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>Light</span>
                <span>Focused</span>
                <span>Intensive</span>
              </div>
              <div className="preference-grid" role="radiogroup" aria-label="Focus time">
                <button
                  role="radio"
                  aria-checked={pref === "morning"}
                  className={`preference ${pref === "morning" ? "active" : ""}`}
                  onClick={() => setPref("morning")}
                >
                  <span className="sun-icon">
                    <Sun size={17} />
                  </span>
                  <strong>Morning focus</strong>
                  <small>Before noon</small>
                </button>
                <button
                  role="radio"
                  aria-checked={pref === "evening"}
                  className={`preference ${pref === "evening" ? "active" : ""}`}
                  onClick={() => setPref("evening")}
                >
                  <span className="moon-icon">
                    <Moon size={17} />
                  </span>
                  <strong>Evening focus</strong>
                  <small>After classes</small>
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="setup-heading">
              <span className="question-number">03</span>
              <div>
                <h1>What else is in your week?</h1>
                <p>Make room for clubs, work, exercise, and life.</p>
              </div>
            </div>
            <div className="activity-list">
              {activities.length === 0 && (
                <p className="activity-empty">
                  Nothing else on the calendar? That’s fine — you can always add activities later.
                </p>
              )}
              {activities.map((a, index) => (
                <div className="activity-item" key={a.id}>
                  <label>
                    Activity name
                    <input
                      autoFocus={index === activities.length - 1 && !a.name}
                      value={a.name}
                      placeholder="e.g. Part-time job, gym, soccer practice"
                      onChange={(e) => updateActivity(a.id, { name: e.target.value })}
                    />
                  </label>
                  <div className="activity-row">
                    <label>
                      Day
                      <select
                        value={a.day}
                        onChange={(e) => updateActivity(a.id, { day: Number(e.target.value) })}
                      >
                        {WEEKDAYS.map((d, i) => (
                          <option value={i} key={d.short}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Time
                      <select
                        value={a.start}
                        onChange={(e) => {
                          const start = Number(e.target.value)
                          updateActivity(a.id, { start, duration: Math.min(a.duration, DAY_END - start) })
                        }}
                      >
                        {TIME_OPTIONS.map((h) => (
                          <option value={h} key={h}>
                            {formatTime(h)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Length
                      <select
                        value={a.duration}
                        onChange={(e) => updateActivity(a.id, { duration: Number(e.target.value) })}
                      >
                        {DURATION_OPTIONS.filter((d) => a.start + d <= DAY_END).map((d) => (
                          <option value={d} key={d}>
                            {formatDuration(d)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="row-delete"
                    onClick={() => setActivities((list) => list.filter((x) => x.id !== a.id))}
                    aria-label={`Remove ${a.name || "activity"}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                className="add-class"
                onClick={() =>
                  setActivities((list) => [
                    ...list,
                    { id: uid(), name: "", day: 4, start: 17, duration: 1 },
                  ])
                }
              >
                <Plus size={17} /> Add {activities.length ? "another" : "an"} activity
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="setup-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <footer className="setup-footer">
        <button className="button button-ghost" onClick={back}>
          <ChevronLeft size={17} /> Back
        </button>
        <div className="step-dots">
          {[1, 2, 3].map((item) => (
            <span className={item === step ? "active" : item < step ? "done" : ""} key={item} />
          ))}
        </div>
        <button className="button button-primary" onClick={next}>
          {step === 3 ? "Build my week" : "Continue"}{" "}
          {step === 3 ? <Sparkles size={16} /> : <ChevronRight size={17} />}
        </button>
      </footer>
    </main>
  )
}

function AddClassForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void
  onAdd: (c: SetupClass) => void
}) {
  const [name, setName] = useState("")
  const [days, setDays] = useState<number[]>([0, 2])
  const [start, setStart] = useState(11)
  const [duration, setDuration] = useState(1.5)
  const [location, setLocation] = useState("")
  const canAdd = name.trim().length > 0 && days.length > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canAdd) return
    onAdd({ id: uid(), name: name.trim(), days: [...days].sort(), start, duration, location: location.trim() })
  }

  return (
    <form className="add-class-form" onSubmit={submit}>
      <label>
        Class name
        <input
          autoFocus
          value={name}
          placeholder="e.g. Organic Chemistry"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="field-group">
        Meets on
        <div className="day-chips">
          {WEEKDAYS.map((d, i) => (
            <button
              type="button"
              key={d.short}
              aria-pressed={days.includes(i)}
              aria-label={d.label}
              className={days.includes(i) ? "active" : ""}
              onClick={() =>
                setDays((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))
              }
            >
              {d.label.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>
      <div className="three-col">
        <label>
          Starts
          <select
            value={start}
            onChange={(e) => {
              const s = Number(e.target.value)
              setStart(s)
              setDuration((d) => Math.min(d, DAY_END - s))
            }}
          >
            {TIME_OPTIONS.map((h) => (
              <option value={h} key={h}>
                {formatTime(h)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Length
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATION_OPTIONS.filter((d) => start + d <= DAY_END).map((d) => (
              <option value={d} key={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Room
          <input value={location} placeholder="Optional" onChange={(e) => setLocation(e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-dark" disabled={!canAdd}>
          <Plus size={15} /> Add class
        </button>
      </div>
    </form>
  )
}
