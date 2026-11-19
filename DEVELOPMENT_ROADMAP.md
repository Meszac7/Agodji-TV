# Agodjié TV — Feuille de route de développement

> Statut : Phase 1 terminée à la validation de ce document. Les durées ne sont pas estimées en jours tant que les décisions bloquantes ne sont pas prises ; l'ordre et les critères de sortie font foi.
> Chaque étape se termine par une **démonstration** au fondateur sur l'environnement de préproduction et un **push GitHub**.

---

## Vue d'ensemble

| Étape | Nom | Dépend de | Bloquée par (externe) |
|---|---|---|---|
| 0 | Prototypes techniques (*spikes*) | Validation Phase 1 | Comptes Supabase, Bunny, sandbox paiement |
| 1 | Fondations du projet | 0 | Compte Vercel |
| 2 | Catalogue public + épisodes gratuits | 1 | Contenus (affiches, vidéos de test) |
| 3 | Comptes : inscription / connexion | 1 | Prestataire SMS **[D-16]** |
| 4 | Achat et paiement (CinetPay + FedaPay, routage par pays) | 2, 3 | Accès sandbox **CinetPay et FedaPay** |
| 5 | Lecture protégée + bibliothèque | 4 | — |
| 6 | Administration | 2, 4 | — |
| 7 | Statistiques | 6 | — |
| 8 | Durcissement, sécurité, recette | 1–7 | — |
| 9 | Bêta fermée | 8 | Au moins un compte marchand **live** validé, domaine |
| 10 | Lancement | 9 | LAUNCH_CHECKLIST complète |

## Étape 0 — Prototypes techniques

Objectif : **lever les trois incertitudes majeures avant de construire**. Code jetable, dans un dossier `spikes/`, non déployé en production.

| Prototype | Question | Critère de réussite |
|---|---|---|
| S1 — Auth client maison | Inscription OTP, connexion PIN, sessions en base, verrouillages, réinitialisation, déconnexion globale : le module est-il simple, robuste et entièrement testable ? Choix et paramétrage d'Argon2id sur Vercel. | Parcours complet en local + tests automatisés des verrouillages et limites |
| S2 — Jetons Bunny | Un lien de lecture copié est-il refusé après expiration et depuis un autre domaine ? Un épisode entier se lit-il jusqu'au bout avec un jeton court ? Le lecteur intégré fonctionne-t-il sur Android/iOS ? Webhook d'encodage Bunny : format et authentification. | Démonstration enregistrée + résultat documenté |
| S3 — Paiement sandbox (les deux prestataires) | Pour **CinetPay et FedaPay** : création de paiement, présélection du moyen (Mobile Money / carte), notification, vérification par API, notifications répétées, échec puis nouvel essai réussi sur la même commande, annulation, contraintes de montant. L'interface `PaymentProvider` couvre-t-elle bien les deux sans cas particulier ? | Journal des appels sandbox + doc des formats réels (HMAC, signatures, statuts) + interface `PaymentProvider` figée |

Sortie : note de décision dans `docs/decisions/` pour chaque prototype.

## Étape 1 — Fondations

- Projet Next.js + TypeScript, Tailwind, jetons de design, polices, thèmes sombre/clair.
- Qualité : ESLint, Prettier, typage strict, Vitest, Playwright, GitHub Actions (lint + types + tests à chaque push).
- Supabase : projets **préproduction** puis production ; **migrations versionnées** du schéma (DATABASE_SCHEMA), RLS, fonctions SQL, tests des politiques.
- Données de test réalistes (préproduction uniquement).
- `.env.example`, en-têtes de sécurité, Sentry.
- Déploiement automatique de la préproduction sur Vercel.

**Sortie** : page d'accueil vide déployée, CI verte, tests RLS passants.

## Étape 2 — Catalogue public et épisodes gratuits

- Accueil (hero, rangées Disponible / Bientôt), catalogue, fiche série, saisons, liste d'épisodes avec badges.
- Lecture des épisodes gratuits via `/api/playback` (jeton signé, sans compte).
- Responsive mobile, images optimisées.

**Sortie** : un visiteur regarde un épisode gratuit sur mobile ; tests e2e mobile ; mesure de poids des pages.

## Étape 3 — Comptes

- Inscription (numéro → OTP → PIN), connexion, PIN oublié, déconnexion, déconnexion de tous les appareils.
- Limites de tentatives, PIN interdits, Turnstile, liste blanche des indicatifs.
- Retour au contexte d'origine après connexion.

**Sortie** : tests automatisés de SEC-01 à SEC-14 et SEC-25 (verrouillages, limites, messages neutres, suppression des sessions, client bloqué).

## Étape 4 — Achat et paiement

