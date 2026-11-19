# Fiche de recette — Étape L1 : écrans V2 branchés sur la base, lecture des épisodes gratuits

Statut : **validée et clôturée par le fondateur** (y compris le choix de qualité, option A). Reste à faire : test réel sur iPhone (lecture native Safari) dès la préproduction en ligne.
Démonstration : vidéo `lecteur-reel-l1/parcours-lecteur-reel.mp4` (40 s) et captures `lecteur-reel-l1/`.
Le site de préproduction en ligne (pour tester sur votre téléphone) nécessite les comptes Vercel et Supabase prévus à l'étape L2 : voir le rapport d'étape.

## Ce qui fonctionne réellement
- Catalogue `/series` et fiche série `/series/sang-royal` lus **depuis la base de données** (titres, épisodes, durées, prix du pays d'affichage : Bénin, prix indicatifs).
- Écrans **identiques à la maquette V2 validée** (mêmes composants), sans les réglages de maquette.
- Lecteur vertical : lecture **HLS** (360p / 480p / 720p, qualité adaptée à la connexion et à l'écran), via un **lien signé de 5 minutes** demandé au serveur, qui vérifie le droit de lecture en base.
- Épisodes 1 et 2 (gratuits) lisibles sans compte ; épisodes payants : diapositive de déblocage, **aucune vidéo chargée** ; épisode programmé : annoncé, jamais lisible ; brouillon : jamais visible.
- Enchaînement automatique, arrêt devant l'épisode payant, préchargement léger du début de l'épisode suivant, aller-retour entre épisodes.
- Reprise : la fiche propose « Reprendre — Épisode N à m:ss » (mémorisé sur l'appareil).
- Erreurs : hors connexion (message + reprise au retour du réseau), service indisponible (« Réessayer »), lien expiré (renouvelé sans interrompre la lecture).
- Fin de série : autres séries de la base, retour au catalogue.
- Boutons d'achat : « Les achats ouvriront très bientôt » — **aucun paiement, même simulé**, sur le site réel.

## À vérifier (sur la vidéo et les captures, puis sur votre téléphone dès la préproduction en ligne)
- [ ] Le catalogue et la fiche série ressemblent exactement à la maquette V2.
- [ ] La fiche affiche « 6 épisodes · 9 min 19 au total · 1 à venir · épisodes 1 et 2 gratuits », le Pass à 1 500 FCFA (économie 496 FCFA) et l'épisode à 499 FCFA.
- [ ] L'épisode 1 démarre immédiatement ; l'épisode 2 s'enchaîne ; la lecture s'arrête devant l'épisode 3.
- [ ] « Débloquer » affiche « Les achats ouvriront très bientôt » (aucun paiement).
- [ ] En coupant le Wi-Fi / les données : message clair, puis reprise au retour du réseau.
- [ ] Revenir en arrière d'un épisode relance bien sa lecture.
- [ ] La fin de série propose les autres séries et le retour au catalogue.

## Limites connues de cette étape (prévues dans le plan)
- Vidéos de **démonstration** (14 s, sans son) servies par le simulateur ; Bunny Stream à l'étape L2.
- Pas de comptes ni d'achats (étapes L3 et L4) ; progression mémorisée sur l'appareil seulement.
- Choix de la qualité (FR-36) : **ajouté** après validation de l'option A — bouton « Auto » entre « Épisodes » et « Plein écran » ; Automatique (défaut), Économie de données 360p, Équilibré 480p, Haute qualité 720p ; consommations affichées ; choix mémorisé sur l'appareil ; connexion trop faible en mode manuel → proposition de repasser en automatique, sans couper la lecture. Captures : `qualite-integree/`.
- Testé dans Chromium (formats Android, iPhone et ordinateur). Le vrai Safari d'iPhone (lecture HLS native) sera vérifié sur appareil réel dès la préproduction en ligne.
