import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { monthMatrix } from '../lib/dates.ts'
import { Icon } from './Icon.tsx'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function read(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
}

function stamp(year: number, month: number, day: number, hour: number, minute: number) {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

function label(value: string) {
  const parts = read(value)
  if (!parts) return 'Elegir fecha y hora'
  const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  return date.toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DueField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [month, setMonth] = useState(() => new Date())
  const today = useState(() => new Date())[0]

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useLayoutEffect(() => {
    const node = popRef.current
    const trigger = buttonRef.current
    if (!open || !node || !trigger) return
    const rect = trigger.getBoundingClientRect()
    const margin = 12
    const gap = 8
    const height = node.offsetHeight
    const width = node.offsetWidth
    const spaceRight = window.innerWidth - rect.right - margin
    const spaceLeft = rect.left - margin
    let left = rect.right + gap
    if (spaceRight < width && spaceLeft >= width) left = rect.left - gap - width
    else if (spaceRight < width) left = Math.max(margin, window.innerWidth - width - margin)
    const maxTop = window.innerHeight - Math.min(height, window.innerHeight - margin * 2) - margin
    const top = Math.max(margin, Math.min(rect.top, maxTop))
    node.style.top = `${top}px`
    node.style.left = `${left}px`
  }, [open, month])

  function openPanel() {
    const current = read(value)
    const base = current ? new Date(current.year, current.month - 1, current.day) : new Date()
    setHour(current?.hour ?? 8)
    setMinute(current?.minute ?? 0)
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1))
    setOpen(true)
  }

  function apply(nextHour: number, nextMinute: number, day = read(value)) {
    if (!day) return
    onChange(stamp(day.year, day.month, day.day, nextHour, nextMinute))
  }

  function chooseDay(day: Date) {
    onChange(stamp(day.getFullYear(), day.getMonth() + 1, day.getDate(), hour, minute))
  }

  function chooseHour(nextHour: number) {
    setHour(nextHour)
    apply(nextHour, minute)
  }

  const selected = read(value)
  const cells = monthMatrix(month.getFullYear(), month.getMonth())

  return (
    <div className="due-field">
      <button
        ref={buttonRef}
        type="button"
        className="due-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span>{label(value)}</span>
        <Icon name="calendar" size={16} />
      </button>
      {open && (
        <>
          <button type="button" className="due-backdrop" aria-label="Cerrar calendario" onClick={() => setOpen(false)} />
          <div ref={popRef} className="due-pop" role="dialog" aria-label="Fecha y hora de vencimiento">
            <div className="due-cal">
            <div className="due-month">
              <button
                type="button"
                className="icon-btn"
                aria-label="Mes anterior"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                <Icon name="left" size={16} />
              </button>
              <strong>
                {month.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
              </strong>
              <button
                type="button"
                className="icon-btn"
                aria-label="Mes siguiente"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                <Icon name="right" size={16} />
              </button>
            </div>
            <div className="due-grid due-dow">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="due-grid">
              {cells.map((day) => {
                const inMonth = day.getMonth() === month.getMonth()
                const isSelected =
                  selected?.year === day.getFullYear() &&
                  selected.month === day.getMonth() + 1 &&
                  selected.day === day.getDate()
                const isToday =
                  today.getFullYear() === day.getFullYear() &&
                  today.getMonth() === day.getMonth() &&
                  today.getDate() === day.getDate()
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`due-day${inMonth ? '' : ' is-out'}${isSelected ? ' is-on' : ''}${isToday ? ' is-today' : ''}`}
                    onClick={() => chooseDay(day)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
            </div>
            <div className="due-foot">
            <div className="due-time">
              <label>
                <span>Hora</span>
                <select aria-label="Hora" value={hour} onChange={(event) => chooseHour(Number(event.target.value))}>
                  {Array.from({ length: 24 }, (_, index) => (
                    <option key={index} value={index}>
                      {pad(index)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Minutos</span>
                <select
                  aria-label="Minutos"
                  value={minute}
                  onChange={(event) => {
                    const nextMinute = Number(event.target.value)
                    setMinute(nextMinute)
                    apply(hour, nextMinute)
                  }}
                >
                  {Array.from({ length: 60 }, (_, index) => (
                    <option key={index} value={index}>
                      {pad(index)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" className="btn btn-soft due-done" onClick={() => setOpen(false)}>
              Listo
            </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
