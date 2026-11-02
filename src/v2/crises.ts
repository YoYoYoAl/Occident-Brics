// Crises de tension (demande du 2 novembre 2026) : « La tension peut générer des événements ou des briefings qui peuvent
// faire envenimer ou non la situation. » Chaque année, plus la tension mondiale est haute, plus une crise risque d'éclater
// dans un foyer chaud. Chaque camp répond (apaiser, fermeté, escalade) sans connaître la réponse adverse : jeu de la poule
// mouillée. Deux apaisements font retomber la tension ; deux escalades l'envenimer, avec un risque d'incident armé.
// Part immédiate (tension, attitude) + part différée (incident l'année suivante) + part cachée (réponse adverse, incident).
// Tous les chiffres sont des estimations. Import circulaire avec moteur.ts : rien de moteur n'est utilisé au chargement.
import type { EtatV2, Camp, Ligne } from "./moteur";
import * as M from "./moteur";

export type Reponse = "apaiser" | "fermete" | "escalade";
export const REPONSES: { id: Reponse; nom: string; aide: string }[] = [
  { id: "apaiser", nom: "Apaiser", aide: "Ligne directe, médiation, retrait d'un navire. Fait baisser la tension si l'adversaire suit ; sinon tu perds la face dans la région." },
  { id: "fermete", nom: "Fermeté", aide: "Tenir ses positions sans tirer. Peu de risque, petit gain si l'adversaire recule." },
  { id: "escalade", nom: "Escalade", aide: "Déployer, menacer, sanctionner (1 ◆ de budget). Gros gain si l'adversaire recule ; incident armé possible s'il escalade aussi." },
];
export interface Foyer { id: string; pays: string[]; titre: string; texte: string; cranMin: number; de?: number }
// Foyers chauds : lieu réel, cause, contexte. cranMin = cran de tension mondiale minimal (1 à 5).
export const FOYERS: Foyer[] = [
  { id: "taiwan", pays: ["TWN", "CHN"], titre: "Incident dans le détroit de Taïwan", texte: "Au large de Kaohsiung, un destroyer et des chasseurs se frôlent pendant un exercice ; chaque capitale accuse l'autre.", cranMin: 1 },
  { id: "scarborough", pays: ["PHL", "CHN", "VNM"], titre: "Face-à-face au récif de Scarborough", texte: "Des garde-côtes bloquent des pêcheurs philippins ; Manille appelle ses alliés.", cranMin: 1 },
  { id: "yeonpyeong", pays: ["KOR", "PRK"], titre: "Tirs d'artillerie près de Yeonpyeong", texte: "Des obus tombent près de l'île sud-coréenne ; Séoul met ses forces en alerte.", cranMin: 1 },
  { id: "cachemire", pays: ["IND", "PAK"], titre: "Accrochage sur la ligne de contrôle au Cachemire", texte: "Un attentat près de Srinagar est suivi de tirs le long de la ligne de contrôle.", cranMin: 1 },
  { id: "ormuz", pays: ["IRN", "ARE", "OMN", "SAU"], titre: "Pétrolier arraisonné dans le détroit d'Ormuz", texte: "Des vedettes rapides saisissent un pétrolier au large de Bandar Abbas ; le cours du brut s'envole.", cranMin: 1 },
  { id: "baltique", pays: ["EST", "LVA", "LTU", "FIN", "RUS"], titre: "Câble sous-marin sectionné en Baltique", texte: "Un câble entre Tallinn et Helsinki est coupé ; un cargo a traîné son ancre sur 100 km.", cranMin: 2, de: 2007 },
  { id: "mer_noire", pays: ["UKR", "ROU", "TUR", "RUS"], titre: "Drone abattu au-dessus de la mer Noire", texte: "Un drone de surveillance est abattu près de Sébastopol ; les marines se font face.", cranMin: 2, de: 2008 },
  { id: "caucase", pays: ["GEO", "ARM", "AZE", "RUS"], titre: "Escarmouches dans le Caucase", texte: "Des tirs éclatent le long de la frontière près de Tskhinvali ; Moscou dit protéger ses ressortissants.", cranMin: 2 },
  { id: "sahel", pays: ["MLI", "NER", "BFA"], titre: "Des mercenaires étrangers à Bamako", texte: "La junte malienne fait venir des combattants privés ; les partenaires occidentaux menacent de partir.", cranMin: 1, de: 2012 },
  { id: "aden", pays: ["SOM", "DJI", "YEM", "EGY"], titre: "Navires attaqués dans le golfe d'Aden", texte: "Des cargos sont visés près de Djibouti ; les assurances maritimes triplent.", cranMin: 1 },
  { id: "essequibo", pays: ["VEN", "GUY", "COL"], titre: "Troupes massées près de l'Essequibo", texte: "Caracas déploie des blindés à la frontière du Guyana, riche en pétrole.", cranMin: 2, de: 2015 },
  { id: "arctique", pays: ["NOR", "CAN", "RUS"], titre: "Bombardiers près de l'espace aérien norvégien", texte: "Des bombardiers longent la côte au nord de Tromsø ; des chasseurs décollent en urgence.", cranMin: 2 },
  { id: "senkaku", pays: ["JPN", "CHN"], titre: "Garde-côtes aux îles Senkaku", texte: "Des navires entrent dans les eaux disputées au large d'Okinawa ; Tokyo convoque l'ambassadeur.", cranMin: 1 },
  { id: "ladakh", pays: ["IND", "CHN"], titre: "Patrouilles face à face au Ladakh", texte: "Des soldats s'affrontent à mains nues dans la vallée de la Galwan, à 4 300 m d'altitude.", cranMin: 2 },
  { id: "golan", pays: ["SYR", "ISR", "LBN", "TUR"], titre: "Frappes croisées près du Golan", texte: "Des roquettes tombent en Galilée ; l'aviation riposte au sud de Damas.", cranMin: 1 },
  { id: "guinee", pays: ["NGA", "GHA", "CIV"], titre: "Plateforme attaquée dans le golfe de Guinée", texte: "Des pirates prennent d'assaut une plateforme au large de Port Harcourt ; deux marines proposent leur aide.", cranMin: 1 },
  { id: "balkans", pays: ["SRB", "BIH"], titre: "Barricades dans le nord du Kosovo", texte: "Des barricades se dressent près de Mitrovica ; Belgrade met l'armée en alerte.", cranMin: 2 },
  { id: "bielorussie", pays: ["POL", "BLR", "LTU"], titre: "Crise à la frontière polono-biélorusse", texte: "Des milliers de migrants sont poussés vers les barbelés près de Kuźnica ; Varsovie dénonce une manœuvre.", cranMin: 2, de: 2010 },
];
export const CRISE = {
  base: 0.1, parTension: 0.05, max: 0.7,                           // probabilité annuelle d'une crise : 10 % + 5 points par point de tension (20 % à 2, 40 % à 6, 60 % à 10)
  coutEscalade: 1,                                                  // ◆ de budget
  // gains d'attitude (points) dans les pays du foyer et variation de tension (échelle 0-10), selon les deux réponses
  issues: {
    "apaiser|apaiser": { t: -1.0, moi: 1, lui: 1, stab: 2 },
    "apaiser|fermete": { t: -0.3, moi: -2, lui: 3, stab: 0 },
    "apaiser|escalade": { t: 0.4, moi: -4, lui: 6, stab: -2 },
    "fermete|fermete": { t: 0.3, moi: 0, lui: 0, stab: -1 },
    "fermete|escalade": { t: 1.0, moi: 1, lui: 2, stab: -3 },
    "escalade|escalade": { t: 1.8, moi: 0, lui: 0, stab: -6 },
  } as Record<string, { t: number; moi: number; lui: number; stab: number }>,
  incident: { fermeteEscalade: 0.15, escaladeEscalade: 0.5, pib: -0.6, stab: -6, tension: 0.8 }, // incident armé l'année suivante
  gravite: [0.7, 1, 1.4],                                           // multiplicateur selon la gravité (1 à 3)
};
export interface Crise { foyer: string; titre: string; texte: string; pays: string[]; gravite: 1 | 2 | 3; annee: number; forcee?: boolean;
  reponses: Partial<Record<Camp, Reponse>>; penchant: Record<Camp, Record<Reponse, number>>; lignes?: Ligne[]; issue?: string }
