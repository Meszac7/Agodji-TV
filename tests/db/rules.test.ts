import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { connect, expectPgError, inRollback } from "./helpers";

let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

async function seriesId(slug = "sang-royal"): Promise<string> {
  const { rows } = await db.query(`SELECT id FROM app.series WHERE slug = $1`, [slug]);
  return rows[0].id;
}
async function priceListId(code: string): Promise<string> {
  const { rows } = await db.query(`SELECT id FROM app.price_lists WHERE code = $1`, [code]);
  return rows[0].id;
}

describe("données de démonstration et de référence", () => {
  it("6 séries : 1 publiée, 5 bientôt disponibles", async () => {
    const { rows } = await db.query(`SELECT status, count(*)::int AS n FROM app.series GROUP BY status ORDER BY status`);
    expect(rows).toEqual([
      { status: "coming_soon", n: 5 },
      { status: "published", n: 1 },
    ]);
  });

  it("grille XOF : 300 FCFA par épisode, 1 500 FCFA le pass série (D-03)", async () => {
    const { rows } = await db.query(
      `SELECT sp.episode_price, sp.pass_price FROM app.series_prices sp JOIN app.price_lists pl ON pl.id = sp.price_list_id WHERE pl.code = 'XOF'`,
    );
    expect(rows).toEqual([{ episode_price: 300, pass_price: 1500 }]);
  });

  it("les grilles des autres monnaies sont vides : aucune conversion automatique (D-03)", async () => {
    const { rows } = await db.query(
      `SELECT pl.code FROM app.series_prices sp JOIN app.price_lists pl ON pl.id = sp.price_list_id WHERE pl.code <> 'XOF'`,
    );
    expect(rows).toEqual([]);
  });

  it("pays par défaut pour l'affichage : Bénin (D-21)", async () => {
    const { rows } = await db.query(`SELECT value FROM app.app_settings WHERE key = 'default_display_country'`);
    expect(rows[0].value).toBe("BJ");
  });

  it("tous les pays sont fermés à l'achat au départ (activation progressive)", async () => {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM app.markets WHERE payment_status <> 'unavailable'`);
    expect(rows[0].n).toBe(0);
    const { rows: all } = await db.query(`SELECT count(*)::int AS n FROM app.markets`);
    expect(all[0].n).toBe(16);
  });

  it("CinetPay et FedaPay sont déclarés mais désactivés", async () => {
    const { rows } = await db.query(`SELECT code, is_enabled FROM app.payment_providers ORDER BY code`);
    expect(rows).toEqual([
      { code: "cinetpay", is_enabled: false },
      { code: "fedapay", is_enabled: false },
    ]);
  });
});

describe("aucune dépendance aux SMS ni au PIN (décision du 2026-11-20)", () => {
  it("la colonne otp_enabled n'existe plus", async () => {
    const { rows } = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'markets' AND column_name = 'otp_enabled'`,
    );
    expect(rows).toEqual([]);
  });
  it("aucun réglage PIN / OTP / SMS ne subsiste", async () => {
    const { rows } = await db.query(
      `SELECT key FROM app.app_settings WHERE key ~ '(pin|otp|sms)'`,
    );
    expect(rows).toEqual([]);
  });
});

describe("règles du catalogue", () => {
  it("visibilité : publié visible ; programmé futur, brouillon invisibles", async () => {
    const { rows } = await db.query(
      `SELECT e.number, app.is_episode_public(e.id) AS visible FROM app.episodes e ORDER BY e.number`,
    );
    const visible = Object.fromEntries(rows.map((r) => [r.number, r.visible]));
    expect(visible).toMatchObject({ 1: true, 6: true, 7: false, 8: false });
  });

  it("un épisode programmé dont la date est passée devient visible", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.episodes SET publish_at = now() - interval '1 minute' WHERE number = 7`);
      const { rows } = await db.query(`SELECT app.is_episode_public(id) AS v FROM app.episodes WHERE number = 7`);
      expect(rows[0].v).toBe(true);
    });
  });

  it("un épisode d'une série « bientôt » n'est jamais visible", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.series SET status = 'coming_soon' WHERE slug = 'sang-royal'`);
      const { rows } = await db.query(`SELECT bool_or(app.is_episode_public(id)) AS any FROM app.episodes`);
      expect(rows[0].any).toBe(false);
    });
  });

  it("un épisode programmé exige une date", async () => {
    await inRollback(db, async () => {
      await expectPgError(
        db.query(`INSERT INTO app.episodes (series_id, number, title, status) VALUES ($1, 99, 'X', 'scheduled')`, [
          await seriesId(),
        ]),
        CHECK_VIOLATION,
      );
    });
  });

  it("deux épisodes ne peuvent pas avoir le même numéro dans une saison", async () => {
    await inRollback(db, async () => {
      await expectPgError(
        db.query(`INSERT INTO app.episodes (series_id, number, title) VALUES ($1, 1, 'Doublon')`, [await seriesId()]),
        UNIQUE_VIOLATION,
      );
    });
  });

  it("la date de première mise en ligne est renseignée à la publication", async () => {
    const { rows } = await db.query(`SELECT bool_and(first_published_at IS NOT NULL) AS ok FROM app.episodes WHERE status = 'published'`);
    expect(rows[0].ok).toBe(true);
  });
});

