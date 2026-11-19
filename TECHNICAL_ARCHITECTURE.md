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
| Authentification | **Supabase Auth** (OTP SMS) + **couche PIN sur mesure côté serveur** | Auth 100 % maison ; Clerk/Auth0 (pas de PIN, coût) |
| Paiement | **CinetPay** au lancement, module abstrait prêt pour **FedaPay** | Les deux dès le lancement |
| Vidéo | **Bunny Stream** (encodage, HLS adaptatif, CDN, jetons signés) | Mux (plus cher), Cloudflare Stream, AWS (complexe) |
| Images (affiches, vignettes) | **Supabase Storage** (bucket public en lecture) + optimisation d'images Next.js | Bunny Storage (à reconsidérer si coûts d'images élevés) |
| Anti-robot | **Cloudflare Turnstile** | reCAPTCHA (plus intrusif) |
| Envoi SMS (OTP) | Prestataire via Supabase (Twilio, Vonage, MessageBird…) ou via le *Send SMS Hook* pour un prestataire local **[D-16]** | — |
| Suivi des erreurs | **Sentry** (offre gratuite au départ) | — |
| Statistiques métier | **Requêtes SQL sur nos propres données** affichées dans l'admin | Outil BI externe |
| Mesure d'audience | **Vercel Web Analytics** ou **Plausible** (léger, sans cookie) — P1 | Google Analytics (lourd, consentement) |
| Tests | **Vitest** (logique), **Playwright** (parcours navigateur, mobile), tests SQL des règles d'accès | — |
| CI | **GitHub Actions** (lint, typage, tests à chaque push) | — |

### Pourquoi ces choix

- **Un seul projet Next.js** : pages publiques rendues côté serveur (rapides sur mobile, bien référencées), routes serveur pour les webhooks de paiement et la signature des vidéos, admin dans le même code. Une seule chose à déployer, à tester et à comprendre. C'est le facteur n°1 de maintenabilité pour une petite équipe.
- **Postgres (via Supabase)** : les achats, paiements et droits d'accès exigent des **transactions** et des **contraintes d'unicité** fiables — c'est exactement ce que fait une base relationnelle. Supabase fournit Postgres managé, sauvegardes, Auth, stockage et règles d'accès par ligne (RLS) sans serveur à administrer.
- **Bunny Stream** : couvre l'encodage, le streaming adaptatif HLS, les vignettes, un lecteur intégrable et l'authentification par jeton, à un coût bas. Voir §6.
- **Vercel** : déploiement automatique depuis GitHub, environnements de prévisualisation par branche, aucune administration serveur. Attention : le plan gratuit (Hobby) **interdit l'usage commercial** **[à vérifier dans les CGU Vercel]** → plan Pro requis en production.

### Ce qui est délibérément évité
- Microservices, files de messages, Kubernetes, serveurs à administrer.
- Accès direct du navigateur aux tables sensibles (paiements, droits) : **toutes les écritures sensibles passent par le serveur**.
- Dépendre d'un SDK de paiement non officiel.

## 2. Vue d'ensemble

```
                    ┌───────────────────────────────────────────┐
  Navigateur        │            Vercel — Next.js               │
  (mobile)  ───────►│  Pages publiques (SSR)  │  /admin          │
                    │  Routes serveur :                          │
                    │   • /api/auth/*   (OTP, PIN, sessions)     │
                    │   • /api/checkout (création commande)      │
                    │   • /api/webhooks/cinetpay|fedapay         │
                    │   • /api/playback/:episode (jeton vidéo)   │
                    │   • /api/cron/reconcile (paiements)        │
                    └──────┬───────────────┬──────────────┬──────┘
                           │ clé service    │ clés API     │ clé de signature
                           ▼ (serveur seul) ▼              ▼ (serveur seul)
                 ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
                 │ Supabase         │ │ CinetPay     │ │ Bunny Stream     │
                 │ Postgres + RLS   │ │ (FedaPay     │ │ encodage, HLS,   │
                 │ Auth (OTP SMS)   │ │  plus tard)  │ │ CDN, jetons      │
                 │ Storage (images) │ └──────┬───────┘ └────────┬─────────┘
                 └──────────────────┘        │ webhook          │ flux vidéo signé
                                             └──► /api/webhooks │
                                                                ▼
                                                          Navigateur
```