export interface Incident { annee: number; foyer: string; titre: string; pays: string[] }

export const probaCrise = (tension: number) => Math.min(CRISE.max, CRISE.base + CRISE.parTension * tension);

// Penchant de l'IA d'un camp : traits du dirigeant et niveau de tension (part prévisible, montrée par le renseignement).
export function penchant(e: EtatV2, c: Camp): Record<Reponse, number> {
  const tr = e.dirigeants[c]?.traits ?? [];
  let a = 0.35, f = 0.4, s = 0.25;
  if (tr.some(t => ["belliciste", "impulsif", "colerique", "nationaliste", "autoritaire"].includes(t))) { s += 0.2; a -= 0.1; f -= 0.1; }
  if (tr.some(t => ["pacificateur", "prudent", "negociateur", "multilateraliste"].includes(t))) { a += 0.2; s -= 0.1; f -= 0.1; }
  if (e.tension >= 7) { a += 0.15; s -= 0.1; f -= 0.05; } // au bord du gouffre, on recule plus souvent
  if (e.budget[c] < CRISE.coutEscalade) { a += s / 2; f += s / 2; s = 0; }
  const n = Math.max(0, a) + Math.max(0, f) + Math.max(0, s);
  return { apaiser: Math.max(0, a) / n, fermete: Math.max(0, f) / n, escalade: Math.max(0, s) / n };
}
function choisir(e: EtatV2, p: Record<Reponse, number>): Reponse { const x = M.tirer(e); return x < p.apaiser ? "apaiser" : x < p.apaiser + p.fermete ? "fermete" : "escalade"; }

