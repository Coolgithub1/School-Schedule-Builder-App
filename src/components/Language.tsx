import { useId, useState } from "react"
import { Check, Languages } from "lucide-react"
import { guessLang, t, type Lang } from "../lib/i18n"
import { initialScreen, useStore } from "../lib/store"
import { Logo } from "./ui"

/** Inline SVG flags — emoji flags don't render on Windows. */
export function Flag({ lang, size = 28 }: { lang: Lang; size?: number }) {
  const id = useId().replace(/:/g, "")
  const h = Math.round((size * 2) / 3)
  if (lang === "tr") {
    // Turkish flag: crescent and a star pointing toward the hoist
    const cx = 16.4
    const star = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 === 0 ? 2.5 : 0.98
      const a = Math.PI + (i * Math.PI) / 5
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(10 + r * Math.sin(a)).toFixed(2)}`
    }).join(" ")
    return (
      <svg className="flag" width={size} height={h} viewBox="0 0 30 20" aria-hidden="true">
        <rect width="30" height="20" fill="#E30A17" />
        <circle cx="10.5" cy="10" r="5" fill="#fff" />
        <circle cx="11.75" cy="10" r="4" fill="#E30A17" />
        <polygon points={star} fill="#fff" />
      </svg>
    )
  }
  return (
    <svg className="flag" width={size} height={h} viewBox="0 0 60 40" aria-hidden="true">
      <clipPath id={`${id}t`}>
        <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
      </clipPath>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="5" />
      <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="12" />
      <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  )
}

const OPTIONS: { lang: Lang; name: string; other: string }[] = [
  { lang: "tr", name: "Türkçe", other: "Turkish" },
  { lang: "en", name: "English", other: "İngilizce" },
]

/** First-launch screen: pick the app language (shown in both languages). */
export function LanguageScreen() {
  const { data, setLanguage, navigate } = useStore()
  const [suggested] = useState(guessLang)

  const choose = (lang: Lang) => {
    setLanguage(lang)
    navigate(initialScreen({ ...data, language: lang }))
  }

  return (
    <main className="language-page">
      <div className="language-brand">
        <Logo />
      </div>
      <section className="language-card">
        <div className="language-icon">
          <Languages size={26} />
        </div>
        <h1>Uygulamayı hangi dilde kullanmak istersiniz?</h1>
        <p className="language-sub">Which language would you like to use the app in?</p>
        <div className="language-options">
          {OPTIONS.map((o) => (
            <button
              key={o.lang}
              className={`language-option ${suggested === o.lang ? "suggested" : ""}`}
              onClick={() => choose(o.lang)}
            >
              <Flag lang={o.lang} size={44} />
              <span>
                <strong>{o.name}</strong>
                <small>{o.other}</small>
              </span>
              <i>{suggested === o.lang && <Check size={15} />}</i>
            </button>
          ))}
        </div>
        <p className="language-note">
          Bunu istediğin zaman Ayarlar’dan değiştirebilirsin.
          <br />
          You can change this anytime in Settings.
        </p>
      </section>
    </main>
  )
}

/** Compact flag switch for Settings and the welcome screen. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useStore()
  return (
    <div className={`language-switch ${compact ? "compact" : ""}`} role="radiogroup" aria-label={t("Language")}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          role="radio"
          aria-checked={language === o.lang}
          className={language === o.lang ? "active" : ""}
          onClick={() => setLanguage(o.lang)}
          title={o.name}
        >
          <Flag lang={o.lang} size={compact ? 20 : 24} />
          {compact ? o.lang.toUpperCase() : o.name}
        </button>
      ))}
    </div>
  )
}
