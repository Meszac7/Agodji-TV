# Agodjié TV — Architecture technique

> Statut : Phase 1 — recommandations à valider. Aucun service n'est encore configuré.
> Les prix et capacités des prestataires cités proviennent de sources publiques consultées le 2026-11-19 ; ils sont **indicatifs** et doivent être confirmés directement auprès de chaque prestataire (voir LAUNCH_CHECKLIST).

---

## 1. Résumé de la pile recommandée

| Besoin | Choix recommandé | Alternative écartée (pour la V1) |
|---|---|---|
| Frontend + backend | **Next.js (App Router) + TypeScript**, un seul projet | SPA + API séparée (NestJS/Express) |
| Hébergement de l'application | **Vercel** (plan Pro, usage commercial) | VPS auto-administré, Netlify |
| Base de données | **Supabase Postgres** | Firebase (NoSQL, mauvais pour les transactions), MongoDB |
| Authentification clients | **Sessions serveur maison** (numéro + PIN + OTP SMS gérés par notre serveur) — voir §7 | Supabase Auth avec couche PIN (contournable, voir §7) ; Clerk/Auth0 (pas de PIN, coût) |
| Authentification admins | **Supabase Auth** e-mail + mot de passe + TOTP obligatoire | — |
| Paiement | **CinetPay + FedaPay** derrière une interface commune, routage par pays et moyen de paiement configurable (§5) | Un seul prestataire (couverture insuffisante pour une plateforme panafricaine) |
| Vidéo | **Bunny Stream** (encodage, HLS adaptatif, CDN, jetons signés) | Mux (plus cher), Cloudflare Stream, AWS (complexe) |
| Images (affiches, vignettes) | **Supabase Storage** (bucket public en lecture) + optimisation d'images Next.js | Bunny Storage (à reconsidérer si coûts d'images élevés) |
| Anti-robot | **Cloudflare Turnstile** | reCAPTCHA (plus intrusif) |
| Envoi SMS (OTP) | Prestataire SMS appelé **directement par notre serveur** (international type Twilio/Vonage ou agrégateur local) **[D-16]** | Fournisseur « phone » de Supabase Auth (contournerait nos limites anti-fraude) |
| Suivi des erreurs | **Sentry** (offre gratuite au départ) | — |
| Statistiques métier | **Requêtes SQL sur nos propres données** affichées dans l'admin | Outil BI externe |
| Mesure d'audience | **Vercel Web Analytics** ou **Plausible** (léger, sans cookie) — P1 | Google Analytics (lourd, consentement) |
| Tests | **Vitest** (logique), **Playwright** (parcours navigateur, mobile), tests SQL des règles d'accès | — |
| CI | **GitHub Actions** (lint, typage, tests à chaque push) | — |

### Pourquoi ces choix

- **Un seul projet Next.js** : pages publiques rendues côté serveur (rapides sur mobile, bien référencées), routes serveur pour les webhooks de paiement et la signature des vidéos, admin dans le même code. Une seule chose à déployer, à tester et à comprendre. C'est le facteur n°1 de maintenabilité pour une petite équipe.
- **Postgres (via Supabase)** : les achats, paiements et droits d'accès exigent des **transactions** et des **contraintes d'unicité** fiables — c'est exactement ce que fait une base relationnelle. Supabase fournit Postgres managé, sauvegardes, Auth (pour les admins), stockage et règles d'accès par ligne (RLS) sans serveur à administrer.
- **Bunny Stream** : couvre l'encodage, le streaming adaptatif HLS, les vignettes, un lecteur intégrable et l'authentification par jeton, à un coût bas. Voir §6.
- **Vercel** : déploiement automatique depuis GitHub, environnements de prévisualisation par branche, aucune administration serveur. Attention : le plan gratuit (Hobby) **interdit l'usage commercial** **[à vérifier dans les CGU Vercel]** → plan Pro requis en production.

### Ce qui est délibérément évité
- Microservices, files de messages, Kubernetes, serveurs à administrer.
- Accès direct du navigateur à la base : **le navigateur ne parle jamais à la base de données**. Toutes les lectures et écritures passent par notre serveur Next.js. Cela supprime toute une classe de failles (RLS mal écrite, colonnes sensibles exposées, fonctions SQL appelables depuis Internet).
- Dépendre d'un SDK de paiement non officiel.

## 2. Vue d'ensemble

