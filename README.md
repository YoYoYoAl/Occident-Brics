# Occident vs BRICS

Jeu vidéo de grande stratégie au tour par tour : affrontement Occident / Chine-BRICS, de 2000 T1 à 2050 T4, par trimestres (204 rounds).

Le développement avance par versions jouables (v0.1 à v1.0), chacune accompagnée de tests d'acceptation.

## Version 0.1 : squelette

- Carte du monde interactive (frontières Natural Earth via `world-atlas`), 50 pays jouables.
- Temps trimestriel 2000-2050, 4 ères, lecture / pause / 3 vitesses.
- Fiche pays : indicateurs réels de l'an 2000 par famille, avec leurs sources.
- Sauvegarde dans le navigateur, export et import de fichier.
- Seule la population évolue, selon la tendance réelle 1995-2000 (provisoire, remplacée en v0.2).

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
Les attributs sans source publique (militaire, cyber, éducation...) seront ajoutés en v0.2, avec leur source ou la mention « estimation ».
