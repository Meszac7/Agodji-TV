# Agodjié TV — Checklist de lancement

> Statut : Phase 1. À compléter au fil du projet. Chaque ligne cochée doit avoir une **preuve** (lien vers un test, une capture, un document).
> Légende responsable : **F** = fondateur, **T** = équipe technique (agent), **J** = conseil juridique/comptable.

---

## 1. Décisions à prendre (voir PROJECT_BRIEF §8)

- [x] **F** D-01 Prestataires : CinetPay + FedaPay (orientation validée le 2026-11-19)
- [x] **F** D-02 Orientation panafricaine (validée le 2026-11-19)
- [x] **F** D-03 Grille XOF : 300 / 1 500 FCFA (validée) — [ ] montants XAF, GNF, CDF/USD à fixer avant l'ouverture des pays concernés
- [ ] **F** D-04 Longueur du PIN (4 ou 6 chiffres) — recommandation argumentée attendue avant l'étape 3
- [ ] **F** D-05 OTP SMS obligatoire (inscription, réinitialisation)
- [ ] **F** D-06 Authentification administrateur (e-mail + TOTP)
- [ ] **F** D-07 Format vidéo (vertical/horizontal) et durée des épisodes
- [ ] **F** D-08 Politiques : remboursement, retrait de contenu, pass après épisodes, taille de saison, classification d'âge
- [ ] **F/J** D-09 Stratégie d'encaissement par zone monétaire (société béninoise)
- [ ] **F** D-10 Mention « créé avec l'IA »
- [ ] **F** D-11 Nom de domaine
- [ ] **F** D-12 Budget mensuel
- [ ] **F** D-13 Lecteur vidéo V1 (lecteur sur mesure recommandé) — avant l'intégration du lecteur à l'étape 2
- [ ] **F** D-14 Logo et identité de marque
- [ ] **F** D-15 Langue(s)
- [ ] **F/T** D-16 Prestataire SMS
- [x] **F** D-17 Principe : pays de paiement confirmé par l'utilisateur (écrans à valider)
- [ ] **F** D-18 Prestataire principal par pays en zone UEMOA
- [ ] **F** D-19 Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale, Guinée-Bissau : attendre les réponses écrites
- [ ] **F** D-20 Envoyer les questions écrites à CinetPay et FedaPay
- [x] **F** D-21 Pays d'affichage par défaut : Bénin, prix indicatifs (validé)
- [x] **F** D-22 Principe du pilote multi-pays (validé) — [ ] liste des testeurs à fournir avant l'étape 10

## 2. Comptes et accès externes à créer

Le fondateur crée les comptes à son nom (ou celui de la société) et active la **double authentification** sur chacun. Les clés sont ensuite saisies directement dans les paramètres Vercel/Supabase — **jamais envoyées par chat, e-mail ou commit**.

| # | Service | Pourquoi | Ce qu'il faudra fournir | Statut |
|---|---|---|---|---|
| 1 | **GitHub** | Code source | Déjà en place (`Meszac7/Agodji-TV`) ; activer secret scanning / push protection | [ ] |
| 2 | **Supabase** (2 projets : préproduction, production) | Base de données, Auth, stockage d'images | Accès au projet ; plan Pro pour la production | [ ] |
| 3 | **Vercel** | Hébergement | Projet relié au dépôt ; plan Pro (usage commercial) | [ ] |
| 4 | **Bunny.net** | Vidéo | Bibliothèque Stream préproduction + production ; clé API, clé de jeton | [ ] |
| 5a | **CinetPay** — nombre de comptes (un seul ou un par devise/pays) **selon la réponse écrite** de CinetPay | Paiements | Compte(s) marchand(s), KYC validé, sandbox puis live, clés API, site ID, clé secrète HMAC | [ ] |
| 5b | **FedaPay** — devises et pays couverts **selon la réponse écrite** de FedaPay (dont Guinée) | Paiements | Compte marchand, KYC validé, sandbox puis live, clé secrète, secret de webhook | [ ] |
| 6 | **Prestataire SMS** | OTP | Compte, numéro/nom d'expéditeur autorisé dans chaque pays, crédit | [ ] |
| 7 | **Cloudflare Turnstile** | Anti-robot | Clé de site + clé secrète (gratuit) | [ ] |
| 8 | **Sentry** | Suivi des erreurs | Projet + DSN | [ ] |
| 9 | **Registrar** (nom de domaine) | Adresse du site | Accès DNS pour relier le domaine à Vercel et Bunny | [ ] |
| 10 | **Boîte e-mail admin** | Comptes admin + TOTP | Adresse dédiée (ex. admin@domaine) | [ ] |

