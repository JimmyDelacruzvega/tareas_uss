import { defaultSettings, seedState } from '../data/seed.ts'
import type { AppState, Course, FocusSession, Settings, Task } from '../types.ts'

const KEY = 'lumen-uss-v2'

function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== 'object') return false
  const course = value as Course
  return (
    typeof course.id === 'string' &&
    typeof course.name === 'string' &&
    typeof course.code === 'string' &&
    Array.isArray(course.meetings)
  )
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Task
  return typeof task.id === 'string' && typeof task.title === 'string' && typeof task.courseId === 'string'
}

function isSession(value: unknown): value is FocusSession {
  if (!value || typeof value !== 'object') return false
  const session = value as FocusSession
  return typeof session.id === 'string' && typeof session.minutes === 'number'
}

function normalizeSettings(value: unknown): Settings {
  const defaults = defaultSettings()
  if (!value || typeof value !== 'object') return defaults
  const settings = value as Partial<Settings>
  const notifyDays = Number(settings.notifyDays)
  return {
    studentName: typeof settings.studentName === 'string' ? settings.studentName : defaults.studentName,
    career: typeof settings.career === 'string' ? settings.career : defaults.career,
    campus: typeof settings.campus === 'string' ? settings.campus : defaults.campus,
    term: typeof settings.term === 'string' ? settings.term : defaults.term,
    notifyDays: Number.isFinite(notifyDays) ? Math.min(14, Math.max(1, notifyDays)) : defaults.notifyDays,
    browserNotify: Boolean(settings.browserNotify),
    theme: settings.theme === 'dark' ? 'dark' : 'light',
    seenAlertIds: Array.isArray(settings.seenAlertIds)
      ? settings.seenAlertIds.filter((id) => typeof id === 'string')
      : [],
  }
}

export function parseBackup(data: unknown): AppState | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Partial<AppState>
  if (!Array.isArray(record.courses) || !Array.isArray(record.tasks)) return null
  return {
    courses: record.courses.filter(isCourse).map((course) => ({
      ...course,
      professor: course.professor ?? '',
      credits: Number(course.credits) || 0,
      room: course.room ?? '',
      color: course.color || '#4f46e5',
      semester: course.semester || '',
      meetings: course.meetings
        .filter((meeting) => meeting && typeof meeting.day === 'number' && meeting.start && meeting.end)
        .map((meeting) => ({
          day: meeting.day,
          start: meeting.start,
          end: meeting.end,
          room: typeof meeting.room === 'string' ? meeting.room : course.room || '',
          professor: typeof meeting.professor === 'string' ? meeting.professor : course.professor || '',
        })),
    })),
    tasks: record.tasks.filter(isTask).map((task) => ({
      ...task,
      description: task.description ?? '',
      link: task.link ?? '',
      checklist: Array.isArray(task.checklist) ? task.checklist : [],
      weight: Number(task.weight) || 0,
      estimateMin: Number(task.estimateMin) || 0,
      createdAt: task.createdAt || new Date().toISOString(),
    })),
    sessions: Array.isArray(record.sessions) ? record.sessions.filter(isSession) : [],
    settings: normalizeSettings(record.settings),
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedState()
    return parseBackup(JSON.parse(raw)) ?? seedState()
  } catch {
    return seedState()
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}
