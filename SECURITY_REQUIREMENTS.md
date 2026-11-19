# Agodjié TV — Exigences de sécurité

> Statut : Phase 1 — exigences de conception. Rien n'est encore implémenté ; **aucune mesure ci-dessous ne doit être considérée comme en place tant qu'elle n'a pas été testée.**
> Les identifiants **SEC-xx** sont référencés dans le code, les tests et la checklist de lancement.

---

## 1. Ce que nous protégeons

| Actif | Pourquoi c'est important |
|---|---|
| Argent des clients et revenus | Un faux paiement accepté = contenu volé ; un vrai paiement non crédité = client lésé |
| Droits d'accès (entitlements) | Cœur du modèle TVOD |
| Comptes utilisateurs | Accès à la bibliothèque, données personnelles (numéro) |
| Vidéos payantes | Valeur commerciale |
| Comptes administrateurs | Un admin compromis = contrôle total (prix, accès, données) |
| Secrets (clés API) | Permettent d'agir au nom de la plateforme |

## 2. Principaux scénarios de menace

| # | Menace | Mesures (sections) |
|---|---|---|
| T1 | Deviner le PIN d'un autre utilisateur | §3 |
| T2 | Créer un compte avec le numéro de quelqu'un d'autre | §3 (OTP) |
| T3 | Fraude au SMS (« SMS pumping ») qui génère une grosse facture | §3.4, §9 |
| T4 | Faux « paiement réussi » envoyé par le navigateur ou un faux webhook | §5 |
| T5 | Webhooks répétés → doubles droits ou incohérences | §5 |
| T6 | Payer moins cher en modifiant le prix dans la requête | §5 |
| T7 | Partager l'URL d'une vidéo payante | §6 |
| T8 | Lire les achats ou données d'un autre utilisateur | §4 |
| T9 | Accéder à l'admin sans autorisation | §7 |
| T10 | Fuite d'une clé secrète (dépôt GitHub, code navigateur) | §8 |
| T11 | Injection, XSS, CSRF, clickjacking | §10 |
| T12 | Abus automatisés (robots, scraping, déni de service applicatif) | §9 |

## 3. Authentification par numéro + PIN

### 3.1 Analyse du PIN à 4 chiffres

**Faits :**
- Un PIN à 4 chiffres n'offre que **10 000 combinaisons**.
- Les PIN choisis par les humains sont très prévisibles : une étude publique sur des PIN divulgués (DataGenetics, 2012) indiquait que `1234` représentait à lui seul ~11 % des choix et que les 20 PIN les plus courants en couvraient ~27 %.
- Contrairement au PIN d'une carte bancaire, un site web peut être attaqué à distance, en masse, depuis de nombreuses adresses IP.

**Conclusion :** un PIN à 4 chiffres **seul** est insuffisant. Il devient **acceptable pour Agodjié TV** uniquement si les conditions suivantes sont **toutes** remplies :

1. Le numéro est **vérifié par SMS (OTP)** à l'inscription → on ne peut pas créer de compte sur le numéro d'un autre (SEC-01).
2. Le PIN n'est **jamais vérifiable ailleurs que sur notre serveur**, qui applique les limites de tentatives (SEC-02).
3. **Verrouillage par compte** strict (SEC-03).
4. **Limitation par IP + anti-robot** pour bloquer l'attaque « un PIN courant essayé sur des milliers de numéros » (SEC-04).
5. **Liste de PIN interdits** (SEC-05).
6. **Sessions longues** sur l'appareil de confiance : le PIN est rarement retapé, donc rarement exposé (SEC-07).

**Pourquoi c'est un risque acceptable ici :** un compte Agodjié TV ne contient **ni moyen de paiement enregistré ni argent**. Un paiement Mobile Money exige toujours une validation sur le téléphone du payeur. Un compte piraté donne accès à des épisodes déjà payés (quelques milliers de FCFA au plus) et au numéro de téléphone. Le niveau de protection est donc proportionné à la valeur protégée.

Avec 10 essais maximum avant verrouillage dur et les PIN faibles interdits, la probabilité de deviner le PIN d'un compte ciblé est d'environ **0,1 %** (un peu plus en pratique car les choix humains ne sont pas uniformes).

**Option plus sûre [D-04] :** un PIN à **6 chiffres** (1 000 000 de combinaisons) diviserait ce risque par ~100 pour un effort utilisateur très faible. **Choix par défaut retenu : 4 chiffres** avec toutes les mesures ci-dessous ; la longueur est un réglage (`app_settings.pin_length`) qui permet de passer à 6 chiffres sans développement.

### 3.2 Règles

