# Agodjié TV — Modèle de données (proposition)

> Statut : Phase 1 — **proposition**, aucune table n'a été créée. Le SQL ci-dessous est illustratif ; les migrations réelles seront écrites et testées en phase de développement.
> Base cible : PostgreSQL (Supabase). Voir TECHNICAL_ARCHITECTURE.md.

---

## 1. Principes

1. **Les montants sont des entiers** dans la plus petite unité de la devise (XOF/XAF : 1 franc ; USD : 1 centime). Jamais de nombres à virgule pour l'argent.
2. **Les prix sont des données**, modifiables par l'admin, stockés par devise. Rien n'est codé en dur.
3. **Le prix payé est figé dans la commande** (RM-04).
4. **Les droits d'accès (`entitlements`) sont séparés des commandes** : une commande décrit une tentative de paiement ; un droit décrit ce que l'utilisateur possède. Un droit peut aussi venir d'un geste administrateur.
5. **Pas de saisons** : une série contient directement ses épisodes (10 au maximum). **Le pass série est un droit au niveau de la série**, pas une liste d'épisodes : les épisodes futurs sont couverts automatiquement (RM-02).
6. **L'idempotence est garantie par la base** (contraintes d'unicité), pas seulement par le code.
7. **Aucun secret d'authentification dans nos tables** : mots de passe et jetons sont gérés par Supabase Auth ; nos tables restent inaccessibles depuis le navigateur.
8. Identifiants `uuid`, horodatages `timestamptz` en UTC.

## 2. Schéma relationnel

```
auth.users (Supabase : identités Google / e-mail, clients et admins)
    ├──1 customers ──* orders *──1 (episode | series)
    │        │            └──* payment_events
    │        ├──* entitlements ──1 (episode | series)
    │        └──* playback_progress ──1 episode
    └──0..1 staff_roles

account_transfers (transferts d'achats entre deux comptes d'un client)
app_settings (réglages ajustables : pays d'affichage par défaut, seuils, limites)

series 1──* episodes                    (ordre 1 → N, 10 au maximum)
   series 1──* series_prices            (prix du pass et d'un épisode, par grille tarifaire)
   episodes 1──* episode_price_overrides (exceptions de prix)

markets ──* payment_routes *── payment_accounts *── payment_providers
markets *──1 price_lists 1──* series_prices / episode_price_overrides
audit_logs, playback_sessions (journaux)
```

## 3. Tables

### 3.1 Utilisateurs

Clients et administrateurs sont des utilisateurs **Supabase Auth** (`auth.users`) : Google et/ou e-mail + mot de passe (TECHNICAL_ARCHITECTURE §7). Les méthodes de connexion (identités) sont gérées par Supabase ; nos tables ne stockent **aucun** mot de passe ni jeton.

**`customers`** — profil applicatif d'un client, créé à sa première connexion.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK FK `auth.users(id)` **ON DELETE RESTRICT** | **identifiant stable** : toutes les commandes, droits, la bibliothèque et la progression y sont rattachés, quelle que soit la méthode de connexion (SEC-11) |
| display_name | text NULL | facultatif |
| phone_e164 | text NULL | **facultatif, non vérifié** (format E.164 contrôlé) ; jamais utilisé pour se connecter, récupérer un compte ou déduire le pays de paiement (SEC-15) |
| last_payment_country | text NULL FK markets | dernier pays de paiement **confirmé par le client** (proposé par défaut aux achats suivants) |
| is_tester | boolean DEFAULT false | autorise l'achat dans les pays au statut `pilot` (attribué par un admin) |
| status | text | `active` \| `blocked` \| `deleted` |
| terms_version | text | version des CGU acceptée |
| terms_accepted_at | timestamptz | |
| created_at, updated_at, last_seen_at | timestamptz | |

Règles :
- L'e-mail et son état de confirmation sont lus dans `auth.users` (source unique, pas de copie) ; un client dont l'e-mail n'est pas confirmé ne peut pas acheter (SEC-02).
- **Aucune suppression physique** : toutes les clés étrangères vers `customers` et `auth.users` sont en `ON DELETE RESTRICT` (un utilisateur ne peut pas être supprimé depuis le tableau de bord Supabase en emportant ses commandes). Suppression de compte = blocage Supabase + effacement de l'e-mail et des identités dans `auth.users` + `status = 'deleted'` + anonymisation du profil ; commandes conservées (obligation comptable).

