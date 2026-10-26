// Cartes de décision de l'ère 2 (2009-2025) : 9 Occident, 9 Chine, 4 neutres. Elles s'ajoutent aux cartes réutilisables
// de l'ère 1 (aide, sanctions, prêts…), toujours valables ; les cartes uniques de l'ère 1 sortent du paquet.
import type { Carte } from "../moteur/types";

const J = "$joueur" as const, A = "$adversaire" as const, P = "$pays" as const;
const INDO_PACIFIQUE = ["JPN", "KOR", "AUS", "PHL", "VNM", "SGP", "IND", "IDN"];
const EUROPE = ["DEU", "FRA", "ITA", "ESP", "NLD", "POL", "GBR"];
const MINERAIS = ["COD", "AUS", "CHL", "BOL", "ARG", "IDN", "ZAF", "PER"];

export const CARTES_ERE2: Carte[] = [
  // ---------- Occident ----------
  { id: "o2_pivot", camp: "OCC", ere: 2, titre: "Pivot vers l'Asie", texte: "Redéployer navires et diplomates vers l'Indo-Pacifique.", valeur: 3, type: "unique",
    modes: [
      { nom: "Redéployer", cout: { budget: 2 }, effets: [{ type: "influence", pays: INDO_PACIFIQUE, camp: J, canal: "m", valeur: 4 }, { type: "influence", pays: INDO_PACIFIQUE, camp: J, canal: "p", valeur: 2 }, { type: "tension", valeur: 2 }] },
      { nom: "Discours sans moyens", cout: { cp: 1 }, effets: [{ type: "influence", pays: INDO_PACIFIQUE, camp: J, canal: "p", valeur: 2 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: ["PHL", "THA"], camp: J, canal: "p", valeur: -3, delai: 4 }] }] } ] },
  { id: "o2_tpp", camp: "OCC", ere: 2, titre: "Partenariat transpacifique", texte: "Un grand accord commercial autour du Pacifique, sans la Chine.", valeur: 3, type: "unique",
    modes: [{ nom: "Signer", cout: { cp: 3 }, effets: [{ type: "influence", pays: ["JPN", "VNM", "MYS", "AUS", "CAN", "MEX", "CHL", "PER", "NZL", "SGP"], camp: J, canal: "e", valeur: 5 }],
      caches: [{ probabilite: 0.35, effets: [{ type: "cp", camp: J, valeur: -4, delai: 4 }] }] }] },
  { id: "o2_controles", camp: "OCC", ere: 2, titre: "Contrôle des exportations technologiques", texte: "Interdire la vente de puces et de machines avancées à l'adversaire.", valeur: 3, type: "reutilisable",
    modes: [
      { nom: "Contrôles ciblés", cout: { cp: 1 }, effets: [{ type: "croissance", pays: "CHN", points: -0.2, duree: 8 }, { type: "tension", valeur: 2 }] },
      { nom: "Embargo technologique", cout: { cp: 3 }, effets: [{ type: "croissance", pays: "CHN", points: -0.5, duree: 8 }, { type: "tension", valeur: 4 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: ["KOR", "JPN", "NLD", "DEU"], camp: J, canal: "e", valeur: -3, delai: 2 }] }] } ] },
  { id: "o2_quad", camp: "OCC", ere: 2, titre: "Dialogue quadrilatéral", texte: "États-Unis, Inde, Japon et Australie se coordonnent face à la Chine.", valeur: 3, type: "unique",
    modes: [{ nom: "Réunir le Quad", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["IND", "JPN", "AUS"], camp: J, canal: "m", valeur: 6 }, { type: "influence", pays: ["IND", "JPN", "AUS"], camp: J, canal: "p", valeur: 3 }, { type: "tension", valeur: 2 }] }] },
  { id: "o2_aukus", camp: "OCC", ere: 2, titre: "Alliance des sous-marins", texte: "Fournir des sous-marins à propulsion nucléaire à un allié du Pacifique.", valeur: 4, type: "unique",
    modes: [{ nom: "Conclure", cout: { budget: 3, cp: 2 }, effets: [{ type: "influence", pays: "AUS", camp: J, canal: "m", valeur: 12 }, { type: "influence", pays: "GBR", camp: J, canal: "m", valeur: 4 }, { type: "tension", valeur: 3 }],
      caches: [{ probabilite: 0.5, effets: [{ type: "influence", pays: "FRA", camp: J, canal: "p", valeur: -6, delai: 1 }] }] }] },
  { id: "o2_gnl", camp: "OCC", ere: 2, titre: "Gaz naturel liquéfié", texte: "Vendre le gaz de schiste aux alliés pour les sevrer du gaz russe.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Exporter", cout: { budget: 1 }, effets: [{ type: "influence", pays: EUROPE, camp: J, canal: "e", valeur: 3 }, { type: "influence", pays: "RUS", camp: J, canal: "e", valeur: -2 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "co2", pays: "USA", pourcent: 1, duree: 8 }] }] }] },
  { id: "o2_amis", camp: "OCC", ere: 2, titre: "Relocaliser chez les amis", texte: "Déplacer les chaînes d'approvisionnement vers des pays sûrs.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Relocaliser", cout: { budget: 2 }, cible: "pays", conditions: [{ type: "alignement", pays: "$pays", min: 0.1 }],
      effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 8 }, { type: "croissance", pays: P, points: 0.3, duree: 8 }] }] },
  { id: "o2_vaccins", camp: "OCC", ere: 2, titre: "Diplomatie des vaccins", texte: "Donner des doses et financer la production au Sud.", valeur: 2, type: "unique",
    modes: [{ nom: "Donner", cout: { budget: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 2 }, { type: "cp", camp: J, valeur: 1 }] }] },
  { id: "o2_cyber", camp: "OCC", ere: 2, titre: "Cyberdéfense partagée", texte: "Protéger les réseaux d'un partenaire et partager le renseignement.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Coopérer", cout: { budget: 1 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "m", valeur: 4 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 2 }],
      caches: [{ probabilite: 0.2, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -5, delai: 3 }] }] }] },

  // ---------- Chine ----------
  { id: "c2_routes", camp: "CHN", ere: 2, titre: "Routes de la soie", texte: "Ports, voies ferrées et centrales financés par des prêts chinois.", valeur: 3, type: "reutilisable",
    modes: [{ nom: "Financer un corridor", cout: { budget: 3 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 9 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: 3 }, { type: "croissance", pays: P, points: 0.3, duree: 8 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "stabilite", pays: P, valeur: -3, delai: 8 }, { type: "influence", pays: P, camp: J, canal: "p", valeur: -4, delai: 8 }] }] }] },
  { id: "c2_baii", camp: "CHN", ere: 2, titre: "Banque asiatique d'investissement", texte: "Une banque multilatérale dirigée par Pékin, ouverte aux alliés de Washington.", valeur: 3, type: "unique",
    modes: [{ nom: "Fonder", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["GBR", "DEU", "FRA", "ITA", "KOR", "AUS", "IND"], camp: J, canal: "e", valeur: 3 }, { type: "cp", camp: A, valeur: -2 }] }] },
  { id: "c2_ndb", camp: "CHN", ere: 2, titre: "Banque des BRICS", texte: "Financer le développement sans le FMI ni la Banque mondiale.", valeur: 2, type: "unique",
    modes: [{ nom: "Capitaliser", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["BRA", "IND", "RUS", "ZAF"], camp: J, canal: "e", valeur: 5 }, { type: "influence", pays: ["BRA", "IND", "RUS", "ZAF"], camp: J, canal: "p", valeur: 2 }] }] },
  { id: "c2_iles", camp: "CHN", ere: 2, titre: "Îles artificielles", texte: "Remblayer des récifs des Spratleys et y bâtir pistes et ports.", valeur: 3, type: "unique",
    modes: [{ nom: "Construire", cout: { budget: 2 }, effets: [{ type: "cp", camp: J, valeur: 4 }, { type: "tension", valeur: 4 }, { type: "influence", pays: ["KHM", "LAO"], camp: J, canal: "m", valeur: 4 }, { type: "influence", pays: ["PHL", "VNM", "MYS"], camp: J, canal: "p", valeur: -3 }] }] },
  { id: "c2_5g", camp: "CHN", ere: 2, titre: "Réseaux 5G", texte: "Équiper les télécommunications d'un pays à prix cassés.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Équiper", cout: { budget: 2 }, cible: "pays", effets: [{ type: "influence", pays: P, camp: J, canal: "e", valeur: 6 }, { type: "influence", pays: P, camp: J, canal: "m", valeur: 2 }],
      caches: [{ probabilite: 0.3, effets: [{ type: "influence", pays: P, camp: J, canal: "p", valeur: -4, delai: 4 }] }] }] },
  { id: "c2_masques", camp: "CHN", ere: 2, titre: "Diplomatie des masques", texte: "Livrer masques, respirateurs et vaccins au monde entier.", valeur: 2, type: "unique",
    modes: [{ nom: "Livrer", cout: { budget: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 1 }, { type: "influence", pays: "tous", camp: J, canal: "p", valeur: 1 }],
      caches: [{ probabilite: 0.35, effets: [{ type: "influence", pays: EUROPE, camp: J, canal: "p", valeur: -2, delai: 2 }] }] }] },
  { id: "c2_yuan", camp: "CHN", ere: 2, titre: "Commerce en yuans", texte: "Régler pétrole et matières premières dans la monnaie chinoise.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Proposer", cout: { cp: 1 }, effets: [{ type: "influence", pays: ["RUS", "IRN", "SAU", "BRA", "ARG"], camp: J, canal: "e", valeur: 3 }, { type: "cp", camp: J, valeur: 2 }] }] },
  { id: "c2_loups", camp: "CHN", ere: 2, titre: "Loups guerriers", texte: "Une diplomatie offensive qui ne laisse passer aucune critique.", valeur: 1, type: "reutilisable",
    modes: [{ nom: "Riposter", cout: {}, effets: [{ type: "cp", camp: J, valeur: 3 }, { type: "influence", pays: "tous", camp: J, canal: "c", valeur: -1 }, { type: "tension", valeur: 1 }] }] },
  { id: "c2_brics_plus", camp: "CHN", ere: 2, titre: "Élargir les BRICS", texte: "Ouvrir le club aux puissances régionales du Sud.", valeur: 4, type: "unique",
    modes: [{ nom: "Inviter", cout: { cp: 3 }, effets: [{ type: "influence", pays: ["EGY", "ETH", "IRN", "ARE", "SAU", "IDN"], camp: J, canal: "p", valeur: 6 }],
      caches: [{ probabilite: 0.4, effets: [{ type: "influence", pays: ["IND", "BRA"], camp: J, canal: "p", valeur: -3, delai: 2 }] }] }] },

  // ---------- Neutres ----------
  { id: "n2_g20", camp: "NEUTRE", ere: 2, titre: "Sommet du G20", texte: "Les vingt premières économies se réunissent.", valeur: 1, type: "reutilisable",
    modes: [{ nom: "Peser sur le communiqué", cout: { cp: 1 }, effets: [{ type: "influence", pays: ["BRA", "IND", "IDN", "ZAF", "MEX", "TUR", "ARG", "SAU"], camp: J, canal: "p", valeur: 2 }, { type: "tension", valeur: -1 }] }] },
  { id: "n2_ia", camp: "NEUTRE", ere: 2, titre: "Course à l'intelligence artificielle", texte: "Puces, données et talents : qui dominera l'IA ?", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Investir", cout: { budget: 2 }, effets: [{ type: "influence", pays: "tous", camp: J, canal: "c", valeur: 1 }, { type: "cp", camp: J, valeur: 2 }] }] },
  { id: "n2_migrations", camp: "NEUTRE", ere: 2, titre: "Crise migratoire", texte: "Des centaines de milliers de réfugiés aux frontières.", valeur: 2, type: "reutilisable",
    modes: [
      { nom: "Accueillir", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["SYR", "AFG", "IRQ", "ERI", "SDN"], camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: "tous", camp: J, canal: "c", valeur: 1 }] },
      { nom: "Fermer les frontières", cout: {}, effets: [{ type: "cp", camp: J, valeur: 2 }, { type: "influence", pays: "tous", camp: J, canal: "c", valeur: -1 }] } ] },
  { id: "n2_terres_rares", camp: "NEUTRE", ere: 2, titre: "Course aux métaux critiques", texte: "Lithium, cobalt et terres rares deviennent stratégiques.", valeur: 2, type: "reutilisable",
    modes: [{ nom: "Sécuriser des mines", cout: { budget: 2 }, effets: [{ type: "influence", pays: MINERAIS, camp: J, canal: "e", valeur: 3 }] }] },
];
