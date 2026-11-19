# Agodjié TV — Checklist de lancement

> Statut : Phase 1. À compléter au fil du projet. Chaque ligne cochée doit avoir une **preuve** (lien vers un test, une capture, un document).
> Légende responsable : **F** = fondateur, **T** = équipe technique (agent), **J** = conseil juridique/comptable.

---

## 1. Décisions à prendre (voir PROJECT_BRIEF §8)

- [ ] **F** D-01 Prestataire de paiement au lancement
- [ ] **F** D-02 Pays ouverts au lancement
- [ ] **F** D-03 Prix par devise (XOF, XAF, RDC)
- [ ] **F** D-04 Longueur du PIN (4 ou 6 chiffres)
- [ ] **F** D-05 OTP SMS obligatoire (inscription, réinitialisation)
- [ ] **F** D-06 Authentification administrateur (e-mail + TOTP)
- [ ] **F** D-07 Format vidéo (vertical/horizontal) et durée des épisodes
- [ ] **F** D-08 Politiques : remboursement, retrait de contenu, pass après épisodes, taille de saison, classification d'âge
- [ ] **F/J** D-09 Entité juridique et pays d'enregistrement
- [ ] **F** D-10 Mention « créé avec l'IA »
- [ ] **F** D-11 Nom de domaine
- [ ] **F** D-12 Budget mensuel
- [ ] **F** D-13 Lecteur vidéo V1
- [ ] **F** D-14 Logo et identité de marque
- [ ] **F** D-15 Langue(s)
- [ ] **F/T** D-16 Prestataire SMS

## 2. Comptes et accès externes à créer

Le fondateur crée les comptes à son nom (ou celui de la société) et active la **double authentification** sur chacun. Les clés sont ensuite saisies directement dans les paramètres Vercel/Supabase — **jamais envoyées par chat, e-mail ou commit**.

| # | Service | Pourquoi | Ce qu'il faudra fournir | Statut |
|---|---|---|---|---|
| 1 | **GitHub** | Code source | Déjà en place (`Meszac7/Agodji-TV`) ; activer secret scanning / push protection | [ ] |
| 2 | **Supabase** (2 projets : préproduction, production) | Base de données, Auth, stockage d'images | Accès au projet ; plan Pro pour la production | [ ] |
| 3 | **Vercel** | Hébergement | Projet relié au dépôt ; plan Pro (usage commercial) | [ ] |
| 4 | **Bunny.net** | Vidéo | Bibliothèque Stream préproduction + production ; clé API, clé de jeton | [ ] |
| 5 | **CinetPay** (et/ou FedaPay) | Paiements | Compte marchand, KYC validé, accès sandbox puis live, clés API, secret de notification | [ ] |
| 6 | **Prestataire SMS** | OTP | Compte, numéro/nom d'expéditeur autorisé dans chaque pays, crédit | [ ] |
| 7 | **Cloudflare Turnstile** | Anti-robot | Clé de site + clé secrète (gratuit) | [ ] |
| 8 | **Sentry** | Suivi des erreurs | Projet + DSN | [ ] |
| 9 | **Registrar** (nom de domaine) | Adresse du site | Accès DNS pour relier le domaine à Vercel et Bunny | [ ] |
| 10 | **Boîte e-mail admin** | Comptes admin + TOTP | Adresse dédiée (ex. admin@domaine) | [ ] |

## 3. À vérifier auprès des prestataires (questions écrites)

### Paiement (CinetPay / FedaPay)
- [ ] Pays et opérateurs Mobile Money **actuellement** actifs pour notre compte (Bénin, Côte d'Ivoire, Cameroun, RDC).
- [ ] Cartes bancaires : disponibles dans quels pays ?
- [ ] Grille de frais **actuelle** par pays/opérateur ; existence de **frais fixes** par transaction ; montant minimum.
- [ ] Délais et frais de reversement vers notre compte.
- [ ] Éligibilité de notre entité (pays d'enregistrement, documents KYC).
- [ ] Format exact et sécurité des notifications (HMAC/signature), statuts possibles, notifications multiples.
- [ ] API de vérification de transaction : statuts, champs montant/devise.
- [ ] Remboursements : possibles par API pour le Mobile Money ? délais ?
- [ ] Contraintes de montant (ex. multiple de 5 en XOF/XAF) et devises acceptées pour la RDC.
- [ ] Environnement sandbox et numéros de test.

### Bunny Stream
- [ ] Tarifs actuels stockage/diffusion pour l'Afrique.
- [ ] Combinaison jeton d'intégration + jeton CDN avec le lecteur intégré : comportement confirmé (prototype S2).
- [ ] Désactivation du repli MP4.
- [ ] Offre DRM (MediaCage) : prix, compatibilité — pour plus tard.

### SMS
- [ ] Prix par SMS et taux de délivrabilité par pays et opérateur.
- [ ] Enregistrement de l'identifiant d'expéditeur (obligatoire dans certains pays).
- [ ] API d'envoi utilisable depuis notre serveur (HTTP), accusés de réception de livraison.

### Hébergement
- [ ] Régions Supabase/Vercel les plus proches des pays cibles.
- [ ] Conditions d'usage commercial (Vercel).

## 4. Juridique et administratif (**J**)

- [ ] Entité juridique et compte bancaire de reversement.
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
- [ ] Indicatifs pays OTP limités aux pays ouverts.
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

## 8. Go / No-go

- [ ] Toutes les sections ci-dessus complètes.
- [ ] Bêta fermée sans incident bloquant.
- [ ] **Décision de lancement du fondateur.**
