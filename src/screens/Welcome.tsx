import { ArrowRight, Check, Plus, Sparkles, Target } from "lucide-react"
import { todayIndex, weekDates, weekKey, weekRangeLabel, WEEKDAYS } from "../lib/dates"
import { getLang, t } from "../lib/i18n"
import { useStore } from "../lib/store"
import { LanguageSwitch } from "../components/Language"
import { Logo, ProgressRing } from "../components/ui"

export function WelcomeScreen() {
  const { startAuth, data, signIn, navigate } = useStore()
  const wk = weekKey(0)
  const dates = weekDates(wk)
  const today = todayIndex()
  const returning = data.profile && !data.signedIn

  const resume = () => {
    if (!data.profile) return
    const result = signIn("login", { email: data.profile.email })
    if (result.ok) navigate(result.next)
  }

  return (
    <main className="welcome-page">
      <nav className="welcome-nav">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <div className="welcome-nav-actions">
          <LanguageSwitch compact />
          <button className="text-button" onClick={() => startAuth("login")}>
            {t("Log in")}
          </button>
          <button
            className="button button-dark button-small"
            onClick={() => startAuth("register")}
          >
            {t("Get started")}
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={14} /> {t("Your calmer semester starts here")}
          </div>
          <h1>
            {t("Make time for what")} <span>{t("matters.")}</span>
          </h1>
          <p>
            {t("Turn classes, study goals, and campus life into one balanced weekly plan. Less planning. More progress.")}
          </p>
          <div className="hero-actions">
            {returning ? (
              <button className="button button-primary" onClick={resume}>
                {t("Continue as {name}", { name: data.profile!.name.split(" ")[0] })} <ArrowRight size={17} />
              </button>
            ) : (
              <button className="button button-primary" onClick={() => startAuth("register")}>
                {t("Build my schedule")} <ArrowRight size={17} />
              </button>
            )}
            <button
              className="button button-ghost"
              onClick={() => (returning ? startAuth("register") : startAuth("login"))}
            >
              {returning ? t("Start a new schedule") : t("I already have an account")}
            </button>
          </div>
          <div className="social-proof">
            <div className="avatar-stack">
              <span>AM</span>
              <span>JK</span>
              <span>LS</span>
              <span>+2k</span>
            </div>
            <p>{t("Helping students find their flow every week")}</p>
          </div>
        </div>

        <div className="hero-visual" aria-label={t("Weekly schedule preview")}>
          <div className="decorative-orbit orbit-one" />
          <div className="decorative-orbit orbit-two" />
          <div className="floating-note note-one">
            <Check size={15} /> {t("3 study sessions planned")}
          </div>
          <div className="floating-note note-two">
            <Target size={15} /> {t("Balanced week")}
          </div>
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <span className="preview-kicker">{weekRangeLabel(wk, false).toLocaleUpperCase(getLang())}</span>
                <h3>{t("Your week")}</h3>
              </div>
              <button aria-label={t("Start building your week")} onClick={() => startAuth("register")}>
                <Plus size={18} />
              </button>
            </div>
            <div className="mini-week">
              {WEEKDAYS.map((day, index) => (
                <div className="mini-day" key={index}>
                  <span>{day.letter}</span>
                  <strong className={index === Math.min(today, 4) ? "active" : ""}>
                    {dates[index].getDate()}
                  </strong>
                  <i className={`mini-event mini-event-${index + 1}`} />
                  {index !== 4 && (
                    <i className={`mini-event secondary mini-event-b-${index + 1}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="preview-bottom">
              <ProgressRing value={82} />
              <div>
                <strong>{t("Nicely balanced")}</strong>
                <span>{t("12.5 hrs of focus time")}</span>
              </div>
              <Sparkles size={19} />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
