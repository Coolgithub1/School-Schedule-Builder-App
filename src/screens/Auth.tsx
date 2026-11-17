import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, GraduationCap, Mail, UserRound } from "lucide-react"
import { t } from "../lib/i18n"
import { DEMO_USER } from "../lib/seed"
import { useStore } from "../lib/store"
import { Logo } from "../components/ui"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthScreen() {
  const { authMode: mode, setAuthMode, navigate, signIn, data } = useStore()
  const [name, setName] = useState("")
  const [email, setEmail] = useState(data.profile?.email ?? "")
  const [error, setError] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (mode === "register" && !name.trim())
      return setError(t("Tell us your name so we can personalize your plan."))
    if (!EMAIL_RE.test(email.trim()))
      return setError(t("Enter a valid email address, like you@university.edu."))
    const result = signIn(mode, { name, email })
    if (!result.ok) return setError(result.error)
    navigate(result.next)
  }

  const continueWithGoogle = () => {
    const result = signIn(mode, { ...DEMO_USER, google: true })
    if (result.ok) navigate(result.next)
  }

  const switchMode = () => {
    setError("")
    setAuthMode(mode === "login" ? "register" : "login")
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Logo onClick={() => navigate("welcome")} />
      </div>
      <button className="back-link" onClick={() => navigate("welcome")}>
        <ArrowLeft size={17} /> {t("Back")}
      </button>
      <section className="auth-card">
        <div className="auth-icon">
          <GraduationCap size={26} />
        </div>
        <span className="auth-step">{mode === "login" ? t("WELCOME BACK") : t("START YOUR FLOW")}</span>
        <h1>{mode === "login" ? t("Welcome back") : t("Let’s plan your best week")}</h1>
        <p>
          {mode === "login"
            ? t("Your schedule is ready when you are.")
            : t("Create your free account in a few seconds.")}
        </p>
        <button className="google-button" type="button" onClick={continueWithGoogle}>
          <span className="google-g">G</span>
          {t("Continue with Google")}
        </button>
        <div className="divider">
          <span>{t("or continue with email")}</span>
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === "register" && (
            <label className="field-label">
              {t("Your name")}
              <span className="input-wrap">
                <UserRound size={17} />
                <input
                  autoFocus
                  value={name}
                  autoComplete="name"
                  onChange={(e) => {
                    setName(e.target.value)
                    setError("")
                  }}
                  placeholder={t("Maya Singh")}
                />
              </span>
            </label>
          )}
          <label className="field-label">
            {t("Email address")}
            <span className={`input-wrap ${error ? "has-error" : ""}`}>
              <Mail size={17} />
              <input
                autoFocus={mode === "login"}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                placeholder="you@university.edu"
              />
            </span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-dark button-full" type="submit">
            {mode === "login" ? t("Continue") : t("Create account")} <ArrowRight size={17} />
          </button>
        </form>
        {mode === "login" && !data.profile && (
          <p className="auth-hint">{t("Prototype tip: any email signs you in with a sample week.")}</p>
        )}
        <p className="auth-switch">
          {mode === "login" ? t("New to studyflow?") : t("Already have an account?")}{" "}
          <button type="button" onClick={switchMode}>
            {mode === "login" ? t("Create an account") : t("Log in")}
          </button>
        </p>
        <p className="terms">{t("By continuing, you agree to our Terms and Privacy Policy.")}</p>
      </section>
      <p className="auth-quote">{t("“A good plan today makes space for a better tomorrow.”")}</p>
    </main>
  )
}
