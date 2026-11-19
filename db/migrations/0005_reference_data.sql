-- Agodjié TV — 0005 : données de référence (tous environnements)
-- Devises, grilles tarifaires, pays visés, prestataires. Tout est DÉSACTIVÉ par défaut :
-- l'ouverture d'un pays ou d'un prestataire se fait depuis l'administration (activation progressive, D-02).

INSERT INTO app.currencies (code, minor_units, display_label) VALUES
  ('XOF', 0, 'FCFA'),
  ('XAF', 0, 'FCFA'),
  ('GNF', 0, 'GNF'),
  ('CDF', 2, 'FC'),
  ('USD', 2, '$');

-- Une grille par devise au départ (D-03). Seule la grille XOF reçoit des prix (validés : 300 / 1 500).
-- Les autres grilles restent VIDES : aucun montant n'est déduit par conversion.
INSERT INTO app.price_lists (code, currency, label) VALUES
  ('XOF', 'XOF', 'Afrique de l''Ouest — franc CFA (XOF)'),
  ('XAF', 'XAF', 'Afrique centrale — franc CFA (XAF)'),
  ('GNF', 'GNF', 'Guinée — franc guinéen'),
  ('CDF', 'CDF', 'RD Congo — franc congolais'),
  ('USD-CD', 'USD', 'RD Congo — dollar américain');

INSERT INTO app.markets (country_code, name, phone_prefix, price_list_id) VALUES
  ('BJ', 'Bénin', '+229', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('CI', 'Côte d''Ivoire', '+225', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('SN', 'Sénégal', '+221', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('TG', 'Togo', '+228', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('BF', 'Burkina Faso', '+226', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('ML', 'Mali', '+223', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('NE', 'Niger', '+227', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('GW', 'Guinée-Bissau', '+245', (SELECT id FROM app.price_lists WHERE code = 'XOF')),
  ('GN', 'Guinée', '+224', (SELECT id FROM app.price_lists WHERE code = 'GNF')),
  ('CM', 'Cameroun', '+237', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  ('GA', 'Gabon', '+241', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  ('CG', 'Congo', '+242', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  ('TD', 'Tchad', '+235', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  ('CF', 'Centrafrique', '+236', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  ('GQ', 'Guinée équatoriale', '+240', (SELECT id FROM app.price_lists WHERE code = 'XAF')),
  -- RD Congo : grille (USD ou CDF) non décidée (D-03) → aucune grille tant que la décision n'est pas prise.
  ('CD', 'RD Congo', '+243', NULL);

INSERT INTO app.payment_providers (code, display_name, is_enabled) VALUES
  ('cinetpay', 'CinetPay', false),
  ('fedapay', 'FedaPay', false);