- Configuration en base : pays, grilles tarifaires, prestataires, comptes, routes (DATABASE_SCHEMA §3.3–3.4).
- Écran d'achat avec choix du pays de paiement et des moyens disponibles (FR-27 à FR-29), `create_order`, routage.
- **Deux adaptateurs** (CinetPay, FedaPay) derrière l'interface `PaymentProvider`, avec une **suite de tests commune** que chaque adaptateur doit passer (ajouter un prestataire = passer la même suite).
- Webhook authentifié + vérification API + `confirm_order_payment` atomique.
- Page de retour avec interrogation du statut, réconciliation planifiée.

**Sortie** — tests obligatoires :
- notification valide → un droit ;
- même notification ×5, et en parallèle → toujours un seul droit ;
- traitement interrompu (API prestataire en panne) → réponse 500, la relance suivante accorde le droit ;
- notification falsifiée → rejetée ;
- montant modifié → `needs_review` + alerte ;
- retour navigateur « succès » sans paiement → aucun droit ;
- webhook perdu → récupéré par la réconciliation ;
- commande `failed`/`expired` finalement payée → créditée ;
- épisode et pass de la même saison payés en même temps → doublon signalé ;
- remboursement d'un doublon → le droit d'origine est conservé ;
- achat d'un contenu déjà possédé → refusé ;
- notification authentifiée avec le secret d'un **autre** compte → rejetée ;
- route principale désactivée → bascule sur le secours ; aucune route → moyen masqué ;
- compte désactivé avec commandes en cours → celles-ci sont quand même vérifiées et créditées ;
- pays non ouvert ou moyen sans route → commande refusée par le serveur ;
- prix non conforme aux contraintes d'un compte (ex. pas multiple de 5) → refusé à la saisie.

## Étape 5 — Lecture protégée et bibliothèque

- `has_episode_access` appliqué à la lecture ; jetons courts ; limites d'émission.
- Bibliothèque : passes + épisodes ; nouvel épisode d'une saison possédée visible automatiquement.

**Sortie** : tests d'accès (sans droit / épisode / pass / pass + nouvel épisode / pass + brouillon ou épisode non sorti → refusé / épisode dépublié après achat → conservé / droit révoqué / client bloqué) ; test manuel de copie de lien (SEC-55).

## Étape 6 — Administration

- Accès admin séparé + TOTP ; contrôle de rôle serveur sur chaque action.
- Séries, saisons, épisodes, prix par devise, publication programmée, téléversement vidéo vers Bunny, état d'encodage, garde-fous de publication.
- Utilisateurs (masquage des numéros), bibliothèque, accès manuel motivé, blocage.
- Transactions : liste, détail, revérification, file « À traiter » (FR-73).
- Journal d'audit.

**Sortie** : le fondateur crée seul une série complète en préproduction, sans assistance technique.

## Étape 7 — Statistiques

- Vues SQL et tableau de bord : CA par devise, achats, épisodes vs passes, top séries/épisodes, utilisateurs, conversion.

**Sortie** : chiffres vérifiés contre les données de test connues.

## Étape 8 — Durcissement et recette

- Revue de sécurité indépendante (paiements, auth, RLS, vidéo, admin), correction des points relevés.
- Recette mobile sur appareils réels (Android entrée de gamme, iPhone), réseau 3G simulé.
- Accessibilité (contrastes, clavier, lecteurs d'écran de base).
- Vérification de chaque règle SEC-xx avec sa preuve.
- Sauvegardes : test de restauration de la base.

## Étape 9 — Bêta fermée

- Production avec paiements **live**, accès limité à un petit groupe (amis, testeurs).
- Achats réels de faible montant, remboursements testés, suivi des coûts (SMS, bande passante, commissions).

## Étape 10 — Lancement

- LAUNCH_CHECKLIST intégralement cochée, décision « go » du fondateur.
- Surveillance renforcée la première semaine.

## Après la V1 (ordre indicatif)

1. Ouverture à l'achat de chaque pays restant dès que son contrat de paiement est validé **[D-09]** (processus LAUNCH_CHECKLIST §9, sans développement).
2. Prestataire supplémentaire pour les pays CEMAC non couverts **[D-19]** (nouvel adaptateur).
3. Reprise de lecture, mode économie de données, PWA installable.
4. Notifications « nouvel épisode » (SMS/WhatsApp/push) selon coûts.
5. Codes promo / offres de lancement.
6. Lecteur sur mesure, filigrane dynamique.
7. Portefeuille prépayé ou abonnement, si les données le justifient.

## Règles de travail

- Petites étapes vérifiables, un push GitHub par avancée significative.
- Aucune étape n'est déclarée terminée sans tests exécutés et résultats rapportés.
- Toute décision technique importante est documentée (`docs/decisions/`).
- Les documents de cadrage sont mis à jour quand une décision change.
