# Observatoire des aménagements cyclables - Montreuil

Projet de démonstration, non officiel et non réalisé pour le compte de la Ville de Montreuil.

## Objectif

Ce projet présente un tableau de bord cartographique permettant de visualiser les aménagements cyclables linéaires de Montreuil, les quartiers, les stationnements avec arceaux et les implantations Vélobox.

Il a été réalisé comme étude de cas dans le cadre d'une candidature au poste de Chargé de projets SIG.

## Architecture

L'application suit une architecture hybride :

- ArcGIS Online héberge les quatre GeoJSON publics utilisés comme sources prioritaires ;
- une Web Map ArcGIS Online présente les mêmes couches dans un environnement SIG ;
- le Dashboard est développé avec des technologies open source et déployé sur GitHub Pages ;
- des copies locales GeoJSON sont conservées dans `data/` comme secours si une source ArcGIS Online est indisponible.

## Technologies

- ArcGIS Online
- Leaflet
- Chart.js
- Turf.js
- HTML
- CSS
- JavaScript

## Données et sources

Les données proviennent des sources publiques utilisées pour la préparation du projet :

- Montreuil Data - Aménagement vélo à Montreuil ;
- Montreuil Data - Secteurs & Quartiers ;
- Montreuil Data - Arceaux vélo ;
- Montreuil Data - Abris sécurisés pour les vélos / Vélobox ;
- Ville de Montreuil - Plan Vélo 2023-2026.

Sources ArcGIS Online prioritaires :

- Aménagements cyclables : https://www.arcgis.com/sharing/rest/content/items/3bdca8302376475c8260db020549826e/data
- Quartiers : https://www.arcgis.com/sharing/rest/content/items/57cd71e3000941f79a68da9929547cfe/data
- Stationnements avec arceaux : https://www.arcgis.com/sharing/rest/content/items/117f60af802f471ba21f00bb6cc61aaf/data
- Vélobox : https://www.arcgis.com/sharing/rest/content/items/61f678a9a63a45fbbd00c87ed852b7c8/data

La licence du code ne remplace pas les licences propres aux données publiques. Les données doivent être réutilisées selon leurs conditions d'origine et avec mention de la source.

## Indicateurs

Le Dashboard calcule notamment :

- longueur totale du réseau cyclable inventorié ;
- nombre de tronçons cyclables ;
- répartition par type d'aménagement ;
- nombre de quartiers chargés comme contexte cartographique ;
- nombre de sites de stationnement avec arceaux ;
- somme des places déclarées pour les arceaux ;
- nombre d'implantations Vélobox ;
- somme des capacités indicatives des Vélobox ;
- nombre de tronçons associés à la période documentée 2018-2022.

## Limites

Les années précises de réalisation ne sont pas disponibles dans les données publiques exploitées. Aucune année fictive n'a été ajoutée.

La période 2018-2022 est affichée uniquement lorsqu'elle est documentée par le Plan Vélo de Montreuil. Elle ne doit pas être interprétée comme une année de réalisation.

Les quartiers sont utilisés comme couche de contexte et ne sont pas inclus dans les indicateurs du réseau cyclable.

## Secours local

Au chargement, chaque couche tente d'abord de récupérer son GeoJSON public depuis ArcGIS Online avec `fetch` sans cache.

Si une couche ArcGIS échoue ou ne renvoie pas un GeoJSON valide, seule cette couche bascule vers sa copie locale dans `data/`. L'échec d'une couche ne bloque donc pas le reste du Dashboard.

## Liens

- Web Map ArcGIS Online : https://www.arcgis.com/apps/mapviewer/index.html?webmap=6d0277782d2b4c9cb45f238172a0dfd9
- Dashboard GitHub Pages : https://abdillahi-aden.github.io/observatoire_amenagement_cyclables/

## Lancement local

```bash
python -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000
```
