import { daysFromToday } from './dates.ts'
import type { Task } from '../types.ts'

export type AlertKind = 'vencida' | 'hoy' | 'pronto'

export interface Alert {
  id: string
  kind: AlertKind
  task: Task
}

export function buildAlerts(tasks: Task[], notifyDays: number, now = Date.now()): Alert[] {
  const windowDays = Math.min(14, Math.max(1, notifyDays))
  const alerts: Alert[] = []

  for (const task of tasks) {
    if (task.status === 'entregada') continue
    const dueTime = new Date(task.dueAt).getTime()
    const days = daysFromToday(task.dueAt, now)
    const past = dueTime < now
    let kind: AlertKind | null = null
    if (past) kind = 'vencida'
    else if (days === 0) kind = 'hoy'
    else if (days > 0 && days <= windowDays) kind = 'pronto'
    if (!kind) continue
    alerts.push({ id: `${task.id}:${kind}`, kind, task })
  }

  const rank: Record<AlertKind, number> = { vencida: 0, hoy: 1, pronto: 2 }
  return alerts.sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind]
    return new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime()
  })
}
