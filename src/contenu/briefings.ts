// Briefings de l'ère 1 : 4 par camp. Effets affichés en fourchette ; effets réels tirés entre ×0,5 et ×1,5 ;
// effets cachés révélés à leur échéance. Personnes réelles non nommées : on parle de fonctions.
import type { Briefing } from "../moteur/types";

const J = "$joueur" as const, A = "$adversaire" as const;
const MONDE_ARABE = ["SAU", "EGY", "ARE", "QAT", "DZA", "IRQ"];

export const BRIEFINGS_ERE1: Briefing[] = [
  // ---------- Occident ----------
  { id: "b_o_apres_11_septembre", camp: "OCC", titre: "Après le 11 septembre", maxChoix: 2,
    dossier: "Le pays est sous le choc. Le Congrès est prêt à voter des pouvoirs étendus ; les alliés de l'OTAN ont invoqué l'article 5. Il faut définir la riposte et la doctrine pour les années qui viennent.",
    declencheur: { evenement: "h_11_septembre" },
    conseillers: [
      { role: "Secrétaire à la Défense", avis: "Frapper vite et fort, puis élargir aux États qui soutiennent le terrorisme." },
      { role: "Secrétaire d'État", avis: "Bâtir la plus large coalition possible, avec l'ONU." },
      { role: "Conseiller politique", avis: "L'opinion veut d'abord se sentir protégée chez elle." } ],
    options: [
      { libelle: "Riposte ciblée et coalition large", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["GBR", "FRA", "DEU", "CAN", "JPN"], camp: J, canal: "p", valeur: 4 }, { type: "tension", valeur: 2 }] },
      { libelle: "Doctrine de guerre préventive", cout: {}, effets: [{ type: "cp", camp: J, valeur: 8 }, { type: "tension", valeur: 5 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "influence", pays: ["FRA", "DEU"], camp: J, canal: "p", valeur: -6, delai: 5 }] }] },
      { libelle: "Sécurité intérieure renforcée", cout: { budget: 2 }, effets: [{ type: "stabilite", pays: "USA", valeur: 4 }, { type: "cp", camp: J, valeur: 3 }] },
      { libelle: "Main tendue au monde musulman", cout: { cp: 3 }, effets: [{ type: "influence", pays: MONDE_ARABE, camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: ["PAK", "IDN"], camp: J, canal: "c", valeur: 3 }] } ] },

  { id: "b_o_irak", camp: "OCC", titre: "La question irakienne", maxChoix: 1,
    dossier: "Le renseignement affirme que l'Irak poursuit des programmes d'armes de destruction massive ; les preuves restent discutées. Les inspecteurs de l'ONU demandent du temps. Paris et Berlin menacent de s'opposer à toute résolution autorisant la force.",
    declencheur: { annee: 2002, trimestre: 4 },
    conseillers: [
      { role: "Vice-président", avis: "Le risque est trop grand pour attendre une preuve définitive." },
      { role: "Secrétaire d'État", avis: "Sans mandat de l'ONU, nous perdrons nos alliés européens." },
      { role: "Directeur du renseignement", avis: "Nos sources sont fragiles ; je ne garantis pas les stocks." } ],
    options: [
      { libelle: "Préparer l'invasion avec une coalition", cout: { budget: 1 }, effets: [{ type: "tension", valeur: 5 }, { type: "cp", camp: J, valeur: 4 }],
        caches: [{ probabilite: 0.6, effets: [{ type: "cp", camp: J, valeur: -8, delai: 8 }] }] },
      { libelle: "Laisser travailler les inspecteurs", cout: { cp: 4 }, effets: [{ type: "drapeau", id: "irak_renonce" }, { type: "influence", pays: ["FRA", "DEU"], camp: J, canal: "p", valeur: 5 }, { type: "tension", valeur: -2 }] },
      { libelle: "Endiguement et sanctions renforcées", cout: { cp: 2 }, effets: [{ type: "drapeau", id: "irak_renonce" }, { type: "croissance", pays: "IRQ", points: -2, duree: 8 }, { type: "influence", pays: "IRQ", camp: A, canal: "p", valeur: 4 }] } ] },

  { id: "b_o_russie", camp: "OCC", titre: "Une Russie qui se raidit", maxChoix: 2,
    dossier: "Moscou dénonce l'élargissement de l'OTAN et menace de suspendre un traité de désarmement. La Pologne demande des garanties ; l'Allemagne dépend du gaz russe.",
    declencheur: { evenement: "h_munich" },
    conseillers: [
      { role: "Conseiller à la sécurité nationale", avis: "Rassurer nos alliés de l'Est, c'est dissuader Moscou." },
      { role: "Ambassadeur à Moscou", avis: "Une main tendue maintenant évitera une crise plus grave plus tard." },
      { role: "Secrétaire à l'Énergie", avis: "La vraie arme russe, c'est le gaz : diversifions." } ],
    options: [
      { libelle: "Bouclier antimissile en Pologne", cout: { budget: 2 }, effets: [{ type: "influence", pays: "POL", camp: J, canal: "m", valeur: 10 }, { type: "tension", valeur: 4 }, { type: "influence", pays: "RUS", camp: J, canal: "p", valeur: -6 }] },
      { libelle: "Relance du dialogue", cout: { cp: 2 }, effets: [{ type: "tension", valeur: -3 }, { type: "influence", pays: "RUS", camp: J, canal: "p", valeur: 6 }, { type: "influence", pays: "POL", camp: J, canal: "p", valeur: -3 }] },
      { libelle: "Diversification énergétique de l'Europe", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["DEU", "ITA", "POL"], camp: J, canal: "e", valeur: 4 }, { type: "influence", pays: "RUS", camp: J, canal: "e", valeur: -4 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: "QAT", camp: J, canal: "e", valeur: 5, delai: 4 }] }] } ] },

  { id: "b_o_krach", camp: "OCC", titre: "Le système financier s'effondre", maxChoix: 2,
    dossier: "Après la faillite d'une grande banque d'affaires, le crédit interbancaire est gelé. Les marchés attendent un plan dans les jours qui viennent ; l'opinion refuse de payer pour Wall Street.",
    declencheur: { evenement: "h_lehman" },
    conseillers: [
      { role: "Secrétaire au Trésor", avis: "Sans sauvetage, c'est la Grande Dépression." },
      { role: "Président de la banque centrale", avis: "Nous pouvons inonder les marchés de liquidités, y compris à l'étranger." },
      { role: "Chef de la majorité au Congrès", avis: "Nos électeurs ne voteront pas un chèque en blanc aux banques." } ],
    options: [
      { libelle: "Sauvetage bancaire massif", cout: { budget: 3 }, effets: [{ type: "stabilite", pays: "USA", valeur: 6 }, { type: "cp", camp: J, valeur: -5 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "cp", camp: J, valeur: -6, delai: 4 }] }] },
      { libelle: "Relance budgétaire", cout: { budget: 2 }, effets: [{ type: "croissance", pays: "USA", points: 1, duree: 4 }] },
      { libelle: "Coordination au G20", cout: { cp: 1 }, effets: [{ type: "influence", pays: ["GBR", "FRA", "DEU", "JPN", "BRA", "IND"], camp: J, canal: "p", valeur: 3 }, { type: "influence", pays: "tous", camp: A, canal: "p", valeur: 1 }] },
      { libelle: "Laisser faire le marché", cout: {}, effets: [{ type: "cp", camp: J, valeur: 3 }],
        caches: [{ probabilite: 0.7, effets: [{ type: "croissance", pays: "USA", points: -2, duree: 4, delai: 1 }, { type: "stabilite", pays: "USA", valeur: -6, delai: 2 }] }] } ] },

  // ---------- Chine ----------
  { id: "b_c_omc", camp: "CHN", titre: "Les conditions de l'entrée à l'OMC", maxChoix: 1,
    dossier: "L'adhésion à l'OMC est à portée de main. Les négociateurs étrangers exigent l'ouverture des services et la réforme des entreprises d'État, au prix de millions d'emplois.",
    declencheur: { annee: 2001, trimestre: 3 },
    conseillers: [
      { role: "Premier ministre", avis: "La concurrence forcera nos entreprises d'État à se réformer." },
      { role: "Ministre du Commerce", avis: "Ouvrons, mais par étapes, secteur par secteur." },
      { role: "Secrétaire du Parti d'une province industrielle", avis: "Les licenciements massifs menacent la stabilité sociale." } ],
    options: [
      { libelle: "Ouverture rapide", cout: {}, effets: [{ type: "influence", pays: "tous", camp: J, canal: "e", valeur: 5 }, { type: "stabilite", pays: "CHN", valeur: -4 }] },
      { libelle: "Ouverture graduelle", cout: { cp: 1 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "e", valeur: 3 }] },
      { libelle: "Protéger les entreprises d'État", cout: {}, effets: [{ type: "stabilite", pays: "CHN", valeur: 3 }, { type: "influence", pays: "tous", camp: J, canal: "e", valeur: 1 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "cp", camp: J, valeur: -4, delai: 8 }] }] } ] },

  { id: "b_c_sras", camp: "CHN", titre: "Une pneumonie inconnue", maxChoix: 2,
    dossier: "Une pneumonie atypique se propage dans le sud du pays et à Hong Kong. L'OMS réclame des informations ; les autorités locales minimisent les chiffres.",
    declencheur: { evenement: "h_sras" },
    conseillers: [
      { role: "Ministre de la Santé", avis: "Les chiffres réels sont plus élevés ; il faut le dire." },
      { role: "Responsable de la propagande", avis: "La panique ferait plus de dégâts que le virus." },
      { role: "Maire de Pékin", avis: "Mobilisons tout l'appareil d'État : hôpitaux, quarantaines, contrôles." } ],
    options: [
      { libelle: "Transparence totale avec l'OMS", cout: { cp: 3 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 3 }] },
      { libelle: "Contrôle de l'information", cout: {}, effets: [{ type: "cp", camp: J, valeur: 2 }],
        caches: [{ probabilite: 0.6, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: -5, delai: 2 }] }] },
      { libelle: "Mobilisation sanitaire massive", cout: { budget: 2 }, effets: [{ type: "stabilite", pays: "CHN", valeur: 3 }, { type: "cp", camp: J, valeur: 2 }] } ] },

  { id: "b_c_taiwan", camp: "CHN", titre: "Le détroit de Taïwan", maxChoix: 2,
    dossier: "Les indépendantistes progressent à Taipei. Le Parti veut fixer une ligne rouge sans provoquer Washington, qui reste engagé auprès de l'île.",
    declencheur: { annee: 2005, trimestre: 1 },
    conseillers: [
      { role: "Président de l'Assemblée nationale populaire", avis: "Une loi doit dire clairement que la sécession entraînera la force." },
      { role: "Ministre du Commerce", avis: "Les liens économiques rapprochent l'île plus sûrement que les menaces." },
      { role: "Chef d'état-major", avis: "Une démonstration de force rappellera les réalités militaires." } ],
    options: [
      { libelle: "Loi anti-sécession", cout: {}, effets: [{ type: "cp", camp: J, valeur: 5 }, { type: "tension", valeur: 4 }, { type: "influence", pays: "TWN", camp: J, canal: "p", valeur: -4 }] },
      { libelle: "Offensive de charme économique", cout: { budget: 1 }, effets: [{ type: "influence", pays: "TWN", camp: J, canal: "e", valeur: 8 }, { type: "tension", valeur: -1 }] },
      { libelle: "Manœuvres militaires dans le détroit", cout: { budget: 1 }, effets: [{ type: "tension", valeur: 8 }, { type: "cp", camp: J, valeur: 3 }],
        caches: [{ probabilite: 0.6, effets: [{ type: "influence", pays: ["JPN", "TWN", "KOR"], camp: A, canal: "m", valeur: 6, delai: 1 }] }] } ] },

  { id: "b_c_relance", camp: "CHN", titre: "La crise venue d'Occident", maxChoix: 2,
    dossier: "La crise financière américaine fait chuter les exportations ; des usines ferment dans le delta de la rivière des Perles. Le Conseil des affaires de l'État prépare une riposte.",
    declencheur: { evenement: "h_lehman" },
    conseillers: [
      { role: "Premier ministre", avis: "Un plan de 4 000 milliards de yuans maintiendra la croissance." },
      { role: "Gouverneur de la banque centrale", avis: "Trop de crédit nourrira une bulle immobilière." },
      { role: "Ministre des Affaires étrangères", avis: "C'est le moment de prêter aux pays émergents abandonnés par l'Occident." } ],
    options: [
      { libelle: "Relance massive", cout: { budget: 2 }, effets: [{ type: "croissance", pays: "CHN", points: 1.5, duree: 8 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "croissance", pays: "CHN", points: -1, duree: 8, delai: 12 }] }] },
      { libelle: "Prudence monétaire", cout: {}, effets: [{ type: "cp", camp: J, valeur: -4 }, { type: "stabilite", pays: "CHN", valeur: -2 }] },
      { libelle: "Prêts aux émergents", cout: { budget: 3 }, effets: [{ type: "influence", pays: ["BRA", "ARG", "VEN", "NGA", "KAZ", "PAK"], camp: J, canal: "e", valeur: 5 }] } ] },
];
