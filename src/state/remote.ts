import { loadState } from './storage.ts'
import type { Course, FocusSession, Task, TaskStatus } from '../types.ts'

export interface Academic {
  courses: Course[]
  tasks: Task[]
  sessions: FocusSession[]
}

export interface BootResult {
  academic: Academic
  error: string | null
}

async function request(path: string, init?: RequestInit): Promise<Academic> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new Error('No se pudo conectar con la base de datos.')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'No se pudo guardar en la base de datos.'
    throw new Error(message)
  }
  if (!data || typeof data !== 'object') throw new Error('La base de datos devolvió una respuesta vacía.')
  const academic = data as Partial<Academic>
  return {
    courses: Array.isArray(academic.courses) ? academic.courses : [],
    tasks: Array.isArray(academic.tasks) ? academic.tasks : [],
    sessions: Array.isArray(academic.sessions) ? academic.sessions : [],
  }
}

function localAcademic(): Academic {
  const local = loadState()
  return { courses: local.courses, tasks: local.tasks, sessions: local.sessions }
}

let boot: Promise<BootResult> | null = null

export function loadBoot(): Promise<BootResult> {
  boot ??= request('/api/adopt', { method: 'POST', body: JSON.stringify(localAcademic()) })
    .then((academic) => ({ academic, error: null }))
    .catch((error: unknown) => ({
      academic: localAcademic(),
      error: error instanceof Error ? error.message : 'No se pudo conectar con la base de datos.',
    }))
  return boot
}

export function syncAcademic(academic: Academic) {
  return request('/api/state', { method: 'PUT', body: JSON.stringify(academic) })
}

export function saveCourse(course: Course, exists: boolean) {
  return request(exists ? `/api/courses/${course.id}` : '/api/courses', {
    method: exists ? 'PUT' : 'POST',
    body: JSON.stringify(course),
  })
}

export function removeCourse(id: string) {
  return request(`/api/courses/${id}`, { method: 'DELETE' })
}

export function saveTask(task: Task, exists: boolean) {
  return request(exists ? `/api/tasks/${task.id}` : '/api/tasks', {
    method: exists ? 'PUT' : 'POST',
    body: JSON.stringify(task),
  })
}

export function removeTask(id: string) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}

export function saveStatus(id: string, status: TaskStatus) {
  return request(`/api/tasks/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export function createStep(taskId: string, text: string) {
  return request(`/api/tasks/${taskId}/pasos`, { method: 'POST', body: JSON.stringify({ text }) })
}

export function flipStep(id: string) {
  return request(`/api/pasos/${id}`, { method: 'PATCH' })
}

export function removeStep(id: string) {
  return request(`/api/pasos/${id}`, { method: 'DELETE' })
}

export function saveSession(minutes: number, taskId: string | null) {
  return request('/api/enfoques', { method: 'POST', body: JSON.stringify({ minutes, taskId }) })
}
