// Scénarios de rupture de l'ordre mondial (2027-2050) et événements projetés de 2036 à 2050, rédigés le 2 novembre 2026.
// Demande de l'utilisateur : monnaie BRICS, cryptos à grande échelle, blocus de Taïwan « et beaucoup d'autres ».
// Ce ne sont pas des prévisions : chaque scénario a une probabilité (estimation de jeu) et des conditions. Beaucoup s'enchaînent
// (un blocus peut mener à une invasion) ou s'excluent (dialogue dans le détroit = pas de blocus) : chaque partie raconte une autre histoire.
// Les effets monétaires (dette, inflation, réserves mondiales, cryptos), les blocages de routes et les coupures de ressources
// passent par les mécanismes du jeu (monnaie.ts, ressources.ts). Valeurs : estimation.
import type { EvenementHistorique, Condition } from "../moteur/types";
import { PJ, I, S, TN, CP, G } from "./aides";

const UE = ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"];
const GOLFE = ["SAU", "ARE", "QAT", "KWT", "BHR", "OMN"];
const BRICS = ["BRA", "RUS", "IND", "ZAF", "EGY", "ETH", "IRN", "ARE", "SAU", "IDN"];
const ASIE_ALLIES = ["JPN", "KOR", "PHL", "AUS"];
const EMERGENTS = ["NGA", "ARG", "TUR", "PAK", "VNM", "KEN", "PHL", "UKR"];
const ASIE_C = ["KAZ", "UZB", "TKM", "KGZ", "TJK"];
type E = any; // effets du moteur v2 (types économiques compris)
const SI = (...ids: string[]): Condition[] => ids.map(id => ({ type: "evenement", id, fait: true }));
const SAUF = (...ids: string[]): Condition[] => ids.map(id => ({ type: "evenement", id, fait: false }));
const CRAN = (min: number): Condition[] => [{ type: "cran", min }];
const R = (id: string, annee: number, t: 1 | 2 | 3 | 4, p: number, titre: string, texte: string, pays: string[], famille: string, effets: E[], conditions: Condition[] = [], o: Partial<EvenementHistorique> = {}) =>
  PJ(id, annee, t, p, titre, texte, pays, famille, effets, { conditions, ...o });
// Raccourcis des mécanismes v2.
const DETTE = (camp: string, valeur: number): E => ({ type: "dette", camp, valeur });
const INFL = (camp: string, valeur: number): E => ({ type: "inflation", camp, valeur });
const PRIME = (camp: string, valeur: number): E => ({ type: "prime", camp, valeur });
const RES = (camp: string, valeur: number): E => ({ type: "reserves", camp, valeur });
const MOND = (o: { occ?: number; or?: number; crypto?: number }): E => ({ type: "mondiales", ...o });
const SOLDE = (pays: string, bien: string, valeur: number): E => ({ type: "solde", pays, bien, valeur });
const BLOQUE = (route: string): E => ({ type: "blocage", route });
const COUPE = (fournisseur: string, bien: string, camp: string): E => ({ type: "coupure", fournisseur, bien, camp });