## 3. À vérifier auprès des prestataires (questions écrites)

### Paiement (CinetPay / FedaPay)
- [ ] Questions envoyées par e-mail à **CinetPay** ([docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md) : éligibilité de la société béninoise, pays, opérateurs, devises, comptes marchands, frais, reversements, technique, remboursements).
- [ ] Questions envoyées par e-mail à **FedaPay** (même document, avec les questions spécifiques F1 à F6, dont la Guinée).
- [ ] Réponses reçues et consignées dans le tableau de synthèse par pays du même document.
- [ ] TECHNICAL_ARCHITECTURE §5.2 à §5.4 mis à jour (symboles ✅/❌) d'après les réponses.

### Bunny Stream
- [ ] Tarifs actuels stockage/diffusion pour l'Afrique.
- [ ] Combinaison jeton d'intégration + jeton CDN avec le lecteur intégré : comportement confirmé (étape 6 de la feuille de route).
- [ ] Désactivation du repli MP4.
- [ ] Offre DRM (MediaCage) : prix, compatibilité — pour plus tard.

### SMS
- [ ] Prix par SMS et taux de délivrabilité **pour chaque pays visé** et chaque opérateur.
- [ ] Enregistrement de l'identifiant d'expéditeur (obligatoire dans certains pays).
- [ ] API d'envoi utilisable depuis notre serveur (HTTP), accusés de réception de livraison.

### Hébergement
- [ ] Régions Supabase/Vercel les plus proches des pays cibles.
- [ ] Conditions d'usage commercial (Vercel).

## 4. Juridique et administratif (**J**)

