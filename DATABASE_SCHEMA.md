# Agodjié TV — Modèle de données (proposition)

> Statut : Phase 1 — **proposition**, aucune table n'a été créée. Le SQL ci-dessous est illustratif ; les migrations réelles seront écrites et testées en phase de développement.
> Base cible : PostgreSQL (Supabase). Voir TECHNICAL_ARCHITECTURE.md.

---

## 1. Principes

1. **Les montants sont des entiers** dans la plus petite unité de la devise (XOF/XAF : 1 franc ; USD : 1 centime). Jamais de nombres à virgule pour l'argent.
2. **Les prix sont des données**, modifiables par l'admin, stockés par devise. Rien n'est codé en dur.
3. **Le prix payé est figé dans la commande** (RM-04).
4. **Les droits d'accès (`entitlements`) sont séparés des commandes** : une commande décrit une tentative de paiement ; un droit décrit ce que l'utilisateur possède. Un droit peut aussi venir d'un geste administrateur.
5. **Le pass saison est un droit au niveau de la saison**, pas une liste d'épisodes. Les épisodes futurs sont donc couverts automatiquement (RM-02).
6. **L'idempotence est garantie par la base** (contraintes d'unicité), pas seulement par le code.
7. **Données sensibles isolées** : hachages de PIN et tentatives de connexion dans des tables inaccessibles depuis le navigateur.
8. Identifiants `uuid`, horodatages `timestamptz` en UTC.

## 2. Schéma relationnel

```
auth.users (Supabase) 1──1 profiles 1──1 pin_credentials
                              │
                              ├──* orders *──1 (episode | season)
                              │       │
                              │       └──* payment_events
                              │
                              ├──* entitlements ──1 (episode | season)
                              └──0..1 staff_roles

series 1──* seasons 1──* episodes
   seasons 1──* season_prices          (prix par devise)
   episodes 1──* episode_price_overrides (exceptions de prix)

markets (pays → devise → prestataire)
auth_attempts, audit_logs, playback_sessions (journaux)
```

## 3. Tables

### 3.1 Utilisateurs

**`profiles`** — un enregistrement par utilisateur (même `id` que `auth.users`).

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| phone_e164 | text UNIQUE NOT NULL | ex. `+22990000000` ; vérifié par OTP |
| phone_verified_at | timestamptz | |
| display_name | text NULL | facultatif |
| country_code | text NOT NULL | ISO 3166-1 alpha-2, déduit de l'indicatif |
| status | text | `active` \| `blocked` \| `deleted` |
| terms_version | text | version des CGU acceptée |
| terms_accepted_at | timestamptz | |
| created_at, updated_at, last_login_at | timestamptz | |

