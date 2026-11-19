-- Agodjié TV — 0004 : réglages ajustables et journal d'audit (DATABASE_SCHEMA §3.6, §3.7)

CREATE TABLE app.app_settings (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON app.app_settings FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

INSERT INTO app.app_settings (key, value) VALUES
  ('default_display_country', '"BJ"'),
  ('pin_length', '4'),
  ('pin_lock_soft', '{"failures": 5, "minutes": 15}'),
  ('pin_lock_hard', '{"failures": 10}'),
  ('ip_login_limits', '{"turnstile_after": 20, "block_after": 50, "per": "hour"}'),
  ('otp_limits', '{"per_number_hour": 3, "per_number_day": 10, "validity_minutes": 5, "max_attempts": 5}'),
  ('sms_daily_budget_alert', 'null'),
  ('order_limit_per_hour', '10'),
  ('playback_token', '{"validity_seconds": 300, "per_user_hour": 60}'),
  ('order_expiry_minutes', '60'),
  ('reconcile_window_hours', '72'),
  ('session_idle_days', '90');

CREATE TABLE app.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Journal en écriture seule : ni modification ni suppression.
CREATE OR REPLACE FUNCTION app.audit_logs_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, app AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est en écriture seule' USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON app.audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.audit_logs_immutable();

SELECT app.lock_down();