Principe : **le navigateur ne détient jamais de secret**. Il ne reçoit que des données publiques, sa propre session, et des jetons vidéo de courte durée.

## 3. Frontend

- Next.js App Router, composants serveur par défaut, composants client seulement là où il y a interaction (lecteur, formulaires, thème).
- Style : **Tailwind CSS** avec des jetons de design (variables CSS) définis dans DESIGN_GUIDELINES ; composants accessibles (bibliothèque de primitives type Radix/shadcn, adaptée au style de la marque — pas l'apparence par défaut).
- Polices **Figtree** et **Roboto** auto-hébergées via `next/font` (pas d'appel à Google au chargement, meilleure performance).
- Thème sombre par défaut, thème clair disponible, préférence mémorisée (cookie, pour éviter le flash au chargement).
- Validation des formulaires : schémas **Zod** partagés client/serveur (le serveur revalide toujours).

## 4. Backend et données

- Logique serveur dans les routes et *server actions* Next.js, regroupée dans des modules métier testables : `catalog`, `auth`, `orders`, `payments`, `entitlements`, `playback`, `admin`, `analytics`.
- Accès base :
  - **Lecture publique du catalogue** : clé publique Supabase + RLS (lecture seule des contenus publiés).
  - **Opérations sensibles** (commande, paiement, droit d'accès, admin) : côté serveur uniquement, avec la clé de service, à l'intérieur de **fonctions Postgres transactionnelles** quand l'atomicité compte (ex. « marquer payé + accorder le droit »).
- Région : choisir la même région pour Supabase et les fonctions Vercel, la plus proche de l'Afrique de l'Ouest/centrale disponible (probablement **Europe de l'Ouest, ex. Paris ou Francfort**) **[à vérifier : liste des régions Supabase/Vercel]**.
- Publication programmée : pas de tâche planifiée nécessaire ; un contenu est visible si `status = 'published'` **ou** `status = 'scheduled' AND publish_at <= now()`.
- Tâches planifiées (Vercel Cron) : réconciliation des paiements en attente (toutes les ~10 min), purge des tentatives de connexion expirées.

## 5. Paiements

### 5.1 Comparatif (sources publiques, à confirmer)

| Critère | CinetPay | FedaPay |
|---|---|---|
| Pays (encaissement) | Cameroun, Côte d'Ivoire, Bénin, Togo, Burkina Faso, Sénégal, Mali, Guinée, Niger, **RDC** (listes publiques divergentes selon les pages) | **Bénin, Côte d'Ivoire, Togo, Sénégal, Niger** — **pas le Cameroun ni la RDC** |
| Devises | XOF, XAF, CDF, USD (GNF selon les pages) | XOF |
| Mobile Money | Oui (opérateurs par pays à confirmer) | Oui : MTN, Moov, Celtiis (Bénin), Orange, Wave, etc. |
| Carte | Oui (à confirmer par pays) | Visa/Mastercard |
| Frais publics observés | Non publiés de façon fiable (chiffres tiers contradictoires : ~1 à 3,8 %) | Grille publique : ~1,8 % (MTN/Moov Bénin) à 4 % ; carte ~3,6 % ; une autre page indique 4 % |
| Confirmation | URL de notification (GET/POST) + en-tête `x-token` (HMAC-SHA256) + **API de vérification** du statut obligatoire ; notifications possiblement multiples | Webhooks signés (en-tête `X-FEDAPAY-SIGNATURE`, secret par endpoint, distinct test/live), jusqu'à 9 relances ; récupération de la transaction par API |
| Bibliothèque Node officielle | SDK communautaire uniquement **[à vérifier]** → appels HTTP directs | Bibliothèque Node officielle (`fedapay`) |
| Environnement de test | À confirmer | Mode test (sandbox) |

### 5.2 Recommandation **[D-01]**

**Lancer avec un seul prestataire.** Intégrer deux prestataires dès le départ double les tests, les cas d'erreur et le support, sans bénéfice si un seul couvre les pays de lancement.

- Si les pays de lancement incluent **Cameroun ou RDC** → **CinetPay** (FedaPay ne les couvre pas).
- Si le lancement est **Bénin + Côte d'Ivoire uniquement** → les deux conviennent. FedaPay a une bibliothèque officielle et des frais publics bas au Bénin ; CinetPay évite une migration lors de l'ouverture au Cameroun/RDC.
- **Recommandation globale : CinetPay**, car il couvre toute la cible avec un seul contrat. Ajouter FedaPay plus tard si ses frais au Bénin sont nettement meilleurs.
- **Préalable bloquant** : confirmer que l'entité juridique du fondateur est éligible chez le prestataire choisi (pays d'enregistrement, KYC, compte de reversement) **[D-09]**.

Le code utilisera une **interface commune** `PaymentProvider` (`createCheckout`, `verifyNotification`, `fetchTransactionStatus`) pour pouvoir brancher FedaPay sans toucher au reste.

### 5.3 Flux de paiement sécurisé

```
1. Client clique « Acheter »                         (navigateur)
2. POST /api/checkout {type, id}                      (serveur)
   - session valide ? contenu achetable ? déjà possédé ? (FR-21)
   - prix lu en base selon la devise → commande `pending` avec
     référence unique interne + montant figé
   - réutilise une commande `pending` récente identique (anti double-clic)
3. Serveur appelle le prestataire → URL de paiement
4. Redirection du client → page du prestataire → validation Mobile Money
5. Prestataire → POST /api/webhooks/<provider>        (serveur)
   a. authentifier la notification (signature / HMAC, comparaison à temps constant)
   b. enregistrer l'événement brut (payment_events, unicité → doublons ignorés)
   c. INTERROGER L'API du prestataire pour obtenir le statut réel
   d. vérifier : référence connue, montant = montant figé, devise identique
   e. transaction SQL unique : commande → `paid` (seulement depuis `pending`)
      + création du droit d'accès (ON CONFLICT DO NOTHING)
   f. répondre 200 rapidement
6. Navigateur revient sur /paiement/retour?order=… → interroge le serveur
   → affiche le statut réel (jamais déduit des paramètres d'URL)
7. Cron de réconciliation : toute commande `pending` > 10 min est revérifiée
   via l'API du prestataire (couvre les webhooks perdus)
```

Règles détaillées : SECURITY_REQUIREMENTS §5.

### 5.4 Échecs et remboursements
- Paiement échoué/annulé : commande `failed`/`cancelled`, aucun droit. L'utilisateur peut recommencer (nouvelle commande).
- Paiement reçu après expiration côté application : accepté s'il est vérifié et que le montant correspond (l'argent a été pris, le droit doit être accordé).
- Montant différent du montant figé : commande `needs_review`, pas de droit automatique, alerte admin.
- Remboursement : manuel via le tableau de bord du prestataire **[à vérifier : API de remboursement Mobile Money]** ; l'admin marque ensuite la commande `refunded`, ce qui révoque le droit.

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
4. Les identifiants vidéo et la clé de signature ne sont **jamais** exposés dans les pages publiques ; seule l'URL signée est renvoyée.
5. **Test obligatoire (pré-lancement)** : copier l'URL de playlist HLS depuis les outils du navigateur et vérifier qu'elle est refusée après expiration et depuis un autre domaine. Point à valider dans un prototype technique (DEVELOPMENT_ROADMAP, étape 0).

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

- **Supabase Auth** gère l'identité, les sessions (jetons d'accès courts + jetons de rafraîchissement, cookies `httpOnly`) et l'envoi d'OTP SMS.
- Le **PIN** est géré par **notre serveur** : haché (Argon2id + « poivre » secret), vérifié avec limitation stricte des tentatives.
- Mécanisme proposé, **à valider par prototype** : à l'inscription, le serveur définit pour l'utilisateur Supabase un mot de passe interne **dérivé** (`HMAC(secret_serveur, user_id)`, long et aléatoire en pratique), jamais connu de l'utilisateur. Après vérification réussie du PIN par notre serveur, celui-ci ouvre la session Supabase avec ce mot de passe interne. Ainsi, deviner le PIN directement auprès de Supabase est impossible : seul notre serveur, avec ses limites de tentatives, peut valider un PIN.
- Inscriptions directes auprès de Supabase depuis le navigateur : à désactiver ou neutraliser (toutes les inscriptions passent par nos routes).
- **Plan B** si le prototype échoue : sessions entièrement gérées par notre serveur (cookie signé) et accès base uniquement côté serveur.
- **Administrateurs** : comptes séparés, e-mail + mot de passe fort + TOTP (MFA Supabase) **[D-06]**.

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Clé publique (protégée par RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur** | Accès complet — jamais au navigateur |
| `PIN_PEPPER` | **serveur** | Secret ajouté au hachage des PIN |
| `AUTH_DERIVATION_SECRET` | **serveur** | Dérivation du mot de passe interne |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` | **serveur** | Paiement + vérification HMAC |
| `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` | **serveur** | Plus tard |
| `BUNNY_STREAM_LIBRARY_ID` | serveur | Bibliothèque vidéo |
| `BUNNY_STREAM_API_KEY` | **serveur** | Gestion des vidéos |
| `BUNNY_TOKEN_SECURITY_KEY` / `BUNNY_CDN_TOKEN_KEY` | **serveur** | Signature des URL |
| `TURNSTILE_SITE_KEY` (public) / `TURNSTILE_SECRET_KEY` (serveur) | mixte | Anti-robot |
| `SMS_PROVIDER_*` | **serveur** (dans Supabase) | Envoi OTP |
| `SENTRY_DSN` | public | Remontée d'erreurs |
| `CRON_SECRET` | **serveur** | Protection des routes cron |
| `APP_BASE_URL` | serveur | URL de retour paiement |

Un fichier `.env.example` (sans valeurs) sera créé au début du développement.

## 9. Observabilité
- **Sentry** : erreurs serveur et navigateur, sans données personnelles (numéros masqués).
- **Journal applicatif** des paiements : chaque événement prestataire est conservé (table `payment_events`).
- **Alertes** (P1) : commande `needs_review`, taux d'échec de paiement anormal, pic de tentatives de PIN.

## 10. Coûts mensuels indicatifs (à confirmer) **[D-12]**

| Poste | Ordre de grandeur |
|---|---|
| Vercel Pro | ~20 $/mois par membre |
| Supabase Pro | ~25 $/mois (le plan gratuit met en pause les projets inactifs : inadapté à la production) |
| Bunny Stream | à la consommation (stockage + diffusion), quelques $ à quelques dizaines de $ au départ |
| Sentry | gratuit au départ |
| SMS OTP | **variable et potentiellement important** : prix par SMS selon pays/opérateur ; à chiffrer **[D-16]** |
| Prestataire de paiement | commission par transaction |
| Nom de domaine | ~10–20 $/an |

## 11. Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Couche PIN au-dessus de Supabase Auth plus complexe que prévu | Retard | Prototype dès l'étape 0 ; plan B défini |
| Webhooks perdus ou retardés | Client payé sans accès | Réconciliation automatique + revérification manuelle admin |
| Coût SMS / fraude au SMS (« SMS pumping ») | Facture élevée | Turnstile, limites par numéro/IP/pays, liste blanche des indicatifs pays |
| Couverture réelle des opérateurs différente des pages publiques | Paiements impossibles dans un pays | Vérification écrite auprès du prestataire avant d'ouvrir un pays |
| Bande passante Afrique plus chère | Marges | Qualités adaptées, suivi des coûts mensuels |
| Pas de région cloud en Afrique | Latence | Pages légères, cache CDN, région Europe la plus proche |
