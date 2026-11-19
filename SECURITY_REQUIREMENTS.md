# Agodjié TV — Exigences de sécurité

> Statut : Phase 1 — exigences de conception. Rien n'est encore implémenté ; **aucune mesure ci-dessous ne doit être considérée comme en place tant qu'elle n'a pas été testée.**
> Les identifiants **SEC-xx** sont référencés dans le code, les tests et la checklist de lancement.

---

## 1. Ce que nous protégeons

| Actif | Pourquoi c'est important |
|---|---|
| Argent des clients et revenus | Un faux paiement accepté = contenu volé ; un vrai paiement non crédité = client lésé |
| Droits d'accès (entitlements) | Cœur du modèle TVOD |
| Comptes utilisateurs | Accès à la bibliothèque et aux achats, données personnelles (e-mail, numéro facultatif) |
| Vidéos payantes | Valeur commerciale |
| Comptes administrateurs | Un admin compromis = contrôle total (prix, accès, données) |
| Secrets (clés API) | Permettent d'agir au nom de la plateforme |

## 2. Principaux scénarios de menace

| # | Menace | Mesures (sections) |
|---|---|---|
| T1 | Voler ou deviner le mot de passe d'un client | §3.1 |
| T2 | Prise de contrôle anticipée : créer un compte avec l'e-mail d'un autre avant lui | §3.2 |
| T3 | Perdre ses achats en changeant de méthode de connexion, ou fusion abusive de comptes | §3.2 |
| T4 | Faux « paiement réussi » envoyé par le navigateur ou un faux webhook | §5 |
| T5 | Webhooks répétés → doubles droits ou incohérences | §5 |
| T6 | Payer moins cher en modifiant le prix dans la requête | §5 |
| T7 | Partager l'URL d'une vidéo payante | §6 |
| T8 | Lire les achats ou données d'un autre utilisateur | §4 |
| T9 | Accéder à l'admin sans autorisation | §7 |
| T10 | Fuite d'une clé secrète (dépôt GitHub, code navigateur) | §8 |
| T11 | Injection, XSS, CSRF, clickjacking | §10 |
| T12 | Abus automatisés (robots, scraping, déni de service applicatif) | §9 |

## 3. Authentification : Google et e-mail + mot de passe

Décision : `docs/decisions/2026-11-20-comptes-google-email-lecteur-vertical.md`. **Aucune fonction ne dépend d'un SMS.** Clients et administrateurs utilisent **Supabase Auth** ; nos tables applicatives restent fermées au navigateur (§4).

### 3.1 Règles

