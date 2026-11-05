"""Estime, pour les 144 autres membres de l'ONU, l'influence de départ en 2000 et les compléments géopolitiques.

Usage : python3 -I outils/estimer_monde.py <dossier_sortie>
Sorties : influence2000_monde.ts (même format que src/data/influence2000.ts de la branche v0.3), sa copie
influence2000_monde.json et complements2000.json
(organisations, alliances, sanctions, régime, aléas, année d'indépendance).
ESTIMATION qualitative du projet (25/10/2026) : profils régionaux calés sur les valeurs des 50 pays du jeu,
puis corrections pays par pays. « Le but est d'être réaliste, pas forcément factuel. »
"""
import json, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
MONDE = json.load(open(os.path.join(ICI, "pays_monde.json"), encoding="utf-8"))

# Profils : (OCC p, m, c, commerce), (CHN p, m, c, commerce). Références : POL, NLD (OTAN), KEN, NGA (Afrique), COL, PAN (Amériques).
PROFILS = {
    "otan": ((65, 60, 50, 0.9), (8, 0, 2, 0.3)),
    "ue_neutre": ((60, 30, 55, 0.9), (8, 0, 2, 0.3)),
    "candidat_ue": ((55, 30, 40, 0.8), (8, 0, 2, 0.3)),
    "micro_europe": ((60, 10, 60, 1.0), (5, 0, 2, 0.2)),
    "balkans": ((50, 35, 35, 0.8), (5, 0, 1, 0.2)),
    "afrique_fr_base": ((55, 45, 55, 0.9), (10, 0, 2, 0.3)),
    "afrique_fr": ((45, 15, 45, 0.8), (12, 0, 2, 0.3)),
    "afrique_en": ((45, 10, 40, 0.8), (12, 0, 2, 0.3)),
    "afrique_pt": ((40, 5, 35, 0.7), (10, 0, 1, 0.2)),
    "golfe": ((65, 65, 30, 1.0), (8, 0, 2, 0.4)),
    "amerique_latine": ((50, 15, 50, 1.0), (6, 0, 2, 0.3)),
    "amerique_centrale": ((60, 20, 55, 1.3), (5, 0, 1, 0.2)),
    "caraibes": ((60, 20, 60, 1.2), (8, 0, 2, 0.3)),
    "pacifique": ((50, 10, 40, 0.8), (10, 0, 2, 0.3)),
    "compact": ((80, 70, 60, 1.5), (8, 0, 2, 0.2)),
}
GROUPES = {
    "otan": "BEL DNK GRC ISL LUX PRT CZE HUN",
    "ue_neutre": "AUT FIN SWE IRL",
    "candidat_ue": "EST LVA LTU SVK SVN ROU BGR MLT CYP",
    "micro_europe": "AND LIE MCO SMR CHE",
    "balkans": "BIH HRV MKD ALB",
    "afrique_fr_base": "SEN CIV GAB DJI TCD CAF CMR",
    "afrique_fr": "BEN BFA MLI NER TGO GIN MRT COM MDG COG BDI RWA",
    "afrique_en": "GHA UGA TZA ZMB MWI BWA NAM LSO SWZ MUS SYC GMB SLE LBR",
    "afrique_pt": "GNB CPV STP",
    "golfe": "KWT BHR OMN",
    "amerique_latine": "BOL ECU PER PRY URY GUY SUR",
    "amerique_centrale": "GTM HND SLV NIC CRI BLZ",
    "caraibes": "ATG BHS BRB DMA GRD JAM KNA LCA VCT TTO HTI DOM",
    "pacifique": "FJI KIR NRU PNG WSM SLB TON TUV VUT",
    "compact": "MHL FSM PLW",
}
# Corrections pays par pays : remplacent tout le profil, avec la raison.
SPECIFIQUES = {
    "CHE": ((55, 10, 55, 0.9), (8, 0, 3, 0.4), "neutralité, place financière"),
    "ISL": ((70, 60, 55, 1.0), (5, 0, 2, 0.2), "base américaine de Keflavík"),
    "SRB": ((15, 5, 20, 0.6), (20, 0, 2, 0.3), "Milošević au pouvoir jusqu'en octobre 2000, après les frappes de l'OTAN"),
    "MNE": ((30, 5, 25, 0.6), (10, 0, 1, 0.2), "partie de la Yougoslavie, déjà tournée vers l'Ouest"),
    "BLR": ((5, 0, 10, 0.5), (15, 0, 2, 0.3), "régime Loukachenko, alignée sur la Russie"),
    "MDA": ((30, 0, 15, 0.6), (8, 0, 1, 0.2), "entre Russie et Roumanie, Transnistrie"),
    "GEO": ((40, 10, 20, 0.6), (8, 0, 1, 0.2), "Chevardnadzé, orientation occidentale"),
    "ARM": ((25, 0, 20, 0.6), (8, 0, 1, 0.2), "alliée de la Russie, forte diaspora en Occident"),
    "AZE": ((35, 5, 10, 0.7), (8, 0, 1, 0.3), "pétrole de la Caspienne, oléoduc BTC en projet"),
    "UZB": ((30, 10, 8, 0.5), (20, 5, 2, 0.5), "méfiant envers Moscou, avant la base américaine de 2001"),
    "KGZ": ((30, 5, 8, 0.5), (25, 5, 3, 0.6), "frontière chinoise, Groupe de Shanghai"),
    "TJK": ((20, 0, 5, 0.4), (20, 5, 2, 0.5), "sortie de guerre civile, sous protection russe"),
    "TKM": ((15, 0, 5, 0.5), (15, 0, 2, 0.4), "neutralité permanente, régime fermé"),
    "AFG": ((0, 0, 2, 1.0), (5, 0, 1, 0.3), "régime taliban, sanctions de l'ONU (1999)"),
    "MNG": ((40, 5, 15, 0.6), (30, 0, 5, 0.8), "« troisième voisin », dépendance commerciale envers la Chine"),
    "MMR": ((0, 0, 3, 1.0), (55, 30, 5, 0.9), "junte sous sanctions occidentales, armée équipée par la Chine"),
    "KHM": ((25, 0, 10, 0.7), (40, 10, 15, 0.7), "Hun Sen, aide chinoise"),
    "LAO": ((10, 0, 3, 0.5), (35, 5, 5, 0.6), "régime communiste"),
    "BRN": ((50, 25, 25, 0.8), (15, 0, 15, 0.5), "lien britannique (Gurkhas)"),
    "NPL": ((35, 5, 15, 0.6), (25, 0, 3, 0.5), "entre Inde et Chine, guérilla maoïste"),
    "BTN": ((30, 0, 10, 0.5), (3, 0, 2, 0.2), "sous l'aile de l'Inde, pas de relations avec Pékin"),
    "LKA": ((40, 10, 25, 0.8), (30, 5, 3, 0.5), "guerre contre les Tigres tamouls, armes chinoises"),
    "MDV": ((40, 5, 25, 0.7), (10, 0, 2, 0.3), "tourisme européen"),
    "TLS": ((60, 40, 35, 1.0), (10, 0, 3, 0.3), "administration de l'ONU, forces australiennes (INTERFET)"),
    "JOR": ((65, 50, 35, 1.0), (8, 0, 2, 0.3), "allié des États-Unis, paix avec Israël"),
    "LBN": ((35, 5, 40, 0.8), (8, 0, 2, 0.3), "sous tutelle syrienne, francophonie"),
    "SYR": ((5, 0, 10, 0.6), (20, 5, 2, 0.4), "État soutien du terrorisme selon Washington"),
    "YEM": ((25, 10, 10, 0.7), (15, 0, 2, 0.4), "attentat contre l'USS Cole en octobre 2000"),
    "MAR": ((60, 30, 50, 0.9), (8, 0, 2, 0.3), "partenaire de la France et des États-Unis"),
    "TUN": ((55, 25, 50, 0.9), (8, 0, 2, 0.3), "Ben Ali, proche de la France"),
    "LBY": ((0, 0, 5, 1.0), (15, 0, 1, 0.3), "Kadhafi, sanctions américaines"),
    "SDN": ((0, 0, 3, 1.0), (45, 15, 2, 0.8), "sanctions américaines (1997), pétrole exploité par la CNPC"),
    "SSD": ((40, 5, 15, 0.5), (10, 0, 1, 0.2), "rébellion du SPLM soutenue par Washington, partie du Soudan jusqu'en 2011"),
    "ERI": ((25, 5, 10, 0.5), (15, 0, 1, 0.3), "guerre avec l'Éthiopie (1998-2000)"),
    "SOM": ((15, 0, 10, 0.3), (3, 0, 1, 0.1), "État effondré"),
    "AGO": ((35, 5, 20, 0.8), (20, 0, 2, 0.5), "guerre civile, pétrole vendu aux États-Unis"),
    "MOZ": ((40, 5, 25, 0.7), (15, 0, 2, 0.3), "bailleurs occidentaux"),
    "GNQ": ((40, 5, 15, 1.0), (15, 0, 1, 0.3), "pétrole exploité par des compagnies américaines"),
    "ZWE": ((20, 0, 30, 0.7), (25, 5, 2, 0.4), "réforme agraire, rupture avec Londres"),
    "HTI": ((45, 25, 40, 1.2), (3, 0, 1, 0.2), "après l'intervention américaine et la mission de l'ONU"),
    "NZL": ((70, 35, 65, 0.9), (12, 0, 5, 0.6), "ANZUS suspendu avec Washington, proche de l'Australie"),
    "PNG": ((55, 20, 40, 0.9), (10, 0, 2, 0.3), "sous l'influence de l'Australie"),
    "FJI": ((50, 10, 40, 0.8), (12, 0, 3, 0.3), "coup d'État de mai 2000"),
}
# Pays reconnaissant Taïwan (République de Chine) en 2000 : influence politique chinoise quasi nulle (fait).
RECONNAISSENT_TAIWAN = "MHL PLW NRU SLB TUV SEN TCD LBR MWI GMB BFA STP SWZ GRD DMA KNA VCT HTI DOM NIC HND GTM SLV CRI BLZ PRY MKD"

