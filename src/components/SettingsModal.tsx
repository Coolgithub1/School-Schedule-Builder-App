import { useState } from "react"
import { LogOut, RotateCcw } from "lucide-react"
import { t } from "../lib/i18n"
import { useStore } from "../lib/store"
import type { FocusPref } from "../lib/types"
import { LanguageSwitch } from "./Language"
import { Modal, Switch } from "./ui"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SettingsModal() {
  const { profile, updateProfile, setSettingsOpen, signOut, resetDemo, toast } = useStore()
  const [form, setForm] = useState(profile)
  const [error, setError] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const close = () => setSettingsOpen(false)

  const save = () => {
    if (!form.name.trim()) return setError(t("Your name can’t be empty."))
    if (!EMAIL_RE.test(form.email.trim())) return setError(t("Enter a valid email address."))
    updateProfile({ ...form, name: form.name.trim(), email: form.email.trim() })
    toast(t("Settings saved"))
    close()
  }

  return (
    <Modal
      kicker={t("SETTINGS")}
      title={t("Your profile")}
      onClose={close}
      footer={
        <>
          <button className="button button-ghost" onClick={signOut}>
            <LogOut size={15} /> {t("Log out")}
          </button>
          <span className="footer-spacer" />
          <button className="button button-ghost" onClick={close}>
            {t("Cancel")}
          </button>
          <button className="button button-primary" onClick={save}>
            {t("Save")}
          </button>
        </>
      }
    >
      <div className="field">
        {t("App language")}
        <LanguageSwitch />
      </div>

      <div className="form-row">
        <label className="field">
          {t("Full name")}
          <input
            className="text-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          {t("Email")}
          <input
            className="text-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-split">
          {t("Weekly study goal")} <b>{t("{n} hours", { n: form.studyGoal })}</b>
        </span>
        <input
          type="range"
          min={1}
          max={30}
          value={form.studyGoal}
          onChange={(e) => setForm({ ...form, studyGoal: Number(e.target.value) })}
        />
      </label>

      <div className="field">
        {t("Best time to focus")}
        <div className="segmented two">
          {(["morning", "evening"] as FocusPref[]).map((pref) => (
            <button
              key={pref}
              type="button"
              className={form.focusPref === pref ? "active" : ""}
              onClick={() => setForm({ ...form, focusPref: pref })}
            >
              {pref === "morning" ? t("Morning · before noon") : t("Evening · after classes")}
            </button>
          ))}
        </div>
      </div>

      <div className="toggle-row">
        <div>
          <strong>{t("Reminders")}</strong>
          <small>{t("Heads-up before classes and upcoming deadlines")}</small>
        </div>
        <Switch
          checked={form.reminders}
          label={t("Reminders")}
          onChange={(reminders) => setForm({ ...form, reminders })}
        />
      </div>
      <div className="toggle-row">
        <div>
          <strong>{t("Weekly email digest")}</strong>
          <small>{t("A Sunday summary of the week ahead")}</small>
        </div>
        <Switch
          checked={form.emailDigest}
          label={t("Weekly email digest")}
          onChange={(emailDigest) => setForm({ ...form, emailDigest })}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="danger-zone">
        <div>
          <strong>{t("Restore sample schedule")}</strong>
          <small>{t("Replaces your classes, study time and deadlines with the demo week.")}</small>
        </div>
        <button
          className="button button-danger"
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true)
            resetDemo()
            close()
          }}
        >
          <RotateCcw size={14} /> {confirmReset ? t("Click to confirm") : t("Restore")}
        </button>
      </div>
    </Modal>
  )
}