// Tirage de la crise de l'année (au plus une), dans un foyer ouvert à ce cran de tension. force : maquette d'une année.
export function tirerCrise(e: EtatV2, force = false): Crise | undefined {
  e.crise = undefined;
  if (!force && M.tirer(e) >= probaCrise(e.tension)) return undefined;
  const cran = M.cranV2(e), ouverts = FOYERS.filter(f => f.cranMin <= cran && (f.de ?? 0) <= e.annee && f.pays.every(i => e.pays[i]));
  if (!ouverts.length) return undefined;
  const f = ouverts[Math.floor(M.tirer(e) * ouverts.length)];
  const gravite = (1 + (e.tension >= 5 ? 1 : 0) + (e.tension >= 8 && M.tirer(e) < 0.5 ? 1 : 0)) as 1 | 2 | 3;
  e.crise = { foyer: f.id, titre: f.titre, texte: f.texte, pays: f.pays, gravite, annee: e.annee, forcee: force || undefined, reponses: {}, penchant: { OCC: penchant(e, "OCC"), CHN: penchant(e, "CHN") } };
  return e.crise;
}

// Réponse d'un camp ; la crise se résout dès que les deux camps ont répondu (l'IA répond pour le camp qui n'a rien choisi).
export function repondre(e: EtatV2, c: Camp, r: Reponse) { if (e.crise && !e.crise.issue) e.crise.reponses[c] = r; }
export function resoudreCrise(e: EtatV2): Ligne[] {
  const k = e.crise; if (!k || k.issue) return k?.lignes ?? [];
  for (const c of ["OCC", "CHN"] as Camp[]) if (!k.reponses[c]) k.reponses[c] = choisir(e, k.penchant[c]);
  const ro = k.reponses.OCC!, rc = k.reponses.CHN!, g = CRISE.gravite[k.gravite - 1];
  const ordre: Reponse[] = ["apaiser", "fermete", "escalade"];
  const [a, b] = ordre.indexOf(ro) <= ordre.indexOf(rc) ? [ro, rc] : [rc, ro];
  const is = CRISE.issues[`${a}|${b}`], premier: Camp = a === ro ? "OCC" : "CHN"; // « moi » = camp de la réponse la plus douce
  const gain: Record<Camp, number> = { OCC: 0, CHN: 0 }; gain[premier] = is.moi; gain[M.autre(premier)] = is.lui;
  if (a === b) { gain.OCC = is.moi; gain.CHN = is.lui; }
  const lignes: Ligne[] = [];
  for (const c of ["OCC", "CHN"] as Camp[]) {
    if (k.reponses[c] === "escalade") { e.budget[c] = Math.max(0, e.budget[c] - CRISE.coutEscalade); }
    const v = gain[c] * g; if (!v) continue;
    for (const iso of k.pays) if (iso !== M.LEADER.OCC && iso !== M.LEADER.CHN) e.pays[iso].att[c] = M.borne(e.pays[iso].att[c] + v);
    lignes.push({ texte: `Attitude de la région envers ${M.NOM_CAMP[c]} ${v > 0 ? "+" : ""}${fr(v)}`, camp: c, pays: k.pays[0], signe: v > 0 ? 1 : -1 });
  }
  const dt = is.t * g; e.tension = M.borne(e.tension + dt, 0, 10);
  lignes.push({ texte: `Tension mondiale ${dt > 0 ? "+" : ""}${fr(dt)}`, signe: dt > 0 ? -1 : 1 });
  if (is.stab) { for (const iso of k.pays) e.pays[iso].stabilite = M.borne(e.pays[iso].stabilite + is.stab * g, 0, 100); lignes.push({ texte: `Stabilité de la région ${is.stab > 0 ? "+" : ""}${fr(is.stab * g)}`, pays: k.pays[0], signe: is.stab > 0 ? 1 : -1 }); }
  const pInc = a === "escalade" ? CRISE.incident.escaladeEscalade : a === "fermete" && b === "escalade" ? CRISE.incident.fermeteEscalade : 0;
  if (pInc && M.tirer(e) < pInc) { (e.incidents ??= []).push({ annee: e.annee + 1, foyer: k.foyer, titre: k.titre, pays: k.pays }); lignes.push({ texte: "Risque d'incident armé l'an prochain", signe: -1 }); }
  k.issue = `${a}|${b}`; k.lignes = lignes;
  (e.faits ??= []).push(`crise_${k.foyer}_${k.issue.replace("|", "_")}`);
  return lignes;
}

// Incidents armés différés (envenimement) : ils tombent comme des événements de l'année suivante.
export function incidentsAnnee(e: EtatV2) {
  const l = (e.incidents ?? []).filter(i => i.annee === e.annee); e.incidents = (e.incidents ?? []).filter(i => i.annee > e.annee);
  return l.flatMap((i, n) => {
    for (const iso of i.pays) { const p = e.pays[iso]; p.pib *= 1 + CRISE.incident.pib / 100; p.stabilite = M.borne(p.stabilite + CRISE.incident.stab, 0, 100); }
    e.tension = M.borne(e.tension + CRISE.incident.tension, 0, 10);
    const noms = i.pays.slice(0, 2).map(x => e.pays[x].nom).join(" et "), g = guerreDepuisIncident(e, i);
    const guerre = g ? [{ id: g.id, trimestre: 2, titre: g.directe ? g.titre : `La crise dégénère : ${g.titre.toLowerCase()}`, texte: g.directe ? "Le pire est arrivé : les deux grandes puissances échangent des frappes. Chaque année de guerre coûte cher aux deux camps." : `L'incident tourne à la guerre ouverte. ${e.pays[g.a].nom} attaque ; chaque camp peut soutenir un belligérant (opération « Soutien dans un conflit »).`, pays: [g.a, g.b], resume: "guerre déclarée · tension mondiale +" + fr(g.directe ? 2 : 0.8) }] : [];
    return [{ id: `incident_${i.foyer}_${e.annee}_${n}`, trimestre: 1, titre: `Incident armé : suite de « ${i.titre} »`, texte: `L'escalade de l'an dernier a dégénéré : échanges de tirs, morts des deux côtés. ${noms} paient le prix.`, pays: i.pays,
      resume: [`PIB de la région ${fr(CRISE.incident.pib)} %`, `stabilité ${fr(CRISE.incident.stab)}`, `tension mondiale +${fr(CRISE.incident.tension)}`].join(" · ") }, ...guerre];
  });
}
const fr = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");

