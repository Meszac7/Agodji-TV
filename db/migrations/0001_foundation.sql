-- Agodjié TV — 0001 : fondations
-- Schéma applicatif dédié « app », NON exposé par l'API Supabase (seuls public/graphql_public le sont par défaut).
-- Le navigateur ne parle jamais à la base (CLAUDE.md règle 5) : les rôles anon / authenticated n'ont AUCUN droit ici.

-- Rôles Supabase : créés seulement s'ils n'existent pas (base PostgreSQL locale / CI).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS app;

REVOKE ALL ON SCHEMA app FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app TO service_role;

-- Tout objet futur créé dans « app » : aucun droit pour PUBLIC / anon / authenticated.
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Horodatage automatique
CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Verrouillage : RLS activé, aucune politique, aucun droit client. Appelé à la fin de chaque migration.
CREATE OR REPLACE FUNCTION app.lock_down() RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'app' AND c.relkind IN ('r', 'p') LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC, anon, authenticated', r.relname);
    EXECUTE format('GRANT ALL ON app.%I TO service_role', r.relname);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'app' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'app' AND c.relkind = 'S' LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE app.%I FROM PUBLIC, anon, authenticated', r.relname);
  END LOOP;
END $$;

SELECT app.lock_down();
