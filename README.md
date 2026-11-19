# Agodjié TV

Plateforme de streaming africaine indépendante dédiée aux séries dramatiques africaines, y compris des productions créées avec l'intelligence artificielle.

> **Statut : Phase 1 — cadrage.** Le développement de l'application n'a pas encore commencé.

## Documents du projet

| Document | Contenu |
|---|---|
| [PROJECT_BRIEF.md](PROJECT_BRIEF.md) | Vision, modèle économique, décisions en attente |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Exigences fonctionnelles |
| [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) | Architecture et choix techniques |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Modèle de données |
| [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md) | Système visuel |
| [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md) | Exigences de sécurité |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Feuille de route |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Checklist de lancement |
| [CLAUDE.md](CLAUDE.md) | Règles de développement |
| [docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md) | Questions écrites à CinetPay et FedaPay + suivi des réponses |

## Développement

Prérequis : Node.js 22, PostgreSQL 16 (local) — aucune clé externe n'est nécessaire grâce aux simulateurs.

| Commande | Rôle |
|---|---|
| `npm install` | Installer les dépendances |
| `npm run db:local` | Démarrer un PostgreSQL local (port 54329) |
| `DATABASE_URL=postgres://postgres@localhost:54329/postgres npm run db:migrate -- --demo` | Créer le schéma + données de démonstration |
| `APP_ENV=development npm run dev` | Lancer le site (guide de style : `/guide-de-style`) |
| `npm run check` | Lint + types + tests unitaires |
| `npm run test:db` | Tests de base de données (PostgreSQL local requis) |
| `npm run build && npm run test:e2e` | Tests navigateur (Playwright) |

Recettes du fondateur : `docs/recette/`. Décisions techniques : `docs/decisions/`.
