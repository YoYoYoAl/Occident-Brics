// Cartes de décision de l'ère 1 (tranche verticale) : 15 Occident, 15 Chine, 6 neutres.
// Chaque carte force un arbitrage : modes aux coûts différents, effets en fourchette, effets cachés.
import type { Carte } from "../moteur/types";

const J = "$joueur" as const, A = "$adversaire" as const, P = "$pays" as const;
const AFRIQUE = ["NGA", "ETH", "KEN", "ZAF", "DZA", "COD", "EGY"];
const PETROLIERS = ["SAU", "IRN", "IRQ", "ARE", "QAT", "NGA", "VEN", "KAZ", "DZA", "RUS"];

export const CARTES_ERE1: Carte[] = [
  // ---------- Occident ----------
  { id: "o_aide_dev", camp: "OCC", ere: 1, titre: "Aide au développement", texte: "Programmes d'aide bilatérale et dons ciblés.", valeur: 2, type: "reutilisable",
    modes: [
      { nom: "Aide ciblée", cout: { budget: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 6 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }],
        caches: [{ probabilite: 0.25, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -3, delai: 3 }] }] },
      { nom: "Plan massif", cout: { budget: 4, cp: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 10 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 6 }, { type: "croissance", pays: P, points: 0.5, duree: 4 }],
        caches: [{ probabilite: 0.3, effets: [{ type: "stabilite", pays: P, valeur: -3, delai: 4 }] }] } ] },
  { id: "o_coalition", camp: "OCC", ere: 1, titre: "Coalition des volontaires", texte: "Rassembler des alliés autour d'une opération, avec ou sans l'ONU.", valeur: 3, type: "unique",
    modes: [
      { nom: "Coalition diplomatique", cout: { cp: 3 }, effets: [{ type: "influence", pays: ["GBR", "AUS", "POL", "JPN", "ESP", "ITA"], camp: J, canal: "p", valeur: 5 }, { type: "tension", valeur: 2 }], conditions: [{ type: "cran", min: 2 }] },
      { nom: "Coalition militaire", cout: { cp: 5, budget: 2 }, effets: [{ type: "influence", pays: ["GBR", "AUS", "POL", "JPN", "ESP", "ITA"], camp: J, canal: "m", valeur: 8 }, { type: "tension", valeur: 4 }], conditions: [{ type: "cran", min: 2 }],
        caches: [{ probabilite: 0.35, effets: [{ type: "influence", pays: ["FRA", "DEU"], camp: J, canal: "p", valeur: -5, delai: 2 }] }] } ] },
  { id: "o_sanctions", camp: "OCC", ere: 1, titre: "Sanctions financières", texte: "Couper un pays du système financier en dollars.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Sanctions ciblées", cout: { cp: 2 }, cible: "pays", effets: [{ type: "croissance", pays: P, points: -0.5, duree: 8 }, { type: "influence", pays: P, camp: A, canal: "p", valeur: -3 }] },
      { nom: "Embargo total", cout: { cp: 4, budget: 1 }, cible: "pays", effets: [{ type: "croissance", pays: P, points: -2, duree: 8 }, { type: "stabilite", pays: P, valeur: -5 }, { type: "tension", valeur: 3 }],
        caches: [{ probabilite: 0.35, effets: [{ type: "influence", pays: P, camp: A, canal: "e", valeur: 8, delai: 2 }] }] } ] },
  { id: "o_revolution_couleur", camp: "OCC", ere: 1, titre: "Soutien à la société civile", texte: "Financer ONG, médias indépendants et observateurs électoraux.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Soutien discret", cout: { budget: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }] },
      { nom: "Soutien massif", cout: { budget: 2, cp: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: 8 }, { type: "stabilite", pays: P, valeur: -4 }],
        caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -10, delai: 1 }, { type: "tension", valeur: 2, delai: 1 }] }] } ] },
  { id: "o_otan", camp: "OCC", ere: 1, titre: "Élargissement de l'alliance", texte: "Inviter un pays proche à rejoindre l'alliance militaire.", valeur: 4, type: "unique",
    modes: [
      { nom: "Adhésion", cout: { cp: 4 }, cible: "pays", conditions: [{ type: "alignement", pays: "$pays", min: 0.4 }], effets: [{ type: "influence", pays: P, camp: J, canal: "m", valeur: 20 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 8 }, { type: "tension", valeur: 4 }, { type: "influence", pays: "RUS", camp: J, canal: "p", valeur: -6 }] },
      { nom: "Partenariat pour la paix", cout: { cp: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "m", valeur: 6 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }] } ] },
  { id: "o_libre_echange", camp: "OCC", ere: 1, titre: "Accord de libre-échange", texte: "Ouvrir les marchés réciproquement.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Négocier", cout: { budget: 1, cp: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 8 }, { type: "croissance", pays: P, points: 0.3, duree: 8 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "cp", camp: J, valeur: -3, delai: 2 }] }] }] },
  { id: "o_soft_power", camp: "OCC", ere: 1, titre: "Hollywood et universités", texte: "Bourses, films, séries et réseaux d'anciens élèves.", valeur: 1, type: "reutilisable",
    modes: [
      { nom: "Un pays", cout: {}, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: 6 }] },
      { nom: "Le monde", cout: { budget: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 2 }] } ] },
  { id: "o_base", camp: "OCC", ere: 1, titre: "Base militaire avancée", texte: "Installer une base permanente chez un partenaire.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Installer", cout: { budget: 2 }, cible: "pays", conditions: [{ type: "alignement", pays: "$pays", min: 0.3 }], effets: [{ type: "influence", pays: P, camp: J, canal: "m", valeur: 15 }, { type: "tension", valeur: 2 }],
      caches: [{ probabilite: 0.25, effets: [{ type: "stabilite", pays: P, valeur: -3, delai: 3 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: -4, delai: 3 }] }] }] },
  { id: "o_guerre_terreur", camp: "OCC", ere: 1, titre: "Guerre contre la terreur", texte: "Mobiliser le pays et les alliés contre le terrorisme.", valeur: 3, type: "unique",
    modes: [
      { nom: "Coopération antiterroriste", cout: { budget: 1 }, conditions: [{ type: "evenement", id: "h_11_septembre", fait: true }], effets: [{ type: "influence", pays: ["PAK", "SAU", "EGY"], camp: J, canal: "m", valeur: 6 }, { type: "cp", camp: J, valeur: 4 }] },
      { nom: "Lois d'exception", cout: {}, conditions: [{ type: "evenement", id: "h_11_septembre", fait: true }], effets: [{ type: "cp", camp: J, valeur: 8 }, { type: "influence", pays: "tous", camp: J, canal: "c", valeur: -2 }] } ] },
  { id: "o_swap", camp: "OCC", ere: 1, titre: "Lignes de swap en dollars", texte: "La banque centrale prête des dollars à un pays en difficulté.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Stabiliser", cout: { cp: 1 }, cible: "pays", effets: [{ type: "stabilite", pays: P, valeur: 4 }, { type: "influence", pays: P, camp: J, canal: "e", valeur: 4 }] }] },
  { id: "o_democratie", camp: "OCC", ere: 1, titre: "Promotion de la démocratie", texte: "Conditionner l'aide à des réformes politiques.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Conditionner", cout: { budget: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -6, delai: 2 }, { type: "influence", pays: P, camp: A, canal: "p", valeur: 4, delai: 2 }] }] }] },
  { id: "o_inde", camp: "OCC", ere: 1, titre: "Partenariat stratégique avec l'Inde", texte: "Coopération nucléaire civile et militaire avec New Delhi.", valeur: 3, type: "unique",
    modes: [{ nom: "Signer", cout: { cp: 3, budget: 1 }, effets: [{ type: "influence", pays: "IND", camp: J, canal: "p", valeur: 10 }, { type: "influence", pays: "IND", camp: J, canal: "m", valeur: 5 }],
      caches: [{ probabilite: 0.5, effets: [{ type: "influence", pays: "PAK", camp: J, canal: "p", valeur: -6, delai: 1 }] }] }] },
  { id: "o_g8", camp: "OCC", ere: 1, titre: "Sommet du G8", texte: "Les grandes démocraties industrielles affichent leur unité.", valeur: 1, type: "reutilisable",
    modes: [{ nom: "Réunir", cout: {}, effets: [{ type: "cp", camp: J, valeur: 3 }, { type: "influence", pays: ["GBR", "FRA", "DEU", "ITA", "JPN", "CAN", "RUS"], camp: J, canal: "p", valeur: 2 }] }] },
  { id: "o_fmi", camp: "OCC", ere: 1, titre: "Programme du FMI", texte: "Prêt d'urgence contre réformes et austérité.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Prêter", cout: { cp: 1 }, cible: "pays", effets: [{ type: "stabilite", pays: P, valeur: 5 }, { type: "influence", pays: P, camp: J, canal: "e", valeur: 5 }],
      caches: [{ probabilite: 0.4, effets: [{ type: "stabilite", pays: P, valeur: -6, delai: 4 }, { type: "influence", pays: P, camp: J, canal: "c", valeur: -4, delai: 4 }] }] }] },
  { id: "o_energie", camp: "OCC", ere: 1, titre: "Diplomatie énergétique", texte: "Sécuriser l'accès au pétrole et au gaz.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Négocier", cout: { budget: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 5 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 5 }],
      caches: [{ probabilite: 0.25, effets: [{ type: "tension", valeur: 2, delai: 1 }] }] }] },

  // ---------- Chine ----------
  { id: "c_prets", camp: "CHN", ere: 1, titre: "Prêts sans conditions", texte: "Financer sans exiger de réformes politiques.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Prêter", cout: { budget: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 8 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "stabilite", pays: P, valeur: -4, delai: 8 }, { type: "influence", pays: P, camp: J, canal: "c", valeur: -3, delai: 8 }] }] }] },
  { id: "c_infrastructures", camp: "CHN", ere: 1, titre: "Infrastructures clés en main", texte: "Routes, ports et barrages construits par des entreprises chinoises.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Un grand projet", cout: { budget: 3 }, cible: "pays", effets: [{ type: "croissance", pays: P, points: 0.6, duree: 8 }, { type: "influence", pays: P, camp: J, canal: "e", valeur: 10 }],
        caches: [{ probabilite: 0.35, effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: -4, delai: 4 }] }] },
      { nom: "Projet modeste", cout: { budget: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 4 }] } ] },
  { id: "c_atelier", camp: "CHN", ere: 1, titre: "L'atelier du monde", texte: "Attirer les usines du monde entier par des coûts imbattables.", valeur: 2, type: "unique",
    modes: [{ nom: "Ouvrir les zones économiques", cout: {}, effets: [{ type: "influence", pays: "tous", camp: J, canal: "e", valeur: 1 }, { type: "cp", camp: J, valeur: 3 }],
      caches: [{ probabilite: 0.6, effets: [{ type: "co2", pays: "CHN", pourcent: 2, duree: 8 }] }] }] },
  { id: "c_confucius", camp: "CHN", ere: 1, titre: "Instituts Confucius", texte: "Enseignement de la langue et de la culture chinoises.", valeur: 1, type: "reutilisable",
    modes: [
      { nom: "Un pays", cout: {}, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: 5 }] },
      { nom: "Réseau mondial", cout: { budget: 1 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 1 }] } ] },
  { id: "c_ressources", camp: "CHN", ere: 1, titre: "Achat de ressources", texte: "Prendre des parts dans des mines et des champs pétroliers.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Investir", cout: { budget: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 8 }],
      caches: [{ probabilite: 0.2, effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: -8, delai: 6 }] }] }] },
  { id: "c_russie", camp: "CHN", ere: 1, titre: "Partenariat sino-russe", texte: "Traité de bon voisinage et coopération stratégique.", valeur: 3, type: "unique",
    modes: [{ nom: "Signer", cout: { cp: 2 }, effets: [{ type: "influence", pays: "RUS", camp: J, canal: "p", valeur: 10 }, { type: "influence", pays: "RUS", camp: J, canal: "m", valeur: 6 }, { type: "influence", pays: "RUS", camp: J, canal: "e", valeur: 4 }, { type: "tension", valeur: 2 }] }] },
  { id: "c_focac", camp: "CHN", ere: 1, titre: "Sommet Chine-Afrique", texte: "Forum de coopération sino-africain : prêts, bourses, infrastructures.", valeur: 3, type: "unique",
    modes: [{ nom: "Réunir", cout: { budget: 3 }, effets: [{ type: "influence", pays: AFRIQUE, camp: J, canal: "e", valeur: 5 }, { type: "influence", pays: AFRIQUE, camp: J, canal: "p", valeur: 3 }] }] },
  { id: "c_panda", camp: "CHN", ere: 1, titre: "Diplomatie du panda", texte: "Gestes symboliques et visites de haut niveau.", valeur: 1, type: "reutilisable",
    modes: [{ nom: "Offrir", cout: {}, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 2 }] }] },
  { id: "c_veto", camp: "CHN", ere: 1, titre: "Veto au Conseil de sécurité", texte: "Protéger un partenaire d'une résolution occidentale.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Opposer son veto", cout: { cp: 2 }, cible: "pays", conditions: [{ type: "alignement", pays: "$pays", max: 0.1 }], effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: 8 }, { type: "influence", pays: P, camp: A, canal: "p", valeur: -4 }, { type: "tension", valeur: 1 }] }] },
  { id: "c_cooperation_militaire", camp: "CHN", ere: 1, titre: "Coopération militaire", texte: "Ventes d'armes, formation et escales navales.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Coopérer", cout: { budget: 2 }, cible: "pays", conditions: [{ type: "alignement", pays: "$pays", max: -0.2 }], effets: [{ type: "influence", pays: P, camp: J, canal: "m", valeur: 12 }, { type: "tension", valeur: 2 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: P, camp: A, canal: "m", valeur: 5, delai: 2 }] }] }] },
  { id: "c_non_ingerence", camp: "CHN", ere: 1, titre: "Non-ingérence", texte: "Soutenir un gouvernement critiqué sans juger sa politique intérieure.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Soutenir", cout: { cp: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: 6 }, { type: "stabilite", pays: P, valeur: 3 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: -1, delai: 1 }] }] }] },
  { id: "c_rachats", camp: "CHN", ere: 1, titre: "Rachat d'entreprises", texte: "Racheter des entreprises et des technologies étrangères.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Racheter", cout: { budget: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 6 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -5, delai: 2 }] }] }] },
  { id: "c_tresor", camp: "CHN", ere: 1, titre: "Réserves en bons du Trésor", texte: "Accumuler des créances sur les États-Unis.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Acheter", cout: { budget: 1 }, effets: [{ type: "influence", pays: "USA", camp: J, canal: "e", valeur: 4 }, { type: "cp", camp: J, valeur: 2 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "tension", valeur: 1, delai: 2 }] }] }] },
  { id: "c_spatial", camp: "CHN", ere: 1, titre: "Programme spatial habité", texte: "Envoyer un taïkonaute en orbite.", valeur: 2, type: "unique",
    modes: [{ nom: "Lancer", cout: { budget: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 2 }, { type: "cp", camp: J, valeur: 4 }] }] },
  { id: "c_petrole", camp: "CHN", ere: 1, titre: "Pétrole contre infrastructures", texte: "Échanger des routes et des hôpitaux contre des contrats pétroliers.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Conclure", cout: { budget: 3 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 10 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 4 }],
      caches: [{ probabilite: 0.25, effets: [{ type: "stabilite", pays: P, valeur: -3, delai: 4 }] }] }] },
  { id: "c_ocs", camp: "CHN", ere: 1, titre: "Exercices de l'OCS", texte: "Manœuvres conjointes avec les partenaires d'Asie centrale.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Manœuvrer", cout: { budget: 1 }, effets: [{ type: "influence", pays: ["RUS", "KAZ"], camp: J, canal: "m", valeur: 5 }, { type: "tension", valeur: 1 }] }] },

  // ---------- Neutres ----------
  { id: "n_onu", camp: "NEUTRE", ere: 1, titre: "Assemblée générale de l'ONU", texte: "Discours et votes à New York.", valeur: 1, type: "reutilisable",
    modes: [{ nom: "Mobiliser les votes", cout: { cp: 1 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "p", valeur: 1 }] }] },
  { id: "n_emergents", camp: "NEUTRE", ere: 1, titre: "Boom des émergents", texte: "Les capitaux affluent vers les marchés émergents.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Investir", cout: { budget: 2 }, effets: [{ type: "croissance", pays: ["BRA", "IND", "IDN", "TUR", "MEX", "ZAF"], points: 0.3, duree: 4 }, { type: "influence", pays: ["BRA", "IND", "IDN", "TUR", "MEX", "ZAF"], camp: J, canal: "e", valeur: 2 }] }] },
  { id: "n_non_alignes", camp: "NEUTRE", ere: 1, titre: "Sommet des non-alignés", texte: "Les pays du Sud refusent de choisir un camp.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Courtiser", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["IND", "IDN", "EGY", "NGA", "VEN", "CUB", "ZAF", "MYS"], camp: J, canal: "p", valeur: 3 }, { type: "influence", pays: ["IND", "IDN", "EGY", "NGA", "VEN", "CUB", "ZAF", "MYS"], camp: A, canal: "p", valeur: -2 }] }] },
  { id: "n_climat", camp: "NEUTRE", ere: 1, titre: "Conférence sur le climat", texte: "Négociations annuelles de la COP.", valeur: 1, type: "reutilisable",
    modes: [
      { nom: "S'engager", cout: { cp: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 1 }, { type: "co2", pays: "tous", pourcent: -0.5, duree: 8 }] },
      { nom: "Bloquer", cout: {}, effets: [{ type: "cp", camp: J, valeur: 2 }, { type: "influence", pays: "tous", camp: J, canal: "c", valeur: -1 }] } ] },
  { id: "n_petrole", camp: "NEUTRE", ere: 1, titre: "Envolée du pétrole", texte: "Les cours du brut flambent sur fond de demande asiatique.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Courtiser les producteurs", cout: { budget: 1 }, effets: [{ type: "influence", pays: PETROLIERS, camp: J, canal: "e", valeur: 3 }] }] },
  { id: "n_mediation", camp: "NEUTRE", ere: 1, titre: "Médiation internationale", texte: "Proposer ses bons offices dans un conflit régional.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Proposer", cout: { cp: 1 }, cible: "pays", effets: [{ type: "tension", valeur: -3 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 4 }, { type: "stabilite", pays: P, valeur: 2 }] }] },
];
