"""Complète par ESTIMATION le PIB et le CO2 absents d'Our World in Data (micro-États, îles, pays sans série Maddison).

Usage : python3 -I outils/completer_estimations.py <pays2000.json> <trajectoires.json> <bm_NY.GDP.MKTP.PP.KD.json> <bm_NY.GDP.MKTP.KD.json>
Réécrit les deux premiers fichiers. Méthode, par ordre de préférence :
- PIB : série Banque mondiale en PPA ($ internationaux constants 2021) × rapport médian Maddison / Banque mondiale de 2000
  (pays ayant les deux séries) ; à défaut, PIB en $ constants 2015 × rapport médian correspondant ; avant la première
  année publiée, la série suit la croissance d'un voisin (VOISINS_PIB) ;
- CO2 (Monaco, Saint-Marin, comptés avec la France et l'Italie par le Global Carbon Budget) : population × CO2 par habitant du voisin.
Chaque valeur complétée est listée dans « estimations » ; la source d'origine reste citée.
"""
import json, statistics, sys

VOISINS_CO2 = {"MCO": "FRA", "SMR": "ITA"}
VOISINS_PIB = {"LIE": "CHE", "SSD": "SDN"}  # rétropolation avant la première année publiée


def serie_bm(chemin):
    s = {}
    for r in json.load(open(chemin, encoding="utf-8"))[1]:
        if r["value"] is not None:
            s.setdefault(r["countryiso3code"], {})[int(r["date"])] = r["value"]
    return s


def main(pays2000, trajectoires, ppa, constant):
    P, T = json.load(open(pays2000, encoding="utf-8")), json.load(open(trajectoires, encoding="utf-8"))
    debut, fin = T["anneeDebut"], T["anneeFin"]
    estimations = {}
    sources = [("Banque mondiale NY.GDP.MKTP.PP.KD (PPA)", serie_bm(ppa)), ("Banque mondiale NY.GDP.MKTP.KD ($ constants 2015)", serie_bm(constant))]
    rapports = []
    for nom, s in sources:
        r = [T["pays"][i]["pib"][0] / s[i][debut] for i in T["pays"] if T["pays"][i]["pib"][0] and s.get(i, {}).get(debut)]
        rapports.append(statistics.median(r))
    for iso, d in sorted(T["pays"].items(), key=lambda x: x[0] in VOISINS_PIB):  # voisins complétés d'abord
        if all(v is None for v in d["pib"]):
            for (nom, s), k in zip(sources, rapports):
                if s.get(iso):
                    premiere = min(s[iso])
                    brut = [s[iso].get(a) for a in range(debut, fin + 1)]
                    v = VOISINS_PIB.get(iso)
                    for j in range(premiere - debut - 1, -1, -1):  # avant la première année publiée : croissance du voisin, sinon stable
                        g = T["pays"][v]["pib"] if v else None
                        brut[j] = brut[j + 1] * (g[j] / g[j + 1] if g and g[j] and g[j + 1] else 1)
                    d["pib"] = [float(round(k * x)) if x is not None else None for x in brut]
                    estimations.setdefault(iso, {})["pib"] = f"{nom} × {k:.3f} (rapport médian à Maddison en {debut})" + \
                        (f" ; {debut}-{premiere - 1} : croissance de {v or 'aucun voisin (stable)'}" if premiere > debut else "")
                    break
            else:
                raise SystemExit(f"{iso} : aucun PIB, même à la Banque mondiale")
        if all(v is None for v in d["co2"]) and iso in VOISINS_CO2:
            v = T["pays"][VOISINS_CO2[iso]]
            d["co2"] = [round(p * c / q, 4) if None not in (p, c, q) else None for p, c, q in zip(d["population"], v["co2"], v["population"])]
            estimations.setdefault(iso, {})["co2"] = f"population × CO2 par habitant de {VOISINS_CO2[iso]}"
    T["estimations"] = estimations
    for p in P["pays"]:
        e, d, ind = estimations.get(p["iso3"], {}), T["pays"][p["iso3"]], p["indicateurs"]
        if "pib" in e and ind["pib"] is None:
            ind["pib"] = float(d["pib"][0])
        if "co2" in e and ind["co2"] is None:
            ind["co2"] = d["co2"][0]
            ind["co2ParHab"] = round(d["co2"][0] * 1e6 / ind["population"], 3)
        if e:
            p["estimations"] = sorted(e) + (["co2ParHab"] if "co2" in e else [])
    P["sources"]["estimation"] = "Estimation du projet (outils/completer_estimations.py) : PIB Banque mondiale ramené à l'échelle Maddison, CO2 par habitant du voisin"
    json.dump(P, open(pays2000, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(T, open(trajectoires, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    for iso, e in estimations.items():
        print(iso, e, file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:5])
