import { useEffect, useRef, useState } from 'react'
import { CourseForm } from './CourseForm.tsx'
import { Icon, type IconName } from './Icon.tsx'
import { Modal } from './Modal.tsx'
import { TaskDrawer } from './TaskDrawer.tsx'
import { TaskForm } from './TaskForm.tsx'
import { Alerts } from '../views/Alerts.tsx'
import { CalendarView } from '../views/CalendarView.tsx'
import { Courses } from '../views/Courses.tsx'
import { Dashboard } from '../views/Dashboard.tsx'
import { Focus } from '../views/Focus.tsx'
import { SettingsView } from '../views/SettingsView.tsx'
import { Tasks } from '../views/Tasks.tsx'
import type { Scope } from '../lib/tasks.ts'
import { dueLabel } from '../lib/dates.ts'
import { useStore } from '../state/Store.tsx'

const VIEWS = ['inicio', 'cursos', 'tareas', 'calendario', 'avisos', 'enfoque', 'ajustes'] as const
type ViewId = (typeof VIEWS)[number]

const NAV: { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'cursos', label: 'Cursos', icon: 'book' },
  { id: 'tareas', label: 'Tareas', icon: 'tasks' },
  { id: 'calendario', label: 'Calendario', icon: 'calendar' },
  { id: 'avisos', label: 'Avisos', icon: 'bell' },
  { id: 'enfoque', label: 'Enfoque', icon: 'timer' },
]

function readView(): ViewId {
  const value = location.hash.replace('#/', '')
  return VIEWS.includes(value as ViewId) ? (value as ViewId) : 'inicio'
}

