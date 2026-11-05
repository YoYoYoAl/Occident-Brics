// Événements historiques récents (2025 à octobre 2026). Textes : faits réels, sobres, vérifiés le 27/10/2026.
// Effets : choix de réglage (jeu). Après 2022 la trajectoire de croissance est projetée : les chocs économiques sont donc
// portés par des effets de croissance, modérés et temporaires.
import type { EvenementHistorique } from "../moteur/types";

const UE = ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"];
const OTAN_EUROPE = [...UE, "GBR", "NOR", "DNK", "FIN", "TUR", "LTU", "LVA", "EST", "ROU", "CZE"];
const GOLFE = ["SAU", "ARE", "QAT", "KWT", "BHR", "OMN"];
const ASIE_IMPORTATRICE = ["CHN", "JPN", "KOR", "IND", "TWN"];

export const HISTORIQUES_RECENTS: EvenementHistorique[] = [
  { id: "h_deepseek", annee: 2025, trimestre: 1, titre: "Le choc DeepSeek",
    texte: "En janvier 2025, la start-up chinoise DeepSeek publie un modèle d'IA proche des meilleurs modèles américains pour une fraction du coût ; les valeurs technologiques américaines décrochent.",
    pays: ["CHN", "USA"], famille: "percee_technologique", deviable: true, conditions: [{ type: "evenement", id: "h_ia_generative", fait: true }],
    effets: [{ type: "cp", camp: "CHN", valeur: 2 }, { type: "influence", pays: ["IDN", "BRA", "IND", "ZAF"], camp: "CHN", canal: "c", valeur: 2 }] },

  { id: "h_liberation_day", annee: 2025, trimestre: 2, titre: "Droits de douane du « Liberation Day »",
    texte: "Le 2 avril 2025, Washington annonce des droits de douane sur presque tous ses partenaires ; avec la Chine, l'escalade porte les taxes au-delà de 100 % de part et d'autre.",
    pays: ["USA", "CHN"], famille: "guerre_commerciale", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 5 }, { type: "croissance", pays: "tous", points: -0.15, duree: 4 },
             { type: "influence", pays: [...UE, "JPN", "KOR", "CAN", "MEX"], camp: "OCC", canal: "e", valeur: -3 }] },

  { id: "h_treve_geneve", annee: 2025, trimestre: 2, titre: "Trêve commerciale de Genève",
    texte: "Le 12 mai 2025 à Genève, Washington et Pékin réduisent leurs droits de douane réciproques pour 90 jours ; la trêve sera ensuite prolongée.",
    pays: ["USA", "CHN"], famille: "accord_commercial", deviable: true, conditions: [{ type: "evenement", id: "h_liberation_day", fait: true }, { type: "cran", max: 4 }],
    effets: [{ type: "tension", valeur: -4 }, { type: "croissance", pays: ["USA", "CHN"], points: 0.1, duree: 4 }] },

  { id: "h_sindoor", annee: 2025, trimestre: 2, titre: "Affrontements entre l'Inde et le Pakistan",
    texte: "Après un attentat au Cachemire, l'Inde frappe le Pakistan le 7 mai 2025 ; quatre jours de frappes de missiles et de drones s'achèvent par un cessez-le-feu le 10 mai.",
    pays: ["IND", "PAK"], famille: "conflit_frontalier", deviable: true, conditions: [],
    effets: [{ type: "tension", valeur: 3 }, { type: "stabilite", pays: "PAK", valeur: -5 }, { type: "influence", pays: "PAK", camp: "CHN", canal: "m", valeur: 3 }] },

  { id: "h_guerre_douze_jours", annee: 2025, trimestre: 2, titre: "La guerre des douze jours",
    texte: "Le 13 juin 2025, Israël frappe les sites nucléaires et militaires iraniens ; les États-Unis bombardent Fordo le 22 juin. Un cessez-le-feu intervient le 24 juin.",
    pays: ["ISR", "IRN", "USA"], famille: "guerre_interetatique", deviable: true, conditions: [{ type: "alignement", pays: "IRN", max: 0 }],
    effets: [{ type: "tension", valeur: 6 }, { type: "stabilite", pays: "IRN", valeur: -10 }, { type: "croissance", pays: "IRN", points: -1.5, duree: 4 }] },

  { id: "h_otan_cinq", annee: 2025, trimestre: 2, titre: "L'OTAN vise 5 % du PIB pour la défense",
    texte: "Au sommet de La Haye, les 24 et 25 juin 2025, les alliés s'engagent à porter leurs dépenses de défense et de sécurité à 5 % du PIB d'ici 2035.",
    pays: ["USA", "NLD"], famille: "adhesion_alliance", deviable: true, conditions: [{ type: "evenement", id: "h_ukraine", fait: true }],
    effets: [{ type: "influence", pays: OTAN_EUROPE, camp: "OCC", canal: "m", valeur: 3 }, { type: "croissance", pays: OTAN_EUROPE, points: -0.05, duree: 8, delai: 2 }] },

  { id: "h_brics_rio", annee: 2025, trimestre: 3, titre: "Sommet des BRICS à Rio",
    texte: "Les 6 et 7 juillet 2025 à Rio de Janeiro, les BRICS dénoncent les hausses de droits de douane unilatérales, sans nommer les États-Unis ; l'Indonésie y siège pour la première fois comme membre.",
    pays: ["BRA", "IDN"], famille: "sommet_reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_brics_elargis", fait: true }],
    effets: [{ type: "influence", pays: ["BRA", "IDN"], camp: "CHN", canal: "p", valeur: 3 }, { type: "cp", camp: "CHN", valeur: 1 }] },

  { id: "h_alaska", annee: 2025, trimestre: 3, titre: "Sommet russo-américain en Alaska",
    texte: "Le 15 août 2025 à Anchorage, les présidents américain et russe se rencontrent pour parler de l'Ukraine ; aucun cessez-le-feu n'en sort.",
    pays: ["USA", "RUS"], famille: "sommet_reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_ukraine", fait: true }],
    effets: [{ type: "tension", valeur: -2 }, { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: 2 }] },

  { id: "h_tianjin", annee: 2025, trimestre: 3, titre: "Sommet de Tianjin et défilé de Pékin",
    texte: "Fin août 2025, Pékin réunit l'Organisation de coopération de Shanghai à Tianjin, avec les dirigeants russe et indien, puis organise le 3 septembre un grand défilé militaire.",
    pays: ["CHN", "RUS", "IND"], famille: "sommet_reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_liberation_day", fait: true }],
    effets: [{ type: "influence", pays: ["RUS", "IND", "KAZ", "PAK"], camp: "CHN", canal: "p", valeur: 3 }, { type: "cp", camp: "CHN", valeur: 2 }, { type: "tension", valeur: 1 }] },

  { id: "h_snapback", annee: 2025, trimestre: 3, titre: "Retour des sanctions de l'ONU contre l'Iran",
    texte: "Activé par la France, l'Allemagne et le Royaume-Uni, le mécanisme de « snapback » rétablit le 28 septembre 2025 les sanctions de l'ONU levées en 2015.",
    pays: ["IRN", "FRA", "DEU", "GBR"], famille: "sanctions_embargo", deviable: true, conditions: [{ type: "evenement", id: "h_jcpoa", fait: true }],
    effets: [{ type: "croissance", pays: "IRN", points: -1, duree: 4 }, { type: "influence", pays: "IRN", camp: "CHN", canal: "e", valeur: 3 }] },

  { id: "h_terres_rares_chine", annee: 2025, trimestre: 4, titre: "Pékin verrouille les terres rares",
    texte: "Le 9 octobre 2025, la Chine étend ses contrôles à l'exportation des terres rares et des technologies d'aimants, dont elle domine la production mondiale.",
    pays: ["CHN"], famille: "guerre_commerciale", deviable: true, conditions: [],
    effets: [{ type: "tension", valeur: 3 }, { type: "croissance", pays: ["USA", "JPN", "DEU", "KOR"], points: -0.1, duree: 2 }] },

  { id: "h_cessez_feu_gaza", annee: 2025, trimestre: 4, titre: "Cessez-le-feu à Gaza",
    texte: "Le 10 octobre 2025, un cessez-le-feu entre Israël et le Hamas entre en vigueur, avec la libération des otages et de prisonniers palestiniens ; il reste fragile.",
    pays: ["ISR", "EGY", "QAT"], famille: "reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_7_octobre", fait: true }],
    effets: [{ type: "tension", valeur: -3 }, { type: "influence", pays: ["EGY", "QAT"], camp: "OCC", canal: "p", valeur: 2 }] },

  { id: "h_busan", annee: 2025, trimestre: 4, titre: "Trêve de Busan",
    texte: "Le 30 octobre 2025 à Busan, les présidents américain et chinois concluent une trêve d'un an : baisse de droits de douane, suspension des contrôles chinois sur les terres rares, achats de soja.",
    pays: ["USA", "CHN", "KOR"], famille: "accord_commercial", deviable: true, conditions: [{ type: "cran", max: 4 }],
    effets: [{ type: "tension", valeur: -4 }, { type: "croissance", pays: ["USA", "CHN"], points: 0.1, duree: 4 }] },

  { id: "h_maduro", annee: 2026, trimestre: 1, titre: "Capture de Nicolás Maduro",
    texte: "Début janvier 2026, des frappes américaines visent Caracas et un raid des forces spéciales capture le président vénézuélien, transféré à New York pour y être jugé.",
    pays: ["VEN", "USA"], famille: "coup_etat", deviable: true, conditions: [{ type: "alignement", pays: "VEN", max: 0 }],
    effets: [{ type: "stabilite", pays: "VEN", valeur: -20 }, { type: "influence", pays: "VEN", camp: "OCC", canal: "p", valeur: 10 }, { type: "influence", pays: "VEN", camp: "CHN", canal: "e", valeur: -5 },
             { type: "influence", pays: ["BRA", "MEX", "COL", "CUB", "NIC", "BOL"], camp: "OCC", canal: "p", valeur: -2 }, { type: "tension", valeur: 4 }] },

  { id: "h_retrait_oms", annee: 2026, trimestre: 1, titre: "Les États-Unis quittent l'OMS",
    texte: "En janvier 2026, le retrait américain de l'Organisation mondiale de la santé, annoncé un an plus tôt, devient effectif.",
    pays: ["USA"], famille: "sortie_organisation", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -1 }, { type: "influence", pays: ["NGA", "ETH", "COD", "KEN", "TZA"], camp: "CHN", canal: "p", valeur: 1 }] },

  { id: "h_fin_new_start", annee: 2026, trimestre: 1, titre: "Fin du traité New START",
    texte: "Le 5 février 2026, le dernier traité russo-américain de limitation des armes nucléaires stratégiques expire sans remplaçant.",
    pays: ["USA", "RUS"], famille: "proliferation_nucleaire", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 3 }] },

  { id: "h_guerre_iran", annee: 2026, trimestre: 1, titre: "Guerre contre l'Iran",
    texte: "Le 28 février 2026, des frappes américaines et israéliennes visent l'Iran ; le Guide suprême Ali Khamenei est tué. L'Iran riposte contre Israël et les pays du Golfe qui accueillent des bases américaines.",
    pays: ["IRN", "USA", "ISR"], conflit: { pays: ["IRN"], duree: 4 }, famille: "guerre_interetatique", deviable: true,
    conditions: [{ type: "alignement", pays: "IRN", max: 0 }, { type: "evenement", id: "h_guerre_douze_jours", fait: true }],
    effets: [{ type: "tension", valeur: 10 }, { type: "stabilite", pays: "IRN", valeur: -25 }, { type: "stabilite", pays: GOLFE, valeur: -5 },
             { type: "influence", pays: "IRN", camp: "CHN", canal: "p", valeur: 3 }] },

  { id: "h_ormuz", annee: 2026, trimestre: 1, titre: "Fermeture du détroit d'Ormuz",
    texte: "En mars 2026, l'Iran déclare le détroit d'Ormuz fermé et le mine ; le trafic des pétroliers s'effondre et le prix du pétrole s'envole.",
    pays: ["IRN", "OMN", "ARE"], famille: "blocage_detroit", deviable: true, conditions: [{ type: "evenement", id: "h_guerre_iran", fait: true }],
    effets: [{ type: "croissance", pays: "tous", points: -0.3, duree: 4 }, { type: "croissance", pays: ASIE_IMPORTATRICE, points: -0.3, duree: 4 },
             { type: "croissance", pays: GOLFE, points: -2, duree: 4 }, { type: "tension", valeur: 4 }] },

  { id: "h_treve_iran", annee: 2026, trimestre: 2, titre: "Trêve fragile avec l'Iran",
    texte: "Le 8 avril 2026, un premier cessez-le-feu est annoncé entre les belligérants ; il est violé à plusieurs reprises, et la navigation dans le détroit reste très réduite pendant des mois.",
    pays: ["IRN", "USA", "PAK"], famille: "reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_guerre_iran", fait: true }],
    effets: [{ type: "tension", valeur: -4 }, { type: "influence", pays: "PAK", camp: "OCC", canal: "p", valeur: 2 }] },

  { id: "h_trump_pekin", annee: 2026, trimestre: 2, titre: "Visite d'État américaine à Pékin",
    texte: "Les 14 et 15 mai 2026 à Pékin, les deux présidents annoncent des achats agricoles et d'avions chinois et des engagements sur les terres rares ; la trêve commerciale court jusqu'en novembre.",
    pays: ["USA", "CHN"], famille: "accord_commercial", deviable: true, conditions: [{ type: "cran", max: 4 }],
    effets: [{ type: "tension", valeur: -3 }, { type: "croissance", pays: ["USA", "CHN"], points: 0.05, duree: 4 }] },

  { id: "h_brics_delhi", annee: 2026, trimestre: 3, titre: "Sommet des BRICS à New Delhi",
    texte: "En septembre 2026, les onze membres des BRICS adoptent la déclaration de New Delhi : appel à la retenue au Moyen-Orient, critique des droits de douane unilatéraux, sans nommer personne.",
    pays: ["IND"], famille: "sommet_reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_brics_elargis", fait: true }],
    effets: [{ type: "influence", pays: "IND", camp: "CHN", canal: "p", valeur: 2 }, { type: "cp", camp: "CHN", valeur: 1 }] },

  { id: "h_pourparlers_ukraine", annee: 2026, trimestre: 4, titre: "Trêve locale et pourparlers en Ukraine",
    texte: "En octobre 2026, après des trêves de courte durée au printemps, Moscou et Kiev conviennent d'un cessez-le-feu local et de nouveaux pourparlers de paix ; la guerre continue ailleurs sur le front.",
    pays: ["UKR", "RUS"], famille: "reconciliation", deviable: true, conditions: [{ type: "evenement", id: "h_ukraine", fait: true }],
    effets: [{ type: "tension", valeur: -2 }, { type: "stabilite", pays: "UKR", valeur: 3 }] },
];
