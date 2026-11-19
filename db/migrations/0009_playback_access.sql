-- 0009 — Droit de lecture (étape L1 du véritable lecteur)
-- has_episode_access est la SEULE règle consultée avant d'émettre un lien de lecture (SEC-51).
-- À cette étape il n'existe ni comptes clients ni achats : seuls les épisodes GRATUITS et PUBLICS
-- sont lisibles. L'étape L4 étendra cette même fonction (pass série, achat à l'unité, client bloqué)
-- sans changer son nom ni ses appelants.

CREATE FUNCTION app.has_episode_access(p_customer_id uuid, p_episode_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.episodes e
    WHERE e.id = p_episode_id
      AND app.is_episode_public(e.id)
      AND e.access_type = 'free'
  );
$$;

SELECT app.lock_down();
