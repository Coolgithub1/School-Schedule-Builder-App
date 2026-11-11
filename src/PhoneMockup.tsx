import { useEffect, useLayoutEffect, useState } from "react"

// iPhone 15/16 Pro proportions
const SCREEN_W = 393
const SCREEN_H = 852
const BEZEL = 14
const FRAME_W = SCREEN_W + BEZEL * 2
const FRAME_H = SCREEN_H + BEZEL * 2
const CAPTION_SPACE = 72

function useFitScale() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      const byHeight = (window.innerHeight - 48 - CAPTION_SPACE) / FRAME_H
      const byWidth = (window.innerWidth - 48) / FRAME_W
      setScale(Math.max(0.45, Math.min(1, byHeight, byWidth)))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])
  return scale
}

function useClock() {
  const format = () =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/, "")
  const [time, setTime] = useState(format)
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

function StatusIcons() {
  return (
    <span className="mockup-status-icons" aria-hidden="true">
      <svg width="18" height="12" viewBox="0 0 18 12">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12">
        <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A8.8 8.8 0 0 1 8 2.2Z" />
        <path d="M8 5.6c1.5 0 2.9.6 4 1.6l1.2-1.3A7.4 7.4 0 0 0 8 3.8c-1.9 0-3.8.7-5.2 2.1L4 7.2a5.6 5.6 0 0 1 4-1.6Z" />
        <path d="M8 9c.6 0 1.1.2 1.6.6L8 11.4 6.4 9.6C6.9 9.2 7.4 9 8 9Z" />
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity="0.4" />
        <rect x="2" y="2" width="20" height="9" rx="2.5" />
        <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity="0.45" />
      </svg>
    </span>
  )
}

export function PhoneMockup() {
  const scale = useFitScale()
  const time = useClock()
  const appUrl = `${import.meta.env.BASE_URL}?embed=1`

  return (
    <div className="mockup-page">
      <div className="mockup-stage" style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
        <div
          className="mockup-phone"
          style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
        >
          <span className="mockup-button mockup-action" />
          <span className="mockup-button mockup-volume-up" />
          <span className="mockup-button mockup-volume-down" />
          <span className="mockup-button mockup-power" />
          <div className="mockup-screen" style={{ width: SCREEN_W, height: SCREEN_H }}>
            <div className="mockup-status">
              <span className="mockup-time">{time}</span>
              <span className="mockup-island" />
              <StatusIcons />
            </div>
            <iframe className="mockup-app" src={appUrl} title="studyflow app preview" />
            <div className="mockup-home">
              <span />
            </div>
          </div>
        </div>
      </div>
      <p className="mockup-caption">
        <strong>studyflow</strong> · interactive preview — tap around, it’s the real app.
      </p>
    </div>
  )
}
