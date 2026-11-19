# Décision — Comptes Google + e-mail, lecteur vertical, visionnage en défilement continu

Date : 2026-11-20 · Origine : exigences du fondateur après validation de l'étape 1 · Statut : **principes validés par le fondateur** ; interface du lecteur **en attente de validation** de la maquette.

## 1. Authentification : Google et e-mail/mot de passe, sans SMS

### Ce qui change
| Avant | Maintenant |
|---|---|
| Numéro + PIN + code SMS (auth « maison ») | **Google** et **e-mail + mot de passe** (Supabase Auth), méthodes principales au lancement |
| Prestataire SMS (D-16) | **Supprimé** : aucun service SMS payant |
| Numéro = identifiant | Numéro **facultatif**, ajouté plus tard dans le profil, **non vérifié**, jamais utilisé pour se connecter, récupérer un compte ou déduire le pays de paiement |
| D-04 (PIN 4 ou 6 chiffres), D-05 (OTP SMS) | **Sans objet** (connexion par numéro + PIN non développée) |

### Pourquoi Supabase Auth redevient le bon choix
L'auth « maison » n'existait que pour le PIN, que Supabase ne gère pas. Pour Google et l'e-mail, Supabase Auth est éprouvé, gratuit dans son offre de base, et évite d'écrire du code d'authentification sensible. Le principe « le navigateur ne parle jamais à la base » est conservé : les appels d'authentification passent par notre serveur, et les tables applicatives restent fermées.