| ID | Règle |
|---|---|
| SEC-01 | Méthodes de connexion clients : **Google** (OAuth via Supabase, flux PKCE) et **e-mail + mot de passe**. Aucune autre méthode active (téléphone, lien magique, autres réseaux) ; les fournisseurs non utilisés sont **désactivés** dans Supabase. |
| SEC-02 | **Confirmation d'e-mail obligatoire** (option Supabase « Confirm email » **activée**) : un compte e-mail + mot de passe non confirmé **ne peut pas se connecter** (aucune session), donc ni acheter, ni être lié, ni recevoir de droit. En attendant, l'utilisateur continue comme visiteur (épisodes gratuits). Notre serveur vérifie en plus `email_confirmed_at` avant tout achat. |
| SEC-03 | Mot de passe : **au moins 10 caractères** ; détection des mots de passe divulgués activée si l'offre Supabase le permet **[à vérifier]** ; jamais stocké ni journalisé par notre application (géré par Supabase). |
| SEC-04 | **Cloudflare Turnstile** sur l'inscription, la connexion et la demande de réinitialisation (protection anti-robot intégrée à Supabase Auth **[à vérifier : configuration]**) ; limites de débit de Supabase Auth actives. |
| SEC-05 | Messages d'erreur neutres (« E-mail ou mot de passe incorrect ») ; la demande de réinitialisation répond toujours « Si un compte existe, un e-mail a été envoyé ». |
| SEC-06 | Les appels d'authentification passent par **notre serveur** (actions serveur / routes) ; **aucun client Supabase n'est instancié dans le navigateur**. Retour OAuth sur une route serveur unique (`/auth/callback`) qui échange le code. URL de redirection autorisées limitées au domaine (liste blanche Supabase). |
| SEC-07 | Sessions : jetons Supabase dans des cookies `httpOnly`, `Secure`, `SameSite=Lax` **[option à vérifier]**, rafraîchis dans le middleware ; jeton d'accès court (~1 h) avec rotation du jeton de rafraîchissement ; durée d'inactivité maximale configurée **[à valider à l'étape 3]**. **Toute autorisation** vérifie le jeton auprès de Supabase (`getUser`) — jamais la simple lecture du cookie (`getSession`). |
| SEC-08 | Changement de mot de passe ou réinitialisation → **déconnexion des autres sessions**. Changement d'e-mail → confirmation sur l'**ancienne et la nouvelle** adresse (option « secure email change »). Actions sensibles du compte (changer d'e-mail, retirer une méthode) → **réauthentification récente**. |
| SEC-09 | Bouton « Se déconnecter de tous les appareils ». |
| SEC-10 | Événements de sécurité (connexion, échec, réinitialisation, liaison/retrait de méthode, transfert d'achats) journalisés sans mot de passe ni jeton. |

### 3.2 Liaison des comptes

| ID | Règle |
|---|---|
| SEC-11 | **Un client = un identifiant stable** (`auth.users.id` = `customers.id`). Commandes, droits, bibliothèque et progression référencent cet identifiant, jamais une méthode de connexion. |
| SEC-12 | Liaison automatique uniquement entre identités dont l'**e-mail est vérifié** (comportement de Supabase **à vérifier et tester** à l'étape 3). **Tests obligatoires dans les deux sens** : (a) un tiers crée d'abord un compte e-mail + mot de passe avec l'adresse de la victime, puis la victime se connecte avec Google → le tiers n'obtient aucun accès ; (b) la victime a un compte Google seulement, un tiers s'inscrit par e-mail + mot de passe avec la même adresse → la victime reçoit l'e-mail de confirmation, et **même si elle clique**, le mot de passe du tiers ne doit pas devenir une méthode de connexion de son compte. Si Supabase ne garantit pas (b), l'inscription par e-mail est **refusée par notre serveur** lorsqu'un compte existe déjà avec cette adresse (message neutre invitant à se connecter ou à réinitialiser). |
| SEC-13 | Liaison manuelle (ajouter Google, définir un mot de passe) : uniquement pour un client **connecté** et récemment réauthentifié. Retrait d'une méthode : seulement s'il en reste au moins une. |
| SEC-14 | Transfert d'achats entre deux comptes : demande faite **depuis le compte source** (réauthentification récente) et **confirmée depuis le compte cible**, puis approuvée par un administrateur (`admin`, jamais `editor`) avec motif et journal d'audit. Opération transactionnelle : droits recréés sur la cible avec `source = 'transfer'` (lien vers le transfert), révoqués à la source ; progression déplacée ; compte source **bloqué** ; commandes en attente du compte source revérifiées et, si payées ensuite, créditées au compte cible. Aucun droit perdu ni dupliqué. |

### 3.3 Numéro de téléphone

| ID | Règle |
|---|---|
| SEC-15 | Le numéro est **facultatif et non vérifié**. Il ne sert **jamais** à se connecter, à récupérer un compte, à lier des comptes ni à déterminer le pays de paiement. Validation de format (E.164) uniquement ; affiché « non vérifié ». |

### 3.4 Récupération de compte
- E-mail + mot de passe : lien de réinitialisation à usage unique et à durée courte (Supabase), envoyé à l'adresse confirmée.
- Google : la récupération relève de Google.
- Perte d'accès à l'adresse e-mail : procédure de support manuelle (preuves d'achat), action journalisée.
- Les e-mails partent d'un **service SMTP** configuré dans Supabase avec un domaine authentifié (SPF, DKIM) pour limiter l'usurpation et les indésirables **[D-24]**.

### 3.5 Administrateurs

| ID | Règle |
|---|---|
| SEC-16 | Administrateurs : **adresse e-mail dédiée** (jamais celle d'un compte client, jamais via Google — la connexion Google est refusée par notre serveur pour un compte `staff_roles`) + mot de passe fort (≥ 12 caractères) + **TOTP obligatoire** ; les actions de compte (e-mail, mot de passe, méthodes) exigent aussi `aal2` ; chaque action admin exige une session de niveau **`aal2`** et un rôle dans `staff_roles` (attribué uniquement par un autre admin ou par migration). Un client ne peut jamais s'attribuer un rôle. Nombre d'admins minimal ; rôle `editor` sans accès aux données personnelles ni aux transactions **[D-06]**. |

## 4. Accès aux données

| ID | Règle |
|---|---|
| SEC-20 | **Le navigateur ne parle jamais à la base.** RLS activé sur toutes les tables **sans politique** pour `anon`/`authenticated` ; privilèges de table et d'exécution de fonctions révoqués pour ces rôles (DATABASE_SCHEMA §5). |
| SEC-21 | Le serveur filtre systématiquement par l'identifiant du client de la session ; aucune donnée d'un autre client n'est jamais renvoyée. |
| SEC-22 | La clé `service_role` n'existe que côté serveur ; jamais dans une variable `NEXT_PUBLIC_*`. |
| SEC-23 | Les données de catalogue envoyées au navigateur n'incluent ni `video_id` ni champs internes ; l'identifiant vidéo n'apparaît que dans l'URL de lecture signée, une fois l'accès autorisé. |
| SEC-24 | Tests automatisés : clé publique sans aucun accès, client A vs données de B, éditeur vs transactions, client bloqué. |
| SEC-25 | Un client **bloqué** perd immédiatement l'accès : blocage dans Supabase Auth, révocation de ses sessions, et statut `customers.status` vérifié par notre serveur à chaque requête sensible (lecture payante, achat, progression) — le jeton d'accès encore valide ne suffit pas. |
| SEC-26 | Le pays de paiement est **confirmé par le client** à l'achat et **revalidé par le serveur** (statut du pays, statut testeur, route active). Ni l'indicatif du numéro ni la géolocalisation IP ne servent à facturer : ce sont de simples suggestions. |

## 5. Paiements

| ID | Règle |
|---|---|
| SEC-30 | **Le prix est calculé par le serveur** à partir de la base ; tout prix venant du navigateur est ignoré. |
| SEC-31 | **Aucun droit n'est accordé sur la base du retour navigateur** (URL de retour, paramètres de requête). |
| SEC-32 | Chaque notification arrive sur une URL propre au **compte de paiement** (`/api/webhooks/<prestataire>/<compte>`) et est **authentifiée avec le secret de ce compte** : CinetPay → vérification du jeton HMAC `x-token` ; FedaPay → signature `X-FEDAPAY-SIGNATURE` avec le secret de l'endpoint. Comparaison à temps constant. Format exact à confirmer dans la documentation officielle au moment de l'implémentation. |
| SEC-33 | Même authentifiée, une notification **déclenche une vérification par l'API du prestataire** (statut, montant, devise, référence). C'est le résultat de cette vérification qui fait foi. |
| SEC-34 | Montant, devise ou compte de paiement différents de ceux figés dans la commande → `needs_review`, pas de droit, alerte admin. |
| SEC-35 | **Idempotence** : unicité `(provider, provider_transaction_id)` sur les commandes, transition vers `paid` atomique avec verrou sur la commande, index uniques partiels sur les droits. Deux notifications simultanées produisent **un seul** droit. Les notifications répétées ne sont **pas rejetées** mais retraitées sans effet de bord, pour qu'un traitement interrompu ne soit jamais perdu. |
| SEC-36 | Référence de commande aléatoire et non devinable. |
| SEC-37 | Anti double-clic : une commande `pending` récente identique est réutilisée. Un second paiement effectif pour un droit déjà existant est marqué `is_duplicate_payment` pour remboursement. |
| SEC-38 | Réconciliation automatique des commandes `pending`, et des `expired`/`failed`/`cancelled` de moins de 72 h (le prestataire a le dernier mot) + revérification manuelle depuis l'admin. |
| SEC-39 | Les secrets live et sandbox sont différents et ne sont jamais mélangés entre environnements. Chaque compte de paiement a ses propres identifiants (variables d'environnement préfixées) ; la base ne contient que leur référence, jamais les clés. |
| SEC-40 | Le webhook ne répond 200 qu'**après** traitement complet ; en cas d'erreur temporaire il répond 500 pour provoquer une nouvelle tentative du prestataire. Aucune information interne dans la réponse ; erreurs journalisées et remontées (alerte P0). |
| SEC-41 | Remboursement : seul le droit lié à la commande remboursée est révoqué. |
| SEC-42 | Désactiver un prestataire ou un compte bloque les **nouveaux** paiements mais **jamais** la vérification des commandes en cours (webhooks et réconciliation restent actifs). |
| SEC-43 | Modification des pays, grilles, comptes, routes de paiement et du statut testeur réservée au rôle `admin`, avec confirmation et journalisation. |
| SEC-44 | Les simulateurs (paiement, vidéo) sont refusés en production : l'application ne démarre pas en production si un simulateur est configuré ou si un compte de paiement `simulator` est actif. Test automatisé obligatoire. |

## 6. Vidéos protégées

| ID | Règle |
|---|---|
| SEC-50 | Aucune URL vidéo permanente ou publique pour un épisode payant. |
| SEC-51 | Jeton de lecture émis par le serveur **après** vérification de `has_episode_access` (qui exclut brouillons et épisodes non sortis) ; validité de quelques minutes, compatible avec la lecture complète d'un épisode (vérifié à l'étape 6 de la feuille de route). |
| SEC-52 | Authentification par **jeton CDN** activée (playlists et segments HLS) ; domaines référents restreints ; repli MP4 désactivé si possible ; vignettes du catalogue servies depuis Supabase Storage, jamais depuis des URL Bunny. |
| SEC-53 | Clé de signature Bunny uniquement côté serveur. |
| SEC-54 | Limite d'émission de jetons par utilisateur/IP pour détecter le partage de compte massif ou le scraping, en distinguant **nouvelles lectures** (ex. 60/heure) et **renouvellements / préchargements** (limite séparée, plus large) pour ne jamais gêner un spectateur qui enchaîne les épisodes. |
| SEC-55 | **Test pré-lancement obligatoire** : un lien copié est refusé après expiration et depuis un autre domaine ; un utilisateur sans droit reçoit un refus. |

**Limite assumée** : aucune protection n'empêche l'enregistrement d'écran. L'objectif est d'empêcher le **partage simple de liens** et l'accès sans paiement, pas de garantir l'impossibilité de copie (voir TECHNICAL_ARCHITECTURE §6.3).

## 7. Autorisation administrateur

| ID | Règle |
|---|---|
| SEC-60 | Chaque route et action admin vérifie **côté serveur** : session admin valide, niveau MFA `aal2`, rôle dans `staff_roles`. Masquer un bouton n'est pas une protection. |
| SEC-61 | Actions sensibles (prix, accès manuel, blocage, remboursement, dépublication) journalisées dans `audit_logs`. |
| SEC-62 | Numéros de téléphone masqués par défaut dans l'admin (`+229 90 •• •• 12`), affichage complet sur action explicite journalisée. |
| SEC-63 | Téléversements admin : types (JPEG/PNG/WebP pour les images) et tailles limités, noms de fichiers régénérés. |

## 8. Gestion des secrets

| ID | Règle |
|---|---|
| SEC-70 | Aucun secret dans le dépôt Git, ni dans le code navigateur, ni dans les journaux. `.env*` dans `.gitignore` ; seul `.env.example` (sans valeurs) est versionné. |
| SEC-71 | Secrets stockés dans les variables d'environnement de Vercel / Supabase, séparés par environnement. |
| SEC-72 | Activer la **détection de secrets** (secret scanning / push protection) sur GitHub. |
| SEC-73 | En cas de fuite : rotation immédiate de la clé, puis analyse. Procédure documentée. |
| SEC-74 | Principe du moindre privilège : clés API limitées au strict nécessaire quand le prestataire le permet ; comptes prestataires protégés par double authentification. |

## 9. Abus et limitation de débit

| Point d'entrée | Limite indicative |
|---|---|
| Inscription, connexion, réinitialisation | Limites Supabase Auth + Turnstile (SEC-04) |
| Envoi d'e-mails (confirmation, réinitialisation) | Limites Supabase + quota du service SMTP ; alerte si volume anormal |
| Création de commande | ~10 / utilisateur / heure |
| Jeton de lecture | SEC-54 |
| Webhooks | non limités mais authentifiés |
| Routes cron | protégées par `CRON_SECRET` |

Implémentation V1 : limites intégrées à Supabase Auth pour l'authentification ; compteurs en base pour nos propres routes (commandes, jetons de lecture), sans service supplémentaire. Protection de base contre le déni de service assurée par l'hébergeur (Vercel) ; Cloudflare devant le site en option si nécessaire.

## 10. Vulnérabilités web courantes

| ID | Règle |
|---|---|
| SEC-80 | Validation de toutes les entrées côté serveur (schémas Zod), y compris dans l'admin. |
| SEC-81 | Requêtes paramétrées uniquement (client Supabase / fonctions SQL) ; pas de SQL construit par concaténation. |
| SEC-82 | XSS : rendu React échappé par défaut ; interdiction de `dangerouslySetInnerHTML` sur du contenu saisi. |
| SEC-83 | En-têtes : `Content-Security-Policy` (sources limitées : Bunny, Supabase, Turnstile, Sentry), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'` (anti-clickjacking). |
| SEC-84 | CSRF : cookies `SameSite=Lax` ; vérification de l'origine sur **toutes** les requêtes qui modifient des données — actions serveur (Next.js) **et** routes API (`/api/playback`, `/api/progress`, `/api/checkout`, déconnexion) ; la déconnexion se fait en POST, jamais en GET. |
| SEC-85 | Redirections : URL de retour après connexion limitées aux chemins internes commençant par un seul `/` (refus de `//hôte`, `/\hôte`, schémas) ; liste des URL de redirection Supabase limitée au domaine exact (aucun joker de type `*.vercel.app` en production). |
| SEC-86 | Dépendances : fichier de verrouillage versionné, alertes de vulnérabilité (Dependabot), mises à jour régulières. |

## 11. Données personnelles
- Collecte minimale : e-mail, nom affiché facultatif, numéro facultatif non vérifié, achats, progression de lecture.
- E-mails, numéros et IP **masqués ou hachés** dans les journaux techniques ; jamais envoyés à Sentry ou aux outils d'audience.
- Durées de conservation : journaux d'audit et transactions selon obligations comptables (à confirmer **[LAUNCH_CHECKLIST]**).
- Suppression de compte : anonymisation du profil, conservation des transactions (obligation comptable).
- Conformité aux lois locales de protection des données de **chaque pays ouvert** à vérifier avec un conseil juridique avant son ouverture.

## 12. Vérification avant lancement

Avant toute mise en production, une **revue de sécurité** est réalisée (relecture indépendante du code des paiements, de l'authentification, des RLS et des jetons vidéo) et chaque règle SEC-xx est cochée avec la preuve associée (test automatisé ou test manuel documenté). Voir LAUNCH_CHECKLIST.