export const RUPTURES: EvenementHistorique[] = [
  // ---------- Monnaie, dollar, cryptos ----------
  R("r_stablecoins", 2027, 3, 0.8, "Les stablecoins en dollars s'imposent dans les paiements",
    "Des jetons numériques adossés au dollar deviennent le moyen de paiement courant de dizaines de millions de personnes dans les pays à forte inflation.",
    ["USA", ...EMERGENTS.slice(0, 3)], "percee_technologique", [MOND({ occ: 0.01 }), I(EMERGENTS, "OCC", "e", 1), G("USA", 0.2, 4)]),
  R("r_bitcoin_reserve", 2028, 1, 0.45, "Une réserve stratégique de bitcoins",
    "Washington constitue une réserve publique de bitcoins ; plusieurs banques centrales suivent, d'autres dénoncent une bulle d'État.",
    ["USA", "SLV", "ARE"], "percee_technologique", [MOND({ crypto: 0.01 }), I(["SLV", "ARE"], "OCC", "e", 1)]),
  R("r_ecny_mbridge", 2029, 4, 0.7, "Le yuan numérique traverse les frontières",
    "La plateforme mBridge relie les monnaies numériques de la Chine, du Golfe et de l'Asie du Sud-Est : des milliards se règlent sans passer par le dollar.",
    ["CHN", "ARE", "SAU", "THA"], "accord_commercial", [MOND({ occ: -0.01 }), I(["ARE", "SAU", "THA"], "CHN", "e", 2)], SI("p_paiements_brics")),
  R("r_crypto_emergents", 2030, 2, 0.55, "Les cryptos remplacent la monnaie dans plusieurs pays émergents",
    "Au Nigeria, en Argentine, en Turquie ou au Pakistan, épargne et commerce fuient la monnaie nationale vers les cryptos ; les banques centrales perdent la main.",
    EMERGENTS.slice(0, 4), "crise_change", [MOND({ crypto: 0.02 }), S(EMERGENTS.slice(0, 4), -4), I(EMERGENTS.slice(0, 4), "OCC", "e", -1)]),
  R("r_petroyuan", 2031, 1, 0.45, "L'Arabie saoudite vend son pétrole en yuans",
    "Riyad accepte le yuan pour ses ventes à la Chine et l'Inde : la fin d'un pilier du système dollar, en place depuis 1974.",
    ["SAU", "CHN", "USA"], "accord_commercial", [MOND({ occ: -0.02 }), I("SAU", "CHN", "e", 4), I("SAU", "OCC", "p", -3), PRIME("OCC", 0.2), TN(3)]),
  R("r_krach_crypto", 2032, 1, 0.4, "Krach des cryptomonnaies",
    "Une plateforme géante s'effondre ; les cryptos perdent les deux tiers de leur valeur et les pays qui les avaient adoptées plongent.",
    EMERGENTS.slice(0, 4), "krach_boursier", [MOND({ crypto: -0.015, or: 0.005 }), S(EMERGENTS.slice(0, 4), -5), G("tous", -0.3, 4)], SI("r_crypto_emergents")),
  R("r_monnaie_brics", 2034, 2, 0.4, "Naissance d'une monnaie commune des BRICS",
    "Les BRICS lancent une monnaie de règlement adossée à l'or et à un panier de matières premières ; les échanges entre membres basculent en quelques années.",
    BRICS, "accord_commercial", [MOND({ occ: -0.05, or: 0.01 }), I(BRICS, "CHN", "e", 4), PRIME("OCC", 0.4), CP("CHN", 3), TN(4)], SI("p_unite_brics")),
  R("r_monnaie_brics_echec", 2035, 4, 0.6, "La monnaie des BRICS s'enlise",
    "L'Inde refuse une monnaie qu'elle juge dominée par le yuan ; le projet est gelé et le dollar reprend des couleurs.",
    ["IND", "CHN", "BRA"], "sortie_organisation", [MOND({ occ: 0.01 }), I("IND", "CHN", "p", -3), I("IND", "OCC", "e", 2)], [...SI("p_unite_brics"), ...SAUF("r_monnaie_brics")]),
  R("r_defaut_technique_usa", 2036, 3, 0.2, "Défaut technique des États-Unis",
    "Faute d'accord sur le plafond de la dette, le Trésor américain manque une échéance pendant neuf jours ; les marchés mondiaux s'affolent.",
    ["USA"], "defaut_souverain", [PRIME("OCC", 1.5), MOND({ occ: -0.04, or: 0.03 }), G("tous", -0.5, 4), G("USA", -1, 4), TN(3)], [{ type: "cran", min: 2 }]),
  R("r_quantique_crypto", 2038, 2, 0.5, "L'informatique quantique casse les cryptos",
    "Des clés de portefeuilles historiques sont forcées ; la confiance dans les cryptos s'évapore tant que la migration vers de nouveaux chiffrements n'est pas faite.",
    ["USA", "CHN"], "cyberattaque", [MOND({ crypto: -0.02, or: 0.01 }), G("tous", -0.2, 4)], SI("p_quantique")),
  R("r_dollar_crise", 2040, 2, 0.3, "Crise de confiance dans le dollar",
    "Déficits records, monnaie BRICS en place et dette jugée insoutenable : les banques centrales vendent leurs bons du Trésor, le dollar chute de 30 %.",
    ["USA", "CHN", "JPN"], "crise_change", [MOND({ occ: -0.06, or: 0.03, crypto: 0.01 }), INFL("OCC", 3), PRIME("OCC", 1), TN(4)], SI("r_monnaie_brics")),
  R("r_bretton_woods", 2042, 3, 0.35, "Une nouvelle conférence monétaire mondiale",
    "Soixante pays réunis à Genève créent un panier de réserve (dollar, euro, yuan, or) pour stabiliser les changes, sur le modèle de Bretton Woods.",
    ["USA", "CHN", "IND", "DEU"], "traite_majeur", [TN(-5), PRIME("tous", -0.3), MOND({ or: 0.01 })], [{ type: "cran", max: 3 }]),
  R("r_euro_eclate", 2038, 1, 0.12, "Un grand pays quitte la zone euro",
    "Après une crise de la dette, Rome rétablit la lire ; l'euro perd un quart de sa place dans les réserves mondiales.",
    ["ITA", "DEU", "FRA"], "sortie_organisation", [MOND({ occ: -0.03, or: 0.01 }), PRIME("OCC", 0.5), G(UE, -1, 4), S(UE, -3)]),

  // ---------- Taïwan et mers d'Asie ----------
  R("r_blocus_taiwan", 2030, 3, 0.3, "Blocus naval de Taïwan",
    "La marine chinoise encercle l'île et filtre tout le trafic ; les usines de puces tournent au ralenti et les prix de l'électronique s'envolent dans le monde entier.",
    ["TWN", "CHN", "USA", "JPN"], "blocage_detroit", [BLOQUE("taiwan"), SOLDE("TWN", "industrie", -25), G("TWN", -6, 4), G("tous", -0.6, 4), INFL("tous", 2), TN(12), I(ASIE_ALLIES, "OCC", "m", 5), I("CHN", "OCC", "e", -6)],
    SI("p_detroit_taiwan")), // le dialogue de 2035 n'a plus lieu après une invasion (projections.ts)
  R("r_invasion_taiwan", 2033, 2, 0.3, "Débarquement à Taïwan",
    "L'armée chinoise débarque sur la côte ouest de Taïwan ; les États-Unis et le Japon envoient leurs flottes, l'Occident gèle les avoirs chinois.",
    ["TWN", "CHN", "USA", "JPN"], "guerre_interetatique", [BLOQUE("taiwan"), BLOQUE("merchine"), SOLDE("TWN", "industrie", -40), G("TWN", -15, 4), G("CHN", -3, 4), G("tous", -1.5, 4), INFL("tous", 3), TN(16),
      RES("CHN", -2), MOND({ occ: -0.02, or: 0.03 }), COUPE("CHN", "terres", "OCC"), I(ASIE_ALLIES, "OCC", "m", 8), I(UE, "CHN", "e", -8)],
    [...SI("r_blocus_taiwan"), ...CRAN(3)], { conflit: { pays: ["TWN", "CHN"], duree: 8 } }),
  R("r_taiwan_accord", 2040, 1, 0.2, "Accord politique entre Pékin et Taipei",
    "Après des années de dialogue, Taipei accepte un statut d'autonomie large sous souveraineté chinoise ; Washington proteste mais ne bouge pas.",
    ["TWN", "CHN", "USA"], "traite_majeur", [I("TWN", "CHN", "p", 10), I("TWN", "OCC", "p", -6), TN(-6), CP("CHN", 3)], [...SI("p_dialogue_detroit"), ...SAUF("r_invasion_taiwan")]),
  R("r_puces_usa", 2036, 2, 0.7, "Les puces avancées se relocalisent",
    "Les usines d'Arizona, du Japon et d'Europe produisent désormais 40 % des puces de pointe : Taïwan n'est plus le point unique de fragilité du monde.",
    ["USA", "JPN", "TWN"], "percee_technologique", [SOLDE("USA", "industrie", 8), SOLDE("JPN", "industrie", 4), SOLDE("TWN", "industrie", -5)]),
  R("r_merchine_heurts", 2037, 3, 0.4, "Combats navals en mer de Chine méridionale",
    "Des garde-côtes chinois et philippins échangent des tirs ; deux navires coulent et la route maritime la plus fréquentée d'Asie se ferme quelques semaines.",
    ["PHL", "CHN", "VNM"], "incident_militaire", [BLOQUE("merchine"), TN(8), I(["PHL", "VNM"], "OCC", "m", 4), G("tous", -0.2, 4)], CRAN(2)),

  // ---------- Ordre mondial et alliances ----------
  R("r_otan_menace", 2029, 1, 0.3, "Washington menace de quitter l'OTAN",
    "Le président américain annonce qu'il ne défendra plus les alliés « qui ne paient pas » ; l'Europe vote en urgence des budgets militaires.",
    ["USA", ...UE.slice(0, 3)], "sortie_organisation", [I(UE, "OCC", "m", -4), DETTE("OCC", 3), TN(3)]),
  R("r_sortie_otan", 2037, 2, 0.15, "Les États-Unis quittent l'OTAN",
    "Le retrait est voté au Congrès : l'Alliance continue sans Washington, l'Europe bâtit sa propre défense et Moscou teste ses frontières.",
    ["USA", "POL", "DEU", "FRA"], "sortie_organisation", [I(UE, "OCC", "m", -8), S(["POL", "LTU", "LVA", "EST"], -5), DETTE("OCC", 4), TN(6)], SI("r_otan_menace")),
  R("r_bloc_non_aligne", 2038, 3, 0.35, "L'Inde, l'Indonésie et le Brésil fondent un troisième bloc",
    "Refusant de choisir entre Washington et Pékin, trois géants créent une alliance non alignée avec une banque et un marché commun.",
    ["IND", "IDN", "BRA", "ZAF", "MEX"], "traite_majeur", [I(["IND", "IDN", "BRA", "ZAF", "MEX"], "OCC", "p", -3), I(["IND", "IDN", "BRA", "ZAF", "MEX"], "CHN", "p", -3), I(["IND", "IDN", "BRA"], "CHN", "e", -2)]),
  R("r_effondrement_russie", 2036, 4, 0.2, "Le pouvoir central russe s'effondre",
    "Après la guerre de succession, des régions proclament leur autonomie ; l'arsenal nucléaire inquiète le monde entier.",
    ["RUS", ...ASIE_C.slice(0, 2)], "revolution", [S("RUS", -25), G("RUS", -5, 4), SOLDE("RUS", "energie", -15), TN(8), I(ASIE_C, "CHN", "p", 3), INFL("tous", 1)], SI("p_succession_kremlin")),
  R("r_chine_crise", 2037, 1, 0.2, "Crise politique majeure en Chine",
    "Chômage des jeunes, dette des provinces et vieillissement : des manifestations gagnent dix villes, le pouvoir durcit le contrôle.",
    ["CHN"], "manifestations", [S("CHN", -15), G("CHN", -2, 4), DETTE("CHN", 10), TN(3)]),
  R("r_iran_essai", 2030, 2, 0.3, "Essai nucléaire iranien",
    "L'Iran fait exploser une bombe dans le désert du Lut ; Israël et l'Arabie saoudite placent leurs forces en alerte.",
    ["IRN", "ISR", "SAU"], "proliferation_nucleaire", [TN(10), S(GOLFE, -5), INFL("tous", 1)], SI("p_iran_seuil")),
  R("r_ormuz", 2036, 1, 0.2, "Le détroit d'Ormuz fermé",
    "Mines et missiles ferment Ormuz plusieurs mois : un cinquième du pétrole mondial ne passe plus.",
    ["IRN", "ARE", "OMN"], "choc_petrolier", [BLOQUE("ormuz"), INFL("tous", 3), SOLDE("SAU", "energie", -10), SOLDE("ARE", "energie", -10), G("tous", -0.8, 4), TN(10)], CRAN(3)),
  R("r_suez_ferme", 2037, 4, 0.2, "Le canal de Suez fermé un an",
    "Une guerre régionale ferme Suez et Bab-el-Mandeb ; les navires contournent l'Afrique et le fret double de prix.",
    ["EGY", "YEM", "SAU"], "blocage_detroit", [BLOQUE("suez"), BLOQUE("babelmandeb"), INFL("tous", 1), G("EGY", -3, 4), TN(5)]),
  R("r_inde_pakistan", 2041, 2, 0.2, "Guerre ouverte entre l'Inde et le Pakistan",
    "Après un attentat de masse, l'armée indienne franchit la ligne de contrôle ; le monde craint l'escalade nucléaire.",
    ["IND", "PAK"], "guerre_interetatique", [G(["IND", "PAK"], -3, 4), S("PAK", -10), TN(12), I("PAK", "CHN", "m", 4), I("IND", "OCC", "m", 3)], [...SI("p_cachemire_2033"), ...CRAN(2)], { conflit: { pays: ["IND", "PAK"], duree: 4 } }),
  R("r_coree_guerre", 2039, 3, 0.1, "Guerre dans la péninsule coréenne",
    "Pyongyang bombarde Séoul ; la guerre dure six semaines avant un armistice imposé par Pékin et Washington.",
    ["KOR", "PRK", "USA", "CHN"], "guerre_interetatique", [G("KOR", -5, 4), S(["KOR", "PRK"], -15), TN(14), SOLDE("KOR", "industrie", -10), I("KOR", "OCC", "m", 5)], [...SAUF("p_effondrement_nk"), ...CRAN(3)], { conflit: { pays: ["KOR", "PRK"], duree: 2 } }),
  R("r_coree_reunifiee", 2044, 1, 0.3, "Réunification de la Corée",
    "Dix ans après la chute du régime du Nord, les deux Corées s'unissent ; Séoul porte un coût de reconstruction immense.",
    ["KOR", "PRK"], "traite_majeur", [I("PRK", "OCC", "p", 15), I("PRK", "CHN", "p", -10), DETTE("OCC", 2), G("PRK", 4, 4), TN(-3)], SI("p_effondrement_nk")),
  R("r_arctique_militaire", 2042, 2, 0.4, "Course militaire dans l'Arctique",
    "Bases, brise-glace armés et sous-marins se multiplient le long de la route du Nord, ouverte toute l'année.",
    ["RUS", "USA", "CAN", "NOR"], "incident_militaire", [TN(4), I(["NOR", "CAN", "DNK"], "OCC", "m", 2)], SI("p_arctique")),

  // ---------- Technologies, espace, énergie ----------
  R("r_asat", 2036, 2, 0.3, "Guerre des satellites",
    "Un tir antisatellite détruit un satellite militaire ; les nuages de débris coupent le GPS civil pendant plusieurs jours.",
    ["USA", "CHN", "RUS"], "incident_militaire", [TN(6), G("tous", -0.3, 4)], CRAN(2)),
  R("r_ia_generale", 2038, 4, 0.3, "Une IA dépasse l'humain dans la plupart des tâches",
    "Des systèmes d'IA conçoivent médicaments, puces et logiciels plus vite que les meilleurs ingénieurs : productivité record, emplois de bureau bouleversés.",
    ["USA", "CHN"], "percee_technologique", [G(["USA", "CHN"], 1, 4), G("tous", 0.3, 4), S("tous", -2), TN(4)], SI("p_ia_rupture")),
  R("r_ia_incident", 2043, 3, 0.2, "Grave incident d'une IA autonome",
    "Un système autonome de trading et de logistique déclenche en chaîne des pannes bancaires et portuaires sur trois continents.",
    ["USA", "GBR", "SGP"], "panne_infrastructure", [G("tous", -0.6, 4), PRIME("tous", 0.3)], SI("r_ia_generale")),
  R("r_cyberguerre", 2041, 1, 0.3, "Cyberguerre contre les réseaux électriques",
    "Le réseau d'un grand pays tombe deux semaines après une attaque attribuée à un État ; la riposte vise les banques de l'agresseur.",
    ["DEU", "USA", "RUS"], "cyberattaque", [G(["DEU", "USA"], -0.8, 4), TN(6)], CRAN(2)),
  R("r_tempete_solaire", 2039, 1, 0.1, "Tempête solaire géante",
    "Une éruption solaire comparable à celle de 1859 grille transformateurs et satellites ; des régions entières restent sans courant.",
    ["CAN", "USA", "NOR"], "panne_infrastructure", [G("tous", -1, 4), INFL("tous", 0.5)], [], { deviable: false }),
  R("r_fusion", 2045, 2, 0.3, "Première centrale à fusion raccordée au réseau",
    "Une centrale à fusion produit de l'électricité commerciale ; les pays pétroliers voient leur rente menacée à long terme.",
    ["USA", "FRA", "CHN", "GBR"], "percee_technologique", [SOLDE("USA", "energie", 5), SOLDE("CHN", "energie", 5), SOLDE("FRA", "energie", 5), INFL("tous", -1), S(GOLFE, -4)], SI("p_fusion")),
  R("r_terres_rares", 2036, 3, 0.5, "La fin du monopole chinois des terres rares",
    "De nouvelles mines et usines de raffinage en Australie, au Brésil et aux États-Unis cassent la domination chinoise.",
    ["AUS", "USA", "BRA", "CHN"], "gisement_geant", [SOLDE("AUS", "terres", 15), SOLDE("USA", "terres", 10), SOLDE("BRA", "terres", 8)]),

  // ---------- Climat, alimentation, migrations ----------
  R("r_greniers", 2038, 2, 0.25, "Les greniers du monde manquent la même année",
    "Sécheresse aux États-Unis, en Ukraine, en Inde et en Argentine : les stocks mondiaux de céréales tombent au plus bas depuis 1970.",
    ["USA", "UKR", "IND", "ARG"], "flambee_alimentaire", [INFL("tous", 1.5), S(["EGY", "PAK", "NGA", "BGD"], -6)]),
  R("r_amoc", 2044, 4, 0.15, "Le Gulf Stream ralentit brusquement",
    "La circulation atlantique s'affaiblit : hivers glacés en Europe du Nord, récoltes en baisse, montée des eaux sur la côte est américaine.",
    ["GBR", "FRA", "NOR", "USA"], "record_climatique", [G(UE, -1.5, 4), S(UE, -4), SOLDE("FRA", "alimentation", -10), SOLDE("DEU", "alimentation", -8)], SI("p_seuil_15")),
  R("r_panama_ferme", 2043, 3, 0.3, "Le canal de Panama ne suffit plus",
    "Le lac Gatún est trop bas : le canal fonctionne à un tiers de sa capacité pendant toute l'année.",
    ["PAN", "USA", "CHN"], "secheresse", [BLOQUE("panama"), G("PAN", -4, 4)], SI("p_panama_secheresse")),
  R("r_deplaces", 2045, 1, 0.5, "Cent millions de déplacés climatiques",
    "Chaleur, sécheresse et montée des mers jettent sur les routes cent millions de personnes ; l'Europe et les pays du Golfe ferment leurs frontières.",
    ["BGD", "NGA", "PAK", "EGY"], "crise_migratoire", [S(UE, -4), S(["BGD", "PAK"], -6), TN(3)], SI("p_migrations_climat")),
  R("r_geoingenierie", 2046, 2, 0.25, "Géo-ingénierie solaire unilatérale",
    "Un pays envoie seul des aérosols dans la stratosphère pour refroidir la planète ; ses voisins l'accusent de dérégler les moussons.",
    ["IND", "CHN", "PAK"], "alerte_environnementale", [TN(6), S(["PAK", "BGD"], -3)]),
];