export function Shell() {
  const { courses, settings, alerts, unseenCount, seeAlerts, toast } = useStore()
  const [view, setView] = useState<ViewId>(readView)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('activas')
  const [courseFilter, setCourseFilter] = useState('')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>()
  const [calendarDay, setCalendarDay] = useState(() => new Date())
  const [bellOpen, setBellOpen] = useState(false)
  const [taskDraft, setTaskDraft] = useState<{ taskId?: string; courseId?: string } | null>(null)
  const [courseDraft, setCourseDraft] = useState<{ courseId?: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  function go(next: ViewId) {
    location.hash = `#/${next}`
    setMenuOpen(false)
    setBellOpen(false)
  }

  useEffect(() => {
    if (!location.hash) history.replaceState(null, '', '#/inicio')
    const onHash = () => setView(readView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const titles: Record<ViewId, string> = {
      inicio: 'Inicio',
      cursos: 'Cursos',
      tareas: 'Tareas',
      calendario: 'Calendario',
      avisos: 'Avisos',
      enfoque: 'Enfoque',
      ajustes: 'Ajustes',
    }
    document.title = `${titles[view]} · Lumen`
  }, [view])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        requestTask()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!bellOpen) return
    const close = (event: MouseEvent) => {
      if (!bellRef.current?.contains(event.target as Node)) setBellOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [bellOpen])

  function requestTask(courseId?: string) {
    if (courses.length === 0) {
      setCourseDraft({})
      toast('Primero registra un curso.')
      return
    }
    setOpenTaskId(null)
    setTaskDraft({ courseId })
  }

  function openTask(id: string) {
    setOpenTaskId(id)
  }

  const hasOverdue = alerts.some((alert) => alert.kind === 'vencida' && !settings.seenAlertIds.includes(alert.id))
  const initial = (settings.studentName.trim() || 'U').slice(0, 1).toUpperCase()

  return (
    <div className="app">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      {menuOpen && <button type="button" className="scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>
            <strong>Lumen</strong>
            <small>
              {settings.term} · {settings.campus}
            </small>
          </span>
        </div>
        <nav aria-label="Módulos">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav-btn active' : 'nav-btn'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.id === 'avisos' && unseenCount > 0 && <span className="nav-badge">{unseenCount}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button
            type="button"
            className={view === 'ajustes' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => go('ajustes')}
          >
            <Icon name="settings" />
            Ajustes
          </button>
          <p>{settings.career}</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" />
          </button>
          <label className="search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={query}
              aria-label="Buscar trabajos"
              placeholder="Buscar trabajos"
              onChange={(event) => {
                setQuery(event.target.value)
                if (event.target.value) go('tareas')
              }}
            />
            <kbd>/</kbd>
          </label>
          <div className="top-actions">
          <button type="button" className="icon-btn" aria-label="Ir a enfoque" onClick={() => go('enfoque')}>
            <Icon name="timer" />
          </button>
          <div className="bell-wrap" ref={bellRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label={unseenCount ? `${unseenCount} avisos sin leer` : 'Avisos'}
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((open) => !open)}
            >
              <Icon name="bell" />
              {unseenCount > 0 && <i className={hasOverdue ? 'badge live' : 'badge'}>{unseenCount}</i>}
            </button>
            {bellOpen && (
              <div className="popover" role="dialog" aria-label="Avisos recientes">
                <header>
                  <strong>Avisos</strong>
                  <button type="button" className="text-btn" onClick={() => seeAlerts(alerts.map((alert) => alert.id))}>
                    Leer
                  </button>
                </header>
                {alerts.length === 0 ? (
                  <p className="muted">Nada por vencer en este momento.</p>
                ) : (
                  <ul>
                    {alerts.slice(0, 4).map((alert) => (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => {
                            seeAlerts([alert.id])
                            setBellOpen(false)
                            openTask(alert.task.id)
                          }}
                        >
                          <strong>{alert.task.title}</strong>
                          <span>{dueLabel(alert.task.dueAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setBellOpen(false)
                    go('avisos')
                  }}
                >
                  Ver bandeja
                </button>
              </div>
            )}
          </div>
          <button type="button" className="avatar" aria-label="Abrir ajustes" onClick={() => go('ajustes')}>
            {initial}
          </button>
          </div>
        </header>

        <div className="content" id="contenido">
          {view === 'inicio' && (
            <Dashboard
              onJump={(next) => {
                setScope(next)
                go('tareas')
              }}
              onOpenTask={openTask}
              onNewTask={() => requestTask()}
              onNewCourse={() => setCourseDraft({})}
              onFocus={(id) => {
                setFocusTaskId(id)
                go('enfoque')
              }}
              onCalendarDay={(date) => {
                setCalendarDay(date)
                go('calendario')
              }}
            />
          )}
          {view === 'cursos' && (
            <Courses
              onNew={() => setCourseDraft({})}
              onEdit={(id) => setCourseDraft({ courseId: id })}
              onShowTasks={(id) => {
                setCourseFilter(id)
                setScope('todas')
                go('tareas')
              }}
            />
          )}
          {view === 'tareas' && (
            <Tasks
              scope={scope}
              onScope={setScope}
              query={query}
              courseFilter={courseFilter}
              onCourseFilter={setCourseFilter}
              onOpen={openTask}
              onNew={() => requestTask(courseFilter || undefined)}
            />
          )}
          {view === 'calendario' && (
            <CalendarView selected={calendarDay} onSelect={setCalendarDay} onOpen={openTask} />
          )}
          {view === 'avisos' && <Alerts onOpen={openTask} />}
          {view === 'enfoque' && <Focus preferredTaskId={focusTaskId} />}
          {view === 'ajustes' && <SettingsView />}
        </div>
      </div>

      <nav className="dock" aria-label="Navegación móvil">
        {NAV.filter((item) => item.id !== 'enfoque').map((item) => (
          <button key={item.id} type="button" className={view === item.id ? 'on' : ''} onClick={() => go(item.id)}>
            <Icon name={item.icon} size={18} />
            <span>{item.id === 'calendario' ? 'Agenda' : item.label}</span>
            {item.id === 'avisos' && unseenCount > 0 && <i>{unseenCount}</i>}
          </button>
        ))}
      </nav>

      {openTaskId && (
        <TaskDrawer
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onEdit={() => {
            setTaskDraft({ taskId: openTaskId })
            setOpenTaskId(null)
          }}
          onFocus={() => {
            setFocusTaskId(openTaskId)
            setOpenTaskId(null)
            go('enfoque')
          }}
        />
      )}
      {taskDraft && (
        <Modal title={taskDraft.taskId ? 'Editar trabajo' : 'Nuevo trabajo'} onClose={() => setTaskDraft(null)} wide>
          <TaskForm taskId={taskDraft.taskId} courseId={taskDraft.courseId} onClose={() => setTaskDraft(null)} />
        </Modal>
      )}
      {courseDraft && (
        <Modal title={courseDraft.courseId ? 'Editar curso' : 'Nuevo curso'} onClose={() => setCourseDraft(null)} wide>
          <CourseForm courseId={courseDraft.courseId} onClose={() => setCourseDraft(null)} />
        </Modal>
      )}
    </div>
  )
}
