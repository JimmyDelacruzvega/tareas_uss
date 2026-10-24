import { useRef } from 'react'
import { Icon } from '../components/Icon.tsx'
import { parseBackup } from '../state/storage.ts'
import { useStore } from '../state/Store.tsx'

export function SettingsView() {
  const { settings, courses, tasks, sessions, updateSettings, replaceState, toast } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  async function onNotify(checked: boolean) {
    if (!checked) {
      updateSettings({ browserNotify: false })
      toast('Los avisos del sistema quedaron desactivados.')
      return
    }
    if (typeof Notification === 'undefined') {
      toast('Este navegador no admite notificaciones.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      updateSettings({ browserNotify: false })
      toast('El navegador no concedió el permiso.')
      return
    }
    updateSettings({ browserNotify: true })
    new Notification('Lumen', { body: 'Te avisaremos cuando un trabajo esté por vencer.' })
    toast('Avisos del sistema activados.')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ courses, tasks, sessions, settings }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lumen-tareas.json'
    link.click()
    URL.revokeObjectURL(url)
    toast('Copia descargada.')
  }

  async function importData(file: File) {
    try {
      const parsed = parseBackup(JSON.parse(await file.text()))
      if (!parsed) {
        toast('El archivo no tiene el formato de Lumen.')
        return
      }
      await replaceState(parsed)
      toast('Datos importados.')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    }
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="kicker">Ajustes</p>
          <h1>Tu espacio</h1>
          <p className="lede">Los cursos, trabajos y sesiones se guardan en MySQL. El perfil y el tema siguen en este navegador.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card form">
          <h2>Perfil</h2>
          <label className="field">
            <span>Nombre</span>
            <input
              value={settings.studentName}
              onChange={(event) => updateSettings({ studentName: event.target.value })}
              placeholder="Cómo quieres que te salude Lumen"
            />
          </label>
          <label className="field">
            <span>Carrera</span>
            <input value={settings.career} onChange={(event) => updateSettings({ career: event.target.value })} />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Campus o universidad</span>
              <input value={settings.campus} onChange={(event) => updateSettings({ campus: event.target.value })} />
            </label>
            <label className="field">
              <span>Ciclo</span>
              <input value={settings.term} onChange={(event) => updateSettings({ term: event.target.value })} />
            </label>
          </div>
        </section>

        <section className="card form">
          <h2>Avisos y apariencia</h2>
          <label className="field">
            <span>Avisar con anticipación</span>
            <select
              value={settings.notifyDays}
              onChange={(event) => updateSettings({ notifyDays: Number(event.target.value) })}
            >
              {[1, 2, 3, 5, 7].map((day) => (
                <option key={day} value={day}>
                  {day} día{day === 1 ? '' : 's'} antes
                </option>
              ))}
            </select>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.browserNotify}
              onChange={(event) => void onNotify(event.target.checked)}
            />
            <span>
              <strong>Notificaciones del navegador</strong>
              <small>Los avisos dentro de Lumen siempre están visibles. Esto los muestra también en el sistema.</small>
            </span>
          </label>
          <div className="seg seg-fit" role="group" aria-label="Tema">
            <button
              type="button"
              className={settings.theme === 'light' ? 'on' : ''}
              onClick={() => updateSettings({ theme: 'light' })}
            >
              <Icon name="sun" size={15} /> Claro
            </button>
            <button
              type="button"
              className={settings.theme === 'dark' ? 'on' : ''}
              onClick={() => updateSettings({ theme: 'dark' })}
            >
              <Icon name="moon" size={15} /> Oscuro
            </button>
          </div>
        </section>

        <section className="card form">
          <h2>Respaldo</h2>
          <p className="muted">Exporta un archivo JSON o recupera una copia anterior.</p>
          <div className="form-actions left">
            <button type="button" className="btn btn-soft" onClick={exportData}>
              <Icon name="download" size={16} />
              Exportar
            </button>
            <button type="button" className="btn btn-soft" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} />
              Importar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importData(file)
                event.target.value = ''
              }}
            />
          </div>
        </section>
      </div>
    </section>
  )
}
