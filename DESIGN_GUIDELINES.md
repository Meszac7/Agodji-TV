# Agodjié TV — Lignes directrices de design

> Statut : Phase 1 — **système visuel provisoire**. Aucun logo ni identité de marque officielle n'a été fourni **[D-14]** : ce document définit une base cohérente, à ajuster dès réception des éléments officiels. Rien ici ne constitue une identité de marque définitive.

---

## 1. Intention

Agodjié TV doit ressembler à une **marque de divertissement premium**, pas à un tableau de bord SaaS ni à un modèle générique.

| Mot-clé | Traduction concrète |
|---|---|
| Cinématographique | Visuels plein cadre, fonds sombres profonds, dégradés qui fondent l'image dans le fond, peu de bordures |
| Immersif | Les affiches et images de série dominent ; l'interface s'efface |
| Premium | Typographie soignée, espacements généreux, animations sobres, aucune surcharge |
| Africain | Porté par les **contenus** (visages, décors, titres) et l'éditorial ; motifs graphiques uniquement s'ils viennent de la future identité officielle — pas de clichés décoratifs inventés |
| Mobile d'abord | Conçu pour un pouce sur un écran de 360 px, puis élargi |

## 2. Couleurs (jetons)

Toutes les couleurs sont des **jetons** (variables CSS). Le code n'utilise jamais une couleur en dur. Contrastes calculés selon WCAG 2.1.

### 2.1 Thème sombre (par défaut)

| Jeton | Valeur | Usage | Contraste vérifié |
|---|---|---|---|
| `--bg` | `#0B0B0F` | Fond de page | — |
| `--surface` | `#16161D` | Cartes, panneaux | — |
| `--surface-raised` | `#20202A` | Menus, modales | — |
| `--border` | `#2A2A35` | Séparateurs discrets | — |
| `--text` | `#F5F3EE` | Texte principal | 17,7:1 sur `--bg` |
| `--text-muted` | `#A8A5B3` | Texte secondaire | 8,1:1 sur `--bg`, 7,5:1 sur `--surface` |
| `--primary` | `#F5B800` | **Jaune royal** : boutons d'action principaux, badges de prix, focus | 11,0:1 sur `--bg` |
| `--on-primary` | `#14110A` | Texte sur bouton jaune | 10,5:1 sur `--primary` |
| `--primary-hover` | `#FFC933` | Survol / appui | 12,3:1 avec `--on-primary` |
| `--danger` | `#FF5A5F` | Texte/icône d'erreur sur fond sombre | 6,4:1 sur `--bg` |
| `--danger-solid` | `#D92D35` | Fond des boutons destructifs (texte blanc) | 4,8:1 |
| `--success` | `#3DD68C` | Confirmation de paiement, badge « Acheté » (texte/icône) | 10,5:1 sur `--bg`, 9,6:1 sur `--surface` |

### 2.2 Thème clair

| Jeton | Valeur | Contraste vérifié |
|---|---|---|
| `--bg` | `#FAF8F4` | — |
| `--surface` | `#FFFFFF` | — |
| `--surface-raised` | `#FFFFFF` + ombre légère | — |
| `--surface-sunken` | `#F3F0EA` (zones secondaires) | texte 16,1:1, texte secondaire 6,0:1 |
| `--border` | `#E4E0D8` | — (séparateurs décoratifs) |
| `--text` | `#15141A` | 17,3:1 sur `--bg`, 18,3:1 sur `--surface` |
| `--text-muted` | `#5C5966` | 6,4:1 sur `--bg` |
| `--primary` | `#F5B800` (fond de bouton uniquement) | — |
| `--on-primary` | `#14110A` | 10,5:1 sur `--primary` |
| `--primary-hover` | `#FFC933` | 12,3:1 avec `--on-primary` |
| `--primary-text` | `#8A6400` (liens/texte « jaune » sur fond clair) | 5,1:1 sur `--bg`, 5,4:1 sur `--surface` |
| `--success` | `#1A7F4B` | 4,7:1 sur `--bg`, 5,0:1 sur `--surface` |
| `--danger` / `--danger-solid` | `#B42318` (texte blanc sur fond : 6,6:1) | 6,2:1 sur `--bg` |

