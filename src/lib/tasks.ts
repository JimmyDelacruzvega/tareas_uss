import { daysFromToday } from './dates.ts'
import type { Priority, Task } from '../types.ts'

export const SCOPES = [
  { id: 'activas', label: 'Activas' },
  { id: 'todas', label: 'Todas' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: '7 días' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'alta', label: 'Prioridad alta' },
] as const

export type Scope = (typeof SCOPES)[number]['id']

const PRIORITY_RANK: Record<Priority, number> = { alta: 0, media: 1, baja: 2 }

export function isOverdue(task: Task, now = Date.now()) {
  return task.status !== 'entregada' && new Date(task.dueAt).getTime() < now
}

export function matchesScope(task: Task, scope: Scope, now = Date.now()) {
  const days = daysFromToday(task.dueAt, now)
  if (scope === 'todas') return true
  if (scope === 'activas') return task.status !== 'entregada'
  if (scope === 'hoy') return days === 0
  if (scope === 'semana') return days >= 0 && days <= 7 && task.status !== 'entregada'
  if (scope === 'vencidas') return isOverdue(task, now)
  if (scope === 'alta') return task.priority === 'alta' && task.status !== 'entregada'
  return true
}

export function mostUrgent(tasks: Task[], now = Date.now()) {
  return tasks
    .filter((task) => task.status !== 'entregada')
    .sort((a, b) => {
      const aOver = isOverdue(a, now) ? 0 : 1
      const bOver = isOverdue(b, now) ? 0 : 1
      if (aOver !== bOver) return aOver - bOver
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })[0]
}

export function sortTasks(tasks: Task[], mode: 'vencimiento' | 'prioridad' | 'curso') {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'entregada' ? 1 : 0
    const bDone = b.status === 'entregada' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    if (mode === 'prioridad') {
      const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (byPriority !== 0) return byPriority
    }
    if (mode === 'curso') {
      const byCourse = a.courseId.localeCompare(b.courseId)
      if (byCourse !== 0) return byCourse
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  })
}

export function checklistProgress(task: Task) {
  if (task.checklist.length === 0) return null
  const done = task.checklist.filter((item) => item.done).length
  return { done, total: task.checklist.length, ratio: done / task.checklist.length }
}
