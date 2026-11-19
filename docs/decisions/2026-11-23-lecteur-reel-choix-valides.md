# Décision — Plan du véritable lecteur validé et choix associés

Date : 2026-11-23 · Origine : validation du fondateur · Statut : **validé**.
Plan de référence : `docs/plans/plan-lecteur-reel.md` (étapes L1 → L7). Estimation des coûts : `docs/plans/couts-diffusion-video.md`.

| Sujet | Décision |
|---|---|
| Qualités vidéo | **360p, 480p, 720p** ; pas de 1080p pour le moment |
| DRM | **Reporté** pour le lancement (jetons de lecture courts + restriction de domaine) |
| Liens de lecture | **5 minutes** de validité (réglage `playback_token` en base), **à confirmer par des tests réels** sur Bunny : pendant la lecture, après une pause, aux reprises et aux changements d'épisode |
| Réseau de diffusion Bunny | **Standard** pour commencer ; comparaison avec le réseau Volume pendant le pilote |
| Tarifs | 499 FCFA par épisode (référence) ; prix du Pass propre à chaque série (inchangé) |
| CinetPay | **Aucune activation réelle à 499 FCFA** sans confirmation écrite de compatibilité (contrainte « multiple de 5 » à lever) ; aucun prix modifié en silence |
| Maquette V2 | Référence visuelle et fonctionnelle : écrans réutilisés à l'identique par le site réel |

## Choix de la qualité par le spectateur (validé : option A)
- Bouton dans la colonne de droite du lecteur, **entre « Épisodes » et « Plein écran »** ; libellé = mode en cours (« Auto », « 360p », « 480p », « 720p »).
- Modes : **Automatique (par défaut)**, Économie de données (360p, ≈ 10 Mo/épisode), Équilibré (480p, ≈ 17 Mo), Haute qualité (720p, ≈ 33 Mo) ; choix mémorisé sur l'appareil.
- Mode manuel + connexion insuffisante (2 coupures en 30 s ou une coupure de plus de 4 s) : **proposition** « Passer en automatique » / « Garder ce choix », sans interrompre la lecture ; jamais de changement silencieux.
- Petits écrans : boutons rapprochés sous 640 px de hauteur, libellés masqués (restent lus par les lecteurs d'écran) sous 480 px.
- Lecture native (Safari ancien) : la qualité imposée est appliquée en ouvrant directement la variante choisie de la playlist.

## Autorisation donnée
Étape **L1 uniquement** : brancher les écrans de la maquette V2 sur les données réelles et lire les épisodes gratuits avec les vidéos de démonstration.
**Exclus** jusqu'à nouvelle validation : intégration Bunny Stream, création de comptes externes, tout abonnement ou paiement, comptes clients, achats, paiements.

## Mise en œuvre de L1 (choix techniques)
- Droit de lecture : fonction unique `app.has_episode_access` (migration 0009), limitée aux épisodes gratuits et publics à cette étape ; étendue à l'étape L4 sans changer son nom.
- Simulateur vidéo : jeton **dans le chemin** de l'URL (comme l'authentification par jeton de Bunny), vérifié à chaque fichier ; refusé en production (variables, résolution du fournisseur et route).
- Moteur de diffusion : hls.js (HLS natif sur Safari/iPhone) ; renouvellement transparent du lien (les requêtes suivantes utilisent le jeton le plus récent ; une erreur 401/403 déclenche un renouvellement au lieu d'un abandon de qualité).
- Site réel : aucun paiement simulé ; les boutons d'achat affichent « Les achats ouvriront très bientôt ».
- Limite d'émission de liens : compteur en mémoire du serveur (suffisant en préproduction) ; rattaché au compte client et partagé entre serveurs à l'étape L4.