// ---------- Événements projetés 2036-2050 (échéances plausibles, pas des ruptures) ----------
export const PROJECTIONS_2050: EvenementHistorique[] = [
  R("p36_jo_inde", 2036, 3, 0.5, "Jeux olympiques en Inde", "Ahmedabad accueille les Jeux : l'Inde affiche son nouveau rang.", ["IND"], "poussee_ideologique", [I(["BGD", "NPL", "LKA"], "OCC", "c", 1)]),
  R("p36_population_chine", 2036, 1, 0.9, "La population chinoise recule fortement", "La Chine perd plus de cinq millions d'habitants par an ; le manque de main-d'œuvre pèse sur la croissance.", ["CHN"], "alerte_environnementale", [G("CHN", -0.3, 4)]),
  R("p37_mars_equipage", 2037, 4, 0.4, "Premiers humains en orbite de Mars", "Un équipage tourne autour de Mars et revient : la course spatiale repart.", ["USA"], "exploit_spatial", [CP("OCC", 2)]),
  R("p37_afrique_jeunesse", 2037, 2, 0.85, "L'Afrique compte un quart de l'humanité en âge de travailler", "Lagos, Kinshasa et Addis-Abeba deviennent des métropoles géantes ; les investisseurs des deux camps s'y bousculent.", ["NGA", "COD", "ETH"], "accord_commercial", [G(["NGA", "COD", "ETH", "TZA", "KEN"], 0.5, 4)]),
  R("p38_charbon", 2038, 1, 0.8, "Le charbon recule partout", "Pour la première fois, l'Inde et la Chine ferment plus de centrales à charbon qu'elles n'en ouvrent.", ["IND", "CHN"], "alerte_environnementale", [SOLDE("AUS", "energie", -5), SOLDE("IDN", "energie", -5)]),
  R("p38_robots", 2038, 3, 0.75, "Les robots humanoïdes dans les usines du monde", "Des millions de robots travaillent dans les usines ; les pays à bas salaires perdent leur avantage.", ["CHN", "JPN", "KOR"], "percee_technologique", [SOLDE("CHN", "industrie", 5), G(["VNM", "BGD", "MEX"], -0.4, 4)]),
  R("p39_vieillissement_europe", 2039, 2, 0.9, "L'Europe vieillit", "Un Européen sur trois a plus de 65 ans ; les retraites pèsent sur les budgets.", UE.slice(0, 3), "manifestations", [DETTE("OCC", 3), G(UE, -0.2, 4)]),
  R("p39_inde_lune", 2039, 4, 0.6, "L'Inde pose un équipage sur la Lune", "Après la Chine et les États-Unis, l'Inde marche sur la Lune.", ["IND"], "exploit_spatial", [I(["IND"], "OCC", "c", 1), I(["IND"], "CHN", "c", 1)]),
  R("p40_mers", 2040, 3, 0.85, "La mer gagne sur les deltas", "Inondations chroniques au Bangladesh, au Viêt Nam et en Égypte ; des millions d'hectares sont perdus.", ["BGD", "VNM", "EGY"], "inondation", [SOLDE("BGD", "alimentation", -8), SOLDE("VNM", "alimentation", -6), S(["BGD", "EGY"], -3)]),
  R("p40_ue_elargie", 2040, 2, 0.4, "La Moldavie et la Géorgie rejoignent l'Union européenne", "L'Union s'élargit encore vers l'est, au grand dam de Moscou.", ["MDA", "GEO"], "adhesion_alliance", [I(["MDA", "GEO"], "OCC", "p", 5), TN(3)]),
  R("p41_tete_inde", 2041, 1, 0.75, "L'Inde, premier marché automobile du monde", "Les ventes de voitures indiennes dépassent celles de la Chine.", ["IND"], "accord_commercial", [SOLDE("IND", "industrie", 4), SOLDE("IND", "energie", -4)]),
  R("p41_canicule_inde", 2041, 2, 0.75, "Chaleur mortelle dans le nord de l'Inde", "Plusieurs jours au-dessus de 50 °C humides : le travail en extérieur s'arrête.", ["IND", "PAK"], "canicule", [G(["IND", "PAK"], -0.5, 4), S(["IND", "PAK"], -3)]),
  R("p42_hydrogene", 2042, 2, 0.6, "L'hydrogène vert s'exporte", "Le Chili, le Maroc et l'Australie exportent de l'hydrogène vert vers l'Europe et le Japon.", ["CHL", "MAR", "AUS"], "accord_commercial", [SOLDE("CHL", "energie", 8), SOLDE("MAR", "energie", 8), SOLDE("AUS", "energie", 4)]),
  R("p42_nigeria_puissance", 2042, 4, 0.5, "Le Nigeria devient une puissance régionale", "Avec 300 millions d'habitants, le Nigeria entre au G20.", ["NGA"], "adhesion_alliance", [G("NGA", 0.5, 4), S("NGA", 3)]),
  R("p43_dette_mondiale", 2043, 1, 0.5, "La dette mondiale dépasse 400 % du PIB", "Le FMI alerte : les États, les entreprises et les ménages n'ont jamais été aussi endettés.", ["USA", "CHN", "JPN"], "krach_boursier", [PRIME("tous", 0.3)]),
  R("p43_glaciers", 2043, 3, 0.8, "Les glaciers de l'Himalaya reculent vite", "Les débits de l'Indus et du Gange baissent en été ; l'Inde et le Pakistan se disputent l'eau.", ["IND", "PAK", "CHN"], "secheresse", [SOLDE("PAK", "alimentation", -6), TN(2)]),
  R("p44_viande_labo", 2044, 2, 0.6, "La viande cultivée devient moins chère que l'élevage", "L'élevage industriel décline ; les pays exportateurs de viande et de soja s'inquiètent.", ["USA", "BRA", "ARG"], "percee_technologique", [SOLDE("BRA", "alimentation", -4), SOLDE("ARG", "alimentation", -4)]),
  R("p44_coupe_monde", 2044, 3, 0.9, "Une Coupe du monde géante", "Le tournoi réunit 64 équipes sur trois continents.", ["USA", "MEX", "CAN"], "poussee_ideologique", [I(["MEX", "CAN"], "OCC", "c", 1)]),
  R("p45_sahel_vert", 2045, 1, 0.4, "La Grande Muraille verte porte ses fruits", "Des millions d'hectares reverdissent au Sahel ; les récoltes repartent.", ["SEN", "NER", "TCD"], "accord_commercial", [SOLDE("NER", "alimentation", 5), S(["NER", "TCD", "MLI"], 3)]),
  R("p45_onu_100", 2045, 4, 0.8, "Les Nations unies ont cent ans", "Le centenaire relance le débat sur la réforme du Conseil de sécurité et du veto.", ["USA", "CHN", "IND"], "traite_majeur", [TN(-2)]),
  R("p46_lithium_fin", 2046, 2, 0.6, "Les batteries sans lithium s'imposent", "Batteries au sodium et à l'état solide : le lithium perd sa valeur stratégique.", ["CHL", "ARG", "BOL"], "percee_technologique", [SOLDE("CHL", "metaux", -6), SOLDE("ARG", "metaux", -4), SOLDE("BOL", "metaux", -4)]),
  R("p46_canicule_europe", 2046, 3, 0.75, "L'été le plus chaud de l'histoire européenne", "Des fleuves à sec, des centrales à l'arrêt, des récoltes perdues dans le sud de l'Europe.", ["ESP", "ITA", "FRA"], "canicule", [G(["ESP", "ITA", "FRA"], -0.4, 4), SOLDE("ESP", "alimentation", -6)]),
  R("p47_independance_chine", 2047, 1, 0.5, "La Chine produit toutes ses puces de pointe", "Pékin annonce son autonomie complète dans les semi-conducteurs les plus avancés.", ["CHN"], "percee_technologique", [SOLDE("CHN", "industrie", 6), CP("CHN", 2)]),
  R("p47_hongkong", 2047, 3, 0.95, "Fin du statut spécial de Hong Kong", "Cinquante ans après la rétrocession, Hong Kong devient une ville chinoise comme les autres.", ["CHN", "GBR"], "poussee_ideologique", [I("GBR", "CHN", "p", -2), CP("CHN", 1)]),
  R("p48_petrole_fin", 2048, 2, 0.6, "Le pétrole n'est plus une arme", "La demande de pétrole a baissé d'un tiers : les monarchies du Golfe accélèrent leur reconversion.", GOLFE.slice(0, 3), "choc_petrolier", [INFL("tous", -1), S(GOLFE, -3), SOLDE("SAU", "energie", -8)]),
  R("p48_villes_flottantes", 2048, 4, 0.4, "Des digues géantes pour les grandes villes", "Shanghai, New York et Jakarta lancent des digues de mille milliards de dollars contre la mer.", ["CHN", "USA", "IDN"], "inondation", [DETTE("tous", 2)]),
  R("p49_rpc_100", 2049, 4, 0.95, "La République populaire a cent ans", "Pékin célèbre le centenaire et fixe l'objectif d'un « grand pays socialiste moderne ».", ["CHN"], "poussee_ideologique", [CP("CHN", 2), I(["PRK", "LAO", "KHM"], "CHN", "c", 2)]),
  R("p49_population_pic", 2049, 2, 0.6, "La population mondiale approche de son pic", "Près de 9,7 milliards d'humains : la croissance démographique ne vient plus que d'Afrique.", ["NGA", "COD", "ETH"], "alerte_environnementale", [G(["NGA", "COD", "ETH"], 0.3, 4)]),
  R("p50_neutralite", 2050, 2, 0.4, "Objectif zéro émission nette atteint en Europe", "L'Union européenne annonce avoir atteint la neutralité carbone, avec du retard sur certains secteurs.", UE.slice(0, 3), "alerte_environnementale", [I(["MAR", "KEN", "CHL"], "OCC", "c", 1)]),
  R("p50_bilan", 2050, 4, 0.95, "Le monde de 2050", "Les historiens comparent déjà le demi-siècle écoulé au XXe siècle : un ordre mondial s'est défait, un autre s'est installé.", ["USA", "CHN", "IND"], "poussee_ideologique", []),
];

