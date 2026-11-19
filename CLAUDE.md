# CLAUDE.md — Règles du projet Agodjié TV

Plateforme de streaming TVOD de séries dramatiques africaines (dont productions IA), mobile d'abord, paiement Mobile Money.
Fondateur **non développeur** : explications en français, claires, sans jargon inutile. Ne jamais lui demander d'utiliser le terminal.

## Documents de référence (à lire avant toute tâche)

| Fichier | Rôle |
|---|---|
| `PROJECT_BRIEF.md` | Vision, modèle économique, **registre des décisions D-xx** (source unique) |
| `PRODUCT_REQUIREMENTS.md` | Exigences FR-xx, règles métier RM-xx, périmètre V1 et reports |
| `TECHNICAL_ARCHITECTURE.md` | Pile technique, flux de paiement, vidéo, variables d'environnement |
| `DATABASE_SCHEMA.md` | Modèle de données, fonctions SQL, RLS |
| `SECURITY_REQUIREMENTS.md` | Règles SEC-xx (non négociables) |
| `DESIGN_GUIDELINES.md` | Jetons de design, composants |
| `DEVELOPMENT_ROADMAP.md` | Étapes et critères de sortie |
| `LAUNCH_CHECKLIST.md` | Prérequis de lancement, dépendances externes |

Si le code et ces documents divergent, **signaler l'écart** et mettre à jour le document après validation — ne pas laisser dériver silencieusement.

## État du projet

