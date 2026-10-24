import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  addStep,
  adoptState,
  createCourse,
  createSession,
  createTask,
  deleteCourse,
  deleteStep,
  deleteTask,
  readState,
  replaceState,
  setTaskStatus,
  toggleStep,
  updateCourse,
  updateTask,
} from './academic.ts'
import type { DbEnv } from './env.ts'
import { asHttpError, HttpError } from './errors.ts'

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 2_000_000) throw new HttpError(413, 'La solicitud es demasiado grande.')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new HttpError(400, 'El cuerpo no es JSON válido.')
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function idFrom(value: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'El identificador no es válido.')
  return id
}

export async function handleApi(req: IncomingMessage, res: ServerResponse, env: DbEnv) {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const method = req.method ?? 'GET'
  if (!path.startsWith('/api')) return false

  try {
    if (method === 'GET' && path === '/api/state') {
      send(res, 200, await readState(env))
      return true
    }
    if (method === 'POST' && path === '/api/adopt') {
      send(res, 200, await adoptState(env, await readJson(req)))
      return true
    }
    if (method === 'PUT' && path === '/api/state') {
      send(res, 200, await replaceState(env, await readJson(req)))
      return true
    }
    if (method === 'POST' && path === '/api/courses') {
      send(res, 200, await createCourse(env, await readJson(req)))
      return true
    }
    if (method === 'POST' && path === '/api/tasks') {
      send(res, 200, await createTask(env, await readJson(req)))
      return true
    }
    if (method === 'POST' && path === '/api/enfoques') {
      send(res, 200, await createSession(env, await readJson(req)))
      return true
    }

    const course = path.match(/^\/api\/courses\/(\d+)$/)
    if (course?.[1] && method === 'PUT') {
      send(res, 200, await updateCourse(env, idFrom(course[1]), await readJson(req)))
      return true
    }
    if (course?.[1] && method === 'DELETE') {
      send(res, 200, await deleteCourse(env, idFrom(course[1])))
      return true
    }

    const task = path.match(/^\/api\/tasks\/(\d+)$/)
    if (task?.[1] && method === 'PUT') {
      send(res, 200, await updateTask(env, idFrom(task[1]), await readJson(req)))
      return true
    }
    if (task?.[1] && method === 'DELETE') {
      send(res, 200, await deleteTask(env, idFrom(task[1])))
      return true
    }

    const status = path.match(/^\/api\/tasks\/(\d+)\/estado$/)
    if (status?.[1] && method === 'PATCH') {
      send(res, 200, await setTaskStatus(env, idFrom(status[1]), await readJson(req)))
      return true
    }

    const step = path.match(/^\/api\/tasks\/(\d+)\/pasos$/)
    if (step?.[1] && method === 'POST') {
      send(res, 200, await addStep(env, idFrom(step[1]), await readJson(req)))
      return true
    }

    const paso = path.match(/^\/api\/pasos\/(\d+)$/)
    if (paso?.[1] && method === 'PATCH') {
      send(res, 200, await toggleStep(env, idFrom(paso[1])))
      return true
    }
    if (paso?.[1] && method === 'DELETE') {
      send(res, 200, await deleteStep(env, idFrom(paso[1])))
      return true
    }

    send(res, 404, { error: 'Esa ruta no existe.' })
  } catch (error) {
    const http = asHttpError(error)
    if (http.status === 500) console.error(error)
    send(res, http.status, { error: http.message })
  }
  return true
}