// ---------- Guerres (demande du 2 novembre 2026 : « dans certains cas, générer des guerres entre pays ou entre les 2 camps,
// relativement rare ») ----------
// Origines : un incident armé peut dégénérer en guerre entre les deux pays du foyer ; si l'un est un leader et que la tension
// est extrême, le leader adverse peut s'engager directement (guerre entre les deux camps, très rare) ; l'opération
// « Déclarer la guerre » (casus belli requis). Chaque année : score de guerre (armées, soutiens, hasard), coûts pour
// les belligérants, puis paix blanche possible ou victoire à ±60. Estimation.
export interface Guerre { id: string; titre: string; a: string; b: string; debut: number; fin?: number; score: number; soutien: Record<string, number>; directe?: boolean; issue?: string;
  rebelles?: { region: string; force: number; parrain?: string };
  allies?: Record<string, string[]>; garants?: Partial<Record<Camp, string>> } // alliés entrés en guerre par côté ; camps garants et côté soutenu // guerre séparatiste : a = l'État, b = le parrain éventuel (sinon a)
export const GUERRE = {
  depuisIncident: 0.35, cranFort: 3, facteurCranFaible: 0.5, local: 0.00025, separatisme: 0.0002, // guerres locales et séparatistes : 0,025 % (État contre État) ou 0,02 % (séparatisme) × chaleur × cran × facteur de relation, par an et par foyer        // proba qu'un incident tourne à la guerre (×0,35 sous le cran 3)
  directe: 0.3, seuilDirect: 7,                                 // engagement direct du leader adverse : tension ≥ 9 et 25 %
  pibA: -2, pibB: -4, stab: -5, tensionAn: 0.5, tensionDirecte: 1.5, // coûts annuels (le pays envahi souffre plus)
  victoire: 60, paixBlanche: 0.3, armee: 0.4, alea: 12, soutienPoint: 3,
  gainVainqueur: 15, pertePerdant: { pib: -5, stab: -10 },
};
const campDe = (e: EtatV2, iso: string): Camp => (M.partPays(e.pays[iso], "CHN") > M.partPays(e.pays[iso], "OCC") ? "CHN" : "OCC");
export const guerresEnCours = (e: EtatV2) => (e.guerres ?? []).filter(g => !g.fin);
export function ouvrirGuerre(e: EtatV2, a: string, b: string, cause: string, directe = false): Guerre | undefined {
  if (a === b || !e.pays[a] || !e.pays[b] || guerresEnCours(e).some(g => [g.a, g.b].includes(a) && [g.a, g.b].includes(b))) return undefined;
  const g: Guerre = { id: `guerre_${a}_${b}_${e.annee}`, titre: directe ? `Guerre ouverte entre l'Occident et les BRICS : ${e.pays[a].nom} contre ${e.pays[b].nom}` : `Guerre entre ${e.pays[a].nom} et ${e.pays[b].nom}`, a, b, debut: e.annee, score: 0, soutien: {}, directe: directe || undefined, issue: cause };
  (e.guerres ??= []).push(g); e.tension = M.borne(e.tension + (directe ? 2 : 0.8), 0, 10); if (!directe) appelsAuxArmes(e, g); return g;
}
// Après un incident armé : guerre possible (rare), entre les deux camps seulement si la tension est extrême.
export function guerreDepuisIncident(e: EtatV2, i: Incident): Guerre | undefined {
  const p = GUERRE.depuisIncident * (M.cranV2(e) >= GUERRE.cranFort ? 1 : GUERRE.facteurCranFaible);
  if (M.tirer(e) >= p) return undefined;
  const [a, b] = i.pays; const leaders = [M.LEADER.OCC, M.LEADER.CHN];
  if (leaders.includes(a) || leaders.includes(b)) {
    const leader = leaders.includes(a) ? a : b, autrePays = leader === a ? b : a, campL: Camp = leader === M.LEADER.OCC ? "OCC" : "CHN";
    if (campDe(e, autrePays) !== campL && e.tension >= GUERRE.seuilDirect && M.tirer(e) < GUERRE.directe)
      return ouvrirGuerre(e, leader, M.LEADER[M.autre(campL)], "incident", true); // les deux leaders s'affrontent
  }
  return ouvrirGuerre(e, a, b, "incident");
}
// Une année de guerre : retourne les événements à afficher.
export function guerresAnnee(e: EtatV2) {
  const ev: { id: string; trimestre: number; titre: string; texte: string; pays: string[]; resume: string }[] = [];
  for (const g of guerresEnCours(e)) {
    const A = e.pays[g.a], B = e.pays[g.b], ans = e.annee - g.debut + 1;
    if (g.rebelles) { ev.push(anneeSeparatiste(e, g, A, ans)); continue; }
    g.score += GUERRE.armee * (A.militaire + forceAllies(e, g, g.a) - B.militaire - forceAllies(e, g, g.b)) + (g.soutien[g.a] ?? 0) * GUERRE.soutienPoint - (g.soutien[g.b] ?? 0) * GUERRE.soutienPoint + (M.tirer(e) * 2 - 1) * GUERRE.alea;
    g.soutien = {};
    A.pib *= 1 + GUERRE.pibA / 100; B.pib *= 1 + GUERRE.pibB / 100;
    A.stabilite = M.borne(A.stabilite + GUERRE.stab, 0, 100); B.stabilite = M.borne(B.stabilite + GUERRE.stab, 0, 100);
    e.tension = M.borne(e.tension + (g.directe ? GUERRE.tensionDirecte : GUERRE.tensionAn), 0, 10);
    let fin = "";
    if (Math.abs(g.score) >= GUERRE.victoire) {
      const [v, p] = g.score > 0 ? [A, B] : [B, A], cv = campDe(e, v.iso);
      if (p.iso !== M.LEADER.OCC && p.iso !== M.LEADER.CHN) p.att[cv] = M.borne(p.att[cv] + GUERRE.gainVainqueur);
      p.pib *= 1 + GUERRE.pertePerdant.pib / 100; p.stabilite = M.borne(p.stabilite + GUERRE.pertePerdant.stab, 0, 100);
      fin = `victoire de ${v.nom}`; g.fin = e.annee; g.issue = fin;
    } else if (ans >= 2 && M.tirer(e) < GUERRE.paixBlanche) { fin = "cessez-le-feu sans vainqueur"; g.fin = e.annee; g.issue = fin; }
    ev.push({ id: `${g.id}_${e.annee}`, trimestre: 4, titre: fin ? `${g.titre} : ${fin}` : `${g.titre} (année ${ans})`, texte: fin ? `Après ${ans} an${ans > 1 ? "s" : ""} de combats, ${fin}.` : `Les combats continuent. Score de guerre ${Math.round(g.score)} (victoire à ±${GUERRE.victoire}).`, pays: [g.a, g.b],
      resume: [`PIB ${A.nom} ${GUERRE.pibA} %`, `PIB ${B.nom} ${GUERRE.pibB} %`, `stabilité ${GUERRE.stab}`, `tension mondiale +${fr(g.directe ? GUERRE.tensionDirecte : GUERRE.tensionAn)}`].join(" · ") });
  }
  return ev;
}