### Liaison des comptes (ne jamais perdre ses achats)
- **Un client = un identifiant unique** (`auth.users.id`). Achats, droits, bibliothèque et progression sont rattachés à cet identifiant, **jamais** à une méthode de connexion. Ajouter ou retirer une méthode ne touche pas aux achats.
- **Même adresse e-mail confirmée** (ex. compte e-mail puis connexion Google avec la même adresse) : Supabase rattache la nouvelle méthode au même compte (liaison automatique — 🟢 documentation Supabase, **à vérifier par test à l'étape 3**).
- **Adresses différentes** : depuis « Mon compte », un client connecté peut **ajouter** une méthode (lier Google, ou définir un mot de passe) — liaison manuelle Supabase, à activer.
- **Deux comptes créés par erreur** : procédure de support — un administrateur peut transférer les achats d'un compte vers l'autre, après vérification, avec motif obligatoire et journalisation.
- Retirer une méthode n'est possible que s'il en reste au moins une.

### Risques et protections (vérification demandée par le fondateur)
| Risque | Protection |
|---|---|
| **Prise de contrôle anticipée** (dans les deux sens : compte e-mail créé avant le compte Google de la victime, ou après) | Confirmation d'e-mail **obligatoire avant toute connexion** ; liaison uniquement entre e-mails vérifiés ; inscription refusée par notre serveur si un compte existe déjà et que Supabase ne protège pas ce cas ; **tests dans les deux sens** à l'étape 3 (SEC-12) |
| Vol de mot de passe / attaque par dictionnaire | Mot de passe d'au moins 10 caractères, limites de tentatives de Supabase, **Turnstile** sur inscription / connexion / mot de passe oublié, détection des mots de passe divulgués si l'offre Supabase le permet (à vérifier) |
| Changement d'e-mail frauduleux | Confirmation sur l'ancienne **et** la nouvelle adresse (option « secure email change ») ; réauthentification pour les actions sensibles |
| Compte bloqué qui reste connecté | Blocage Supabase + statut vérifié par notre serveur à chaque action sensible (lecture payante, achat) |
| Perte des achats en changeant de méthode | Droits rattachés à l'identifiant client, pas à la méthode ; tests dédiés (liaison, ajout, retrait de méthode) |
| Récupération de compte | Lien de réinitialisation par e-mail (Supabase) ; pour Google, récupération gérée par Google |
| Sessions | Jetons dans des cookies `httpOnly`, `Secure`, `SameSite=Lax`, gérés **côté serveur uniquement** (aucun client Supabase dans le navigateur) — à valider à l'étape 3 |
| Administrateurs | Inchangé : e-mail + mot de passe + **TOTP obligatoire** (`aal2`) + rôle `staff_roles` ; un client ne peut jamais devenir admin par lui-même |

**Conclusion** : ce changement ne fragilise ni les achats ni la bibliothèque (rattachés à un identifiant stable) ; il **supprime** les risques propres au PIN à 4 chiffres et au recyclage des numéros de téléphone. Le nouveau risque principal (prise de contrôle anticipée par e-mail) est couvert par la confirmation d'e-mail obligatoire et sera testé.

### Ce qu'il faudra (sans SMS)
- Un projet **Google Cloud** (gratuit) pour l'identifiant de connexion Google et l'écran de consentement — créé par le fondateur, guidé.
- Un **service d'envoi d'e-mails** (SMTP) pour les e-mails de confirmation et de réinitialisation : l'envoi intégré de Supabase est limité et réservé aux tests. Des offres gratuites existent (volumes limités) — **à vérifier** au moment du choix (D-24).

## 2. Lecteur vertical 9:16

- Format **par série** : vertical (9:16, privilégié) ou horizontal (16:9), choisi dans l'administration.
- **Jamais de déformation ni de recadrage abusif** : la vidéo est affichée entière (`contain`) ; les zones vides éventuelles sont comblées par un fond flou tiré de l'image, pas par un recadrage.
- Vidéo verticale : occupe presque tout l'écran du téléphone. Vidéo horizontale : affichée entière au centre, avec passage en plein écran paysage à la demande.
- Commandes discrètes : lecture/pause (toucher), son, barre de progression, plein écran, épisode précédent/suivant, titre de la série et numéro d'épisode.
- Choix du lecteur (D-13) : **lecteur sur mesure** (hls.js + interface Agodjié TV). Le lecteur intégré de Bunny (iframe) ne permet pas le défilement continu entre épisodes.

## 3. Visionnage en défilement continu (inspiré des vidéos verticales)

- Glisser vers le haut = épisode suivant ; vers le bas = épisode précédent ; enchaînement automatique à la fin d'un épisode.
- Progression mémorisée par épisode ; reprise exacte de la série.
- Épisode non débloqué : la diapositive affiche une proposition claire (épisode ou pass) ; **jamais de lecture automatique vers un contenu payant**, jamais de paiement implicite.
- Pass saison : débloque tous les épisodes publiés de la saison et les futurs ; aucun nouveau paiement entre les épisodes de cette saison ; n'expire pas ; **ne couvre jamais une autre saison** (message explicite en fin de saison).
- Fin de saison : proposition de la saison suivante (lecture si accessible, sinon offre de déblocage claire).

## 4. Architecture du lecteur : cinq responsabilités séparées

| Couche | Rôle | Où |
|---|---|---|
| Interface du lecteur | Affichage, gestes, commandes | Navigateur |
| Moteur de diffusion | HLS adaptatif, préchargement, renouvellement du lien signé, reprise sur erreur réseau | Navigateur |
| Droits d'accès | `has_episode_access`, émission du lien signé | **Serveur uniquement** |
| Progression | Position par épisode, « vu », reprise | Serveur (connecté) / appareil (visiteur) |
| Navigation (séquenceur) | Ordre des épisodes, états des diapositives (lecture, verrouillé, bientôt), fin de saison, saison suivante | Serveur (calcul) + navigateur (affichage) |

Détails : TECHNICAL_ARCHITECTURE §6.4, PRODUCT_REQUIREMENTS §5.

## 5. Revue de sécurité indépendante (2026-11-20)

Une relecture indépendante a renforcé : confirmation d'e-mail avant toute connexion, test de prise de contrôle anticipée dans les deux sens, `ON DELETE RESTRICT` (aucun achat perdu par suppression), transferts d'achats à double confirmation, comptes admin sur adresses dédiées sans Google, vérification des sessions côté Supabase, route `/auth/confirm`, CSRF sur les routes API, jetons de renouvellement distincts pour le défilement. Détails : SECURITY_REQUIREMENTS §3, §6, §10.
