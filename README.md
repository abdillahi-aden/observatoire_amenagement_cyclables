# Observatoire des aménagements cyclables — Montreuil

Tableau de bord cartographique en JavaScript pour explorer le réseau cyclable, les quartiers et les stationnements vélo de Montreuil.

[Démonstration GitHub Pages](https://abdillahi-aden.github.io/observatoire_amenagement_cyclables/) · [Web Map ArcGIS Online](https://www.arcgis.com/apps/mapviewer/index.html?webmap=6d0277782d2b4c9cb45f238172a0dfd9)

**Projet de démonstration non officiel, non réalisé pour le compte de la Ville de Montreuil.** Il a été conçu comme étude de cas dans le cadre d’une candidature au poste de Chargé de projets SIG.

## Fonctionnalités

- Carte interactive des aménagements cyclables, quartiers, sites avec arceaux et implantations Vélobox.
- Filtres des tronçons par type d’aménagement et information temporelle documentée, avec réinitialisation.
- Consultation d’un tronçon dans une fiche et une fenêtre cartographique.
- Indicateurs de longueur et de nombre de tronçons, graphique de répartition des longueurs par type.
- Comptage des sites de stationnement et somme des places ou capacités déclarées.
- Activation des couches cartographiques et lien vers la Web Map ArcGIS Online.
- Chargement de GeoJSON publics ArcGIS Online, avec copie locale de secours pour chaque couche et signalement du recours au secours.

Les filtres portent sur les aménagements cyclables. Les indicateurs d’arceaux et de Vélobox restent calculés sur leurs couches complètes ; masquer une couche ne retire pas ses données des indicateurs. Les quartiers servent de contexte cartographique.

## Technologies et architecture

L’application est un site statique **HTML, CSS et JavaScript**, sans serveur applicatif ni étape de compilation :

- **Leaflet 1.9.4** : carte, couches GeoJSON et interactions ;
- **Chart.js 4.4.3** : graphique de répartition des longueurs ;
- **Turf.js 7.2.0** : calcul de longueur lorsque les attributs de longueur sont absents ou invalides ;
- **ArcGIS Online** : hébergement public des GeoJSON, métadonnées et Web Map ;
- **GitHub Pages** : démonstration publiée.

```text
index.html   Structure et chargement des bibliothèques depuis les CDN
styles.css   Présentation du tableau de bord
app.js       Sources, chargement, filtres, carte et indicateurs
data/        Quatre copies GeoJSON de secours
LICENSE      Licence MIT du code
```

### Chargement des données

Pour chaque couche, `loadLayer()` tente d’abord la source ArcGIS Online avec `fetch` sans cache, puis sa copie dans `data/` si la première échoue ou ne renvoie pas une `FeatureCollection`. Ce secours est indépendant pour chaque couche.

Si une couche échoue **également sur sa copie locale**, `loadData()` signale l’erreur et l’application affiche une erreur de chargement globale. Le secours de données ne rend pas l’application entièrement utilisable hors connexion : les bibliothèques et le fond de carte restent externes.

## Installation et lancement local

Prérequis : Git pour cloner, Python 3 pour le serveur HTTP local, un navigateur récent et une connexion Internet pour les bibliothèques, les sources ArcGIS et les tuiles cartographiques.

```bash
git clone https://github.com/abdillahi-aden/observatoire_amenagement_cyclables.git
cd observatoire_amenagement_cyclables
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir [http://127.0.0.1:8000](http://127.0.0.1:8000), puis arrêter le serveur avec `Ctrl+C`. Servir le dossier par HTTP évite les restrictions de chargement des GeoJSON rencontrées en ouvrant directement `index.html` avec `file://`.

Aucun `npm install`, aucune variable d’environnement et aucune clé privée ne sont nécessaires. Les bibliothèques sont chargées par `index.html` depuis **unpkg** et **jsDelivr**. Les adresses des sources et des copies locales sont définies dans `DATA_SOURCES` au début de `app.js` ; le fond cartographique Esri est défini dans `initMap()`.

Les identifiants d’items ArcGIS présents dans le code désignent des ressources partagées publiquement ; ce ne sont pas des jetons d’authentification. Aucun accès privé à ArcGIS n’est configuré dans cette application.

## Données et sources

Les sources publiques citées dans le projet sont : Montreuil Data — Aménagement vélo à Montreuil, Secteurs & Quartiers, Arceaux vélo, Abris sécurisés pour les vélos / Vélobox ; et Ville de Montreuil — Plan Vélo 2023-2026.

| Couche | GeoJSON ArcGIS Online prioritaire | Copie locale |
| --- | --- | --- |
| Aménagements cyclables | [Données publiques](https://www.arcgis.com/sharing/rest/content/items/3bdca8302376475c8260db020549826e/data) | [GeoJSON](data/amenagements_cyclables_montreuil_suivi.geojson) |
| Quartiers | [Données publiques](https://www.arcgis.com/sharing/rest/content/items/57cd71e3000941f79a68da9929547cfe/data) | [GeoJSON](data/quartiers_montreuil.geojson) |
| Stationnements avec arceaux | [Données publiques](https://www.arcgis.com/sharing/rest/content/items/117f60af802f471ba21f00bb6cc61aaf/data) | [GeoJSON](data/arceaux_velo_montreuil.geojson) |
| Vélobox | [Données publiques](https://www.arcgis.com/sharing/rest/content/items/61f678a9a63a45fbbd00c87ed852b7c8/data) | [GeoJSON](data/velobox_montreuil.geojson) |

La [licence MIT](LICENSE) couvre le code. Elle ne remplace pas les licences propres aux données publiques, à réutiliser selon leurs conditions d’origine et avec mention des sources.

## Indicateurs et limites d’interprétation

- La longueur d’un tronçon provient de `longueur_m` ou de `longueur_src`, sinon de `turf.length()` en kilomètres convertis en mètres. Les totaux dépendent de la qualité des données chargées.
- Les années précises de réalisation ne sont pas disponibles dans les données exploitées ; aucune année fictive n’a été ajoutée. La période **2018-2022** est affichée lorsqu’elle est documentée par le Plan Vélo ; elle ne constitue pas une année de réalisation.
- Les places d’arceaux et les capacités de Vélobox sont des valeurs déclarées ou indicatives, sans mesure d’occupation en temps réel.
- Les copies locales sont des instantanés. Leur mise à jour n’est pas automatisée dans ce dépôt. La date affichée provient des métadonnées ArcGIS disponibles et ne certifie pas l’actualité d’une copie locale utilisée en secours.
- La disponibilité des CDN, des tuiles Esri et des ressources publiques ArcGIS conditionne le rendu. La vérification du GeoJSON porte sur sa structure générale, sans validation exhaustive des géométries et attributs.

## Vérifications

Le dépôt ne contient pas de suite de tests automatisés ni de workflow de tests applicatifs. Le workflow GitHub Pages visible dans Actions concerne la construction et la publication du site ; son succès n’atteste pas à lui seul le fonctionnement des interactions ou des services externes.

Pour une vérification manuelle : ouvrir la démonstration, contrôler l’affichage de la carte et des indicateurs, changer le type et la période, réinitialiser, activer les couches de stationnement, puis cliquer un tronçon pour consulter sa fiche.

Pour vérifier uniquement la syntaxe JavaScript, si Node.js est disponible :

```bash
node --check app.js
```

Cette commande ne charge ni la carte ni les données et ne constitue pas un test fonctionnel.