- [ ] **Stratégie d'encaissement par zone monétaire** (D-09) : quelle entité encaisse en UEMOA, en CEMAC, en RDC, en Guinée ; comptes bancaires de reversement correspondants.
- [ ] Réglementation des changes (BCEAO, BEAC, Banque centrale du Congo) : rapatriement des fonds vers la société.
- [ ] TVA / taxes sur les services numériques **dans chaque pays ouvert à l'achat**.
- [ ] Compte(s) bancaire(s) de reversement de la société béninoise.
- [ ] **Conditions générales d'utilisation et de vente** (achat définitif, absence d'expiration, politique de remboursement, retrait de contenu).
- [ ] **Politique de confidentialité** (données collectées, durée de conservation, droits des utilisateurs).
- [ ] Conformité aux autorités de protection des données des pays ouverts (ex. APDP au Bénin, ARTCI en Côte d'Ivoire ; Cameroun et RDC à vérifier), déclarations éventuelles.
- [ ] Obligations fiscales sur les ventes numériques (TVA) par pays.
- [ ] Droits sur les contenus : propriété des œuvres, outils d'IA utilisés et leurs licences, musiques, voix, ressemblance de personnes réelles.
- [ ] Classification d'âge / avertissements de contenu.
- [ ] Mentions légales du site.

## 5. Contenu

- [ ] Série disponible : affiche, bannière, synopsis, saison(s), épisodes encodés, vignettes, épisodes gratuits choisis.
- [ ] 5 séries « bientôt » : affiche, synopsis, date ou mention.
- [ ] Logo officiel et favicon (sinon logotype provisoire assumé).
- [ ] Textes : accueil, aide/FAQ (paiement, PIN oublié, contact), CGU, confidentialité.
- [ ] Contact support (WhatsApp et/ou téléphone) **[à décider]**.

## 6. Technique (**T**) — preuves requises

- [ ] Toutes les règles SEC-xx vérifiées (SECURITY_REQUIREMENTS) avec preuve.
- [ ] Revue de sécurité indépendante réalisée, points corrigés.
- [ ] Tests automatisés passants : RLS, droits d'accès, idempotence des paiements, auth/limites.
- [ ] Parcours de paiement live testé de bout en bout dans chaque pays ouvert (petits montants réels), remboursement testé.
- [ ] Test de copie de lien vidéo (SEC-55) réussi.
- [ ] Recette mobile sur appareils réels + réseau lent.
- [ ] Secrets de production configurés, différents de la préproduction ; aucun secret dans le dépôt.
- [ ] Sauvegardes de la base actives et restauration testée.
- [ ] Sentry actif, alertes de paiement configurées.
- [ ] Domaine, HTTPS, en-têtes de sécurité vérifiés.
- [ ] Domaines autorisés Bunny = domaine de production.
- [ ] Envoi de SMS OTP limité aux indicatifs activés (`otp_enabled`).
- [ ] Comptes admin avec TOTP ; aucun compte de test admin en production.
- [ ] Configuration Supabase Auth durcie : inscriptions publiques désactivées, fournisseur « phone » désactivé, changement de mot de passe sécurisé, MFA `aal2` exigé par l'application, limites de débit actives.
- [ ] Test : avec la clé publique Supabase, aucune table ni fonction n'est accessible.
- [ ] Alertes e-mail actives (paiement à examiner, doublon, budget SMS, erreurs webhook).
- [ ] Données de test absentes de la production.

## 7. Opérations

- [ ] Procédure : client a payé mais n'a pas accès (revérification, accès manuel).
- [ ] Procédure : remboursement.
- [ ] Procédure : changement de numéro de téléphone.
- [ ] Procédure : fuite de clé (rotation).
- [ ] Suivi mensuel des coûts (SMS, bande passante, commissions, hébergement).

## 8. Go / No-go du lancement public

Le lancement public correspond à l'ouverture (`open`) du premier pays ; les pays suivants s'ouvrent ensuite un par un selon le §9.

- [ ] Sections 1 à 7 complètes pour ce qui concerne le premier pays.
- [ ] Pilote multi-pays (étape 10) terminé sans incident bloquant.
- [ ] **Décision de lancement du fondateur.**

## 9. Ouverture d'un pays à l'achat (à répéter pour chaque pays)

La consultation et les épisodes gratuits sont accessibles partout sans attendre. Un pays passe de « achat indisponible » à « pilote » puis « ouvert » uniquement quand :
- [ ] confirmations écrites **A** (disponibilité technique), **B** (accès pour notre société béninoise) et **C** (reversement des fonds) obtenues pour au moins un prestataire ;
- [ ] le contrat avec ce prestataire est actif pour ce pays (KYC validé, compte live) ;
- [ ] les identifiants live du compte sont configurés dans l'hébergeur (jamais par chat) ;
- [ ] la route de paiement est configurée dans l'admin (moyens, opérateurs, secours éventuel) ;
- [ ] la grille tarifaire du pays existe et tous les contenus payants publiés y ont un prix ;
- [ ] un **paiement réel de contrôle** a réussi pour chaque moyen proposé, et un remboursement a été testé ;
- [ ] les SMS OTP arrivent sur les principaux opérateurs du pays ;
- [ ] les obligations juridiques et fiscales du pays sont traitées (§4) ;
- [ ] passage en statut `pilot` : achats réels par les comptes testeurs, sans incident ;
- [ ] décision d'ouverture (`open`) du fondateur, journalisée.

Les moyens de paiement d'un pays ouvert s'ajoutent ensuite un par un (ex. carte après Mobile Money), chacun avec son paiement réel de contrôle.
