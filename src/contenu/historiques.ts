// Événements historiques de l'ère 1 (2000-2008). Textes : faits réels, sobres.
// Effets : choix de réglage (jeu), à ajuster après les tests. Les effets sur la croissance réelle
// sont déjà dans la trajectoire de référence ; seul un événement évité est compensé.
import type { EvenementHistorique } from "../moteur/types";

const UE12 = ["DEU", "FRA", "ITA", "ESP", "NLD"]; // membres de la zone euro parmi les 50 pays
const OTAN_ASIE = ["JPN", "KOR", "AUS", "PHL", "THA"];
const MONDE_ARABE = ["SAU", "EGY", "ARE", "QAT", "DZA", "IRQ"];

export const HISTORIQUES_ERE1: EvenementHistorique[] = [
  { id: "h_bulle_internet", annee: 2000, trimestre: 1, titre: "Éclatement de la bulle Internet",
    texte: "Le Nasdaq atteint son sommet le 10 mars 2000 puis perd près de 78 % jusqu'en octobre 2002. Des milliers de start-up disparaissent.",
    pays: ["USA"], famille: "krach_boursier", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -4 }, { type: "stabilite", pays: "USA", valeur: -2 }] },

  { id: "h_ocs", annee: 2001, trimestre: 2, titre: "Création de l'Organisation de coopération de Shanghai",
    texte: "Le 15 juin 2001, la Chine, la Russie, le Kazakhstan, le Kirghizstan, le Tadjikistan et l'Ouzbékistan fondent l'OCS.",
    pays: ["CHN", "RUS", "KAZ"], famille: "adhesion_alliance", deviable: true,
    conditions: [{ type: "alignement", pays: "RUS", max: 0.3 }, { type: "alignement", pays: "KAZ", max: 0.3 }],
    effets: [{ type: "influence", pays: ["RUS", "KAZ"], camp: "CHN", canal: "p", valeur: 10 },
             { type: "influence", pays: ["RUS", "KAZ"], camp: "CHN", canal: "m", valeur: 5 }] },

  { id: "h_11_septembre", annee: 2001, trimestre: 3, titre: "Attentats du 11 septembre",
    texte: "Près de 3 000 morts à New York, Washington et en Pennsylvanie. Le 12 septembre, l'OTAN invoque pour la première fois l'article 5.",
    pays: ["USA"], famille: "attentat", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 15 }, { type: "cp", camp: "OCC", valeur: 15 },
             { type: "influence", pays: ["GBR", "FRA", "DEU", "CAN", "AUS"], camp: "OCC", canal: "p", valeur: 6 },
             { type: "stabilite", pays: "USA", valeur: -5 }] },

  { id: "h_afghanistan", annee: 2001, trimestre: 4, titre: "Intervention en Afghanistan",
    texte: "Le 7 octobre 2001, les États-Unis et leurs alliés lancent l'opération Enduring Freedom contre les talibans et Al-Qaïda. Le Pakistan devient un partenaire clé.",
    pays: ["USA", "PAK"], famille: "guerre_interetatique", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: "PAK", camp: "OCC", canal: "m", valeur: 12 },
             { type: "influence", pays: "PAK", camp: "OCC", canal: "p", valeur: 6 },
             { type: "budget", camp: "OCC", valeur: -1 }, { type: "tension", valeur: 3 }] },

  { id: "h_chine_omc", annee: 2001, trimestre: 4, titre: "La Chine entre à l'OMC",
    texte: "Le 11 décembre 2001, la Chine devient membre de l'Organisation mondiale du commerce, après quinze ans de négociations.",
    pays: ["CHN"], famille: "accord_commercial", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: "tous", camp: "CHN", canal: "e", valeur: 4 }, { type: "cp", camp: "CHN", valeur: 5 }] },

  { id: "h_argentine", annee: 2001, trimestre: 4, titre: "Faillite de l'Argentine",
    texte: "Fin décembre 2001, l'Argentine fait défaut sur près de 100 milliards de dollars de dette. Le « corralito » gèle les dépôts ; le PIB chute de plus de 10 % en 2002.",
    pays: ["ARG"], famille: "defaut_souverain", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "ARG", valeur: -20 }, { type: "influence", pays: "ARG", camp: "OCC", canal: "p", valeur: -6 }] },

  { id: "h_euro", annee: 2002, trimestre: 1, titre: "L'euro dans les poches",
    texte: "Le 1er janvier 2002, les pièces et billets en euros entrent en circulation dans douze pays de l'Union européenne.",
    pays: UE12, famille: "traite_majeur", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: UE12, camp: "OCC", canal: "e", valeur: 2 }, { type: "stabilite", pays: UE12, valeur: 2 }] },

  { id: "h_sras", annee: 2003, trimestre: 2, titre: "Épidémie de SRAS",
    texte: "Apparu en Chine fin 2002, le SRAS touche environ 8 000 personnes et fait 774 morts selon l'OMS avant d'être contenu en juillet 2003.",
    pays: ["CHN"], famille: "epidemie", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "CHN", valeur: -6 }, { type: "influence", pays: "tous", camp: "CHN", canal: "c", valeur: -2 }] },

  { id: "h_irak", annee: 2003, trimestre: 1, titre: "Invasion de l'Irak",
    texte: "Le 20 mars 2003, une coalition menée par les États-Unis et le Royaume-Uni envahit l'Irak, sans mandat du Conseil de sécurité. La France, l'Allemagne, la Russie et la Chine s'y étaient opposées.",
    pays: ["IRQ", "USA", "GBR"], famille: "guerre_interetatique", deviable: true,
    conditions: [{ type: "alignement", pays: "IRQ", max: 0.1 }, { type: "cran", min: 2 }, { type: "drapeau", id: "irak_renonce", present: false }],
    effets: [{ type: "tension", valeur: 10 }, { type: "stabilite", pays: "IRQ", valeur: -35 },
             { type: "influence", pays: ["FRA", "DEU"], camp: "OCC", canal: "p", valeur: -6 },
             { type: "influence", pays: MONDE_ARABE, camp: "OCC", canal: "c", valeur: -6 },
             { type: "influence", pays: "IRQ", camp: "OCC", canal: "m", valeur: 40 },
             { type: "budget", camp: "OCC", valeur: -2 },
             { type: "stabilite", pays: "IRQ", valeur: -15, delai: 5, cache: true },
             { type: "cp", camp: "OCC", valeur: -10, delai: 6, cache: true }],
    compensationSiAbsent: [{ type: "croissance", pays: "IRQ", points: 20, duree: 4 },
                           { type: "croissance", pays: "IRQ", points: -55, duree: 4, delai: 4 }] },

  { id: "h_elargissement", annee: 2004, trimestre: 2, titre: "Grand élargissement de l'OTAN et de l'UE",
    texte: "Sept pays d'Europe centrale et orientale rejoignent l'OTAN le 29 mars 2004 ; dix pays, dont la Pologne, entrent dans l'Union européenne le 1er mai.",
    pays: ["POL"], famille: "adhesion_alliance", deviable: true,
    conditions: [{ type: "alignement", pays: "POL", min: 0.3 }],
    effets: [{ type: "influence", pays: "POL", camp: "OCC", canal: "e", valeur: 8 },
             { type: "influence", pays: "POL", camp: "OCC", canal: "p", valeur: 6 },
             { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -5 }, { type: "tension", valeur: 2 }] },

  { id: "h_revolution_orange", annee: 2004, trimestre: 4, titre: "Révolution orange en Ukraine",
    texte: "Après un second tour contesté, des manifestations massives à Kiev obtiennent un nouveau vote le 26 décembre 2004, remporté par le candidat pro-occidental.",
    pays: ["UKR"], famille: "manifestations", deviable: true,
    conditions: [{ type: "alignement", pays: "UKR", min: -0.2 }],
    effets: [{ type: "influence", pays: "UKR", camp: "OCC", canal: "p", valeur: 12 },
             { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -4 }, { type: "tension", valeur: 3 }] },

  { id: "h_tsunami", annee: 2004, trimestre: 4, titre: "Tsunami dans l'océan Indien",
    texte: "Le 26 décembre 2004, un séisme de magnitude 9,1 au large de Sumatra provoque un tsunami : environ 228 000 morts dans 14 pays, surtout en Indonésie.",
    pays: ["IDN", "THA", "IND"], famille: "seisme", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "IDN", valeur: -6 }, { type: "stabilite", pays: ["THA", "IND"], valeur: -2 }] },

  { id: "h_kyoto", annee: 2005, trimestre: 1, titre: "Entrée en vigueur du protocole de Kyoto",
    texte: "Le 16 février 2005, le protocole de Kyoto entre en vigueur. Les États-Unis ne l'ont pas ratifié ; la Chine, pays en développement, n'a pas d'objectif contraignant.",
    pays: [], famille: "traite_majeur", deviable: false, conditions: [],
    effets: [{ type: "co2", pays: ["DEU", "FRA", "GBR", "ITA", "ESP", "NLD", "JPN", "CAN"], pourcent: -1, duree: 16 }] },

  { id: "h_katrina", annee: 2005, trimestre: 3, titre: "Ouragan Katrina",
    texte: "Fin août 2005, l'ouragan Katrina dévaste La Nouvelle-Orléans : environ 1 800 morts et plus de 100 milliards de dollars de dégâts.",
    pays: ["USA"], famille: "cyclone", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -8 }, { type: "stabilite", pays: "USA", valeur: -2 }] },

  // Fin du prologue : le bloc rival naît (choix de l'utilisateur, 2026-10-25).
  { id: "h_bric", annee: 2006, trimestre: 3, titre: "Naissance du bloc BRIC",
    texte: "En septembre 2006, en marge de l'Assemblée générale de l'ONU, les ministres des Affaires étrangères du Brésil, de la Russie, de l'Inde et de la Chine se réunissent pour la première fois.",
    pays: ["BRA", "RUS", "IND", "CHN"], famille: "sommet_reconciliation", deviable: true,
    conditions: [{ type: "alignement", pays: "BRA", max: 0.5 }, { type: "alignement", pays: "IND", max: 0.5 }],
    effets: [{ type: "influence", pays: ["BRA", "RUS", "IND"], camp: "CHN", canal: "p", valeur: 12 },
             { type: "influence", pays: ["BRA", "RUS", "IND"], camp: "CHN", canal: "e", valeur: 5 },
             { type: "cp", camp: "CHN", valeur: 5 }, { type: "tension", valeur: 3 }, { type: "drapeau", id: "bloc_bric" }] },

  { id: "h_coree_nord_essai", annee: 2006, trimestre: 4, titre: "Premier essai nucléaire nord-coréen",
    texte: "Le 9 octobre 2006, la Corée du Nord procède à son premier essai nucléaire souterrain. Le Conseil de sécurité vote des sanctions.",
    pays: ["PRK"], famille: "proliferation_nucleaire", deviable: true,
    conditions: [{ type: "alignement", pays: "PRK", max: -0.2 }],
    effets: [{ type: "tension", valeur: 5 }, { type: "influence", pays: ["KOR", "JPN"], camp: "OCC", canal: "m", valeur: 5 },
             { type: "cp", camp: "CHN", valeur: -3 }] },

  { id: "h_munich", annee: 2007, trimestre: 1, titre: "Discours de Munich",
    texte: "Le 10 février 2007, à la conférence de Munich sur la sécurité, le président russe dénonce l'ordre unipolaire et l'élargissement de l'OTAN.",
    pays: ["RUS"], famille: "sortie_organisation", deviable: true,
    conditions: [{ type: "alignement", pays: "RUS", max: 0.3 }],
    effets: [{ type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -6 }, { type: "tension", valeur: 3 }] },

  { id: "h_subprimes", annee: 2007, trimestre: 3, titre: "Début de la crise des subprimes",
    texte: "Le 9 août 2007, BNP Paribas gèle trois fonds exposés aux crédits immobiliers américains à risque. La crise de liquidité gagne le système bancaire.",
    pays: ["USA"], famille: "crise_bancaire", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -4 }] },

  { id: "h_sichuan", annee: 2008, trimestre: 2, titre: "Séisme du Sichuan",
    texte: "Le 12 mai 2008, un séisme de magnitude 7,9 frappe le Sichuan : près de 70 000 morts et plus de 18 000 disparus.",
    pays: ["CHN"], famille: "seisme", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "CHN", valeur: -3 }, { type: "cp", camp: "CHN", valeur: 3 }] },

  { id: "h_jo_pekin", annee: 2008, trimestre: 3, titre: "Jeux olympiques de Pékin",
    texte: "Du 8 au 24 août 2008, Pékin accueille les Jeux olympiques, vitrine de l'essor chinois.",
    pays: ["CHN"], famille: "exploit_spatial", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: "tous", camp: "CHN", canal: "c", valeur: 4 }, { type: "cp", camp: "CHN", valeur: 6 }] },

  { id: "h_georgie", annee: 2008, trimestre: 3, titre: "Guerre de Géorgie",
    texte: "Du 7 au 12 août 2008, la Russie et la Géorgie s'affrontent autour de l'Ossétie du Sud. La Russie reconnaît ensuite l'indépendance de l'Ossétie du Sud et de l'Abkhazie.",
    pays: ["RUS"], famille: "guerre_interetatique", deviable: true,
    conditions: [{ type: "alignement", pays: "RUS", max: 0.2 }],
    effets: [{ type: "tension", valeur: 8 }, { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -8 },
             { type: "influence", pays: ["POL", "UKR"], camp: "OCC", canal: "m", valeur: 4 }] },

  { id: "h_lehman", annee: 2008, trimestre: 3, titre: "Faillite de Lehman Brothers",
    texte: "Le 15 septembre 2008, la banque Lehman Brothers fait faillite. La crise financière devient mondiale ; le premier sommet du G20 des chefs d'État se tient à Washington les 14 et 15 novembre.",
    pays: ["USA"], famille: "crise_bancaire", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -15 }, { type: "stabilite", pays: ["USA", "GBR", "ESP"], valeur: -4 },
             { type: "influence", pays: "tous", camp: "OCC", canal: "c", valeur: -3 }] },
];
