export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function daysFromToday(iso: string, now = Date.now()) {
  const due = startOfDay(new Date(iso)).getTime()
  const today = startOfDay(new Date(now)).getTime()
  return Math.round((due - today) / 86_400_000)
}

export function shiftDays(days: number, hours: number, minutes = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

export function toDateTimeLocal(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString()
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

export function formatLongDate(date = new Date()) {
  const text = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatMonth(date: Date) {
  const text = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(date).replace('.', '')
}

export function dueLabel(iso: string, now = Date.now()) {
  const days = daysFromToday(iso, now)
  const past = new Date(iso).getTime() < now
  const time = formatTime(iso)
  if (days === 0 && past) return `Venció hoy · ${time}`
  if (days === 0) return `Hoy · ${time}`
  if (days === 1) return `Mañana · ${time}`
  if (days === -1) return 'Venció ayer'
  if (days < 0) return `Venció hace ${Math.abs(days)} días`
  if (days < 7) return `En ${days} días · ${time}`
  return `${formatDay(iso)} · ${time}`
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? 6 : day - 1
  next.setDate(next.getDate() - diff)
  return next
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = startOfWeek(first)
  const cells: Date[] = []
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    cells.push(day)
  }
  return cells
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function weekMinutes(sessions: { minutes: number; at: string }[], now = new Date()) {
  const start = startOfWeek(now).getTime()
  return sessions
    .filter((session) => new Date(session.at).getTime() >= start)
    .reduce((total, session) => total + session.minutes, 0)
}
