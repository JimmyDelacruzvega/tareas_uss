import { useState } from 'react'
import { Timetable } from '../components/Timetable.tsx'
import { dueLabel, formatMonth, isSameDay, monthMatrix, startOfMonth } from '../lib/dates.ts'
import { TYPE_LABEL } from '../lib/labels.ts'
import { classesOnDate } from '../lib/schedule.ts'
import { useStore } from '../state/Store.tsx'
import { Icon } from '../components/Icon.tsx'

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function CalendarView({
  selected,
  onSelect,
  onOpen,
}: {
  selected: Date
  onSelect: (date: Date) => void
  onOpen: (id: string) => void
}) {
  const { courses, tasks } = useStore()
  const [mode, setMode] = useState<'horario' | 'mes'>('horario')
  const monthKey = `${selected.getFullYear()}-${selected.getMonth()}`
  const [visible, setVisible] = useState(() => startOfMonth(selected))
  const [trackedMonth, setTrackedMonth] = useState(monthKey)
  if (trackedMonth !== monthKey) {
    setTrackedMonth(monthKey)
    setVisible(startOfMonth(selected))
  }

  const cells = monthMatrix(visible.getFullYear(), visible.getMonth())
  const dayTasks = tasks
    .filter((task) => isSameDay(new Date(task.dueAt), selected))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const classes = classesOnDate(courses, selected)

  function shiftMonth(amount: number) {
    setVisible((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">Calendario</p>
          <h1>{mode === 'horario' ? 'Tu semana' : formatMonth(visible)}</h1>
          <p className="lede">
            {mode === 'horario'
              ? 'Cada curso ocupa su hora real. Si hay dos tramos, se ven por separado y el hueco queda como pausa.'
              : 'Clases y vencimientos en el mes.'}
          </p>
        </div>
        <div className="head-actions">
          <div className="seg" role="tablist" aria-label="Vista del calendario">
            <button type="button" className={mode === 'horario' ? 'on' : ''} onClick={() => setMode('horario')}>
              Horario
            </button>
            <button type="button" className={mode === 'mes' ? 'on' : ''} onClick={() => setMode('mes')}>
              Mes
            </button>
          </div>
          {mode === 'mes' && (
            <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const today = new Date()
              setVisible(startOfMonth(today))
              onSelect(today)
            }}
          >
            Hoy
          </button>
          <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}>
            <Icon name="left" />
          </button>
          <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}>
            <Icon name="right" />
          </button>
            </>
          )}
        </div>
      </header>

      {mode === 'horario' ? (
        <Timetable onOpen={onOpen} />
      ) : (
      <div className="cal-layout">
        <div className="card cal-card">
          <div className="cal-grid cal-dow">
            {DOW.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((day) => {
              const inMonth = day.getMonth() === visible.getMonth()
              const items = tasks.filter((task) => isSameDay(new Date(task.dueAt), day))
              const hasClass = classesOnDate(courses, day).length > 0
              const selectedDay = isSameDay(day, selected)
              const today = isSameDay(day, new Date())
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`cal-cell${inMonth ? '' : ' is-out'}${selectedDay ? ' is-selected' : ''}`}
                  aria-pressed={selectedDay}
                  onClick={() => onSelect(day)}
                >
                  <strong className={today ? 'is-today' : ''}>{day.getDate()}</strong>
                  <span className="cal-dots">
                    {hasClass && <i className="class-pip" />}
                    {items.slice(0, 3).map((task) => {
                      const course = courses.find((item) => item.id === task.courseId)
                      return <i key={task.id} style={{ background: course?.color ?? '#888' }} />
                    })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="card day-panel">
          <p className="kicker">
            {selected.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2>Día seleccionado</h2>

          <h3>Clases</h3>
          {classes.length === 0 ? (
            <p className="muted">Sin clases este día.</p>
          ) : (
            <ul className="plain-list">
              {classes.map(({ course, meeting }) => (
                <li key={`${course.id}-${meeting.start}`}>
                  <div className="class-row">
                    <i className="dot" style={{ background: course.color }} />
                    <span>
                      <strong>{course.name}</strong>
                      <small>
                        {meeting.start}–{meeting.end}
                        {(meeting.room || course.room) ? ` · ${meeting.room || course.room}` : ''}
                      </small>
                      {(meeting.professor || course.professor) && (
                        <small>{meeting.professor || course.professor}</small>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3>Entregas</h3>
          {dayTasks.length === 0 ? (
            <p className="muted">Nada vence este día.</p>
          ) : (
            <ul className="plain-list">
              {dayTasks.map((task) => {
                const course = courses.find((item) => item.id === task.courseId)
                return (
                  <li key={task.id}>
                    <button type="button" className="list-btn" onClick={() => onOpen(task.id)}>
                      <i className="dot" style={{ background: course?.color ?? '#888' }} />
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {course?.code} · {TYPE_LABEL[task.type]}
                        </small>
                      </span>
                      <em>{dueLabel(task.dueAt)}</em>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>
      )}
    </section>
  )
}
