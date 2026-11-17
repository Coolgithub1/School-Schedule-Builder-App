import { useEffect, useRef, useState, type DragEvent } from "react"
import { AlertTriangle, CheckCircle2, ImageUp, RotateCcw, ShieldCheck, Sparkles } from "lucide-react"
import { readSchedule, ScheduleReadError, type ScheduleImport } from "../lib/scheduleOcr"

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; stage: "loading" | "reading"; percent: number; preview: string }
  | { kind: "done"; result: ScheduleImport; preview: string }
  | { kind: "error"; message: string; preview?: string }

/** Upload a Yeditepe schedule screenshot; OCR runs on the device and fills in the classes. */
export function ScreenshotImport({ onImported }: { onImported: (result: ScheduleImport) => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const busy = phase.kind === "reading"

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const read = async (file: File) => {
    if (busy) return
    if (!file.type.startsWith("image/")) {
      setPhase({ kind: "error", message: "That file isn’t an image. Upload a screenshot (PNG or JPG) of your schedule." })
      return
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const preview = URL.createObjectURL(file)
    previewRef.current = preview
    setPhase({ kind: "reading", stage: "loading", percent: 4, preview })
    let ocr: { terminate: () => Promise<unknown> } | undefined
    try {
      const { createDeviceOcr } = await import("../lib/ocrEngine")
      const device = await createDeviceOcr(({ stage, progress }) =>
        setPhase((p) => {
          if (p.kind !== "reading") return p
          const target = stage === "loading" ? 4 + progress * 26 : 30 + progress * 65
          return { ...p, stage, percent: Math.max(p.percent, Math.round(target)) }
        }),
      )
      ocr = device
      const result = await readSchedule(device.engine, file)
      setPhase({ kind: "done", result, preview })
      onImported(result)
    } catch (error) {
      setPhase({
        kind: "error",
        preview,
        message:
          error instanceof ScheduleReadError
            ? error.message
            : "Something went wrong while reading the screenshot. Try again, or add your classes manually below.",
      })
    } finally {
      await ocr?.terminate()
    }
  }

  // Desktop conveniences: paste a screenshot straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"))
      if (file) read(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  })

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) read(file)
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) read(file)
        e.target.value = ""
      }}
    />
  )

  return (
    <section
      className={`import-card ${dragging ? "is-dragging" : ""} is-${phase.kind}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      aria-live="polite"
    >
      {picker}
      {phase.kind === "idle" && (
        <>
          <div className="import-art" aria-hidden="true">
            <span className="import-art-head" />
            {Array.from({ length: 20 }, (_, i) => (
              <i key={i} className={[1, 2, 6, 8, 11, 13, 17].includes(i) ? "on" : ""} />
            ))}
          </div>
          <div className="import-copy">
            <span className="import-kicker">
              <Sparkles size={13} /> Fastest way
            </span>
            <strong>Upload your schedule screenshot</strong>
            <p>
              Hey! Can you take a screenshot of your schedule in the Yeditepe app (the <b>Program</b> tab) and upload
              it? We’ll build your week from it.
            </p>
            <button className="button button-primary import-button" onClick={() => inputRef.current?.click()}>
              <ImageUp size={17} /> Upload screenshot
            </button>
            <small>
              <ShieldCheck size={13} /> Read on your device — the image never leaves your phone.
            </small>
          </div>
        </>
      )}

      {phase.kind === "reading" && (
        <div className="import-status">
          <img src={phase.preview} alt="Your schedule screenshot" />
          <div>
            <strong>{phase.stage === "loading" ? "Getting the reader ready…" : "Reading your timetable…"}</strong>
            <div className="import-bar" role="progressbar" aria-valuenow={phase.percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${phase.percent}%` }} />
            </div>
            <small>
              {phase.stage === "loading"
                ? "First time only: downloading the on-device reader (~7 MB)."
                : "Finding days, hours and course codes — all on your device."}
            </small>
          </div>
        </div>
      )}

      {phase.kind === "done" && (
        <div className="import-status">
          <img src={phase.preview} alt="Your schedule screenshot" />
          <div>
            <strong className="import-ok">
              <CheckCircle2 size={17} /> Found {phase.result.classes.length}{" "}
              {phase.result.classes.length === 1 ? "class" : "classes"} · {phase.result.hoursPerWeek} hrs a week
            </strong>
            <small>Check them below — tap any we misread to deselect it, or add a missing one.</small>
            {phase.result.warnings.map((w) => (
              <small className="import-warning" key={w}>
                <AlertTriangle size={13} /> {w}
              </small>
            ))}
            <button className="text-button import-again" onClick={() => inputRef.current?.click()}>
              <RotateCcw size={14} /> Use another screenshot
            </button>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="import-status">
          {phase.preview && <img src={phase.preview} alt="Your schedule screenshot" />}
          <div>
            <strong className="import-error">
              <AlertTriangle size={17} /> We couldn’t read that one
            </strong>
            <small>{phase.message}</small>
            <button className="button button-ghost import-again" onClick={() => inputRef.current?.click()}>
              <ImageUp size={15} /> Try another screenshot
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
