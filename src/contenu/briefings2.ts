// Briefings de l'ère 2 (2009-2025) : les grandes décisions des deux leaders. Effets affichés en fourchette ; effets réels
// tirés entre ×0,5 et ×1,5 ; effets cachés révélés à leur échéance. Personnes réelles non nommées : on parle de fonctions.
import type { Briefing } from "../moteur/types";

const J = "$joueur" as const, A = "$adversaire" as const;
const ASIE = ["JPN", "KOR", "AUS", "PHL", "VNM", "SGP", "IDN", "MYS"];
const EUROPE = ["DEU", "FRA", "ITA", "ESP", "NLD", "POL", "GBR"];
const ROUTES = ["PAK", "KAZ", "LKA", "KEN", "ETH", "IDN", "EGY", "GRC", "SRB", "MMR"];

export const BRIEFINGS_ERE2: Briefing[] = [
  // ---------- Occident ----------
  { id: "b_o_relance_2009", camp: "OCC", titre: "Sauver les banques, relancer l'économie", maxChoix: 2,
    dossier: "La faillite de Lehman Brothers a gelé le crédit mondial. Le chômage double, les constructeurs automobiles sont au bord de la faillite. Le Congrès attend un plan.",
    declencheur: { annee: 2009, trimestre: 1 },
    conseillers: [
      { role: "Secrétaire au Trésor", avis: "Recapitaliser les banques d'abord, sinon rien ne repartira." },
      { role: "Conseiller économique", avis: "Une relance budgétaire massive, et vite : la demande s'effondre." },
      { role: "Chef de la majorité", avis: "Les électeurs ne pardonneront pas un chèque aux banquiers." } ],
    options: [
      { libelle: "Plan de relance massif", cout: { budget: 3 }, effets: [{ type: "croissance", pays: "USA", points: 0.6, duree: 8 }, { type: "cp", camp: J, valeur: 2 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "cp", camp: J, valeur: -4, delai: 6 }] }] },
      { libelle: "Sauver les banques et l'automobile", cout: { budget: 2, cp: 3 }, effets: [{ type: "stabilite", pays: "USA", valeur: 4 }, { type: "influence", pays: EUROPE, camp: J, canal: "e", valeur: 2 }] },
      { libelle: "Coordonner la riposte au G20", cout: { cp: 2 }, effets: [{ type: "influence", pays: ["BRA", "IND", "IDN", "ZAF", "MEX", "TUR"], camp: J, canal: "p", valeur: 3 }, { type: "tension", valeur: -2 }] },
      { libelle: "Laisser le marché purger les excès", cout: {}, effets: [{ type: "cp", camp: J, valeur: 3 }, { type: "stabilite", pays: "USA", valeur: -5 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "croissance", pays: "USA", points: -0.6, duree: 6, delai: 2 }] }] } ] },

  { id: "b_o_pivot_asie", camp: "OCC", titre: "Un pivot vers l'Asie ?", maxChoix: 1,
    dossier: "Les guerres d'Irak et d'Afghanistan s'achèvent. Les alliés asiatiques s'inquiètent de la montée navale chinoise et demandent des garanties.",
    declencheur: { annee: 2011, trimestre: 4 },
    conseillers: [
      { role: "Secrétaire d'État", avis: "Le XXIe siècle se jouera dans le Pacifique : redéployons-nous." },
      { role: "Secrétaire à la Défense", avis: "Sans moyens nouveaux, le pivot restera un slogan." },
      { role: "Envoyé pour le Moyen-Orient", avis: "Partir maintenant, c'est laisser un vide que d'autres rempliront." } ],
    options: [
      { libelle: "Redéployer la flotte et les alliances", cout: { budget: 2, cp: 2 }, effets: [{ type: "influence", pays: ASIE, camp: J, canal: "m", valeur: 5 }, { type: "tension", valeur: 3 }] },
      { libelle: "Miser sur un grand traité commercial", cout: { cp: 3 }, effets: [{ type: "influence", pays: ASIE, camp: J, canal: "e", valeur: 4 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "cp", camp: J, valeur: -4, delai: 8 }] }] },
      { libelle: "Rester engagé au Moyen-Orient", cout: {}, effets: [{ type: "influence", pays: ["SAU", "ARE", "QAT", "IRQ", "ISR"], camp: J, canal: "m", valeur: 4 }, { type: "influence", pays: ASIE, camp: J, canal: "p", valeur: -2 }] } ] },

  { id: "b_o_guerre_commerciale", camp: "OCC", titre: "Une guerre commerciale avec la Chine ?", maxChoix: 1,
    dossier: "Le déficit commercial avec la Chine dépasse 375 milliards de dollars. Transferts de technologie forcés, subventions, vol de propriété intellectuelle : la pression monte pour frapper fort.",
    declencheur: { annee: 2018, trimestre: 1 },
    conseillers: [
      { role: "Représentant au Commerce", avis: "Des droits de douane massifs les forceront à négocier." },
      { role: "Secrétaire au Trésor", avis: "Nos agriculteurs et nos consommateurs paieront la note." },
      { role: "Conseiller à la sécurité nationale", avis: "Le vrai sujet, ce sont les semi-conducteurs et la 5G." } ],
    options: [
      { libelle: "Droits de douane sur 360 milliards", cout: { cp: 2 }, effets: [{ type: "croissance", pays: "CHN", points: -0.5, duree: 8 }, { type: "croissance", pays: "USA", points: -0.2, duree: 8 }, { type: "tension", valeur: 6 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "influence", pays: ["VNM", "MEX", "MYS"], camp: J, canal: "e", valeur: 4, delai: 4 }] }] },
      { libelle: "Contrôles ciblés sur la haute technologie", cout: { cp: 1 }, effets: [{ type: "croissance", pays: "CHN", points: -0.2, duree: 12 }, { type: "tension", valeur: 3 }, { type: "influence", pays: ["JPN", "KOR", "NLD", "TWN"], camp: J, canal: "e", valeur: 2 }] },
      { libelle: "Négocier avec les alliés à l'OMC", cout: { cp: 3 }, effets: [{ type: "influence", pays: EUROPE, camp: J, canal: "p", valeur: 3 }, { type: "tension", valeur: 1 }] } ] },

  { id: "b_o_ukraine", camp: "OCC", titre: "Répondre à l'invasion de l'Ukraine", maxChoix: 2,
    dossier: "Les chars russes avancent vers Kiev. Les Européens attendent un signal ; Kiev demande des armes et des sanctions totales. Le risque d'escalade avec une puissance nucléaire est réel.",
    declencheur: { evenement: "h_ukraine" },
    conseillers: [
      { role: "Secrétaire à la Défense", avis: "Armer l'Ukraine, mais pas un soldat américain sur le terrain." },
      { role: "Secrétaire au Trésor", avis: "Geler les réserves de la banque centrale russe, couper SWIFT." },
      { role: "Conseiller à la sécurité nationale", avis: "Chaque marche d'escalade doit être pesée face au risque nucléaire." } ],
    options: [
      { libelle: "Armer massivement l'Ukraine", cout: { budget: 3 }, effets: [{ type: "influence", pays: "UKR", camp: J, canal: "m", valeur: 10 }, { type: "tension", valeur: 5 }] },
      { libelle: "Sanctions financières totales", cout: { cp: 2 }, effets: [{ type: "croissance", pays: "RUS", points: -2, duree: 8 }, { type: "influence", pays: "RUS", camp: A, canal: "e", valeur: 5 }, { type: "influence", pays: EUROPE, camp: J, canal: "p", valeur: 3 }] },
      { libelle: "Renforcer le flanc est de l'OTAN", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["POL", "LTU", "LVA", "EST", "ROU", "FIN", "SWE"], camp: J, canal: "m", valeur: 6 }, { type: "tension", valeur: 2 }] },
      { libelle: "Pousser à une négociation rapide", cout: { cp: 4 }, effets: [{ type: "tension", valeur: -5 }, { type: "influence", pays: "UKR", camp: J, canal: "p", valeur: -5 }] } ] },

  { id: "b_o_droits_douane_2025", camp: "OCC", titre: "Des droits de douane pour tous ?", maxChoix: 1,
    dossier: "Le nouvel exécutif veut des droits de douane « réciproques » sur presque tous les partenaires, alliés compris, pour réindustrialiser le pays. Les marchés s'inquiètent.",
    declencheur: { annee: 2025, trimestre: 2 },
    conseillers: [
      { role: "Conseiller au Commerce", avis: "Nos partenaires profitent de nous depuis des décennies." },
      { role: "Secrétaire au Trésor", avis: "Annonçons fort, puis négocions pays par pays." },
      { role: "Ambassadeur auprès de l'UE", avis: "Frapper les alliés, c'est offrir l'Europe et l'Asie à Pékin." } ],
    options: [
      { libelle: "Droits de douane universels", cout: {}, effets: [{ type: "cp", camp: J, valeur: 3 }, { type: "croissance", pays: "USA", points: -0.4, duree: 4 }, { type: "influence", pays: [...EUROPE, ...ASIE], camp: J, canal: "e", valeur: -4 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "influence", pays: [...EUROPE, ...ASIE], camp: A, canal: "e", valeur: 3, delai: 2 }] }] },
      { libelle: "Viser la seule Chine", cout: { cp: 1 }, effets: [{ type: "croissance", pays: "CHN", points: -0.4, duree: 6 }, { type: "tension", valeur: 4 }] },
      { libelle: "Renoncer et négocier", cout: { cp: 2 }, effets: [{ type: "influence", pays: [...EUROPE, ...ASIE], camp: J, canal: "p", valeur: 2 }] } ] },

  // ---------- Chine ----------
  { id: "b_c_relance_2009", camp: "CHN", titre: "Un plan de relance de 4 000 milliards de yuans ?", maxChoix: 1,
    dossier: "Les exportations s'effondrent avec la crise mondiale ; vingt millions de travailleurs migrants ont perdu leur emploi. Il faut décider de l'ampleur de la relance.",
    declencheur: { annee: 2009, trimestre: 1 },
    conseillers: [
      { role: "Premier ministre", avis: "Frapper vite et fort : infrastructures, logement, chemins de fer." },
      { role: "Gouverneur de la banque centrale", avis: "Trop de crédit créera des bulles et des dettes locales." },
      { role: "Ministre du Commerce", avis: "Profitons-en pour prêter aux pays du Sud qui manquent de capitaux." } ],
    options: [
      { libelle: "Relance massive par le crédit", cout: { budget: 2 }, effets: [{ type: "croissance", pays: "CHN", points: 0.8, duree: 8 }, { type: "influence", pays: "tous", camp: J, canal: "e", valeur: 1 }],
        caches: [{ probabilite: 0.5, effets: [{ type: "stabilite", pays: "CHN", valeur: -4, delai: 12 }] }] },
      { libelle: "Relance mesurée", cout: { budget: 1 }, effets: [{ type: "croissance", pays: "CHN", points: 0.4, duree: 8 }] },
      { libelle: "Prêter massivement au Sud", cout: { budget: 3 }, effets: [{ type: "influence", pays: ["BRA", "VEN", "ARG", "AGO", "NGA", "PAK", "KAZ"], camp: J, canal: "e", valeur: 5 }] } ] },

  { id: "b_c_routes_soie", camp: "CHN", titre: "Lancer les Nouvelles routes de la soie ?", maxChoix: 1,
    dossier: "Le nouveau secrétaire général veut un grand projet : ports, chemins de fer et corridors d'Asie centrale jusqu'à l'Europe et l'Afrique. Les surcapacités industrielles trouveraient des débouchés.",
    declencheur: { annee: 2013, trimestre: 3 },
    conseillers: [
      { role: "Commission nationale du développement", avis: "Mille milliards de dollars d'infrastructures : l'Eurasie passera par nous." },
      { role: "Ministre des Finances", avis: "Beaucoup de ces pays ne pourront pas rembourser." },
      { role: "Ministre des Affaires étrangères", avis: "Ne réveillons pas trop vite la méfiance de Washington." } ],
    options: [
      { libelle: "Programme mondial ambitieux", cout: { budget: 4 }, effets: [{ type: "influence", pays: ROUTES, camp: J, canal: "e", valeur: 7 }, { type: "influence", pays: ROUTES, camp: J, canal: "p", valeur: 3 }, { type: "tension", valeur: 2 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "stabilite", pays: ["PAK", "LKA", "KEN"], valeur: -3, delai: 12 }, { type: "influence", pays: ["LKA", "MYS"], camp: J, canal: "p", valeur: -4, delai: 12 }] }] },
      { libelle: "Corridors régionaux seulement", cout: { budget: 2 }, effets: [{ type: "influence", pays: ["PAK", "KAZ", "MMR", "LAO", "KHM"], camp: J, canal: "e", valeur: 6 }] },
      { libelle: "Priorité au marché intérieur", cout: {}, effets: [{ type: "croissance", pays: "CHN", points: 0.2, duree: 8 }, { type: "cp", camp: J, valeur: 2 }] } ] },

  { id: "b_c_arbitrage", camp: "CHN", titre: "Répondre à la sentence sur la mer de Chine", maxChoix: 1,
    dossier: "La Cour d'arbitrage a balayé nos revendications. Nos îles artificielles sont achevées ; Manille hésite entre Washington et nos investissements.",
    declencheur: { evenement: "h_arbitrage_mcs" },
    conseillers: [
      { role: "Commandant de la flotte du Sud", avis: "Militariser les îles : les faits accomplis valent mieux que les sentences." },
      { role: "Ministre des Affaires étrangères", avis: "Offrir des investissements à Manille pour qu'elle range la sentence." },
      { role: "Ministre du Commerce", avis: "Évitons de pousser l'ASEAN dans les bras américains." } ],
    options: [
      { libelle: "Militariser les îles", cout: { budget: 2 }, effets: [{ type: "tension", valeur: 5 }, { type: "influence", pays: ["PHL", "VNM", "MYS"], camp: J, canal: "p", valeur: -4 }, { type: "cp", camp: J, valeur: 4 }] },
      { libelle: "Acheter la paix avec Manille", cout: { budget: 3 }, effets: [{ type: "influence", pays: "PHL", camp: J, canal: "e", valeur: 10 }, { type: "influence", pays: "PHL", camp: J, canal: "p", valeur: 5 }] },
      { libelle: "Code de conduite avec l'ASEAN", cout: { cp: 2 }, effets: [{ type: "tension", valeur: -3 }, { type: "influence", pays: ["IDN", "MYS", "SGP", "THA", "VNM"], camp: J, canal: "p", valeur: 2 }] } ] },

  { id: "b_c_covid", camp: "CHN", titre: "Après Wuhan : quelle diplomatie sanitaire ?", maxChoix: 2,
    dossier: "L'épidémie est contenue chez nous, elle explose ailleurs. Le monde manque de masques, de respirateurs puis de vaccins. On nous accuse d'avoir tardé à alerter.",
    declencheur: { evenement: "h_covid" },
    conseillers: [
      { role: "Ministre des Affaires étrangères", avis: "Livrer masques et vaccins au Sud : ils s'en souviendront." },
      { role: "Porte-parole", avis: "Répondre coup pour coup aux accusations occidentales." },
      { role: "Commission de la santé", avis: "Maintenir le zéro Covid, quoi qu'il en coûte." } ],
    options: [
      { libelle: "Diplomatie des masques et des vaccins", cout: { budget: 3 }, effets: [{ type: "influence", pays: ["PAK", "IDN", "BRA", "TUR", "EGY", "SRB", "HUN", "PER"], camp: J, canal: "c", valeur: 4 }, { type: "influence", pays: ["PAK", "IDN", "BRA", "TUR", "EGY", "SRB", "HUN", "PER"], camp: J, canal: "p", valeur: 2 }] },
      { libelle: "Riposte des « loups guerriers »", cout: {}, effets: [{ type: "cp", camp: J, valeur: 4 }, { type: "influence", pays: EUROPE, camp: J, canal: "p", valeur: -4 }] },
      { libelle: "Zéro Covid prolongé", cout: {}, effets: [{ type: "stabilite", pays: "CHN", valeur: 3 }],
        caches: [{ probabilite: 0.6, effets: [{ type: "croissance", pays: "CHN", points: -0.6, duree: 6, delai: 6 }, { type: "stabilite", pays: "CHN", valeur: -5, delai: 10 }] }] } ] },

  { id: "b_c_ukraine", camp: "CHN", titre: "Que faire de l'invasion russe ?", maxChoix: 1,
    dossier: "Notre partenaire « sans limites » a envahi l'Ukraine. L'Occident sanctionne et regarde notre réaction ; Moscou a besoin de nos achats et de nos composants.",
    declencheur: { evenement: "h_ukraine" },
    conseillers: [
      { role: "Ministre des Affaires étrangères", avis: "Neutralité de façade, et un plan de paix qui nous pose en médiateur." },
      { role: "Ministre du Commerce", avis: "Acheter leur pétrole au rabais et vendre nos produits." },
      { role: "Chef d'état-major", avis: "Une Russie vaincue laisserait l'OTAN seule face à nous." } ],
    options: [
      { libelle: "Soutien économique discret", cout: { budget: 1 }, effets: [{ type: "influence", pays: "RUS", camp: J, canal: "e", valeur: 8 }, { type: "influence", pays: EUROPE, camp: J, canal: "p", valeur: -3 }],
        caches: [{ probabilite: 0.4, effets: [{ type: "croissance", pays: "CHN", points: -0.2, duree: 4, delai: 3 }] }] },
      { libelle: "Médiation et plan de paix", cout: { cp: 2 }, effets: [{ type: "tension", valeur: -3 }, { type: "influence", pays: ["IND", "BRA", "ZAF", "IDN", "TUR"], camp: J, canal: "p", valeur: 3 }] },
      { libelle: "Prendre ses distances avec Moscou", cout: { cp: 3 }, effets: [{ type: "influence", pays: EUROPE, camp: J, canal: "e", valeur: 4 }, { type: "influence", pays: "RUS", camp: J, canal: "p", valeur: -8 }] } ] },
];