// ---------- Deuxième série 2036-2050 : densité comparable à 2027-2035 (environ 10 événements par an) ----------
const AFR = ["NGA", "ETH", "COD", "KEN", "TZA"];
const AMS = ["BRA", "ARG", "COL", "CHL", "PER"];
const ASE = ["IDN", "VNM", "THA", "PHL", "MYS"];
export const PROJECTIONS_2050_B: EvenementHistorique[] = [
  // 2036
  R("q36_elections_usa", 2036, 4, 0.6, "Élection américaine de rupture", "Un candidat hors système l'emporte en promettant de « ramener les soldats à la maison ».", ["USA"], "election_rupture", [I(UE, "OCC", "p", -2), S("USA", -3)]),
  R("q36_inde_pak_eau", 2036, 2, 0.5, "L'Inde suspend le traité des eaux de l'Indus", "New Delhi détourne une partie des affluents ; Islamabad parle d'acte de guerre.", ["IND", "PAK"], "conflit_frontalier", [TN(5), SOLDE("PAK", "alimentation", -6)]),
  R("q36_brics_sommet", 2036, 3, 0.7, "Sommet des BRICS à Brasilia", "Le bloc compte désormais vingt membres et réclame la direction du FMI.", ["BRA", "CHN", "IND"], "traite_majeur", [I(["BRA", "ZAF", "EGY"], "CHN", "p", 2)]),
  R("q36_seisme_istanbul", 2036, 1, 0.25, "Grand séisme à Istanbul", "Le séisme attendu depuis des décennies frappe la ville ; des dizaines de milliers de morts.", ["TUR"], "seisme", [G("TUR", -3, 4), S("TUR", -8)], [], { deviable: false }),
  R("q36_mexique_cartels", 2036, 2, 0.6, "Les cartels défient l'État mexicain", "Des États entiers échappent au contrôle fédéral ; Washington menace d'intervenir.", ["MEX", "USA"], "guerre_civile", [S("MEX", -8), TN(2)]),
  // 2037
  R("q37_ue_armee", 2037, 1, 0.45, "Naissance d'une armée européenne", "Douze pays fusionnent leurs états-majors sous commandement commun.", ["FRA", "DEU", "POL"], "adhesion_alliance", [I(UE, "OCC", "m", 3), DETTE("OCC", 2)]),
  R("q37_africa_bourse", 2037, 3, 0.5, "Une bourse panafricaine à Lagos", "Les places de Lagos, Nairobi et Johannesburg fusionnent ; l'épargne africaine reste sur le continent.", ["NGA", "KEN", "ZAF"], "accord_commercial", [G(AFR, 0.3, 4)]),
  R("q37_coup_pakistan", 2037, 2, 0.35, "Coup d'État au Pakistan", "L'armée reprend directement le pouvoir après des émeutes de la faim.", ["PAK"], "coup_etat", [S("PAK", -10), I("PAK", "CHN", "p", 3)]),
  R("q37_ouragan_floride", 2037, 3, 0.5, "Ouragan de catégorie 6 sur la Floride", "Un ouragan d'une force jamais mesurée ravage Miami ; les assureurs quittent la région.", ["USA"], "cyclone", [G("USA", -0.5, 4), DETTE("OCC", 2)], [], { deviable: false }),
  R("q37_venezuela_guyana", 2037, 4, 0.3, "Le Venezuela envahit l'Essequibo", "Caracas occupe la région pétrolière disputée du Guyana.", ["VEN", "GUY"], "guerre_interetatique", [S("GUY", -15), TN(5), SOLDE("GUY", "energie", -15)], [], { conflit: { pays: ["VEN", "GUY"], duree: 2 } }),
  // 2038
  R("q38_japon_nucleaire", 2038, 2, 0.2, "Le Japon débat de l'arme nucléaire", "Face à la Chine et à la Corée du Nord, Tokyo ouvre un débat national sur la dissuasion.", ["JPN", "CHN"], "proliferation_nucleaire", [TN(5), I("JPN", "CHN", "p", -4)]),
  R("q38_famine_sahel", 2038, 3, 0.6, "Famine au Sahel", "Trois années de sécheresse : dix millions de personnes menacées.", ["NER", "TCD", "MLI"], "famine", [S(["NER", "TCD", "MLI"], -6)]),
  R("q38_accord_mercosur", 2038, 1, 0.6, "Le Mercosur signe avec la Chine", "Un accord de libre-échange relie l'Amérique du Sud et la Chine.", AMS.slice(0, 3), "accord_commercial", [I(AMS, "CHN", "e", 3)]),
  R("q38_turquie_crise", 2038, 4, 0.5, "La livre turque s'effondre", "Inflation à trois chiffres et fuite des capitaux en Turquie.", ["TUR"], "crise_change", [S("TUR", -6), G("TUR", -2, 4)]),
  // 2039
  R("q39_coree_sud_crise", 2039, 1, 0.55, "La Corée du Sud perd un habitant sur dix", "Le pays le moins fécond du monde ferme des villes entières.", ["KOR"], "alerte_environnementale", [G("KOR", -0.5, 4)]),
  R("q39_ethiopie_guerre", 2039, 2, 0.35, "Guerre civile en Éthiopie", "Les régions se soulèvent contre Addis-Abeba.", ["ETH"], "guerre_civile", [S("ETH", -15), G("ETH", -4, 4)]),
  R("q39_ia_droit", 2039, 3, 0.6, "Les robots et les IA paient l'impôt", "Plusieurs pays européens taxent l'automatisation pour financer les retraites.", UE.slice(0, 3), "percee_technologique", [DETTE("OCC", -2)]),
  R("q39_mekong", 2039, 4, 0.5, "Le Mékong à sec", "Les barrages en amont et la sécheresse assèchent le delta.", ["VNM", "KHM", "LAO"], "secheresse", [SOLDE("VNM", "alimentation", -8), I(["VNM", "KHM"], "CHN", "p", -2)]),
  R("q39_brexit_retour", 2039, 2, 0.25, "Le Royaume-Uni demande à revenir dans l'Union", "Vingt ans après le Brexit, Londres engage des négociations.", ["GBR"], "adhesion_alliance", [G("GBR", 0.4, 4), I("GBR", "OCC", "e", 3)]),
  // 2040
  R("q40_inde_chine_himalaya", 2040, 2, 0.3, "Accrochage armé dans l'Himalaya", "Des centaines de soldats indiens et chinois s'affrontent au Ladakh.", ["IND", "CHN"], "conflit_frontalier", [TN(6), I("IND", "CHN", "p", -4), I("IND", "OCC", "m", 3)], CRAN(2)),
  R("q40_arabie_reforme", 2040, 3, 0.4, "L'Arabie saoudite ouvre sa vie politique", "Un conseil consultatif élu est créé ; le pays mise sur le tourisme et les minerais.", ["SAU"], "poussee_ideologique", [S("SAU", 3)]),
  R("q40_afrique_monnaie", 2040, 1, 0.35, "Une monnaie commune en Afrique de l'Ouest", "L'éco remplace le franc CFA et les monnaies nationales de quinze pays.", ["NGA", "CIV", "SEN", "GHA"], "accord_commercial", [I(["CIV", "SEN"], "OCC", "e", -2), G(["NGA", "CIV", "SEN", "GHA"], 0.3, 4)]),
  R("q40_pandemie2", 2040, 4, 0.25, "Nouvelle pandémie", "Un virus respiratoire parti d'un élevage se répand en trois mois.", ["CHN", "USA", "IND"], "pandemie", [G("tous", -1, 4)], [], { deviable: false }),
  // 2041
  R("q41_grece_turquie", 2041, 3, 0.25, "Crise armée en mer Égée", "Des chasseurs grecs et turcs s'affrontent au-dessus d'une île disputée.", ["GRC", "TUR"], "incident_militaire", [TN(4), I("TUR", "OCC", "p", -3)]),
  R("q41_indonesie_puissance", 2041, 1, 0.6, "L'Indonésie au rang des grandes puissances", "Nusantara, la nouvelle capitale, accueille un sommet du G20 ; l'Indonésie pèse autant que l'Allemagne.", ["IDN"], "poussee_ideologique", [I(ASE, "CHN", "p", -1), I(ASE, "OCC", "p", -1)]),
  R("q41_banque_crise_europe", 2041, 2, 0.35, "Crise bancaire en Europe", "Une grande banque allemande tombe, entraînée par l'immobilier commercial.", ["DEU", "FRA", "ITA"], "crise_bancaire", [G(UE, -0.6, 4)]),
  R("q41_iran_ouverture", 2041, 4, 0.3, "L'Iran se rapproche de l'Occident", "Un nouveau pouvoir à Téhéran rouvre les ambassades et le commerce avec l'Europe.", ["IRN"], "reconciliation", [I("IRN", "OCC", "p", 6), I("IRN", "CHN", "e", -3), TN(-3)], SAUF("r_iran_essai")),
  R("q41_tempete_europe", 2041, 1, 0.5, "Tempête géante sur l'Europe du Nord", "Des vents de 200 km/h et une marée de tempête inondent les Pays-Bas et le nord de l'Allemagne.", ["NLD", "DEU", "BEL"], "tempete", [G(["NLD", "BEL"], -0.8, 4)], [], { deviable: false }),
  // 2042
  R("q42_inde_conseil_guerre", 2042, 2, 0.4, "Course aux armements en Asie du Sud", "L'Inde et le Pakistan doublent leurs arsenaux de missiles.", ["IND", "PAK"], "proliferation_nucleaire", [TN(3)]),
  R("q42_amazonie_protegee", 2042, 1, 0.4, "Pacte mondial pour l'Amazonie", "Les pays riches financent la protection de la forêt ; le Brésil s'engage à zéro déforestation.", ["BRA", "USA", "DEU"], "traite_majeur", [I("BRA", "OCC", "e", 3), G("BRA", 0.3, 4)]),
  R("q42_russie_chine_tension", 2042, 3, 0.3, "Froid entre Moscou et Pékin", "La Russie accuse la Chine de coloniser la Sibérie orientale.", ["RUS", "CHN"], "conflit_frontalier", [I("RUS", "CHN", "p", -6), TN(3)]),
  R("q42_afrique_sud_crise", 2042, 4, 0.4, "Pannes géantes en Afrique du Sud", "Le réseau électrique s'effondre ; des mines ferment pour des mois.", ["ZAF"], "panne_infrastructure", [G("ZAF", -1.5, 4), SOLDE("ZAF", "metaux", -8)]),
  R("q42_drones", 2042, 2, 0.6, "Essaims de drones dans les conflits", "Des essaims autonomes de milliers de drones bouleversent l'art de la guerre.", ["USA", "CHN", "TUR"], "percee_technologique", [TN(2)]),
  // 2043
  R("q43_egypte_crise", 2043, 1, 0.45, "Émeutes du pain en Égypte", "Le prix du blé et la baisse du Nil jettent des millions de personnes dans la rue.", ["EGY"], "manifestations", [S("EGY", -10), G("EGY", -1, 4)]),
  R("q43_corridor_arctique", 2043, 3, 0.45, "Un corridor commercial sino-russe dans l'Arctique", "La Chine finance les ports russes de la route du Nord.", ["RUS", "CHN"], "accord_commercial", [I("RUS", "CHN", "e", 3)], SI("p_arctique")),
  R("q43_election_inde", 2043, 2, 0.5, "Élection historique en Inde", "Un milliard d'électeurs ; le vainqueur promet de faire de l'Inde la première puissance d'Asie.", ["IND"], "election_rupture", [S("IND", 2)]),
  R("q43_ocean_acide", 2043, 4, 0.6, "Effondrement des récifs coralliens", "La moitié des récifs a disparu ; la pêche s'effondre dans le Pacifique.", ["IDN", "PHL", "AUS"], "alerte_environnementale", [SOLDE("IDN", "alimentation", -4), SOLDE("PHL", "alimentation", -4)]),
  // 2044
  R("q44_usa_shutdown", 2044, 1, 0.4, "Paralysie fédérale aux États-Unis", "Trois mois sans budget : fonctionnaires sans salaire, agences fermées.", ["USA"], "scandale_dirigeant", [G("USA", -0.4, 4), PRIME("OCC", 0.3)]),
  R("q44_chine_retraites", 2044, 2, 0.6, "La Chine relève l'âge de la retraite à 68 ans", "Le choc démographique impose une réforme brutale.", ["CHN"], "manifestations", [S("CHN", -4), DETTE("CHN", -2)]),
  R("q44_soudan_partition", 2044, 3, 0.3, "Le Soudan se divise", "Après des années de guerre, le Darfour proclame son indépendance.", ["SDN"], "secession", [S("SDN", -10), TN(2)]),
  R("q44_pacte_migratoire", 2044, 4, 0.4, "Pacte mondial sur les réfugiés climatiques", "Cent pays reconnaissent un statut aux réfugiés climatiques.", ["USA", "DEU", "IND"], "traite_majeur", [TN(-2)]),
  // 2045
  R("q45_japon_chine", 2045, 2, 0.35, "Réconciliation sino-japonaise", "Cent ans après la guerre, Tokyo et Pékin signent un traité d'amitié.", ["JPN", "CHN"], "reconciliation", [I("JPN", "CHN", "p", 5), TN(-3)], [{ type: "cran", max: 2 }]),
  R("q45_guerre_eau_nil", 2045, 3, 0.25, "Crise armée sur le Nil", "L'Égypte bombarde un chantier de barrage en Éthiopie.", ["EGY", "ETH", "SDN"], "conflit_frontalier", [TN(5), S(["EGY", "ETH"], -5)]),
  R("q45_krach_ia", 2045, 1, 0.35, "Krach des valeurs de l'IA", "Les promesses de rentabilité de l'IA déçoivent ; la bourse de New York perd 40 %.", ["USA"], "krach_boursier", [G("USA", -1, 4), G("tous", -0.3, 4)]),
  R("q45_ukraine_reconstruite", 2045, 4, 0.5, "L'Ukraine reconstruite", "Kyiv accueille les Jeux européens ; le pays est redevenu un grenier du monde.", ["UKR"], "accord_commercial", [SOLDE("UKR", "alimentation", 8), G("UKR", 0.5, 4)], SI("p_cessez_feu_ukraine")),
  // 2046
  R("q46_argentine_boom", 2046, 1, 0.4, "L'Argentine, puissance énergétique", "Vaca Muerta et le lithium font de l'Argentine un grand exportateur.", ["ARG"], "gisement_geant", [SOLDE("ARG", "energie", 10), G("ARG", 0.5, 4)]),
  R("q46_corruption_ue", 2046, 2, 0.4, "Scandale de corruption à Bruxelles", "Des commissaires européens auraient été payés par des puissances étrangères.", ["BEL", "FRA", "DEU"], "scandale_dirigeant", [I(UE, "OCC", "p", -2), S(UE, -2)]),
  R("q46_spatial_minier", 2046, 4, 0.3, "Premier astéroïde exploité", "Une entreprise rapporte des métaux rares extraits d'un astéroïde.", ["USA", "LUX"], "exploit_spatial", [SOLDE("USA", "metaux", 4), CP("OCC", 2)]),
  R("q46_kazakhstan", 2046, 3, 0.35, "Le Kazakhstan choisit l'Europe", "Astana signe un accord d'association avec l'Union européenne.", ["KAZ"], "accord_commercial", [I("KAZ", "OCC", "e", 5), I("KAZ", "CHN", "p", -3)]),
  // 2047
  R("q47_inde_independance", 2047, 3, 0.95, "L'Inde fête cent ans d'indépendance", "New Delhi se proclame « nation développée », objectif fixé trente ans plus tôt.", ["IND"], "poussee_ideologique", [S("IND", 3)]),
  R("q47_inondations_chine", 2047, 2, 0.5, "Crue géante du Yangtsé", "Le barrage des Trois-Gorges est à sa limite ; des millions d'évacués.", ["CHN"], "inondation", [G("CHN", -0.6, 4), S("CHN", -3)], [], { deviable: false }),
  R("q47_otan_100", 2047, 1, 0.4, "Le Canada et le Mexique en crise avec Washington", "Droits de douane et quotas : l'Amérique du Nord se divise.", ["CAN", "MEX", "USA"], "guerre_commerciale", [I(["CAN", "MEX"], "OCC", "e", -3)]),
  R("q47_pologne", 2047, 4, 0.5, "La Pologne, première armée d'Europe", "Varsovie aligne plus de chars que la France, l'Allemagne et le Royaume-Uni réunis.", ["POL"], "incident_militaire", [I("POL", "OCC", "m", 3), TN(1)]),
  // 2048
  R("q48_iran_guerre_civile", 2048, 1, 0.2, "Guerre civile en Iran", "Le pouvoir se divise entre Gardiens de la révolution et réformateurs.", ["IRN"], "guerre_civile", [S("IRN", -15), BLOQUE("ormuz"), INFL("tous", 1)]),
  R("q48_bresil_puissance", 2048, 3, 0.5, "Le Brésil au Conseil de sécurité", "L'élargissement du Conseil donne un siège permanent au Brésil.", ["BRA"], "traite_majeur", [I("BRA", "OCC", "p", 1), I("BRA", "CHN", "p", 1)], SI("p_reforme_onu")),
  R("q48_cyber_vote", 2048, 4, 0.4, "Une élection manipulée par des IA", "Des millions de faux électeurs numériques faussent un scrutin européen.", ["FRA", "DEU"], "cyberattaque", [S(UE, -3), TN(2)]),
  R("q48_afrique_industrie", 2048, 2, 0.5, "L'Afrique, nouvel atelier du monde", "Les usines quittent l'Asie pour l'Éthiopie, le Kenya et le Maroc.", ["ETH", "KEN", "MAR"], "accord_commercial", [SOLDE("ETH", "industrie", 6), SOLDE("MAR", "industrie", 5), G(["ETH", "KEN", "MAR"], 0.6, 4)]),
  // 2049
  R("q49_chaleur_mortelle", 2049, 2, 0.6, "Les étés deviennent invivables dans le Golfe", "Des villes du Golfe vivent sous dôme climatisé ; l'émigration commence.", GOLFE.slice(0, 3), "canicule", [S(GOLFE, -3)]),
  R("q49_ue_federation", 2049, 3, 0.2, "Une fédération européenne", "Après un référendum, huit pays fondent une fédération avec un gouvernement commun.", UE.slice(0, 4), "traite_majeur", [I(UE, "OCC", "p", 4), MOND({ occ: 0.02 })]),
  R("q49_crise_dette_chine", 2049, 1, 0.3, "Crise de la dette chinoise", "Les provinces cessent de payer ; Pékin nationalise les banques régionales.", ["CHN"], "crise_bancaire", [DETTE("CHN", 15), G("CHN", -1.5, 4)]),
  // 2050
  R("q50_cop", 2050, 4, 0.8, "Bilan du demi-siècle climatique", "Le réchauffement atteint 2 °C : le monde négocie l'adaptation plutôt que la prévention.", ["USA", "CHN", "IND"], "alerte_environnementale", [S("tous", -1)]),
  R("q50_premiers_martiens", 2050, 2, 0.3, "Une base habitée sur Mars", "Une centaine de personnes vivent en permanence sur Mars.", ["USA", "CHN"], "exploit_spatial", [CP("OCC", 1), CP("CHN", 1)]),
];

