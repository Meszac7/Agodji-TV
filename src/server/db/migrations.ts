import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Client } from "pg";

/**
 * Application des migrations SQL versionnées (db/migrations/NNNN_nom.sql), dans l'ordre,
 * chacune dans sa propre transaction. Les migrations déjà appliquées sont ignorées.
 * Le suivi est stocké dans le schéma « app_meta », non exposé et fermé aux rôles clients.
 */
export async function applyMigrations(client: Client, dir: string): Promise<string[]> {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS app_meta;
    REVOKE ALL ON SCHEMA app_meta FROM PUBLIC;
    CREATE TABLE IF NOT EXISTS app_meta.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const files = (await readdir(dir)).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const { rows } = await client.query<{ name: string }>("SELECT name FROM app_meta.schema_migrations");
  const done = new Set(rows.map((r) => r.name));
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO app_meta.schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      applied.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Échec de la migration ${file} : ${(error as Error).message}`);
    }
  }
  return applied;
}
