import { createPool, type DatabasePool } from 'slonik';

let pool: DatabasePool;

export async function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgres://';
    pool = await createPool(connectionString);
  }
  return pool;
}
