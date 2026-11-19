-- Agodjié TV — données de DÉMONSTRATION (local et préproduction uniquement, JAMAIS en production).
-- Titres fictifs. Séries sans saisons : épisodes de ~1 min 30 (1 min 50 max), 15 min max par série.

INSERT INTO app.series (slug, title, tagline, synopsis, genres, is_ai_generated, video_orientation, status, release_label, is_featured, sort_order) VALUES
  ('sang-royal', 'Sang Royal', 'Un trône, deux héritiers, une seule nuit pour tout perdre.',
   'Le roi meurt sans désigner d''héritier. Entre alliances et trahisons, deux héritiers se disputent le trône.',
   '{Drame,Intrigue}', true, 'portrait', 'published', NULL, true, 1),
  ('nuits-de-cotonou', 'Nuits de Cotonou', 'Quand la ville s''endort, les secrets se réveillent.', NULL, '{Thriller}', true, 'portrait', 'coming_soon', 'Prochainement', false, 2),
  ('le-marche-des-promesses', 'Le Marché des Promesses', 'Tout s''achète. Même la loyauté.', NULL, '{Drame,Famille}', true, 'portrait', 'coming_soon', 'Prochainement', false, 3),
  ('heritage', 'L''Héritage', 'Le testament ne disait pas tout.', NULL, '{Drame}', true, 'landscape', 'coming_soon', 'Prochainement', false, 4),
  ('fleuve-noir', 'Fleuve Noir', 'Ce que l''eau emporte finit toujours par revenir.', NULL, '{Mystère}', true, 'portrait', 'coming_soon', 'Prochainement', false, 5),
  ('les-epouses', 'Les Épouses', 'Une maison, trois femmes, aucune vérité.', NULL, '{Drame,Romance}', true, 'portrait', 'coming_soon', 'Prochainement', false, 6);

-- Sang Royal : 6 épisodes publiés (1 et 2 gratuits), 1 programmé, 1 brouillon. Durées réalistes (secondes).
INSERT INTO app.episodes (series_id, number, title, synopsis, duration_seconds, access_type, status, publish_at, video_provider, video_id, video_status)
SELECT sr.id, v.number, v.title, v.synopsis, v.duration, v.access, v.status,
       CASE WHEN v.status = 'scheduled' THEN now() + interval '7 days' END,
       'simulator', CASE WHEN v.status <> 'draft' THEN 'demo-' || v.number END,
       CASE WHEN v.status <> 'draft' THEN 'ready' ELSE 'none' END
FROM app.series sr
CROSS JOIN (VALUES
  (1, 'La Couronne vacante', 'Le roi meurt sans désigner d''héritier.', 92, 'free', 'published'),
  (2, 'Le Pacte', 'Adjoa découvre une lettre qui pourrait tout changer.', 88, 'free', 'published'),
  (3, 'Les Masques', 'Une alliance inattendue se noue pendant la cérémonie.', 95, 'paid', 'published'),
  (4, 'La Trahison', 'Un proche de la famille royale vend un secret.', 101, 'paid', 'published'),
  (5, 'Le Serment', 'Kofi doit choisir entre son frère et la couronne.', 86, 'paid', 'published'),
  (6, 'Le Conseil', 'Les anciens se réunissent ; une voix manque à l''appel.', 97, 'paid', 'published'),
  (7, 'L''Exil', 'Banni du palais, Kofi prépare son retour.', 90, 'paid', 'scheduled'),
  (8, 'Le Retour', NULL, NULL, 'paid', 'draft')
) AS v(number, title, synopsis, duration, access, status)
WHERE sr.slug = 'sang-royal';

-- Prix (D-03, 2026-11-22) : 499 FCFA par épisode (référence, modifiable épisode par épisode) ; Pass propre à la série (ici 1 500 FCFA). Grille XOF seulement.
INSERT INTO app.series_prices (series_id, price_list_id, episode_price, pass_price)
SELECT sr.id, pl.id, 499, 1500
FROM app.series sr CROSS JOIN app.price_lists pl
WHERE sr.slug = 'sang-royal' AND pl.code = 'XOF';