| ID | Règle |
|---|---|
| SEC-01 | Inscription et réinitialisation du PIN uniquement après **OTP SMS** valide envoyé au numéro. |
| SEC-02 | PIN haché avec **Argon2id** (paramètres recommandés OWASP au moment de l'implémentation) + **poivre** secret stocké hors base (variable d'environnement). Jamais stocké ni journalisé en clair. Vérification uniquement par notre serveur : il n'existe **aucun autre point d'entrée** permettant d'ouvrir une session client (pas de Supabase Auth pour les clients, TECHNICAL_ARCHITECTURE §7). |
| SEC-03 | Par compte : après **5 échecs** consécutifs → verrouillage **15 min** ; après **10 échecs** depuis la dernière connexion réussie → verrouillage dur, déblocage uniquement par réinitialisation via OTP. Remise à zéro au succès. **Compromis assumé** : un tiers connaissant un numéro peut volontairement verrouiller ce compte ; le titulaire se débloque avec un SMS (coût borné par SEC-12). Sans verrouillage dur, une attaque lente et répétée finirait par deviner un PIN à 4 chiffres. Un compte verrouillé à répétition déclenche une alerte (P1). |
| SEC-04 | Par IP (hachée) : au-delà de ~20 tentatives de connexion/heure → **Cloudflare Turnstile** obligatoire ; au-delà de ~50/heure → blocage temporaire. Seuils ajustables. Surveillance d'un taux d'échec global anormal (attaque répartie). |
| SEC-05 | PIN refusés : chiffres identiques (`0000`…), suites (`1234`, `4321`, `0123`…), les ~50 PIN les plus courants, années `19xx`/`20xx` récentes (6 chiffres : liste équivalente). |
| SEC-06 | Messages d'erreur neutres : « Numéro ou PIN incorrect » — ne pas révéler si le numéro existe. Temps de réponse homogène. |
| SEC-07 | Sessions : jeton aléatoire 256 bits dans un cookie `httpOnly`, `Secure`, `SameSite=Lax` ; seul son hachage est stocké (`customer_sessions`) ; expiration après ~90 jours d'inactivité **[à valider]** ; nouveau jeton à chaque connexion (pas de réutilisation d'un jeton antérieur). |
| SEC-08 | Changement / réinitialisation du PIN → **suppression de toutes les autres sessions** en base (effet immédiat). |
| SEC-09 | Bouton « Se déconnecter de tous les appareils ». |
| SEC-10 | Événements de sécurité journalisés (connexion réussie/échouée, verrouillage, réinitialisation) sans le PIN ni le numéro en clair. |

### 3.3 Récupération de compte
- « PIN oublié » → OTP au numéro enregistré → nouveau PIN.
- **Risque propre au marché : recyclage des numéros.** Les opérateurs réattribuent les numéros inactifs. Le nouveau titulaire pourrait récupérer le compte de l'ancien. Risque accepté vu la faible valeur d'un compte ; mitigation P2 : demander une confirmation supplémentaire si le compte est inactif depuis plus de 12 mois.
- **Échange de carte SIM (SIM swap)** : même logique ; risque accepté pour la V1.
- Changement de numéro : manuel par l'admin en V1, avec vérification (preuve d'achat, ancien numéro), action journalisée.

### 3.4 OTP SMS

| ID | Règle |
|---|---|
| SEC-11 | Code à 6 chiffres généré et vérifié par **notre serveur**, stocké haché, validité ~5 min, 5 essais max, usage unique. Le fournisseur « phone » de Supabase Auth reste **désactivé** (il offrirait un envoi de SMS contournant SEC-12/13). |
| SEC-12 | Envoi : max 3 SMS / numéro / heure et ~10 / jour ; limite par IP ; **Turnstile obligatoire avant tout envoi**. |
| SEC-13 | Envoi uniquement vers les **indicatifs pour lesquels l'envoi de SMS est activé** (`markets.otp_enabled`), indépendamment du statut de paiement du pays — protection principale contre la fraude au SMS vers des numéros surtaxés. |
| SEC-14 | Alerte si le volume quotidien de SMS dépasse un seuil défini (budget). |

### 3.5 Administrateurs

| ID | Règle |
|---|---|
| SEC-15 | Comptes admin **séparés** des comptes clients (Supabase Auth), e-mail + mot de passe fort (≥ 12 caractères) + **TOTP obligatoire** **[D-06]**. Chaque action admin exige une session de niveau MFA **`aal2`** : un mot de passe deviné ou volé ne suffit pas. Inscriptions publiques Supabase désactivées. |
| SEC-16 | Nombre d'admins minimal ; rôle `editor` sans accès aux données personnelles ni aux transactions. |

## 4. Accès aux données