**`account_transfers`** — transferts d'achats entre deux comptes d'un même client (FR-15, SEC-14), administrateur uniquement.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| from_customer_id, to_customer_id | uuid FK customers | différents |
| performed_by | uuid FK auth.users | administrateur |
| reason | text NOT NULL | motif et preuves |
| entitlements_moved | int | nombre de droits transférés |
| created_at | timestamptz | |

| status | text | `requested` (depuis le compte source) \| `confirmed` (depuis le compte cible) \| `approved` (admin) \| `rejected` |

Le transfert approuvé est une transaction unique (SEC-14) : droits actifs du compte source recréés sur la cible avec `source = 'transfer'` et `transfer_id` (sans doublon grâce aux index uniques), révoqués à la source ; progression déplacée ; compte source bloqué ; commandes en attente du compte source rattachées au transfert pour être créditées à la cible si elles sont payées ensuite.

**`staff_roles`** — administrateurs et éditeurs.

| Colonne | Type | Notes |
|---|---|---|
| user_id | uuid PK FK auth.users | compte Supabase Auth avec TOTP obligatoire |
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

**`episodes`**

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| series_id | uuid FK series | |
| number | int | position dans la série (1 → N, ordre de lecture) ; UNIQUE (series_id, number) ; réorganisable par l'admin |
| title, synopsis | text | |
| thumbnail_path | text | |
| duration_seconds | int | requis pour publier ; repère 90 s, limite 110 s (avertissement, réglages) |
| access_type | text | `free` \| `paid` |
| status | text | `draft` \| `scheduled` \| `published` \| `unpublished` |
| publish_at | timestamptz NULL | requis si `scheduled` |
| first_published_at | timestamptz NULL | date de première mise en ligne effective (sert à RM-07) |
| video_provider | text | `bunny` |
| video_id | text NULL | identifiant Bunny — **jamais exposé publiquement** |
| video_status | text | `none` \| `uploading` \| `processing` \| `ready` \| `error` |
| created_at, updated_at | | |

Visibilité publique d'un épisode : série `published` et épisode `published` **ou** (`scheduled` et `publish_at <= now()`).

**Durée totale** d'une série : **calculée** (somme des `duration_seconds` des épisodes publiés et programmés) par la fonction `series_format_report` (§4), jamais saisie. Les limites (10 épisodes, 110 s par épisode, 900 s au total) sont dans `app_settings` ; un dépassement produit un **avertissement** dans l'admin, à confirmer explicitement (journalisé) **[D-28]**.

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
| price_list_id | uuid NULL FK price_lists | requis dès que `payment_status` ≠ `unavailable` |
| payment_status | text | `unavailable` (achat impossible, « bientôt disponible ») \| `pilot` (achat réservé aux clients `is_tester`) \| `open` (achat pour tous) |
| providers_confirmation | jsonb | pour chaque prestataire : état des confirmations écrites A/B/C et lien vers la réponse (TECHNICAL_ARCHITECTURE §5.1) |
| opened_at | timestamptz NULL | |

Passage à `pilot` ou `open` refusé par la base tant que : au moins une route de paiement active existe pour ce pays, et tous les contenus payants publiés ont un prix dans la grille du pays. Les moyens s'activent ensuite route par route (`payment_routes.is_enabled`).

**`series_prices`** — prix d'une série, par grille.

| Colonne | Type | Notes |
|---|---|---|
| series_id | uuid FK | PK (series_id, price_list_id) |
| price_list_id | uuid FK | |
| episode_price | int NOT NULL CHECK > 0 | prix par défaut d'un épisode payant |
| pass_price | int NOT NULL CHECK > 0 | prix du **pass série** |
| updated_at, updated_by | | |

**`episode_price_overrides`** — exception pour un épisode précis.