// Guerres locales, sans lien avec les deux camps (demande du 2 novembre 2026 : « Israël-Iran, Rwanda-Congo, Azerbaïdjan-Géorgie
// ou tout autre scénario »). chaleur 1 à 3 : plus elle est haute, plus la guerre est probable (estimation).
export interface ConflitLocal { a: string; b: string; cause: string; chaleur: number; de?: number }
export const CONFLITS_LOCAUX: ConflitLocal[] = [
  { a: "ISR", b: "IRN", cause: "programme nucléaire iranien et guerre par milices interposées", chaleur: 3 },
  { a: "RWA", b: "COD", cause: "minerais du Kivu et milices armées à la frontière", chaleur: 3 },
  { a: "UGA", b: "COD", cause: "rebelles réfugiés dans l'Ituri", chaleur: 1 },
  { a: "AZE", b: "ARM", cause: "le Haut-Karabakh et le corridor du Zanguezour", chaleur: 3 },
  { a: "AZE", b: "GEO", cause: "un tracé de frontière contesté près du monastère de David Gareja et le contrôle des oléoducs", chaleur: 1 },
  { a: "RUS", b: "GEO", cause: "l'Abkhazie et l'Ossétie du Sud", chaleur: 2 },
  { a: "ETH", b: "ERI", cause: "la frontière de Badmé et l'accès à la mer Rouge", chaleur: 2 },
  { a: "EGY", b: "ETH", cause: "le grand barrage sur le Nil Bleu", chaleur: 1, de: 2011 },
  { a: "SDN", b: "SSD", cause: "le pétrole d'Abyei", chaleur: 2, de: 2011 },
  { a: "MAR", b: "DZA", cause: "le Sahara occidental", chaleur: 1 },
  { a: "THA", b: "KHM", cause: "le temple de Preah Vihear", chaleur: 1 },
  { a: "KGZ", b: "TJK", cause: "l'eau et les enclaves de la vallée de Ferghana", chaleur: 2 },
  { a: "PAK", b: "AFG", cause: "la ligne Durand et les talibans pakistanais", chaleur: 2 },
  { a: "IND", b: "PAK", cause: "le Cachemire", chaleur: 2 },
  { a: "SAU", b: "YEM", cause: "les rebelles houthis", chaleur: 2 },
  { a: "TUR", b: "SYR", cause: "les milices kurdes au nord de la Syrie", chaleur: 2 },
  { a: "ISR", b: "LBN", cause: "les roquettes du Hezbollah", chaleur: 2 },
  { a: "KEN", b: "SOM", cause: "les shebab et la frontière maritime", chaleur: 1 },
  { a: "VEN", b: "GUY", cause: "l'Essequibo et son pétrole", chaleur: 1, de: 2015 },
  { a: "GRC", b: "TUR", cause: "les îles et le gaz de la mer Égée", chaleur: 1 },
  { a: "IRN", b: "SAU", cause: "la rivalité pour le Golfe", chaleur: 1 },
  { a: "COL", b: "VEN", cause: "les guérillas réfugiées de l'autre côté de la frontière", chaleur: 1 },
];
// Zones séparatistes : guerre civile possible ; chaque camp peut soutenir l'État ou les rebelles (« Soutien dans un conflit »).
export interface Separatisme { pays: string; region: string; cause: string; force: number; parrain?: string; de?: number; chaleur: number }
export const SEPARATISMES: Separatisme[] = [
  { pays: "UKR", region: "Donbass", cause: "des milices prorusses proclament des républiques", force: 35, parrain: "RUS", de: 2014, chaleur: 3 },
  { pays: "GEO", region: "Ossétie du Sud", cause: "la région rejette l'autorité de Tbilissi", force: 20, parrain: "RUS", chaleur: 2 },
  { pays: "MDA", region: "Transnistrie", cause: "la bande prorusse veut son indépendance", force: 15, parrain: "RUS", chaleur: 1 },
  { pays: "COD", region: "Kivu", cause: "des rebelles armés tiennent les mines", force: 30, parrain: "RWA", chaleur: 3 },
  { pays: "ETH", region: "Tigré", cause: "le pouvoir régional défie Addis-Abeba", force: 35, chaleur: 2 },
  { pays: "TUR", region: "Kurdistan turc", cause: "la guérilla kurde reprend les armes", force: 25, chaleur: 2 },
  { pays: "IRQ", region: "Kurdistan irakien", cause: "un référendum d'indépendance", force: 30, chaleur: 1 },
  { pays: "SDN", region: "Darfour", cause: "des milices s'affrontent pour la terre et l'or", force: 30, chaleur: 2 },
  { pays: "MLI", region: "Azawad", cause: "des rebelles touaregs et des groupes armés au nord", force: 25, chaleur: 2 },
  { pays: "NGA", region: "Biafra", cause: "un mouvement indépendantiste dans le sud-est", force: 20, chaleur: 1 },
  { pays: "CMR", region: "Ambazonie", cause: "les régions anglophones se soulèvent", force: 15, chaleur: 2 },
  { pays: "AGO", region: "Cabinda", cause: "l'enclave pétrolière réclame l'indépendance", force: 10, chaleur: 1 },
  { pays: "SEN", region: "Casamance", cause: "la rébellion reprend dans le sud", force: 10, chaleur: 1 },
  { pays: "PAK", region: "Baloutchistan", cause: "des rebelles attaquent gazoducs et ports", force: 20, chaleur: 2 },
  { pays: "PHL", region: "Mindanao", cause: "des groupes armés au sud de l'archipel", force: 15, chaleur: 2 },
  { pays: "IDN", region: "Papouasie", cause: "les indépendantistes papous", force: 10, chaleur: 1 },
  { pays: "MMR", region: "Arakan", cause: "une armée ethnique prend le contrôle de la côte", force: 25, chaleur: 2 },
  { pays: "SRB", region: "nord du Kosovo", cause: "les tensions serbes et albanaises", force: 15, chaleur: 1 },
  { pays: "AZE", region: "Haut-Karabakh", cause: "les Arméniens de la région font sécession", force: 25, parrain: "ARM", chaleur: 2 },
  { pays: "MOZ", region: "Cabo Delgado", cause: "une insurrection près des gisements de gaz", force: 15, chaleur: 2, de: 2017 },
];
// Les conflits découlent des interactions entre pays (demande du 2 novembre 2026) : la relation entre les deux pays (rivalité
// historique adoucie s'ils se rangent dans le même camp, sinon attitudes croisées) module le risque : ×0,2 entre amis,
// ×0,5 à relation neutre, jusqu'à ×2,5 entre ennemis jurés (estimation).
export function facteurRelation(e: EtatV2, a: string, b: string) { const r = M.relation(e, a, b); return r >= 30 ? 0.2 : 0.5 + Math.max(0, -r) / 50; }
const enGuerre = (e: EtatV2, iso: string) => guerresEnCours(e).some(g => g.a === iso || g.b === iso);
// Tirage annuel des guerres locales et séparatistes : rares, plus probables quand la tension monte. Retourne les événements.
export function guerresSpontanees(e: EtatV2) {
  const ev: { id: string; trimestre: number; titre: string; texte: string; pays: string[]; resume: string }[] = [];
  const cran = M.cranV2(e), tri = () => 1 + Math.floor(M.tirer(e) * 4);
  for (const c of CONFLITS_LOCAUX) {
    if (!e.pays[c.a] || !e.pays[c.b] || (c.de ?? 0) > e.annee || M.tirer(e) >= GUERRE.local * c.chaleur * cran * facteurRelation(e, c.a, c.b)) continue;
    const [x, y] = e.pays[c.a].militaire >= e.pays[c.b].militaire ? [c.a, c.b] : [c.b, c.a], g = ouvrirGuerre(e, x, y, "locale");
    if (g) ev.push({ id: g.id, trimestre: tri(), titre: g.titre, texte: `${e.pays[x].nom} attaque ${e.pays[y].nom} : ${c.cause}. Ce conflit ne vient d'aucun des deux camps, mais chacun peut soutenir un belligérant.`, pays: [x, y], resume: "guerre déclarée · tension mondiale +0,8" });
  }
  for (const s of SEPARATISMES) {
    if (!e.pays[s.pays] || (s.de ?? 0) > e.annee || enGuerre(e, s.pays) || M.tirer(e) >= GUERRE.separatisme * s.chaleur * cran * (1 + (60 - Math.min(60, e.pays[s.pays].stabilite)) / 30) * (s.parrain && e.pays[s.parrain] ? facteurRelation(e, s.pays, s.parrain) : 1)) continue;
    const g: Guerre = { id: `guerre_civile_${s.pays}_${e.annee}`, titre: `Guerre séparatiste : ${s.region} (${e.pays[s.pays].nom})`, a: s.pays, b: s.parrain && e.pays[s.parrain] ? s.parrain : s.pays, debut: e.annee, score: 0, soutien: {}, issue: "separatisme", rebelles: { region: s.region, force: s.force, parrain: s.parrain } };
    (e.guerres ??= []).push(g); e.tension = M.borne(e.tension + 0.3, 0, 10); appelsAuxArmes(e, g);
    ev.push({ id: g.id, trimestre: tri(), titre: g.titre, texte: `${s.region} : ${s.cause}.${s.parrain ? ` ${e.pays[s.parrain].nom} arme les rebelles.` : ""} Chaque camp peut soutenir l'État ou les rebelles (« Soutien dans un conflit » sur ${e.pays[s.pays].nom}).`, pays: g.b !== g.a ? [g.a, g.b] : [g.a], resume: "guerre civile · tension mondiale +0,3" });
  }
  return ev;
}
// Soutien d'un camp : dans une guerre entre États, il appuie le pays ciblé ; dans une guerre séparatiste, il appuie l'État si
// celui-ci penche vers son camp, sinon les rebelles.
export function soutenir(e: EtatV2, c: Camp, iso: string, m: number) {
  for (const g of guerresEnCours(e)) {
    if (g.rebelles && (g.a === iso || g.b === iso)) { const cote = M.partPays(e.pays[g.a], c) >= M.partPays(e.pays[g.a], M.autre(c)) ? g.a : "rebelles"; g.soutien[cote] = (g.soutien[cote] ?? 0) + m; }
    else if (g.a === iso || g.b === iso) g.soutien[iso] = (g.soutien[iso] ?? 0) + m;
  }
}

