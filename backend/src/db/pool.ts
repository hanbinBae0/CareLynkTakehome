import { Pool, PoolClient } from "pg";

import { env } from "../config/env";

export type Queryable = Pick<Pool, "query"> | PoolClient;

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

