-- Agodjié TV — 0002 : catalogue (DATABASE_SCHEMA §3.2)

CREATE TABLE app.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  tagline text,
  synopsis text,
  genres text[] NOT NULL DEFAULT '{}',
  age_rating text,
  is_ai_generated boolean NOT NULL DEFAULT false,
  poster_path text,
  banner_path text,
  video_orientation text NOT NULL DEFAULT 'landscape' CHECK (video_orientation IN ('landscape', 'portrait')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'coming_soon', 'published', 'unpublished')),
  release_label text,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES app.series(id) ON DELETE RESTRICT,
  number int NOT NULL CHECK (number > 0),
  title text,
  description text,
  planned_episode_count int CHECK (planned_episode_count IS NULL OR planned_episode_count > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, number)
);

CREATE TABLE app.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES app.seasons(id) ON DELETE RESTRICT,
  number int NOT NULL CHECK (number > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  synopsis text,
  thumbnail_path text,
  duration_seconds int CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  access_type text NOT NULL DEFAULT 'paid' CHECK (access_type IN ('free', 'paid')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'unpublished')),
  publish_at timestamptz,
  first_published_at timestamptz,
  video_provider text NOT NULL DEFAULT 'simulator',
  video_id text,
  video_status text NOT NULL DEFAULT 'none' CHECK (video_status IN ('none', 'uploading', 'processing', 'ready', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, number),
  CONSTRAINT scheduled_needs_date CHECK (status <> 'scheduled' OR publish_at IS NOT NULL)
);

CREATE INDEX episodes_season_idx ON app.episodes (season_id);

CREATE TRIGGER series_touch BEFORE UPDATE ON app.series FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER seasons_touch BEFORE UPDATE ON app.seasons FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER episodes_touch BEFORE UPDATE ON app.episodes FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Date de première mise en ligne (RM-07) : fixée quand l'épisode devient visible par une écriture.
-- Un épisode « programmé » dont la date passe sans écriture est considéré comme mis en ligne à publish_at
-- (règle appliquée par has_episode_access, étape 5).
CREATE OR REPLACE FUNCTION app.set_first_published_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  IF NEW.first_published_at IS NULL AND
     (NEW.status = 'published' OR (NEW.status = 'scheduled' AND NEW.publish_at <= now())) THEN
    NEW.first_published_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER episodes_first_published BEFORE INSERT OR UPDATE ON app.episodes
  FOR EACH ROW EXECUTE FUNCTION app.set_first_published_at();

-- Visibilité publique d'un épisode (DATABASE_SCHEMA §3.2)
CREATE OR REPLACE FUNCTION app.is_episode_public(p_episode_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.episodes e
    JOIN app.seasons s ON s.id = e.season_id
    JOIN app.series sr ON sr.id = s.series_id
    WHERE e.id = p_episode_id
      AND sr.status = 'published' AND s.status = 'published'
      AND (e.status = 'published' OR (e.status = 'scheduled' AND e.publish_at <= now()))
  );
$$;

SELECT app.lock_down();
