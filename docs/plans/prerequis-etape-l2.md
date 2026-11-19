# Prérequis de l'étape L2 — Bunny Stream et préproduction en ligne

Statut : **présenté au fondateur, non validé**. Aucun compte créé, aucune dépense engagée, aucune intégration commencée.
Niveau de preuve des conditions commerciales : 🟡 pages officielles lues via moteur de recherche — **à vérifier sur la page d'inscription** de chaque service.

## 1. Comptes à créer (par vous)

| Service | Rôle dans L2 | Lien officiel | Offre à choisir | Coût |
|---|---|---|---|---|
| **Bunny.net** (Bunny Stream) | Héberger, encoder et diffuser les vidéos de façon protégée | https://bunny.net | Compte standard, une « Video Library » de test | Crédit d'essai sans carte (20 $, +30 $ si une carte est ajoutée) selon un article Bunny de février 2025 — **à confirmer** ; ensuite prépayé, **minimum 1 $/mois** ; usage L2 estimé ≈ 1 $/mois |
| **Supabase** | Base de données de préproduction | https://supabase.com | **Free** : 2 projets actifs, 500 Mo, mis en pause après 7 jours sans activité (données conservées) | 0 $ (Pro ≈ 25 $/mois, uniquement pour la production plus tard) |
| **Vercel** | Mettre la préproduction en ligne (adresse en `.vercel.app`) | https://vercel.com | ⚠️ L'offre gratuite « Hobby » est réservée à un usage **personnel ou non commercial** (conditions d'utilisation de Vercel). Agodjié TV étant un projet commercial, l'offre conforme est **Pro** | Pro : 20 $/mois par membre — **décision à prendre par vous** |
| GitHub | Déjà en place (dépôt relié) | — | — | 0 $ |

Recommandations de sécurité pour chaque compte : adresse e-mail de la société (pas personnelle si possible), mot de passe unique, **double authentification activée**.

## 2. Informations et fichiers à préparer

| Élément | Détails |
|---|---|
| **2 ou 3 vrais épisodes** | Format vertical 9:16, **1 min 50 maximum** chacun ; MP4 (H.264 + son AAC) de préférence en 1080×1920 ; avec le son |
| Image de chaque épisode | Verticale (JPG, 1080×1920 ou proche) — sinon une image extraite de la vidéo sera utilisée |
| Affiche de la série | Format 2:3 (ex. 1000×1500), JPG |
| Textes | Titre de la série et résumé ; titre (et résumé court) de chaque épisode ; épisodes gratuits / payants |
| Accord | Confirmation que ces épisodes peuvent être utilisés en préproduction (accès restreint aux testeurs) |

Pour cette étape, le plus simple est de déposer les vidéos **directement dans le tableau de bord Bunny** (glisser-déposer) ; vous me communiquerez ensuite leurs identifiants vidéo, qui ne sont pas secrets. Le téléversement depuis notre propre administration arrive à l'étape L5.

## 3. Ce que vous saisirez vous-même (jamais par message)

| Où | Quoi |
|---|---|
| Vercel → projet → Settings → Environment Variables (environnement **Preview**) | `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_CDN_TOKEN_KEY` (clé d'authentification par jeton), clé « lecture seule » de la bibliothèque (signature des notifications), `DATABASE_URL` (chaîne de connexion Supabase), `SIMULATOR_SIGNING_SECRET` (valeur aléatoire), `APP_ENV=preview`, `VIDEO_PROVIDER=bunny` |
| Bunny → Video Library → réglages (guidé pas à pas) | Authentification par jeton activée ; domaine autorisé = adresse de préproduction ; qualités 360p, 480p, 720p ; repli MP4 désactivé ; conservation du fichier original ; adresse de notification (webhook) |

Je vous fournirai, au moment voulu, une fiche « où cliquer » pour chacun de ces réglages.

## 4. Autorisations techniques qui vous seront demandées
- **Accès réseau de mon environnement de travail** vers les adresses de Bunny (actuellement bloquées ici) : une demande d'approbation s'affichera, avec la liste exacte des adresses.
- **Clé Bunny de test pour mes vérifications** : via le formulaire sécurisé de l'environnement (je ne vois jamais la valeur), uniquement si vous l'acceptez.

## 5. Ce que je ferai moi-même une fois les services connectés (après votre feu vert)
1. Adaptateur Bunny derrière l'interface `VideoProvider` : liens signés de 5 minutes couvrant la playlist et tous les segments.
2. Vérification **en conditions réelles** de la formule de signature (la documentation Bunny se contredit sur ce point).
3. Réception des notifications d'encodage **signées** (signature vérifiée, doublons ignorés), mise à jour de l'état de la vidéo et **de la durée réelle** (les limites strictes de format s'appliquent alors automatiquement).
4. Base de préproduction : application des migrations et des données de démonstration (jamais en production).
5. Mise en ligne de la préproduction et contrôle de la vérification automatique GitHub.
6. Tests réels : lien copié refusé après expiration et depuis un autre site ; lecture jusqu'au bout ; pause prolongée puis reprise ; changement d'épisode ; choix de qualité ; coupure réseau.
7. Mesure des volumes réellement diffusés et comparaison avec l'estimation de coûts.
8. Fiche de recette pour vos tests sur Android et **iPhone** (dont la lecture native des anciens modèles).

## Sources
- Bunny — essai gratuit par crédits : https://bunny.net/blog/improving-our-free-trial-more-flexibility-and-a-better-experience/
- Bunny — minimum de facturation : https://bunny.net/faq/
- Supabase — offres et limites : https://supabase.com/pricing ; mise en pause des projets gratuits : https://supabase.com/kb/faqs/platform/free-project-pausing
- Vercel — offres : https://vercel.com/pricing ; usage personnel/non commercial de Hobby : https://vercel.com/legal/terms et https://vercel.com/docs/plans/hobby