**`pin_credentials`** — **serveur uniquement** (aucune politique RLS d'accès client).

| Colonne | Type | Notes |
|---|---|---|
| user_id | uuid PK FK profiles | |
| pin_hash | text NOT NULL | Argon2id + poivre (voir SECURITY_REQUIREMENTS §3) |
| pin_updated_at | timestamptz | |
| failed_count | int DEFAULT 0 | échecs consécutifs |
| locked_until | timestamptz NULL | verrouillage temporaire |
| hard_locked | boolean DEFAULT false | verrouillage nécessitant une réinitialisation par OTP |

**`auth_attempts`** — **serveur uniquement**, sert à la limitation de débit.

| Colonne | Type | Notes |
|---|---|---|
| id | bigint PK | |
| kind | text | `pin_login` \| `otp_send` \| `otp_verify` \| `pin_reset` |
| phone_hash | text | HMAC du numéro (pas le numéro en clair) |
| ip_hash | text | HMAC de l'IP |
| success | boolean | |
| created_at | timestamptz | index ; purge après 30 jours |

**`staff_roles`** — administrateurs et éditeurs.

| Colonne | Type | Notes |
|---|---|---|
| user_id | uuid PK FK auth.users | compte admin distinct d'un compte client |
| role | text | `admin` \| `editor` |
| created_at, created_by | | |

### 3.2 Catalogue

**`series`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | URL lisible |
| title | text NOT NULL | |
| tagline | text | accroche courte |
| synopsis | text | |
| genres | text[] | |
| age_rating | text NULL | **[D-08]** |
| is_ai_generated | boolean | mention IA **[D-10]** |
| poster_path, banner_path | text | chemins Supabase Storage |
| status | text | `draft` \| `coming_soon` \| `published` \| `unpublished` |
| release_label | text NULL | ex. « Mars 2027 » pour `coming_soon` |
| is_featured | boolean | bannière d'accueil |
| sort_order | int | |
| created_at, updated_at | | |

**`seasons`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| series_id | uuid FK series | |
| number | int | UNIQUE (series_id, number) |
| title, description | text | |
| planned_episode_count | int NULL | affiché à l'achat du pass (RM-09) |
| status | text | `draft` \| `published` \| `unpublished` |
| created_at, updated_at | | |

**`episodes`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| season_id | uuid FK seasons | |
| number | int | UNIQUE (season_id, number) |
| title, synopsis | text | |
| thumbnail_path | text | |
| duration_seconds | int | |
| access_type | text | `free` \| `paid` |
| status | text | `draft` \| `scheduled` \| `published` \| `unpublished` |
| publish_at | timestamptz NULL | requis si `scheduled` |
| video_provider | text | `bunny` |
| video_id | text NULL | identifiant Bunny — **jamais exposé publiquement** |
| video_status | text | `none` \| `uploading` \| `processing` \| `ready` \| `error` |
| created_at, updated_at | | |

Visibilité publique d'un épisode : série `published`, saison `published`, et épisode `published` **ou** (`scheduled` et `publish_at <= now()`).

### 3.3 Prix et marchés

**`markets`** — pays ouverts à la vente.

| Colonne | Type | Notes |
|---|---|---|
| country_code | text PK | `BJ`, `CI`, `CM`, `CD`… |
| currency | text | `XOF`, `XAF`, `USD`/`CDF` |
| payment_provider | text | `cinetpay` (puis `fedapay`) |
| is_enabled | boolean | ouverture pays par pays **[D-02]** |

**`season_prices`** — prix par défaut d'une saison, par devise.

| Colonne | Type | Notes |
|---|---|---|
| season_id | uuid FK | PK (season_id, currency) |
| currency | text | |
| episode_price | int NOT NULL CHECK > 0 | prix par défaut d'un épisode payant |
| pass_price | int NOT NULL CHECK > 0 | prix du pass saison |
| updated_at, updated_by | | |

**`episode_price_overrides`** — exception pour un épisode précis.

| Colonne | Type | Notes |
|---|---|---|
| episode_id | uuid FK | PK (episode_id, currency) |
| currency | text | |
| price | int NOT NULL CHECK > 0 | |

Règle : prix d'un épisode = override s'il existe, sinon `season_prices.episode_price`. Un épisode payant sans prix dans la devise de l'utilisateur **n'est pas achetable** (et ne peut pas être publié, FR-55).

### 3.4 Commandes, paiements, droits

**`orders`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | référence envoyée au prestataire (aléatoire, non devinable) |
| user_id | uuid FK profiles | |
| product_type | text | `episode` \| `season_pass` |
| episode_id | uuid NULL FK | |
| season_id | uuid NULL FK | |
| currency | text | |
| amount | int | **figé** à la création |
| provider | text | `cinetpay` \| `fedapay` |
| provider_transaction_id | text NULL | UNIQUE (provider, provider_transaction_id) |
| status | text | `pending` \| `paid` \| `failed` \| `cancelled` \| `expired` \| `needs_review` \| `refunded` |
| status_reason | text NULL | |
| is_duplicate_payment | boolean DEFAULT false | payé alors que le droit existait déjà → à rembourser |
| created_at, paid_at, updated_at | timestamptz | |

Contraintes :
- `CHECK` : exactement un de `episode_id` / `season_id` selon `product_type`.
- Transitions autorisées uniquement : `pending → paid | failed | cancelled | expired | needs_review` ; `expired → paid` (paiement tardif vérifié) ; `paid → refunded` ; `needs_review → paid | failed | refunded`. Appliquées par une fonction SQL, pas par le client.

**`payment_events`** — journal brut de chaque notification reçue.

| Colonne | Type | Notes |
|---|---|---|
| id | bigint PK | |
| provider | text | |
| event_key | text | identifiant de l'événement ou hachage du corps ; UNIQUE (provider, event_key) |
| order_id | uuid NULL FK | |
| signature_valid | boolean | |
| payload | jsonb | corps reçu (sans données de carte — les prestataires n'en envoient pas) |
| verified_status | text NULL | statut obtenu par l'API de vérification |
| processing_result | text | `granted` \| `ignored_duplicate` \| `amount_mismatch` \| `invalid_signature` \| … |
| received_at, processed_at | timestamptz | |

**`entitlements`** — ce que l'utilisateur possède.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK profiles | |
| episode_id | uuid NULL FK | |
| season_id | uuid NULL FK | |
| source | text | `purchase` \| `admin_grant` |
| order_id | uuid NULL FK | requis si `purchase` |
| granted_by | uuid NULL | admin si `admin_grant` |
| reason | text NULL | obligatoire si `admin_grant` |
| revoked_at | timestamptz NULL | remboursement / sanction |
| revoked_reason | text NULL | |
| created_at | timestamptz | |

Contraintes :
- `CHECK` : exactement un de `episode_id` / `season_id`.
- Index uniques partiels : `(user_id, episode_id) WHERE revoked_at IS NULL` et `(user_id, season_id) WHERE revoked_at IS NULL`. **Ce sont eux qui empêchent un double droit**, même si deux notifications arrivent en même temps.

### 3.5 Journaux

**`audit_logs`** — actions administrateur et événements de sécurité.

| Colonne | Type |
|---|---|
| id bigint PK, actor_id uuid, action text, target_type text, target_id text, details jsonb, ip_hash text, created_at timestamptz |

Écriture seule (pas de modification ni de suppression via l'application).

**`playback_sessions`** — un enregistrement par jeton de lecture émis (statistiques « top épisodes », détection d'abus).

| Colonne | Type |
|---|---|
| id bigint PK, episode_id uuid, user_id uuid NULL (anonyme pour les gratuits), created_at timestamptz |

## 4. Fonctions SQL clés (logique au plus près des données)

| Fonction | Rôle | Appelée par |
|---|---|---|
| `has_episode_access(user_id, episode_id) → boolean` | RM-01 : gratuit, ou droit épisode actif, ou droit saison actif sur la saison de l'épisode | `/api/playback`, bibliothèque, listes |
| `episode_price(episode_id, currency) → int` | override sinon prix saison | checkout |
| `create_order(user_id, product_type, product_id, currency)` | vérifie FR-21, fige le prix, réutilise une commande `pending` récente identique | `/api/checkout` |
| `confirm_order_payment(order_id, provider_tx_id, amount, currency)` | **transaction atomique** : vérifie montant/devise, transition `pending/expired → paid`, insère le droit `ON CONFLICT DO NOTHING`, marque `is_duplicate_payment` si le droit existait | webhook + réconciliation |
| `user_library(user_id)` | passes + épisodes possédés + épisodes publiés des saisons possédées | page bibliothèque |

Ces fonctions s'exécutent avec les droits du serveur ; elles ne sont pas exposées au rôle anonyme.

## 5. Règles d'accès (Row Level Security)

RLS **activé sur toutes les tables**. Par défaut : tout refusé.

| Table | Anonyme | Utilisateur connecté | Serveur (clé service) |
|---|---|---|---|
| series / seasons / episodes | Lecture des lignes publiées uniquement, **sans** `video_id` (vue publique dédiée) | idem | Tout |
| season_prices / episode_price_overrides / markets | Lecture | Lecture | Tout |
| profiles | — | Lecture de **sa** ligne ; modification de `display_name` uniquement | Tout |
| pin_credentials, auth_attempts | — | — | Tout |
| orders | — | Lecture de **ses** commandes | Tout |
| entitlements | — | Lecture de **ses** droits | Tout |
| payment_events, audit_logs, playback_sessions, staff_roles | — | — | Tout |

- Aucune écriture client sur `orders`, `entitlements`, `payment_events` : elles passent toutes par le serveur.
- L'admin utilise des routes serveur qui vérifient `staff_roles` avant chaque action ; l'admin n'utilise pas de politique RLS « permissive » côté navigateur.
- Le `video_id` est exclu des vues publiques (protection contre la construction d'URL directes).
- **Tests obligatoires** : chaque politique est couverte par un test automatisé (anonyme, utilisateur A lisant les données de B, etc.).

## 6. Statistiques (vues SQL)

- `v_sales_daily` : CA et nombre de commandes `paid` par jour et par devise.
- `v_sales_by_product` : ventes par série / saison / épisode, épisodes vs passes.
- `v_user_stats` : inscrits, nouveaux inscrits, acheteurs, conversion.
- `v_top_episodes` : lectures (playback_sessions) et ventes.

Le chiffre d'affaires n'additionne **jamais** des devises différentes.

## 7. Données de test

Un script de données réalistes (6 séries dont 1 disponible, saisons, épisodes gratuits et payants, utilisateurs fictifs avec numéros de test, commandes dans tous les statuts) sera créé pour les environnements local et préproduction uniquement — **jamais en production**.
