import { dueLabel } from '../lib/dates.ts'
import type { AlertKind } from '../lib/alerts.ts'
import { useStore } from '../state/Store.tsx'
import { Empty } from '../components/Empty.tsx'

const GROUPS: { id: AlertKind; title: string; copy: string }[] = [
  { id: 'vencida', title: 'Vencidas', copy: 'La fecha ya pasó y siguen abiertas.' },
  { id: 'hoy', title: 'Vencen hoy', copy: 'Todavía estás a tiempo si actúas ahora.' },
  { id: 'pronto', title: 'Por vencer', copy: 'Entran en la ventana de aviso que configuraste.' },
]

export function Alerts({ onOpen }: { onOpen: (id: string) => void }) {
  const { alerts, courses, settings, seeAlerts, setStatus, toast } = useStore()
  const unseen = new Set(alerts.filter((alert) => !settings.seenAlertIds.includes(alert.id)).map((alert) => alert.id))

  if (alerts.length === 0) {
    return (
      <section className="view">
        <header className="page-head">
          <div>
            <p className="kicker">Avisos</p>
            <h1>Bandeja en calma</h1>
          </div>
        </header>
        <Empty
          title="Estás al día"
          text={`No hay trabajos vencidos ni por vencer en los próximos ${settings.notifyDays} días.`}
        />
      </section>
    )
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">Avisos</p>
          <h1>Lo que necesita atención</h1>
          <p className="lede">
            Lumen marca un aviso cuando un trabajo vence hoy, ya venció o entra en los próximos {settings.notifyDays}{' '}
            días.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            seeAlerts(alerts.map((alert) => alert.id))
            toast('Avisos marcados como leídos.')
          }}
        >
          Marcar leídos
        </button>
      </header>

      {GROUPS.map((group) => {
        const items = alerts.filter((alert) => alert.kind === group.id)
        if (items.length === 0) return null
        return (
          <section key={group.id} className="alert-group">
            <header>
              <h2>{group.title}</h2>
              <p>{group.copy}</p>
            </header>
            <ul>
              {items.map((alert) => {
                const course = courses.find((item) => item.id === alert.task.courseId)
                return (
                  <li key={alert.id} className={unseen.has(alert.id) ? 'alert is-new' : 'alert'}>
                    <i className={`alert-bar alert-${alert.kind}`} />
                    <button
                      type="button"
                      className="alert-main"
                      onClick={() => {
                        seeAlerts([alert.id])
                        onOpen(alert.task.id)
                      }}
                    >
                      <strong>{alert.task.title}</strong>
                      <span>
                        {course?.code} · {dueLabel(alert.task.dueAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-soft"
                      onClick={() => {
                        setStatus(alert.task.id, 'entregada')
                        seeAlerts([alert.id])
                        toast('Marcado como entregado.')
                      }}
                    >
                      Entregada
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
