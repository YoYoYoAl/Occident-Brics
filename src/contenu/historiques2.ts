// Événements historiques de l'ère 2 (2009-2025). Textes : faits réels, sobres.
// Les décisions propres aux deux leaders (guerre commerciale, routes de la soie, relance…) sont des briefings, pas des événements.
// Effets : choix de réglage (jeu). Jusqu'en 2022, la croissance réelle est déjà dans la trajectoire de référence :
// pas d'effet de croissance ici, sauf après 2022 (trajectoire projetée).
import type { EvenementHistorique } from "../moteur/types";

const UE = ["DEU", "FRA", "ITA", "ESP", "NLD", "BEL", "POL", "SWE", "AUT"];
const MONDE_ARABE = ["SAU", "EGY", "ARE", "QAT", "DZA", "IRQ", "JOR", "MAR"];
const PRINTEMPS = ["TUN", "EGY", "LBY", "SYR", "YEM", "BHR"];

export const HISTORIQUES_ERE2: EvenementHistorique[] = [
  { id: "h_relance_russie", annee: 2009, trimestre: 1, titre: "Relance des relations russo-américaines",
    texte: "En mars 2009 à Genève, les diplomaties américaine et russe affichent la volonté de « relancer » leurs relations ; le traité New START suit en 2010.",
    pays: ["USA", "RUS"], famille: "sommet_reconciliation", deviable: true, conditions: [{ type: "alignement", pays: "RUS", min: -0.5 }],
    effets: [{ type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: 5 }, { type: "tension", valeur: -3 }] },

  { id: "h_bric_sommet", annee: 2009, trimestre: 2, titre: "Premier sommet des BRIC à Iekaterinbourg",
    texte: "Le 16 juin 2009, le Brésil, la Russie, l'Inde et la Chine tiennent leur premier sommet et réclament une réforme du système financier international.",
    pays: ["BRA", "RUS", "IND", "CHN"], famille: "sommet_reconciliation", deviable: true,
    conditions: [{ type: "alignement", pays: "BRA", max: 0.45 }, { type: "alignement", pays: "IND", max: 0.45 }],
    effets: [{ type: "influence", pays: ["BRA", "RUS", "IND"], camp: "CHN", canal: "p", valeur: 4 }, { type: "cp", camp: "CHN", valeur: 3 }] },

  { id: "h_crise_grecque", annee: 2010, trimestre: 2, titre: "Crise de la dette grecque",
    texte: "En mai 2010, la Grèce reçoit un premier plan de sauvetage de 110 milliards d'euros de l'Union européenne et du FMI, contre une austérité sévère.",
    pays: ["GRC"], famille: "defaut_souverain", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "GRC", valeur: -10 }, { type: "cp", camp: "OCC", valeur: -2 }, { type: "influence", pays: "GRC", camp: "CHN", canal: "e", valeur: 4 }] },

  { id: "h_printemps_arabe", annee: 2011, trimestre: 1, titre: "Printemps arabe",
    texte: "Parti de Tunisie en décembre 2010, le soulèvement emporte Ben Ali le 14 janvier puis Moubarak le 11 février 2011. La contestation gagne la Libye, la Syrie, le Yémen et Bahreïn.",
    pays: PRINTEMPS, famille: "revolution", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: ["TUN", "EGY"], valeur: -15 }, { type: "stabilite", pays: ["LBY", "SYR", "YEM", "BHR"], valeur: -8 },
             { type: "influence", pays: ["EGY", "TUN"], camp: "OCC", canal: "p", valeur: -3 }, { type: "tension", valeur: 2 }] },

  { id: "h_fukushima", annee: 2011, trimestre: 1, titre: "Séisme et accident nucléaire de Fukushima",
    texte: "Le 11 mars 2011, un séisme de magnitude 9 et un tsunami frappent le Tōhoku : plus de 18 000 morts et la fusion de trois réacteurs à Fukushima Daiichi.",
    pays: ["JPN"], famille: "seisme", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "JPN", valeur: -5 }, { type: "co2", pays: ["JPN", "DEU"], pourcent: 4, duree: 24 }] },

  { id: "h_intervention_libye", annee: 2011, trimestre: 1, titre: "Intervention en Libye",
    texte: "Le 17 mars 2011, la résolution 1973 autorise la protection des civils ; la coalition puis l'OTAN frappent les forces de Kadhafi, tué en octobre. Moscou et Pékin s'estiment trompés.",
    pays: ["LBY", "FRA", "GBR", "USA"], conflit: { pays: ["LBY"], duree: 8 }, famille: "guerre_civile", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "LBY", valeur: -20 }, { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -4 }, { type: "tension", valeur: 3 }] },

  { id: "h_syrie", annee: 2011, trimestre: 2, titre: "Guerre civile en Syrie",
    texte: "La répression des manifestations de mars 2011 bascule en guerre civile ; elle fera plus de 500 000 morts et des millions de réfugiés.",
    pays: ["SYR"], conflit: { pays: ["SYR"], duree: 54 }, famille: "guerre_civile", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "SYR", valeur: -25 }, { type: "stabilite", pays: ["TUR", "JOR", "LBN"], valeur: -3 }, { type: "tension", valeur: 2 }] },

  { id: "h_ben_laden", annee: 2011, trimestre: 2, titre: "Mort de Ben Laden à Abbottabad",
    texte: "Le 2 mai 2011, un commando américain tue Oussama ben Laden au Pakistan, sans en avoir prévenu Islamabad.",
    pays: ["USA", "PAK"], famille: "attentat", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: 6 }, { type: "influence", pays: "PAK", camp: "OCC", canal: "p", valeur: -5 }, { type: "influence", pays: "PAK", camp: "CHN", canal: "p", valeur: 3 }] },

  { id: "h_snowden", annee: 2013, trimestre: 2, titre: "Révélations d'Edward Snowden",
    texte: "En juin 2013, un ancien sous-traitant de la NSA révèle l'ampleur de la surveillance mondiale, jusqu'aux téléphones de dirigeants alliés.",
    pays: ["USA", "DEU", "BRA"], famille: "cyberattaque", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: ["DEU", "BRA", "FRA", "MEX"], camp: "OCC", canal: "p", valeur: -4 }, { type: "cp", camp: "OCC", valeur: -3 }] },

  { id: "h_euromaidan", annee: 2014, trimestre: 1, titre: "Révolution de Maïdan",
    texte: "Après trois mois de manifestations à Kiev et une centaine de morts, le président ukrainien fuit le 22 février 2014. Le nouveau pouvoir se tourne vers l'Union européenne.",
    pays: ["UKR"], famille: "revolution", deviable: true, conditions: [{ type: "alignement", pays: "UKR", min: -0.1 }],
    effets: [{ type: "influence", pays: "UKR", camp: "OCC", canal: "p", valeur: 10 }, { type: "stabilite", pays: "UKR", valeur: -15 }, { type: "tension", valeur: 3 }] },

  { id: "h_crimee", annee: 2014, trimestre: 1, titre: "Annexion de la Crimée et guerre du Donbass",
    texte: "En mars 2014, la Russie annexe la Crimée après un référendum non reconnu ; une guerre éclate dans le Donbass. L'Occident impose des sanctions.",
    pays: ["RUS", "UKR"], conflit: { pays: ["UKR"], duree: 32 }, famille: "guerre_interetatique", deviable: true,
    conditions: [{ type: "evenement", id: "h_euromaidan", fait: true }],
    effets: [{ type: "tension", valeur: 8 }, { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -10 }, { type: "influence", pays: "RUS", camp: "CHN", canal: "e", valeur: 5 },
             { type: "influence", pays: ["POL", "LTU", "LVA", "EST"], camp: "OCC", canal: "m", valeur: 5 }] },

  { id: "h_etat_islamique", annee: 2014, trimestre: 2, titre: "L'État islamique prend Mossoul",
    texte: "En juin 2014, l'organisation État islamique s'empare de Mossoul et proclame un « califat » à cheval sur l'Irak et la Syrie. Une coalition le combat jusqu'en 2019.",
    pays: ["IRQ", "SYR"], conflit: { pays: ["IRQ"], duree: 14 }, famille: "guerre_civile", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "IRQ", valeur: -15 }, { type: "tension", valeur: 3 }, { type: "influence", pays: "IRQ", camp: "OCC", canal: "m", valeur: 5 }] },

  { id: "h_ndb", annee: 2014, trimestre: 3, titre: "Les BRICS créent leur banque",
    texte: "Au sommet de Fortaleza, en juillet 2014, les BRICS fondent la Nouvelle banque de développement et un fonds de réserve commun.",
    pays: ["BRA", "RUS", "IND", "CHN", "ZAF"], famille: "accord_commercial", deviable: true, conditions: [{ type: "evenement", id: "h_bric_sommet", fait: true }],
    effets: [{ type: "influence", pays: ["BRA", "RUS", "IND", "ZAF"], camp: "CHN", canal: "e", valeur: 5 }, { type: "cp", camp: "CHN", valeur: 2 }] },

  { id: "h_afrique_sud_brics", annee: 2011, trimestre: 2, titre: "L'Afrique du Sud rejoint les BRICS",
    texte: "Au sommet de Sanya, le 14 avril 2011, l'Afrique du Sud siège pour la première fois : les BRIC deviennent les BRICS.",
    pays: ["ZAF"], famille: "adhesion_alliance", deviable: true, conditions: [{ type: "alignement", pays: "ZAF", max: 0.4 }, { type: "evenement", id: "h_bric_sommet", fait: true }],
    effets: [{ type: "influence", pays: "ZAF", camp: "CHN", canal: "p", valeur: 8 }, { type: "influence", pays: ["NGA", "KEN", "ETH"], camp: "CHN", canal: "p", valeur: 2 }] },

  { id: "h_jcpoa", annee: 2015, trimestre: 3, titre: "Accord sur le nucléaire iranien",
    texte: "Le 14 juillet 2015 à Vienne, l'Iran et les grandes puissances concluent le plan d'action global commun : levée des sanctions contre le contrôle du programme nucléaire.",
    pays: ["IRN", "USA"], famille: "traite_majeur", deviable: true, conditions: [{ type: "cran", max: 3 }],
    effets: [{ type: "tension", valeur: -4 }, { type: "influence", pays: "IRN", camp: "OCC", canal: "e", valeur: 4 }, { type: "influence", pays: "IRN", camp: "OCC", canal: "p", valeur: 3 }] },

  { id: "h_russie_syrie", annee: 2015, trimestre: 3, titre: "Intervention russe en Syrie",
    texte: "Le 30 septembre 2015, l'aviation russe commence à frapper en Syrie et sauve le régime de Damas.",
    pays: ["RUS", "SYR"], famille: "guerre_interetatique", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 3 }, { type: "influence", pays: "SYR", camp: "OCC", canal: "p", valeur: -5 }, { type: "influence", pays: "SYR", camp: "CHN", canal: "m", valeur: 4 }] },

  { id: "h_accord_paris", annee: 2015, trimestre: 4, titre: "Accord de Paris sur le climat",
    texte: "Le 12 décembre 2015, 195 délégations s'engagent à contenir le réchauffement nettement sous 2 °C.",
    pays: ["FRA"], famille: "traite_majeur", deviable: false, conditions: [],
    effets: [{ type: "co2", pays: "tous", pourcent: -2, duree: 40 }, { type: "tension", valeur: -2 }, { type: "influence", pays: "FRA", camp: "OCC", canal: "c", valeur: 3 }] },

  { id: "h_brexit", annee: 2016, trimestre: 2, titre: "Les Britanniques votent le Brexit",
    texte: "Le 23 juin 2016, 51,9 % des votants choisissent de quitter l'Union européenne ; la sortie est effective le 31 janvier 2020.",
    pays: ["GBR"], famille: "sortie_organisation", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "GBR", valeur: -8 }, { type: "cp", camp: "OCC", valeur: -3 }, { type: "influence", pays: UE, camp: "OCC", canal: "p", valeur: -1 }] },

  { id: "h_arbitrage_mcs", annee: 2016, trimestre: 3, titre: "Arbitrage sur la mer de Chine méridionale",
    texte: "Le 12 juillet 2016, la Cour permanente d'arbitrage donne raison aux Philippines : les revendications chinoises n'ont pas de base légale. Pékin rejette la sentence.",
    pays: ["PHL", "CHN"], famille: "incident_militaire", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 3 }, { type: "influence", pays: ["PHL", "VNM"], camp: "OCC", canal: "p", valeur: 3 }, { type: "cp", camp: "CHN", valeur: -2 }] },

  { id: "h_hong_kong", annee: 2019, trimestre: 2, titre: "Manifestations à Hong Kong",
    texte: "À partir de juin 2019, des centaines de milliers de Hongkongais manifestent contre un projet de loi d'extradition ; une loi sur la sécurité nationale suit en 2020.",
    pays: ["CHN"], famille: "manifestations", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "CHN", valeur: -3 }, { type: "cp", camp: "CHN", valeur: -3 }, { type: "influence", pays: ["GBR", "CAN", "AUS"], camp: "CHN", canal: "p", valeur: -3 }] },

  { id: "h_covid", annee: 2020, trimestre: 1, titre: "Pandémie de Covid-19",
    texte: "Apparu à Wuhan fin 2019, le coronavirus est déclaré pandémie le 11 mars 2020. Confinements, frontières fermées : la plus forte récession mondiale depuis 1945.",
    pays: ["CHN", "ITA", "USA"], famille: "pandemie", deviable: false, conditions: [],
    effets: [{ type: "stabilite", pays: "tous", valeur: -4 }, { type: "cp", camp: "OCC", valeur: -4 }, { type: "cp", camp: "CHN", valeur: -4 }, { type: "tension", valeur: 3 },
             { type: "co2", pays: "tous", pourcent: -6, duree: 4 }] },

  { id: "h_kaboul", annee: 2021, trimestre: 3, titre: "Chute de Kaboul",
    texte: "Le 15 août 2021, les talibans entrent dans Kaboul ; le retrait américain s'achève le 30 août dans le chaos de l'aéroport.",
    pays: ["USA", "PAK"], famille: "revolution", deviable: false, conditions: [],
    effets: [{ type: "cp", camp: "OCC", valeur: -6 }, { type: "influence", pays: "PAK", camp: "CHN", canal: "p", valeur: 3 }, { type: "influence", pays: ["GBR", "DEU"], camp: "OCC", canal: "p", valeur: -2 }] },

  { id: "h_ia_generative", annee: 2022, trimestre: 4, titre: "L'IA générative grand public",
    texte: "Fin novembre 2022, un agent conversationnel américain atteint 100 millions d'utilisateurs en deux mois. La course à l'intelligence artificielle s'emballe.",
    pays: ["USA"], famille: "percee_technologique", deviable: false, conditions: [],
    effets: [{ type: "influence", pays: "tous", camp: "OCC", canal: "c", valeur: 2 }, { type: "cp", camp: "OCC", valeur: 2 }] },

  { id: "h_ukraine", annee: 2022, trimestre: 1, titre: "Invasion de l'Ukraine",
    texte: "Le 24 février 2022, la Russie lance une invasion de l'Ukraine. Kiev résiste ; sanctions massives, flambée de l'énergie, la Finlande et la Suède rejoignent l'OTAN.",
    pays: ["RUS", "UKR"], conflit: { pays: ["UKR"], duree: 16 }, famille: "guerre_interetatique", deviable: true,
    conditions: [{ type: "alignement", pays: "RUS", max: 0 }],
    effets: [{ type: "tension", valeur: 12 }, { type: "influence", pays: "RUS", camp: "OCC", canal: "p", valeur: -15 }, { type: "influence", pays: "RUS", camp: "CHN", canal: "e", valeur: 8 },
             { type: "influence", pays: "UKR", camp: "OCC", canal: "m", valeur: 15 }, { type: "influence", pays: ["POL", "FIN", "SWE", "LTU", "LVA", "EST"], camp: "OCC", canal: "m", valeur: 8 },
             { type: "stabilite", pays: "UKR", valeur: -25 }] },

  { id: "h_brics_elargis", annee: 2023, trimestre: 3, titre: "Les BRICS s'élargissent",
    texte: "Au sommet de Johannesburg, en août 2023, les BRICS invitent de nouveaux membres ; l'Égypte, l'Éthiopie, l'Iran et les Émirats arabes unis les rejoignent le 1er janvier 2024.",
    pays: ["EGY", "ETH", "IRN", "ARE"], famille: "adhesion_alliance", deviable: true, conditions: [{ type: "evenement", id: "h_afrique_sud_brics", fait: true }],
    effets: [{ type: "influence", pays: ["EGY", "ETH", "IRN", "ARE"], camp: "CHN", canal: "p", valeur: 7 }, { type: "cp", camp: "CHN", valeur: 3 }] },

  { id: "h_7_octobre", annee: 2023, trimestre: 4, titre: "Attaque du Hamas et guerre à Gaza",
    texte: "Le 7 octobre 2023, le Hamas tue près de 1 200 personnes en Israël ; la riposte israélienne ravage la bande de Gaza.",
    pays: ["ISR"], conflit: { pays: ["ISR"], duree: 8 }, famille: "attentat", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 5 }, { type: "influence", pays: MONDE_ARABE, camp: "OCC", canal: "p", valeur: -4 }, { type: "stabilite", pays: ["ISR", "LBN", "JOR"], valeur: -5 }] },

  { id: "h_mer_rouge", annee: 2024, trimestre: 1, titre: "Attaques en mer Rouge",
    texte: "Depuis novembre 2023, les Houthis du Yémen attaquent les navires marchands ; le trafic du canal de Suez s'effondre et les armateurs contournent l'Afrique.",
    pays: ["YEM", "EGY"], famille: "blocage_detroit", deviable: false, conditions: [],
    effets: [{ type: "tension", valeur: 3 }, { type: "croissance", pays: "EGY", points: -0.8, duree: 4 }, { type: "croissance", pays: UE, points: -0.1, duree: 4 }] },

  { id: "h_chute_assad", annee: 2024, trimestre: 4, titre: "Chute du régime syrien",
    texte: "Le 8 décembre 2024, une offensive rebelle éclair prend Damas ; le président syrien fuit à Moscou après 24 ans au pouvoir.",
    pays: ["SYR"], famille: "revolution", deviable: true, conditions: [{ type: "evenement", id: "h_syrie", fait: true }],
    effets: [{ type: "influence", pays: "SYR", camp: "CHN", canal: "m", valeur: -6 }, { type: "influence", pays: "SYR", camp: "OCC", canal: "p", valeur: 3 }, { type: "stabilite", pays: "SYR", valeur: 5 }] },
];
