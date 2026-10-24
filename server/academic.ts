import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { execute, getPool, query, type Sql } from './db.ts'
import type { DbEnv } from './env.ts'
import { HttpError } from './errors.ts'

const TYPES = new Set(['tarea', 'practica', 'ensayo', 'proyecto', 'examen', 'quiz', 'lectura', 'exposicion'])
const PRIORITIES = new Set(['alta', 'media', 'baja'])
const STATUSES = new Set(['pendiente', 'progreso', 'revision', 'entregada'])

interface Meeting {
  day: number
  start: string
  end: string
  room: string
  professor: string
}

interface Course {
  id: string
  code: string
  name: string
  professor: string
  credits: number
  room: string
  color: string
  semester: string
  meetings: Meeting[]
}

interface Step {
  id: string
  text: string
  done: boolean
}

interface Task {
  id: string
  courseId: string
  title: string
  description: string
  link: string
  type: string
  priority: string
  status: string
  dueAt: string
  weight: number
  estimateMin: number
  checklist: Step[]
  createdAt: string
  completedAt?: string
}

interface Session {
  id: string
  minutes: number
  taskId: string | null
  at: string
}

export interface Academic {
  courses: Course[]
  tasks: Task[]
  sessions: Session[]
}

interface IdRow extends RowDataPacket {
  id: number
}

interface CountRow extends RowDataPacket {
  total: number
}

interface CicloRow extends RowDataPacket {
  id: number
  codigo: string
}

interface CursoRow extends RowDataPacket {
  id: number
  ciclo_id: number
  codigo: string
  nombre: string
  creditos: number
  color: string
}

interface HorarioRow extends RowDataPacket {
  curso_id: number
  dia: number
  hora_inicio: unknown
  hora_fin: unknown
  aula: string
  docente: string
}

interface TrabajoRow extends RowDataPacket {
  id: number
  curso_id: number
  titulo: string
  descripcion: string
  enlace: string
  tipo: string
  prioridad: string
  estado: string
  vence_en: unknown
  peso: number
  minutos_estimados: number
  creado_en: unknown
  entregado_en: unknown
}

interface PasoRow extends RowDataPacket {
  id: number
  trabajo_id: number
  texto: string
  hecho: number
}

interface EnfoqueRow extends RowDataPacket {
  id: number
  trabajo_id: number | null
  minutos: number
  en: unknown
}

interface CursoIdRow extends RowDataPacket {
  ciclo_id: number
}

interface EntregaRow extends RowDataPacket {
  entregado_en: unknown
  estado: string
}

