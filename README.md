# Occident vs BRICS

Jeu vidéo de grande stratégie au tour par tour : affrontement Occident / Chine-BRICS, de 2000 T1 à 2050 T4, par trimestres (204 rounds).

Le développement avance par versions jouables (v0.1 à v1.0), chacune accompagnée de tests d'acceptation.

## Version 0.1 : squelette

- Carte du monde interactive (frontières Natural Earth via `world-atlas`), 50 pays jouables.
- Temps trimestriel 2000-2050, 4 ères, lecture / pause / 3 vitesses.
- Fiche pays : indicateurs réels de l'an 2000 par famille, avec leurs sources.
- Sauvegarde dans le navigateur, export et import de fichier.
- Seule la population évolue, selon la tendance réelle 1995-2000 (provisoire, remplacée en v0.2).

## Version 0.2 (en cours) : données réelles 2000

- 78 indicateurs réels de l'an 2000 pour les 50 pays, rattachés aux 30 attributs (`src/data/attributs2000.json`).
- Scores 0-100 des 30 attributs pour les 50 pays (`src/data/scores2000.json`, `outils/scores_attributs.py`) : estimations réalistes, formule sur les données de 2000 puis corrections documentées.
- Fiche pays : chaque attribut avec son score et ses indicateurs, l'année réelle si elle diffère de 2000 et la source au survol.
- Religion : estimation 2000 = composition 2020 du Pew Research Center, signalée « estimation ».
- Terres rares : USGS Minerals Yearbook 2000.
- Naval et aérien : indices estimés par le projet (États-Unis = 100) et importations d'armes 1981-2000 (SIPRI) ; cyber : indice estimé (rang étatique, internautes, dépenses militaires). Toutes les estimations sont signalées dans la fiche.

## Commandes

```
npm install
npm run dev      # jeu en local
npm test         # tests d'acceptation
npm run build    # dist/index.html : jeu en un seul fichier, ouvrable sans serveur
```

## Données

`src/data/pays2000.json` est généré par `outils/construire_donnees.py` à partir des fichiers d'Our World in Data
(`owid-co2-data.csv` et `owid-energy-data.csv`, dépôts github.com/owid/co2-data et github.com/owid/energy-data,
téléchargés le 25 octobre 2026). Aucune valeur n'est inventée : un indicateur absent reste vide.
`src/data/attributs2000.json` est généré par `outils/collecter_attributs.py` (Python 3 et `openpyxl`) :

```
python3 -I outils/collecter_attributs.py <dossier_cache> > src/data/attributs2000.json
```

Sources : Banque mondiale (WDI et WGI), SIPRI (dépenses militaires), USGS (terres rares, `pdftotext` requis), Our World in Data (énergie, CO2, PIB en PPA,
scolarité, ogives nucléaires de la FAS, objets spatiaux de l'ONU, biodiversité) et Wikipedia à révision fixe
(convention sur les armes chimiques, premiers lancements orbitaux). Année visée 2000, sinon la plus proche dans
1997-2003 (l'année réelle est enregistrée). Sans donnée, la valeur est `null`, jamais estimée.
