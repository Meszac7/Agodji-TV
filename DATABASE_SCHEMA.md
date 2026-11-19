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
customers ──1 pin_credentials
    ├──* customer_sessions
    ├──* orders *──1 (episode | season)
    │       └──* payment_events
    └──* entitlements ──1 (episode | season)

otp_challenges (par numéro, avant même la création du compte)
app_settings (réglages ajustables : pays d'affichage par défaut, longueur du PIN, seuils)

auth.users (Supabase, admins uniquement) 1──1 staff_roles

series 1──* seasons 1──* episodes
   seasons 1──* season_prices          (prix par grille tarifaire)
   episodes 1──* episode_price_overrides (exceptions de prix)

markets ──* payment_routes *── payment_accounts *── payment_providers
markets *──1 price_lists 1──* season_prices / episode_price_overrides
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
| phone_country_code | text NOT NULL | pays de l'**indicatif** du numéro, déduit par le serveur. Sert à l'envoi des SMS et comme simple suggestion — **jamais** considéré comme pays de résidence ou de facturation |
| last_payment_country | text NULL FK markets | dernier pays de paiement **confirmé par le client** (proposé par défaut aux achats suivants) |
| is_tester | boolean DEFAULT false | autorise l'achat dans les pays au statut `pilot` (attribué par un admin) |
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
| video_orientation | text | `landscape` (16:9) \| `portrait` (9:16) — l'interface s'adapte **[D-07]** |
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

### 3.3 Marchés, devises et prix

**`currencies`**

| Colonne | Type | Notes |
|---|---|---|
| code | text PK | ISO 4217 : `XOF`, `XAF`, `CDF`, `USD`, `GNF` |
| minor_units | int | 0 pour XOF/XAF/GNF, 2 pour USD/CDF |
| display_label | text | ex. « FCFA », « $ », « FC », « GNF » |

**`price_lists`** — grilles tarifaires (une devise chacune).

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | ex. `XOF`, `XAF`, `RDC-USD` |
| currency | text FK currencies | |
| label | text | ex. « Afrique de l'Ouest (FCFA) » |

**`markets`** — pays connus de la plateforme. Un pays absent de cette table reste **consultable** (catalogue, épisodes gratuits) : la consultation ne dépend jamais de cette table.

| Colonne | Type | Notes |
|---|---|---|
| country_code | text PK | `BJ`, `CI`, `SN`, `TG`, `BF`, `ML`, `NE`, `CM`, `CD`, `GN`… |
| name | text | |
| phone_prefix | text | ex. `+229` |
| otp_enabled | boolean | envoi de SMS OTP autorisé vers cet indicatif (création de compte possible) — indépendant du paiement |
| price_list_id | uuid NULL FK price_lists | requis dès que `payment_status` ≠ `unavailable` |
| payment_status | text | `unavailable` (achat impossible, « bientôt disponible ») \| `pilot` (achat réservé aux clients `is_tester`) \| `open` (achat pour tous) |
| providers_confirmation | jsonb | pour chaque prestataire : état des confirmations écrites A/B/C et lien vers la réponse (TECHNICAL_ARCHITECTURE §5.1) |
| opened_at | timestamptz NULL | |

Passage à `pilot` ou `open` refusé par la base tant que : au moins une route de paiement active existe pour ce pays, et tous les contenus payants publiés ont un prix dans la grille du pays. Les moyens s'activent ensuite route par route (`payment_routes.is_enabled`).

**`season_prices`** — prix d'une saison, par grille.

| Colonne | Type | Notes |
|---|---|---|
| season_id | uuid FK | PK (season_id, price_list_id) |
| price_list_id | uuid FK | |
| episode_price | int NOT NULL CHECK > 0 | prix par défaut d'un épisode payant |
| pass_price | int NOT NULL CHECK > 0 | prix du pass saison |
| updated_at, updated_by | | |

**`episode_price_overrides`** — exception pour un épisode précis.

| Colonne | Type | Notes |
|---|---|---|
| episode_id | uuid FK | PK (episode_id, price_list_id) |
| price_list_id | uuid FK | |
| price | int NOT NULL CHECK > 0 | |

Règles :
- Prix d'un épisode = exception s'il existe, sinon `season_prices.episode_price` de la grille du marché.
- Un épisode payant ou une saison ne peut être publié que s'il a un prix dans **chaque grille utilisée par un pays `pilot` ou `open`** (FR-55).
- Tout prix est validé contre les contraintes des comptes de paiement routés pour les marchés de la grille (ex. multiple de 5 chez CinetPay hors USD — 🟢 documentation CinetPay, à reconfirmer en sandbox).

### 3.4 Prestataires, comptes et routes de paiement

**`payment_providers`** — prestataires connus du code (un adaptateur chacun).

| Colonne | Type | Notes |
|---|---|---|
| code | text PK | `cinetpay`, `fedapay`, `simulator` (développement et tests uniquement, refusé en production — SEC-44) |
| display_name | text | |
| is_enabled | boolean | interrupteur global |

**`payment_accounts`** — un contrat marchand chez un prestataire (un jeu d'identifiants, une URL de webhook).

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | ex. `cinetpay-bj`, `fedapay-bj` ; sert dans l'URL du webhook (`/api/webhooks/<prestataire>/<code>`) |
| provider_code | text FK payment_providers | |
| currencies | text[] | devises acceptées par ce contrat (une ou plusieurs, selon les réponses des prestataires) |
| environment | text | `sandbox` \| `live` |
| credentials_ref | text | préfixe des variables d'environnement (ex. `PAYACCT_CINETPAY_XOF`) — **aucune clé en base** |
| constraints | jsonb | ex. `{"amount_step": 5, "min_amount": 100}` (valeurs à confirmer par prestataire) |
| is_enabled | boolean | désactivé = plus de nouveaux paiements, vérifications maintenues |

**`payment_routes`** — quel compte encaisse quel moyen dans quel pays.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| country_code | text FK markets | |
| method | text | `mobile_money` \| `card` \| `wallet` |
| payment_account_id | uuid FK payment_accounts | la devise de la grille du pays doit figurer dans `currencies` du compte (contrainte) |
| priority | int | 1 = principal, 2 = secours… UNIQUE (country_code, method, priority) |
| operators_display | text[] | ex. `{MTN, Moov, Celtiis}` — affichage uniquement |
| is_enabled | boolean | |
| verified_at, verified_by | | date du dernier paiement réel de contrôle (porte qualité) |

Sélection : route `is_enabled` de plus petite `priority` dont le compte et le prestataire sont actifs.

### 3.5 Commandes, paiements, droits


**`orders`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | référence envoyée au prestataire (aléatoire, non devinable) |
| user_id | uuid FK customers | |
| product_type | text | `episode` \| `season_pass` |
| episode_id | uuid NULL FK | |
| season_id | uuid NULL FK | |
| payment_country | text FK markets | pays de paiement **confirmé par le client** (figé) |
| payment_method | text | `mobile_money` \| `card` \| `wallet` |
| price_list_id | uuid FK | grille appliquée (figée) |
| currency | text | |
| amount | int | **figé** à la création |
| payment_account_id | uuid FK payment_accounts | compte qui encaisse (figé) |
| provider | text | `cinetpay` \| `fedapay` \| `simulator` (dénormalisé pour les filtres ; `simulator` impossible en production) |
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
- `expired` est posé par la tâche planifiée après 60 min sans paiement ; ces commandes restent revérifiées pendant 72 h (TECHNICAL_ARCHITECTURE §5.9).

**`payment_events`** — journal brut de chaque notification reçue.

| Colonne | Type | Notes |
|---|---|---|
| id | bigint PK | |
| provider | text | |
| payment_account_id | uuid NULL FK | compte déduit de l'URL du webhook |
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

### 3.7 Réglages ajustables

**`app_settings`** — valeurs modifiables sans changer le code (CLAUDE.md règle 2). Modification réservée au rôle `admin`, journalisée.

| Colonne | Type | Notes |
|---|---|---|
| key | text PK | |
| value | jsonb | |
| updated_at, updated_by | | |

Réglages initiaux :

| Clé | Valeur initiale | Référence |
|---|---|---|
| `default_display_country` | `"BJ"` | D-21 |
| `pin_length` | `4` | D-04 (4 ou 6) |
| `pin_lock_soft` / `pin_lock_hard` | `{"failures": 5, "minutes": 15}` / `{"failures": 10}` | SEC-03 |
| `ip_login_limits` | `{"turnstile_after": 20, "block_after": 50, "per": "hour"}` | SEC-04 |
| `otp_limits` | `{"per_number_hour": 3, "per_number_day": 10, "validity_minutes": 5, "max_attempts": 5}` | SEC-11, SEC-12 |
| `sms_daily_budget_alert` | à définir | SEC-14 |
| `order_limit_per_hour` | `10` | SECURITY §9 |
| `playback_token` | `{"validity_seconds": 300, "per_user_hour": 60}` | SEC-51, SEC-54 |
| `order_expiry_minutes` / `reconcile_window_hours` | `60` / `72` | TECHNICAL_ARCHITECTURE §5.9 |
| `session_idle_days` | `90` | SEC-07 |

### 3.6 Journaux

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
| `episode_price(episode_id, price_list_id) → int` | exception sinon prix saison | checkout |
| `resolve_payment_route(country_code, method) → payment_account_id` | route active de plus haute priorité (compte et prestataire actifs) | checkout |
| `create_order(user_id, product_type, product_id, payment_country, method)` | vérifie FR-21, pays `open` (ou `pilot` + client testeur), route active ; fige grille, prix, devise, compte ; réutilise une commande `pending` récente identique | `/api/checkout` |
| `confirm_order_payment(order_id, payment_account_id, provider_tx_id, amount, currency)` | **transaction atomique** avec verrou sur la commande : vérifie compte/montant/devise (sinon `needs_review`), transition vers `paid` depuis un état autorisé (déjà `paid` → aucun effet), insère le droit `ON CONFLICT DO NOTHING`, marque `is_duplicate_payment` si le contenu était **déjà couvert** (même logique que `has_episode_access`, pas seulement une ligne identique) | webhook + réconciliation |
| `user_library(user_id)` | passes + épisodes possédés + épisodes accessibles des saisons possédées | page bibliothèque |

**Définition de `has_episode_access`** (un client peut lire un épisode si) :
1. l'épisode est **visible publiquement** (série, saison et épisode publiés, ou épisode programmé dont la date est passée) **et** (il est gratuit **ou** le client a un droit actif sur l'épisode **ou** sur sa saison) ; **ou**
2. l'épisode a été dépublié **après** avoir été mis en ligne (`first_published_at` non nul) **et** le client a un droit actif sur l'épisode ou sa saison (RM-07 : les acheteurs conservent l'accès).

Un brouillon ou un épisode programmé non encore sorti n'est **jamais** lisible, même par un détenteur de pass. Un client bloqué n'a accès à rien.

**Visiteur sans compte** (`user_id` NULL) : seul le cas 1 avec un épisode **gratuit** s'applique ; tout épisode payant est refusé.

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
- `v_sales_by_market` : ventes par pays, moyen de paiement et prestataire/compte ; taux d'échec par route.
- `v_sales_by_product` : ventes par série / saison / épisode, épisodes vs passes.
- `v_user_stats` : inscrits, nouveaux inscrits, acheteurs, conversion.
- `v_top_episodes` : lectures (playback_sessions) et ventes.

Le chiffre d'affaires n'additionne **jamais** des devises différentes.

## 7. Données de test

Un script de données réalistes (6 séries dont 1 disponible, saisons, épisodes gratuits et payants, utilisateurs fictifs avec numéros de test, commandes dans tous les statuts) sera créé pour les environnements local et préproduction uniquement — **jamais en production**.
