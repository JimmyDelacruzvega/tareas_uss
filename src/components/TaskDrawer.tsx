import { useEffect, useRef, useState } from 'react'
import { dueLabel } from '../lib/dates.ts'
import { PRIORITY_LABEL, safeUrl, scheduleLabel, STATUS_LABEL, STATUS_OPTIONS, TYPE_LABEL } from '../lib/labels.ts'
import { checklistProgress } from '../lib/tasks.ts'
import { useStore } from '../state/Store.tsx'
import type { TaskStatus } from '../types.ts'
import { Drawer } from './Modal.tsx'
import { Icon } from './Icon.tsx'

export function TaskDrawer({
  taskId,
  onClose,
  onEdit,
  onFocus,
}: {
  taskId: string
  onClose: () => void
  onEdit: () => void
  onFocus: () => void
}) {
  const { tasks, courses, setStatus, toggleCheck, addCheck, removeCheck, deleteTask, toast } = useStore()
  const task = tasks.find((item) => item.id === taskId)
  const course = courses.find((item) => item.id === task?.courseId)
  const [step, setStep] = useState('')
  const [confirming, setConfirming] = useState(false)
  const stepList = useRef<HTMLUListElement>(null)
  const scrollStep = useRef(false)

  useEffect(() => {
    if (!scrollStep.current) return
    scrollStep.current = false
    const node = stepList.current?.lastElementChild
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' })
  }, [task?.checklist.length])

  if (!task || !course) return null
  const progress = checklistProgress(task)
  const href = safeUrl(task.link)

  return (
    <Drawer title={task.title} onClose={onClose}>
      <div className="drawer-body">
        <header className="drawer-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar detalle">
            <Icon name="close" />
          </button>
          <p className="kicker">
            <i className="dot" style={{ background: course.color }} />
            {course.code} · {TYPE_LABEL[task.type]}
          </p>
          <h2>{task.title}</h2>
          <p className="muted">{dueLabel(task.dueAt)}</p>
        </header>

        <div className="seg" role="group" aria-label="Estado">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={task.status === option.id ? 'on' : ''}
              aria-pressed={task.status === option.id}
              onClick={() => {
                setStatus(task.id, option.id as TaskStatus)
                toast(option.id === 'entregada' ? 'Marcado como entregado.' : `Estado: ${option.label}.`)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <dl className="meta-grid">
          <div>
            <dt>Prioridad</dt>
            <dd className={`pri pri-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{STATUS_LABEL[task.status]}</dd>
          </div>
          {task.weight > 0 && (
            <div>
              <dt>Peso</dt>
              <dd>{task.weight}%</dd>
            </div>
          )}
          {task.estimateMin > 0 && (
            <div>
              <dt>Estimado</dt>
              <dd>{formatHours(task.estimateMin)}</dd>
            </div>
          )}
        </dl>

        <section>
          <h3>Qué hay que hacer</h3>
          <p className="prose">{task.description || 'Todavía no hay una descripción.'}</p>
          {href && (
            <a className="text-link" href={href} target="_blank" rel="noreferrer">
              <Icon name="link" size={15} />
              Abrir material
            </a>
          )}
        </section>

        <section>
          <div className="spread">
            <h3>Pasos</h3>
            {progress && (
              <span className="muted">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          {progress && (
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${progress.ratio * 100}%`, background: course.color }} />
            </div>
          )}
          <ul className="checks" ref={stepList}>
            {task.checklist.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheck(task.id, item.id)}
                  />
                  <span className={item.done ? 'done' : ''}>{item.text}</span>
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Quitar ${item.text}`}
                  onClick={() => removeCheck(task.id, item.id)}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="step-add"
            onSubmit={(event) => {
              event.preventDefault()
              const text = step.trim()
              if (!text) return
              scrollStep.current = true
              void addCheck(task.id, text).then(
                () => setStep(''),
                (error: unknown) => {
                  scrollStep.current = false
                  toast(error instanceof Error ? error.message : 'No se pudo agregar el paso.')
                },
              )
            }}
          >
            <input
              value={step}
              onChange={(event) => setStep(event.target.value)}
              placeholder="Agregar un paso"
            />
            <button type="submit" className="btn btn-soft">
              Agregar
            </button>
          </form>
        </section>

        <p className="muted fine">
          {course.name} · {scheduleLabel(course.meetings)}
          {course.room ? ` · ${course.room}` : ''}
        </p>

        <div className="drawer-actions">
          <button type="button" className="btn btn-soft" onClick={onFocus}>
            <Icon name="timer" size={16} />
            Enfocar
          </button>
          <button type="button" className="btn btn-ghost" onClick={onEdit}>
            <Icon name="edit" size={16} />
            Editar
          </button>
          {confirming ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                void deleteTask(task.id).then(
                  () => {
                    toast('Trabajo eliminado.')
                    onClose()
                  },
                  (error: unknown) => {
                    toast(error instanceof Error ? error.message : 'No se pudo eliminar el trabajo.')
                  },
                )
              }}
            >
              Confirmar eliminación
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
              <Icon name="trash" size={16} />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </Drawer>
  )
}

function formatHours(minutes: number) {
  const hours = minutes / 60
  if (hours < 1) return `${minutes} min`
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`
}
