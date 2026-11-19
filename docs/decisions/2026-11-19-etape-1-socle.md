# Décision technique — Étape 1 : socle technique

Date : 2026-11-19 · Statut : appliquée, en attente de validation de l'étape 1 par le fondateur

## Choix effectués

| Sujet | Choix | Raison |
|---|---|---|
| Framework | Next.js 15.5 (App Router), React 19, TypeScript strict | Version stable et éprouvée (Next 16 existe mais est plus récent) |
| Style | Tailwind CSS 4 + variables CSS (jetons) | Couleurs uniquement via jetons, thèmes sombre/clair sans dupliquer les styles |
| Polices | Figtree et Roboto auto-hébergées (paquets Fontsource) | Aucun appel à Google au chargement, meilleure performance et confidentialité |
| Thème | Cookie lu côté serveur | Pas de « flash » au chargement, pas de script en ligne (compatible avec une politique de sécurité stricte) |
| Base de données | Schéma dédié `app`, non exposé par l'API Supabase | Double protection : même la clé publique Supabase ne peut rien atteindre |
| Verrouillage | RLS activé partout, **aucune** politique, droits révoqués pour `anon`/`authenticated`, y compris par défaut pour les futures tables | Règle 5 de CLAUDE.md ; vérifié par tests et par sabotage volontaire |
| Migrations | Fichiers SQL numérotés + petit outil d'application (`npm run db:migrate`) | Simple, lisible, testable ; compatible avec Supabase |
| Base locale | PostgreSQL 16 installé localement (`npm run db:local`) ; PostgreSQL 16 en service dans la CI | Docker non nécessaire |
| Prestataires | Interfaces `PaymentProvider`, `SmsProvider`, `VideoProvider` + simulateurs | Aucune dépendance aux réponses commerciales (D-01) |
| Tests | Vitest (unitaires, base de données), Playwright (navigateur) | Voir DEVELOPMENT_ROADMAP §4 |

## Écarts et reports (assumés, à traiter plus tard)

| Point | Situation | Échéance |
|---|---|---|
| Content-Security-Policy complète | Seules les directives `frame-ancestors`, `base-uri`, `form-action`, `object-src` sont actives. La politique complète des scripts (avec nonces Next.js) sera ajoutée quand les premières routes serveur et le lecteur existeront | Étape 2 |
| Sentry | Non installé : rien à surveiller tant qu'il n'y a pas de route serveur | Étape 2 |
| Garde SEC-44 | En production avec un simulateur configuré, le serveur **refuse de servir toute page** (erreur 500) et journalise la cause, au lieu de s'arrêter complètement. Effet équivalent : le site est inutilisable avec une configuration dangereuse | Accepté |
| Garde SEC-44 côté base | Vérifier au démarrage qu'aucun compte de paiement `simulator` n'est actif en production | Étape 5 (quand les commandes existent) |
| Simulateur de paiement | Conserve ses transactions en mémoire | Persistance en base à l'étape 5 |
| Safari / iPhone | Les tests au format iPhone utilisent Chromium (seul navigateur installé ici) ; le vrai Safari sera testé sur appareil | Étape 9 (et dès qu'un lien de préproduction existe) |
| ESLint 9 | Signalé « plus maintenu » par npm ; la configuration Next.js 15 ne prend pas encore en charge ESLint 10 | À revoir lors d'une mise à jour de Next.js |
| Rôle `service_role` | En local et en CI, créé par la migration ; sur Supabase il existe déjà (la migration le détecte) | — |

## Point de déploiement Supabase à retenir

Lors de la création du projet Supabase, **ne pas** ajouter le schéma `app` à la liste des schémas exposés par l'API.
