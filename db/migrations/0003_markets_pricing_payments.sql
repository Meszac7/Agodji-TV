-- Agodjié TV — 0003 : devises, grilles tarifaires, pays, prestataires, comptes, routes
-- (DATABASE_SCHEMA §3.3 et §3.4). Aucun pays, prix ou prestataire n'est codé en dur dans l'application.

CREATE TABLE app.currencies (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  minor_units int NOT NULL CHECK (minor_units BETWEEN 0 AND 3),
  display_label text NOT NULL
);

CREATE TABLE app.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  currency text NOT NULL REFERENCES app.currencies(code),
  label text NOT NULL
);

CREATE TABLE app.markets (
  country_code text PRIMARY KEY CHECK (country_code ~ '^[A-Z]{2}$'),
  name text NOT NULL,
  phone_prefix text NOT NULL CHECK (phone_prefix ~ '^\+[0-9]{1,4}$'),
  otp_enabled boolean NOT NULL DEFAULT false,
  price_list_id uuid REFERENCES app.price_lists(id),
  payment_status text NOT NULL DEFAULT 'unavailable' CHECK (payment_status IN ('unavailable', 'pilot', 'open')),
  providers_confirmation jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_list_required_when_selling CHECK (payment_status = 'unavailable' OR price_list_id IS NOT NULL)
);

CREATE TABLE app.season_prices (
  season_id uuid NOT NULL REFERENCES app.seasons(id) ON DELETE CASCADE,
  price_list_id uuid NOT NULL REFERENCES app.price_lists(id),
  episode_price int NOT NULL CHECK (episode_price > 0),
  pass_price int NOT NULL CHECK (pass_price > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (season_id, price_list_id)
);

CREATE TABLE app.episode_price_overrides (
  episode_id uuid NOT NULL REFERENCES app.episodes(id) ON DELETE CASCADE,
  price_list_id uuid NOT NULL REFERENCES app.price_lists(id),
  price int NOT NULL CHECK (price > 0),
  PRIMARY KEY (episode_id, price_list_id)
);

CREATE TABLE app.payment_providers (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE app.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  provider_code text NOT NULL REFERENCES app.payment_providers(code),
  currencies text[] NOT NULL CHECK (cardinality(currencies) > 0),
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  credentials_ref text NOT NULL CHECK (credentials_ref ~ '^PAYACCT_[A-Z0-9_]+$'),
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.payment_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES app.markets(country_code),
  method text NOT NULL CHECK (method IN ('mobile_money', 'card', 'wallet')),
  payment_account_id uuid NOT NULL REFERENCES app.payment_accounts(id),
  priority int NOT NULL CHECK (priority > 0),
  operators_display text[] NOT NULL DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  UNIQUE (country_code, method, priority)
);

CREATE TRIGGER markets_touch BEFORE UPDATE ON app.markets FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER season_prices_touch BEFORE UPDATE ON app.season_prices FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Cohérence devise : la devise de la grille du pays doit être acceptée par le compte de la route.
CREATE OR REPLACE FUNCTION app.check_route_currency() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
DECLARE v_currency text; v_accepted text[];
BEGIN
  SELECT pl.currency INTO v_currency
  FROM app.markets m JOIN app.price_lists pl ON pl.id = m.price_list_id
  WHERE m.country_code = NEW.country_code;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'Le pays % n''a pas de grille tarifaire : route impossible', NEW.country_code
      USING ERRCODE = 'check_violation';
  END IF;
  SELECT currencies INTO v_accepted FROM app.payment_accounts WHERE id = NEW.payment_account_id;
  IF NOT (v_currency = ANY (v_accepted)) THEN
    RAISE EXCEPTION 'Le compte de paiement n''accepte pas la devise % du pays %', v_currency, NEW.country_code
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_routes_currency BEFORE INSERT OR UPDATE ON app.payment_routes
  FOR EACH ROW EXECUTE FUNCTION app.check_route_currency();

-- Prix effectif d'un épisode dans une grille : exception, sinon prix de la saison.
CREATE OR REPLACE FUNCTION app.episode_price(p_episode_id uuid, p_price_list_id uuid) RETURNS int
LANGUAGE sql STABLE SET search_path = pg_catalog, app AS $$
  SELECT COALESCE(
    (SELECT o.price FROM app.episode_price_overrides o WHERE o.episode_id = p_episode_id AND o.price_list_id = p_price_list_id),
    (SELECT sp.episode_price FROM app.episodes e JOIN app.season_prices sp ON sp.season_id = e.season_id
      WHERE e.id = p_episode_id AND sp.price_list_id = p_price_list_id)
  );
$$;

-- Porte qualité : un pays ne passe en « pilot » / « open » que si une route active existe
-- et que tous les contenus payants publics ont un prix dans sa grille (FR-55, LAUNCH_CHECKLIST §9).
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
  SELECT count(*) INTO v_missing
  FROM app.episodes e
  WHERE e.access_type = 'paid' AND app.is_episode_public(e.id)
    AND (app.episode_price(e.id, NEW.price_list_id) IS NULL
         OR NOT EXISTS (SELECT 1 FROM app.season_prices sp WHERE sp.season_id = e.season_id AND sp.price_list_id = NEW.price_list_id));
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Le pays % : % épisode(s) payant(s) publié(s) sans prix dans sa grille', NEW.country_code, v_missing
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.opened_at IS NULL THEN
    NEW.opened_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER markets_can_sell BEFORE INSERT OR UPDATE OF payment_status, price_list_id ON app.markets
  FOR EACH ROW EXECUTE FUNCTION app.check_market_can_sell();

SELECT app.lock_down();
