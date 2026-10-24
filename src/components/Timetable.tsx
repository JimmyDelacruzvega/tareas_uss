import { Fragment, useState } from 'react'
import { inkFor } from '../lib/color.ts'
import { addDays, isSameDay, startOfWeek } from '../lib/dates.ts'
import { DAY_SHORT } from '../lib/labels.ts'
import { useStore } from '../state/Store.tsx'

const HOUR_PX = 86
const WEEKDAYS = 5

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

function formatHour(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function pauseLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `Pausa · ${hours} h ${rest} min`
  if (hours) return `Pausa · ${hours} h`
  return `Pausa · ${rest} min`
}

export function Timetable({ onOpen }: { onOpen: (id: string) => void }) {
  const { courses, tasks } = useStore()
  const [anchor, setAnchor] = useState(() => new Date())
  const weekStart = startOfWeek(anchor)
  const columns = Array.from({ length: WEEKDAYS }, (_, index) => addDays(weekStart, index))
  const meetings = courses.flatMap((course) => course.meetings)
  const start = meetings.length ? Math.floor(Math.min(...meetings.map((meeting) => toMinutes(meeting.start))) / 60) * 60 : 8 * 60
  const end = meetings.length ? Math.ceil(Math.max(...meetings.map((meeting) => toMinutes(meeting.end))) / 60) * 60 : 18 * 60
  const hours = Array.from({ length: Math.max(1, (end - start) / 60) }, (_, index) => start + index * 60)
  const height = ((end - start) / 60) * HOUR_PX
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  function moveWeek(amount: number) {
    setAnchor((current) => addDays(current, amount * 7))
  }

  const fromLabel = columns[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
  const toLabel = columns[columns.length - 1].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })

  return (
    <div className="timetable">
      <div className="tt-toolbar">
        <strong>
          {fromLabel} – {toLabel}
        </strong>
        <div className="head-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setAnchor(new Date())}>
            Esta semana
          </button>
          <button type="button" className="icon-btn" aria-label="Semana anterior" onClick={() => moveWeek(-1)}>
            ‹
          </button>
          <button type="button" className="icon-btn" aria-label="Semana siguiente" onClick={() => moveWeek(1)}>
            ›
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="muted">Registra un curso con sus intervalos para ver el horario aquí.</p>
      ) : (
        <div className="tt-scroll">
          <div className="tt-board">
            <div className="tt-head">
              <span />
              {columns.map((date) => {
                const due = tasks.filter(
                  (task) => task.status !== 'entregada' && isSameDay(new Date(task.dueAt), date),
                )
                return (
                  <div key={date.toISOString()} className={isSameDay(date, now) ? 'is-today' : ''}>
                    <b>{DAY_SHORT[date.getDay()]}</b>
                    <span>{date.getDate()}</span>
                    {due.map((task) => (
                      <button key={task.id} type="button" onClick={() => onOpen(task.id)}>
                        {task.title}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="tt-body" style={{ height }}>
              <div className="tt-hours">
                {hours.map((hour) => (
                  <span key={hour} style={{ top: ((hour - start) / 60) * HOUR_PX }}>
                    {formatHour(hour)}
                  </span>
                ))}
              </div>
              {columns.map((date) => {
                const day = date.getDay()
                const items = courses
                  .flatMap((course) =>
                    course.meetings
                      .filter((meeting) => meeting.day === day)
                      .map((meeting) => ({ course, meeting })),
                  )
                  .sort((a, b) => a.meeting.start.localeCompare(b.meeting.start))
                const lanes: number[] = []
                const placed = items.map((item) => {
                  const begins = toMinutes(item.meeting.start)
                  const finishes = toMinutes(item.meeting.end)
                  let lane = lanes.findIndex((until) => until <= begins)
                  if (lane === -1) {
                    lane = lanes.length
                    lanes.push(finishes)
                  } else {
                    lanes[lane] = finishes
                  }
                  return { ...item, lane }
                })
                const laneCount = Math.max(1, lanes.length)
                const pauses =
                  laneCount === 1
                    ? items.flatMap((item, index) => {
                        const next = items[index + 1]
                        if (!next) return []
                        const gap = toMinutes(next.meeting.start) - toMinutes(item.meeting.end)
                        if (gap < 40) return []
                        return [{ start: item.meeting.end, end: next.meeting.start, gap }]
                      })
                    : []
                const showNow = isSameDay(date, now) && nowMinutes >= start && nowMinutes <= end
                return (
                  <div className="tt-col" key={date.toISOString()}>
                    {hours.map((hour) => (
                      <i key={hour} className="tt-line" style={{ top: ((hour - start) / 60) * HOUR_PX }} />
                    ))}
                    {pauses.map((pause) => (
                      <div
                        key={`${pause.start}-${pause.end}`}
                        className="tt-pause"
                        style={{
                          top: ((toMinutes(pause.start) - start) / 60) * HOUR_PX + 6,
                          height: (pause.gap / 60) * HOUR_PX - 12,
                        }}
                      >
                        {pauseLabel(pause.gap)}
                      </div>
                    ))}
                    {placed.map(({ course, meeting, lane }) => {
                      const begins = toMinutes(meeting.start)
                      const duration = toMinutes(meeting.end) - begins
                      const room = meeting.room || course.room
                      const teacher = meeting.professor || course.professor
                      return (
                        <article
                          key={`${course.id}-${meeting.start}-${meeting.end}`}
                          className="tt-block"
                          style={{
                            top: ((begins - start) / 60) * HOUR_PX + 3,
                            height: Math.max(42, (duration / 60) * HOUR_PX - 6),
                            left: `calc(${(lane / laneCount) * 100}% + 4px)`,
                            width: `calc(${100 / laneCount}% - 8px)`,
                            background: course.color,
                            color: inkFor(course.color),
                          }}
                          title={`${course.name} · ${meeting.start}–${meeting.end}${room ? ` · ${room}` : ''}`}
                        >
                          <strong>{course.name}</strong>
                          <small>
                            {meeting.start}–{meeting.end}
                            {room ? ` · ${room}` : ''}
                          </small>
                          {duration >= 80 && teacher && <em>{teacher}</em>}
                        </article>
                      )
                    })}
                    {showNow && (
                      <span className="tt-now" style={{ top: ((nowMinutes - start) / 60) * HOUR_PX }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {courses.length > 0 && (
        <div className="tt-agenda">
          {columns.map((date) => {
            const items = courses
              .flatMap((course) =>
                course.meetings
                  .filter((meeting) => meeting.day === date.getDay())
                  .map((meeting) => ({ course, meeting })),
              )
              .sort((a, b) => a.meeting.start.localeCompare(b.meeting.start))
            const due = tasks.filter(
              (task) => task.status !== 'entregada' && isSameDay(new Date(task.dueAt), date),
            )
            return (
              <section key={date.toISOString()} className={isSameDay(date, now) ? 'tt-day is-today' : 'tt-day'}>
                <header>
                  <b>{DAY_SHORT[date.getDay()]}</b>
                  <span>{date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</span>
                  {items.length === 0 && <em>Sin clases</em>}
                </header>
                {due.map((task) => (
                  <button key={task.id} type="button" className="tt-due" onClick={() => onOpen(task.id)}>
                    {task.title}
                  </button>
                ))}
                {items.map(({ course, meeting }, index) => {
                  const next = items[index + 1]
                  const gap = next ? toMinutes(next.meeting.start) - toMinutes(meeting.end) : 0
                  const room = meeting.room || course.room
                  const teacher = meeting.professor || course.professor
                  return (
                    <Fragment key={`${course.id}-${meeting.start}-${meeting.end}`}>
                      <article className="tt-slot" style={{ background: course.color, color: inkFor(course.color) }}>
                        <strong>{course.name}</strong>
                        <small>
                          {meeting.start}–{meeting.end}
                        </small>
                        {room && <small>{room}</small>}
                        {teacher && <em>{teacher}</em>}
                      </article>
                      {gap >= 40 && <p className="tt-gap">{pauseLabel(gap)}</p>}
                    </Fragment>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
