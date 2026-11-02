// Cartes de décision de l'ère 3 (2026-2050), requalification du 2 novembre 2026 après le passage à 2050 :
// 5 Occident, 5 BRICS (symétriques en coût et en force), 3 neutres. Les cartes réutilisables des ères 1 et 2 restent dans le paquet.
// Valeurs : estimation, même barème que l'ère 2.
import type { Carte } from "../moteur/types";

const J = "$joueur" as const, P = "$pays" as const;
const SUD = ["IND", "IDN", "BRA", "NGA", "ZAF", "EGY", "ETH", "KEN", "PAK", "BGD", "VNM", "MEX", "TUR", "SAU"];
const AFRIQUE = ["NGA", "ETH", "EGY", "ZAF", "KEN", "COD", "AGO", "TZA", "GHA", "CIV", "SEN", "MAR", "DZA"];
const ARCTIQUE = ["CAN", "NOR", "DNK", "ISL", "FIN", "SWE", "RUS"];

export const CARTES_ERE3: Carte[] = [
  // ---------- Occident ----------
  { id: "o3_puces", camp: "OCC", ere: 3, titre: "Alliance des puces", texte: "Partager usines et brevets de semi-conducteurs entre alliés.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Mutualiser", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["JPN", "KOR", "NLD", "DEU"], camp: J, canal: "e", valeur: 4 }, { type: "croissance", pays: ["JPN", "KOR"], points: 0.2, duree: 8 }] },
      { nom: "Fermer l'accès", cout: { cp: 2 }, effets: [{ type: "croissance", pays: "CHN", points: -0.3, duree: 8 }, { type: "tension", valeur: 3 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: ["KOR", "NLD"], camp: J, canal: "e", valeur: -3, delai: 4 }] }] } ] },
  { id: "o3_dollar_num", camp: "OCC", ere: 3, titre: "Dollar numérique", texte: "Une monnaie numérique publique pour garder la main sur les paiements.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Lancer", cout: { cp: 2 }, effets: [{ type: "influence", pays: SUD, camp: J, canal: "e", valeur: 2 }, { type: "influence", pays: "tous", camp: J, canal: "e", valeur: 1 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "stabilite", pays: "USA", valeur: -2, delai: 4 }] }] }] },
  { id: "o3_arctique", camp: "OCC", ere: 3, titre: "Bouclier arctique", texte: "Bases et brise-glaces pour tenir les nouvelles routes du Nord.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Déployer", cout: { budget: 3 }, effets: [{ type: "influence", pays: ARCTIQUE.filter(i => i !== "RUS"), camp: J, canal: "m", valeur: 5 }, { type: "tension", valeur: 2 }] }] },
  { id: "o3_climat_sud", camp: "OCC", ere: 3, titre: "Fonds climat pour le Sud", texte: "Financer digues, solaire et récoltes dans les pays exposés.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Financer", cout: { budget: 2 }, effets: [{ type: "influence", pays: AFRIQUE, camp: J, canal: "c", valeur: 3 }, { type: "stabilite", pays: AFRIQUE, valeur: 1 }] }] },
  { id: "o3_ia_regles", camp: "OCC", ere: 3, titre: "Règles communes de l'IA", texte: "Imposer aux alliés des normes de sécurité pour l'intelligence artificielle.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Proposer", cout: { cp: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: 5 }],
      caches: [{ probabilite: 0.25, effets: [{ type: "croissance", pays: P, points: -0.1, duree: 4 }] }] }] },
  // ---------- BRICS ----------
  { id: "c3_compensation", camp: "CHN", ere: 3, titre: "Chambre de compensation des BRICS", texte: "Régler les échanges sans passer par le dollar.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Ouvrir", cout: { cp: 2 }, effets: [{ type: "influence", pays: SUD, camp: J, canal: "e", valeur: 2 }, { type: "influence", pays: "tous", camp: J, canal: "e", valeur: 1 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "stabilite", pays: "CHN", valeur: -2, delai: 4 }] }] }] },
  { id: "c3_lithographie", camp: "CHN", ere: 3, titre: "Puces nationales", texte: "Rattraper les machines de gravure interdites à l'export.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Subventionner", cout: { budget: 2 }, effets: [{ type: "croissance", pays: "CHN", points: 0.2, duree: 8 }, { type: "influence", pays: ["MYS", "VNM"], camp: J, canal: "e", valeur: 3 }] },
      { nom: "Débaucher les ingénieurs", cout: { cp: 2 }, effets: [{ type: "croissance", pays: ["KOR", "JPN"], points: -0.2, duree: 8 }, { type: "tension", valeur: 3 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: ["KOR", "JPN"], camp: J, canal: "p", valeur: -4, delai: 2 }] }] } ] },
  { id: "c3_route_nord", camp: "CHN", ere: 3, titre: "Route maritime du Nord", texte: "Faire passer les cargos par l'Arctique avec les brise-glaces russes.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Ouvrir", cout: { budget: 3 }, effets: [{ type: "influence", pays: "RUS", camp: J, canal: "e", valeur: 6 }, { type: "influence", pays: ["NOR", "ISL"], camp: J, canal: "e", valeur: 2 }, { type: "tension", valeur: 2 }] }] },
  { id: "c3_greniers", camp: "CHN", ere: 3, titre: "Greniers d'Afrique", texte: "Terres agricoles, silos et routes contre des contrats de récolte.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Investir", cout: { budget: 2 }, effets: [{ type: "influence", pays: AFRIQUE, camp: J, canal: "c", valeur: 3 }, { type: "stabilite", pays: AFRIQUE, valeur: 1 }] }] },
  { id: "c3_ville_intel", camp: "CHN", ere: 3, titre: "Villes intelligentes clés en main", texte: "Caméras, réseaux et plateformes livrés à un gouvernement partenaire.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Livrer", cout: { cp: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: 5 }],
      caches: [{ probabilite: 0.25, effets: [{ type: "stabilite", pays: P, valeur: -1, delai: 4 }] }] }] },
  // ---------- Neutres ----------
  { id: "n3_vieillissement", camp: "NEUTRE", ere: 3, titre: "Choc du vieillissement", texte: "Moins d'actifs, plus de retraités : il faut choisir.", valeur: 2, type: "reutilisable",
    modes: [
      { nom: "Ouvrir à l'immigration", cout: { cp: 1 }, effets: [{ type: "croissance", pays: ["USA", "DEU", "JPN", "CHN"], points: 0.1, duree: 8 }, { type: "stabilite", pays: ["DEU", "ITA"], valeur: -1 }] },
      { nom: "Robotiser", cout: { budget: 2 }, effets: [{ type: "croissance", pays: ["JPN", "KOR", "CHN", "DEU"], points: 0.15, duree: 8 }] } ] },
  { id: "n3_eau", camp: "NEUTRE", ere: 3, titre: "Guerre de l'eau", texte: "Barrages en amont, sécheresse en aval : un fleuve partagé s'assèche.", valeur: 2, type: "reutilisable",
    modes: [
      { nom: "Arbitrer", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["EGY", "ETH", "SDN", "IND", "PAK"], camp: J, canal: "p", valeur: 3 }] },
      { nom: "Laisser faire", cout: {}, effets: [{ type: "stabilite", pays: ["EGY", "PAK"], valeur: -2 }, { type: "tension", valeur: 1 }] } ] },
  { id: "n3_fusion", camp: "NEUTRE", ere: 3, titre: "Course à l'énergie propre", texte: "Batteries, fusion, hydrogène : qui fabriquera l'énergie de demain ?", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Investir", cout: { budget: 2 }, effets: [{ type: "co2", pays: ["USA", "CHN", "IND", "DEU", "JPN"], pourcent: -1, duree: 8 }, { type: "influence", pays: SUD, camp: J, canal: "e", valeur: 1 }] }] },
];
