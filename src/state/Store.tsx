/* eslint-disable react-refresh/only-export-components */
import { use, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { buildAlerts, type Alert } from '../lib/alerts.ts'
import { uid } from '../lib/ids.ts'
import { loadState, saveState } from './storage.ts'
import { loadBoot, removeCourse, removeStep, removeTask, saveCourse, saveSession, saveStatus, saveTask, syncAcademic, createStep, flipStep, type Academic } from './remote.ts'
import { reducer } from './reducer.ts'
import type { AppState, Course, FocusSession, Settings, Task, TaskStatus } from '../types.ts'

interface Toast {
  id: string
  text: string
}

interface StoreValue {
  courses: Course[]
  tasks: Task[]
  sessions: FocusSession[]
  settings: Settings
  alerts: Alert[]
  now: number
  unseenCount: number
  addCourse: (course: Course) => Promise<void>
  updateCourse: (course: Course) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  addTask: (task: Task) => Promise<void>
  updateTask: (task: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setStatus: (id: string, status: TaskStatus) => void
  toggleCheck: (taskId: string, itemId: string) => void
  addCheck: (taskId: string, text: string) => Promise<void>
  removeCheck: (taskId: string, itemId: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  seeAlerts: (ids: string[]) => void
  addSession: (minutes: number, taskId: string | null) => void
  resetDemo: () => void
  replaceState: (state: AppState) => Promise<void>
  toast: (text: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const boot = use(loadBoot())
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const local = loadState()
    return {
      ...local,
      courses: boot.academic.courses,
      tasks: boot.academic.tasks,
      sessions: boot.academic.sessions,
    }
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [now, setNow] = useState(() => Date.now())
  const fired = useRef(new Set<string>())
  const booted = useRef(false)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const alerts = useMemo(
    () => buildAlerts(state.tasks, state.settings.notifyDays, now),
    [state.tasks, state.settings.notifyDays, now],
  )

  useEffect(() => {
    if (!booted.current) {
      booted.current = true
      for (const alert of alerts) fired.current.add(alert.id)
      return
    }
    if (!state.settings.browserNotify) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const fresh = alerts.filter(
      (alert) => !state.settings.seenAlertIds.includes(alert.id) && !fired.current.has(alert.id),
    )
    for (const alert of fresh.slice(0, 2)) {
      fired.current.add(alert.id)
      const title =
        alert.kind === 'vencida' ? 'Trabajo vencido' : alert.kind === 'hoy' ? 'Vence hoy' : 'Pronto a vencer'
      new Notification(`Lumen · ${title}`, { body: alert.task.title })
    }
  }, [alerts, state.settings.browserNotify, state.settings.seenAlertIds])

  const toast = useCallback((text: string) => {
    const id = uid()
    setToasts((current) => [...current.slice(-2), { id, text }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 3400)
  }, [])

  const publish = useCallback((academic: Academic) => {
    dispatch({ type: 'hydrate', courses: academic.courses, tasks: academic.tasks, sessions: academic.sessions })
  }, [])

  const fail = useCallback(
    (error: unknown) => {
      toast(error instanceof Error ? error.message : 'No se pudo guardar en la base de datos.')
    },
    [toast],
  )

  const unseenCount = alerts.filter((alert) => !state.settings.seenAlertIds.includes(alert.id)).length

  const api = useMemo<StoreValue>(
    () => ({
      courses: state.courses,
      tasks: state.tasks,
      sessions: state.sessions,
      settings: state.settings,
      alerts,
      now,
      unseenCount,
      addCourse: async (course) => {
        publish(await saveCourse(course, false))
      },
      updateCourse: async (course) => {
        publish(await saveCourse(course, true))
      },
      deleteCourse: async (id) => {
        publish(await removeCourse(id))
      },
      addTask: async (task) => {
        publish(await saveTask(task, false))
      },
      updateTask: async (task) => {
        publish(await saveTask(task, true))
      },
      deleteTask: async (id) => {
        publish(await removeTask(id))
      },
      setStatus: (id, status) => {
        void saveStatus(id, status).then(publish).catch(fail)
      },
      toggleCheck: (_taskId, itemId) => {
        void flipStep(itemId).then(publish).catch(fail)
      },
      addCheck: async (taskId, text) => {
        publish(await createStep(taskId, text))
      },
      removeCheck: (_taskId, itemId) => {
        void removeStep(itemId).then(publish).catch(fail)
      },
      updateSettings: (patch) => dispatch({ type: 'patch-settings', patch }),
      seeAlerts: (ids) => dispatch({ type: 'see-alerts', ids }),
      addSession: (minutes, taskId) => {
        void saveSession(minutes, taskId).then(publish).catch(fail)
      },
      resetDemo: () => dispatch({ type: 'reset-demo', keep: state.settings }),
      replaceState: async (next) => {
        const academic = await syncAcademic({ courses: next.courses, tasks: next.tasks, sessions: next.sessions })
        dispatch({ type: 'replace', state: { ...next, ...academic } })
      },
      toast,
    }),
    [alerts, fail, now, publish, state, toast, unseenCount],
  )

  return (
    <StoreContext.Provider value={api}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {boot.error && <div className="toast">{boot.error}</div>}
        {toasts.map((item) => (
          <div className="toast" key={item.id}>
            {item.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  )
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore debe usarse dentro del proveedor.')
  return value
}
