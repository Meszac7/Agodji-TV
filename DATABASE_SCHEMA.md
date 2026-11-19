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
customers 1──1 pin_credentials
    │ 1──* customer_sessions
    │ (otp_challenges : par numéro, avant même la création du compte)
    │
                              ├──* orders *──1 (episode | season)
                              │       │
                              │       └──* payment_events
                              │
                              └──* entitlements ──1 (episode | season)

auth.users (Supabase, admins uniquement) 1──1 staff_roles

series 1──* seasons 1──* episodes
   seasons 1──* season_prices          (prix par devise)
   episodes 1──* episode_price_overrides (exceptions de prix)

markets (pays → devise → prestataire)
auth_attempts, audit_logs, playback_sessions (journaux)
```

## 3. Tables

### 3.1 Utilisateurs

Les clients ne sont **pas** des utilisateurs Supabase Auth (voir TECHNICAL_ARCHITECTURE §7). Seuls les administrateurs le sont.

**`customers`** — un enregistrement par client.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | généré par la base |
| phone_e164 | text UNIQUE NOT NULL | ex. `+22990000000` ; vérifié par OTP |
| phone_verified_at | timestamptz | |
| display_name | text NULL | facultatif |
| country_code | text NOT NULL | ISO 3166-1 alpha-2, **déduit par le serveur** de l'indicatif vérifié ; détermine la devise — jamais modifiable par le client |
| status | text | `active` \| `blocked` \| `deleted` |
| terms_version | text | version des CGU acceptée |
| terms_accepted_at | timestamptz | |
| created_at, updated_at, last_login_at | timestamptz | |

**`pin_credentials`** — **serveur uniquement** (aucune politique RLS d'accès client).

| Colonne | Type | Notes |
|---|---|---|
| user_id | uuid PK FK customers | |
| pin_hash | text NOT NULL | Argon2id + poivre (voir SECURITY_REQUIREMENTS §3) |
| pin_updated_at | timestamptz | |
| failed_count | int DEFAULT 0 | échecs consécutifs |
| locked_until | timestamptz NULL | verrouillage temporaire |
| hard_locked | boolean DEFAULT false | verrouillage nécessitant une réinitialisation par OTP |

**`customer_sessions`** — sessions de connexion des clients.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK customers | |
| token_hash | text UNIQUE | SHA-256 du jeton du cookie (le jeton lui-même n'est jamais stocké) |
| created_at, last_seen_at | timestamptz | |
| expires_at | timestamptz | ~90 jours glissants **[à valider]** |
| user_agent_summary | text | ex. « Android · Chrome », affiché dans « mes appareils » |

**`otp_challenges`** — codes SMS en cours.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| phone_e164 | text | |
| purpose | text | `signup` \| `pin_reset` |
| code_hash | text | haché, jamais en clair |
| attempts | int DEFAULT 0 | max 5 |
| expires_at | timestamptz | ~5 min |
| consumed_at | timestamptz NULL | usage unique |
| created_at | timestamptz | |

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
| user_id | uuid PK FK auth.users | compte admin Supabase Auth, distinct des clients |
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
| first_published_at | timestamptz NULL | date de première mise en ligne effective (sert à RM-07) |
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

Règle : prix d'un épisode = override s'il existe, sinon `season_prices.episode_price`. Un épisode payant ou une saison sans prix dans **chaque devise des marchés ouverts** ne peut pas être publié (FR-55). L'ouverture d'un nouveau marché (`is_enabled = true`) est refusée tant que des contenus payants publiés n'ont pas de prix dans sa devise.

### 3.4 Commandes, paiements, droits

**`orders`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | référence envoyée au prestataire (aléatoire, non devinable) |
| user_id | uuid FK customers | |
| product_type | text | `episode` \| `season_pass` |
| episode_id | uuid NULL FK | |
| season_id | uuid NULL FK | |
| currency | text | |
| amount | int | **figé** à la création |
| provider | text | `cinetpay` \| `fedapay` |
| provider_transaction_id | text NULL | UNIQUE (provider, provider_transaction_id) |
| status | text | `pending` \| `paid` \| `failed` \| `cancelled` \| `expired` \| `needs_review` \| `refunded` |
| status_reason | text NULL | |
| is_duplicate_payment | boolean DEFAULT false | payé alors que le contenu était **déjà couvert** (épisode possédé, ou pass de la saison possédé) → à rembourser |
| created_at, paid_at, last_checked_at, updated_at | timestamptz | |

Contraintes :
- `CHECK` : exactement un de `episode_id` / `season_id` selon `product_type`.
- Transitions autorisées uniquement (appliquées par une fonction SQL, jamais par le client) :
  - `pending → paid | failed | cancelled | expired | needs_review`
  - `failed | cancelled | expired → paid | needs_review` — **le prestataire a le dernier mot** : si son API confirme un paiement, la commande est créditée
  - `needs_review → paid | failed | refunded` (décision admin)
  - `paid → refunded`
- `expired` est posé par la tâche planifiée après 60 min sans paiement ; ces commandes restent revérifiées pendant 72 h (TECHNICAL_ARCHITECTURE §5.3).

**`payment_events`** — journal brut de chaque notification reçue.

| Colonne | Type | Notes |
|---|---|---|
| id | bigint PK | |
| provider | text | |
| event_key | text | identifiant de l'événement ou hachage du corps (indexé, **non unique** : une notification répétée est journalisée et retraitée sans effet de bord) |
| order_id | uuid NULL FK | |
| signature_valid | boolean | |
| payload | jsonb | corps reçu (sans données de carte — les prestataires n'en envoient pas) |
| verified_status | text NULL | statut obtenu par l'API de vérification |
| processing_result | text | `granted` \| `already_paid` \| `not_paid` \| `amount_mismatch` \| `invalid_signature` \| `error` … |
| received_at, processed_at | timestamptz | |

**`entitlements`** — ce que l'utilisateur possède.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK customers | |
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
- Remboursement d'une commande : seul le droit dont `order_id` = cette commande est révoqué. Une commande en double n'a pas de droit propre : son remboursement ne retire rien.

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
| `has_episode_access(user_id, episode_id) → boolean` | Voir définition ci-dessous | `/api/playback`, bibliothèque, listes |
| `episode_price(episode_id, currency) → int` | override sinon prix saison | checkout |
| `create_order(user_id, product_type, product_id, currency)` | vérifie FR-21, fige le prix, réutilise une commande `pending` récente identique | `/api/checkout` |
| `confirm_order_payment(order_id, provider_tx_id, amount, currency)` | **transaction atomique** avec verrou sur la commande : vérifie montant/devise (sinon `needs_review`), transition vers `paid` depuis un état autorisé (déjà `paid` → aucun effet), insère le droit `ON CONFLICT DO NOTHING`, marque `is_duplicate_payment` si le contenu était **déjà couvert** (même logique que `has_episode_access`, pas seulement une ligne identique) | webhook + réconciliation |
| `user_library(user_id)` | passes + épisodes possédés + épisodes accessibles des saisons possédées | page bibliothèque |

**Définition de `has_episode_access`** (un client peut lire un épisode si) :
1. l'épisode est **visible publiquement** (série, saison et épisode publiés, ou épisode programmé dont la date est passée) **et** (il est gratuit **ou** le client a un droit actif sur l'épisode **ou** sur sa saison) ; **ou**
2. l'épisode a été dépublié **après** avoir été mis en ligne (`first_published_at` non nul) **et** le client a un droit actif sur l'épisode ou sa saison (RM-07 : les acheteurs conservent l'accès).

Un brouillon ou un épisode programmé non encore sorti n'est **jamais** lisible, même par un détenteur de pass. Un client bloqué n'a accès à rien.

Sécurité des fonctions : droit d'exécution **retiré** à `PUBLIC`, `anon` et `authenticated` ; `SECURITY DEFINER` uniquement si nécessaire, avec `search_path` fixé. Appelées uniquement par le serveur.

## 5. Règles d'accès (Row Level Security)

**Principe : le navigateur ne parle jamais à la base.** Toutes les données passent par le serveur Next.js, qui applique les règles (session, statut du client, propriété des données, rôle admin).

- RLS **activé sur toutes les tables**, **aucune politique** pour les rôles `anon` et `authenticated` → la clé publique Supabase ne donne accès à **rien**, même si quelqu'un l'extrait du site (elle n'est utilisée que pour la connexion des admins).
- Privilèges `SELECT/INSERT/UPDATE/DELETE` et `EXECUTE` révoqués pour `anon` et `authenticated` sur le schéma applicatif (double protection).
- Le serveur utilise la clé de service. Chaque module serveur filtre explicitement par `user_id` de la session (ex. « mes commandes ») ; ce filtrage est **testé**.
- Le `video_id` n'est jamais renvoyé dans les données du catalogue envoyées au navigateur.
- Les routes admin vérifient session Supabase + MFA `aal2` + `staff_roles` avant chaque action.
- **Tests obligatoires** : avec la clé publique, aucune table ni fonction n'est accessible ; client A ne voit jamais les données de B ; éditeur sans accès aux transactions ni aux données clients.

## 6. Statistiques (vues SQL)

- `v_sales_daily` : CA et nombre de commandes `paid` par jour et par devise.
- `v_sales_by_product` : ventes par série / saison / épisode, épisodes vs passes.
- `v_user_stats` : inscrits, nouveaux inscrits, acheteurs, conversion.
- `v_top_episodes` : lectures (playback_sessions) et ventes.

Le chiffre d'affaires n'additionne **jamais** des devises différentes.

## 7. Données de test

Un script de données réalistes (6 séries dont 1 disponible, saisons, épisodes gratuits et payants, utilisateurs fictifs avec numéros de test, commandes dans tous les statuts) sera créé pour les environnements local et préproduction uniquement — **jamais en production**.