// ---------- Troisième série 2036-2050 (2 novembre 2026, demande : 10 à 12 événements par an, pas seulement génériques) ----------
export const PROJECTIONS_2050_C: EvenementHistorique[] = [
  R("s36_g20_afrique", 2036, 2, 0.7, "L'Union africaine pèse au G20", "Pour la première fois, l'Union africaine présente une position commune sur la dette et le climat.", ["ZAF", "NGA", "EGY"], "traite_majeur", [I(AFR, "CHN", "p", 1), I(AFR, "OCC", "p", 1)]),
  R("s36_cuivre", 2036, 4, 0.6, "Pénurie mondiale de cuivre", "Réseaux électriques et voitures électriques épuisent les mines ; le Chili et le Congo deviennent incontournables.", ["CHL", "COD", "PER"], "flambee_alimentaire", [SOLDE("CHL", "metaux", 6), SOLDE("COD", "metaux", 6), INFL("tous", 0.5)]),
  R("s37_bresil_amazonie", 2037, 1, 0.5, "Le Brésil ferme l'Amazonie aux exportations de bois", "Brasilia interdit l'exportation de bois tropical et taxe le soja issu de terres déboisées.", ["BRA"], "nationalisation", [SOLDE("BRA", "alimentation", -4), I("BRA", "OCC", "c", 2)]),
  R("s37_espionnage", 2037, 3, 0.6, "Grand procès d'espionnage industriel", "Un réseau qui volait des plans de puces et de batteries est démantelé ; chaque camp accuse l'autre.", ["USA", "CHN", "DEU"], "scandale_dirigeant", [TN(3)]),
  R("s38_vietnam", 2038, 2, 0.6, "Le Viêt Nam, nouvel atelier électronique", "Les usines quittent la Chine pour le delta du fleuve Rouge.", ["VNM"], "accord_commercial", [SOLDE("VNM", "industrie", 6), G("VNM", 0.6, 4), I("VNM", "OCC", "e", 2)]),
  R("s38_hongrie", 2038, 4, 0.35, "Budapest bloque l'Union européenne", "Le veto hongrois paralyse sanctions et budget pendant six mois.", ["HUN"], "election_rupture", [I("HUN", "CHN", "p", 3), I(UE, "OCC", "p", -1)]),
  R("s39_kenya_tech", 2039, 1, 0.5, "Nairobi, capitale africaine de la tech", "Paiement mobile, IA agricole et satellites : le Kenya exporte ses services numériques.", ["KEN"], "percee_technologique", [G("KEN", 0.5, 4)]),
  R("s39_mer_noire", 2039, 3, 0.35, "Incident naval en mer Noire", "Un drone russe touche une frégate roumaine ; l'OTAN convoque un conseil d'urgence.", ["RUS", "ROU", "TUR"], "incident_militaire", [TN(5), BLOQUE("detroits")], CRAN(2)),
  R("s40_algerie", 2040, 2, 0.35, "L'Algérie vacille", "La chute des revenus du gaz et le chômage provoquent des émeutes dans tout le pays.", ["DZA"], "manifestations", [S("DZA", -10), SOLDE("DZA", "energie", -6)]),
  R("s40_ports_chinois", 2040, 4, 0.5, "Les ports chinois en Afrique sous contrôle", "Plusieurs pays endettés cèdent la gestion de leurs ports à des sociétés chinoises.", ["KEN", "TZA", "DJI"], "defaut_souverain", [I(["KEN", "TZA", "DJI"], "CHN", "e", 3), I(["KEN", "TZA", "DJI"], "OCC", "p", -1)]),
  R("s41_australie_chine", 2041, 2, 0.4, "Rupture entre l'Australie et la Chine", "Pékin cesse d'acheter le fer australien après un incident diplomatique.", ["AUS", "CHN"], "sanctions_embargo", [SOLDE("AUS", "metaux", -8), G("AUS", -0.6, 4), I("AUS", "OCC", "m", 2)]),
  R("s41_chili_lithium", 2041, 4, 0.5, "Le Chili nationalise son lithium", "Santiago reprend les mines du désert d'Atacama.", ["CHL"], "nationalisation", [SOLDE("CHL", "metaux", -3), I("CHL", "OCC", "e", -2)]),
  R("s42_mexique_usine", 2042, 1, 0.6, "Le Mexique, premier fournisseur des États-Unis", "Les usines venues d'Asie font du Mexique le premier partenaire commercial américain.", ["MEX", "USA"], "accord_commercial", [SOLDE("MEX", "industrie", 6), G("MEX", 0.5, 4), I("MEX", "OCC", "e", 3)]),
  R("s42_cyber_satellites", 2042, 3, 0.35, "Piratage d'une constellation de satellites", "Des milliers de satellites de télécommunications perdent le contact pendant 48 heures.", ["USA", "CHN"], "cyberattaque", [G("tous", -0.2, 4), TN(3)]),
  R("s43_turquie_axe", 2043, 1, 0.4, "La Turquie choisit l'Eurasie", "Ankara quitte le commandement intégré de l'OTAN et rejoint les exercices de l'OCS.", ["TUR"], "sortie_organisation", [I("TUR", "OCC", "m", -6), I("TUR", "CHN", "p", 4), TN(3)]),
  R("s43_oceanie", 2043, 4, 0.5, "Les îles du Pacifique s'unissent", "Face à la montée des eaux, les îles du Pacifique créent une confédération et réclament des terres.", ["FJI", "PNG", "SLB"], "traite_majeur", [I(["FJI", "PNG", "SLB"], "OCC", "p", 1)]),
  R("s44_inde_coree", 2044, 2, 0.45, "L'Inde fabrique ses porte-avions et ses chasseurs", "L'industrie de défense indienne devient exportatrice.", ["IND"], "percee_technologique", [SOLDE("IND", "industrie", 4), I("IND", "OCC", "m", 1)]),
  R("s44_eau_dessalement", 2044, 4, 0.6, "Le dessalement devient bon marché", "Des usines solaires produisent de l'eau douce à bas prix au Maghreb et au Moyen-Orient.", ["SAU", "MAR", "ISR"], "percee_technologique", [SOLDE("SAU", "alimentation", 6), SOLDE("MAR", "alimentation", 6)]),
  R("s45_coup_afrique", 2045, 2, 0.5, "Vague de coups d'État en Afrique centrale", "Trois gouvernements tombent en six mois ; les juntes cherchent de nouveaux parrains.", ["CMR", "GAB", "CAF"], "coup_etat", [S(["CMR", "GAB", "CAF"], -10), I(["CMR", "GAB", "CAF"], "OCC", "p", -2)]),
  R("s45_ue_chine", 2045, 4, 0.35, "Accord d'investissement Europe-Chine", "Après dix ans de gel, Bruxelles et Pékin signent un accord sur les voitures électriques et les batteries.", ["DEU", "FRA", "CHN"], "accord_commercial", [I(UE, "CHN", "e", 3), TN(-2)]),
  R("s46_inde_eau", 2046, 1, 0.5, "Pénurie d'eau à Delhi et Chennai", "Des quartiers entiers sont ravitaillés par camions-citernes pendant l'été.", ["IND"], "secheresse", [S("IND", -3), G("IND", -0.3, 4)]),
  R("s46_otan_arctique", 2046, 3, 0.4, "La Suède et la Finlande bâtissent une défense nordique", "Les pays nordiques fusionnent leurs aviations.", ["SWE", "FIN", "NOR"], "adhesion_alliance", [I(["SWE", "FIN", "NOR"], "OCC", "m", 3)]),
  R("s47_egypte_nil", 2047, 1, 0.5, "Accord sur le Nil", "L'Égypte, le Soudan et l'Éthiopie partagent enfin les eaux du fleuve.", ["EGY", "ETH", "SDN"], "reconciliation", [TN(-2), S(["EGY", "ETH"], 3)]),
  R("s47_crypto_etat", 2047, 3, 0.35, "Une grande banque centrale lance une monnaie numérique mondiale", "Un « dollar numérique » ou un « e-yuan » s'ouvre aux particuliers du monde entier.", ["USA", "CHN"], "percee_technologique", [MOND({ crypto: 0.01 })]),
  R("s48_russie_chine", 2048, 1, 0.35, "La Russie vend la Sibérie orientale en concessions", "Moscou cède pour 99 ans des terres agricoles et des mines à des sociétés chinoises.", ["RUS", "CHN"], "accord_commercial", [I("RUS", "CHN", "e", 5), S("RUS", -4)]),
  R("s48_iles_disparues", 2048, 3, 0.6, "Un État insulaire évacue sa population", "Les Tuvalu et les Kiribati organisent le départ de leurs habitants vers l'Australie et la Nouvelle-Zélande.", ["AUS", "NZL"], "crise_migratoire", [I(["AUS", "NZL"], "OCC", "c", 1)]),
  R("s49_inde_chine_commerce", 2049, 1, 0.4, "L'Inde et la Chine signent un grand accord commercial", "Les deux géants d'Asie suppriment la plupart de leurs droits de douane.", ["IND", "CHN"], "accord_commercial", [I("IND", "CHN", "e", 5), I("IND", "OCC", "e", -2)], [{ type: "cran", max: 3 }]),
  R("s49_cyclone_bengale", 2049, 3, 0.5, "Super-cyclone sur le golfe du Bengale", "Le Bangladesh et l'est de l'Inde sont submergés ; dix millions de sinistrés.", ["BGD", "IND"], "cyclone", [G("BGD", -2, 4), S("BGD", -6)], [], { deviable: false }),
  R("s50_conference_paix", 2050, 1, 0.3, "Conférence pour un nouvel ordre mondial", "Washington, Pékin, New Delhi et Bruxelles négocient un traité de sécurité pour le demi-siècle suivant.", ["USA", "CHN", "IND", "DEU"], "traite_majeur", [TN(-5)], [{ type: "cran", max: 3 }]),
  R("s50_robots_majorite", 2050, 3, 0.5, "Plus de robots que d'ouvriers dans les usines", "Dans les pays riches, les machines dépassent les humains dans l'industrie.", ["JPN", "KOR", "DEU"], "percee_technologique", [SOLDE("JPN", "industrie", 4), SOLDE("KOR", "industrie", 4)]),
];

// Conditions ajoutées par le moteur v2 à des événements projetés existants (projections.ts reste partagé avec le jeu principal).
export const CONDITIONS_V2: Record<string, Condition[]> = {
  p_dialogue_detroit: SAUF("r_invasion_taiwan"), // pas de dialogue entre les deux rives après une invasion
};