function anneeSeparatiste(e: EtatV2, g: Guerre, A: EtatV2["pays"][string], ans: number) {
  const r = g.rebelles!, parrain = g.b !== g.a ? e.pays[g.b] : undefined;
  g.score += GUERRE.armee * (A.militaire + forceAllies(e, g, g.a) - r.force - (parrain ? 0.2 * parrain.militaire : 0) - forceAllies(e, g, "rebelles")) + ((g.soutien[g.a] ?? 0) - (g.soutien.rebelles ?? 0)) * GUERRE.soutienPoint + (M.tirer(e) * 2 - 1) * GUERRE.alea;
  g.soutien = {}; A.pib *= 1 - 0.015; A.stabilite = M.borne(A.stabilite - 6, 0, 100); e.tension = M.borne(e.tension + 0.2, 0, 10);
  let fin = "";
  if (g.score >= GUERRE.victoire) { fin = `l'État reprend le contrôle de la région (${r.region})`; A.stabilite = M.borne(A.stabilite + 5, 0, 100); }
  else if (g.score <= -GUERRE.victoire) { fin = `sécession de fait : ${r.region} échappe à ${A.nom}`; A.pib *= 0.95; A.stabilite = M.borne(A.stabilite - 10, 0, 100); }
  else if (ans >= 2 && M.tirer(e) < GUERRE.paixBlanche) fin = "un cessez-le-feu gèle la ligne de front";
  if (fin) { g.fin = e.annee; g.issue = fin; }
  return { id: `${g.id}_${e.annee}`, trimestre: 4, titre: fin ? `${g.titre} : ${fin}` : `${g.titre} (année ${ans})`, texte: fin ? `Après ${ans} an${ans > 1 ? "s" : ""} de combats, ${fin}.` : `Les combats continuent. Score ${Math.round(g.score)} (l'État gagne à +${GUERRE.victoire}, les rebelles à −${GUERRE.victoire}).`, pays: [g.a],
    resume: [`PIB ${A.nom} −1,5 %`, "stabilité −6", "tension mondiale +0,2"].join(" · ") };
}

