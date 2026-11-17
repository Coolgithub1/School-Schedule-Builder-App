import { useState, type FormEvent } from "react"
import { AlertTriangle, Check, Trash2, X } from "lucide-react"
import {
  DAY_END,
  DURATION_OPTIONS,
  formatDuration,
  formatTime,
  TIME_OPTIONS,
  WEEKDAYS,
  weekRangeLabel,
} from "../lib/dates"
import { t } from "../lib/i18n"
import { findConflicts, isDone, uid } from "../lib/schedule"
import { useStore, type DrawerState } from "../lib/store"
import type { EventType, ScheduleEvent } from "../lib/types"
import { TypeIcon, TYPE_META, typeLabel } from "./TypeIcon"
import { Switch } from "./ui"

export function EventDrawer() {
  const { drawer } = useStore()
  if (!drawer) return null
  return <EventDrawerForm key={drawer.eventId ?? JSON.stringify(drawer)} drawer={drawer} />
}

function EventDrawerForm({ drawer }: { drawer: DrawerState }) {
  const { data, closeDrawer, saveEvent, deleteEvent, toggleDone, toast } = useStore()
  const existing = drawer.eventId
    ? data.events.find((e) => e.id === drawer.eventId)
    : undefined

  const defaults: Omit<ScheduleEvent, "id" | "completedWeeks" | "weekStart"> = {
    title: "",
    detail: "",
    notes: "",
    day: 0,
    start: 14,
    duration: 1.5,
    type: "study",
    recurring: false,
    ...drawer.prefill,
  }
  const source = existing ?? defaults

  const [form, setForm] = useState({
    title: source.title,
    detail: source.detail,
    notes: source.notes,
    day: source.day,
    start: source.start,
    duration: source.duration,
    type: source.type,
    recurring: source.recurring,
  })
  const [recurringTouched, setRecurringTouched] = useState(
    Boolean(existing) || drawer.prefill.recurring !== undefined,
  )
  const [error, setError] = useState("")

  if (drawer.eventId && !existing) return null

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const conflicts = findConflicts(
    data.events,
    drawer.weekStart,
    form.day,
    form.start,
    form.duration,
    existing?.id,
  )
  const durationChoices = DURATION_OPTIONS.filter((d) => form.start + d <= DAY_END)
  const done = existing ? isDone(existing, drawer.weekStart) : false

  const changeStart = (start: number) =>
    setForm((f) => ({
      ...f,
      start,
      duration: Math.min(f.duration, DAY_END - start),
    }))

  const changeType = (type: EventType) =>
    setForm((f) => ({
      ...f,
      type,
      recurring: recurringTouched ? f.recurring : type !== "study",
    }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError(t("Give it a name, like “Calculus review”."))
      return
    }
    saveEvent({
      id: existing?.id ?? uid(),
      completedWeeks: existing?.completedWeeks ?? [],
      ...form,
      title,
      detail: form.detail.trim(),
      weekStart: form.recurring ? undefined : existing?.weekStart ?? drawer.weekStart,
    })
    toast(
      existing
        ? t("Saved changes to “{title}”", { title })
        : t("Added “{title}” on {day} at {time}", {
            title,
            day: WEEKDAYS[form.day].label,
            time: formatTime(form.start),
          }),
    )
    closeDrawer()
  }

  return (
    <div className="drawer-backdrop" onMouseDown={closeDrawer}>
      <aside
        className={`event-drawer drawer-${form.type}`}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? t("Edit") : t(TYPE_META[form.type].title)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className={`drawer-kicker type-${form.type}`}>
              <TypeIcon type={form.type} size={13} /> {existing ? t("Edit") : t("Add to your week")}
            </span>
            <h2>{existing ? existing.title : t(TYPE_META[form.type].title)}</h2>
          </div>
          <button className="icon-button" onClick={closeDrawer} aria-label={t("Close")}>
            <X size={19} />
          </button>
        </header>

        <form className="drawer-shell" onSubmit={submit} noValidate>
          <div className="drawer-form">
            <div className="field-group">
              {t("What is it?")}
              <div className="segmented type-segmented" role="radiogroup" aria-label={t("Type")}>
                {(["class", "study", "activity"] as EventType[]).map((item) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.type === item}
                    className={`type-${item} ${form.type === item ? "active" : ""}`}
                    onClick={() => changeType(item)}
                    key={item}
                  >
                    <TypeIcon type={item} size={16} /> {typeLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            <label>
              {t("Title")}
              <input
                autoFocus={!existing}
                value={form.title}
                placeholder={form.type === "class" ? t("e.g. VCD 421") : form.type === "study" ? t("e.g. Chemistry review") : t("e.g. Design Club")}
                onChange={(e) => {
                  update("title", e.target.value)
                  if (error) setError("")
                }}
              />
            </label>
            {error && <p className="form-error">{error}</p>}

            <div className="form-row">
              <label>
                {t("Day")}
                <select
                  value={form.day}
                  onChange={(e) => update("day", Number(e.target.value))}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option value={i} key={i}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Start time")}
                <select
                  value={form.start}
                  onChange={(e) => changeStart(Number(e.target.value))}
                >
                  {TIME_OPTIONS.map((h) => (
                    <option value={h} key={h}>
                      {formatTime(h)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                {t("Length")}
                <select
                  value={form.duration}
                  onChange={(e) => update("duration", Number(e.target.value))}
                >
                  {durationChoices.map((d) => (
                    <option value={d} key={d}>
                      {formatDuration(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Location")}
                <input
                  value={form.detail}
                  placeholder={t("Room, library, online…")}
                  onChange={(e) => update("detail", e.target.value)}
                />
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <strong>{t("Repeat every week")}</strong>
                <small>
                  {form.recurring
                    ? t("Shows up on your schedule each week")
                    : t("Only the week of {range}", {
                        range: weekRangeLabel(existing?.weekStart ?? drawer.weekStart, false),
                      })}
                </small>
              </div>
              <Switch
                checked={form.recurring}
                label={t("Repeat every week")}
                onChange={(next) => {
                  setRecurringTouched(true)
                  update("recurring", next)
                }}
              />
            </div>

            <label>
              {t("Notes")}
              <textarea
                value={form.notes}
                placeholder={t("Chapters to cover, materials to bring…")}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>

            {conflicts.length > 0 && (
              <p className="conflict-note">
                <AlertTriangle size={16} />
                <span>
                  {t("Overlaps with")} <strong>{conflicts.map((c) => c.title).join(", ")}</strong>.{" "}
                  {t("You can still save it, or pick another time.")}
                </span>
              </p>
            )}

            {existing && existing.type === "study" && (
              <button
                type="button"
                className={`done-toggle ${done ? "is-done" : ""}`}
                onClick={() => toggleDone(existing.id, drawer.weekStart)}
              >
                <Check size={16} />
                {done ? t("Completed this week — tap to undo") : t("Mark this study session done")}
              </button>
            )}
          </div>

          <footer>
            {existing && (
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  deleteEvent(existing.id)
                  closeDrawer()
                }}
              >
                <Trash2 size={15} /> {t("Delete")}
              </button>
            )}
            <span className="footer-spacer" />
            <button type="button" className="button button-ghost" onClick={closeDrawer}>
              {t("Cancel")}
            </button>
            <button type="submit" className={`button button-primary submit-${form.type}`}>
              {existing ? (
                t("Save changes")
              ) : (
                <>
                  <TypeIcon type={form.type} size={16} /> {t(TYPE_META[form.type].add)}
                </>
              )}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