```
                    ┌───────────────────────────────────────────┐
  Navigateur        │            Vercel — Next.js               │
  (mobile)  ───────►│  Pages publiques (SSR)  │  /admin          │
                    │  Routes serveur :                          │
                    │   • /api/auth/*   (OTP, PIN, sessions)     │
                    │   • /api/checkout (création commande)      │
                    │   • /api/webhooks/<prestataire>/<compte>   │
                    │   • /api/playback/:episode (jeton vidéo)   │
                    │   • /api/webhooks/bunny (état encodage)    │
                    │   • /api/cron/reconcile (paiements)        │
                    └──────┬───────────────┬──────────────┬──────┘
                           │ clé service    │ clés API     │ clé de signature
                           ▼ (serveur seul) ▼              ▼ (serveur seul)
                 ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
                 │ Supabase         │ │ CinetPay     │ │ Bunny Stream     │
                 │ Postgres + RLS   │ │ FedaPay      │ │ encodage, HLS,   │
                 │ Auth (admins)    │ │ (+ futurs)   │ │ CDN, jetons      │
                 │ Storage (images) │ └──────┬───────┘ └────────┬─────────┘
                 └──────────────────┘        │ webhook          │ flux vidéo signé
                                             └──► /api/webhooks │
                                                                ▼
                                                          Navigateur
```

Le serveur appelle aussi le **prestataire SMS** (OTP), non représenté.

Principe : **le navigateur ne détient jamais de secret et ne parle jamais à la base**. Il ne reçoit que des données publiques, un cookie de session opaque, et des jetons vidéo de courte durée.

## 3. Frontend

