import { dueLabel, formatLongDate, greeting, weekMinutes } from '../lib/dates.ts'
import { TYPE_LABEL } from '../lib/labels.ts'
import { upcomingClasses } from '../lib/schedule.ts'
import { isOverdue, matchesScope, mostUrgent, type Scope } from '../lib/tasks.ts'
import { useStore } from '../state/Store.tsx'
import { Empty, Ring } from '../components/Empty.tsx'
import { Icon } from '../components/Icon.tsx'

export function Dashboard({
  onJump,
  onOpenTask,
  onNewTask,
  onNewCourse,
  onFocus,
  onCalendarDay,
}: {
  onJump: (scope: Scope) => void
  onOpenTask: (id: string) => void
  onNewTask: () => void
  onNewCourse: () => void
  onFocus: (taskId: string) => void
  onCalendarDay: (date: Date) => void
}) {
  const { courses, tasks, sessions, settings, now } = useStore()
  const active = tasks.filter((task) => task.status !== 'entregada')
  const overdue = active.filter((task) => isOverdue(task, now))
  const today = tasks.filter((task) => matchesScope(task, 'hoy', now) && task.status !== 'entregada')
  const week = tasks.filter((task) => matchesScope(task, 'semana', now))
  const delivered = tasks.filter((task) => task.status === 'entregada').length
  const rate = tasks.length ? Math.round((delivered / tasks.length) * 100) : 0
  const urgent = mostUrgent(tasks, now)
  const courseOf = (id: string) => courses.find((course) => course.id === id)
  const nextStep = urgent?.checklist.find((item) => !item.done)
  const classes = upcomingClasses(courses).slice(0, 3)
  const focusMin = weekMinutes(sessions)
  const name = settings.studentName.trim()

  const upcoming = [...active]
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() + index)
    const count = active.filter((task) => {
      const due = new Date(task.dueAt)
      return (
        due.getFullYear() === date.getFullYear() &&
        due.getMonth() === date.getMonth() &&
        due.getDate() === date.getDate()
      )
    }).length
    return { date, count }
  })
  const maxCount = Math.max(1, ...weekDays.map((day) => day.count))

  if (courses.length === 0 && tasks.length === 0) {
    return (
      <section className="view">
        <Empty
          title="Tu ciclo empieza aquí"
          text="Registra un curso y luego los trabajos con su fecha de vencimiento. Lumen te avisará antes de que se acumulen."
        >
          <button type="button" className="btn" onClick={onNewCourse}>
            <Icon name="plus" size={16} />
            Registrar curso
          </button>
        </Empty>
      </section>
    )
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">{formatLongDate()}</p>
          <h1>
            {greeting()}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="lede">
            {urgent
              ? `${urgent.title} · ${dueLabel(urgent.dueAt).toLowerCase()}.`
              : 'No tienes entregas pendientes. Buen momento para adelantar lectura.'}
          </p>
          {nextStep && <p className="next-step">Siguiente paso: {nextStep.text}</p>}
        </div>
        <div className="head-actions">
          {urgent && (
            <button type="button" className="btn btn-ghost" onClick={() => onFocus(urgent.id)}>
              <Icon name="timer" size={16} />
              Enfocar
            </button>
          )}
          <button type="button" className="btn" onClick={onNewTask}>
            <Icon name="plus" size={16} />
            Nueva tarea
          </button>
        </div>
      </header>

      <div className="stats">
        <button type="button" className="stat" onClick={() => onJump('activas')}>
          <span>Activas</span>
          <strong>{active.length}</strong>
          <em>en este ciclo</em>
        </button>
        <button type="button" className="stat" onClick={() => onJump('hoy')}>
          <span>Vencen hoy</span>
          <strong>{today.length}</strong>
          <em>incluye la hora</em>
        </button>
        <button type="button" className={overdue.length ? 'stat stat-alert' : 'stat'} onClick={() => onJump('vencidas')}>
          <span>Vencidas</span>
          <strong>{overdue.length}</strong>
          <em>piden atención</em>
        </button>
        <button type="button" className="stat" onClick={() => onJump('semana')}>
          <span>Próximos 7 días</span>
          <strong>{week.length}</strong>
          <em>sin contar vencidas</em>
        </button>
      </div>

      <div className="split">
        <section className="card">
          <header className="spread">
            <h2>Por entregar</h2>
            <button type="button" className="text-btn" onClick={() => onJump('activas')}>
              Ver todas
            </button>
          </header>
          {upcoming.length === 0 ? (
            <p className="muted">No hay trabajos activos.</p>
          ) : (
            <ul className="plain-list">
              {upcoming.map((task, index) => {
                const course = courseOf(task.courseId)
                return (
                  <li key={task.id} style={{ animationDelay: `${index * 40}ms` }} className="rise">
                    <button type="button" className="list-btn" onClick={() => onOpenTask(task.id)}>
                      <i className="dot" style={{ background: course?.color ?? '#444' }} />
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {course?.code} · {TYPE_LABEL[task.type]}
                        </small>
                      </span>
                      <em className={isOverdue(task, now) ? 'late' : ''}>{dueLabel(task.dueAt)}</em>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="stack">
          <section className="card ring-card">
            <Ring value={rate} label="entregado" />
            <div>
              <h2>Avance del ciclo</h2>
              <p className="muted">
                {delivered} de {tasks.length} trabajos entregados. {focusMin} min de enfoque esta semana.
              </p>
            </div>
          </section>

          <section className="card">
            <h2>Próximas clases</h2>
            {classes.length === 0 ? (
              <p className="muted">No hay clases en los próximos días.</p>
            ) : (
              <ul className="plain-list">
                {classes.map((item) => (
                  <li key={`${item.course.id}-${item.when.toISOString()}`}>
                    <div className="class-row">
                      <i className="dot" style={{ background: item.course.color }} />
                      <span>
                        <strong>{item.course.name}</strong>
                        <small>
                          {item.when.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                          · {item.start}–{item.end}
                          {item.room ? ` · ${item.room}` : ''}
                        </small>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="card">
        <header className="spread">
          <h2>Carga de la semana</h2>
          <p className="muted">Entregas por día</p>
        </header>
        <ol className="week">
          {weekDays.map((day) => (
            <li key={day.date.toISOString()}>
              <button type="button" onClick={() => onCalendarDay(day.date)}>
                <span className="week-plot" aria-hidden="true">
                  <i style={{ height: `${Math.max(8, (day.count / maxCount) * 100)}%` }} />
                </span>
                <strong>{day.count || '·'}</strong>
                <span>{day.date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="course-mini">
        {courses.map((course) => {
          const related = tasks.filter((task) => task.courseId === course.id)
          const done = related.filter((task) => task.status === 'entregada').length
          const ratio = related.length ? done / related.length : 0
          const weight = related.reduce((sum, task) => sum + (task.weight || 0), 0)
          return (
            <article key={course.id} className="card mini">
              <header>
                <i className="dot" style={{ background: course.color }} />
                <div>
                  <p className="kicker">{course.code}</p>
                  <h3>{course.name}</h3>
                </div>
              </header>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${ratio * 100}%`, background: course.color }} />
              </div>
              <p className="muted">
                {done}/{related.length || 0} entregados
                {weight > 0 ? ` · peso ${weight}%` : ''}
              </p>
            </article>
          )
        })}
      </section>
    </section>
  )
}
