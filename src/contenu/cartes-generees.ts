// Cartes générées (×15) : 61 modèles (20 bloc USA, 20 bloc Chine, 21 neutres) déclinés par région (7) et par ère (2000-2008, 2009+).
// Une carte agit sur une région entière ou sur ses 3 pays phares : pas de clic pays par pays. Effets : estimations de jeu,
// symétriques entre les deux blocs pour ne pas déséquilibrer la partie.
import type { Carte, Effet, ModeCarte } from "../moteur/types";
import { ZONES } from "../moteur/zones";

type Cible = "Z" | "F"; // Z : les 6 pays principaux de la région ; F : ses 3 pays phares
type Fx = ["i", Cible, "J" | "A", "p" | "e" | "m" | "c", number] | ["s", Cible, number] | ["g", Cible, number, number] | ["t", number] | ["cp", "J" | "A", number] | ["b", "J" | "A", number] | ["co2", Cible, number, number];
interface Mode { n: string; c: [number, number]; e: Fx[]; h?: [number, Fx[], number?] } // h : effet caché [probabilité, effets, délai]
interface Modele { id: string; camp: Carte["camp"]; v: 1 | 2 | 3 | 4; img: string; titre: [string, string?]; texte: [string, string]; zones?: string[]; modes: Mode[] }

