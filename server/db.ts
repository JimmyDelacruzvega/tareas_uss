import mysql from 'mysql2/promise'
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DbEnv } from './env.ts'

export type Sql = Pool | PoolConnection

let pool: Pool | null = null

export function getPool(env: DbEnv) {
  if (!pool) {
    pool = mysql.createPool({
      host: env.host,
      port: env.port,
      user: env.user,
      password: env.password,
      database: env.database,
      waitForConnections: true,
      connectionLimit: 8,
      timezone: 'local',
      charset: 'utf8mb4',
      decimalNumbers: true,
    })
  }
  return pool
}

export async function query<T extends RowDataPacket>(sql: Sql, statement: string, params: unknown[] = []) {
  const [rows] = await sql.query<T[]>(statement, params)
  return rows
}

export async function execute(sql: Sql, statement: string, params: unknown[] = []) {
  const [header] = await sql.query<ResultSetHeader>(statement, params)
  return header
}