function text(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function clock(value: unknown) {
  if (value instanceof Date) {
    const pad = (part: number) => String(part).padStart(2, '0')
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`
  }
  const match = String(value ?? '').match(/^(\d{2}):(\d{2})/)
  if (!match) return ''
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return ''
  return `${match[1]}:${match[2]}`
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Hay una fecha que no se puede leer.')
  return date.toISOString()
}

function asDate(value: unknown, label: string) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) throw new HttpError(400, label)
  return date
}

function numericId(value: unknown) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function record(value: unknown) {
  if (!value || typeof value !== 'object') throw new HttpError(400, 'El dato enviado no tiene el formato de Lumen.')
  return value as Record<string, unknown>
}

function colorOf(value: unknown) {
  const color = text(value, 7)
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toLowerCase() : '#4f46e5'
}

function meetingsOf(value: unknown, room: string, professor: string) {
  if (!Array.isArray(value)) return []
  const meetings: Meeting[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const meeting = item as Record<string, unknown>
    const day = Number(meeting.day)
    const start = clock(meeting.start)
    const end = clock(meeting.end)
    if (!Number.isInteger(day) || day < 0 || day > 6 || !start || !end) continue
    if (start >= end) throw new HttpError(400, 'En cada intervalo, la hora de fin debe ser posterior al inicio.')
    meetings.push({
      day,
      start,
      end,
      room: text(meeting.room, 120) || room,
      professor: text(meeting.professor, 160) || professor,
    })
  }
  return meetings.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
}

function stepsOf(value: unknown) {
  if (!Array.isArray(value)) return []
  const steps: { text: string; done: boolean }[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const step = item as Record<string, unknown>
    const label = text(step.text, 300)
    if (!label) continue
    steps.push({ text: label, done: Boolean(step.done) })
  }
  return steps
}

function courseInput(value: unknown) {
  const course = record(value)
  const code = text(course.code, 20).toUpperCase()
  const name = text(course.name, 160)
  if (!code) throw new HttpError(400, 'Indica el código del curso.')
  if (!name) throw new HttpError(400, 'Escribe el nombre del curso.')
  const credits = Number(course.credits ?? 0)
  if (!Number.isFinite(credits) || credits < 0 || credits > 12) {
    throw new HttpError(400, 'Los créditos van de 0 a 12.')
  }
  const professor = text(course.professor, 160)
  const room = text(course.room, 120)
  return {
    code,
    name,
    credits,
    color: colorOf(course.color),
    semester: text(course.semester, 20) || 'Sin ciclo',
    meetings: meetingsOf(course.meetings, room, professor),
  }
}

function taskInput(value: unknown) {
  const task = record(value)
  const courseId = numericId(task.courseId)
  if (!courseId) throw new HttpError(400, 'Elige un curso para el trabajo.')
  const title = text(task.title, 140)
  if (!title) throw new HttpError(400, 'Escribe el título del trabajo.')
  const type = TYPES.has(String(task.type)) ? String(task.type) : 'tarea'
  const priority = PRIORITIES.has(String(task.priority)) ? String(task.priority) : 'media'
  const status = STATUSES.has(String(task.status)) ? String(task.status) : 'pendiente'
  const weight = Number(task.weight ?? 0)
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) throw new HttpError(400, 'El peso va de 0 a 100.')
  const estimateMin = Math.round(Number(task.estimateMin ?? 0))
  if (!Number.isFinite(estimateMin) || estimateMin < 0 || estimateMin > 4800) {
    throw new HttpError(400, 'Usa un estimado entre 0 y 80 horas.')
  }
  return {
    courseId,
    title,
    description: String(task.description ?? ''),
    link: text(task.link, 500),
    type,
    priority,
    status,
    dueAt: asDate(task.dueAt, 'Indica la fecha de vencimiento.'),
    weight,
    estimateMin,
    createdAt: asDate(task.createdAt ?? new Date().toISOString(), 'La fecha de registro no es válida.'),
    completedAt: status === 'entregada' ? asDate(task.completedAt ?? new Date().toISOString(), 'La fecha de entrega no es válida.') : null,
    steps: stepsOf(task.checklist),
  }
}

function snapshotOf(value: unknown): Academic {
  const data = record(value)
  return {
    courses: Array.isArray(data.courses) ? data.courses : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  }
}

export async function readAcademic(sql: Sql): Promise<Academic> {
  const ciclos = await query<CicloRow>(sql, 'SELECT id, codigo FROM ciclo')
  const cicloName = new Map(ciclos.map((row) => [row.id, row.codigo]))
  const cursos = await query<CursoRow>(sql, 'SELECT id, ciclo_id, codigo, nombre, creditos, color FROM curso ORDER BY id')
  const horarios = await query<HorarioRow>(
    sql,
    'SELECT curso_id, dia, hora_inicio, hora_fin, aula, docente FROM horario ORDER BY dia, hora_inicio, id',
  )
  const trabajos = await query<TrabajoRow>(
    sql,
    `SELECT id, curso_id, titulo, descripcion, enlace, tipo, prioridad, estado, vence_en, peso,
            minutos_estimados, creado_en, entregado_en
     FROM trabajo ORDER BY creado_en DESC, id DESC`,
  )
  const pasos = await query<PasoRow>(sql, 'SELECT id, trabajo_id, texto, hecho FROM paso ORDER BY orden, id')
  const enfoques = await query<EnfoqueRow>(sql, 'SELECT id, trabajo_id, minutos, en FROM enfoque ORDER BY en DESC, id DESC')

  const meetings = new Map<number, Meeting[]>()
  for (const row of horarios) {
    const list = meetings.get(row.curso_id) ?? []
    list.push({
      day: Number(row.dia),
      start: clock(row.hora_inicio),
      end: clock(row.hora_fin),
      room: row.aula ?? '',
      professor: row.docente ?? '',
    })
    meetings.set(row.curso_id, list)
  }

  const steps = new Map<number, Step[]>()
  for (const row of pasos) {
    const list = steps.get(row.trabajo_id) ?? []
    list.push({ id: String(row.id), text: row.texto, done: Number(row.hecho) === 1 })
    steps.set(row.trabajo_id, list)
  }

  return {
    courses: cursos.map((row) => {
      const blocks = meetings.get(row.id) ?? []
      return {
        id: String(row.id),
        code: row.codigo,
        name: row.nombre,
        professor: blocks.find((block) => block.professor)?.professor ?? '',
        credits: Number(row.creditos) || 0,
        room: blocks.find((block) => block.room)?.room ?? '',
        color: row.color || '#4f46e5',
        semester: cicloName.get(row.ciclo_id) ?? '',
        meetings: blocks,
      }
    }),
    tasks: trabajos.map((row) => {
      const status = STATUSES.has(row.estado) ? row.estado : 'pendiente'
      const task: Task = {
        id: String(row.id),
        courseId: String(row.curso_id),
        title: row.titulo,
        description: row.descripcion ?? '',
        link: row.enlace ?? '',
        type: TYPES.has(row.tipo) ? row.tipo : 'tarea',
        priority: PRIORITIES.has(row.prioridad) ? row.prioridad : 'media',
        status,
        dueAt: iso(row.vence_en),
        weight: Number(row.peso) || 0,
        estimateMin: Number(row.minutos_estimados) || 0,
        checklist: steps.get(row.id) ?? [],
        createdAt: iso(row.creado_en),
      }
      if (status === 'entregada' && row.entregado_en) task.completedAt = iso(row.entregado_en)
      return task
    }),
    sessions: enfoques.map((row) => ({
      id: String(row.id),
      minutes: Number(row.minutos) || 0,
      taskId: row.trabajo_id == null ? null : String(row.trabajo_id),
      at: iso(row.en),
    })),
  }
}

async function ensureCiclo(conn: PoolConnection, codigo: string) {
  const found = await query<IdRow>(conn, 'SELECT id FROM ciclo WHERE codigo = ? LIMIT 1', [codigo])
  if (found[0]) return found[0].id
  try {
    const header = await execute(conn, 'INSERT INTO ciclo (codigo) VALUES (?)', [codigo])
    return header.insertId
  } catch (error) {
    const again = await query<IdRow>(conn, 'SELECT id FROM ciclo WHERE codigo = ? LIMIT 1', [codigo])
    if (again[0]) return again[0].id
    throw error
  }
}

async function writeMeetings(conn: PoolConnection, cursoId: number, meetings: Meeting[]) {
  await execute(conn, 'DELETE FROM horario WHERE curso_id = ?', [cursoId])
  for (const meeting of meetings) {
    await execute(
      conn,
      'INSERT INTO horario (curso_id, dia, hora_inicio, hora_fin, aula, docente) VALUES (?, ?, ?, ?, ?, ?)',
      [cursoId, meeting.day, `${meeting.start}:00`, `${meeting.end}:00`, meeting.room, meeting.professor],
    )
  }
}

async function writeSteps(conn: PoolConnection, trabajoId: number, steps: { text: string; done: boolean }[]) {
  await execute(conn, 'DELETE FROM paso WHERE trabajo_id = ?', [trabajoId])
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    if (!step) continue
    await execute(conn, 'INSERT INTO paso (trabajo_id, orden, texto, hecho) VALUES (?, ?, ?, ?)', [
      trabajoId,
      index + 1,
      step.text,
      step.done ? 1 : 0,
    ])
  }
}

async function dropEmptyCiclo(conn: PoolConnection, cicloId: number) {
  await execute(
    conn,
    `DELETE ciclo FROM ciclo
     LEFT JOIN curso ON curso.ciclo_id = ciclo.id
     WHERE ciclo.id = ? AND curso.id IS NULL`,
    [cicloId],
  )
}

async function insertSnapshot(conn: PoolConnection, data: Academic) {
  const courseIds = new Map<string, number>()
  for (const item of data.courses) {
    const course = courseInput(item)
    const cicloId = await ensureCiclo(conn, course.semester)
    const header = await execute(
      conn,
      'INSERT INTO curso (ciclo_id, codigo, nombre, creditos, color) VALUES (?, ?, ?, ?, ?)',
      [cicloId, course.code, course.name, course.credits, course.color],
    )
    await writeMeetings(conn, header.insertId, course.meetings)
    courseIds.set(String((item as { id?: unknown }).id ?? header.insertId), header.insertId)
  }

  const taskIds = new Map<string, number>()
  for (const item of data.tasks) {
    const raw = record(item)
    const previousCourse = String(raw.courseId ?? '')
    const courseId = courseIds.get(previousCourse) ?? numericId(previousCourse)
    if (!courseId) continue
    const task = taskInput({ ...raw, courseId: String(courseId) })
    const header = await execute(
      conn,
      `INSERT INTO trabajo
        (curso_id, titulo, descripcion, enlace, tipo, prioridad, estado, vence_en, peso, minutos_estimados, creado_en, entregado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.courseId,
        task.title,
        task.description,
        task.link,
        task.type,
        task.priority,
        task.status,
        task.dueAt,
        task.weight,
        task.estimateMin,
        task.createdAt,
        task.completedAt,
      ],
    )
    await writeSteps(conn, header.insertId, task.steps)
    taskIds.set(String(raw.id ?? header.insertId), header.insertId)
  }

  for (const session of data.sessions) {
    if (!session || typeof session !== 'object') continue
    const minutes = Math.round(Number(session.minutes))
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 600) continue
    const previousTask = session.taskId == null ? '' : String(session.taskId)
    const taskId = previousTask ? taskIds.get(previousTask) ?? numericId(previousTask) : null
    await execute(conn, 'INSERT INTO enfoque (trabajo_id, minutos, en) VALUES (?, ?, ?)', [
      taskId,
      minutes,
      asDate(session.at ?? new Date().toISOString(), 'La fecha de la sesión no es válida.'),
    ])
  }
}