# Compléments géopolitiques en 2000 (faits, sauf mention).
ORGANISATIONS = {
    "OTAN": "BEL DNK GRC ISL LUX PRT CZE HUN",
    "UE": "AUT BEL DNK FIN GRC IRL LUX PRT SWE",
    "OPEP": "KWT LBY",
    "ASEAN": "BRN KHM LAO MMR",
    "CEI": "ARM AZE BLR GEO KGZ MDA TJK TKM UZB",
}
INDEPENDANCE = {"TLS": 2002, "MNE": 2006, "SSD": 2011}  # États pas encore indépendants au 1er janvier 2000
RATTACHEMENT = {"TLS": "administration de l'ONU (ATNUTO)", "MNE": "Yougoslavie (SRB)", "SSD": "Soudan (SDN)"}
SANCTIONNES = "SDN LBY MMR AFG"  # sanctions ou embargo américains en 2000
ALLIES_OCC = "BEL DNK GRC ISL LUX PRT CZE HUN MHL FSM PLW"  # OTAN et pactes de libre association (défense par les États-Unis)
# Régimes non démocratiques en 2000 : ESTIMATION proche de Polity IV (score < 6), à vérifier sur données.
NON_DEMOCRATIES = ("BLR AZE ARM KGZ TJK TKM UZB AFG MMR KHM LAO BTN BRN MDV SYR JOR KWT BHR OMN YEM LBN LBY TUN MAR SDN SSD "
                   "ERI DJI SOM TCD CAF CMR GAB COG GNQ AGO ZWE RWA BDI UGA TZA TGO GIN MRT BFA CIV GMB LBR SLE ZMB SWZ HTI "
                   "FJI SRB MNE TON PER")
