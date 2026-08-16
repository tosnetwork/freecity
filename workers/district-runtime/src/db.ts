import pg from "pg";

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;

export function createPool(connectionString: string): Pool {
  return new pg.Pool({ connectionString, max: 10 });
}

/**
 * Runs `fn` inside one transaction. Any throw rolls back; nothing partial is
 * ever visible. A worker crash before COMMIT leaves the journal untouched so
 * another worker retries the same durable inputs (Runtime §14).
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // connection already broken; pool will discard it
    }
    throw error;
  } finally {
    client.release();
  }
}
