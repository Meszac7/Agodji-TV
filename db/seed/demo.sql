-- Agodjié TV — données de DÉMONSTRATION (local et préproduction uniquement, JAMAIS en production).
-- Titres fictifs ; ils ne constituent pas le catalogue réel.

INSERT INTO app.series (slug, title, tagline, synopsis, genres, is_ai_generated, video_orientation, status, release_label, is_featured, sort_order) VALUES
  ('sang-royal', 'Sang Royal', 'Un trône, deux héritiers, une seule nuit pour tout perdre.',
   'Le roi meurt sans désigner d''héritier. Entre alliances et trahisons, deux héritiers se disputent le trône.',
   '{Drame,Intrigue}', true, 'landscape', 'published', NULL, true, 1),
  ('nuits-de-cotonou', 'Nuits de Cotonou', 'Quand la ville s''endort, les secrets se réveillent.', NULL, '{Thriller}', true, 'landscape', 'coming_soon', 'Prochainement', false, 2),
  ('le-marche-des-promesses', 'Le Marché des Promesses', 'Tout s''achète. Même la loyauté.', NULL, '{Drame,Famille}', true, 'portrait', 'coming_soon', 'Prochainement', false, 3),
  ('heritage', 'L''Héritage', 'Le testament ne disait pas tout.', NULL, '{Drame}', true, 'landscape', 'coming_soon', 'Prochainement', false, 4),
  ('fleuve-noir', 'Fleuve Noir', 'Ce que l''eau emporte finit toujours par revenir.', NULL, '{Mystère}', true, 'portrait', 'coming_soon', 'Prochainement', false, 5),
  ('les-epouses', 'Les Épouses', 'Une maison, trois femmes, aucune vérité.', NULL, '{Drame,Romance}', true, 'landscape', 'coming_soon', 'Prochainement', false, 6);

INSERT INTO app.seasons (series_id, number, title, planned_episode_count, status)
SELECT id, 1, 'Saison 1', 8, 'published' FROM app.series WHERE slug = 'sang-royal';

INSERT INTO app.episodes (season_id, number, title, synopsis, duration_seconds, access_type, status, video_provider, video_id, video_status)
SELECT s.id, v.number, v.title, v.synopsis, v.duration, v.access, 'published', 'simulator', 'demo-' || v.number, 'ready'
FROM app.seasons s JOIN app.series sr ON sr.id = s.series_id AND sr.slug = 'sang-royal'
CROSS JOIN (VALUES
  (1, 'La Couronne vacante', 'Le roi meurt sans désigner d''héritier. Au palais, chacun choisit son camp avant l''aube.', 754, 'free'),
  (2, 'Le Pacte', 'Adjoa découvre une lettre qui pourrait tout changer.', 812, 'free'),
  (3, 'Les Masques', 'Une alliance inattendue se noue pendant la cérémonie.', 798, 'paid'),
  (4, 'La Trahison', 'Un proche de la famille royale vend un secret au plus offrant.', 845, 'paid'),
  (5, 'Le Serment', 'Kofi doit choisir entre son frère et la couronne.', 779, 'paid'),
  (6, 'Le Conseil', 'Les anciens se réunissent ; une voix manque à l''appel.', 801, 'paid')
) AS v(number, title, synopsis, duration, access);

-- Épisodes 7 et 8 : brouillon et programmé (pour tester les règles de visibilité).
INSERT INTO app.episodes (season_id, number, title, access_type, status, publish_at)
SELECT s.id, 7, 'L''Exil', 'paid', 'scheduled', now() + interval '7 days'
FROM app.seasons s JOIN app.series sr ON sr.id = s.series_id AND sr.slug = 'sang-royal';
INSERT INTO app.episodes (season_id, number, title, access_type, status)
SELECT s.id, 8, 'Le Retour', 'paid', 'draft'
FROM app.seasons s JOIN app.series sr ON sr.id = s.series_id AND sr.slug = 'sang-royal';

-- Prix validés pour la grille XOF (D-03). Aucune autre grille n'est remplie.
INSERT INTO app.season_prices (season_id, price_list_id, episode_price, pass_price)
SELECT s.id, pl.id, 300, 1500
FROM app.seasons s JOIN app.series sr ON sr.id = s.series_id AND sr.slug = 'sang-royal'
CROSS JOIN app.price_lists pl WHERE pl.code = 'XOF';
