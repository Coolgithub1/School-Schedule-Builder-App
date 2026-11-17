// Tiny i18n: English text is the key; Turkish translations live in ./tr.ts.
// The store sets the active language before rendering, and every screen re-renders
// on change, so plain t() calls are enough — no hooks needed.
import { TR } from "./tr"

export type Lang = "en" | "tr"

let current: Lang = "en"

export function setLang(lang: Lang) {
  current = lang
  if (typeof document !== "undefined") document.documentElement.lang = lang
}

export const getLang = () => current
export const isTr = () => current === "tr"

/** Translate an English UI string; `{name}` placeholders are filled from vars. */
export function t(key: string, vars?: Record<string, string | number>) {
  let text = current === "tr" ? (TR[key] ?? key) : key
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v))
  return text
}

/** Browser preference, used to pre-highlight a choice on the language picker. */
export function guessLang(): Lang {
  if (typeof navigator === "undefined") return "tr"
  return (navigator.languages ?? [navigator.language]).some((l) => l?.toLowerCase().startsWith("tr")) ? "tr" : "en"
}
