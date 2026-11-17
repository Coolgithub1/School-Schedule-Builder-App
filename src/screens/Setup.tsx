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
import { classPresets } from "../lib/seed"
import { useStore } from "../lib/store"
import type { FocusPref, SetupActivity, SetupClass } from "../lib/types"
import { Logo } from "../components/ui"
import { TypeIcon } from "../components/TypeIcon"
import { getLang, t } from "../lib/i18n"
import { ScreenshotImport } from "../components/ScreenshotImport"
import type { ScheduleImport } from "../lib/scheduleOcr"

const dayName = (d: number) => {
  const s = WEEKDAYS[d].short
  return s[0] + s.slice(1).toLocaleLowerCase(getLang())
}
const describeClass = (c: SetupClass) =>
  `${c.days.map(dayName).join(" · ")}, ${formatTime(c.start)} – ${formatTime(c.start + c.duration)}${c.location ? ` · ${c.location}` : ""}`

export function SetupScreen() {
  const { navigate, completeSetup, profile, toast } = useStore()
  const [step, setStep] = useState(1)
  const [classes, setClasses] = useState<SetupClass[]>(classPresets)
  const [selected, setSelected] = useState<string[]>(() => classPresets().map((c) => c.id))
  const [addingClass, setAddingClass] = useState(false)
  const [studyHours, setStudyHours] = useState(profile.studyGoal || 8)
  const [pref, setPref] = useState<FocusPref>(profile.focusPref)
  const [activities, setActivities] = useState<SetupActivity[]>([
    { id: uid(), name: t("Design Club"), day: 2, start: 16, duration: 1.5 },
  ])
  const [error, setError] = useState("")
  const [imported, setImported] = useState<ScheduleImport | null>(null)

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

  const applyImport = (result: ScheduleImport) => {
    setClasses(result.classes)
    setSelected(result.classes.map((c) => c.id))
    setImported(result)
    setAddingClass(false)
    setError("")
    toast(t("Read {n} classes from your screenshot", { n: result.classes.length }))
  }

  const updateActivity = (id: string, patch: Partial<SetupActivity>) =>
    setActivities((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const finish = () => {
    const events = generateSchedule({ classes: chosen, activities, studyHours, pref })
    completeSetup({ events, studyGoal: studyHours, focusPref: pref })
    const focusBlocks = events.filter((e) => e.type === "study").length
    toast(
      t("Your week is ready — {classes} classes and {blocks} study sessions planned", { classes: chosen.length, blocks: focusBlocks }),
    )
    navigate("planner")
  }

  const next = () => {
    if (step === 1 && chosen.length === 0) {
      setError(t("Pick at least one class to continue."))
      return
    }
    if (step === 1 && addingClass) {
      setError(t("Finish adding your class first, or cancel it."))
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
        <span className="setup-step">{t("Step {n} of 3", { n: step })}</span>
        <button className="icon-button" onClick={() => navigate("auth")} aria-label={t("Exit setup")}>
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
                <h1>{t("What are you taking?")}</h1>
                <p>{t("Upload your schedule screenshot, or pick classes yourself.")}</p>
              </div>
            </div>
            <ScreenshotImport onImported={applyImport} />
            <div className="choice-divider">
              <span>{imported ? t("Your classes from the screenshot") : t("or pick your classes manually")}</span>
            </div>
            <div className="choice-list">
              {classes.map((item, index) => {
                const isSelected = selected.includes(item.id)
                const custom = !["calc", "hist", "phys"].includes(item.id)
                return (
                  <div className={`choice-row ${custom ? "has-remove" : ""}`} key={item.id}>
                    <button
                      className={`choice-card ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleClass(item.id)}
                      aria-pressed={isSelected}
                    >
                      <span className={`subject-icon subject-${(index % 3) + 1}`}>
                        <TypeIcon type="class" size={19} />
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
                        aria-label={t("Remove {name}", { name: item.name })}
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
                <button className="add-class add-type-class" onClick={() => setAddingClass(true)}>
                  <TypeIcon type="class" size={17} /> {t("Add another class")}
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
                <h1>{t("How do you want to study?")}</h1>
                <p>{t("We’ll protect these hours around your classes.")}</p>
              </div>
            </div>
            <div className="study-panel">
              <div className="study-number">
                <TypeIcon type="study" size={26} />
                <strong>{studyHours}</strong>
                <span>{t("study hours / week")}</span>
              </div>
              <p className="study-hint">
                {t("About {n} study sessions spread across your week", { n: blockCount })}
              </p>
              <input
                aria-label={t("Study hours per week")}
                type="range"
                min="3"
                max="18"
                value={studyHours}
                onChange={(e) => setStudyHours(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>{t("Light")}</span>
                <span>{t("Focused")}</span>
                <span>{t("Intensive")}</span>
              </div>
              <div className="preference-grid" role="radiogroup" aria-label={t("Focus time")}>
                <button
                  role="radio"
                  aria-checked={pref === "morning"}
                  className={`preference ${pref === "morning" ? "active" : ""}`}
                  onClick={() => setPref("morning")}
                >
                  <span className="sun-icon">
                    <Sun size={17} />
                  </span>
                  <strong>{t("Morning focus")}</strong>
                  <small>{t("Before noon")}</small>
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
                  <strong>{t("Evening focus")}</strong>
                  <small>{t("After classes")}</small>
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
                <h1>{t("What else is in your week?")}</h1>
                <p>{t("Make room for clubs, work, exercise, and life.")}</p>
              </div>
            </div>
            <div className="activity-list">
              {activities.length === 0 && (
                <p className="activity-empty">
                  {t("Nothing else on the calendar? That’s fine — you can always add activities later.")}
                </p>
              )}
              {activities.map((a, index) => (
                <div className="activity-item" key={a.id}>
                  <label>
                    {t("Activity name")}
                    <input
                      autoFocus={index === activities.length - 1 && !a.name}
                      value={a.name}
                      placeholder={t("e.g. Part-time job, gym, soccer practice")}
                      onChange={(e) => updateActivity(a.id, { name: e.target.value })}
                    />
                  </label>
                  <div className="activity-row">
                    <label>
                      {t("Day")}
                      <select
                        value={a.day}
                        onChange={(e) => updateActivity(a.id, { day: Number(e.target.value) })}
                      >
                        {WEEKDAYS.map((d, i) => (
                          <option value={i} key={i}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("Time")}
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
                      {t("Length")}
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
                    aria-label={t("Remove {name}", { name: a.name || t("activity") })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                className="add-class add-type-activity"
                onClick={() =>
                  setActivities((list) => [
                    ...list,
                    { id: uid(), name: "", day: 4, start: 17, duration: 1 },
                  ])
                }
              >
                <TypeIcon type="activity" size={17} /> {activities.length ? t("Add another activity") : t("Add an activity")}
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
          <ChevronLeft size={17} /> {t("Back")}
        </button>
        <div className="step-dots">
          {[1, 2, 3].map((item) => (
            <span className={item === step ? "active" : item < step ? "done" : ""} key={item} />
          ))}
        </div>
        <button className="button button-primary" onClick={next}>
          {step === 3 ? t("Build my week") : t("Continue")}{" "}
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
        {t("Class name")}
        <input
          autoFocus
          value={name}
          placeholder={t("e.g. VCD 421")}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="field-group">
        {t("Meets on")}
        <div className="day-chips">
          {WEEKDAYS.map((d, i) => (
            <button
              type="button"
              key={i}
              aria-pressed={days.includes(i)}
              aria-label={d.label}
              className={days.includes(i) ? "active" : ""}
              onClick={() =>
                setDays((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))
              }
            >
              {dayName(i)}
            </button>
          ))}
        </div>
      </div>
      <div className="three-col">
        <label>
          {t("Starts")}
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
          {t("Length")}
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATION_OPTIONS.filter((d) => start + d <= DAY_END).map((d) => (
              <option value={d} key={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Room")}
          <input value={location} placeholder={t("Optional")} onChange={(e) => setLocation(e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>
          {t("Cancel")}
        </button>
        <button type="submit" className="button button-dark" disabled={!canAdd}>
          <TypeIcon type="class" size={15} /> {t("Add class")}
        </button>
      </div>
    </form>
  )
}