describe("règles de prix", () => {
  it("prix effectif : exception d'épisode, sinon prix de la saison", async () => {
    await inRollback(db, async () => {
      const xof = await priceListId("XOF");
      const { rows: before } = await db.query(
        `SELECT app.episode_price(id, $1) AS p FROM app.episodes WHERE number = 5`,
        [xof],
      );
      expect(before[0].p).toBe(300);
      await db.query(
        `INSERT INTO app.episode_price_overrides (episode_id, price_list_id, price) SELECT id, $1, 500 FROM app.episodes WHERE number = 5`,
        [xof],
      );
      const { rows: after } = await db.query(`SELECT app.episode_price(id, $1) AS p FROM app.episodes WHERE number = 5`, [xof]);
      expect(after[0].p).toBe(500);
    });
  });

  it("pas de prix dans une grille vide (XAF) : pas de conversion", async () => {
    const { rows } = await db.query(
      `SELECT app.episode_price(id, (SELECT id FROM app.price_lists WHERE code = 'XAF')) AS p FROM app.episodes WHERE number = 5`,
    );
    expect(rows[0].p).toBeNull();
  });

  it("un prix nul ou négatif est refusé", async () => {
    await inRollback(db, async () => {
      await expectPgError(
        db.query(`UPDATE app.series_prices SET episode_price = 0`),
        CHECK_VIOLATION,
      );
    });
  });
});

describe("activation progressive des pays (porte qualité)", () => {
  async function addSimulatorRoute(country: string, currencies: string[]) {
    await db.query(`INSERT INTO app.payment_providers (code, display_name, is_enabled) VALUES ('simulator', 'Simulateur', true)`);
    const { rows } = await db.query(
      `INSERT INTO app.payment_accounts (code, provider_code, currencies, environment, credentials_ref, is_enabled)
       VALUES ('simulator-test', 'simulator', $1, 'sandbox', 'PAYACCT_SIMULATOR_TEST', true) RETURNING id`,
      [currencies],
    );
    await db.query(
      `INSERT INTO app.payment_routes (country_code, method, payment_account_id, priority, is_enabled) VALUES ($1, 'mobile_money', $2, 1, true)`,
      [country, rows[0].id],
    );
  }

  it("un pays sans route de paiement active ne peut pas passer en pilote", async () => {
    await inRollback(db, async () => {
      await expectPgError(db.query(`UPDATE app.markets SET payment_status = 'pilot' WHERE country_code = 'BJ'`), CHECK_VIOLATION);
    });
  });

  it("avec une route active et des prix XOF, le Bénin peut passer en pilote", async () => {
    await inRollback(db, async () => {
      await addSimulatorRoute("BJ", ["XOF"]);
      await db.query(`UPDATE app.markets SET payment_status = 'pilot' WHERE country_code = 'BJ'`);
      const { rows } = await db.query(`SELECT payment_status, opened_at IS NOT NULL AS dated FROM app.markets WHERE country_code = 'BJ'`);
      expect(rows[0]).toEqual({ payment_status: "pilot", dated: true });
    });
  });

  it("le Cameroun (grille XAF vide) ne peut pas ouvrir : épisodes payants sans prix", async () => {
    await inRollback(db, async () => {
      await addSimulatorRoute("CM", ["XAF"]);
      await expectPgError(db.query(`UPDATE app.markets SET payment_status = 'open' WHERE country_code = 'CM'`), CHECK_VIOLATION);
    });
  });

  it("une route vers un compte qui n'accepte pas la devise du pays est refusée", async () => {
    await inRollback(db, async () => {
      await expectPgError(addSimulatorRoute("CM", ["XOF"]), CHECK_VIOLATION);
    });
  });

  it("la RD Congo (grille non décidée) ne peut ni vendre ni recevoir de route", async () => {
    await inRollback(db, async () => {
      await expectPgError(db.query(`UPDATE app.markets SET payment_status = 'pilot' WHERE country_code = 'CD'`), CHECK_VIOLATION);
    });
    await inRollback(db, async () => {
      await expectPgError(addSimulatorRoute("CD", ["USD"]), CHECK_VIOLATION);
    });
  });

  it("désactiver le seul compte d'une route empêche l'ouverture", async () => {
    await inRollback(db, async () => {
      await addSimulatorRoute("BJ", ["XOF"]);
      await db.query(`UPDATE app.payment_accounts SET is_enabled = false WHERE code = 'simulator-test'`);
      await expectPgError(db.query(`UPDATE app.markets SET payment_status = 'open' WHERE country_code = 'BJ'`), CHECK_VIOLATION);
    });
  });
});

describe("journal d'audit", () => {
  it("est en écriture seule : modification et suppression refusées", async () => {
    await inRollback(db, async () => {
      await db.query(`INSERT INTO app.audit_logs (action) VALUES ('test')`);
      await expectPgError(db.query(`UPDATE app.audit_logs SET action = 'x'`), "42501");
    });
    await inRollback(db, async () => {
      await db.query(`INSERT INTO app.audit_logs (action) VALUES ('test')`);
      await expectPgError(db.query(`DELETE FROM app.audit_logs`), "42501");
    });
  });
});

