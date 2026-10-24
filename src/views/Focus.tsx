import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/Store.tsx'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

export function Focus({ preferredTaskId }: { preferredTaskId?: string }) {
  const { tasks, courses, sessions, settings, addSession, toast } = useStore()
  const activeTasks = tasks.filter((task) => task.status !== 'entregada')
  const [taskId, setTaskId] = useState(preferredTaskId || activeTasks[0]?.id || '')
  const [trackedTask, setTrackedTask] = useState(preferredTaskId)
  if (preferredTaskId && preferredTaskId !== trackedTask) {
    setTrackedTask(preferredTaskId)
    setTaskId(preferredTaskId)
  }
  const [mode, setMode] = useState<'foco' | 'pausa'>('foco')
  const [left, setLeft] = useState(FOCUS_SECONDS)
  const [running, setRunning] = useState(false)
  const endsAt = useRef<number | null>(null)
  const finished = useRef(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.round(((endsAt.current ?? Date.now()) - Date.now()) / 1000))
      setLeft(remain)
      if (remain > 0 || finished.current) return
      finished.current = true
      setRunning(false)
      endsAt.current = null
      if (mode === 'foco') {
        addSession(25, taskId || null)
        toast('Bloque de 25 minutos terminado.')
        if (settings.browserNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Lumen', { body: 'Terminó tu bloque de enfoque.' })
        }
      } else {
        toast('Descanso terminado. Puedes volver al trabajo.')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, mode, taskId, addSession, toast, settings.browserNotify])

  function switchMode(next: 'foco' | 'pausa') {
    setMode(next)
    setRunning(false)
    endsAt.current = null
    finished.current = false
    setLeft(next === 'foco' ? FOCUS_SECONDS : BREAK_SECONDS)
  }

  function reset() {
    setRunning(false)
    endsAt.current = null
    finished.current = false
    setLeft(mode === 'foco' ? FOCUS_SECONDS : BREAK_SECONDS)
  }

  const total = mode === 'foco' ? FOCUS_SECONDS : BREAK_SECONDS
  const radius = 92
  const circumference = 2 * Math.PI * radius
  const progress = 1 - left / total
  const minutes = String(Math.floor(left / 60)).padStart(2, '0')
  const seconds = String(left % 60).padStart(2, '0')
  const recent = sessions.slice(0, 5)

  return (
    <section className="view focus-view">
      <header className="page-head">
        <div>
          <p className="kicker">Enfoque</p>
          <h1>Un bloque, un trabajo</h1>
          <p className="lede">25 minutos de atención y 5 de descanso. El tiempo queda registrado en tu semana.</p>
        </div>
      </header>

      <div className="focus-layout">
        <section className="card timer-card">
          <div className="seg" role="tablist" aria-label="Modo del temporizador">
            <button type="button" className={mode === 'foco' ? 'on' : ''} onClick={() => switchMode('foco')}>
              Enfoque
            </button>
            <button type="button" className={mode === 'pausa' ? 'on' : ''} onClick={() => switchMode('pausa')}>
              Descanso
            </button>
          </div>
          <div className="timer" role="timer" aria-live="off" aria-label={`${minutes} minutos y ${seconds} segundos`}>
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <circle className="ring-track" cx="110" cy="110" r={radius} />
              <circle
                className="ring-value"
                cx="110"
                cy="110"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress * circumference}
              />
            </svg>
            <strong className="timer-time">
              {minutes}:{seconds}
            </strong>
          </div>
          {mode === 'foco' && (
            <label className="field">
              <span>Trabajo de este bloque</span>
              <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                <option value="">Sin trabajo asociado</option>
                {activeTasks.map((task) => {
                  const course = courses.find((item) => item.id === task.courseId)
                  return (
                    <option key={task.id} value={task.id}>
                      {course?.code} · {task.title}
                    </option>
                  )
                })}
              </select>
            </label>
          )}
          <div className="timer-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (running) {
                  endsAt.current = null
                  setRunning(false)
                  return
                }
                const base = left === 0 ? (mode === 'foco' ? FOCUS_SECONDS : BREAK_SECONDS) : left
                if (left === 0) setLeft(base)
                finished.current = false
                endsAt.current = Date.now() + base * 1000
                setRunning(true)
              }}
            >
              {running ? 'Pausar' : left === 0 ? 'Otra vez' : 'Empezar'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reiniciar
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Sesiones recientes</h2>
          {recent.length === 0 ? (
            <p className="muted">Cuando termines un bloque, aparecerá aquí.</p>
          ) : (
            <ul className="plain-list">
              {recent.map((session) => {
                const task = tasks.find((item) => item.id === session.taskId)
                return (
                  <li key={session.id}>
                    <div className="class-row">
                      <span>
                        <strong>{session.minutes} min</strong>
                        <small>
                          {task?.title ?? 'Bloque libre'} ·{' '}
                          {new Date(session.at).toLocaleString('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </small>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
