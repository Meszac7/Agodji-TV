import path from "node:path";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { applyMigrations } from "../../src/server/db/migrations";

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
  }
}

const DB_NAME = "agodjie_test";

/** Crée une base vide, applique toutes les migrations puis les données de démonstration. */
export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres@localhost:54329/postgres";
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${DB_NAME}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const root = process.cwd();
  const applied = await applyMigrations(client, path.join(root, "db/migrations"));
  if (applied.length === 0) throw new Error("Aucune migration appliquée");
  await client.query(await readFile(path.join(root, "db/seed/demo.sql"), "utf8"));
  await client.end();

  project.provide("dbUrl", url.toString());
}
