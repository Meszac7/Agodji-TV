-- 0008 — Limites de format STRICTES (décision du 2026-11-22, D-28)
-- • Plus de mode « avertissement » : les limites sont bloquantes, sans contournement.
-- • Le calcul porte sur TOUS les épisodes de la série (publiés, programmés, brouillons, dépubliés).
-- • Garanti par la base : un déclencheur de contrainte refuse toute écriture qui ferait
--   sortir des limites une série ayant au moins un épisode publié ou programmé.
-- • Les valeurs des limites ne changent que par migration (jamais depuis l'administration).

DELETE FROM app.app_settings WHERE key = 'format_limits_mode';

DROP FUNCTION IF EXISTS app.series_format_report(uuid);
CREATE FUNCTION app.series_format_report(p_series_id uuid)
RETURNS TABLE (
  episode_count int,
  total_seconds int,
  missing_durations int,
  long_episode_numbers int[],
  over_episode_limit boolean,
  over_total_limit boolean,
  publishable boolean
)
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  WITH limits AS (
    SELECT
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'series_max_episodes') AS max_episodes,
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'episode_max_seconds') AS max_episode_seconds,
      (SELECT (value #>> '{}')::int FROM app.app_settings WHERE key = 'series_max_total_seconds') AS max_total
  ),
  counted AS (  -- tous les épisodes, quel que soit leur statut
    SELECT e.number, e.duration_seconds FROM app.episodes e WHERE e.series_id = p_series_id
  ),
  r AS (
    SELECT
      (SELECT count(*)::int FROM counted) AS episode_count,
      (SELECT COALESCE(sum(duration_seconds), 0)::int FROM counted) AS total_seconds,
      (SELECT count(*)::int FROM counted WHERE duration_seconds IS NULL) AS missing_durations,
      (SELECT COALESCE(array_agg(number ORDER BY number), '{}') FROM counted, limits
        WHERE duration_seconds > limits.max_episode_seconds) AS long_episode_numbers,
      (SELECT count(*) FROM counted) > (SELECT max_episodes FROM limits) AS over_episode_limit,
      (SELECT COALESCE(sum(duration_seconds), 0) FROM counted) > (SELECT max_total FROM limits) AS over_total_limit
  )
  SELECT r.*, (NOT r.over_episode_limit AND NOT r.over_total_limit AND cardinality(r.long_episode_numbers) = 0)
  FROM r;
$$;

-- Vérification bloquante d'une série (appelée par les déclencheurs ci-dessous)
CREATE FUNCTION app.assert_series_format(p_series_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE
  rep record;
  v_live boolean;
  v_missing int[];
BEGIN
  IF p_series_id IS NULL THEN RETURN; END IF;

  -- Un épisode publié ou programmé doit avoir une durée.
  SELECT array_agg(number ORDER BY number) INTO v_missing FROM app.episodes
  WHERE series_id = p_series_id AND status IN ('published', 'scheduled') AND duration_seconds IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Publication impossible : durée manquante pour l''épisode %', array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  -- Les limites s'appliquent dès qu'un épisode de la série est publié ou programmé.
  SELECT EXISTS (SELECT 1 FROM app.episodes WHERE series_id = p_series_id AND status IN ('published', 'scheduled'))
    INTO v_live;
  IF NOT v_live THEN RETURN; END IF;

  SELECT * INTO rep FROM app.series_format_report(p_series_id);
  IF rep.over_episode_limit THEN
    RAISE EXCEPTION 'Limite dépassée : % épisodes (10 maximum par série)', rep.episode_count
      USING ERRCODE = 'check_violation';
  END IF;
  IF cardinality(rep.long_episode_numbers) > 0 THEN
    RAISE EXCEPTION 'Limite dépassée : épisode % de plus de 1 min 50', array_to_string(rep.long_episode_numbers, ', ')
      USING ERRCODE = 'check_violation';
  END IF;
  IF rep.over_total_limit THEN
    RAISE EXCEPTION 'Limite dépassée : durée totale de % s (15 min maximum, tous épisodes compris)', rep.total_seconds
      USING ERRCODE = 'check_violation';
  END IF;
END $$;

CREATE FUNCTION app.episodes_assert_format() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  PERFORM app.assert_series_format(NEW.series_id);
  RETURN NULL;
END $$;

-- Contrainte vérifiée à chaque écriture (différable dans une transaction, jamais désactivable par l'admin)
CREATE CONSTRAINT TRIGGER episodes_format_limits
  AFTER INSERT OR UPDATE ON app.episodes
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION app.episodes_assert_format();

SELECT app.lock_down();
