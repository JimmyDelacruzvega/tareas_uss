import type { Priority, TaskStatus, TaskType } from '../types.ts'

export const DAY_OPTIONS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const TYPE_OPTIONS: { id: TaskType; label: string }[] = [
  { id: 'tarea', label: 'Tarea' },
  { id: 'practica', label: 'Práctica' },
  { id: 'ensayo', label: 'Ensayo' },
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'examen', label: 'Examen' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'lectura', label: 'Lectura' },
  { id: 'exposicion', label: 'Exposición' },
]

export const STATUS_OPTIONS: { id: TaskStatus; label: string }[] = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'progreso', label: 'En progreso' },
  { id: 'revision', label: 'En revisión' },
  { id: 'entregada', label: 'Entregada' },
]

export const PRIORITY_OPTIONS: { id: Priority; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'baja', label: 'Baja' },
]

export const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((item) => [item.id, item.label])) as Record<
  TaskType,
  string
>

export const STATUS_LABEL = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.id, item.label]),
) as Record<TaskStatus, string>

export const PRIORITY_LABEL = Object.fromEntries(
  PRIORITY_OPTIONS.map((item) => [item.id, item.label]),
) as Record<Priority, string>

export function scheduleLabel(meetings: { day: number; start: string; end: string }[]) {
  if (meetings.length === 0) return 'Sin horario'
  const grouped = new Map<number, string[]>()
  const ordered = [...meetings].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  for (const meeting of ordered) {
    const ranges = grouped.get(meeting.day) ?? []
    ranges.push(`${meeting.start}–${meeting.end}`)
    grouped.set(meeting.day, ranges)
  }
  return [...grouped.entries()].map(([day, ranges]) => `${DAY_SHORT[day]} ${ranges.join(', ')}`).join(' · ')
}

export function safeUrl(value: string) {
  const raw = value.trim()
  if (!raw) return null
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch {
    return null
  }
  return null
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
