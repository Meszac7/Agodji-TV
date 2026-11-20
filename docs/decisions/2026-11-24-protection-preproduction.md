# Décision — Hébergement et protection de la préproduction

Statut : choix d'hébergement **validé par le fondateur** (Netlify Free, Supabase Free, essai Bunny Stream, GitHub) ; protection **préparée dans le dépôt, en attente de validation**. Aucun compte connecté, aucun déploiement, aucune dépense.
Comparaison et budget : `docs/plans/hebergement-preproduction.md`.

## Protection (côté serveur, toutes les adresses)
- `src/middleware.ts` s'exécute **avant tout traitement** pour **toutes** les adresses : pages, API, vidéos simulées, images, fichiers techniques du site (`/_next/static`), favicon.
- Règle **fermée par défaut** (`src/lib/preview-access.ts`) :
  - `APP_ENV=development` / `test` → ouvert (postes de développement, tests automatiques) ;
  - `APP_ENV=production` → public (futur site de production, non concerné aujourd'hui) ;
  - toute autre valeur, **ou APP_ENV absent** → **code d'accès obligatoire** ;
  - code absent ou de moins de 16 caractères → **site fermé** (503) pour toutes les adresses.
- Sans cookie valide : pages → page d'accès autonome (401, aucun fichier du site servi) ; API et requêtes non-GET → 401 JSON.
- Cookie `agodjie_preprod` : signature dérivée du code (le code n'est jamais stocké chez le visiteur), `HttpOnly`, `Secure`, `SameSite=Lax`, 30 jours ; changer le code **invalide tous les accès**.
- Code vérifié à temps constant ; 0,6 s d'attente après un mauvais code ; retour après connexion limité aux pages du site (pas de redirection externe) ; déconnexion : `/__preprod/sortie`.

## Non-indexation et distinction avec la production
- En-tête `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` sur toutes les réponses hors production ; `robots.txt` interdisant tout ; balise `robots noindex`.
- Bandeau permanent **« Préproduction · données de démonstration »** (au-dessus de tout, lecteur compris) et titres préfixés **[Préprod]**.
- La préproduction a sa propre base (Supabase Free) et ses données de démonstration ; les simulateurs y sont autorisés, jamais en production (SEC-44).

## Netlify : mises en ligne uniquement sur demande
- `netlify.toml` : construction Next.js, Node 22, npm 11.6.2, fichiers de démonstration du simulateur inclus.
- `scripts/netlify-ignore.sh` : une modification du dépôt **n'est pas** mise en ligne, sauf si :
  - le commit contient `[deploy:preprod]` (mise en ligne décidée ensemble) ;
  - ou un **lien de déclenchement** Netlify (« build hook ») est utilisé.
- En cas de doute ou d'erreur : pas de mise en ligne (aucun crédit consommé inutilement).

## Limites connues (à vérifier au premier déploiement)
- Le passage de la protection devant les fichiers statiques **sur Netlify** est testé localement ; il sera revérifié sur l'adresse Netlify réelle (liste de contrôle dans le compte rendu).
- Le fonctionnement exact de la commande « ignore » pour les déclenchements manuels depuis l'interface Netlify est à confirmer ; le lien de déclenchement est la méthode sûre.
- Un code d'accès partagé n'identifie pas les personnes : il protège contre le public et les robots, pas contre un testeur qui le transmettrait (changer le code coupe tous les accès).
- Les futures notifications de Bunny (étape L2) devront passer la protection : une exception **limitée à leur seule adresse et vérifiée par signature** sera ajoutée à ce moment-là, soumise à validation.
