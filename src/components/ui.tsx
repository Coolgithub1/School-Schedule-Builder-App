import type { ReactNode } from "react"
import { Check, X } from "lucide-react"
import { useStore } from "../lib/store"

export function Logo({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>studyflow</span>
    </>
  )
  return onClick ? (
    <button className="brand" type="button" onClick={onClick} aria-label="Studyflow home">
      {inner}
    </button>
  ) : (
    <span className="brand">{inner}</span>
  )
}

export function ProgressRing({
  value,
  large = false,
}: {
  value: number
  large?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const color = large ? "#a6c75f" : "var(--lime-dark)"
  return (
    <div
      className={`progress-ring ${large ? "large" : ""}`}
      style={{
        background: `radial-gradient(closest-side, var(--white) 72%, transparent 73%), conic-gradient(${color} 0 ${pct}%, #edece6 ${pct}% 100%)`,
        boxShadow: "none",
      }}
      role="img"
      aria-label={`${pct}% complete`}
    >
      <b>
        {pct}
        <span>%</span>
      </b>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

export function Modal({
  title,
  kicker,
  onClose,
  children,
  footer,
}: {
  title: string
  kicker?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            {kicker && <span>{kicker}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <Check size={15} />
          <span>{t.message}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.()
                dismissToast(t.id)
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button
            className="toast-close"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
