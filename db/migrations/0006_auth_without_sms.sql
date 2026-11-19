-- Agodjié TV — 0006 : suppression de tout ce qui dépendait des SMS / du PIN
-- Décision du 2026-11-20 : connexion Google + e-mail/mot de passe (Supabase Auth), aucun SMS.

ALTER TABLE app.markets DROP COLUMN otp_enabled;

DELETE FROM app.app_settings
WHERE key IN ('pin_length', 'pin_lock_soft', 'pin_lock_hard', 'ip_login_limits', 'otp_limits', 'sms_daily_budget_alert', 'session_idle_days');

INSERT INTO app.app_settings (key, value) VALUES ('progress_save_interval_seconds', '10');

SELECT app.lock_down();