**Règle** : le jaune n'est **jamais** utilisé comme couleur de texte sur fond clair (contraste insuffisant) ; on utilise `--primary-text`.

### 2.3 Règles d'usage
- **Jaune royal = action principale.** Un seul bouton jaune par écran ou par carte (« Regarder », « Acheter le pass », « Payer »).
- **Rouge = critique ou destructif uniquement** : suppression, dépublication, blocage, erreur de paiement. Jamais décoratif.
- Les badges `Gratuit` / `Acheté` utilisent des styles neutres pour ne pas concurrencer le bouton principal.
- Le thème choisi est mémorisé (cookie) et appliqué avant l'affichage, sans flash. Par défaut : sombre. Option « suivre le système » en P1.

## 3. Typographie

| Rôle | Police | Graisse | Taille mobile → bureau |
|---|---|---|---|
| Titre de série (hero) | **Figtree** | 800 | 32 → 56 px |
| Titres de section | Figtree | 700 | 20 → 28 px |
| Titres de carte | Figtree | 600 | 16 → 18 px |
| Texte courant | **Roboto** | 400 | 15 → 16 px, interligne 1,5 |
| Métadonnées, badges | Roboto | 500 | 12 → 13 px |
| Prix | Figtree | 700, chiffres tabulaires | 16 → 18 px |

- Figtree pour l'**expression** (titres, prix), Roboto pour la **lecture** (textes, interface).
- Polices auto-hébergées (`next/font`), sous-ensemble latin étendu (accents français), `font-display: swap`.
- Taille minimale 12 px ; jamais de texte important en dessous de 14 px sur mobile.

## 4. Espacements, formes, mouvement

