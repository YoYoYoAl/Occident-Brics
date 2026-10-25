"""Construit src/data/trajectoires.json : PIB, population et CO2 réels annuels 2000-2022 des 50 pays.

Usage : python3 -I outils/construire_trajectoires.py <owid-co2-data.csv> src/data/pays2000.json
Source : Our World in Data, co2-data (PIB Maddison Project Database 2023 en $ internationaux 2011,
population UN WPP, CO2 Global Carbon Budget). Sert de trajectoire de référence : le moteur n'ajoute que les écarts de jeu.
Une année manquante reste null (le moteur prolonge alors la dernière croissance connue).
"""
import csv, json, sys

ANNEES = range(2000, 2023)


def main(co2, pays2000):
    isos = [p["iso3"] for p in json.load(open(pays2000, encoding="utf-8"))["pays"]]
    d = {i: {k: [None] * len(ANNEES) for k in ("pib", "population", "co2")} for i in isos}
    with open(co2, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            i, a = r["iso_code"], int(r["year"])
            if i in d and a in ANNEES:
                for cle, col in (("pib", "gdp"), ("population", "population"), ("co2", "co2")):
                    if r[col]:
                        d[i][cle][a - 2000] = float(r[col])
    sortie = {"source": "Our World in Data, co2-data (Maddison Project Database 2023 ; UN WPP ; Global Carbon Budget)",
              "anneeDebut": 2000, "anneeFin": 2022, "pays": d}
    json.dump(sortie, sys.stdout, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main(*sys.argv[1:3])
