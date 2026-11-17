import { BookOpen, GraduationCap, Users, type LucideIcon } from "lucide-react"
import { t } from "../lib/i18n"
import type { EventType } from "../lib/types"

/** One icon + colour per block type, used everywhere a type appears so it reads at a glance. */
export const TYPE_META: Record<EventType, { icon: LucideIcon; label: string; add: string; title: string }> = {
  class: { icon: GraduationCap, label: "Class", add: "Add class", title: "New class" },
  study: { icon: BookOpen, label: "Study", add: "Add study time", title: "New study session" },
  activity: { icon: Users, label: "Activity", add: "Add activity", title: "New activity" },
}

export const typeLabel = (type: EventType) => t(TYPE_META[type].label)

export function TypeIcon({ type, size = 16 }: { type: EventType; size?: number }) {
  const Icon = TYPE_META[type].icon
  return <Icon className={`type-icon type-${type}`} size={size} aria-hidden="true" />
}
