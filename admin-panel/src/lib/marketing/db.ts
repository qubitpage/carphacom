/**
 * Marketing Module - Database Pool
 * Shared PostgreSQL connection for all marketing modules
 */
import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'medusa_store',
      user: 'medusa',
      password: process.env.DB_PASSWORD,
      ssl: false,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
