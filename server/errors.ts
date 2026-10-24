export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function asHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'ER_DUP_ENTRY') {
    return new HttpError(409, 'Ya existe un curso con ese código en ese ciclo.')
  }
  if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_DB_ERROR') {
    return new HttpError(503, 'La base lumen no tiene las tablas. Créalas en HeidiSQL y vuelve a abrir Lumen.')
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'PROTOCOL_CONNECTION_LOST') {
    return new HttpError(503, 'No se pudo conectar con MySQL en el puerto 3307.')
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return new HttpError(503, 'MySQL rechazó el acceso. Revisa el usuario y la contraseña del archivo .env.')
  }
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
    return new HttpError(400, 'El curso o el trabajo indicado ya no existe.')
  }
  if (code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return new HttpError(400, 'Hay un dato que no cumple las reglas de la base.')
  }
  return new HttpError(500, 'No se pudo completar la operación en la base de datos.')
}