async function transaction<T>(env: DbEnv, work: (conn: PoolConnection) => Promise<T>) {
  const conn = await getPool(env).getConnection()
  let started = false
  try {
    await conn.beginTransaction()
    started = true
    const result = await work(conn)
    await conn.commit()
    return result
  } catch (error) {
    if (started) await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function locked<T>(env: DbEnv, work: (conn: PoolConnection) => Promise<T>) {
  const conn = await getPool(env).getConnection()
  let held = false
  let started = false
  try {
    const rows = await query<RowDataPacket>(conn, "SELECT GET_LOCK('lumen_adopt', 15) AS locked")
    held = Number(rows[0]?.locked) === 1
    if (!held) throw new HttpError(503, 'La base de datos está ocupada. Inténtalo de nuevo.')
    await conn.beginTransaction()
    started = true
    const result = await work(conn)
    await conn.commit()
    return result
  } catch (error) {
    if (started) await conn.rollback()
    throw error
  } finally {
    if (held) await query(conn, "SELECT RELEASE_LOCK('lumen_adopt')")
    conn.release()
  }
}

export function readState(env: DbEnv) {
  return readAcademic(getPool(env))
}

export function adoptState(env: DbEnv, payload: unknown) {
  const snapshot = snapshotOf(payload)
  return locked(env, async (conn) => {
    const count = await query<CountRow>(
      conn,
      'SELECT (SELECT COUNT(*) FROM curso) + (SELECT COUNT(*) FROM trabajo) + (SELECT COUNT(*) FROM enfoque) AS total',
    )
    if (Number(count[0]?.total) > 0) return readAcademic(conn)
    await insertSnapshot(conn, snapshot)
    return readAcademic(conn)
  })
}

export function replaceState(env: DbEnv, payload: unknown) {
  const snapshot = snapshotOf(payload)
  return transaction(env, async (conn) => {
    await execute(conn, 'DELETE FROM enfoque')
    await execute(conn, 'DELETE FROM curso')
    await execute(conn, 'DELETE FROM ciclo')
    await insertSnapshot(conn, snapshot)
    return readAcademic(conn)
  })
}

export function createCourse(env: DbEnv, payload: unknown) {
  const course = courseInput(payload)
  return transaction(env, async (conn) => {
    const cicloId = await ensureCiclo(conn, course.semester)
    const header = await execute(
      conn,
      'INSERT INTO curso (ciclo_id, codigo, nombre, creditos, color) VALUES (?, ?, ?, ?, ?)',
      [cicloId, course.code, course.name, course.credits, course.color],
    )
    await writeMeetings(conn, header.insertId, course.meetings)
    return readAcademic(conn)
  })
}

export function updateCourse(env: DbEnv, id: number, payload: unknown) {
  const course = courseInput(payload)
  return transaction(env, async (conn) => {
    const current = await query<CursoIdRow>(conn, 'SELECT ciclo_id FROM curso WHERE id = ?', [id])
    if (!current[0]) throw new HttpError(404, 'Ese curso ya no está en la base.')
    const cicloId = await ensureCiclo(conn, course.semester)
    await execute(conn, 'UPDATE curso SET ciclo_id = ?, codigo = ?, nombre = ?, creditos = ?, color = ? WHERE id = ?', [
      cicloId,
      course.code,
      course.name,
      course.credits,
      course.color,
      id,
    ])
    await writeMeetings(conn, id, course.meetings)
    if (current[0].ciclo_id !== cicloId) await dropEmptyCiclo(conn, current[0].ciclo_id)
    return readAcademic(conn)
  })
}

export function deleteCourse(env: DbEnv, id: number) {
  return transaction(env, async (conn) => {
    const current = await query<CursoIdRow>(conn, 'SELECT ciclo_id FROM curso WHERE id = ?', [id])
    if (!current[0]) throw new HttpError(404, 'Ese curso ya no está en la base.')
    await execute(conn, 'DELETE FROM curso WHERE id = ?', [id])
    await dropEmptyCiclo(conn, current[0].ciclo_id)
    return readAcademic(conn)
  })
}

export function createTask(env: DbEnv, payload: unknown) {
  const task = taskInput(payload)
  return transaction(env, async (conn) => {
    const header = await execute(
      conn,
      `INSERT INTO trabajo
        (curso_id, titulo, descripcion, enlace, tipo, prioridad, estado, vence_en, peso, minutos_estimados, creado_en, entregado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.courseId,
        task.title,
        task.description,
        task.link,
        task.type,
        task.priority,
        task.status,
        task.dueAt,
        task.weight,
        task.estimateMin,
        task.createdAt,
        task.completedAt,
      ],
    )
    await writeSteps(conn, header.insertId, task.steps)
    return readAcademic(conn)
  })
}

export function updateTask(env: DbEnv, id: number, payload: unknown) {
  const task = taskInput(payload)
  return transaction(env, async (conn) => {
    const header = await execute(
      conn,
      `UPDATE trabajo
       SET curso_id = ?, titulo = ?, descripcion = ?, enlace = ?, tipo = ?, prioridad = ?, estado = ?,
           vence_en = ?, peso = ?, minutos_estimados = ?, entregado_en = ?
       WHERE id = ?`,
      [
        task.courseId,
        task.title,
        task.description,
        task.link,
        task.type,
        task.priority,
        task.status,
        task.dueAt,
        task.weight,
        task.estimateMin,
        task.completedAt,
        id,
      ],
    )
    if (header.affectedRows === 0) throw new HttpError(404, 'Ese trabajo ya no está en la base.')
    await writeSteps(conn, id, task.steps)
    return readAcademic(conn)
  })
}

export function deleteTask(env: DbEnv, id: number) {
  return transaction(env, async (conn) => {
    const header = await execute(conn, 'DELETE FROM trabajo WHERE id = ?', [id])
    if (header.affectedRows === 0) throw new HttpError(404, 'Ese trabajo ya no está en la base.')
    return readAcademic(conn)
  })
}

export function setTaskStatus(env: DbEnv, id: number, payload: unknown) {
  const body = record(payload)
  const status = String(body.status ?? '')
  if (!STATUSES.has(status)) throw new HttpError(400, 'Ese estado no es válido.')
  return transaction(env, async (conn) => {
    const current = await query<EntregaRow>(conn, 'SELECT estado, entregado_en FROM trabajo WHERE id = ?', [id])
    if (!current[0]) throw new HttpError(404, 'Ese trabajo ya no está en la base.')
    const completed =
      status === 'entregada' ? (current[0].estado === 'entregada' && current[0].entregado_en ? current[0].entregado_en : new Date()) : null
    await execute(conn, 'UPDATE trabajo SET estado = ?, entregado_en = ? WHERE id = ?', [status, completed, id])
    return readAcademic(conn)
  })
}

export function addStep(env: DbEnv, taskId: number, payload: unknown) {
  const body = record(payload)
  const label = text(body.text, 300)
  if (!label) throw new HttpError(400, 'Escribe el paso antes de agregarlo.')
  return transaction(env, async (conn) => {
    const task = await query<IdRow>(conn, 'SELECT id FROM trabajo WHERE id = ?', [taskId])
    if (!task[0]) throw new HttpError(404, 'Ese trabajo ya no está en la base.')
    const order = await query<CountRow>(conn, 'SELECT COALESCE(MAX(orden), 0) + 1 AS total FROM paso WHERE trabajo_id = ?', [taskId])
    await execute(conn, 'INSERT INTO paso (trabajo_id, orden, texto, hecho) VALUES (?, ?, ?, 0)', [
      taskId,
      Number(order[0]?.total) || 1,
      label,
    ])
    return readAcademic(conn)
  })
}

export function toggleStep(env: DbEnv, id: number) {
  return transaction(env, async (conn) => {
    const header = await execute(conn, 'UPDATE paso SET hecho = IF(hecho = 1, 0, 1) WHERE id = ?', [id])
    if (header.affectedRows === 0) throw new HttpError(404, 'Ese paso ya no está en la base.')
    return readAcademic(conn)
  })
}

export function deleteStep(env: DbEnv, id: number) {
  return transaction(env, async (conn) => {
    const header = await execute(conn, 'DELETE FROM paso WHERE id = ?', [id])
    if (header.affectedRows === 0) throw new HttpError(404, 'Ese paso ya no está en la base.')
    return readAcademic(conn)
  })
}

export function createSession(env: DbEnv, payload: unknown) {
  const body = record(payload)
  const minutes = Math.round(Number(body.minutes))
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 600) {
    throw new HttpError(400, 'La sesión de enfoque no tiene una duración válida.')
  }
  const taskId = body.taskId == null || body.taskId === '' ? null : numericId(body.taskId)
  return transaction(env, async (conn) => {
    await execute(conn, 'INSERT INTO enfoque (trabajo_id, minutos, en) VALUES (?, ?, ?)', [taskId, minutes, new Date()])
    return readAcademic(conn)
  })
}