- Next.js App Router, composants serveur par défaut, composants client seulement là où il y a interaction (lecteur, formulaires, thème).
- Style : **Tailwind CSS** avec des jetons de design (variables CSS) définis dans DESIGN_GUIDELINES ; composants accessibles (bibliothèque de primitives type Radix/shadcn, adaptée au style de la marque — pas l'apparence par défaut).
- Polices **Figtree** et **Roboto** auto-hébergées via `next/font` (pas d'appel à Google au chargement, meilleure performance).
- Thème sombre par défaut, thème clair disponible, préférence mémorisée (cookie, pour éviter le flash au chargement).
- Validation des formulaires : schémas **Zod** partagés client/serveur (le serveur revalide toujours).

## 4. Backend et données

- Logique serveur dans les routes et *server actions* Next.js, regroupée dans des modules métier testables : `catalog`, `auth`, `orders`, `payments`, `entitlements`, `playback`, `admin`, `analytics`.
- Accès base : **uniquement depuis le serveur**, avec la clé de service, y compris pour le catalogue public (pages rendues côté serveur et mises en cache). Les opérations où l'atomicité compte (ex. « marquer payé + accorder le droit ») sont des **fonctions Postgres transactionnelles**.
- **RLS activé sur toutes les tables sans aucune politique** pour les rôles `anon` et `authenticated` : même si la clé publique Supabase est utilisée (connexion admin), elle ne donne accès à aucune donnée. Droit d'exécution des fonctions SQL retiré à `PUBLIC`, `anon` et `authenticated`.
- Région : choisir la même région pour Supabase et les fonctions Vercel, la plus proche de l'Afrique de l'Ouest/centrale disponible (probablement **Europe de l'Ouest, ex. Paris ou Francfort**) **[à vérifier : liste des régions Supabase/Vercel]**.
- Publication programmée : pas de tâche planifiée nécessaire ; un contenu est visible si `status = 'published'` **ou** `status = 'scheduled' AND publish_at <= now()`.
- Tâches planifiées (Vercel Cron) : réconciliation des paiements (§5.3), expiration des commandes, purge des tentatives de connexion, des OTP et des sessions expirés.
- Encodage vidéo : Bunny notifie `/api/webhooks/bunny` ; la notification sert seulement de **signal** — le serveur relit l'état de la vidéo via l'API Bunny avant de mettre à jour `video_status`. Bouton « actualiser l'état » dans l'admin en secours.

## 5. Paiements — architecture multi-prestataires et multi-marchés

> Orientation validée par le fondateur : **plateforme panafricaine**, **CinetPay et FedaPay intégrés tous les deux**, activation progressive des pays et des moyens de paiement. Voir PROJECT_BRIEF §8.
> **Règle de preuve** : aucune restriction ni capacité d'un prestataire n'est considérée comme **confirmée** tant qu'elle n'est pas établie par une source officielle explicite **ou** par une réponse écrite du prestataire. Les questions à envoyer sont prêtes dans [docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md).
> Les sites de documentation des prestataires n'ont pas pu être ouverts directement depuis l'environnement de travail (accès réseau bloqué) : les informations ci-dessous proviennent de résultats de recherche citant ces pages. Elles doivent être relues à la source.

### 5.1 Niveaux de preuve

| Symbole | Signification |
|---|---|
| ✅ | **Confirmé par écrit** par le prestataire (aucun à ce jour) |
| 🟢 | Mentionné par une **source officielle** du prestataire (documentation, centre d'assistance, CGU, page produit, dépôt GitHub officiel) — à reconfirmer pour notre compte |
| 🟡 | Source officielle **ancienne, ambiguë ou contradictoire** |
| 🟠 | Source **tierce** uniquement (blog, comparatif) |
| ⚪ | **Aucune information trouvée** — ce n'est **pas** une exclusion |

Trois questions distinctes, à ne jamais confondre :
- **A — Disponibilité technique** : le prestataire sait-il encaisser dans ce pays, avec quels moyens ?
- **B — Accès pour notre société béninoise** : une société immatriculée au Bénin peut-elle ouvrir un compte marchand et encaisser des clients de ce pays ?
- **C — Reversement** : les fonds encaissés dans ce pays peuvent-ils être reversés à notre société (compte bancaire ou Mobile Money au Bénin), dans quelle devise, à quel coût et en combien de temps ?

Un pays ne peut être ouvert à l'achat que si **A, B et C** sont confirmés (✅).

### 5.2 A — Disponibilité technique observée

| Pays | Devise | CinetPay | FedaPay | Carte bancaire |
|---|---|---|---|---|
| Bénin | XOF | 🟢 pays listé ; opérateurs non détaillés | 🟢 MTN, Moov, Celtiis, Coris Money, BMO | 🟢 les deux mentionnent Visa/Mastercard ; disponibilité par pays ⚪ |
| Côte d'Ivoire | XOF | 🟢 Orange, MTN, Moov, Wave | 🟢 MTN, Moov, Orange, Wave | idem |
| Sénégal | XOF | 🟢 pays listé ; opérateurs 🟠 | 🟢 Orange Money, Wave, Mixx by Yas | idem |
| Togo | XOF | 🟢 Moov, T-Money | 🟢 Moov, T-Money / Mixx by Yas | idem |
| Burkina Faso | XOF | 🟢 Orange, Moov, Wave | 🟡 présent dans une grille tarifaire | idem |
| Mali | XOF | 🟢 Orange, Moov | 🟡 Orange Money (doc v1, grille tarifaire) | idem |
| Niger | XOF | 🟡 Airtel cité sur une page | 🟢 Airtel Money | idem |
| **Guinée** | GNF | 🟢 Orange, MTN | 🟢 **listée par le centre d'assistance FedaPay** ; MTN dans la documentation des moyens de paiement. 🟡 Devise : GNF figure dans la liste des devises, mais la même documentation indique que seul le XOF est actuellement pris en charge pour les transactions | idem |
| Cameroun | XAF | 🟢 Orange, MTN | ⚪ | idem |
| RD Congo | CDF / USD | 🟢 Orange, Airtel, M-Pesa, Africell | ⚪ | idem |
| Gabon | XAF | ⚪ | ⚪ | ⚪ |
| Congo-Brazzaville | XAF | ⚪ (un blog tiers affirme une prise en charge 🟠) | ⚪ | ⚪ |
| Tchad | XAF | ⚪ | ⚪ | ⚪ |
| Centrafrique | XAF | ⚪ | ⚪ | ⚪ |
| Guinée équatoriale | XAF | ⚪ | ⚪ | ⚪ |
| Guinée-Bissau | XOF | ⚪ | ⚪ | ⚪ |

**Correction par rapport à la version précédente** : la Guinée chez FedaPay et les pays d'Afrique centrale ne sont **plus présentés comme non couverts**. L'absence d'information n'est pas une exclusion : ces pays font partie des questions écrites. Aucun pays n'est exclu définitivement sans réponse officielle.

### 5.3 B — Accès pour une société béninoise (indices, rien de confirmé)

| Indice trouvé | Source | Ce qu'il **pourrait** signifier | Statut |
|---|---|---|---|
| FedaPay : une entité immatriculée au RCCM du Bénin peut ouvrir un compte ; validation finale à la discrétion de FedaPay (KYC/KYB) | CGU FedaPay 🟢 | Ouverture d'un compte probable pour notre société | À confirmer : **dans quels pays** ce compte encaisse |
| CinetPay : la FAQ demande une entreprise établie dans le pays depuis lequel on veut encaisser | FAQ CinetPay 🟢 | Peut-être un compte par pays d'établissement — **ou** simplement le pays du compte marchand | **Interprétation à confirmer** |
| CinetPay : un compte « créé au Cameroun » ne peut initier des paiements qu'en XAF | Documentation CinetPay 🟢 (message d'erreur) | Un compte serait lié à une devise | À confirmer : un compte béninois peut-il encaisser en XAF, CDF, GNF, USD ? |
| CinetPay : liste des documents KYC définie par zone (Côte d'Ivoire, Mali, Sénégal, Cameroun) | FAQ CinetPay 🟢 | La liste citée ne mentionne pas le Bénin | À confirmer : procédure pour une société béninoise |

### 5.4 C — Reversement des fonds (indices, rien de confirmé)

| Indice trouvé | Source | Statut |
|---|---|---|
| FedaPay : reversement sur compte Mobile Money ou bancaire après 3 jours ouvrés | Page d'accueil FedaPay 🟢 | À confirmer pour notre compte et pour chaque pays d'encaissement |
| FedaPay : transferts vers Mobile Money activés sur demande au support | Centre d'assistance FedaPay 🟢 | À demander |
| CinetPay : le marchand doit ouvrir un compte bancaire dans tout pays hors UEMOA | CGU CinetPay 🟢 (formulation générale) | **Interprétation à confirmer** : impact sur les encaissements XAF/CDF/GNF d'une société béninoise |
| Fonds encaissés hors zone XOF : réglementation des changes (BEAC, Banque centrale du Congo, BCRG) | — | Question juridique (LAUNCH_CHECKLIST §4) |

### 5.5 Contraintes techniques utiles à la conception

Ces points concernent l'intégration ; ils restent à vérifier en sandbox (prototype S3).

| Point | Source | Conséquence de conception |
|---|---|---|
| CinetPay : paramètre `channels` = `ALL`, `MOBILE_MONEY`, `CREDIT_CARD`, `WALLET` | Documentation CinetPay 🟢 | On peut présélectionner la **famille** de moyen, pas l'opérateur |
| CinetPay : montant multiple de 5, sauf USD | Documentation CinetPay 🟢 | Contrainte de montant **par compte**, vérifiée à la saisie des prix |
| CinetPay : pays proposés sur la page de paiement selon la devise | Documentation CinetPay 🟢 | Le pays choisi chez nous doit être cohérent avec la devise du compte |
| FedaPay : présélection de l'opérateur par API seulement pour MTN | Documentation FedaPay v1 🟡 | L'utilisateur choisit son opérateur sur la page FedaPay |
| FedaPay : notifications signées `X-FEDAPAY-SIGNATURE`, jusqu'à 9 relances | Documentation FedaPay 🟢 | Authentification + idempotence (§5.9) |
| CinetPay : notification avec jeton HMAC `x-token`, vérification du statut par API obligatoire, notifications possiblement multiples | Documentation CinetPay 🟢 | Idem |

**L'architecture ne dépend d'aucune de ces hypothèses commerciales** : quelle que soit la réponse des prestataires (un compte pour tout, un compte par devise, un compte par pays), elle se configure sans changer le code (§5.6).

### 5.6 Architecture : prestataires interchangeables et activation progressive

Trois niveaux, tous **configurables en base depuis l'admin**, sans modification du code :

```
Prestataire (code)          Compte de paiement (contrat)        Route (pays × moyen)
┌──────────────┐            ┌───────────────────────────┐        ┌──────────────────────────────┐
│ cinetpay     │──1───*────►│ cinetpay-xof  (XOF, live) │◄──*────│ BJ · mobile_money · prio 2   │
│ fedapay      │            │ cinetpay-xaf  (XAF, live) │        │ BJ · mobile_money · prio 1 ──┼─► fedapay-xof
│ (futur : …)  │            │ fedapay-xof   (XOF, live) │        │ CM · mobile_money · prio 1   │
└──────────────┘            └───────────────────────────┘        │ GN · mobile_money · prio 1   │
  code = adaptateur           identifiants = variables            └──────────────────────────────┘
  (un module par               d'environnement (jamais en base)     priorité 1 = principal,
   prestataire)                                                     2 = secours
```

Les comptes ci-dessus sont des **exemples** : le nombre réel de comptes dépendra des réponses écrites (un seul compte multi-devises, un compte par devise ou par pays — tous les cas se configurent).

- **Adaptateur par prestataire** : un module par prestataire implémente l'interface commune `PaymentProvider` :
  - `createCheckout(order, account, method)` → URL de paiement
  - `authenticateNotification(request, account)` → notification authentique ou rejet
  - `fetchTransactionStatus(reference, account)` → statut, montant, devise réels (fait foi)
  - `capabilities(account)` → devises, moyens, contraintes de montant (ex. multiple de 5)
  - Ajouter un prestataire = écrire un nouvel adaptateur qui passe la suite de tests commune ; **rien d'autre ne change** (commandes, droits, admin, statistiques sont indépendants du prestataire).
- **Comptes de paiement** (`payment_accounts`) : un contrat marchand, une devise, un environnement (sandbox/live), une référence vers ses identifiants. Activable/désactivable.
- **Routes** (`payment_routes`) : pour chaque pays et chaque moyen (`mobile_money`, `card`, `wallet`), un compte principal et éventuellement un compte de secours, la liste des opérateurs à afficher, et la date du dernier paiement réel de contrôle.

**Activation progressive — trois niveaux indépendants** :

| Niveau | Qui en profite | Condition | Exemple |
|---|---|---|---|
| 1. Consultation | **Tout le monde, partout**, sans compte | Aucune — jamais bloquée par l'état des paiements | Catalogue, fiches, bandes-annonces, épisodes gratuits |
| 2. Création de compte (OTP SMS) | Numéros des indicatifs pour lesquels l'envoi de SMS est activé (`markets.otp_enabled`) | Prestataire SMS fiable et budget validé pour ce pays | Un utilisateur du Gabon peut créer un compte même si le paiement n'y est pas encore ouvert |
| 3. Achat | Pays de paiement au statut `pilot` (testeurs) ou `open` (tous), **et** au moins une route active pour le moyen choisi | A, B, C confirmés + paiement réel de contrôle (LAUNCH_CHECKLIST §9) | Bénin ouvert en Mobile Money, carte ajoutée plus tard |

Statut de paiement d'un pays : `unavailable` (achat impossible, message « bientôt disponible ») → `pilot` (achat réservé aux comptes testeurs) → `open`. Les moyens s'activent **route par route** : un pays peut être ouvert en Mobile Money avant la carte.

**Désactiver un prestataire, un compte ou une route** (panne, litige, frais) :
- les nouveaux paiements basculent automatiquement sur la route de secours, ou le moyen disparaît du pays s'il n'y en a pas ;
- **les commandes déjà en cours continuent d'être vérifiées** (webhooks et réconciliation restent actifs pour un compte désactivé tant qu'il a des commandes non finalisées) ;
- action journalisée dans `audit_logs`.

### 5.7 Choix du pays de paiement

Le pays du numéro de téléphone **n'est pas** le pays de résidence ni le pays de facturation : beaucoup d'utilisateurs ont des numéros de plusieurs pays, voyagent, ou paient avec le compte Mobile Money d'un proche. Le pays de paiement est donc **choisi par l'utilisateur**, avec une suggestion pour aller vite.

**Parcours :**

1. **Navigation (sans compte)** : les prix sont affichés pour un « pays d'affichage » estimé à partir de l'adresse IP (indication fournie par l'hébergeur), visible et modifiable en un geste : « Prix pour : Bénin ▾ ». Si le pays estimé n'est pas ouvert à l'achat ou est inconnu, les prix affichés sont ceux d'un pays ouvert par défaut avec la mention « Prix indicatif — choisissez votre pays au moment du paiement ».
2. **Premier achat** : un écran unique demande « **Dans quel pays se trouve votre compte Mobile Money ou votre carte ?** ». Une suggestion est présélectionnée, dans cet ordre : pays d'affichage choisi par l'utilisateur → pays estimé par IP → pays de l'indicatif du numéro. **L'utilisateur confirme d'un geste ou change.** Seuls les pays où l'achat est possible sont sélectionnables ; les autres apparaissent grisés « bientôt ».
3. **Achats suivants** : le dernier pays de paiement utilisé est rappelé (« Payer depuis : Côte d'Ivoire · Changer »). Pas de nouvelle question.
4. Changer de pays met à jour **immédiatement** le prix (grille du pays) et les moyens proposés, avant toute redirection.

Règles :
- Aucune de ces estimations (IP, indicatif) ne sert à facturer : **seul le pays confirmé par l'utilisateur** est utilisé, et **le serveur revalide** qu'il est ouvert et qu'une route existe.
- Le prestataire peut lui-même refuser un moyen de paiement d'un autre pays : dans ce cas la commande échoue proprement et l'utilisateur peut choisir un autre pays ou moyen.
- Un contenu acheté reste accessible quel que soit le pays où se trouve ensuite l'utilisateur (RM-12).
- Risque d'arbitrage (choisir le pays le moins cher) : faible tant que les grilles sont équivalentes ; à surveiller dans les statistiques par pays.

### 5.8 Devises et tarifs par marché

- **Grilles tarifaires** (`price_lists`) : une grille = une devise + un pas d'arrondi. Chaque marché pointe vers une grille. Exemple initial **[D-03]** :
  - `XOF` : pays UEMOA → 300 / 1 500 ;
  - `XAF` : pays CEMAC → 300 / 1 500 ;
  - `RDC` : USD ou CDF, montant à décider ;
  - `GNF` : Guinée, montant à décider.
- Plusieurs marchés partagent une grille (simple) ; un marché peut avoir sa propre grille si un prix local différent est souhaité (flexible), sans changer le code.
- Les prix sont saisis par saison et par grille (prix épisode, prix pass), avec exceptions possibles par épisode (DATABASE_SCHEMA §3.3).
- Les montants sont validés contre les contraintes de **tous les comptes de paiement** routés pour les marchés de la grille (ex. multiple de 5).
- Pas de conversion automatique de devises : chaque prix est saisi explicitement (évite les montants bizarres et les risques de change).
- Statistiques toujours **par devise**, jamais additionnées entre devises.

### 5.9 Flux de paiement sécurisé

```
1. Client choisit « Acheter », confirme son pays de paiement (§5.7)
   et le moyen                                                       (navigateur)
2. POST /api/checkout {produit, pays, moyen}                          (serveur)
   - session valide, client actif, contenu achetable, non possédé (FR-21)
   - pays au statut `open` (ou `pilot` et client testeur) ? route active pour (pays, moyen) ?
   - prix lu dans la grille du marché → commande `pending` avec
     référence unique, montant, devise, pays, moyen, compte de paiement figés
   - réutilise une commande `pending` récente identique (anti double-clic)
3. Adaptateur du prestataire → URL de paiement
4. Redirection du client → page du prestataire → validation (Mobile Money/carte)
5. Prestataire → POST /api/webhooks/<prestataire>/<compte>             (serveur)
   a. authentifier la notification avec le secret DE CE COMPTE
      (signature / HMAC, comparaison à temps constant) → sinon 401, journalisé
   b. journaliser l'événement brut (payment_events)
   c. INTERROGER L'API du prestataire (identifiants de ce compte) : statut réel
   d. vérifier : référence connue, compte = compte de la commande,
      montant = montant figé, devise identique
   e. si payé : confirm_order_payment (transaction SQL unique, idempotente) :
      commande → `paid` + droit d'accès (ON CONFLICT DO NOTHING)
   f. répondre 200 seulement APRÈS ces étapes ; 500 en cas d'erreur temporaire
      (API injoignable, base indisponible) pour que le prestataire réessaie.
   L'idempotence repose sur l'état de la commande et l'unicité des droits,
   pas sur le rejet des notifications déjà reçues.
6. Retour navigateur sur /paiement/retour?order=… → interroge le serveur
   → affiche le statut réel (jamais déduit des paramètres d'URL)
7. Cron de réconciliation (tous comptes, y compris désactivés) :
   - `pending` : revérifiées toutes les ~10 min ;
   - `pending` sans paiement après 60 min → `expired` ;
   - `expired`, `failed`, `cancelled` de moins de 72 h : revérifiées toutes les heures.
```

Règles détaillées : SECURITY_REQUIREMENTS §5.

### 5.10 Pays d'enregistrement de la société : ce qui reste à établir

La société est **béninoise** (information du fondateur). Rien n'est encore confirmé sur ce qu'une société béninoise peut faire chez chaque prestataire (§5.3, §5.4). C'est la question la plus structurante de l'orientation panafricaine, et elle n'est pas technique.

| Zone | Prestataires à interroger | Questions clés |
|---|---|---|
| UEMOA (XOF) | FedaPay, CinetPay | Un compte béninois encaisse-t-il dans les 8 pays UEMOA ? Avec quels opérateurs ? Reversement au Bénin ? |
| Guinée (GNF) | FedaPay, CinetPay | Encaissement en GNF ou conversion ? Reversement au Bénin en XOF ? |
| CEMAC (XAF) : Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale | CinetPay, FedaPay | Pays et opérateurs disponibles ? Compte béninois possible ou entité/compte bancaire locaux requis ? |
| RD Congo (CDF/USD) | CinetPay, FedaPay | Idem ; devise d'encaissement (USD ou CDF) ? |

Sujets juridiques associés (LAUNCH_CHECKLIST §4) : TVA sur les services numériques dans chaque pays ouvert, réglementation des changes (BCEAO, BEAC, Banque centrale du Congo, Banque centrale de Guinée), protection des données.

**Principe retenu** : l'architecture est panafricaine dès le premier jour. Chaque pays passe à l'achat dès que A, B et C sont confirmés (✅) et qu'un paiement réel de contrôle a réussi. En attendant, il reste pleinement consultable (niveau 1) et, si les SMS y sont activés, les utilisateurs peuvent y créer un compte (niveau 2).

### 5.11 Échecs et remboursements
- Paiement échoué/annulé : commande `failed`/`cancelled`, aucun droit. L'utilisateur peut recommencer (nouvelle commande, éventuellement avec un autre pays ou moyen).
- **Le prestataire a toujours le dernier mot** : une commande `expired`, `failed` ou `cancelled` passe à `paid` si l'API du prestataire confirme ensuite le paiement.
- Montant, devise ou compte différents de la commande : `needs_review`, pas de droit automatique, **alerte admin**.
- Paiement d'un contenu déjà couvert : commande `paid` marquée `is_duplicate_payment`, **alerte admin** pour remboursement.
- Remboursement : manuel via le tableau de bord du prestataire concerné **[à vérifier : API de remboursement Mobile Money]** ; l'admin marque ensuite la commande `refunded`, ce qui révoque **uniquement le droit créé par cette commande**.

## 6. Vidéo

### 6.1 Évaluation de Bunny Stream — **adapté à la V1**

| Besoin | Bunny Stream |
|---|---|
| Téléversement et gestion | Oui (interface + API, téléversement direct possible) |
| Streaming adaptatif | Oui (HLS, plusieurs résolutions) |
| Mobile | Oui (HLS natif iOS, lecteur web compatible Android) |
| Vignettes/aperçus | Générés automatiquement |
| Protection | **Jeton d'intégration** (`SHA256(clé + video_id + expiration)`) pour le lecteur iframe + **authentification par jeton CDN** pour les URL directes (playlists, segments, MP4, vignettes) ; restriction par domaine référent |
| Coûts (indicatifs) | Encodage standard inclus ; stockage ~0,01 $/Go/région ; diffusion Afrique/Moyen-Orient ~0,06 $/Go sur le réseau standard (plus cher que l'Europe ~0,01 $) |

**Estimation d'ordre de grandeur** (à recalculer avec la durée réelle des épisodes **[D-07]**) : un épisode de 10 min en 720p ≈ 100–150 Mo → ≈ 0,006–0,009 $ de diffusion par visionnage en Afrique, soit ~1 % à 2 % d'un prix de 300 FCFA (~0,46 €). Supportable. Les épisodes **gratuits** coûtent aussi en bande passante : à surveiller.

### 6.2 Mise en œuvre de la protection
1. Activer dans la bibliothèque Bunny : **authentification du jeton d'intégration**, **authentification par jeton CDN**, **domaines autorisés** (domaine de production uniquement), **désactiver le repli MP4** pour les épisodes payants si possible.
2. Le navigateur appelle `GET /api/playback/:episodeId`. Le serveur vérifie RM-01, puis génère une URL de lecture signée expirant après **quelques minutes** (recommandation Bunny : 1 à 5 min pour le jeton).
3. Les épisodes gratuits passent aussi par ce point (sans vérification de droit) : cela empêche l'intégration sauvage sur d'autres sites.
4. La clé de signature n'est **jamais** exposée. Les identifiants vidéo ne figurent pas dans les pages publiques ; en revanche, l'URL du lecteur intégré contient l'identifiant de la vidéo une fois la lecture autorisée. **Ce n'est pas un problème** : la protection repose sur les jetons (embed + CDN), pas sur le secret de l'identifiant.
5. **Tests obligatoires (prototype S2 puis pré-lancement)** :
   - copier l'URL de playlist HLS depuis les outils du navigateur → refusée après expiration et depuis un autre domaine ;
   - un épisode complet se lit jusqu'au bout même si sa durée dépasse la validité du jeton (vérifier comment le lecteur Bunny renouvelle l'accès aux segments ; ajuster la durée du jeton si nécessaire).

### 6.3 Limites honnêtes
- Aucun système ne peut empêcher **l'enregistrement d'écran** ou le filmage d'un écran. Les jetons empêchent le **partage de liens**, pas la copie par un utilisateur déterminé.
- Pendant la courte validité d'un jeton, un lien copié fonctionne.
- Un DRM complet (Widevine/FairPlay — Bunny propose une offre « MediaCage » **[à vérifier : prix et compatibilité]**) rend l'extraction des fichiers beaucoup plus difficile, mais n'empêche pas non plus l'enregistrement d'écran et ajoute coût et incompatibilités. **Reporté**, à réévaluer si du piratage est constaté.
- Mesures dissuasives possibles plus tard : filigrane visible avec le numéro partiellement masqué de l'acheteur.

### 6.4 Lecteur **[D-13]**
- **V1 recommandé** : lecteur intégré Bunny (iframe), couleurs personnalisées, signé côté serveur. Moins de code, moins de risques.
- **Plus tard** : lecteur sur mesure (ex. hls.js/Vidstack) si l'expérience souhaitée l'exige (contrôle total de l'interface, statistiques fines).

## 7. Authentification (résumé)

Détails et justification : SECURITY_REQUIREMENTS §3.

### 7.1 Clients : sessions serveur maison

**Pourquoi pas Supabase Auth pour les clients ?** Supabase Auth ne connaît pas le PIN. L'idée initiale (mot de passe interne dérivé, PIN vérifié par notre serveur) a été écartée après revue : les points d'accès publics de Supabase Auth (connexion par OTP SMS, changement de mot de passe ou de numéro depuis le navigateur) permettraient de **contourner le PIN** et nos limites anti-fraude SMS, et la fuite d'un seul secret de dérivation exposerait tous les comptes.

**Conception retenue (simple et maîtrisée) :**
- Table `customers` (numéro, statut) et `pin_credentials` (PIN haché **Argon2id + poivre**) dans notre base.
- **OTP SMS** : code généré par notre serveur, stocké **haché** avec expiration (`otp_challenges`), envoyé via le prestataire SMS ; limites SEC-11 à SEC-14 appliquées avant tout envoi.
- **Session** : à la connexion réussie, le serveur génère un jeton aléatoire de 256 bits, en stocke le **hachage** dans `customer_sessions`, et place le jeton dans un cookie `httpOnly`, `Secure`, `SameSite=Lax`. Chaque requête authentifiée vérifie la session **et** le statut du client.
- Conséquences directes : blocage d'un compte, changement de PIN ou « déconnexion de tous les appareils » = **suppression immédiate des sessions en base**, effet instantané.
- Code d'authentification limité, testé intégralement (prototype S1), sans bibliothèque cryptographique maison : Argon2id via une bibliothèque reconnue, aléa cryptographique du système.

### 7.2 Administrateurs : Supabase Auth
- Comptes **séparés** des clients, e-mail + mot de passe fort + **TOTP obligatoire** **[D-06]**.
- Chaque action admin vérifie côté serveur : session Supabase valide, **niveau MFA `aal2`**, rôle dans `staff_roles`.
- Configuration Supabase Auth durcie : inscriptions publiques **désactivées** (admins créés manuellement), fournisseur « phone » **désactivé**, changement de mot de passe sécurisé, limites de débit d'Auth actives (LAUNCH_CHECKLIST).

## 8. Environnements et configuration

| Environnement | Usage | Base | Paiement | Vidéo |
|---|---|---|---|---|
| Local | Développement | Supabase local ou projet de dev | Sandbox | Bibliothèque de test |
| Préproduction (*preview*) | Recette | Projet Supabase **séparé** | Sandbox | Bibliothèque de test |
| Production | Public | Projet Supabase de prod | Live | Bibliothèque de prod |

Variables d'environnement (noms indicatifs, aucune valeur dans le dépôt) :

| Variable | Côté | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Utilisée uniquement pour la connexion admin ; ne donne accès à aucune donnée (RLS sans politique) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur** | Accès complet — jamais au navigateur |
| `PIN_PEPPER` | **serveur** | Secret ajouté au hachage des PIN |
| `HASH_SECRET` | **serveur** | HMAC des numéros/IP dans les journaux |
| `PAYACCT_<CODE>_*` (ex. `PAYACCT_CINETPAY_XOF_API_KEY`, `…_SITE_ID`, `…_SECRET_KEY` ; `PAYACCT_FEDAPAY_XOF_SECRET_KEY`, `…_WEBHOOK_SECRET`) | **serveur** | Identifiants **par compte de paiement** ; la base ne stocke que le code du compte (`credentials_ref`), jamais les clés |
| `BUNNY_STREAM_LIBRARY_ID` | serveur | Bibliothèque vidéo |
| `BUNNY_STREAM_API_KEY` | **serveur** | Gestion des vidéos |
| `BUNNY_TOKEN_SECURITY_KEY` / `BUNNY_CDN_TOKEN_KEY` | **serveur** | Signature des URL |
| `TURNSTILE_SITE_KEY` (public) / `TURNSTILE_SECRET_KEY` (serveur) | mixte | Anti-robot |
| `SMS_PROVIDER_*` | **serveur** | Envoi OTP |
| `BUNNY_WEBHOOK_*` | **serveur** | Selon le mécanisme d'authentification proposé par Bunny **[à vérifier]** |
| `SENTRY_DSN` | public | Remontée d'erreurs |
| `CRON_SECRET` | **serveur** | Protection des routes cron |
| `APP_BASE_URL` | serveur | URL de retour paiement |

Un fichier `.env.example` (sans valeurs) sera créé au début du développement.

## 9. Observabilité
- **Sentry** : erreurs serveur et navigateur, sans données personnelles (numéros masqués).
- **Journal applicatif** des paiements : chaque événement prestataire est conservé (table `payment_events`).
- **Alertes P0 (dès le lancement)**, via les alertes e-mail de Sentry (aucun service supplémentaire) : commande `needs_review`, paiement en double (`is_duplicate_payment`), dépassement du budget SMS quotidien, erreurs du webhook de paiement.
- Alertes P1 : taux d'échec de paiement anormal, pic de tentatives de PIN, comptes verrouillés à répétition.

## 10. Coûts mensuels indicatifs (à confirmer) **[D-12]**

| Poste | Ordre de grandeur |
|---|---|
| Vercel Pro | ~20 $/mois par membre |
| Supabase Pro | ~25 $/mois (le plan gratuit met en pause les projets inactifs : inadapté à la production) |
| Bunny Stream | à la consommation (stockage + diffusion), quelques $ à quelques dizaines de $ au départ |
| Sentry | gratuit au départ |
| SMS OTP | **variable et potentiellement important** : prix par SMS selon pays/opérateur ; à chiffrer **[D-16]** |
| Prestataires de paiement | commission par transaction, variable selon pays/opérateur ; éventuels frais de compte ou d'abonnement par compte marchand **[à vérifier]** |
| Nom de domaine | ~10–20 $/an |

## 11. Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Erreur dans le code d'authentification maison | Comptes compromis | Périmètre réduit, prototype S1, tests exhaustifs, revue de sécurité indépendante |
| Webhooks perdus ou retardés | Client payé sans accès | Réconciliation automatique + revérification manuelle admin |
| Coût SMS / fraude au SMS (« SMS pumping ») | Facture élevée | Turnstile, limites par numéro/IP/pays, liste blanche des indicatifs pays |
| Couverture réelle des opérateurs différente des pages publiques | Paiements impossibles dans un pays | Vérification écrite auprès du prestataire et paiement réel de test avant d'ouvrir un marché |
| Conditions d'accès d'une société béninoise hors zone XOF inconnues | Certains pays non monétisables à court terme | Questions écrites envoyées tôt (§5.10) ; pays consultables en attendant ; partenaire local ou prestataire supplémentaire branchable via un nouvel adaptateur |
| Complexité de plusieurs prestataires et comptes | Plus de tests et de support | Interface commune, tests de contrat par adaptateur, sandbox par compte, routes désactivables |
| Bande passante Afrique plus chère | Marges | Qualités adaptées, suivi des coûts mensuels |
| Pas de région cloud en Afrique | Latence | Pages légères, cache CDN, région Europe la plus proche |