describe("séries sans saisons (décision du 2026-11-21)", () => {
  it("la table des saisons n'existe plus ; les épisodes appartiennent directement à la série", async () => {
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' AND table_name IN ('seasons', 'season_prices')`,
    );
    expect(rows).toEqual([]);
    const { rows: cols } = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'episodes' AND column_name IN ('season_id', 'series_id')`,
    );
    expect(cols).toEqual([{ column_name: "series_id" }]);
  });

  it("les prix sont définis par série : pass série et prix d'un épisode", async () => {
    const { rows } = await db.query(
      `SELECT sr.slug, sp.pass_price, sp.episode_price FROM app.series_prices sp JOIN app.series sr ON sr.id = sp.series_id`,
    );
    expect(rows).toEqual([{ slug: "sang-royal", pass_price: 1500, episode_price: 300 }]);
  });

  it("la durée totale est calculée automatiquement (épisodes publiés et programmés)", async () => {
    const { rows } = await db.query(`SELECT * FROM app.series_format_report($1)`, [await seriesId()]);
    expect(rows[0]).toEqual({
      episode_count: 7,
      total_seconds: 92 + 88 + 95 + 101 + 86 + 97 + 90,
      missing_durations: 0,
      long_episode_numbers: [],
      over_episode_limit: false,
      over_total_limit: false,
    });
  });

  it("signale un épisode de plus de 1 min 50", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.episodes SET duration_seconds = 125 WHERE number = 4`);
      const { rows } = await db.query(`SELECT long_episode_numbers FROM app.series_format_report($1)`, [await seriesId()]);
      expect(rows[0].long_episode_numbers).toEqual([4]);
    });
  });

  it("signale une série de plus de 10 épisodes et de plus de 15 minutes", async () => {
    await inRollback(db, async () => {
      const id = await seriesId();
      for (let n = 9; n <= 12; n++) {
        await db.query(
          `INSERT INTO app.episodes (series_id, number, title, duration_seconds, status) VALUES ($1, $2, 'Ajout', 105, 'published')`,
          [id, n],
        );
      }
      const { rows } = await db.query(`SELECT * FROM app.series_format_report($1)`, [id]);
      expect(rows[0]).toMatchObject({ episode_count: 11, over_episode_limit: true, over_total_limit: true });
    });
  });

  it("les brouillons ne comptent ni dans le nombre d'épisodes ni dans la durée", async () => {
    await inRollback(db, async () => {
      await db.query(`UPDATE app.episodes SET duration_seconds = 600 WHERE number = 8`);
      const { rows } = await db.query(`SELECT episode_count, over_total_limit FROM app.series_format_report($1)`, [await seriesId()]);
      expect(rows[0]).toEqual({ episode_count: 7, over_total_limit: false });
    });
  });

  it("les limites de format sont des réglages, mode « avertir » par défaut (D-28)", async () => {
    const { rows } = await db.query(
      `SELECT key, value FROM app.app_settings WHERE key IN ('series_max_episodes','episode_max_seconds','series_max_total_seconds','format_limits_mode','episode_target_seconds') ORDER BY key`,
    );
    expect(rows).toEqual([
      { key: "episode_max_seconds", value: 110 },
      { key: "episode_target_seconds", value: 90 },
      { key: "format_limits_mode", value: "warn" },
      { key: "series_max_episodes", value: 10 },
      { key: "series_max_total_seconds", value: 900 },
    ]);
  });

  it("réorganiser les épisodes donne un ordre 1 → N sans trou ni doublon", async () => {
    await inRollback(db, async () => {
      const id = await seriesId();
      const { rows } = await db.query(`SELECT id, number FROM app.episodes WHERE series_id = $1 ORDER BY number`, [id]);
      const ids = rows.map((r) => r.id);
      const reversed = [...ids].reverse();
      await db.query(`SELECT app.reorder_episodes($1, $2::uuid[])`, [id, reversed]);
      const { rows: after } = await db.query(`SELECT id, number FROM app.episodes WHERE series_id = $1 ORDER BY number`, [id]);
      expect(after.map((r) => r.id)).toEqual(reversed);
      expect(after.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });

  it("une réorganisation incomplète ou avec doublon est refusée", async () => {
    const id = await seriesId();
    const { rows } = await db.query(`SELECT id FROM app.episodes WHERE series_id = $1 ORDER BY number`, [id]);
    const ids = rows.map((r) => r.id);
    await inRollback(db, async () => {
      await expectPgError(db.query(`SELECT app.reorder_episodes($1, $2::uuid[])`, [id, ids.slice(1)]), CHECK_VIOLATION);
    });
    await inRollback(db, async () => {
      await expectPgError(db.query(`SELECT app.reorder_episodes($1, $2::uuid[])`, [id, [ids[0], ...ids.slice(0, -1)]]), CHECK_VIOLATION);
    });
  });
});