- Grille de base **4 px** ; espacements : 4, 8, 12, 16, 24, 32, 48, 64.
- Marges latérales mobiles : 16 px.
- Rayons : 8 px (boutons, badges), 12 px (cartes), 16 px (modales/feuilles).
- Ombres très légères en sombre (on hiérarchise par la luminosité des surfaces plutôt que par l'ombre).
- Animations : 150–250 ms, transitions d'opacité/échelle ; respect de `prefers-reduced-motion`.
- Zones tactiles : **minimum 44 × 44 px**.

## 5. Composants clés

### 5.1 Affiche de série (carte)
- Format portrait **2:3**, image plein cadre, titre en dessous (ou incrusté si l'affiche n'a pas de titre).
- Badge `Bientôt` en coin pour les séries à venir ; légère désaturation ou voile pour les distinguer.
- Chargement : couleur dominante ou flou en attendant l'image (pas de saut de mise en page).

### 5.2 Hero (accueil et fiche série)
- La bannière reste **sombre dans les deux thèmes** (effet « écran de cinéma ») ; en thème clair, elle se détache du reste de la page claire.
- Image de bannière plein écran (mobile : ~70 % de la hauteur), dégradé vers `--bg` en bas pour la lisibilité.
- Titre (Figtree 800), accroche, métadonnées (saisons, genre, mention IA **[D-10]**).
- Un bouton jaune principal (« Regarder l'épisode 1 — Gratuit » ou « Reprendre ») + un bouton secondaire (« Plus d'infos » / « Ajouter… » P2).

### 5.3 Carte d'épisode
- Vignette 16:9 (ou 9:16 si format vertical **[D-07]**), numéro, titre, durée, résumé sur 2 lignes.
- **Badge d'accès toujours visible** : `Gratuit` · `300 FCFA` · `Acheté` · `Inclus dans votre pass`.
- Icône lecture si accessible ; cadenas discret si payant non possédé.

### 5.4 Écran d'achat (feuille modale sur mobile)
- Deux options côte à côte ou empilées : **Épisode — 300 FCFA** / **Pass saison — 1 500 FCFA (n épisodes)**. Le pass est mis en avant (« Meilleure offre », économie calculée à partir des prix réels).
- **Pays de paiement** : au premier achat, une question claire « Dans quel pays se trouve votre compte Mobile Money ou votre carte ? » avec une suggestion présélectionnée (drapeau + nom) à confirmer d'un geste ; ensuite rappel compact « Payer depuis : Côte d'Ivoire · Changer ». Pays non disponibles visibles mais grisés « bientôt ». Changer de pays met à jour prix et moyens immédiatement.
- **Pays d'affichage des prix** (navigation) : mention discrète « Prix pour : Bénin ▾ » près des prix, modifiable.
- **Moyens disponibles** sous forme de tuiles (« Mobile Money » avec logos des opérateurs du pays, « Carte bancaire » avec Visa/Mastercard), une seule sélection ; jamais le nom du prestataire technique (CinetPay/FedaPay).
- Un seul bouton jaune « Payer » (libellé adapté : « Payer avec Mobile Money », « Payer par carte »).
- Aucun pays de paiement disponible pour l'utilisateur : message neutre « Le paiement n'est pas encore disponible dans votre pays. Vous pouvez continuer à regarder les épisodes gratuits. », sans bouton jaune, avec un lien vers les épisodes gratuits.
- Logos d'opérateurs : fichiers officiels fournis par les prestataires/opérateurs, utilisés selon leurs règles **[à obtenir]**.
- Mentions claires : achat définitif, accès sans limite de durée.
- Si non connecté : la connexion (« Continuer avec Google » ou e-mail + mot de passe) s'insère dans la même feuille, par-dessus le lecteur, sans perdre l'épisode en cours.

### 5.5 États de paiement
- *En vérification* : animation sobre + texte rassurant, jamais d'écran vide.
- *Réussi* : confirmation + « Regarder maintenant » (jaune).
- *Échoué* : message en `--danger`, cause compréhensible, « Réessayer ».
- *En attente prolongée* : explication + lien vers la bibliothèque.

### 5.6 Lecteur vertical en défilement continu (fonctionnalité centrale — PRODUCT_REQUIREMENTS §5)
**Principe : la vidéo d'abord.** L'interface du site disparaît ; seules des commandes discrètes flottent au-dessus de l'image et s'effacent après ~3 s.

- **Plein écran mobile** : une diapositive = un épisode = toute la hauteur de l'écran (`100dvh`), fond noir.
- **Image entière** (`contain`) : jamais de déformation ni de recadrage ; les zones vides sont comblées par un **fond flou** de l'image.
- **Haut, discret** : retour (flèche) · « **Sang Royal** · S1 · Épisode 3 » en petit texte blanc avec ombre légère.
- **Côté droit** (colonne verticale d'icônes, comme les formats verticaux) : son, épisodes (liste), plein écran, qualité.
- **Bas** : barre de progression fine (2 px) qui s'épaissit au toucher (6 px) avec curseur **jaune royal** ; temps écoulé / durée en chiffres tabulaires.
- **Toucher au centre** : pause / lecture (icône brève au centre, 600 ms).
- **Glisser** vers le haut / le bas : épisode suivant / précédent ; indice visuel discret la première fois (« Glissez pour l'épisode suivant »).
- **Ordinateur** : colonne vidéo centrée au format 9:16 sur fond noir flouté, boutons ▲ ▼ à droite, raccourcis clavier.
- **Vidéo horizontale** : image entière au centre, fond flou au-dessus et au-dessous ; bouton plein écran = passage en paysage.
- **Diapositive de déblocage** : image floutée et assombrie, cadenas, titre de l'épisode, deux options (pass mis en avant en jaune, épisode seul en secondaire), mention « Achat définitif · sans expiration ».
- **Diapositive « bientôt »** : image floutée, « Épisode 7 — disponible le 26 novembre », mention « inclus dans votre pass » si c'est le cas.
- **Fin de saison** : carte plein écran « Saison 1 terminée » ; saison suivante avec son affiche ; si non débloquée : bouton jaune « Débloquer la saison 2 — 1 500 FCFA » et mention explicite « Votre pass Saison 1 ne couvre pas la saison 2 ».
- **Panneau « Épisodes »** : feuille qui monte du bas, liste compacte (numéro, titre, durée, état : vu ✓, en cours, gratuit, débloqué, cadenas, bientôt), épisode courant surligné.
- **Chargement** : anneau discret ; **erreurs** : panneau sombre centré, message clair et une seule action jaune.
- **Reprise** : démarrage directement à la position mémorisée, avec un court rappel « Reprise à 6:12 · Recommencer ».

### 5.7 Connexion et inscription
- Feuille (mobile) ou fenêtre centrée (ordinateur), jamais une page qui fait perdre le contexte.
- Bouton « **Continuer avec Google** » en premier (logo Google selon ses règles d'usage), puis séparateur « ou », puis e-mail + mot de passe.
- Lien « Mot de passe oublié ? » ; bascule « Créer un compte / J'ai déjà un compte ».
- Après inscription par e-mail : écran « Vérifiez votre boîte mail » avec bouton « Renvoyer l'e-mail ».
- Mot de passe : indication de longueur minimale, bouton afficher/masquer.

### 5.8 Administration
- Même jetons de couleur et polices, mais mise en page **fonctionnelle et dense** : tableaux, formulaires clairs, thème clair conseillé pour le travail prolongé.
- Actions destructrices en rouge avec **confirmation explicite**.
- Pas d'esthétique « marketing » dans l'admin : efficacité d'abord.

## 6. Mise en page responsive

| Largeur | Grille d'affiches | Navigation |
|---|---|---|
| < 640 px | Défilement horizontal, ~2,3 affiches visibles | Barre inférieure : Accueil · Catalogue · Bibliothèque · Compte |
| 640–1024 px | 3–4 colonnes | Barre supérieure |
| > 1024 px | 5–6 colonnes, largeur max ~1440 px | Barre supérieure transparente sur le hero |

## 7. Images et performance
- Affiches et bannières servies en **WebP/AVIF**, plusieurs tailles (`srcset`), chargement différé hors écran.
- Formats à fournir par l'équipe contenu : affiche 2:3 (min. 1000 × 1500), bannière 16:9 (min. 1920 × 1080) avec zone sûre pour le texte, vignettes d'épisode 16:9 (ou 9:16).
- Pas de vidéo en lecture automatique sur l'accueil mobile (consommation de data).

## 8. Ton éditorial
- Français simple, chaleureux, direct. Tutoiement ou vouvoiement : **vouvoiement recommandé** par défaut **[à valider]**.
- Prix toujours affichés avec la devise de la grille du pays : « 300 FCFA » (XOF/XAF), « 0,50 $ » (RDC si USD), « … GNF » (Guinée) **[D-03]**. Formats de nombres français (espace pour les milliers : « 1 500 FCFA »).
- Messages d'erreur : ce qui s'est passé + quoi faire.

## 9. Marque provisoire
- Logotype **texte** « Agodjié TV » en Figtree 800 tant que le logo officiel n'est pas fourni.
- Favicon et icônes : provisoires, remplacés à réception des fichiers officiels (SVG + PNG).
- Éléments à fournir : logo (versions claire/sombre), éventuelle couleur de marque si différente du jaune proposé, règles d'usage.

## 10. Livrables de design avant développement des écrans
1. Page de référence des jetons et composants (« guide de style » vivant dans l'application, accessible en préproduction).
2. Maquettes mobiles du parcours complet (DEVELOPMENT_ROADMAP, étape 2), dont le **lecteur vertical en défilement continu** (maquette cliquable `/maquettes/lecteur`).
3. Validation par le fondateur avant intégration des écrans.
