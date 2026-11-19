# Fiche de validation — Maquette du lecteur (version 2 : séries sans saisons, Pass série)

À valider par le fondateur **avant** la construction complète du lecteur (étape 2).
Version 1 (avec saisons, principe validé) : `docs/recette/maquette-lecteur/`. **Version 2** (à valider) : `docs/recette/maquette-lecteur-v2/`.

## Comment la voir
- **Vidéo du parcours** (43 s) : `docs/recette/maquette-lecteur-v2/parcours-pass-serie.mp4`
- **Captures** : `docs/recette/maquette-lecteur-v2/` (13 écrans)
- **Maquette cliquable** : page `/maquettes/lecteur` (dès qu'un lien de préproduction existe)

Rappels : vidéos de démonstration de 14 secondes **sans son** (la liste affiche les durées d'une vraie série, ~1 min 30) ; paiements **simulés** ; titres fictifs.

## Ce qui a changé depuis la version 1
- Plus aucune saison : une série = une histoire complète, épisodes 1 → N.
- « Débloquer toute la série — 1 500 FCFA » (**Pass série**, prix propre à la série) remplace le pass saison ; l'épisode à l'unité coûte **499 FCFA**.
- **Fiche série** : deux offres clairement présentées — Pass série (« Économisez 496 FCFA + les prochains épisodes », « Au lieu de 1 996 FCFA pour 4 épisodes à l'unité ») et À l'unité (499 FCFA par épisode). L'économie tient compte des épisodes déjà achetés et n'est jamais négative.
- La lecture **reprend automatiquement** après le paiement (plus besoin de toucher « Regarder maintenant »).
- **Fin de série** : « D'autres séries à découvrir » + « Retour au catalogue » ; date du prochain épisode s'il en reste d'annoncés ; jamais de saison suivante.
- La fiche série affiche le **nombre d'épisodes et la durée totale** ; avec le pass, plus aucun prix ni proposition d'achat.
- Titre dans le lecteur : « Sang Royal · Épisode 3 / 6 ».

## Ce qu'il faut regarder
- [ ] Fiche série : épisodes, durées, durée totale, prix du pass et de l'épisode, bouton « Regarder » / « Reprendre ».
- [ ] Défilement vertical, enchaînement automatique, commandes discrètes (inchangés).
- [ ] Épisode payant : « Débloquer toute la série — 1 500 FCFA · économisez 496 FCFA » / « Seulement cet épisode — 499 FCFA ».
- [ ] Fiche série : les deux offres (Pass avec l'économie, 499 FCFA l'épisode) sont claires ; achat du Pass possible directement depuis la fiche.
- [ ] Réglage « Épisode 5 acheté » : l'économie affichée diminue (3 épisodes restants).
- [ ] Après paiement : la lecture reprend seule ; les épisodes suivants s'enchaînent sans aucun nouveau paiement.
- [ ] Épisode à venir : « Disponible le … · Inclus dans votre pass série ».
- [ ] Fin de série : autres séries, retour au catalogue, aucune mention de saison.
- [ ] Fiche avec pass : « Pass série acquis », épisodes « Inclus », plus aucun prix.
- [ ] Série horizontale : image entière, ni déformée ni recadrée.

## Vos remarques

## Décision
- [ ] Maquette v2 validée — le lecteur complet peut être construit
- [ ] Ajustements demandés
