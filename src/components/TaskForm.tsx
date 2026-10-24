import { useEffect, useRef, useState } from 'react'
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/dates.ts'
import { uid } from '../lib/ids.ts'
import { PRIORITY_OPTIONS, safeUrl, STATUS_OPTIONS, TYPE_OPTIONS } from '../lib/labels.ts'
import { useStore } from '../state/Store.tsx'
import type { ChecklistItem, Priority, Task, TaskStatus, TaskType } from '../types.ts'
import { DueField } from './DueField.tsx'
import { Icon } from './Icon.tsx'

export function TaskForm({
  taskId,
  courseId,
  onClose,
}: {
  taskId?: string
  courseId?: string
  onClose: () => void
}) {
  const { courses, tasks, addTask, updateTask, toast } = useStore()
  const current = tasks.find((task) => task.id === taskId)
  const [title, setTitle] = useState(current?.title ?? '')
  const [selectedCourse, setSelectedCourse] = useState(current?.courseId ?? courseId ?? courses[0]?.id ?? '')
  const [type, setType] = useState<TaskType>(current?.type ?? 'tarea')
  const [priority, setPriority] = useState<Priority>(current?.priority ?? 'media')
  const [status, setStatus] = useState<TaskStatus>(current?.status ?? 'pendiente')
  const [due, setDue] = useState(current ? toDateTimeLocal(current.dueAt) : '')
  const [weight, setWeight] = useState(current?.weight ? String(current.weight) : '')
  const [hours, setHours] = useState(current?.estimateMin ? String(current.estimateMin / 60) : '')
  const [description, setDescription] = useState(current?.description ?? '')
  const [link, setLink] = useState(current?.link ?? '')
  const [steps, setSteps] = useState<ChecklistItem[]>(current?.checklist ?? [])
  const [stepText, setStepText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const stepList = useRef<HTMLUListElement>(null)
  const scrollStep = useRef(false)

  useEffect(() => {
    if (!scrollStep.current) return
    scrollStep.current = false
    const node = stepList.current?.lastElementChild
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' })
  }, [steps])

  function addStep() {
    const text = stepText.trim()
    if (!text) return
    scrollStep.current = true
    setSteps((items) => [...items, { id: uid(), text, done: false }])
    setStepText('')
  }

  async function save() {
    if (saving) return
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = 'Escribe el título del trabajo.'
    if (!selectedCourse) nextErrors.course = 'Elige un curso.'
    if (!due) nextErrors.due = 'Indica la fecha de vencimiento.'
    const weightNumber = weight.trim() === '' ? 0 : Number(weight)
    if (!Number.isFinite(weightNumber) || weightNumber < 0 || weightNumber > 100) {
      nextErrors.weight = 'El peso va de 0 a 100.'
    }
    const hourNumber = hours.trim() === '' ? 0 : Number(hours)
    if (!Number.isFinite(hourNumber) || hourNumber < 0 || hourNumber > 80) {
      nextErrors.hours = 'Usa un estimado entre 0 y 80 horas.'
    }
    const normalizedLink = link.trim()
    if (normalizedLink && !safeUrl(normalizedLink)) nextErrors.link = 'Ese enlace no es válido.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const task: Task = {
      id: current?.id ?? uid(),
      courseId: selectedCourse,
      title: title.trim(),
      description: description.trim(),
      link: normalizedLink ? safeUrl(normalizedLink) ?? '' : '',
      type,
      priority,
      status,
      dueAt: fromDateTimeLocal(due),
      weight: weightNumber,
      estimateMin: Math.round(hourNumber * 60),
      checklist: steps,
      createdAt: current?.createdAt ?? new Date().toISOString(),
      completedAt:
        status === 'entregada' ? current?.completedAt ?? new Date().toISOString() : undefined,
    }
    setSaving(true)
    try {
      if (current) await updateTask(task)
      else await addTask(task)
      toast(current ? 'Trabajo actualizado.' : 'Trabajo registrado.')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo guardar el trabajo.')
      setSaving(false)
    }
  }

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label className="field">
        <span>Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Informe, práctica, examen…"
          maxLength={140}
        />
        {errors.title && <small>{errors.title}</small>}
      </label>

      <div className="form-grid">
        <label className="field">
          <span>Curso</span>
          <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {course.name}
              </option>
            ))}
          </select>
          {errors.course && <small>{errors.course}</small>}
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value as TaskType)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Prioridad</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estado</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Fecha de vencimiento</span>
          <DueField value={due} onChange={setDue} />
          {errors.due && <small>{errors.due}</small>}
        </div>
        <label className="field">
          <span>Peso en la nota (%)</span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="Opcional"
          />
          {errors.weight && <small>{errors.weight}</small>}
        </label>
        <label className="field">
          <span>Tiempo estimado (horas)</span>
          <input
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            placeholder="Opcional"
          />
          {errors.hours && <small>{errors.hours}</small>}
        </label>
        <label className="field">
          <span>Enlace de referencia</span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://"
          />
          {errors.link && <small>{errors.link}</small>}
        </label>
      </div>

      <label className="field">
        <span>Qué hay que hacer</span>
        <textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe el entregable, los criterios y el material que debes usar."
        />
      </label>

      <div className="field">
        <span>Pasos</span>
        {steps.length > 0 && (
          <ul className="step-edit" ref={stepList}>
            {steps.map((step, index) => (
              <li key={step.id}>
                <i>{index + 1}</i>
                <span>{step.text}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Quitar ${step.text}`}
                  onClick={() => setSteps((items) => items.filter((item) => item.id !== step.id))}
                >
                  <Icon name="close" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="step-add">
          <input
            value={stepText}
            onChange={(event) => setStepText(event.target.value)}
            placeholder="Divide el trabajo en pasos concretos"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addStep()
              }
            }}
          />
          <button type="button" className="btn btn-soft" onClick={addStep}>
            <Icon name="plus" size={16} />
            Agregar
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {current ? 'Guardar cambios' : 'Registrar trabajo'}
        </button>
      </div>
    </form>
  )
}