// ---------- Alliances : appels aux armes (inspiré d'EU4, demande du 2 novembre 2026) ----------
// À l'ouverture d'une guerre, chaque belligérant appelle ses alliés. Un pays allié (relation ≥ 60) accepte selon la relation.
// Un camp est appelé si le belligérant est en Amitié ou en Alliance avec lui (et si l'ennemi n'est pas le leader adverse,
// sinon ce serait une guerre directe). Accepter : le leader du camp soutient chaque année (armée × 0,12), tension +0,3 par an,
// coût 0,3 % de PIB par an, l'allié se rapproche (+6) ; refuser : l'allié perd confiance (−8). L'IA décide pour son camp
// (60 % en Alliance, 30 % en Amitié, moitié moins si la tension dépasse 8) ; le joueur répond dans le briefing. Estimation.
export const ALLIANCE = { seuilRelation: 60, acceptePays: 0.6, appui: 0.12, tensionAn: 0.3, coutPib: 0.3, gainAllie: 6, perteRefus: 8, accepteIA: { 5: 0.3, 6: 0.6 } as Record<number, number>, poidsAllie: 0.5 };
export interface Appel { guerre: string; allie: string; contre: string; camp: Camp; annee: number; reponse?: boolean }
const forceAllies = (e: EtatV2, g: Guerre, cote: string) => (g.allies?.[cote] ?? []).reduce((s, i) => s + ALLIANCE.poidsAllie * (e.pays[i]?.militaire ?? 0), 0)
  + (["OCC", "CHN"] as Camp[]).reduce((s, c) => s + (g.garants?.[c] === cote ? ALLIANCE.appui * e.pays[M.LEADER[c]].militaire : 0), 0);
