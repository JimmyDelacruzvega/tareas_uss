import { useState } from 'react'
import { DAY_SHORT, scheduleLabel } from '../lib/labels.ts'
import { useStore } from '../state/Store.tsx'
import { Empty } from '../components/Empty.tsx'
import { Icon } from '../components/Icon.tsx'

export function Courses({
  onNew,
  onEdit,
  onShowTasks,
}: {
  onNew: () => void
  onEdit: (id: string) => void
  onShowTasks: (id: string) => void
}) {
  const { courses, tasks, deleteCourse, toast } = useStore()
  const [pendingId, setPendingId] = useState<string | null>(null)

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">Cursos</p>
          <h1>Tu carga académica</h1>
          <p className="lede">Cada curso agrupa horario, aula y los trabajos que dependen de él.</p>
        </div>
        <button type="button" className="btn" onClick={onNew}>
          <Icon name="plus" size={16} />
          Nuevo curso
        </button>
      </header>

      {courses.length === 0 ? (
        <Empty title="Sin cursos" text="Registra el primero para poder asociar tareas, exámenes y proyectos.">
          <button type="button" className="btn" onClick={onNew}>
            Registrar curso
          </button>
        </Empty>
      ) : (
        <div className="course-grid">
          {courses.map((course, index) => {
            const related = tasks.filter((task) => task.courseId === course.id)
            const open = related.filter((task) => task.status !== 'entregada').length
            const weight = related.reduce((sum, task) => sum + (task.weight || 0), 0)
            const teachers = [...new Set(course.meetings.map((meeting) => meeting.professor).filter(Boolean))]
            const blocks = [...course.meetings].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
            return (
              <article key={course.id} className="course-card rise" style={{ animationDelay: `${index * 45}ms` }}>
                <div className="course-accent" style={{ background: course.color }} />
                <div className="course-body">
                  <header>
                    <p className="kicker">{course.code}</p>
                    <h2>{course.name}</h2>
                    <p className="muted">{teachers.join(' · ') || course.professor || 'Docente por registrar'}</p>
                  </header>
                  <ul className="course-facts">
                    {blocks.length === 0 ? (
                      <li>{scheduleLabel(course.meetings)}</li>
                    ) : (
                      blocks.map((meeting) => (
                        <li key={`${meeting.day}-${meeting.start}-${meeting.end}`}>
                          {DAY_SHORT[meeting.day]} {meeting.start}–{meeting.end}
                          {(meeting.room || course.room) ? ` · ${meeting.room || course.room}` : ''}
                        </li>
                      ))
                    )}
                    <li>
                      {course.credits > 0
                        ? `${course.credits} crédito${course.credits === 1 ? '' : 's'} · `
                        : ''}
                      {course.semester || 'Ciclo'}
                    </li>
                  </ul>
                  <p className="course-count">
                    {open} pendiente{open === 1 ? '' : 's'}
                    {weight > 0 ? ` · ${weight}% de peso registrado` : ''}
                    {weight > 100 ? ' · supera 100%' : ''}
                  </p>
                  <footer>
                    <button type="button" className="btn btn-soft" onClick={() => onShowTasks(course.id)}>
                      Ver trabajos
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Editar ${course.name}`} onClick={() => onEdit(course.id)}>
                      <Icon name="edit" size={16} />
                    </button>
                    {pendingId === course.id ? (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          void deleteCourse(course.id).then(
                            () => {
                              toast('Curso eliminado, junto con sus trabajos.')
                              setPendingId(null)
                            },
                            (error: unknown) => {
                              toast(error instanceof Error ? error.message : 'No se pudo eliminar el curso.')
                            },
                          )
                        }}
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Eliminar ${course.name}`}
                        onClick={() => setPendingId(course.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </footer>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
