import "server-only";
import { Pool } from "pg";

/** Toute requête passe par le serveur (le navigateur ne parle jamais à la base). */
export type Queryable = { query: Pool["query"] };

export class DatabaseNotConfiguredError extends Error {
  override name = "DatabaseNotConfiguredError";
}

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new DatabaseNotConfiguredError("DATABASE_URL n'est pas configurée");
    pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000 });
  }
  return pool;
}
