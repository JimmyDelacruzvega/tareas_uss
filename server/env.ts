export interface DbEnv {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export function dbEnvFrom(source: Record<string, string>): DbEnv {
  const port = Number(source.DB_PORT || 3307)
  return {
    host: source.DB_HOST || 'localhost',
    port: Number.isFinite(port) ? port : 3307,
    user: source.DB_USER || 'root',
    password: source.DB_PASSWORD ?? '',
    database: source.DB_NAME || 'lumen',
  }
}
