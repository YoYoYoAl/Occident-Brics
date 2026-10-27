// Événements projetés (fin 2026 à 2035) : échéances connues et scénarios plausibles, rédigés le 27/10/2026.
// Ce ne sont pas des faits : chacun a une probabilité (estimation de jeu) et des conditions ; s'il n'a pas lieu, rien n'est annoncé.
import type { EvenementHistorique } from "../moteur/types";

const UE = ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"];
const GOLFE = ["SAU", "ARE", "QAT", "KWT", "BHR", "OMN"];
const SAHEL = ["MLI", "BFA", "NER", "TCD"];
const BRICS = ["BRA", "RUS", "IND", "ZAF", "EGY", "ETH", "IRN", "ARE", "SAU", "IDN"];
const P = "Scénario projeté. ";

export const PROJECTIONS: EvenementHistorique[] = [
  { id: "p_fin_treve_commerciale", annee: 2026, trimestre: 4, titre: "La trêve commerciale sino-américaine expire",
    texte: P + "La trêve conclue à Busan arrive à échéance en novembre 2026 sans être reconduite ; les droits de douane remontent des deux côtés.",
    pays: ["USA", "CHN"], famille: "guerre_commerciale", deviable: true, probabilite: 0.4, conditions: [{ type: "evenement", id: "h_busan", fait: true }],
    effets: [{ type: "tension", valeur: 4 }, { type: "croissance", pays: "tous", points: -0.1, duree: 4 }, { type: "croissance", pays: ["USA", "CHN"], points: -0.2, duree: 4 }] },

  { id: "p_cessez_feu_ukraine", annee: 2027, trimestre: 2, titre: "Cessez-le-feu général en Ukraine",
    texte: P + "Après des mois de pourparlers, un cessez-le-feu gèle la ligne de front ; la question des territoires occupés et des garanties de sécurité reste ouverte.",
    pays: ["UKR", "RUS"], famille: "reconciliation", deviable: true, probabilite: 0.4, conditions: [{ type: "evenement", id: "h_ukraine", fait: true }, { type: "cran", max: 4 }],
    effets: [{ type: "tension", valeur: -6 }, { type: "stabilite", pays: "UKR", valeur: 10 }, { type: "croissance", pays: ["UKR", "RUS"], points: 1, duree: 8, delai: 2 }] },

  { id: "p_sahel", annee: 2027, trimestre: 1, titre: "Le Sahel s'embrase",
    texte: P + "Les groupes djihadistes gagnent du terrain au Mali, au Burkina Faso et au Niger ; les juntes appellent Moscou à l'aide, les pays côtiers renforcent leurs frontières.",
    pays: SAHEL, famille: "guerre_civile", deviable: true, probabilite: 0.5, conditions: [],
    effets: [{ type: "stabilite", pays: SAHEL, valeur: -10 }, { type: "influence", pays: SAHEL, camp: "OCC", canal: "m", valeur: -3 }, { type: "croissance", pays: SAHEL, points: -1, duree: 4 }] },

  { id: "p_iran_seuil", annee: 2027, trimestre: 3, titre: "L'Iran franchit le seuil nucléaire",
    texte: P + "Après la guerre et la mort du Guide, un pouvoir iranien durci se retire du traité de non-prolifération et annonce maîtriser l'arme nucléaire.",
    pays: ["IRN", "ISR", "SAU"], famille: "proliferation_nucleaire", deviable: true, probabilite: 0.2, conditions: [{ type: "evenement", id: "h_guerre_iran", fait: true }],
    effets: [{ type: "tension", valeur: 8 }, { type: "influence", pays: "IRN", camp: "OCC", canal: "p", valeur: -5 }, { type: "stabilite", pays: GOLFE, valeur: -3 }] },

  { id: "p_artemis", annee: 2028, trimestre: 2, titre: "Retour d'astronautes américains sur la Lune",
    texte: P + "La mission Artemis III pose un équipage près du pôle Sud lunaire, plus d'un demi-siècle après Apollo.",
    pays: ["USA"], famille: "exploit_spatial", deviable: true, probabilite: 0.5, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: 2 }, { type: "influence", pays: [...UE, "JPN", "IND"], camp: "OCC", canal: "c", valeur: 1 }] },

  { id: "p_cyberattaque", annee: 2028, trimestre: 1, titre: "Cyberattaque géante contre des réseaux électriques",
    texte: P + "Une attaque informatique coordonnée prive plusieurs pays de courant pendant des jours ; l'attribution reste disputée.",
    pays: ["USA", "DEU", "JPN"], famille: "cyberattaque", deviable: true, probabilite: 0.3, conditions: [],
    effets: [{ type: "croissance", pays: ["USA", "DEU", "JPN", "GBR", "FRA"], points: -0.3, duree: 2 }, { type: "tension", valeur: 4 }] },

  { id: "p_crise_dette", annee: 2028, trimestre: 3, titre: "Crise de la dette des pays riches",
    texte: P + "Les taux longs s'envolent face aux déficits publics américain et européens ; les marchés obligataires vacillent et la croissance mondiale cale.",
    pays: ["USA", "FRA", "ITA", "GBR", "JPN"], famille: "krach_boursier", deviable: true, probabilite: 0.3, conditions: [],
    effets: [{ type: "croissance", pays: "tous", points: -0.4, duree: 4 }, { type: "croissance", pays: ["USA", "FRA", "ITA", "GBR", "JPN"], points: -0.4, duree: 4 }, { type: "cp", camp: "OCC", valeur: -2 }] },

  { id: "p_detroit_taiwan", annee: 2028, trimestre: 4, titre: "Quarantaine autour de Taïwan",
    texte: P + "Pékin impose des inspections douanières aux navires qui desservent Taïwan, sans tirer ; les chaînes mondiales de semi-conducteurs se grippent.",
    pays: ["TWN", "CHN", "USA", "JPN"], famille: "blocage_detroit", deviable: true, probabilite: 0.15, conditions: [{ type: "cran", min: 2 }],
    effets: [{ type: "tension", valeur: 10 }, { type: "croissance", pays: "TWN", points: -3, duree: 4 }, { type: "croissance", pays: "tous", points: -0.3, duree: 4 },
             { type: "influence", pays: ["JPN", "KOR", "PHL", "AUS"], camp: "OCC", canal: "m", valeur: 4 }] },

  { id: "p_paiements_brics", annee: 2029, trimestre: 2, titre: "Un système de paiement commun aux BRICS",
    texte: P + "Les BRICS lancent une plateforme de règlement en monnaies nationales reliant leurs banques centrales, pour contourner le dollar et les sanctions.",
    pays: BRICS, famille: "accord_commercial", deviable: true, probabilite: 0.3, conditions: [{ type: "evenement", id: "h_brics_elargis", fait: true }],
    effets: [{ type: "influence", pays: BRICS, camp: "CHN", canal: "e", valeur: 3 }, { type: "cp", camp: "CHN", valeur: 2 }, { type: "tension", valeur: 2 }] },

  { id: "p_ia_rupture", annee: 2029, trimestre: 4, titre: "Percée de l'intelligence artificielle",
    texte: P + "Des systèmes d'IA capables d'automatiser une large part du travail de bureau et de la recherche se diffusent ; la productivité bondit chez les pionniers.",
    pays: ["USA", "CHN"], famille: "percee_technologique", deviable: true, probabilite: 0.4, conditions: [{ type: "evenement", id: "h_ia_generative", fait: true }],
    effets: [{ type: "croissance", pays: "USA", points: 0.4, duree: 8 }, { type: "croissance", pays: "CHN", points: 0.3, duree: 8 }, { type: "croissance", pays: ["GBR", "KOR", "TWN", "JPN"], points: 0.15, duree: 8 }] },

  { id: "p_lune_chine", annee: 2030, trimestre: 3, titre: "Premiers taïkonautes sur la Lune",
    texte: P + "Comme l'annonçait son programme spatial, la Chine pose deux astronautes sur la Lune.",
    pays: ["CHN"], famille: "exploit_spatial", deviable: true, probabilite: 0.6, conditions: [],
    effets: [{ type: "cp", camp: "CHN", valeur: 2 }, { type: "influence", pays: ["PAK", "IDN", "BRA", "ZAF", "EGY"], camp: "CHN", canal: "c", valeur: 2 }] },

  { id: "p_pic_petrole", annee: 2030, trimestre: 1, titre: "La demande de pétrole commence à baisser",
    texte: P + "Avec l'essor des véhicules électriques en Chine et en Europe, la demande mondiale de pétrole atteint son pic ; les recettes des pays producteurs s'érodent.",
    pays: [...GOLFE, "RUS"], famille: "choc_petrolier", deviable: true, probabilite: 0.5, conditions: [],
    effets: [{ type: "croissance", pays: GOLFE, points: -0.5, duree: 8 }, { type: "croissance", pays: ["RUS", "NGA", "AGO", "VEN"], points: -0.4, duree: 8 }, { type: "co2", pays: "tous", pourcent: -3, duree: 8 }] },

  { id: "p_arctique", annee: 2031, trimestre: 3, titre: "L'Arctique libre de glace en été",
    texte: P + "Pour la première fois, la banquise arctique disparaît presque entièrement en septembre ; la route maritime du Nord s'ouvre aux porte-conteneurs.",
    pays: ["RUS", "CAN", "NOR", "USA"], famille: "record_climatique", deviable: true, probabilite: 0.3, conditions: [],
    effets: [{ type: "croissance", pays: "RUS", points: 0.2, duree: 8 }, { type: "tension", valeur: 3 }] },

  { id: "p_pandemie", annee: 2031, trimestre: 1, titre: "Pandémie de grippe aviaire",
    texte: P + "Un virus de grippe aviaire devient transmissible entre humains ; confinements ciblés et course aux vaccins, avec un bilan moindre que le Covid-19.",
    pays: ["CHN", "USA", "IND"], famille: "pandemie", deviable: true, probabilite: 0.15, conditions: [],
    effets: [{ type: "croissance", pays: "tous", points: -1, duree: 4 }, { type: "stabilite", pays: "tous", valeur: -3 }] },

  { id: "p_guerre_eau", annee: 2032, trimestre: 2, titre: "Crise de l'eau sur les grands fleuves",
    texte: P + "Une sécheresse historique attise les conflits autour de l'Indus et du Nil ; barrages et quotas deviennent des armes diplomatiques.",
    pays: ["IND", "PAK", "EGY", "ETH"], famille: "conflit_frontalier", deviable: true, probabilite: 0.3, conditions: [],
    effets: [{ type: "tension", valeur: 4 }, { type: "stabilite", pays: ["PAK", "EGY", "ETH"], valeur: -5 }] },

  { id: "p_reforme_onu", annee: 2033, trimestre: 4, titre: "Réforme du Conseil de sécurité",
    texte: P + "Après des décennies de blocage, l'Assemblée générale adopte un élargissement du Conseil de sécurité à de nouveaux membres permanents sans droit de veto, dont l'Inde et le Brésil.",
    pays: ["IND", "BRA", "DEU", "JPN"], famille: "traite_majeur", deviable: true, probabilite: 0.15, conditions: [],
    effets: [{ type: "influence", pays: ["IND", "BRA"], camp: "OCC", canal: "p", valeur: 3 }, { type: "influence", pays: ["IND", "BRA"], camp: "CHN", canal: "p", valeur: 2 }, { type: "tension", valeur: -2 }] },

  { id: "p_crise_coree", annee: 2034, trimestre: 2, titre: "Crise de succession en Corée du Nord",
    texte: P + "Une crise au sommet du régime nord-coréen fait craindre l'effondrement ; Pékin, Séoul et Washington se surveillent le long de la frontière.",
    pays: ["PRK", "KOR", "CHN", "USA"], famille: "coup_etat", deviable: true, probabilite: 0.1, conditions: [],
    effets: [{ type: "tension", valeur: 8 }, { type: "stabilite", pays: "PRK", valeur: -20 }, { type: "croissance", pays: "KOR", points: -0.5, duree: 4 }] },
];