- Phase 1 (cadrage) terminée ; plan de développement en 11 étapes proposé (DEVELOPMENT_ROADMAP). **Validés** : D-01 (CinetPay + FedaPay, intégrations modulaires), D-02 (panafricain, activation progressive), D-03 (499 FCFA l'épisode en référence, prix du Pass propre à chaque série, prix par grille, aucune conversion automatique), principe de D-17, D-21 (Bénin par défaut, prix indicatifs), principe de D-22 (pilote multi-pays). Société exploitante : béninoise. Autres décisions : registre PROJECT_BRIEF §8 avec leur échéance.
- Décisions techniques de l'étape 1 et reports assumés : `docs/decisions/2026-11-19-etape-1-socle.md`.
- **Étape 1 validée** par le fondateur (2026-11-20).
- Décisions du 2026-11-20 (`docs/decisions/2026-11-20-comptes-google-email-lecteur-vertical.md`) : connexion **Google + e-mail/mot de passe** (pas de PIN, **aucun SMS**) ; numéro facultatif non vérifié ; liaison des comptes sans perte d'achats ; **lecteur vertical 9:16 sur mesure en défilement continu** (style vidéos courtes, adapté aux séries). La **maquette du lecteur** doit être validée avant de le coder.
- Décisions du 2026-11-21 (`docs/decisions/2026-11-21-series-sans-saisons-pass-serie.md`) : **pas de saisons** (série = histoire complète, 10 épisodes max, ~1 min 30, 1 min 50 max, 15 min max au total, calculé) ; **Pass série** (épisodes présents et futurs, sans expiration) + épisode à l'unité ; fin de série = autres séries + retour au catalogue. Principe de la maquette du lecteur validé ; **maquette v2 (sans saisons, pass série) livrée — `docs/recette/maquette-lecteur.md` — en attente de validation** avant de construire le lecteur complet.
- Décisions du 2026-11-22 (`docs/decisions/2026-11-22-limites-strictes-et-tarifs.md`) : limites de format **strictes** (publication bloquée au-delà de 10 épisodes, 1 min 50 par épisode, 15 min au total calculé sur **tous** les épisodes ; aucun contournement ; garanti par la base) ; tarifs 499 FCFA / épisode et Pass au prix propre à chaque série.
- **Maquette V2 du lecteur validée** par le fondateur : référence visuelle et fonctionnelle, à ne pas modifier arbitrairement. **Plan du véritable lecteur validé** (`docs/plans/plan-lecteur-reel.md`, décisions `docs/decisions/2026-11-23-lecteur-reel-choix-valides.md`, D-30). **Étape L1 validée** (écrans V2 branchés sur la base, lecture HLS des épisodes gratuits, simulateur vidéo) ; dépendances corrigées (0 vulnérabilité) ; **choix de qualité (option A) intégré — en attente de validation** ; L2 (Bunny) **non validée** ; ne pas commencer L2 (Bunny) ni comptes, achats, paiements, ni créer de compte externe ou engager un paiement sans accord.
- Étape 2 : maquettes du parcours complet (paiements simulés), puis site public et lecteur. Présenter chaque phase et attendre la validation.
- Les services externes non disponibles sont remplacés par des simulateurs (TECHNICAL_ARCHITECTURE §12), jamais activables en production.
- Ne jamais présenter une décision en attente comme validée.

## Pile prévue (sous réserve des vérifications des étapes 3, 6 et 7 de la feuille de route)

Next.js (App Router) + TypeScript · Tailwind · Supabase (Postgres, Storage, RLS, **Auth : Google + e-mail pour les clients, e-mail + TOTP pour les admins**, appelée côté serveur uniquement) · lecteur sur mesure (hls.js) en défilement vertical · Bunny Stream · CinetPay + FedaPay (adaptateurs derrière l'interface `PaymentProvider`, routage pays × moyen configurable en base) · Vercel · Sentry · Turnstile · Zod · Vitest · Playwright.

## Règles non négociables

1. **Aucun secret** dans le dépôt, le code navigateur ou les journaux. Seul `.env.example` (sans valeurs) est versionné. Rien de secret dans une variable `NEXT_PUBLIC_*`.
2. **Prix, règles d'accès, pays, devises, prestataires et routes de paiement en base**, jamais codés en dur. Montants en entiers, par grille tarifaire.
3. **Aucun droit d'accès accordé sur la foi du navigateur.** Uniquement après notification authentifiée **et** vérification via l'API du prestataire, dans `confirm_order_payment` (transaction atomique, idempotente).
4. **Le prix est toujours recalculé côté serveur.**
5. **Le navigateur ne parle jamais à la base.** RLS activé sur toutes les tables sans politique pour `anon`/`authenticated` ; tout passe par le serveur, qui filtre par client de la session.
6. **Vidéos payantes** : jamais d'URL permanente ; jeton court émis après `has_episode_access`. Clé de signature jamais exposée ; `video_id` absent des données de catalogue.
7. **Comptes** : Google et e-mail + mot de passe uniquement (SEC-01 à SEC-15) ; confirmation d'e-mail obligatoire avant tout achat ; aucun client Supabase dans le navigateur ; achats et bibliothèque rattachés à l'identifiant client, jamais à la méthode de connexion ; **aucune fonction dépendant d'un SMS**.
8. **Admin** : session Supabase + MFA `aal2` + rôle `staff_roles` vérifiés côté serveur sur chaque route/action ; actions sensibles dans `audit_logs`.
9. **Webhooks de paiement** : 200 seulement après traitement ; 500 en cas d'erreur temporaire ; notifications répétées retraitées sans effet de bord.
10. Ne pas inventer de capacités, tarifs ou formats d'API des prestataires. **Aucune capacité ni restriction n'est « confirmée » sans source officielle explicite ou réponse écrite du prestataire** ; utiliser les niveaux de preuve de TECHNICAL_ARCHITECTURE §5.1 et toujours citer la source.
11. **La consultation et les épisodes gratuits ne sont jamais bloqués** par l'état des paiements d'un pays. Le pays de paiement est confirmé par l'utilisateur, jamais déduit silencieusement du numéro ou de l'IP.
12. **Lecteur** : l'enchaînement automatique ne lance jamais un épisode payant non débloqué ni un paiement ; un **pass série** ne couvre que sa série (il n'existe pas de saisons) ; un client qui a le pass ne voit plus jamais de demande de paiement pour cette série ; vidéo jamais déformée ni recadrée abusivement.

## Méthode de travail

- Petites étapes vérifiables ; commit clair à chaque avancée ; push régulier sur la branche de travail.
- Tests obligatoires pour : droits d'accès, paiements (idempotence, falsification, montants), auth (limites, verrouillages), RLS, protection vidéo.
- **Ne jamais affirmer qu'un test passe sans l'avoir exécuté.** Rapporter les échecs tels quels.
- Ne jamais déclarer une fonctionnalité « sécurisée » ou « terminée » sans preuve.
- Données de test réalistes, uniquement hors production.
- Décisions techniques importantes documentées dans `docs/decisions/AAAA-MM-JJ-titre.md`.
- Quand un compte externe, une clé ou une approbation est nécessaire : expliquer précisément quoi, pourquoi, et où le fondateur doit le saisir (paramètres Vercel/Supabase), jamais par chat.

## Conventions (à appliquer dès l'étape 1)

- TypeScript strict ; validation Zod de toute entrée serveur.
- Modules métier : `catalog`, `auth`, `orders`, `payments`, `entitlements`, `playback`, `admin`, `analytics`.
- Schéma de base uniquement via migrations versionnées.
- Couleurs uniquement via jetons CSS ; jaune royal = action principale, rouge = destructif/critique.
- Textes d'interface en français, centralisés.
