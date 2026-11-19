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

-- Limites d'émission de liens (SEC-54) pour les visiteurs sans compte, PAR ADRESSE IP.
-- Beaucoup d'abonnés mobiles partagent la même adresse publique chez leur opérateur : la limite par IP
-- doit rester large ; la limite par client (per_user_hour) s'appliquera aux comptes (étape L4).
UPDATE app.app_settings
   SET value = value || '{"per_ip_hour": 600, "refresh_per_ip_hour": 3000}'::jsonb
 WHERE key = 'playback_token';

SELECT app.lock_down();