| ID | Règle |
|---|---|
| SEC-20 | **Le navigateur ne parle jamais à la base.** RLS activé sur toutes les tables **sans politique** pour `anon`/`authenticated` ; privilèges de table et d'exécution de fonctions révoqués pour ces rôles (DATABASE_SCHEMA §5). |
| SEC-21 | Le serveur filtre systématiquement par l'identifiant du client de la session ; aucune donnée d'un autre client n'est jamais renvoyée. |
| SEC-22 | La clé `service_role` n'existe que côté serveur ; jamais dans une variable `NEXT_PUBLIC_*`. |
| SEC-23 | Les données de catalogue envoyées au navigateur n'incluent ni `video_id` ni champs internes ; l'identifiant vidéo n'apparaît que dans l'URL de lecture signée, une fois l'accès autorisé. |
| SEC-24 | Tests automatisés : clé publique sans aucun accès, client A vs données de B, éditeur vs transactions, client bloqué. |
| SEC-25 | Un client **bloqué** perd immédiatement l'accès : ses sessions sont supprimées et le statut est vérifié à chaque requête authentifiée (lecture, achat). |
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
| SEC-44 | Les simulateurs (paiement, SMS, vidéo) sont refusés en production : l'application ne démarre pas en production si un simulateur est configuré ou si un compte de paiement `simulator` est actif. Test automatisé obligatoire. |

## 6. Vidéos protégées

| ID | Règle |
|---|---|
| SEC-50 | Aucune URL vidéo permanente ou publique pour un épisode payant. |
| SEC-51 | Jeton de lecture émis par le serveur **après** vérification de `has_episode_access` (qui exclut brouillons et épisodes non sortis) ; validité de quelques minutes, compatible avec la lecture complète d'un épisode (vérifié à l'étape 6 de la feuille de route). |
| SEC-52 | Authentification par jeton activée sur le lecteur intégré **et** sur le CDN (playlists et segments HLS) ; domaines référents restreints ; repli MP4 désactivé si possible. |
| SEC-53 | Clé de signature Bunny uniquement côté serveur. |
| SEC-54 | Limite d'émission de jetons par utilisateur/IP (ex. 60/heure) pour détecter le partage de compte massif ou le scraping. |
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
| Envoi OTP | SEC-12 |
| Connexion PIN | SEC-03, SEC-04 |
| Création de commande | ~10 / utilisateur / heure |
| Jeton de lecture | SEC-54 |
| Webhooks | non limités mais authentifiés |
| Routes cron | protégées par `CRON_SECRET` |

Implémentation V1 : compteurs en base (`auth_attempts` et équivalents), sans service supplémentaire. Protection de base contre le déni de service assurée par l'hébergeur (Vercel) ; Cloudflare devant le site en option si nécessaire.

## 10. Vulnérabilités web courantes

| ID | Règle |
|---|---|
| SEC-80 | Validation de toutes les entrées côté serveur (schémas Zod), y compris dans l'admin. |
| SEC-81 | Requêtes paramétrées uniquement (client Supabase / fonctions SQL) ; pas de SQL construit par concaténation. |
| SEC-82 | XSS : rendu React échappé par défaut ; interdiction de `dangerouslySetInnerHTML` sur du contenu saisi. |
| SEC-83 | En-têtes : `Content-Security-Policy` (sources limitées : Bunny, Supabase, Turnstile, Sentry), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'` (anti-clickjacking). |
| SEC-84 | CSRF : cookies `SameSite=Lax`, vérification de l'origine sur les actions qui modifient des données. |
| SEC-85 | Redirections : URL de retour après connexion limitées aux chemins internes (pas de redirection ouverte). |
| SEC-86 | Dépendances : fichier de verrouillage versionné, alertes de vulnérabilité (Dependabot), mises à jour régulières. |

## 11. Données personnelles
- Collecte minimale : numéro, PIN haché, nom affiché facultatif, achats.
- Numéros et IP **hachés** dans les journaux techniques ; jamais envoyés à Sentry ou aux outils d'audience.
- Durées de conservation : tentatives de connexion 30 jours ; journaux d'audit et transactions selon obligations comptables (à confirmer **[LAUNCH_CHECKLIST]**).
- Suppression de compte : anonymisation du profil, conservation des transactions (obligation comptable).
- Conformité aux lois locales de protection des données de **chaque pays ouvert** à vérifier avec un conseil juridique avant son ouverture.

## 12. Vérification avant lancement

Avant toute mise en production, une **revue de sécurité** est réalisée (relecture indépendante du code des paiements, de l'authentification, des RLS et des jetons vidéo) et chaque règle SEC-xx est cochée avec la preuve associée (test automatisé ou test manuel documenté). Voir LAUNCH_CHECKLIST.
