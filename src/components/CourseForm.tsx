import { useState } from 'react'
import { normalizeHex } from '../lib/color.ts'
import { uid } from '../lib/ids.ts'
import { DAY_OPTIONS } from '../lib/labels.ts'
import { useStore } from '../state/Store.tsx'
import type { Course, Meeting } from '../types.ts'
import { Icon } from './Icon.tsx'

interface BlockDraft {
  id: string
  day: number
  start: string
  end: string
  room: string
  professor: string
}

function blocksFrom(course?: Course): BlockDraft[] {
  if (!course) return []
  return course.meetings.map((meeting) => ({
    id: uid(),
    day: meeting.day,
    start: meeting.start,
    end: meeting.end,
    room: meeting.room || course.room,
    professor: meeting.professor || course.professor,
  }))
}

export function CourseForm({
  courseId,
  onClose,
}: {
  courseId?: string
  onClose: () => void
}) {
  const { courses, addCourse, updateCourse, settings, toast } = useStore()
  const current = courses.find((course) => course.id === courseId)
  const [code, setCode] = useState(current?.code ?? '')
  const [name, setName] = useState(current?.name ?? '')
  const [professor, setProfessor] = useState(current?.professor ?? '')
  const [credits, setCredits] = useState(current?.credits ? String(current.credits) : '')
  const [room, setRoom] = useState(current?.room ?? '')
  const [semester, setSemester] = useState(current?.semester || settings.term)
  const [color, setColor] = useState(current?.color ?? '#4f46e5')
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => blocksFrom(current))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function addBlock() {
    const last = blocks[blocks.length - 1]
    setBlocks((currentBlocks) => [
      ...currentBlocks,
      {
        id: uid(),
        day: last?.day ?? 2,
        start: '08:00',
        end: '09:40',
        room: last?.room || room,
        professor: last?.professor || professor,
      },
    ])
  }

  function updateBlock(id: string, patch: Partial<BlockDraft>) {
    setBlocks((currentBlocks) => currentBlocks.map((block) => (block.id === id ? { ...block, ...patch } : block)))
  }

  async function save() {
    if (saving) return
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Escribe el nombre del curso.'
    if (!code.trim()) nextErrors.code = 'Indica el código.'
    const creditNumber = credits.trim() === '' ? 0 : Number(credits)
    if (!Number.isFinite(creditNumber) || creditNumber < 0 || creditNumber > 12) {
      nextErrors.credits = 'Usa un valor entre 0 y 12.'
    }
    if (!normalizeHex(color)) nextErrors.color = 'Elige un color válido, por ejemplo #4f46e5.'
    if (blocks.some((block) => block.start >= block.end)) {
      nextErrors.time = 'En cada intervalo, la hora de fin debe ser posterior al inicio.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const meetings: Meeting[] = blocks
      .map((block) => ({
        day: block.day,
        start: block.start,
        end: block.end,
        room: block.room.trim() || room.trim(),
        professor: block.professor.trim() || professor.trim(),
      }))
      .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))

    const course: Course = {
      id: current?.id ?? uid(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      professor: professor.trim() || meetings.find((meeting) => meeting.professor)?.professor || '',
      credits: creditNumber,
      room: room.trim() || meetings.find((meeting) => meeting.room)?.room || '',
      color: normalizeHex(color) ?? '#4f46e5',
      semester: semester.trim(),
      meetings,
    }
    setSaving(true)
    try {
      if (current) await updateCourse(course)
      else await addCourse(course)
      toast(current ? 'Curso actualizado.' : 'Curso registrado.')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo guardar el curso.')
      setSaving(false)
    }
  }

  const picker = normalizeHex(color) ?? '#4f46e5'

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="form-grid">
        <label className="field">
          <span>Nombre del curso</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Comunicación" />
          {errors.name && <small>{errors.name}</small>}
        </label>
        <label className="field">
          <span>Código</span>
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="COM" />
          {errors.code && <small>{errors.code}</small>}
        </label>
        <label className="field">
          <span>Docente</span>
          <input
            value={professor}
            onChange={(event) => setProfessor(event.target.value)}
            placeholder="Se usa si el bloque no indica otro"
          />
        </label>
        <label className="field">
          <span>Créditos</span>
          <input
            type="number"
            min={0}
            max={12}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            placeholder="Opcional"
          />
          {errors.credits && <small>{errors.credits}</small>}
        </label>
        <label className="field">
          <span>Aula habitual</span>
          <input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="A-201 (Sede Chiclayo)" />
        </label>
        <label className="field">
          <span>Ciclo</span>
          <input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="2026-II" />
        </label>
      </div>

      <fieldset className="field">
        <legend>Color del curso</legend>
        <div className="color-any">
          <input
            type="color"
            value={picker}
            aria-label="Elegir color"
            onChange={(event) => setColor(event.target.value)}
          />
          <input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            placeholder="#4f46e5"
            spellCheck={false}
          />
        </div>
        {errors.color && <small>{errors.color}</small>}
      </fieldset>

      <div className="field">
        <div className="spread">
          <span>Intervalos de clase</span>
          <button type="button" className="btn btn-soft" onClick={addBlock}>
            <Icon name="plus" size={16} />
            Agregar intervalo
          </button>
        </div>
        <p className="muted fine">
          Un curso puede tener varios tramos el mismo día. El hueco entre un tramo y el siguiente se muestra como pausa.
        </p>
        {errors.time && <small>{errors.time}</small>}
        <div className="block-list">
          {blocks.length === 0 && <p className="muted">Todavía no hay horario. Agrega el primer intervalo.</p>}
          {blocks.map((block, index) => (
            <div className="block-card" key={block.id}>
              <div className="block-grid">
                <label className="field">
                  <span>Día</span>
                  <select value={block.day} onChange={(event) => updateBlock(block.id, { day: Number(event.target.value) })}>
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.id} value={day.id}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Inicio</span>
                  <input type="time" value={block.start} onChange={(event) => updateBlock(block.id, { start: event.target.value })} />
                </label>
                <label className="field">
                  <span>Fin</span>
                  <input type="time" value={block.end} onChange={(event) => updateBlock(block.id, { end: event.target.value })} />
                </label>
                <label className="field">
                  <span>Aula</span>
                  <input
                    value={block.room}
                    placeholder={room || 'Aula de este tramo'}
                    onChange={(event) => updateBlock(block.id, { room: event.target.value })}
                  />
                </label>
                <label className="field block-teacher">
                  <span>Docente de este tramo</span>
                  <input
                    value={block.professor}
                    placeholder={professor || 'Si cambia respecto al curso'}
                    onChange={(event) => updateBlock(block.id, { professor: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Quitar intervalo ${index + 1}`}
                  onClick={() => setBlocks((currentBlocks) => currentBlocks.filter((item) => item.id !== block.id))}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {current ? 'Guardar cambios' : 'Registrar curso'}
        </button>
      </div>
    </form>
  )
}
