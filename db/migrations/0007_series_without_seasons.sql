-- Agodjié TV — 0007 : séries sans saisons, Pass série, règles de format
-- Décision du 2026-11-21 (docs/decisions/2026-11-21-series-sans-saisons-pass-serie.md).
-- Une série contient directement ses épisodes (ordre 1 → N). Les prix (pass + épisode) sont définis par série.

-- 1. Les épisodes appartiennent directement à la série
ALTER TABLE app.episodes ADD COLUMN series_id uuid;
UPDATE app.episodes e SET series_id = s.series_id FROM app.seasons s WHERE s.id = e.season_id;
ALTER TABLE app.episodes ALTER COLUMN series_id SET NOT NULL;
ALTER TABLE app.episodes ADD CONSTRAINT episodes_series_fk FOREIGN KEY (series_id) REFERENCES app.series(id) ON DELETE RESTRICT;
ALTER TABLE app.episodes DROP CONSTRAINT episodes_season_id_number_key;
DROP INDEX IF EXISTS app.episodes_season_idx;
ALTER TABLE app.episodes DROP COLUMN season_id;
-- Unicité de la position, vérifiable en fin de transaction pour permettre la réorganisation.
ALTER TABLE app.episodes ADD CONSTRAINT episodes_series_number_key UNIQUE (series_id, number) DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX episodes_series_idx ON app.episodes (series_id);

-- 2. Prix par série (pass série + prix par défaut d'un épisode), par grille tarifaire
CREATE TABLE app.series_prices (
  series_id uuid NOT NULL REFERENCES app.series(id) ON DELETE RESTRICT,
  price_list_id uuid NOT NULL REFERENCES app.price_lists(id),
  episode_price int NOT NULL CHECK (episode_price > 0),
  pass_price int NOT NULL CHECK (pass_price > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (series_id, price_list_id)
);
CREATE TRIGGER series_prices_touch BEFORE UPDATE ON app.series_prices FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

INSERT INTO app.series_prices (series_id, price_list_id, episode_price, pass_price)
SELECT DISTINCT ON (s.series_id, sp.price_list_id) s.series_id, sp.price_list_id, sp.episode_price, sp.pass_price
FROM app.season_prices sp JOIN app.seasons s ON s.id = sp.season_id
ORDER BY s.series_id, sp.price_list_id, s.number;

DROP TABLE app.season_prices;
DROP TABLE app.seasons;

-- 3. Fonctions mises à jour (plus aucune référence aux saisons)
CREATE OR REPLACE FUNCTION app.is_episode_public(p_episode_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.episodes e
    JOIN app.series sr ON sr.id = e.series_id
    WHERE e.id = p_episode_id
      AND sr.status = 'published'
      AND (e.status = 'published' OR (e.status = 'scheduled' AND e.publish_at <= now()))
  );
$$;

CREATE OR REPLACE FUNCTION app.episode_price(p_episode_id uuid, p_price_list_id uuid) RETURNS int
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  SELECT COALESCE(
    (SELECT o.price FROM app.episode_price_overrides o WHERE o.episode_id = p_episode_id AND o.price_list_id = p_price_list_id),
    (SELECT sp.episode_price FROM app.episodes e JOIN app.series_prices sp ON sp.series_id = e.series_id
      WHERE e.id = p_episode_id AND sp.price_list_id = p_price_list_id)
  );
$$;

CREATE OR REPLACE FUNCTION app.check_market_can_sell() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE v_missing int;
BEGIN
  IF NEW.payment_status = 'unavailable' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app.payment_routes r
    JOIN app.payment_accounts a ON a.id = r.payment_account_id AND a.is_enabled
    JOIN app.payment_providers p ON p.code = a.provider_code AND p.is_enabled
    WHERE r.country_code = NEW.country_code AND r.is_enabled
  ) THEN
    RAISE EXCEPTION 'Le pays % n''a aucune route de paiement active', NEW.country_code USING ERRCODE = 'check_violation';
  END IF;
  -- Chaque épisode payant public doit avoir un prix, et sa série un prix de pass, dans la grille du pays.
  SELECT count(*) INTO v_missing
  FROM app.episodes e
  WHERE e.access_type = 'paid' AND app.is_episode_public(e.id)
    AND (app.episode_price(e.id, NEW.price_list_id) IS NULL
         OR NOT EXISTS (SELECT 1 FROM app.series_prices sp WHERE sp.series_id = e.series_id AND sp.price_list_id = NEW.price_list_id));
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Le pays % : % épisode(s) payant(s) publié(s) sans prix dans sa grille', NEW.country_code, v_missing
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.opened_at IS NULL THEN
    NEW.opened_at := now();
  END IF;
  RETURN NEW;
END $$;

-- 4. Règles de format (RM-09) : réglages + rapport calculé pour l'administration
INSERT INTO app.app_settings (key, value) VALUES
  ('series_max_episodes', '10'),
  ('episode_target_seconds', '90'),
  ('episode_max_seconds', '110'),
  ('series_max_total_seconds', '900'),
  ('format_limits_mode', '"warn"');

CREATE OR REPLACE FUNCTION app.series_format_report(p_series_id uuid)
RETURNS TABLE (
  episode_count int,
  total_seconds int,
  missing_durations int,
  long_episode_numbers int[],
  over_episode_limit boolean,
  over_total_limit boolean
)
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  WITH limits AS (
    SELECT
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'series_max_episodes') AS max_episodes,
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'episode_max_seconds') AS max_episode_seconds,
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'series_max_total_seconds') AS max_total
  ),
  -- Épisodes qui comptent : publiés et programmés (les brouillons et dépubliés ne comptent pas).
  counted AS (
    SELECT e.number, e.duration_seconds FROM app.episodes e
    WHERE e.series_id = p_series_id AND e.status IN ('published', 'scheduled')
  )
  SELECT
    (SELECT count(*)::int FROM counted),
    (SELECT COALESCE(sum(duration_seconds), 0)::int FROM counted),
    (SELECT count(*)::int FROM counted WHERE duration_seconds IS NULL),
    (SELECT COALESCE(array_agg(number ORDER BY number), '{}') FROM counted, limits WHERE duration_seconds > limits.max_episode_seconds),
    (SELECT count(*) FROM counted) > (SELECT max_episodes FROM limits),
    (SELECT COALESCE(sum(duration_seconds), 0) FROM counted) > (SELECT max_total FROM limits);
$$;

-- 5. Réorganisation des épisodes d'une série (ordre 1 → N, sans trou ni doublon)
CREATE OR REPLACE FUNCTION app.reorder_episodes(p_series_id uuid, p_ordered_ids uuid[]) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM app.episodes WHERE series_id = p_series_id;
  IF v_count <> cardinality(p_ordered_ids)
     OR (SELECT count(DISTINCT x) FROM unnest(p_ordered_ids) x) <> v_count
     OR EXISTS (SELECT 1 FROM unnest(p_ordered_ids) x WHERE NOT EXISTS (SELECT 1 FROM app.episodes WHERE id = x AND series_id = p_series_id)) THEN
    RAISE EXCEPTION 'La nouvelle liste doit contenir exactement les épisodes de la série, une seule fois chacun'
      USING ERRCODE = 'check_violation';
  END IF;
  SET CONSTRAINTS app.episodes_series_number_key DEFERRED;
  UPDATE app.episodes e SET number = o.pos
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS o(id, pos)
  WHERE e.id = o.id;
END $$;

SELECT app.lock_down();