# Expositions aux aléas naturels : ESTIMATION qualitative (géographie physique), comme src/data/geographie.ts.
ALEAS = {
    "cyclone": "HTI DOM JAM BHS ATG KNA DMA LCA VCT GRD BLZ HND NIC GTM FJI VUT TON WSM SLB FSM MHL MDG MOZ MUS COM MMR LKA OMN",
    "seisme": "GRC NZL ARM AZE GEO AFG NPL PER ECU GTM SLV NIC CRI HTI ROU ALB MKD KGZ TJK MAR PNG VUT SLB TON",
    "volcan": "ISL NZL ECU GTM SLV NIC CRI PNG VUT TON CMR COM VCT",
    "secheresse": "MLI NER TCD BFA MRT SEN SDN SOM ERI DJI ZWE ZMB MWI MOZ BWA NAM AFG SYR JOR MAR TUN TKM UZB MNG BOL",
}


def liste(s):
    return s.split()


def main(sortie):
    profil = {iso: g for g, s in GROUPES.items() for iso in liste(s)}
    taiwan = set(liste(RECONNAISSENT_TAIWAN))
    lignes, raisons, brut = [], {}, {}
    for iso, p in MONDE.items():
        if iso in SPECIFIQUES:
            occ, chn, raison = SPECIFIQUES[iso]
        elif iso in profil:
            occ, chn = PROFILS[profil[iso]]
            raison = f"profil « {profil[iso]} »"
        else:
            raise SystemExit(f"{iso} : ni profil ni estimation")
        if iso in taiwan:
            chn = (min(chn[0], 3), 0, chn[2], min(chn[3], 0.2))
            raison += ", reconnaît Taïwan en 2000"
        raisons[iso] = raison
        brut[iso] = {"OCC": dict(zip("pmc", occ[:3]), commerce=occ[3]), "CHN": dict(zip("pmc", chn[:3]), commerce=chn[3]), "raison": raison}
        f = lambda c: f"{{ p: {c[0]}, m: {c[1]}, c: {c[2]}, commerce: {c[3]} }}"
        lignes.append(f"  {iso}: {{ OCC: {f(occ)}, CHN: {f(chn)} }}, // {p['nom']} : {raison}")
    ts = ("// Influence de départ en 2000 (0-100) des 144 autres membres de l'ONU : ESTIMATION qualitative (profils régionaux\n"
          "// calés sur les 50 pays du jeu, puis corrections), générée par outils/estimer_monde.py. Même format que INFLUENCE_2000.\n"
          "import type { DepartCamp } from \"./influence2000\";\n"
          "export const INFLUENCE_2000_MONDE: Record<string, { OCC: DepartCamp; CHN: DepartCamp }> = {\n"
          + "\n".join(lignes) + "\n};\n")
    open(os.path.join(sortie, "influence2000_monde.ts"), "w", encoding="utf-8").write(ts)
    json.dump({"note": "ESTIMATION qualitative (outils/estimer_monde.py), même contenu que influence2000_monde.ts", "pays": brut},
              open(os.path.join(sortie, "influence2000_monde.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    comp = {
        "annee": 2000,
        "note": "Faits 2000, sauf « nonDemocraties2000 » et « exposition » (ESTIMATIONS qualitatives). Même logique que src/data/geographie.ts et organisations.ts.",
        "organisations": {k: liste(v) for k, v in ORGANISATIONS.items()},
        "allies2000": {"OCC": liste(ALLIES_OCC), "CHN": []},
        "sanctionnes2000": liste(SANCTIONNES),
        "nonDemocraties2000": liste(NON_DEMOCRATIES),
        "reconnaissentTaiwan2000": sorted(taiwan),
        "exposition": {k: liste(v) for k, v in ALEAS.items()},
        "independance": INDEPENDANCE, "rattachement2000": RATTACHEMENT,
    }
    toutes = [i for v in comp["organisations"].values() for i in v] + comp["allies2000"]["OCC"] + comp["sanctionnes2000"] \
        + comp["nonDemocraties2000"] + [i for v in comp["exposition"].values() for i in v] + list(taiwan)
    inconnus = sorted(set(toutes) - set(MONDE))
    if inconnus:
        raise SystemExit(f"Codes inconnus : {inconnus}")
    json.dump(comp, open(os.path.join(sortie, "complements2000.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
