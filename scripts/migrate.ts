/**
 * Applique les migrations sur la base indiquée par DATABASE_URL.
 * Usage : npm run db:migrate            (migrations seules)
 *         npm run db:migrate -- --demo  (+ données de démonstration ; refusé si APP_ENV=production)
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { applyMigrations } from "../src/server/db/migrations";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const withDemo = process.argv.includes("--demo");
  if (withDemo && process.env.APP_ENV === "production") {
    throw new Error("Les données de démonstration sont interdites en production.");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await applyMigrations(client, path.join(process.cwd(), "db/migrations"));
    console.log(applied.length ? `Migrations appliquées : ${applied.join(", ")}` : "Base déjà à jour.");
    if (withDemo) {
      const { rows } = await client.query("SELECT count(*)::int AS n FROM app.series");
      if (rows[0].n === 0) {
        await client.query(await readFile(path.join(process.cwd(), "db/seed/demo.sql"), "utf8"));
        console.log("Données de démonstration chargées.");
      } else {
        console.log("Données déjà présentes : démonstration non rechargée.");
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