| Colonne | Type | Notes |
|---|---|---|
| episode_id | uuid FK | PK (episode_id, price_list_id) |
| price_list_id | uuid FK | |
| price | int NOT NULL CHECK > 0 | |

Règles :
- Prix d'un épisode = exception s'il existe, sinon `series_prices.episode_price` de la grille du marché.
- Un épisode payant ne peut être publié que s'il a un prix dans **chaque grille utilisée par un pays `pilot` ou `open`** (FR-55).
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
| product_type | text | `episode` \| `series_pass` |
| episode_id | uuid NULL FK | |
| series_id | uuid NULL FK | |
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
| is_duplicate_payment | boolean DEFAULT false | payé alors que le contenu était **déjà couvert** (épisode possédé, ou pass de la série possédé) → à rembourser |
| created_at, paid_at, last_checked_at, updated_at | timestamptz | |

Contraintes :
- `CHECK` : exactement un de `episode_id` / `series_id` selon `product_type`.
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
| series_id | uuid NULL FK | |
| source | text | `purchase` \| `admin_grant` \| `transfer` |
| transfer_id | uuid NULL FK account_transfers | requis si `transfer` |
| order_id | uuid NULL FK | requis si `purchase` |
| granted_by | uuid NULL | admin si `admin_grant` |
| reason | text NULL | obligatoire si `admin_grant` |
| revoked_at | timestamptz NULL | remboursement / sanction |
| revoked_reason | text NULL | |
| created_at | timestamptz | |

Contraintes :
- `CHECK` : exactement un de `episode_id` / `series_id`.
- Index uniques partiels : `(user_id, episode_id) WHERE revoked_at IS NULL` et `(user_id, series_id) WHERE revoked_at IS NULL`. **Ce sont eux qui empêchent un double droit**, même si deux notifications arrivent en même temps.
- Remboursement d'une commande : seul le droit dont `order_id` = cette commande est révoqué. Une commande en double n'a pas de droit propre : son remboursement ne retire rien.

### 3.6 Journaux

**`audit_logs`** — actions administrateur et événements de sécurité.

| Colonne | Type |
|---|---|
| id bigint PK, actor_id uuid, action text, target_type text, target_id text, details jsonb, ip_hash text, created_at timestamptz |

