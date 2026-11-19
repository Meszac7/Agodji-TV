import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { connect, expectPgError, inRollback } from "./helpers";

/**
 * Règle 5 (CLAUDE.md), SEC-20, SEC-24 : le navigateur ne parle jamais à la base.
 * Avec les rôles anon / authenticated (ceux de la clé publique Supabase), rien n'est accessible.
 */
let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const INSUFFICIENT_PRIVILEGE = "42501";

describe("verrouillage de la base pour les rôles clients", () => {
  it("toutes les tables du schéma app ont la sécurité par ligne (RLS) activée", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'app' AND c.relkind IN ('r','p') ORDER BY c.relname`);
    expect(rows.length).toBeGreaterThanOrEqual(12);
    const unprotected = rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
    expect(unprotected).toEqual([]);
  });

  it("aucune politique RLS n'existe (donc aucun accès pour anon / authenticated)", async () => {
    const { rows } = await db.query(`SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'app'`);
    expect(rows).toEqual([]);
  });

  for (const role of ["anon", "authenticated"]) {
    it(`${role} n'a aucun droit d'usage sur les schémas app et app_meta`, async () => {
      const { rows } = await db.query(
        `SELECT has_schema_privilege($1, 'app', 'USAGE') AS app, has_schema_privilege($1, 'app_meta', 'USAGE') AS meta`,
        [role],
      );
      expect(rows[0]).toEqual({ app: false, meta: false });
    });

    it(`${role} n'a aucun privilège sur aucune table du schéma app`, async () => {
      const { rows } = await db.query(
        `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'app' AND c.relkind IN ('r','p','v','m','S')
           AND (has_table_privilege($1, c.oid, 'SELECT') OR has_table_privilege($1, c.oid, 'INSERT')
             OR has_table_privilege($1, c.oid, 'UPDATE') OR has_table_privilege($1, c.oid, 'DELETE'))`,
        [role],
      );
      expect(rows).toEqual([]);
    });

    it(`${role} ne peut exécuter aucune fonction du schéma app`, async () => {
      const { rows } = await db.query(
        `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'app' AND has_function_privilege($1, p.oid, 'EXECUTE')`,
        [role],
      );
      expect(rows).toEqual([]);
    });

    it(`${role} reçoit un refus en lisant le catalogue, les prix ou les réglages`, async () => {
      for (const table of ["app.series", "app.season_prices", "app.app_settings", "app.payment_accounts"]) {
        await inRollback(db, async () => {
          await db.query(`SET LOCAL ROLE ${role}`);
          await expectPgError(db.query(`SELECT * FROM ${table} LIMIT 1`), INSUFFICIENT_PRIVILEGE);
        });
      }
    });
  }

  it("une table créée plus tard dans app est fermée par défaut aux rôles clients", async () => {
    await inRollback(db, async () => {
      await db.query("CREATE TABLE app.future_table (id int)");
      const { rows } = await db.query(
        `SELECT has_table_privilege('anon', 'app.future_table', 'SELECT') AS anon,
                has_table_privilege('authenticated', 'app.future_table', 'SELECT') AS auth`,
      );
      expect(rows[0]).toEqual({ anon: false, auth: false });
    });
  });

  it("le rôle serveur (service_role) peut lire le catalogue", async () => {
    await inRollback(db, async () => {
      await db.query("SET LOCAL ROLE service_role");
      const { rows } = await db.query("SELECT count(*)::int AS n FROM app.series");
      expect(rows[0].n).toBe(6);
    });
  });
});