const MODELES: Modele[] = [
  // ---------- Bloc USA ----------
  { id: "o_bourses", camp: "OCC", v: 1, img: "famille_poussee_ideologique", titre: ["Bourses d'excellence"], texte: ["Des milliers d'étudiants de {z} invités dans les universités américaines.", "Programmes de bourses et campus délocalisés en {z}."],
    modes: [{ n: "Programme régional", c: [1, 0], e: [["i", "Z", "J", "c", 3]] }, { n: "Élites ciblées", c: [1, 1], e: [["i", "F", "J", "c", 5], ["i", "F", "J", "p", 2]] }] },
  { id: "o_marines", camp: "OCC", v: 3, img: "famille_incident_militaire", titre: ["Escale de la flotte"], texte: ["Un groupe aéronaval fait escale dans les ports de {z}.", "Démonstration de force navale au large de {z}."],
    modes: [{ n: "Escale amicale", c: [1, 0], e: [["i", "F", "J", "m", 5], ["t", 1]] }, { n: "Démonstration de force", c: [2, 1], e: [["i", "Z", "J", "m", 4], ["i", "Z", "A", "m", -2], ["t", 3]], h: [0.3, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "o_dette", camp: "OCC", v: 2, img: "famille_defaut_souverain", titre: ["Allègement de dette"], texte: ["Le Club de Paris efface une partie de la dette de {z}.", "Restructuration de dette sous l'égide du FMI pour {z}."],
    modes: [{ n: "Effacement partiel", c: [2, 1], e: [["i", "F", "J", "e", 5], ["g", "F", 0.3, 4]] }, { n: "Sous conditions", c: [1, 0], e: [["i", "F", "J", "e", 4], ["s", "F", -1]], h: [0.3, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "o_medias", camp: "OCC", v: 1, img: "famille_poussee_ideologique", titre: ["Radios et chaînes internationales"], texte: ["Émissions en langues locales diffusées en {z}.", "Plateformes numériques et médias en ligne financés en {z}."],
    modes: [{ n: "Diffuser", c: [1, 0], e: [["i", "Z", "J", "c", 2], ["i", "Z", "J", "p", 1]] }] },
  { id: "o_sante", camp: "OCC", v: 2, img: "famille_epidemie", titre: ["Plan sanitaire d'urgence"], texte: ["Médicaments et dispensaires financés en {z}.", "Vaccins et laboratoires mobiles envoyés en {z}."],
    modes: [{ n: "Aide sanitaire", c: [2, 0], e: [["i", "Z", "J", "c", 2], ["i", "Z", "J", "p", 2], ["s", "Z", 1]] }] },
  { id: "o_libre_ech_reg", camp: "OCC", v: 3, img: "famille_accord_commercial", titre: ["Accord commercial régional"], texte: ["Washington propose un accord de libre-échange aux pays de {z}.", "Un partenariat commercial de nouvelle génération est proposé à {z}."],
    modes: [{ n: "Négocier", c: [1, 2], e: [["i", "Z", "J", "e", 3], ["g", "Z", 0.15, 8]], h: [0.25, [["cp", "J", -2]], 2] }, { n: "Accord ambitieux", c: [2, 3], e: [["i", "Z", "J", "e", 5], ["g", "Z", 0.25, 8], ["i", "Z", "A", "e", -2]] }] },
  { id: "o_armes_reg", camp: "OCC", v: 2, img: "famille_incident_militaire", titre: ["Contrats d'armement"], texte: ["Les industriels américains signent des contrats en {z}.", "Avions de combat et systèmes antimissiles vendus en {z}."],
    modes: [{ n: "Vendre", c: [0, 1], e: [["i", "F", "J", "m", 5], ["b", "J", 1], ["t", 1]] }] },
  { id: "o_antiterror", camp: "OCC", v: 2, img: "famille_guerre_interetatique", titre: ["Coopération antiterroriste"], texte: ["Formation des forces spéciales et partage de renseignement en {z}.", "Frappes de drones et conseillers militaires déployés en {z}."],
    modes: [{ n: "Former", c: [1, 0], e: [["i", "F", "J", "m", 4], ["s", "F", 1]] }, { n: "Frapper", c: [2, 1], e: [["i", "F", "J", "m", 6], ["t", 2]], h: [0.35, [["i", "F", "J", "p", -4], ["s", "F", -2]], 1] }] },
  { id: "o_ong", camp: "OCC", v: 2, img: "famille_manifestations", titre: ["Fondations et ONG"], texte: ["Des fondations financent la société civile en {z}.", "Observateurs électoraux et journalistes indépendants soutenus en {z}."],
    modes: [{ n: "Soutenir", c: [1, 0], e: [["i", "Z", "J", "p", 2], ["i", "Z", "J", "c", 1]] }, { n: "Mobiliser", c: [1, 1], e: [["i", "F", "J", "p", 5], ["s", "F", -2]], h: [0.3, [["i", "F", "A", "p", 3]], 1] }] },
  { id: "o_dollar", camp: "OCC", v: 3, img: "famille_crise_change", titre: ["Parapluie du dollar"], texte: ["La Réserve fédérale ouvre des lignes de crédit aux banques de {z}.", "Accords de change en dollars pour stabiliser {z}."],
    modes: [{ n: "Ouvrir les lignes", c: [0, 2], e: [["i", "F", "J", "e", 5], ["s", "F", 2]] }] },
  { id: "o_tech", camp: "OCC", v: 2, img: "famille_exploit_spatial", titre: ["Géants du numérique"], texte: ["Moteurs de recherche et logiciels américains s'imposent en {z}.", "Câbles sous-marins, cloud et réseaux sociaux américains en {z}."],
    modes: [{ n: "S'implanter", c: [1, 0], e: [["i", "Z", "J", "e", 2], ["i", "Z", "J", "c", 2]] }] },
  { id: "o_alliance", camp: "OCC", v: 4, img: "famille_traite_majeur", titre: ["Pacte de sécurité régional"], texte: ["Washington réunit ses partenaires de {z} dans un pacte de défense.", "Nouvelle architecture de sécurité avec les partenaires de {z}."],
    modes: [{ n: "Signer", c: [2, 3], e: [["i", "F", "J", "m", 7], ["i", "F", "J", "p", 4], ["t", 3]], h: [0.3, [["i", "Z", "A", "p", 2]], 1] }] },
  { id: "o_sanction_reg", camp: "OCC", v: 3, img: "famille_sanctions_embargo", titre: ["Sanctions ciblées"], texte: ["Gel d'avoirs visant des dirigeants proches du rival en {z}.", "Sanctions secondaires contre les entreprises qui commercent avec le rival en {z}."],
    modes: [{ n: "Sanctionner", c: [0, 2], e: [["i", "F", "A", "e", -4], ["g", "F", -0.2, 4], ["t", 2]], h: [0.35, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "o_diaspora", camp: "OCC", v: 1, img: "famille_reconciliation", titre: ["Diasporas"], texte: ["Les communautés de {z} établies aux États-Unis font pont avec leurs pays.", "Transferts d'argent et réseaux de la diaspora de {z}."],
    modes: [{ n: "S'appuyer sur elles", c: [0, 1], e: [["i", "F", "J", "c", 4], ["i", "F", "J", "e", 2]] }] },
  { id: "o_energie", camp: "OCC", v: 3, img: "famille_gisement_geant", titre: ["Majors pétrolières"], texte: ["Les compagnies américaines obtiennent des licences en {z}.", "Gaz naturel liquéfié américain proposé aux pays de {z}."],
    modes: [{ n: "Licences", c: [2, 0], e: [["i", "F", "J", "e", 6], ["co2", "F", 1, 8]], h: [0.25, [["s", "F", -2]], 3] }] },
  { id: "o_peace", camp: "OCC", v: 2, img: "famille_reconciliation", titre: ["Médiation américaine"], texte: ["Un envoyé spécial tente d'apaiser un conflit en {z}.", "Washington parraine des accords de normalisation en {z}."],
    modes: [{ n: "Médiation", c: [0, 2], e: [["s", "F", 2], ["i", "F", "J", "p", 3], ["t", -1]] }] },
  { id: "o_infra_alt", camp: "OCC", v: 3, img: "famille_accord_commercial", titre: ["Infrastructures de confiance"], texte: ["Prêts de la Banque mondiale pour des routes et des centrales en {z}.", "Partenariat mondial pour les infrastructures, alternative aux prêts chinois, en {z}."],
    modes: [{ n: "Financer", c: [3, 0], e: [["i", "F", "J", "e", 5], ["g", "F", 0.3, 8]] }] },
  { id: "o_cyber", camp: "OCC", v: 2, img: "famille_incident_militaire", titre: ["Écoutes et cyber-renseignement"], texte: ["Les services interceptent les communications des élites de {z}.", "Opération cyber contre les réseaux du rival en {z}."],
    modes: [{ n: "Écouter", c: [1, 0], e: [["i", "F", "A", "p", -3], ["b", "J", 1]], h: [0.3, [["cp", "J", -3], ["i", "F", "J", "p", -4]], 1] }] },
  { id: "o_visas", camp: "OCC", v: 1, img: "famille_crise_migratoire", titre: ["Visas et immigration choisie"], texte: ["Programme de visas facilités pour les diplômés de {z}.", "Loterie de cartes vertes élargie aux pays de {z}."],
    modes: [{ n: "Ouvrir", c: [0, 1], e: [["i", "Z", "J", "c", 3]], h: [0.25, [["cp", "J", -2]], 1] }] },
  { id: "o_bases_reg", camp: "OCC", v: 4, img: "famille_incident_militaire", titre: ["Accords d'accès militaire"], texte: ["Accès aux ports et aux aéroports de {z} pour les forces américaines.", "Rotations de troupes et prépositionnement de matériel en {z}."],
    modes: [{ n: "Négocier l'accès", c: [2, 2], e: [["i", "F", "J", "m", 8], ["t", 2], ["i", "F", "A", "m", -3]], h: [0.3, [["s", "F", -2]], 2] }] },
  // ---------- Bloc Chine ----------
  { id: "c_instituts", camp: "CHN", v: 1, img: "famille_poussee_ideologique", titre: ["Instituts Confucius"], texte: ["Cours de mandarin et bourses pour les étudiants de {z}.", "Réseau d'instituts Confucius et chaînes CGTN en {z}."],
    modes: [{ n: "Programme régional", c: [1, 0], e: [["i", "Z", "J", "c", 3]] }, { n: "Élites ciblées", c: [1, 1], e: [["i", "F", "J", "c", 5], ["i", "F", "J", "p", 2]] }] },
  { id: "c_marine", camp: "CHN", v: 3, img: "famille_incident_militaire", titre: ["Escale de la marine chinoise"], texte: ["Des navires chinois escortent les convois au large de {z}.", "Exercices navals chinois dans les eaux de {z}."],
    modes: [{ n: "Escale amicale", c: [1, 0], e: [["i", "F", "J", "m", 5], ["t", 1]] }, { n: "Démonstration de force", c: [2, 1], e: [["i", "Z", "J", "m", 4], ["i", "Z", "A", "m", -2], ["t", 3]], h: [0.3, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "c_pret", camp: "CHN", v: 2, img: "famille_defaut_souverain", titre: ["Prêts adossés aux ressources"], texte: ["La banque d'import-export chinoise prête aux pays de {z}, remboursés en matières premières.", "Prêts chinois renégociés pour les pays endettés de {z}."],
    modes: [{ n: "Prêter", c: [2, 1], e: [["i", "F", "J", "e", 5], ["g", "F", 0.3, 4]] }, { n: "Sous garanties", c: [1, 0], e: [["i", "F", "J", "e", 4], ["s", "F", -1]], h: [0.3, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "c_medias", camp: "CHN", v: 1, img: "famille_poussee_ideologique", titre: ["Médias et télévision par satellite"], texte: ["Bouquets satellite à bas prix et programmes chinois en {z}.", "Accords d'échanges de contenus avec les médias de {z}."],
    modes: [{ n: "Diffuser", c: [1, 0], e: [["i", "Z", "J", "c", 2], ["i", "Z", "J", "p", 1]] }] },
  { id: "c_sante", camp: "CHN", v: 2, img: "famille_epidemie", titre: ["Équipes médicales chinoises"], texte: ["Hôpitaux et équipes médicales chinoises en {z}.", "Diplomatie sanitaire : vaccins et masques livrés en {z}."],
    modes: [{ n: "Aide sanitaire", c: [2, 0], e: [["i", "Z", "J", "c", 2], ["i", "Z", "J", "p", 2], ["s", "Z", 1]] }] },
  { id: "c_commerce_reg", camp: "CHN", v: 3, img: "famille_accord_commercial", titre: ["Zone de libre-échange"], texte: ["Pékin propose une zone de libre-échange aux pays de {z}.", "Partenariat économique régional proposé à {z}."],
    modes: [{ n: "Négocier", c: [1, 2], e: [["i", "Z", "J", "e", 3], ["g", "Z", 0.15, 8]], h: [0.25, [["cp", "J", -2]], 2] }, { n: "Accord ambitieux", c: [2, 3], e: [["i", "Z", "J", "e", 5], ["g", "Z", 0.25, 8], ["i", "Z", "A", "e", -2]] }] },
  { id: "c_armes_reg", camp: "CHN", v: 2, img: "famille_incident_militaire", titre: ["Armement à bas prix"], texte: ["Blindés et drones chinois vendus en {z}.", "Drones armés et systèmes de défense chinois en {z}."],
    modes: [{ n: "Vendre", c: [0, 1], e: [["i", "F", "J", "m", 5], ["b", "J", 1], ["t", 1]] }] },
  { id: "c_securite", camp: "CHN", v: 2, img: "famille_guerre_interetatique", titre: ["Coopération policière"], texte: ["Formation des polices et équipements de surveillance pour {z}.", "Villes sûres : caméras et centres de commandement chinois en {z}."],
    modes: [{ n: "Former", c: [1, 0], e: [["i", "F", "J", "m", 4], ["s", "F", 1]] }, { n: "Équiper", c: [2, 1], e: [["i", "F", "J", "m", 6], ["i", "F", "J", "p", 2]], h: [0.35, [["i", "F", "J", "c", -4]], 1] }] },
  { id: "c_partis", camp: "CHN", v: 2, img: "famille_manifestations", titre: ["Écoles de cadres"], texte: ["Les partis au pouvoir de {z} envoient leurs cadres se former en Chine.", "Le département international du Parti invite les partis de {z}."],
    modes: [{ n: "Inviter", c: [1, 0], e: [["i", "Z", "J", "p", 2], ["i", "Z", "J", "c", 1]] }, { n: "Soutenir le pouvoir", c: [1, 1], e: [["i", "F", "J", "p", 5], ["s", "F", 1]], h: [0.3, [["i", "F", "A", "p", 3]], 1] }] },
  { id: "c_yuan", camp: "CHN", v: 3, img: "famille_crise_change", titre: ["Swaps en yuans"], texte: ["La Banque populaire de Chine signe des accords de change avec {z}.", "Règlements en yuans et système de paiement chinois proposés à {z}."],
    modes: [{ n: "Signer", c: [0, 2], e: [["i", "F", "J", "e", 5], ["s", "F", 2]] }] },
  { id: "c_telecom", camp: "CHN", v: 2, img: "famille_exploit_spatial", titre: ["Réseaux télécoms"], texte: ["Les équipementiers chinois câblent les réseaux de {z}.", "Réseaux 5G, smartphones et paiement mobile chinois en {z}."],
    modes: [{ n: "S'implanter", c: [1, 0], e: [["i", "Z", "J", "e", 2], ["i", "Z", "J", "c", 2]] }] },
  { id: "c_forum", camp: "CHN", v: 4, img: "famille_traite_majeur", titre: ["Forum de coopération"], texte: ["Pékin réunit les dirigeants de {z} pour un forum de coopération.", "Sommet entre la Chine et les pays de {z} : partenariats stratégiques globaux."],
    modes: [{ n: "Réunir", c: [2, 3], e: [["i", "F", "J", "p", 7], ["i", "F", "J", "e", 4], ["t", 1]], h: [0.3, [["i", "Z", "A", "p", 2]], 1] }] },
  { id: "c_represailles", camp: "CHN", v: 3, img: "famille_sanctions_embargo", titre: ["Représailles commerciales"], texte: ["Pékin suspend ses importations d'un pays de {z} qui l'a froissé.", "Boycott ciblé et contrôles sanitaires sur les produits de {z}."],
    modes: [{ n: "Suspendre", c: [0, 2], e: [["i", "F", "A", "e", -4], ["g", "F", -0.2, 4], ["t", 2]], h: [0.35, [["i", "F", "J", "p", -3]], 2] }] },
  { id: "c_diaspora", camp: "CHN", v: 1, img: "famille_reconciliation", titre: ["Communautés chinoises"], texte: ["Commerçants et entrepreneurs chinois installés en {z}.", "Associations et chambres de commerce chinoises de {z}."],
    modes: [{ n: "S'appuyer sur elles", c: [0, 1], e: [["i", "F", "J", "c", 2], ["i", "F", "J", "e", 4]] }] },
  { id: "c_ressources", camp: "CHN", v: 3, img: "famille_gisement_geant", titre: ["Mines et pétrole"], texte: ["Les groupes publics chinois rachètent des concessions en {z}.", "Métaux critiques : les groupes chinois sécurisent les gisements de {z}."],
    modes: [{ n: "Racheter", c: [2, 0], e: [["i", "F", "J", "e", 6], ["co2", "F", 1, 8]], h: [0.25, [["s", "F", -2]], 3] }] },
  { id: "c_mediation", camp: "CHN", v: 2, img: "famille_reconciliation", titre: ["Médiation chinoise"], texte: ["Pékin propose ses bons offices dans un différend en {z}.", "La Chine parraine un rapprochement entre rivaux de {z}."],
    modes: [{ n: "Médiation", c: [0, 2], e: [["s", "F", 2], ["i", "F", "J", "p", 3], ["t", -1]] }] },
  { id: "c_routes", camp: "CHN", v: 3, img: "famille_accord_commercial", titre: ["Grands chantiers chinois", "Routes de la soie"], texte: ["Des entreprises chinoises bâtissent routes, stades et barrages en {z}.", "Ports, voies ferrées et zones industrielles des nouvelles routes de la soie en {z}."],
    modes: [{ n: "Financer", c: [3, 0], e: [["i", "F", "J", "e", 5], ["g", "F", 0.3, 8]] }] },
  { id: "c_cyber", camp: "CHN", v: 2, img: "famille_incident_militaire", titre: ["Cyber-espionnage"], texte: ["Des pirates informatiques visent les ministères de {z}.", "Intrusions dans les réseaux des partenaires du rival en {z}."],
    modes: [{ n: "Infiltrer", c: [1, 0], e: [["i", "F", "A", "p", -3], ["b", "J", 1]], h: [0.3, [["cp", "J", -3], ["i", "F", "J", "p", -4]], 1] }] },
  { id: "c_tourisme", camp: "CHN", v: 1, img: "famille_crise_migratoire", titre: ["Touristes et étudiants chinois"], texte: ["Statut de destination agréée : les touristes chinois arrivent en {z}.", "Vols directs et visas facilités entre la Chine et {z}."],
    modes: [{ n: "Ouvrir", c: [0, 1], e: [["i", "Z", "J", "c", 1], ["i", "Z", "J", "e", 2]], h: [0.25, [["cp", "J", -2]], 1] }] },
  { id: "c_ports", camp: "CHN", v: 4, img: "famille_incident_militaire", titre: ["Ports à double usage"], texte: ["Des ports commerciaux chinois en {z} peuvent accueillir la marine.", "Base logistique et escales militaires chinoises en {z}."],
    modes: [{ n: "Négocier l'accès", c: [2, 2], e: [["i", "F", "J", "m", 8], ["t", 2], ["i", "F", "A", "m", -3]], h: [0.3, [["s", "F", -2]], 2] }] },
  // ---------- Neutres ----------
  { id: "n_secheresse", camp: "NEUTRE", v: 2, img: "famille_epidemie", titre: ["Sécheresse"], texte: ["Les pluies manquent : récoltes perdues en {z}.", "Une sécheresse historique frappe {z}."],
    modes: [{ n: "Aide alimentaire", c: [2, 0], e: [["s", "F", 2], ["i", "F", "J", "p", 3]] }, { n: "Laisser faire", c: [0, 0], e: [["s", "F", -3], ["g", "F", -0.3, 4]] }] },
  { id: "n_inondations", camp: "NEUTRE", v: 2, img: "famille_epidemie", titre: ["Inondations"], texte: ["Crues meurtrières en {z}.", "Des pluies extrêmes noient des villes entières en {z}."],
    modes: [{ n: "Secours", c: [2, 0], e: [["s", "F", 2], ["i", "F", "J", "c", 3]] }, { n: "Laisser faire", c: [0, 0], e: [["s", "F", -2]] }] },
  { id: "n_coup", camp: "NEUTRE", v: 3, img: "famille_election_rupture", titre: ["Coup d'État militaire"], texte: ["Une junte prend le pouvoir dans un pays de {z}.", "Des officiers renversent un président élu en {z}."],
    modes: [{ n: "Reconnaître la junte", c: [0, 1], e: [["i", "F", "J", "m", 4], ["i", "F", "J", "c", -3], ["s", "F", -3]] }, { n: "Exiger le retour des civils", c: [0, 2], e: [["i", "F", "J", "c", 3], ["i", "F", "J", "m", -2], ["s", "F", -2]] }] },
  { id: "n_election", camp: "NEUTRE", v: 2, img: "famille_election_rupture", titre: ["Élection disputée"], texte: ["Une élection serrée divise un pays de {z}.", "Résultats contestés et manifestations dans un pays de {z}."],
    modes: [{ n: "Soutenir le sortant", c: [0, 1], e: [["i", "F", "J", "p", 4], ["s", "F", 1]] }, { n: "Soutenir l'opposition", c: [1, 1], e: [["i", "F", "J", "p", 5], ["s", "F", -3]], h: [0.4, [["i", "F", "J", "p", -6]], 1] }] },
  { id: "n_matieres", camp: "NEUTRE", v: 2, img: "famille_choc_petrolier", titre: ["Envolée des matières premières"], texte: ["Les cours des matières premières flambent : {z} encaisse.", "Super-cycle des métaux et de l'énergie : {z} profite."],
    modes: [{ n: "Acheter malgré tout", c: [2, 0], e: [["i", "F", "J", "e", 4], ["g", "F", 0.3, 4]] }, { n: "Laisser le marché", c: [0, 0], e: [["g", "F", 0.2, 4]] }] },
  { id: "n_krach", camp: "NEUTRE", v: 3, img: "famille_krach_boursier", titre: ["Panique financière régionale"], texte: ["Les capitaux fuient les places financières de {z}.", "Effondrement de monnaies et de bourses en {z}."],
    modes: [{ n: "Plan de sauvetage", c: [3, 1], e: [["s", "F", 3], ["i", "F", "J", "e", 5]] }, { n: "Laisser faire", c: [0, 0], e: [["g", "F", -0.5, 4], ["s", "F", -3]] }] },
  { id: "n_refugies", camp: "NEUTRE", v: 2, img: "famille_crise_migratoire", titre: ["Afflux de réfugiés"], texte: ["Des centaines de milliers de déplacés traversent les frontières de {z}.", "Crise migratoire aux portes de {z}."],
    modes: [{ n: "Financer l'accueil", c: [2, 0], e: [["s", "F", 2], ["i", "F", "J", "p", 3]] }, { n: "Fermer les yeux", c: [0, 0], e: [["s", "F", -3]] }] },
  { id: "n_epidemie", camp: "NEUTRE", v: 3, img: "famille_epidemie", titre: ["Épidémie"], texte: ["Une épidémie se propage en {z}.", "Un virus inconnu se répand en {z}."],
    modes: [{ n: "Envoyer des équipes", c: [2, 0], e: [["s", "Z", 1], ["i", "Z", "J", "c", 2]] }, { n: "Fermer les frontières", c: [0, 1], e: [["g", "Z", -0.2, 2], ["i", "Z", "J", "p", -1]] }] },
  { id: "n_separatisme", camp: "NEUTRE", v: 3, img: "famille_conflit_frontalier", titre: ["Poussée séparatiste"], texte: ["Une région réclame son indépendance dans un pays de {z}.", "Référendum séparatiste contesté en {z}."],
    modes: [{ n: "Défendre l'unité", c: [1, 1], e: [["i", "F", "J", "p", 4], ["s", "F", 1]] }, { n: "Soutenir les séparatistes", c: [1, 2], e: [["s", "F", -4], ["i", "F", "A", "p", -3], ["t", 2]], h: [0.35, [["cp", "J", -3]], 1] }] },
  { id: "n_frontiere", camp: "NEUTRE", v: 3, img: "famille_conflit_frontalier", titre: ["Incident frontalier"], texte: ["Échanges de tirs à une frontière de {z}.", "Escarmouches meurtrières sur une frontière disputée de {z}."],
    modes: [{ n: "Appeler au calme", c: [0, 1], e: [["s", "F", 2], ["t", -1]] }, { n: "Armer un camp", c: [1, 0], e: [["i", "F", "J", "m", 5], ["s", "F", -2], ["t", 2]] }] },
  { id: "n_gisement", camp: "NEUTRE", v: 2, img: "famille_gisement_geant", titre: ["Découverte d'un gisement"], texte: ["Un gisement géant est découvert en {z}.", "Lithium, gaz ou terres rares : une découverte majeure en {z}."],
    modes: [{ n: "Obtenir la concession", c: [2, 1], e: [["i", "F", "J", "e", 6], ["co2", "F", 1, 8]] }, { n: "Laisser l'exploiter seul", c: [0, 0], e: [["g", "F", 0.3, 8]] }] },
  { id: "n_nationalisation", camp: "NEUTRE", v: 2, img: "famille_nationalisation", titre: ["Nationalisations"], texte: ["Un gouvernement de {z} nationalise ses ressources.", "Un pays de {z} reprend le contrôle de ses mines."],
    modes: [{ n: "Négocier", c: [1, 1], e: [["i", "F", "J", "e", 3]] }, { n: "Condamner", c: [0, 1], e: [["i", "F", "J", "e", -2], ["i", "F", "A", "e", -2], ["t", 1]] }] },
  { id: "n_climat", camp: "NEUTRE", v: 2, img: "famille_traite_majeur", titre: ["Fonds climat régional"], texte: ["Les pays de {z} réclament de l'aide face au climat.", "Fonds pertes et dommages pour {z}."],
    modes: [{ n: "Contribuer", c: [3, 0], e: [["co2", "Z", -1, 8], ["i", "Z", "J", "c", 2], ["i", "Z", "J", "p", 1]] }, { n: "Promettre", c: [0, 1], e: [["i", "Z", "J", "p", 1]], h: [0.4, [["i", "Z", "J", "p", -2]], 4] }] },
  { id: "n_corruption", camp: "NEUTRE", v: 2, img: "famille_manifestations", titre: ["Scandale de corruption"], texte: ["Un scandale de corruption secoue un gouvernement de {z}.", "Fuites de documents : des dirigeants de {z} mis en cause."],
    modes: [{ n: "Lâcher le gouvernement", c: [0, 1], e: [["i", "F", "J", "c", 3], ["s", "F", -2]] }, { n: "Le soutenir", c: [1, 0], e: [["i", "F", "J", "p", 3], ["i", "F", "J", "c", -2]] }] },
  { id: "n_piraterie", camp: "NEUTRE", v: 2, img: "famille_incident_militaire", titre: ["Piraterie et trafics"], texte: ["Pirates et trafiquants menacent les routes maritimes de {z}.", "Attaques contre des navires marchands au large de {z}."],
    modes: [{ n: "Patrouiller", c: [2, 0], e: [["i", "F", "J", "m", 4], ["s", "F", 1]] }, { n: "Ignorer", c: [0, 0], e: [["g", "F", -0.2, 4]] }] },
  { id: "n_sommet", camp: "NEUTRE", v: 1, img: "famille_traite_majeur", titre: ["Sommet régional"], texte: ["Les dirigeants de {z} se réunissent en sommet.", "Sommet régional : les pays de {z} veulent peser."],
    modes: [{ n: "Envoyer une délégation", c: [0, 1], e: [["i", "Z", "J", "p", 2]] }, { n: "Bouder", c: [0, 0], e: [["cp", "J", 1], ["i", "Z", "J", "p", -1]] }] },
  { id: "n_famine", camp: "NEUTRE", v: 3, img: "famille_epidemie", titre: ["Flambée des prix alimentaires"], texte: ["Le prix du pain et du riz explose en {z}.", "Émeutes de la faim en {z}."],
    modes: [{ n: "Livrer des céréales", c: [2, 0], e: [["s", "Z", 2], ["i", "Z", "J", "p", 2]] }, { n: "Laisser faire", c: [0, 0], e: [["s", "Z", -2]] }] },
  { id: "n_jeunesse", camp: "NEUTRE", v: 2, img: "famille_manifestations", titre: ["Révolte de la jeunesse"], texte: ["Des étudiants manifestent contre le chômage en {z}.", "Mobilisations massives organisées en ligne en {z}."],
    modes: [{ n: "Soutenir la rue", c: [1, 1], e: [["i", "F", "J", "c", 4], ["s", "F", -3]] }, { n: "Soutenir l'ordre", c: [1, 0], e: [["i", "F", "J", "p", 3], ["i", "F", "J", "c", -2], ["s", "F", 1]] }] },
  { id: "n_cables", camp: "NEUTRE", v: 2, img: "famille_exploit_spatial", titre: ["Câbles et satellites"], texte: ["Appel d'offres pour relier {z} au réseau mondial.", "Constellations de satellites et câbles sous-marins pour {z}."],
    modes: [{ n: "Remporter le marché", c: [2, 1], e: [["i", "F", "J", "e", 4], ["i", "F", "J", "c", 2]] }] },
  { id: "n_change", camp: "NEUTRE", v: 2, img: "famille_crise_change", titre: ["Dévaluation"], texte: ["La monnaie d'un pays de {z} s'effondre.", "Crise de change dans un pays de {z}."],
    modes: [{ n: "Prêter des devises", c: [2, 1], e: [["s", "F", 2], ["i", "F", "J", "e", 4]] }, { n: "Profiter des prix bas", c: [1, 0], e: [["i", "F", "J", "e", 3], ["s", "F", -1]] }] },
  { id: "n_sport", camp: "NEUTRE", v: 1, img: "famille_reconciliation", titre: ["Grand événement sportif"], texte: ["Un pays de {z} accueille une grande compétition internationale.", "Coupe continentale et stades neufs en {z} : qui les finance ?"],
    modes: [{ n: "Financer les stades", c: [2, 0], e: [["i", "F", "J", "c", 4], ["i", "F", "J", "e", 2]] }, { n: "Envoyer des champions", c: [0, 1], e: [["i", "Z", "J", "c", 1]] }] },
];

const C = (z: string, k: Cible) => ZONES[z].pays.slice(0, k === "Z" ? 6 : 3);
function effet(x: Fx, z: string): Effet {
  const J = "$joueur" as const, A = "$adversaire" as const;
  switch (x[0]) {
    case "i": return { type: "influence", pays: C(z, x[1]), camp: x[2] === "J" ? J : A, canal: x[3], valeur: x[4] };
    case "s": return { type: "stabilite", pays: C(z, x[1]), valeur: x[2] };
    case "g": return { type: "croissance", pays: C(z, x[1]), points: x[2], duree: x[3] };
    case "t": return { type: "tension", valeur: x[1] };
    case "cp": return { type: "cp", camp: x[1] === "J" ? J : A, valeur: x[2] };
    case "b": return { type: "budget", camp: x[1] === "J" ? J : A, valeur: x[2] };
    case "co2": return { type: "co2", pays: C(z, x[1]), pourcent: x[2], duree: x[3] };
  }
}
// Formes grammaticales de chaque région : « en … », « de … », « le … ».
const FORMES: Record<string, [string, string, string]> = {
  afrique: ["en Afrique subsaharienne", "d'Afrique subsaharienne", "l'Afrique subsaharienne"],
  moyen_orient: ["au Moyen-Orient et en Afrique du Nord", "du Moyen-Orient et d'Afrique du Nord", "le Moyen-Orient et l'Afrique du Nord"],
  asie_sud_est: ["en Asie du Sud-Est", "d'Asie du Sud-Est", "l'Asie du Sud-Est"],
  amerique_latine: ["en Amérique latine", "d'Amérique latine", "l'Amérique latine"],
  europe: ["en Europe", "d'Europe", "l'Europe"],
  asie_sud_centre: ["en Asie du Sud et en Asie centrale", "d'Asie du Sud et d'Asie centrale", "l'Asie du Sud et l'Asie centrale"],
  asie_est: ["en Asie de l'Est et dans le Pacifique", "d'Asie de l'Est et du Pacifique", "l'Asie de l'Est et le Pacifique"],
};
export function accorder(texte: string, z: string): string {
  const [en, de, le] = FORMES[z];
  return texte.replace(/\ben \{z\}/g, en).replace(/\bde \{z\}/g, de).replace(/\bà \{z\}/g, le.startsWith("le ") ? "au " + le.slice(3) : "à " + le)
    .replace(/^\{z\}/, le[0].toUpperCase() + le.slice(1)).replace(/\{z\}/g, le);
}
function mode(m: Mode, z: string): ModeCarte {
  return { nom: m.n, cout: { ...(m.c[0] ? { budget: m.c[0] } : {}), ...(m.c[1] ? { cp: m.c[1] } : {}) }, effets: m.e.map(x => effet(x, z)),
    ...(m.h ? { caches: [{ probabilite: m.h[0], effets: m.h[1].map(x => ({ ...effet(x, z), delai: m.h![2] ?? 1 })) }] } : {}) };
}
export const IMAGES_GENEREES: Record<string, string> = {};
export const CARTES_GENEREES: Carte[] = MODELES.flatMap(t => Object.keys(ZONES).filter(z => !t.zones || t.zones.includes(z)).flatMap(z => [1, 2].map(ere => {
  const id = `g${ere}_${t.id}_${z}`, nomZ = ZONES[z].nom;
  IMAGES_GENEREES[id] = t.img;
  return { id, camp: t.camp, ere, titre: `${(ere === 2 && t.titre[1]) || t.titre[0]} : ${nomZ}`, texte: accorder(t.texte[ere - 1], z), valeur: t.v, type: "unique" as const, modes: t.modes.map(m => mode(m, z)) };
})));
export const MODELES_CARTES = MODELES.length;