export function appelsAuxArmes(e: EtatV2, g: Guerre) {
  const cotes: [string, string][] = g.rebelles ? [[g.a, "rebelles"]] : [[g.a, g.b], [g.b, g.a]];
  const leaders = [M.LEADER.OCC, M.LEADER.CHN], engages = new Set([g.a, g.b]);
  for (const [cote, ennemi] of cotes) {
    // pays alliés (hors leaders)
    for (const [x] of M.rivalite(cote).filter(([, f]) => f >= ALLIANCE.seuilRelation)) {
      if (leaders.includes(x) || engages.has(x) || !e.pays[x] || enGuerre(e, x)) continue;
      if (M.tirer(e) < ALLIANCE.acceptePays * M.relation(e, cote, x) / 100) { ((g.allies ??= {})[cote] ??= []).push(x); engages.add(x); }
    }
    // camps
    if (leaders.includes(cote) || !e.pays[cote]) continue;
    for (const c of ["OCC", "CHN"] as Camp[]) {
      if (g.garants?.[c] || ennemi === M.LEADER[M.autre(c)] || ennemi === M.LEADER[c]) continue;
      const n = M.niveau(e.pays[cote].att[c]), nE = e.pays[ennemi] ? M.niveau(e.pays[ennemi].att[c]) : 0;
      if (n < 5 || nE >= n) continue;
      const a: Appel = { guerre: g.id, allie: cote, contre: ennemi, camp: c, annee: e.annee };
      (e.appels ??= []).push(a);
      if (c !== e.joueur) decideAppelIA(e, a);
    }
  }
}
export function decideAppelIA(e: EtatV2, a: Appel) {
  const p = (ALLIANCE.accepteIA[M.niveau(e.pays[a.allie].att[a.camp])] ?? 0) * (e.tension > 8 ? 0.5 : 1);
  repondreAppel(e, a, M.tirer(e) < p);
}
export function repondreAppel(e: EtatV2, a: Appel, accepte: boolean): Ligne[] {
  if (a.reponse !== undefined) return [];
  a.reponse = accepte; const g = (e.guerres ?? []).find(x => x.id === a.guerre), p = e.pays[a.allie];
  if (accepte && g && !g.fin) {
    (g.garants ??= {})[a.camp] = a.allie === g.a ? g.a : g.rebelles ? "rebelles" : g.b;
    p.att[a.camp] = M.borne(p.att[a.camp] + ALLIANCE.gainAllie);
    return [{ texte: `${M.NOM_CAMP[a.camp]} entre en guerre aux côtés de ${p.nom} · attitude +${ALLIANCE.gainAllie}`, camp: a.camp, pays: p.iso, signe: 1 }];
  }
  p.att[a.camp] = M.borne(p.att[a.camp] - ALLIANCE.perteRefus);
  return [{ texte: `${M.NOM_CAMP[a.camp]} refuse l'appel de ${p.nom} · attitude −${ALLIANCE.perteRefus}`, camp: a.camp, pays: p.iso, signe: -1 }];
}
// Appels restés sans réponse (le joueur n'a rien choisi) : l'IA décide ; puis coûts annuels des camps garants.
export function appelsEnAttente(e: EtatV2) { for (const a of e.appels ?? []) if (a.reponse === undefined) decideAppelIA(e, a); }
export function coutsGarants(e: EtatV2) {
  for (const g of guerresEnCours(e)) for (const c of ["OCC", "CHN"] as Camp[]) if (g.garants?.[c]) {
    e.pays[M.LEADER[c]].pib *= 1 - ALLIANCE.coutPib / 100; e.tension = M.borne(e.tension + ALLIANCE.tensionAn, 0, 10);
  }
  for (const g of guerresEnCours(e)) for (const l of Object.values(g.allies ?? {})) for (const i of l) if (e.pays[i]) e.pays[i].pib *= 0.99;
}
