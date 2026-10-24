import { useMemo, useState } from 'react'
import { dueLabel } from '../lib/dates.ts'
import { normalizeText, PRIORITY_LABEL, STATUS_OPTIONS, TYPE_LABEL, TYPE_OPTIONS } from '../lib/labels.ts'
import { checklistProgress, matchesScope, sortTasks, SCOPES, type Scope } from '../lib/tasks.ts'
import { useStore } from '../state/Store.tsx'
import { Empty } from '../components/Empty.tsx'
import { Icon } from '../components/Icon.tsx'
import type { TaskStatus } from '../types.ts'

export function Tasks({
  scope,
  onScope,
  query,
  courseFilter,
  onCourseFilter,
  onOpen,
  onNew,
}: {
  scope: Scope
  onScope: (scope: Scope) => void
  query: string
  courseFilter: string
  onCourseFilter: (id: string) => void
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const { courses, tasks, setStatus, now } = useStore()
  const [mode, setMode] = useState<'lista' | 'tablero'>('lista')
  const [type, setType] = useState('todos')
  const [sort, setSort] = useState<'vencimiento' | 'prioridad' | 'curso'>('vencimiento')
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)

  const visible = useMemo(() => {
    const needle = normalizeText(query.trim())
    const filtered = tasks.filter((task) => {
      if (!matchesScope(task, scope)) return false
      if (courseFilter && task.courseId !== courseFilter) return false
      if (type !== 'todos' && task.type !== type) return false
      if (!needle) return true
      const course = courses.find((item) => item.id === task.courseId)
      const blob = normalizeText(
        [task.title, task.description, TYPE_LABEL[task.type], course?.name ?? '', course?.code ?? '', ...task.checklist.map((item) => item.text)].join(' '),
      )
      return blob.includes(needle)
    })
    return sortTasks(filtered, sort)
  }, [tasks, scope, courseFilter, type, query, sort, courses])

  function courseOf(id: string) {
    return courses.find((course) => course.id === id)
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">Trabajos</p>
          <h1>Tareas y entregas</h1>
          <p className="lede">Registra qué hay que hacer, cuándo vence y en qué estado está.</p>
        </div>
        <button type="button" className="btn" onClick={onNew}>
          <Icon name="plus" size={16} />
          Nueva tarea
        </button>
      </header>

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Filtro de trabajos">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={scope === item.id ? 'chip chip-on' : 'chip'}
              aria-pressed={scope === item.id}
              onClick={() => onScope(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar-end">
          <div className="seg" role="tablist" aria-label="Vista">
            <button type="button" className={mode === 'lista' ? 'on' : ''} aria-pressed={mode === 'lista'} onClick={() => setMode('lista')}>
              Lista
            </button>
            <button type="button" className={mode === 'tablero' ? 'on' : ''} aria-pressed={mode === 'tablero'} onClick={() => setMode('tablero')}>
              Tablero
            </button>
          </div>
          <select aria-label="Tipo" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select aria-label="Orden" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="vencimiento">Por vencimiento</option>
            <option value="prioridad">Por prioridad</option>
            <option value="curso">Por curso</option>
          </select>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="chips chips-scroll">
          <button type="button" className={!courseFilter ? 'chip chip-on' : 'chip'} onClick={() => onCourseFilter('')}>
            Todos los cursos
          </button>
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              className={courseFilter === course.id ? 'chip chip-on' : 'chip'}
              onClick={() => onCourseFilter(course.id)}
            >
              <i className="dot" style={{ background: course.color }} />
              {course.code}
            </button>
          ))}
        </div>
      )}

      <p className="result-count">
        {visible.length} trabajo{visible.length === 1 ? '' : 's'}
      </p>

      {visible.length === 0 ? (
        <Empty
          title="Nada con estos filtros"
          text="Prueba otro estado, curso o búsqueda. También puedes registrar un trabajo nuevo."
        >
          <button type="button" className="btn" onClick={onNew}>
            Nueva tarea
          </button>
        </Empty>
      ) : mode === 'lista' ? (
        <ul className="task-list">
          {visible.map((task, index) => {
            const course = courseOf(task.courseId)
            const progress = checklistProgress(task)
            return (
              <li key={task.id} className="rise" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <article className={task.status === 'entregada' ? 'task-row is-done' : 'task-row'}>
                  <button
                    type="button"
                    className={task.status === 'entregada' ? 'check-btn on' : 'check-btn'}
                    aria-label={task.status === 'entregada' ? 'Marcar como pendiente' : 'Marcar como entregada'}
                    onClick={() => setStatus(task.id, task.status === 'entregada' ? 'pendiente' : 'entregada')}
                  >
                    <Icon name="check" size={14} />
                  </button>
                  <button type="button" className="task-main" onClick={() => onOpen(task.id)}>
                    <span className="task-title">{task.title}</span>
                    <span className="task-meta">
                      <i className="dot" style={{ background: course?.color ?? '#888' }} />
                      {course?.code} · {TYPE_LABEL[task.type]} · {PRIORITY_LABEL[task.priority]}
                      {progress ? ` · ${progress.done}/${progress.total} pasos` : ''}
                    </span>
                  </button>
                  <span className={task.status !== 'entregada' && new Date(task.dueAt).getTime() < now ? 'due late' : 'due'}>
                    {dueLabel(task.dueAt)}
                  </span>
                  <select
                    className="status-select"
                    aria-label={`Estado de ${task.title}`}
                    value={task.status}
                    onChange={(event) => setStatus(task.id, event.target.value as TaskStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </article>
              </li>
            )
          })}
        </ul>
      ) : (
        <>
          <p className="hint">Arrastra una tarjeta a otra columna o abre el trabajo para cambiar su estado.</p>
          <div className="board">
            {STATUS_OPTIONS.map((column) => {
              const cards = visible.filter((task) => task.status === column.id)
              return (
                <section
                  key={column.id}
                  className={over === column.id ? 'column drag-over' : 'column'}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setOver(column.id)
                  }}
                  onDragLeave={() => setOver((current) => (current === column.id ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault()
                    const id = event.dataTransfer.getData('text/plain') || dragging
                    if (id) setStatus(id, column.id)
                    setDragging(null)
                    setOver(null)
                  }}
                >
                  <header>
                    <h2>{column.label}</h2>
                    <span>{cards.length}</span>
                  </header>
                  <div className="column-body">
                    {cards.map((task) => {
                      const course = courseOf(task.courseId)
                      const progress = checklistProgress(task)
                      return (
                        <article key={task.id} className="board-card">
                          <button
                            type="button"
                            className="grip"
                            draggable
                            aria-label={`Arrastrar ${task.title}`}
                            onDragStart={(event) => {
                              event.dataTransfer.setData('text/plain', task.id)
                              event.dataTransfer.effectAllowed = 'move'
                              setDragging(task.id)
                            }}
                            onDragEnd={() => {
                              setDragging(null)
                              setOver(null)
                            }}
                          >
                            <Icon name="grip" size={14} />
                          </button>
                          <button type="button" className="board-open" onClick={() => onOpen(task.id)}>
                            <span className="kicker">
                              <i className="dot" style={{ background: course?.color ?? '#888' }} />
                              {course?.code}
                            </span>
                            <strong>{task.title}</strong>
                            <span className={new Date(task.dueAt).getTime() < now && task.status !== 'entregada' ? 'late' : ''}>
                              {dueLabel(task.dueAt)}
                            </span>
                            {progress && (
                              <span className="bar slim" aria-hidden="true">
                                <i style={{ width: `${progress.ratio * 100}%`, background: course?.color }} />
                              </span>
                            )}
                          </button>
                          <span className={`pri pri-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