Écriture seule (pas de modification ni de suppression via l'application).

**`playback_progress`** — reprise de lecture (FR-37), clients connectés uniquement.

| Colonne | Type | Notes |
|---|---|---|
| user_id | uuid FK customers | PK (user_id, episode_id) |
| episode_id | uuid FK episodes | |
| position_seconds | int | |
| completed | boolean | vrai au-delà de ~95 % |
| updated_at | timestamptz | |

**`playback_sessions`** — un enregistrement par jeton de lecture émis (statistiques « top épisodes », détection d'abus).

| Colonne | Type |
|---|---|
| id bigint PK, episode_id uuid, user_id uuid NULL (anonyme pour les gratuits), created_at timestamptz |

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
| `order_limit_per_hour` | `10` | SECURITY §9 |
| `playback_token` | `{"validity_seconds": 300, "per_user_hour": 60}` | SEC-51, SEC-54 |
| `order_expiry_minutes` / `reconcile_window_hours` | `60` / `72` | TECHNICAL_ARCHITECTURE §5.9 |
| `progress_save_interval_seconds` | `10` | FR-37 |
| `series_max_episodes` | `10` | RM-09 |
| `episode_target_seconds` / `episode_max_seconds` | `90` / `110` | RM-09 |
| `series_max_total_seconds` | `900` | RM-09 |
| `format_limits_mode` | `"warn"` (`"block"` possible) | D-28 |

## 4. Fonctions SQL clés (logique au plus près des données)

| Fonction | Rôle | Appelée par |
|---|---|---|
| `has_episode_access(user_id, episode_id) → boolean` | Voir définition ci-dessous | `/api/playback`, bibliothèque, listes |
| `episode_price(episode_id, price_list_id) → int` | exception sinon prix de la série | checkout |
| `series_format_report(series_id)` | nombre d'épisodes, durée totale calculée, épisodes trop longs, dépassements (RM-09) | admin |
| `resolve_payment_route(country_code, method) → payment_account_id` | route active de plus haute priorité (compte et prestataire actifs) | checkout |
| `create_order(user_id, product_type, product_id, payment_country, method)` | vérifie FR-21, pays `open` (ou `pilot` + client testeur), route active ; fige grille, prix, devise, compte ; réutilise une commande `pending` récente identique | `/api/checkout` |
| `confirm_order_payment(order_id, payment_account_id, provider_tx_id, amount, currency)` | **transaction atomique** avec verrou sur la commande : vérifie compte/montant/devise (sinon `needs_review`), transition vers `paid` depuis un état autorisé (déjà `paid` → aucun effet), insère le droit `ON CONFLICT DO NOTHING`, marque `is_duplicate_payment` si le contenu était **déjà couvert** (même logique que `has_episode_access`, pas seulement une ligne identique) | webhook + réconciliation |
| `user_library(user_id)` | pass série + épisodes possédés + épisodes accessibles des séries possédées | page bibliothèque |

**Définition de `has_episode_access`** (un client peut lire un épisode si) :
1. l'épisode est **visible publiquement** (série et épisode publiés, ou épisode programmé dont la date est passée) **et** (il est gratuit **ou** le client a un droit actif sur l'épisode **ou** sur sa série) ; **ou**
2. l'épisode a été dépublié **après** avoir été mis en ligne (`first_published_at` non nul) **et** le client a un droit actif sur l'épisode ou sa série (RM-07 : les acheteurs conservent l'accès).

Un brouillon ou un épisode programmé non encore sorti n'est **jamais** lisible, même par un détenteur de pass. Un client bloqué n'a accès à rien.

**Visiteur sans compte** (`user_id` NULL) : seul le cas 1 avec un épisode **gratuit** s'applique ; tout épisode payant est refusé.

Sécurité des fonctions : droit d'exécution **retiré** à `PUBLIC`, `anon` et `authenticated` ; `SECURITY DEFINER` uniquement si nécessaire, avec `search_path` fixé. Appelées uniquement par le serveur.

## 5. Règles d'accès (Row Level Security)

**Principe : le navigateur ne parle jamais à la base.** Toutes les données passent par le serveur Next.js, qui applique les règles (session, statut du client, propriété des données, rôle admin).

- RLS **activé sur toutes les tables**, **aucune politique** pour les rôles `anon` et `authenticated` → la clé « anon » de Supabase ne donne accès à **rien** (elle n'est d'ailleurs utilisée que par notre serveur, pour l'authentification).
- Privilèges `SELECT/INSERT/UPDATE/DELETE` et `EXECUTE` révoqués pour `anon` et `authenticated` sur le schéma applicatif (double protection).
- Le serveur utilise la clé de service. Chaque module serveur filtre explicitement par `user_id` de la session (ex. « mes commandes ») ; ce filtrage est **testé**.
- Le `video_id` n'est jamais renvoyé dans les données du catalogue envoyées au navigateur.
- Les routes admin vérifient session Supabase + MFA `aal2` + `staff_roles` avant chaque action.
- **Tests obligatoires** : avec la clé publique, aucune table ni fonction n'est accessible ; client A ne voit jamais les données de B ; éditeur sans accès aux transactions ni aux données clients.

## 6. Statistiques (vues SQL)

- `v_sales_daily` : CA et nombre de commandes `paid` par jour et par devise.
- `v_sales_by_market` : ventes par pays, moyen de paiement et prestataire/compte ; taux d'échec par route.
- `v_sales_by_product` : ventes par série / épisode, épisodes vs pass série.
- `v_user_stats` : inscrits, nouveaux inscrits, acheteurs, conversion.
- `v_top_episodes` : lectures (playback_sessions) et ventes.

Le chiffre d'affaires n'additionne **jamais** des devises différentes.

## 7. Données de test

Un script de données réalistes (6 séries dont 1 disponible, épisodes gratuits et payants dans les limites de format, utilisateurs fictifs avec numéros de test, commandes dans tous les statuts) sera créé pour les environnements local et préproduction uniquement — **jamais en production**.
