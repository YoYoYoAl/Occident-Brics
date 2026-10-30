import donnees from "../data/pays2000.json";
import { dessinerCarte, couleurLog, couleurAlignement, CANAUX_CARTE, type Annotation, type Marqueur, type OptionsCarte } from "./carte";
import { image, imageEvenement, portrait, imageBriefing, imageCarte } from "./images";
import { organisations, SIGLES } from "../data/organisations";
import { HUBS, hubsDe } from "../data/hubs";
import { NOMS_BIENS } from "../data/commerce";
import { FLUX, DETROITS } from "../data/flux";
import { jouer as son, basculerSon, sonActif, jouerEvenement, jouerJingle, musique, musiqueEre, jouerHymne, aUnHymne, titreHymne, basculerMusique, musiqueActivee, relancerMusique, type Son } from "./sons";
import { date as dateDuRound } from "../moteur/temps";
import { ficheHtml } from "./fiche";
import { panneauPlans, panneauDuels, lierPlans, plansUtiles, duelsDuJoueur, avantageJoueur, plansAdverses, seanceAnnuelle } from "./plans-ui";
import { ouvrirConseil, bilanHtml, peutRelancer, relancer, resteTrimestres, NOM_DUREE, type HoteConseil } from "./conseil-ui";
import { panneauDirigeant, panneauGuerre, lierGuerre, tableauRegions, blocAlliancePays } from "./guerre-ui";
import { regionsCles } from "../moteur/guerre";
import { jouerDuel } from "./duel-ui";
import { salleDuels } from "./salle-duels";
import { conclureDuel, enjeuxDuel, bilanDuel, paysDuPlan as paysDuPlanUi, plansDe, OBJECTIFS as OBJ_PLANS, nomCible, planRival, seanceOuverte, peutConvoquer, bilansNonVus, marquerBilansVus, PLANS as REGLES_PLANS } from "../moteur/plans";
import {
  creerPartie, finRound, jouerCarte, peutJouerMode, agir, peutAgir, ACTIONS, AIDES_ACTIONS, apercuAction, ZONES, CAMPAGNE, peutCampagne, campagne, paysEligibles, previsionAdverse, ZONES_STRATEGIQUES, ACTIONS_ZONE, DIPLOMATIE, peutDiplomatie, complementarite, BOOST_COMMERCE, type Complementarite, DOMAINES, LISTE_DOMAINES, DOMAINE_ACTION, modeDe, reglerMode, conseils, ECHELLES, ORIENTATIONS, orienter, reglerPartOrientations, PART_ORIENTATIONS, RIVERAINS, type Domaine, type ModeDomaine, type Orientation, ELECTIONS_PAYS, LOBBY_ONU, peutLobbyOnu, lobbyOnu, TECHNOLOGIES, SEUIL_TECHNO, COUT_RECHERCHE, peutRechercher, rechercher, BLOCUS, peutBloquer, bloquer, peutArmer, courseArmements, THEATRES, GUERRE, peutDeclarerGuerre, declarerGuerre, proposerPaix, PRIORITES, peutChoisirPriorite, choisirPriorite, serieDurable, DURABLE, BONUS_PRIORITE, auBord, estimationMemoire, peutRenseigner, renseigner, RENSEIGNEMENT, progresAgenda, RECOMPENSE_AGENDA, coutSanctions, dependanceCommerciale, type Priorite, diplomatie, repondreDiplomatie, type Diplomatie, peutAgirZone, agirZone, partZone, type ActionZone, acheterPA, peutAcheterPA, PRIX_PA,
  repondreBriefing, FORMATS, formatDe, peutProlonger, prolonger, type Format, SEUILS, partFamille, NOMS_FAMILLES, progression, alignement, influenceTotale, cran, bilan, puissance, carte as carteDe, briefing as briefingDe,
  decrireEffet, nomPays, serialiserPartie, chargerPartie, libelle, reagir, peutReagir, REACTIONS, MAX_REACTIONS, fluxActif, lienFlux,
  peutJouerCarte, budgetTrimestre, HISTORIQUES, typeCarte, typesManquants, carteObligatoire, NOMS_TYPES,
  type EtatPartie, type TypeAction, type EntreeJournal, type TypeReaction,
} from "../moteur/partie";
import { CANAUX, adversaire, type Camp } from "../moteur/types";
import type { EtatJeu } from "../moteur/etat";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const CLE_SAUVEGARDE = "occident-brics-partie";
const NOM_CAMP: Record<Camp, string> = { OCC: "Bloc USA", CHN: "Bloc Chine" };
const NOM_CANAL = { e: "Économique", p: "Politique", m: "Militaire", c: "Culturelle" };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nombre = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const signe = (x: number, d = 1) => (x >= 0 ? "+" : "") + nombre(x, d);
// Avance d'un bloc, sans signe : chaque bloc a sa couleur (pas de bloc « négatif »).
const avance = (x: number, d = 1, seuil = 0) => Math.abs(x) <= seuil || nombre(Math.abs(x), d) === nombre(0, d) ? `<span class="egal-t">équilibre</span>`
  : `<span class="${x > 0 ? "occ-t" : "chn-t"}">${x > 0 ? "USA" : "Chine"} ${nombre(Math.abs(x), d)}</span>`;

let etat: EtatPartie | null = null;
let paysChoisi: string | null = null;
let onglet = "main";
let carteOuverte: string | null = null;
let journalVu = 0;
let briefingVuAuRound = -1;
// Photo avant la fin du trimestre, pour le récap des deux blocs (puissance, alignements).
let avantTour: { puissance: Record<Camp, number>; alignements: Record<string, number>; budget?: number; cp?: number; tension?: number; progres?: Record<string, number> } | null = null;
let debutRapport = 0, titreRapport = "";
const CLE_OPTIONS = "occident-brics-options-carte";
const options: OptionsCarte = (() => {
  const defaut: OptionsCarte = { noms: true, influence: false, categories: false, sigles: false, legende: true, maritime: true, terrestre: true, aerien: false };
  try { return { ...defaut, ...JSON.parse(localStorage.getItem(CLE_OPTIONS) ?? "{}") }; } catch { return defaut; }
})();
// Pays hors jeu où se déroulent des conflits historiques : code ISO numérique de la carte.
// pays hors jeu (aucun depuis l'extension à 194 pays ; gardé pour d'éventuels territoires non souverains)
const IDS_HORS_JEU: Record<string, string> = { AFG: "004", GEO: "268", LBN: "422" };

const joueur = (): Camp => etat!.joueur ?? "OCC";
const idsJeu = new Map(donnees.pays.map(p => [p.idCarte, p.iso3]));
const carteMonde = dessinerCarte($("carte"), idsJeu, iso3 => { paysChoisi = iso3; onglet = "pays"; afficher(); });

function message(texte: string) {
  const m = $("message");
  m.textContent = texte;
  m.classList.add("visible");
  setTimeout(() => m.classList.remove("visible"), 3000);
}
// Exécute une action du moteur : une règle refusée devient un message, jamais un plantage.
// Son d'une action : un par domaine, plus lourd pour la coercition armée.
const sonAction = (t: TypeAction): Son => t === "intervention" || t === "soutien" || t === "intimidation" ? "act_force" : `act_${DOMAINE_ACTION[t]}` as Son;
function tenter(f: () => EtatPartie, s: Son = "action") {
  try { etat = f(); son(s); afficher(); } catch (err) { son("erreur"); message((err as Error).message); }
}

// ---------- Fenêtres ----------
function ouvrir(html: string, liaisons: (b: HTMLElement) => void = () => {}, classe = "") {
  $("boite").className = `boite ${classe}`;
  $("boite").innerHTML = html;
  $("fenetre").hidden = false;
  liaisons($("boite"));
}
const fermer = () => { if (!$("fenetre").hidden) son("fermer", 0.3); $("fenetre").hidden = true; };
const fenetreOuverte = () => !$("fenetre").hidden;

let formatChoisi: Format = "2000-2008";
const DESC_FORMAT: Record<Format, string> = {
  "2000-2008": "36 trimestres, la tranche d'origine.",
  "2000-2035": "144 trimestres : l'histoire réelle jusqu'en octobre 2026 (crise de 2008, Crimée, Covid, Ukraine, guerre contre l'Iran), puis des scénarios projetés jusqu'en 2035.",
  "2008-2035": "112 trimestres, départ réel au 1er trimestre 2008 : la Chine pèse déjà, les BRIC existent. Histoire réelle jusqu'en 2026, projections ensuite.",
};
function choisirCamp() {
  musique("menu");
  const titre = image("ecran_titre");
  ouvrir(`${titre ? `<div class="bandeau titre-jeu" style="background-image:url(${titre})"><h2>Occident vs BRICS</h2><span>2000-2035 · la naissance des blocs</span></div>` : `<h2>Nouvelle partie</h2>`}<p class="note">Première partie ? Le bouton <strong>Règles</strong> (ou la touche ?) explique tout en 2 minutes.</p>
    <div class="choix-format" role="radiogroup" aria-label="Période">${(Object.keys(FORMATS) as Format[]).map(f => `<label><input type="radio" name="format" value="${f}"${f === formatChoisi ? " checked" : ""}> <strong>${FORMATS[f].nom}</strong> <small>${DESC_FORMAT[f]}</small></label>`).join("")}</div>
    <p>Chaque trimestre : joue une carte (son événement ou ses points d'action), dépense tes points d'action sur la carte, réponds aux briefings de crise. Le score compte, pour 5 familles (économie, population, ressources, armée, environnement), la part du monde que contrôle chaque camp ; un décompte a lieu chaque fin d'année.</p>
    <div class="choix-camp">
      <button data-camp="OCC" class="occ"><strong>Bloc USA</strong><span>Les États-Unis et leurs alliés. Riche et influent partout, mais l'essor chinois grignote ta position.</span></button>
      <button data-camp="CHN" class="chn"><strong>Bloc Chine</strong><span>La Chine et ses partenaires. Croissance à deux chiffres, peu d'alliés. Transforme ton poids économique en influence.</span></button>
    </div>
    <p class="note"><button id="salleDuels">Salle des duels</button> Teste les 22 mini-jeux un par un et donne ton avis.</p>`, b => { b.querySelector<HTMLButtonElement>("#salleDuels")!.onclick = () => salleDuels({ boite: $("boite"), ouvrir: () => { $("fenetre").hidden = false; }, fermer, son: n => son(n), quitter: () => (etat ? fermer() : choisirCamp()) });
    b.querySelectorAll<HTMLButtonElement>("[data-camp]").forEach(x => x.onclick = () => {
    formatChoisi = (b.querySelector<HTMLInputElement>("input[name=format]:checked")?.value as Format) ?? "2000-2008";
    etat = creerPartie(Date.now() % 2147483647, x.dataset.camp as Camp, { generiques: true, ia: true, format: formatChoisi });
    journalVu = 0; briefingVuAuRound = -1; paysChoisi = null; carteOuverte = null; onglet = "main";
    fermer(); rapport("Début de partie"); afficher(); jouerHymne(x.dataset.camp === "OCC" ? "USA" : "CHN");
  }); });
}

function ligneJournal(j: EntreeJournal, avecReactions = false) {
  const classe = j.camp ? (j.camp === "OCC" ? "occ" : "chn") : "";
  const effets = j.effets?.length ? `<div class="effets-p">${j.effets.map(x => `<span class="effet-p ${/(^|\s)[−-]\s?\d|▼|baisse|recul/.test(x) ? "baisse" : /\+\s?\d|▲|hausse/.test(x) ? "hausse" : ""}">${esc(x)}</span>`).join("")}</div>` : "";
  const img = j.type === "historique" || j.type === "generique" ? imageEvenement(j.source, j.famille) : undefined;
  const corps = `<strong>${esc(j.titre)}</strong>${j.texte ? `<br><span>${esc(j.texte)}</span>` : ""}${effets}${avecReactions ? boutonsReaction(j) : ""}`;
  return `<li class="j-${j.type} ${classe} ${img ? "avec-image" : ""}">${img ? `<img src="${img}" alt="" loading="lazy"><div>${corps}</div>` : corps}</li>`;
}
// Boutons « aider » / « exploiter » sous un événement de ce trimestre qui frappe un pays.
function boutonsReaction(j: EntreeJournal): string {
  const index = etat!.journal.indexOf(j);
  if (j.contestable && index >= 0) { // action annoncée de l'adversaire : riposte possible ce trimestre ou le suivant
    if (j.camp === joueur()) return "";
    if (etat!.camps[joueur()].reactions.includes(index)) return `<div class="reactions"><span class="note">Tu as riposté.</span></div>`;
    const err = peutReagir(etat!, joueur(), index, "riposter");
    if (err && /qu'à une action annoncée/.test(err)) return "";
    return `<div class="reactions"><button data-reagir="riposter" data-index="${index}" title="${esc(REACTIONS.riposter.texte)}" ${err ? "disabled" : ""}>Riposter (${REACTIONS.riposter.budget} budget)</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}</div>`;
  }
  if (!j.reactif || index < 0 || j.round !== etat!.round) return "";
  const fait = etat!.camps[joueur()].reactions.includes(index);
  if (fait) return `<div class="reactions"><span class="note">Tu as réagi.</span></div>`;
  const b = (["aider", "exploiter", "fermete", "apaiser"] as TypeReaction[]).map(t => ({ t, err: peutReagir(etat!, joueur(), index, t) }))
    .filter(x => !/leader adverse refuse|n'exploite que|Réservé aux crises|réponds par la fermeté/.test(x.err ?? ""));
  const prix = (t: TypeReaction) => REACTIONS[t].budget ? `${REACTIONS[t].budget} budget` : `${REACTIONS[t].cp} CP`;
  return b.length ? `<div class="reactions">${b.map(x => `<button data-reagir="${x.t}" data-index="${index}" title="${esc(REACTIONS[x.t].texte)}" ${x.err ? "disabled" : ""}><strong>${REACTIONS[x.t].nom} · ${prix(x.t)}</strong><small>${esc(REACTIONS[x.t].texte)}</small></button>`).join("")}${b.filter(x => x.err).map(x => `<small class="erreur">${REACTIONS[x.t].nom} : ${esc(x.err!)}</small>`).join("")}</div>` : "";
}
function lierReactions(zone: HTMLElement, apres: () => void) {
  zone.querySelectorAll<HTMLButtonElement>("[data-reagir]").forEach(b => b.onclick = () => {
    try { etat = reagir(etat!, joueur(), Number(b.dataset.index), b.dataset.reagir as TypeReaction); son("reaction"); message("Réaction envoyée."); apres(); }
    catch (err) { son("erreur"); message((err as Error).message); }
  });
}
// Camp concerné par un événement localisé : ton camp (ton leader, tes alliés), l'adversaire, ou personne.
function campTouche(j: EntreeJournal): Camp | null {
  if (!j.pays?.length) return null;
  const iso = j.pays[0];
  if (iso === "USA") return "OCC"; if (iso === "CHN") return "CHN";
  const a = alignement(etat!, iso);
  return a >= 0.3 ? "OCC" : a <= -0.3 ? "CHN" : null;
}
const visibles = (debut = 0) => etat!.journal.slice(debut).filter(j => j.visiblePour.includes(joueur()) && j.type !== "action");

// Un événement générique mérite le rapport s'il touche un leader, le monde entier, ou un pays où se joue la partie.
function importance(j: EntreeJournal): number {
  if (!j.pays?.length) return 3 + (j.intensite ?? 1);
  const iso = j.pays[0], p = etat!.pays[iso];
  if (iso === "USA" || iso === "CHN") return 4 + (j.intensite ?? 1);
  const enJeu = Math.abs(alignement(etat!, iso)) >= 0.3 || influenceTotale(p, joueur()) >= 25 || influenceTotale(p, adversaire(joueur())) >= 25;
  return (j.intensite ?? 1) + (enJeu ? 1 : 0);
}
const MAX_MONDE = 3;

function rapport(titre: string, debut = journalVu) {
  if (debut === journalVu) {
    // bruitage de l'événement le plus marquant (historique d'abord), sinon le son d'ouverture
    const neufs = etat!.journal.slice(debut).filter(j => j.visiblePour.includes(joueur()));
    const fort = neufs.find(j => j.type === "historique") ?? neufs.filter(j => j.type === "generique").sort((a, b) => importance(b) - importance(a))[0];
    if (!jouerEvenement(fort?.famille)) son(fort?.type === "historique" ? "evenement" : "ouvrir", 0.45);
    musique(cran(etat!) >= 4 ? "guerre" : cran(etat!) >= 3 ? "tension" : etat!.round % 8 < 4 ? musiqueEre(dateDuRound(etat!.round).annee) : etat!.round % 16 < 8 ? "carte" : "calme");
  }
  debutRapport = debut; titreRapport = titre;
  const tout = etat!.journal.slice(debut);
  journalVu = etat!.journal.length;
  const moi = joueur(), adv = adversaire(moi), vu = (j: EntreeJournal) => j.visiblePour.includes(moi);
  const histoire = tout.filter(j => vu(j) && (j.type === "historique" || j.type === "politique" || j.type === "bilan"));
  const consequences = tout.filter(j => vu(j) && j.type === "cache");
  const generiques = tout.filter(j => vu(j) && j.type === "generique" && !j.mineur), faitsDivers = tout.filter(j => vu(j) && j.type === "generique" && j.mineur);
  const chezMoi = generiques.filter(j => campTouche(j) === moi), chezAdv = generiques.filter(j => campTouche(j) === adv);
  const monde = generiques.filter(j => !campTouche(j)).map(j => ({ j, n: importance(j) })).sort((a, b) => b.n - a.n);
  const retenus = monde.filter(x => x.n >= 3).slice(0, MAX_MONDE).map(x => x.j), autres = monde.map(x => x.j).filter(j => !retenus.includes(j));
  const liste = (l: EntreeJournal[], r = false) => `<ul class="journal">${l.map(j => ligneJournal(j, r)).join("")}</ul>`;
  const section = (t: string, l: EntreeJournal[], r = false, note = "") => l.length ? `<h3>${t}</h3>${note}${liste(l, r)}` : "";
  const reste = etat!.camps[moi].reactions.length;
  const noteReaction = `<p class="note">Tu peux réagir à ${MAX_REACTIONS} événements par trimestre (${MAX_REACTIONS - reste} restant${MAX_REACTIONS - reste > 1 ? "s" : ""}, budget ${nombre(etat!.camps[moi].budget, 0)}). Aussi depuis l'onglet Main.</p>`;
  ouvrir(`<div class="ov-tete"><div><span class="sc-sur">Ouverture du trimestre</span><h2>${titre} : ${libelle(etat!.round)}</h2></div>
      <div class="ov-compteurs"><span>Réactions : <strong>${MAX_REACTIONS - reste} sur ${MAX_REACTIONS}</strong></span><span>Budget <strong>${nombre(etat!.camps[moi].budget, 1)}</strong></span></div></div>
    <div class="ov"><div class="ov-gauche">
    ${section("Histoire et politique", histoire, true)}
    ${section(`Ton camp (${NOM_CAMP[moi]}) est touché : tu peux réagir`, chezMoi, true, noteReaction)}
    ${section(`Chez l'adversaire (${NOM_CAMP[adv]})`, chezAdv, true)}
    ${section("Conséquences de tes choix passés", consequences)}
    ${section("Dans le monde", retenus, true)}
    ${faitsDivers.length ? `<details><summary>${faitsDivers.length} fait${faitsDivers.length > 1 ? "s" : ""} divers et incident${faitsDivers.length > 1 ? "s" : ""} mineur${faitsDivers.length > 1 ? "s" : ""}</summary>${liste(faitsDivers)}</details>` : ""}
    ${autres.length ? `<details><summary>${autres.length} autre${autres.length > 1 ? "s" : ""} événement${autres.length > 1 ? "s" : ""} mineur${autres.length > 1 ? "s" : ""}, loin de ton jeu</summary>${liste(autres, true)}</details>` : ""}
    ${!histoire.length && !chezMoi.length && !chezAdv.length && !consequences.length && !retenus.length ? `<p class="note">Trimestre calme.</p>` : ""}
    </div><aside class="ov-droite">${bilanOuverture()}${recapBlocs(tout)}
    <button id="okRapport" class="principal ov-suite">${etat!.termine ? "Voir le résultat →" : "Passer au trimestre →"}</button></aside></div>`,
  b => {
    lierReactions(b, () => { const y = b.querySelector(".ov-gauche")?.scrollTop ?? 0; rapport(titreRapport, debutRapport); const g = $("boite").querySelector(".ov-gauche"); if (g) g.scrollTop = y; afficher(); });
    b.querySelector<HTMLButtonElement>("#okRapport")!.onclick = () => { fermer(); suiteOuverture(); };
  }, "large ouverture");
}

// Colonne droite de l'ouverture : bilan chiffré du trimestre écoulé et avancée des orientations.
function bilanOuverture(): string {
  const e = etat!, moi = joueur(), c = e.camps[moi], a = avantTour, p1 = 100 * puissance(e, moi);
  const tuile = (t: string, v: string, d: number | null, dec = 1, bon = 1) => `<div class="ov-tuile"><span>${t}</span><strong>${v}</strong>${d === null ? "<small>&nbsp;</small>"
    : Math.abs(d) < 0.05 ? `<small>stable</small>` : `<small class="${d * bon > 0 ? "hausse" : "baisse"}">${d > 0 ? "▲" : "▼"} ${signe(d, dec)}</small>`}</div>`;
  const mes = plansDe(e, moi);
  return `<h3>Bilan du trimestre écoulé</h3><div class="ov-tuiles">
    ${tuile("Puissance", `${nombre(p1, 1)} %`, a ? p1 - 100 * a.puissance[moi] : null, 2)}
    ${tuile("Budget", nombre(c.budget, 1), a?.budget !== undefined ? c.budget - a.budget : null)}
    ${tuile("Capital politique", nombre(c.cp, 0), a?.cp !== undefined ? c.cp - a.cp : null, 0)}
    ${tuile("Tension", `${cran(e)} / 5`, a?.tension !== undefined ? cran(e) - a.tension : null, 0, -1)}</div>
    <div class="ov-orient"><strong>Tes orientations</strong>${mes.length ? mes.map(p => { const d = a?.progres?.[p.id] !== undefined ? p.progres - a.progres[p.id] : null;
      return `<div><span>${esc(OBJ_PLANS[p.objectif].nom)} · ${esc(nomCible(p))}</span><span class="p-barre"><span style="width:${Math.min(100, p.progres)}%"></span></span><small>${nombre(p.progres, 0)} %${d !== null && d > 0 ? ` (+${nombre(d, 0)})` : ""}</small></div>`; }).join("")
      : `<span class="note">Aucune orientation : ouvre la salle du conseil.</span>`}</div>`;
}

// Après l'ouverture : bilans des orientations terminées, salle du conseil (séance annuelle), puis briefing.
let conseilVuAuRound = -1;
const hoteConseil = (apres: () => void = afficher): HoteConseil => ({ etat: () => etat!, camp: joueur, tenter, ouvrir, fermer, idsJeu, apres });
function suiteOuverture() {
  if (etat!.termine) { finDePartie(); return; }
  const bl = bilansNonVus(etat!, joueur());
  if (bl.length) { montrerBilans(bl); return; }
  if (guide && seanceAnnuelle(etat!) && conseilVuAuRound !== etat!.round) { conseilVuAuRound = etat!.round; ouvrirConseil(hoteConseil(() => { afficher(); proposerBriefing(); })); return; }
  proposerBriefing();
}
function montrerBilans(bl: ReturnType<typeof bilansNonVus>) {
  etat = marquerBilansVus(etat!, joueur());
  son("etape", 0.5);
  ouvrir(bl.map((b, k) => bilanHtml(b) + `<div class="actions-fenetre">${b.reconduit ? "" : `<button data-relancer="${k}" ${peutRelancer(etat!, joueur(), b) ? `disabled title="${esc(peutRelancer(etat!, joueur(), b)!)}"` : ""}>Relancer (${NOM_DUREE[b.duree] ?? b.duree + " trimestres"})</button>`}</div>`).join("")
    + `<div class="actions-fenetre"><button id="bpConseil">Ouvrir la salle du conseil</button><button id="bpSuite" class="principal">Continuer</button></div>`,
  b => {
    b.querySelectorAll<HTMLButtonElement>("[data-relancer]").forEach(x => x.onclick = () => { tenter(() => relancer(etat!, joueur(), bl[+x.dataset.relancer!]), "action"); x.disabled = true; x.textContent = "Relancée"; });
    b.querySelector<HTMLButtonElement>("#bpConseil")!.onclick = () => { conseilVuAuRound = etat!.round; ouvrirConseil(hoteConseil(() => { afficher(); proposerBriefing(); })); };
    b.querySelector<HTMLButtonElement>("#bpSuite")!.onclick = () => { fermer(); suiteOuverture(); };
  }, "large");
}

// Récap des deux blocs : carte jouée, actions, réactions, évolution de la puissance et basculements.
function recapBlocs(tout: EntreeJournal[]): string {
  if (!avantTour || !tout.some(j => j.type === "carte" || j.type === "action")) return "";
  const e = etat!, colonne = (camp: Camp) => {
    const cartes = tout.filter(j => j.type === "carte" && (j.joueParCamp ?? j.camp) === camp && j.visiblePour.includes(joueur()));
    const actions = tout.filter(j => j.type === "action" && j.camp === camp);
    const parType = new Map<string, string[]>();
    for (const a of actions) { const [nom, pays] = a.titre.split(" : "); parType.set(nom, [...(parType.get(nom) ?? []), pays]); }
    const p0 = avantTour!.puissance[camp], p1 = puissance(e, camp);
    return `<div class="bloc ${camp === "OCC" ? "occ" : "chn"}"><h4>${NOM_CAMP[camp]}${camp === joueur() ? " (toi)" : ""}</h4>
      <p><strong>Carte :</strong> ${cartes.length ? cartes.map(c => esc(c.titre)).join(" ; ") : "aucune"}</p>
      <p><strong>Actions :</strong> ${parType.size ? [...parType].map(([n, ps]) => `${esc(n)} (${esc(ps.join(", "))})`).join(" ; ") : "aucune"}</p>
      <p><strong>Puissance :</strong> ${nombre(100 * p0)} % → ${nombre(100 * p1)} % <span class="${p1 >= p0 ? "hausse" : "baisse"}">(${signe(100 * (p1 - p0), 2)})</span></p></div>`;
  };
  const bascules = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN").map(i => ({ i, d: alignement(e, i) - (avantTour!.alignements[i] ?? 0) }))
    .filter(x => Math.abs(x.d) >= 0.03).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 6);
  return `<h3>Le trimestre des deux blocs</h3><div class="recap">${colonne("OCC")}${colonne("CHN")}</div>
    ${bascules.length ? `<p class="note">Alignements qui ont le plus bougé : ${bascules.map(x => `${esc(nomPays(x.i))} <span class="${x.d > 0 ? "occ-t" : "chn-t"}">vers ${x.d > 0 ? "USA" : "Chine"} ${nombre(Math.abs(x.d), 2)}</span>`).join(", ")} ( USA).</p>` : ""}`;
}

function proposerBriefing(forcer = false) {
  const id = etat!.camps[joueur()].briefing;
  if (!id || (!forcer && briefingVuAuRound === etat!.round)) return;
  briefingVuAuRound = etat!.round;
  const b = briefingDe(id), c = etat!.camps[joueur()];
  const fond = imageBriefing(b.conseillers.map(x => x.role));
  son("briefing");
  ouvrir(`${fond ? `<div class="bandeau" style="background-image:url(${fond})"><h2>Briefing : ${esc(b.titre)}</h2></div>` : `<h2>Briefing : ${esc(b.titre)}</h2>`}
    <p>${esc(b.dossier)}</p>
    <h3>Avis des conseillers</h3>
    <ul class="conseillers portraits">${b.conseillers.map(x => { const im = portrait(x.role); return `<li>${im ? `<img src="${im}" alt="">` : ""}<div><strong>${esc(x.role)}</strong> : ${esc(x.avis)}</div></li>`; }).join("")}</ul>
    <h3>Décision ${b.maxChoix > 1 ? `(jusqu'à ${b.maxChoix} options)` : "(une option)"}</h3>
    <form id="formBriefing" class="options">${b.options.map((o, i) => `
      <label class="option"><input type="${b.maxChoix > 1 ? "checkbox" : "radio"}" name="o" value="${i}">
        <span><strong>${esc(o.libelle)}</strong> <em>${cout(o.cout)}</em>
        <small>${o.effets.map(ef => esc(decrireEffet(etat!, ef, joueur(), undefined, 0.5))).join("<br>")}${o.caches?.length ? "<br><i>Conséquences incertaines possibles.</i>" : ""}</small></span></label>`).join("")}
    </form>
    <p class="note">Budget ${nombre(c.budget, 1)} · capital politique ${nombre(c.cp, 0)}. Les effets affichés sont des fourchettes ; l'effet réel est tiré à la décision.</p>
    <div class="actions-fenetre"><button id="plusTard">Plus tard</button><button id="decider" class="principal">Décider</button></div>`,
  bt => {
    const f = bt.querySelector<HTMLFormElement>("#formBriefing")!;
    f.onchange = () => { const cochees = f.querySelectorAll<HTMLInputElement>("input:checked"); if (cochees.length > b.maxChoix) (f.querySelector("input:checked") as HTMLInputElement).checked = false; };
    bt.querySelector<HTMLButtonElement>("#plusTard")!.onclick = fermer;
    bt.querySelector<HTMLButtonElement>("#decider")!.onclick = () => {
      const choix = Array.from(f.querySelectorAll<HTMLInputElement>("input:checked")).map(x => Number(x.value));
      try { etat = repondreBriefing(etat!, joueur(), choix); fermer(); afficher(); message("Décision prise."); }
      catch (err) { message((err as Error).message); }
    };
  });
}

function finDePartie() {
  const b = bilan(etat!), fin = etat!.journal.filter(j => j.type === "bilan").pop();
  const gagne = (b > 0 && joueur() === "OCC") || (b < 0 && joueur() === "CHN");
  const eg = formatDe(etat!).egalite, victoire = gagne && Math.abs(b) >= eg;
  son(victoire ? "victoire" : "defaite", 0.6); jouerJingle(victoire); musique(victoire ? "victoire" : "defaite");
  ouvrir(`<h2>${esc(etat!.resultat ?? "")}</h2>
    <p class="gros">${/Défaite|Catastrophe/.test(etat!.resultat ?? "") ? "Fin de partie anticipée" : Math.abs(b) < eg ? "Égalité" : gagne ? "Tu l'emportes" : "Tu perds"} : avance ${avance(b)} points (bloc USA).</p>
    <p>${esc(fin?.texte ?? "")}</p>
    <p class="note">Le bilan est la moyenne des décomptes annuels : progression depuis le début de la partie de la puissance de chaque camp (5 familles de qualificatifs à poids égaux), plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(formatDe(etat!).komi)} points pour le bloc USA. Égalité sous ${nombre(eg)} point. Détail dans l'onglet Score.</p>
    <div class="actions-fenetre">${peutProlonger(etat!) ? `<button id="prolonger" class="principal">Continuer jusqu'en 2035</button>` : ""}<button id="rejouer"${peutProlonger(etat!) ? "" : ` class="principal"`}>Nouvelle partie</button><button id="voir">Voir la carte</button></div>`,
  bt => { bt.querySelector<HTMLButtonElement>("#rejouer")!.onclick = choisirCamp;
    const pr = bt.querySelector<HTMLButtonElement>("#prolonger"); if (pr) pr.onclick = () => { etat = prolonger(etat!); fermer(); rapport("Suite de la partie : 2009-2035"); afficher(); }; bt.querySelector<HTMLButtonElement>("#voir")!.onclick = fermer; });
}

// ---------- Panneau ----------
const cout = (c: { budget?: number; cp?: number }) => [c.budget ? `${c.budget} budget` : "", c.cp ? `${c.cp} CP` : ""].filter(Boolean).join(", ") || "gratuit";

// Tour guidé : le trimestre se déroule par étapes (événements, carte, économie, diplomatie, défense, secret, bilan) ;
// un domaine en automatique ou sans action restante est sauté ; la barre d'étapes permet de revenir ou de sauter.
const CLE_GUIDE = "occident-brics-tour-guide";
let guide = (() => { try { return localStorage.getItem(CLE_GUIDE) !== "non"; } catch { return true; } })();
let etape = 0, etapeRound = -1;
type Etape = "evenements" | "carte" | "plans" | "duels" | Domaine | "bilan";
const ETAPES: Etape[] = ["evenements", "carte", "plans", "duels", "defense", "eco", "diplo", "secret", "bilan"]; // plans pluriannuels puis duels ; les ministères sont en automatique (les conseils suivent les plans), sauf choix contraire
const NOM_ETAPE = (x: Etape) => x === "evenements" ? "Événements" : x === "carte" ? "Carte" : x === "plans" ? "Conseils et plans" : x === "duels" ? "Duels" : x === "bilan" ? "Bilan" : DOMAINES[x].nom;
const aReagirDe = (e: EtatPartie) => e.journal.filter(j => j.reactif && j.round === e.round && j.visiblePour.includes(joueur()) && (j.type === "historique" || campTouche(j) !== null || importance(j) >= 3));
const ripostesDe = (e: EtatPartie) => e.journal.filter(j => j.contestable && j.camp === adversaire(joueur()) && j.round >= e.round - 1 && j.visiblePour.includes(joueur()));
// Une étape est utile s'il y a quelque chose à y décider.
function etapeUtile(x: Etape): boolean {
  const e = etat!, c = e.camps[joueur()];
  if (x === "evenements") return aReagirDe(e).length > 0 || ripostesDe(e).length > 0 || e.proposition?.de === adversaire(joueur());
  if (x === "carte") return !c.carteJouee && c.main.length > 0;
  if (x === "bilan") return true;
  if (x === "plans") return plansUtiles(e, joueur()) || e.succession?.camp === joueur();
  if (x === "duels") return duelsDuJoueur(e, joueur()).length > 0;
  return (modeDe(e, joueur(), x) !== "auto" && (c.points?.[x] ?? 0) > 0) || (x === "defense" && e.interventions.some(i => i.camp === joueur()));
}
const etapeSuivante = (i: number) => { for (let k = i + 1; k < ETAPES.length; k++) if (etapeUtile(ETAPES[k])) return k; return ETAPES.length - 1; };

function panneauMain(): string {
  const e = etat!, c = e.camps[joueur()];
  const manque = typesManquants(e, joueur()), oblig = carteObligatoire(e, joueur());
  const suivi = (["camp", "adverse", "neutre"] as const).map(t => `<span class="${c.typesJoues.includes(t) ? "fait" : manque.includes(t) ? "manque" : ""}">${c.typesJoues.includes(t) ? "✓" : "○"} carte ${NOMS_TYPES[t]}</span>`).join("");
  const sEntete = () => {
    return `<div class="suivi-cartes" title="Chaque année : 6 cartes (2 de ton camp, 2 adverses, 2 neutres). Tu en joues une par trimestre, au moins une de chaque type. Les 2 restantes sont défaussées.">Cette année : ${suivi}</div>
    ${oblig ? `<p class="alerte">Obligatoire ce trimestre : une carte ${manque.map(t => NOMS_TYPES[t]).join(" ou ")}.</p>` : ""}
    <p class="note">${c.carteJouee ? "Carte jouée ce trimestre." : "Une carte par trimestre : son événement, ou ses points d'action."} Les cartes ciblées s'appliquent au pays choisi sur la carte${paysChoisi ? ` (<strong>${esc(nomPays(paysChoisi))}</strong>)` : " (aucun choisi)"}.</p>`;
  };
  const sEvenements = () => {
    let h = "";
    const aReagir = aReagirDe(e);
    if (aReagir.length) h += `<details class="a-reagir" ${c.reactions.length < MAX_REACTIONS ? "open" : ""}><summary>Réagir aux événements du trimestre (${c.reactions.length}/${MAX_REACTIONS})</summary><ul class="journal">${aReagir.map(j => ligneJournal(j, true)).join("")}</ul></details>`;
    const ripostes = ripostesDe(e);
    if (ripostes.length) h += `<details class="a-reagir"><summary>Riposter aux actions de l'adversaire (${ripostes.length})</summary><p class="note">${esc(REACTIONS.riposter.texte)} Compte dans tes ${MAX_REACTIONS} réactions du trimestre.</p><ul class="journal">${ripostes.map(j => ligneJournal(j, true)).join("")}</ul></details>`;
    return h;
  };
  const sCartes = () => {
    let h = "";
    if (!c.main.length) h += `<p class="note">Main vide : nouvelle main au premier trimestre.</p>`;
    for (const id of c.main) {
      const k = carteDe(id), adverse = k.camp === adversaire(joueur()), ouverte = carteOuverte === id, img = imageCarte(id);
      const errCarte = peutJouerCarte(e, joueur(), id), t = typeCarte(joueur(), id);
      h += `<article class="carte-jeu ${k.camp === "OCC" ? "occ" : k.camp === "CHN" ? "chn" : "neutre"} ${ouverte ? "ouverte" : ""} ${errCarte && !c.carteJouee ? "bloquee" : ""}" data-carte="${id}">
        <header>${img ? `<img src="${img}" alt="">` : ""}<div><strong>${esc(k.titre)}</strong><small class="type-carte">carte ${NOMS_TYPES[t]}</small></div><span class="valeur" title="Points d'action">${k.valeur}</span></header>
        <p>${esc(k.texte)}</p>`;
      if (ouverte && errCarte && !c.carteJouee) h += `<p class="alerte">${esc(errCarte)}</p>`;
      if (ouverte) {
        if (adverse) {
          const prev = previsionAdverse(e, joueur(), id);
          h += `<p class="alerte">Carte adverse : tu peux la jouer pour ses points, mais son événement se déclenche alors au profit de l'adversaire.</p>
            ${prev ? `<div class="mode prevision"><div><strong>Ce que l'adversaire en tirerait :</strong> ${esc(prev.titre)}</div><small>${prev.effets.map(esc).join("<br>")}</small></div>` : ""}`;
        } else k.modes.forEach((m, i) => {
          const eligibles = m.cible === "pays" ? paysEligibles(e, joueur(), id, i) : [];
          const pays = m.cible === "pays" ? (paysChoisi && eligibles.includes(paysChoisi) ? paysChoisi : undefined) : undefined;
          if (m.cible === "pays") h += eligibles.length
            ? `<label class="cible">Pays cible : <select data-cible>${pays ? "" : `<option value="">choisir (${eligibles.length} possibles)</option>`}${eligibles.map(x => `<option value="${x}" ${x === pays ? "selected" : ""}>${esc(nomPays(x))}</option>`).join("")}</select></label>`
            : `<p class="alerte">Aucun pays ne remplit la condition en ce moment.</p>`;
          const err = c.carteJouee ? "Carte déjà jouée ce trimestre." : errCarte ?? peutJouerMode(e, joueur(), id, i, pays);
          h += `<div class="mode"><div><strong>${esc(m.nom)}</strong> <em>${cout(m.cout)}${m.cible === "pays" ? " · cible un pays" : ""}</em></div>
            <small>${m.effets.map(ef => esc(decrireEffet(e, ef, joueur(), pays, 0.3))).join("<br>")}${m.caches?.length ? "<br><i>Conséquences incertaines possibles.</i>" : ""}</small>
            <button data-jouer="${i}" ${err ? `disabled title="${esc(err)}"` : ""}>Jouer l'événement</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}</div>`;
        });
        h += `<button data-points ${c.carteJouee || errCarte ? "disabled" : ""}>Jouer pour ${k.valeur} point${k.valeur > 1 ? "s" : ""} d'action</button>`;
      }
      h += `</article>`;
    }
    return h;
  };
  const cibles = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN").sort((a, b) => nomPays(a).localeCompare(nomPays(b), "fr"));
  const isoA = paysAction || paysChoisi && cibles.includes(paysChoisi) && paysChoisi || "";
  const sAgir = () => `<details class="agir"><summary>Agir toi-même sur un pays (actions manuelles)</summary>
    <label class="cible">Pays : <select id="paysAction"><option value="">choisir un pays</option>${cibles.map(x => `<option value="${x}" ${x === isoA ? "selected" : ""}>${esc(nomPays(x))}</option>`).join("")}</select></label>
    ${isoA ? blocActions(isoA) : `<p class="note">Choisis un pays ici ou clique-le sur la carte : influence, actions militaires, opérations secrètes.</p>`}
    ${blocCampagnes()}${blocZonesStrategiques()}</details>`;
  const sAchat = () => {
    const errAchat = peutAcheterPA(e, joueur());
    return `<div class="achat"><button id="acheter" ${errAchat ? `disabled title="${esc(errAchat)}"` : ""}>Acheter 1 point de crise (${PRIX_PA} budget)</button> <span class="note">2 par trimestre au plus.</span></div>`;
  };
  const bascule = `<p class="note bascule-guide"><button id="basculeGuide">${guide ? "Vue détaillée" : "Vue en 3 décisions"}</button> ${guide ? "Le trimestre en 3 décisions." : "Toutes les commandes sur une page (ancienne vue)."}</p>`;
  if (!guide) return bascule + sEntete() + sEvenements() + panneauDirigeant(e, joueur()) + panneauPlans(e, joueur()) + panneauDuels(e, joueur()) + panneauGuerre(e, joueur()) + blocStrategie() + blocDiplomatie() + sCartes() + blocMinisteres() + sAgir() + sAchat();
  // Le trimestre en 3 décisions (maquette 3) : ta carte, ce qui t'attend, des actions directes. Les orientations avancent seules.
  const mes = plansDe(e, joueur()), conv = peutConvoquer(e, joueur()), ouverte = seanceOuverte(e, joueur());
  const sOrient = `<div class="t-orient"><div class="t-orient-tete"><strong>Orientations en cours (${mes.length}/${REGLES_PLANS.max})</strong>
      <button id="btnConseil" class="${ouverte ? "principal" : ""}">🏛 ${ouverte ? "Salle du conseil : séance ouverte" : conv ? "Salle du conseil" : "Convoquer le conseil"}</button></div>
    ${mes.length ? mes.map(p => { const n = resteTrimestres(e, p.id);
      return `<div class="t-plan"><strong>${esc(OBJ_PLANS[p.objectif].nom)} · ${esc(nomCible(p))}</strong><span class="p-barre"><span style="width:${Math.min(100, p.progres)}%"></span></span>
        <small>${nombre(p.progres, 0)} % · environ ${n} trimestre${n > 1 ? "s" : ""}${planRival(e, p) ? " · disputée par l'adversaire" : ""}${p.reconduire ? " · ↻ reconduite" : " · s'arrête à l'arrivée"}</small></div>`; }).join("")
      : `<p class="note">Aucune orientation : tes conseillers n'ont pas de cap. Ouvre la salle du conseil.</p>`}</div>`;
  const carteJ = c.carteJouee ? e.journal.filter(j => j.type === "carte" && j.round === e.round && (j.joueParCamp ?? j.camp) === joueur()).pop() : undefined;
  const decision = (n: number, titre: string, etatTxt: string, corps: string, faite = false) => `<section class="t-decision ${faite ? "faite" : ""}">
    <header><span class="t-num">${faite ? "✓" : n}</span><strong>${titre}</strong><span class="t-etat">${etatTxt}</span></header>${corps}</section>`;
  const attente = [sEvenements(), duelsDuJoueur(e, joueur()).length ? panneauDuels(e, joueur()) : "", plansAdverses(e, joueur()),
    e.succession?.camp === joueur() ? panneauDirigeant(e, joueur()) : "", e.proposition?.de === adversaire(joueur()) ? blocDiplomatie() : "",
    c.briefing ? `<p><button id="tBriefing" class="alerte-btn">Briefing en attente : décider</button></p>` : ""].filter(Boolean);
  let h = bascule + sOrient;
  h += decision(1, "Ta carte du trimestre", c.carteJouee ? "jouée" : c.main.length ? "à jouer" : "main vide",
    c.carteJouee ? `<p class="note">${carteJ ? `<strong>${esc(carteJ.titre)}</strong>` : "Carte jouée ce trimestre."}</p>` : sEntete() + sCartes(), c.carteJouee || !c.main.length);
  h += decision(2, "Ce qui t'attend", attente.length ? `${attente.length} sujet${attente.length > 1 ? "s" : ""}` : "rien d'urgent",
    (attente.join("") || `<p class="note">Aucun duel, aucune crise, aucune riposte en attente.</p>`) + panneauGuerre(e, joueur()), !attente.length);
  h += decision(3, "Actions directes", "facultatif", `<p class="note">Cible : le pays choisi sur la carte${paysChoisi ? ` (<strong>${esc(nomPays(paysChoisi))}</strong>)` : ""}. Tes conseillers jouent seuls les points que tu laisses.</p>
    ${sAgir().replace('<details class="agir">', '<details class="agir" open>')}${sAchat()}<details class="agir"><summary>Stratégie du bloc</summary>${blocStrategie()}</details>`);
  h += `<p class="suite-guide"><button id="finGuide" class="principal">Fin du trimestre</button></p>`;
  return h;
}

// Un ministère : son mode et, en mode conseiller (ou dans le tour guidé), 6 options prêtes à jouer.
function blocDomaine(d: Domaine): string {
  const e = etat!, c = e.camps[joueur()];
  let h = "";
    const m = modeDe(e, joueur(), d), reste = c.points?.[d] ?? 0;
    h += `<div class="ministere"><div><strong>${DOMAINES[d].nom}</strong> <span class="note">${reste}/${DOMAINES[d].points} action${DOMAINES[d].points > 1 ? "s" : ""}</span>
      <select data-mode="${d}">${(Object.keys(NOMS_MODES) as ModeDomaine[]).map(k => `<option value="${k}" ${k === m ? "selected" : ""}>${NOMS_MODES[k]}</option>`).join("")}</select></div>`;
    if ((m === "conseiller" || guide && onglet === "main" && ETAPES[etape] === d) && reste > 0) {
      const opts = conseils(e, joueur(), d);
      h += opts.length ? `<div class="grille-actions">${opts.map(o => `<button data-agir="${o.type}" data-iso="${o.iso}">${esc(ACTIONS[o.type].nom)} : ${esc(nomPays(o.iso))}<small>${ACTIONS[o.type].pa} action · ${ACTIONS[o.type].budget} budget</small><small class="raison">${esc(o.raison)} · score ≈ ${signe(o.v, 2)}</small></button>`).join("")}</div>` : `<p class="note">Aucune option utile ce trimestre.</p>`;
    } else if (m === "auto") h += `<p class="note">${reste ? "Le ministre agira en fin de trimestre." : "Actions jouées."}</p>`;
    else h += `<p class="note">${reste ? "Choisis un pays ci-dessous ou sur la carte." : "Actions jouées."}</p>`;
    h += `</div>`;
  return h;
}
// Ministères : un domaine par carte, son mode (automatique, conseiller, manuel) et, en mode conseiller, 6 options prêtes à jouer.
const NOMS_MODES: Record<ModeDomaine, string> = { auto: "Automatique", conseiller: "Conseiller", manuel: "Manuel" };
function blocMinisteres(): string {
  const e = etat!, c = e.camps[joueur()];
  let h = `<details class="agir" open><summary>Tes ministères ce trimestre</summary><p class="note">Chaque domaine a ses actions du trimestre (non reportées). En automatique, le ministre les joue à la fin du trimestre selon ta priorité et tes orientations ; en conseiller, il te propose 6 options ; en manuel, tu choisis. Points de crise (cartes jouées pour leurs points) : ${nombre(c.pa, 0)}, utilisables partout.</p><div class="ministeres">`;
  for (const d of LISTE_DOMAINES) h += blocDomaine(d);
  const part = c.partOrientations ?? PART_ORIENTATIONS.defaut, nb = Object.keys(c.orientations ?? {}).length;
  return h + `</div><p>Orientations : ${nb} pays orienté${nb > 1 ? "s" : ""} (à régler dans la fiche de chaque pays). Part du budget consacrée chaque trimestre :
    <select id="partOrientations">${[0, 0.02, 0.05, 0.08, 0.1, 0.15].map(x => `<option value="${x}" ${Math.abs(x - part) < 1e-9 ? "selected" : ""}>${Math.round(x * 100)} %</option>`).join("")}</select></p></details>`;
}
// Actions sur un pays, groupées (influence, militaire, opérations secrètes), avec ce qu'elles rapportent.
function blocActions(iso: string): string {
  const e = etat!, c = e.camps[joueur()];
  const vers = (joueur() === "OCC" ? 1 : -1) * alignement(e, iso), cr = c.crans?.[iso] ?? { coop: 0, coer: 0 };
  const echelle = (k: "coop" | "coer") => ECHELLES[k].filter((_, i) => i <= cr[k]); // crans atteints et le suivant
  const pts = (k: "coop" | "coer") => ECHELLES[k].map((_, i) => i < cr[k] ? "●" : "○").join("");
  const groupes: [string, TypeAction[]][] = [
    ["Économie", ["economique", "developpement", "infrastructure", "pret"]],
    ["Diplomatie", ["politique", "culturelle", "contre", "electorale"]],
    ...(vers >= -0.2 ? [[`Défense, coopération ${pts("coop")}`, echelle("coop")] as [string, TypeAction[]]] : []),
    ...(vers < 0.4 ? [[`Défense, coercition ${pts("coer")}`, echelle("coer")] as [string, TypeAction[]]] : []),
    ["Services secrets (invisibles pour l'adversaire, sauf si révélés)", ["clandestin", "destabiliser", "espionnage", "putsch"]],
  ];
  const o = c.orientations?.[iso];
  let h = `<h3>Agir sur ${esc(nomPays(iso))} (budget ${nombre(c.budget, 1)})</h3>
    <p>Orientation permanente : ${(["cultiver", "surveiller", "contester"] as Orientation[]).map(k => `<button data-orienter="${k}" data-iso="${iso}" class="${o === k ? "actif" : ""}">${o === k ? "✓ " : ""}${ORIENTATIONS[k]}</button>`).join("")}${o ? `<button data-orienter="" data-iso="${iso}">Aucune</button>` : ""}</p>
    ${serieDurable(e, joueur(), iso) ? `<p class="note gain">Investissement durable : ${serieDurable(e, joueur(), iso)} trimestre(s) de suite sur ce pays, effet long terme +${Math.round(100 * DURABLE * serieDurable(e, joueur(), iso))} %.</p>` : `<p class="note">Agir ici plusieurs trimestres de suite renforce l'effet long terme (+${Math.round(100 * DURABLE)} % par trimestre consécutif, jusqu'à +${Math.round(300 * DURABLE)} %).</p>`}
    <p class="note">Sous chaque action : ce qu'elle rapporte tout de suite (2/3 de l'effet), puis le reste étalé sur 4 trimestres, en alignement du pays et en points de puissance pour ton bloc (le score). Une action publique sur cinq a une conséquence cachée, révélée 2 trimestres plus tard : contrecoup ou succès inattendu (±1/3 du gain), une chance sur deux pour chacun.</p>`;
  for (const [titre, types] of groupes) {
    h += `<h4 class="groupe-actions">${titre}</h4><div class="grille-actions">`;
    for (const type of types) {
      const def = ACTIONS[type], err = peutAgir(e, joueur(), type, iso), ap = apercuAction(e, joueur(), type, iso);
      const gainTxt = ap ? `<em class="gain">${type === "putsch" ? "si réussite (45 %) : " : ""}alignement ${ap.alignement >= 0 ? "+" : "−"}${nombre(Math.abs(ap.alignement), 3)}${ap.alignementDiffere > 0.0005 ? `, puis +${nombre(ap.alignementDiffere, 3)} sur 4 trimestres` : ""} · puissance ${ap.puissance >= 0 ? "+" : "−"}${nombre(Math.abs(ap.puissance), 3)} pt</em>` : "";
      h += `<button data-agir="${type}" data-iso="${iso}" title="${esc((def.aide ?? AIDES_ACTIONS[type] ?? "") + (err ? ` (${err})` : ""))}" ${err ? "disabled" : ""}>${c.priorite && PRIORITES[c.priorite].actions.includes(type) ? `★ ` : ""}${def.nom}<small>${def.pa} ${DOMAINES[DOMAINE_ACTION[type]].nom.toLowerCase()}${def.budget ? ` · ${def.budget} budget` : ""}</small>${gainTxt}${err ? `<small class="erreur">${esc(err)}</small>` : ""}</button>`;
    }
    h += `</div>`;
  }
  return h;
}

// Campagnes régionales : impact plus faible, mais sur toute une zone.
function blocCampagnes(): string {
  const e = etat!;
  let h = `<h3>Campagnes régionales</h3><p class="note">${CAMPAGNE.pa} actions de diplomatie et ${CAMPAGNE.budget} de budget : influence +${CAMPAGNE.gain.p} (politique ou économique) ou +${CAMPAGNE.gain.c} (culturelle) dans chaque pays de la zone. Moins fort qu'une action ciblée (+8), mais diffus. Une campagne par zone et par trimestre.</p>
    <div class="campagnes"><select id="zoneCampagne">${Object.entries(ZONES).map(([k, z]) => `<option value="${k}" ${k === zoneCampagne ? "selected" : ""}>${esc(z.nom)} (${z.pays.length} pays)</option>`).join("")}</select>`;
  const err = peutCampagne(e, joueur(), zoneCampagne);
  for (const [canal, nom] of [["p", "Politique"], ["e", "Économique"], ["c", "Culturelle"]] as const)
    h += `<button data-campagne="${canal}" ${err ? `disabled title="${esc(err)}"` : ""}>${nom}</button>`;
  return h + `</div>${err ? `<small class="erreur">${esc(err)}</small>` : ""}`;
}
// Stratégie de l'année : priorité (+25 % sur une famille d'actions), agenda secret, renseignement.
function blocStrategie(): string {
  const e = etat!, c = e.camps[joueur()], errP = peutChoisirPriorite(e, joueur()), ag = progresAgenda(e, joueur()), errR = peutRenseigner(e, joueur());
  const prio = (Object.keys(PRIORITES) as Priorite[]).map(k => `<button data-priorite="${k}" class="${c.priorite === k ? "actif" : ""}" title="${esc(PRIORITES[k].texte)}" ${errP ? "disabled" : ""}>${c.priorite === k ? "✓ " : ""}${PRIORITES[k].nom}<small>${esc(PRIORITES[k].texte)}</small></button>`).join("");
  return `<details class="agir" ${errP ? "" : "open"}><summary>Stratégie de l'année${c.priorite ? ` : ${PRIORITES[c.priorite].nom}` : ""}</summary>
    <p class="note">Priorité : une par an, elle rend 25 % plus efficace une famille d'actions.${errP ? ` ${esc(errP)}` : ""}</p><div class="grille-actions">${prio}</div>
    ${ag ? `<p><strong>Agenda secret</strong> : ${esc(ag.texte)}. Progrès ${nombre(ag.progres, 1)} sur ${ag.cible}. <span class="note">Révélé à tous en fin d'année ; s'il est atteint : capital politique +${RECOMPENSE_AGENDA.cp}, budget +${RECOMPENSE_AGENDA.budget}.</span></p>` : ""}
    ${blocMonde()}
    <div class="grille-actions"><button id="renseigner" ${errR ? `disabled title="${esc(errR)}"` : ""}>Renseignement<small>${RENSEIGNEMENT.pa} action secrète · ${RENSEIGNEMENT.budget} budget : révèle les opérations secrètes adverses de l'année, sa main et son agenda probable</small></button></div></details>`;
}
// ONU, élections à venir, recherche, défense (course aux armements, blocus, guerre).
function blocMonde(): string {
  const e = etat!, c = e.camps[joueur()], moi = joueur();
  const prochaines = ELECTIONS_PAYS.filter(x => { const r = (x.annee - 2000) * 4 + x.trimestre - 1; return r >= e.round && r <= e.round + 4 && e.pays[x.iso]; });
  let h = "";
  if (e.onu) { const err = peutLobbyOnu(e, moi); h += `<p><strong>ONU</strong> : résolution du ${e.onu.de === "OCC" ? "bloc USA" : "bloc Chine"} sur ${esc(e.onu.theme)}, vote fin du 3e trimestre. Campagnes : USA ${e.onu.lobby.OCC}, Chine ${e.onu.lobby.CHN}. <button id="lobbyOnu" ${err ? `disabled title="${esc(err)}"` : ""}>Faire campagne (${LOBBY_ONU.pa} diplomatie · ${LOBBY_ONU.budget} budget)</button></p>`; }
  if (prochaines.length) h += `<p><strong>Élections dans l'année</strong> : ${prochaines.map(x => `<a href="#" data-pays-election="${x.iso}">${esc(nomPays(x.iso))}</a> (${x.nom}, ${x.annee} T${x.trimestre})`).join(" · ")}. <span class="note">Soutiens une campagne depuis la fiche du pays.</span></p>`;
  h += `<p><strong>Recherche</strong> (${COUT_RECHERCHE} budget, une fois par trimestre, percée à ${SEUIL_TECHNO} points) :</p><div class="grille-actions">${Object.entries(TECHNOLOGIES).map(([k, t]) => { const err = peutRechercher(e, moi, k), pts = c.recherche?.[k] ?? 0, fait = c.technologies?.includes(k);
    return `<button data-techno="${k}" title="${esc(t.texte + (err ? ` (${err})` : ""))}" ${err ? "disabled" : ""}>${fait ? "✓ " : ""}${esc(t.nom)}<small>${fait ? "obtenue" : `${pts}/${SEUIL_TECHNO}`} · ${esc(t.texte)}</small></button>`; }).join("")}</div>`;
  const errA = peutArmer(e, moi);
  h += `<p><strong>Défense</strong></p><div class="grille-actions"><button id="armer" ${errA ? `disabled title="${esc(errA)}"` : ""}>Course aux armements<small>4 budget, une fois par an : influence militaire +2 chez tes alliés, tension +2</small></button>
    <span><select id="detroitBlocus">${DETROITS.map(d => `<option value="${d.id}">${esc(d.nom)}</option>`).join("")}</select><button id="blocus" ${e.blocus ? "disabled" : ""} title="${esc(Object.entries(RIVERAINS).map(([k, v]) => `${DETROITS.find(d => d.id === k)?.nom} : ${v.map(nomPays).join(", ")}`).join(" ; "))}">Blocus naval<small>${BLOCUS.pa} défense · ${BLOCUS.budget} budget · ${BLOCUS.cp} CP : passage fermé ${BLOCUS.duree} trimestres, tension +8 ; il faut une base chez un riverain</small></button></span></div>`;
  if (e.guerre) h += `<p class="alerte">Guerre en cours dans le ${esc(THEATRES[e.guerre.theatre].nom)} depuis ${e.round - e.guerre.debut + 1} trimestre(s). Risque nucléaire au prochain trimestre : ${Math.round(100 * (GUERRE.nucleaire + GUERRE.escalade * (e.round - e.guerre.debut)))} %. <button id="paix" ${e.proposition ? "disabled" : ""}>Proposer un cessez-le-feu</button></p>`;
  else { const errG = peutDeclarerGuerre(e, moi, "taiwan"); h += `<details><summary>Guerre contre ${moi === "OCC" ? "la Chine" : "les États-Unis"}</summary><p class="note">Possible quand la tension atteint ${GUERRE.tension} et avec ${GUERRE.cp} de capital politique. Chaque trimestre : PIB des deux puissances −${GUERRE.pib * 100} % (vers la banqueroute), population −${nombre(GUERRE.population * 100, 1)} % ; risque d'escalade nucléaire de ${GUERRE.nucleaire * 100} %, +${GUERRE.escalade * 100} points par trimestre. Une guerre nucléaire est une défaite des deux camps.${errG ? ` ${esc(errG)}` : ""}</p><div class="grille-actions">${Object.entries(THEATRES).map(([k, t]) => `<button data-guerre="${k}" ${peutDeclarerGuerre(e, moi, k) ? "disabled" : ""}>Déclarer la guerre : ${esc(t.nom)}</button>`).join("")}</div></details>`; }
  return h;
}
// Diplomatie bilatérale : une initiative par an ; une offre adverse attend ta réponse jusqu'à la fin du trimestre.
function blocDiplomatie(): string {
  const e = etat!, pr = e.proposition;
  let h = "";
  if (pr && pr.de !== joueur()) {
    const texte = pr.type === "paix" ? "Si tu acceptes : la guerre s'arrête, la tension retombe à 70. Si tu refuses : la guerre continue." : DIPLOMATIE[pr.type].texte.replace("S'il accepte", "Si tu acceptes").replace("S'il refuse", "Si tu refuses");
    h += `<div class="mode prevision"><strong>Offre de l'adversaire : ${pr.type === "sommet" ? "sommet bilatéral" : pr.type === "accord" ? "accord commercial" : "cessez-le-feu"}</strong><small>${esc(texte)} Sans réponse à la fin du trimestre, l'offre est refusée.</small>
    <div><button data-diplo-reponse="1">Accepter</button><button data-diplo-reponse="0">Refuser</button></div></div>`;
  }
  const dep = `Dépendance commerciale entre les deux blocs : ${Math.round(100 * dependanceCommerciale(e))} %, des sanctions te coûteraient ${nombre(coutSanctions(e), 1)} de budget.`;
  const boutons = (Object.keys(DIPLOMATIE) as Diplomatie[]).map(t => { const err = peutDiplomatie(e, joueur(), t);
    return `<button data-diplo="${t}" title="${esc(DIPLOMATIE[t].texte + (err ? ` (${err})` : ""))}" ${err ? "disabled" : ""}>${DIPLOMATIE[t].nom}<small>${DIPLOMATIE[t].cp} CP</small></button>`; }).join("");
  return h + `<details class="agir"><summary>Diplomatie avec l'adversaire</summary><p class="note">Une initiative par an. Sommet et accord demandent son accord ; les sanctions non. ${(Object.keys(DIPLOMATIE) as Diplomatie[]).map(t => `<strong>${DIPLOMATIE[t].nom}</strong> : ${esc(DIPLOMATIE[t].texte)}`).join(" ")} ${dep}</p><div class="grille-actions">${boutons}</div></details>`;
}
// Zones stratégiques hors des États : présence de chaque bloc, comptée dans la famille Ressources du score.
function blocZonesStrategiques(): string {
  const e = etat!;
  let h = `<h3>Zones stratégiques</h3><p class="note">Hors des États : la présence de chaque bloc (0 à 100) y donne une part des ressources mondiales comptées au score. Elle s'érode de 0,25 par trimestre sans entretien. Une action par zone et par trimestre.</p><div class="zones-strat">`;
  for (const z of ZONES_STRATEGIQUES) {
    const p = e.zones[z.id], o = partZone(p, "OCC") * 100, c = partZone(p, "CHN") * 100;
    h += `<div class="zone-strat"><div><strong>${esc(z.nom)}</strong> <small>${esc(z.texte)}</small></div>
      <div class="barre-zone" title="Présence : bloc USA ${nombre(p.OCC, 0)}, bloc Chine ${nombre(p.CHN, 0)}"><b class="occ-f" style="width:${o}%"></b><b class="chn-f" style="width:${c}%"></b></div>
      <small>Bloc USA ${nombre(p.OCC, 0)} · Bloc Chine ${nombre(p.CHN, 0)} · poids ${nombre(z.poids * 100, 1)} % des ressources (estimation)</small><div>`;
    for (const [t, a] of Object.entries(ACTIONS_ZONE) as [ActionZone, (typeof ACTIONS_ZONE)[ActionZone]][]) {
      const err = peutAgirZone(e, joueur(), z.id, t);
      h += `<button data-zone-strat="${z.id}" data-type-zone="${t}" ${err ? `disabled title="${esc(err)}"` : ""}>${a.nom}<small>${a.pa} défense · ${a.budget} budget · présence +${a.gain}${a.tension ? ` · tension +${a.tension}` : ""}</small></button>`;
    }
    h += `</div></div>`;
  }
  return h + `</div>`;
}
let zoneCampagne = "afrique", paysAction = "";

function panneauPays(): string {
  if (!paysChoisi) return `<p class="aide">Clique sur un pays en couleur pour ouvrir sa fiche et y agir.</p>`;
  const e = etat!, iso = paysChoisi, p = e.pays[iso], a = alignement(e, iso);
  const pente = Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié du bloc USA" : "penche vers le bloc USA") : (a <= -0.4 ? "allié du bloc Chine" : "penche vers le bloc Chine");
  let h = `<h2>${esc(nomPays(iso))}${aUnHymne(iso) ? ` <button class="hymne" data-hymne="${iso}" title="${esc(titreHymne(iso) ?? "Hymne national")} (cliquer de nouveau pour arrêter)">♪ Hymne</button>` : ""}</h2>
    <p class="gros">Alignement ${avance(a, 2, 0.005)} <span class="note">(${pente})</span></p>
    ${iso !== "USA" && iso !== "CHN" ? `<p class="note">Selon tes ambassadeurs (estimation) : ${estimationMemoire(e, iso, joueur())} envers ton bloc, ${estimationMemoire(e, iso, adversaire(joueur()))} envers l'adversaire.${auBord(e, iso) ? ` <strong>⚖ Au bord de la bascule</strong> (seuil ${avance(auBord(e, iso)!.seuil, 1, 0)}).` : ""}</p>${(() => { const k = complementarite(iso, joueur()); return `<p class="note">Commerce avec ton bloc : <strong style="color:${COULEURS_COMMERCE[k.type]}">${NOMS_COMMERCE[k.type]}</strong>${k.ilOffre.length ? ` · il t'offre : ${k.ilOffre.map(b => NOMS_BIENS[b]).join(", ")}` : ""}${k.tuOffres.length ? ` · tu lui offres : ${k.tuOffres.map(b => NOMS_BIENS[b]).join(", ")}` : ""} (actions économiques ×${String(BOOST_COMMERCE[k.type]).replace(".", ",")}).</p>`; })()}` : ""}
    <table><tr><td>PIB</td><td class="v">${nombre(p.pib / 1e9, 0)} Md USD <span class="note">(int-$ 2011)</span></td></tr>
    <tr><td>Population</td><td class="v">${nombre(p.population / 1e6)} millions</td></tr>
    <tr><td>Stabilité</td><td class="v">${nombre(p.stabilite, 0)} / 100</td></tr></table>`;
  if (iso !== "USA" && iso !== "CHN") {
    h += `<h3>Influence (0 à 100)</h3><p class="note">Poids : économique 35 %, politique 30 %, militaire 20 %, culturelle 15 %. Alignement = (total USA − total Chine) / 70, borné entre −1 et +1.</p><table><tr><td></td><td class="v occ-t">USA</td><td class="v chn-t">Chine</td></tr>
      ${CANAUX.map(k => `<tr><td>${NOM_CANAL[k]}</td><td class="v">${nombre(p.influence.OCC[k], 0)}</td><td class="v">${nombre(p.influence.CHN[k], 0)}</td></tr>`).join("")}
      <tr><td><strong>Total pondéré</strong></td><td class="v"><strong>${nombre(influenceTotale(p, "OCC"))}</strong></td><td class="v"><strong>${nombre(influenceTotale(p, "CHN"))}</strong></td></tr></table>
      ${blocActions(iso)}`;
  } else h += `<p class="note">Leader de camp : pas de cible d'influence.</p>`;
  // Données 2000 et qualificatifs de la v0.1 (attributs en 5 familles)
  const etatV01 = { pays: { [iso]: { population: p.population } }, round: e.round } as unknown as EtatJeu;
  h += blocAlliancePays(e, joueur(), iso);
  if (regionsCles(iso) || (e.controles ?? []).some(c => c.iso === iso) || e.interventions.some(i => i.iso === iso)) h += `<details class="qualificatifs" open><summary>Régions</summary>${tableauRegions(e, iso, e.interventions.find(i => i.iso === iso))}</details>`;
  h += `<details class="qualificatifs"><summary>Qualificatifs du pays (données 2000)</summary>${ficheHtml(iso, etatV01).replace(/<h2>.*?<\/h2>/, "")}</details>`;
  return h;
}

function panneauScore(): string {
  const e = etat!;
  let h = `<h2>Score</h2><p class="note">Pour chaque famille, part du total des 194 pays contrôlée par chaque camp : le leader compte en entier, les autres pays au prorata de leur alignement. Les 5 familles pèsent autant.</p>
    <table><tr><td></td><td class="v occ-t">USA</td><td class="v chn-t">Chine</td></tr>`;
  for (const f of Object.keys(NOMS_FAMILLES) as (keyof typeof NOMS_FAMILLES)[])
    h += `<tr><td>${NOMS_FAMILLES[f]}</td><td class="v">${nombre(100 * partFamille(e, "OCC", f), 0)} %</td><td class="v">${nombre(100 * partFamille(e, "CHN", f), 0)} %</td></tr>`;
  h += `<tr><td><strong>Puissance</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "OCC"))} %</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "CHN"))} %</strong></td></tr></table>
    <h3>Décomptes annuels (bloc en avance)</h3>`;
  h += e.decomptes.length ? `<table>${e.decomptes.map((d, i) => `<tr><td>Fin ${2000 + i}</td><td class="v">${avance(d)}</td></tr>`).join("")}
    <tr><td><strong>Moyenne = bilan</strong></td><td class="v"><strong>${avance(bilan(e))}</strong></td></tr></table>` : `<p class="note">Premier décompte fin 2000.</p>`;
  h += `<p class="note">Chaque décompte mesure la progression depuis le début de la partie : écart de puissance entre les camps, plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(formatDe(e).komi)} points pour le bloc USA, versée au prorata du temps. Égalité sous ${nombre(formatDe(e).egalite)} point.</p>
    <h3>Seuils de défaite</h3><ul class="conseillers"><li>Banqueroute : PIB du leader à moins de ${nombre(100 * SEUILS.banqueroute, 0)} % de son sommet.</li>
    <li>Effondrement démographique : population du leader sous ${nombre(100 * SEUILS.population, 0)} % de 2000.</li>
    <li>Catastrophe climatique (défaite commune) : réchauffement de ${nombre(SEUILS.climat)} °C (actuel ${nombre(e.ecartTemp, 2)} °C).</li></ul>
    <p class="note">Pénurie : si ton poids économique dépasse davantage qu'en 2000 la part des ressources que tu contrôles, la croissance de ton leader est freinée.</p>`;
  return h;
}

function panneauJournal(): string {
  const v = visibles().slice().reverse();
  if (!v.length) return `<p class="note">Journal vide.</p>`;
  let h = "", r = -1;
  for (const j of v) { if (j.round !== r) { h += `${r >= 0 ? "</ul>" : ""}<h3>${libelle(j.round)}</h3><ul class="journal">`; r = j.round; } h += ligneJournal(j); }
  return h + "</ul>";
}

function lierPanneau(zone: HTMLElement) {
  zone.querySelectorAll<HTMLElement>("[data-carte]").forEach(art => {
    const id = art.dataset.carte!;
    art.querySelector("header")!.addEventListener("click", () => { carteOuverte = carteOuverte === id ? null : id; afficher(); });
    art.querySelectorAll<HTMLButtonElement>("[data-jouer]").forEach(b => b.onclick = () => {
      const mode = Number(b.dataset.jouer), m = carteDe(id).modes[mode];
      tenter(() => jouerCarte(etat!, joueur(), { carte: id, usage: "evenement", mode, pays: m.cible === "pays" ? paysChoisi ?? undefined : undefined }), "carte");
      carteOuverte = null; afficher();
    });
    art.querySelector<HTMLButtonElement>("[data-points]")?.addEventListener("click", () => {
      tenter(() => jouerCarte(etat!, joueur(), { carte: id, usage: "points" }), "carte"); carteOuverte = null; afficher();
    });
  });
  zone.querySelectorAll<HTMLButtonElement>("[data-etape]").forEach(b => b.onclick = () => { etape = Number(b.dataset.etape); son("etape", 0.35); afficher(); });
  zone.querySelector<HTMLButtonElement>("#etapeSuivante")?.addEventListener("click", () => { etape = etapeSuivante(etape); son("etape", 0.35); afficher(); });
  zone.querySelector<HTMLButtonElement>("#finGuide")?.addEventListener("click", () => finTrimestre());
  zone.querySelector<HTMLButtonElement>("#btnConseil")?.addEventListener("click", () => ouvrirConseil(hoteConseil()));
  zone.querySelector<HTMLButtonElement>("#tBriefing")?.addEventListener("click", () => proposerBriefing(true));
  zone.querySelector<HTMLButtonElement>("#basculeGuide")?.addEventListener("click", () => { guide = !guide; try { localStorage.setItem(CLE_GUIDE, guide ? "oui" : "non"); } catch { /* stockage indisponible */ } afficher(); });
  zone.querySelector<HTMLButtonElement>("#acheter")?.addEventListener("click", () => tenter(() => acheterPA(etat!, joueur())));
  lierReactions(zone, afficher);
  lierPlans(zone, { etat: () => etat!, camp: joueur, tenter, jouerDuel: lancerDuel });
  lierGuerre(zone, { etat: () => etat!, camp: joueur, tenter });
  zone.querySelectorAll<HTMLButtonElement>("[data-agir]").forEach(b => b.onclick = () => tenter(() => agir(etat!, joueur(), b.dataset.agir as TypeAction, b.dataset.iso ?? paysChoisi!), sonAction(b.dataset.agir as TypeAction)));
  zone.querySelectorAll<HTMLSelectElement>("[data-cible]").forEach(sel => sel.onchange = () => { paysChoisi = sel.value || null; carteMonde.choisir(paysChoisi); afficher(); });
  zone.querySelector<HTMLSelectElement>("#paysAction")?.addEventListener("change", ev => { paysAction = (ev.target as HTMLSelectElement).value; if (paysAction) paysChoisi = paysAction; afficher(); });
  zone.querySelector<HTMLSelectElement>("#zoneCampagne")?.addEventListener("change", ev => { zoneCampagne = (ev.target as HTMLSelectElement).value; afficher(); });
  zone.querySelectorAll<HTMLSelectElement>("[data-mode]").forEach(sel => sel.onchange = () => tenter(() => reglerMode(etat!, joueur(), sel.dataset.mode as Domaine, sel.value as ModeDomaine)));
  zone.querySelector<HTMLSelectElement>("#partOrientations")?.addEventListener("change", ev => tenter(() => reglerPartOrientations(etat!, joueur(), Number((ev.target as HTMLSelectElement).value))));
  zone.querySelectorAll<HTMLButtonElement>("[data-orienter]").forEach(b => b.onclick = () => tenter(() => orienter(etat!, joueur(), b.dataset.iso!, (b.dataset.orienter || null) as Orientation | null)));
  zone.querySelector<HTMLButtonElement>("#lobbyOnu")?.addEventListener("click", () => tenter(() => lobbyOnu(etat!, joueur())));
  zone.querySelectorAll<HTMLButtonElement>("[data-techno]").forEach(b => b.onclick = () => tenter(() => rechercher(etat!, joueur(), b.dataset.techno!)));
  zone.querySelector<HTMLButtonElement>("#armer")?.addEventListener("click", () => tenter(() => courseArmements(etat!, joueur())));
  zone.querySelector<HTMLButtonElement>("#blocus")?.addEventListener("click", () => tenter(() => bloquer(etat!, joueur(), $<HTMLSelectElement>("detroitBlocus").value)));
  zone.querySelector<HTMLButtonElement>("#paix")?.addEventListener("click", () => tenter(() => proposerPaix(etat!, joueur())));
  zone.querySelectorAll<HTMLButtonElement>("[data-guerre]").forEach(b => b.onclick = () => tenter(() => declarerGuerre(etat!, joueur(), b.dataset.guerre!)));
  zone.querySelectorAll<HTMLAnchorElement>("[data-pays-election]").forEach(a => a.onclick = ev => { ev.preventDefault(); paysChoisi = a.dataset.paysElection!; onglet = "pays"; carteMonde.choisir(paysChoisi); afficher(); });
  zone.querySelectorAll<HTMLButtonElement>("[data-priorite]").forEach(b => b.onclick = () => tenter(() => choisirPriorite(etat!, joueur(), b.dataset.priorite as Priorite)));
  zone.querySelector<HTMLButtonElement>("#renseigner")?.addEventListener("click", () => tenter(() => renseigner(etat!, joueur())));
  zone.querySelectorAll<HTMLButtonElement>("[data-diplo]").forEach(b => b.onclick = () => tenter(() => diplomatie(etat!, joueur(), b.dataset.diplo as Diplomatie)));
  zone.querySelectorAll<HTMLButtonElement>("[data-diplo-reponse]").forEach(b => b.onclick = () => tenter(() => repondreDiplomatie(etat!, joueur(), b.dataset.diploReponse === "1")));
  zone.querySelectorAll<HTMLButtonElement>("[data-zone-strat]").forEach(b => b.onclick = () => tenter(() => agirZone(etat!, joueur(), b.dataset.zoneStrat!, b.dataset.typeZone as ActionZone)));
  zone.querySelectorAll<HTMLButtonElement>("[data-campagne]").forEach(b => b.onclick = () => tenter(() => campagne(etat!, joueur(), zoneCampagne, b.dataset.campagne as "p" | "e" | "c")));
}

// ---------- Affichage ----------
function couleurs(): Record<string, string> {
  const e = etat!, vue = $<HTMLSelectElement>("vue").value, isos = Object.keys(e.pays);
  if (vue === "alignement") return Object.fromEntries(isos.map(i => [i, couleurAlignement(alignement(e, i))]));
  if (vue === "commerce") return Object.fromEntries(isos.map(i => [i, i === "USA" || i === "CHN" ? "#5b6170" : COULEURS_COMMERCE[complementarite(i, joueur()).type]]));
  if (vue === "militaire") return Object.fromEntries(isos.map(i => [i, couleurAlignement(i === "USA" ? 1 : i === "CHN" ? -1 : (e.pays[i].influence.OCC.m - e.pays[i].influence.CHN.m) / 60)]));
  const val = (i: string) => vue === "population" ? e.pays[i].population : vue === "pib" ? e.pays[i].pib : vue === "environnement" ? e.pays[i].environnement + 1 : e.pays[i].stabilite + 1;
  const vs = isos.map(val), min = Math.min(...vs), max = Math.max(...vs);
  return Object.fromEntries(isos.map(i => [i, couleurLog(val(i), min, max)]));
}

// ---------- Annotations de la carte ----------
const NOMS_COURTS: Record<string, string> = { USA: "États-Unis", GBR: "R.-U.", ARE: "Émirats", COD: "RD Congo", PRK: "Corée N.", KOR: "Corée S.", SAU: "Arabie s.", ZAF: "Afr. du Sud", NLD: "Pays-Bas", BGD: "Bangladesh", KAZ: "Kazakhstan", PHL: "Philippines" };
const court = (iso: string) => NOMS_COURTS[iso] ?? nomPays(iso);
function valeurVue(iso: string): string {
  const e = etat!, p = e.pays[iso];
  switch ($<HTMLSelectElement>("vue").value) {
    case "population": return `${nombre(p.population / 1e6, 0)} M`;
    case "pib": return `${nombre(p.pib / 1e9, 0)} Md`;
    case "stabilite": return `${nombre(p.stabilite, 0)}`;
    case "environnement": return `${nombre(p.environnement, 0)}`;
    case "militaire": return iso === "USA" || iso === "CHN" ? "leader" : `${nombre(p.influence.OCC.m, 0)} / ${nombre(p.influence.CHN.m, 0)}`;
    default: { if (iso === "USA" || iso === "CHN") return "leader"; const a = alignement(e, iso); return Math.abs(a) < 0.005 ? "neutre" : `${a > 0 ? "USA" : "Chine"} ${nombre(Math.abs(a), 2)}`; }
  }
}
function annotations(): Record<string, Annotation> {
  const e = etat!, moi = joueur(), adv = adversaire(moi), coul = (c: Camp) => c === "OCC" ? "#4f8be0" : "#dc4b3c";
  const recents = e.journal.filter(j => j.round >= e.round - 1 && j.visiblePour.includes(moi));
  const out: Record<string, Annotation> = {}, orgs = organisations(e);
  for (const iso of Object.keys(e.pays)) {
    const p = e.pays[iso], m: Marqueur[] = [], a = alignement(e, iso);
    for (const j of recents.filter(j => j.pays?.includes(iso))) {
      if (j.type === "historique") m.push({ symbole: "★", couleur: "#d9a441", titre: j.titre });
      else if (j.type === "generique") m.push({ symbole: "!", couleur: (j.intensite ?? 1) >= 2 ? "#e07b2a" : "#8a6d3b", titre: j.titre });
      else if ((j.type === "action" || j.type === "carte") && (j.joueParCamp ?? j.camp) === adv) m.push({ symbole: "◆", couleur: coul(adv), titre: `${NOM_CAMP[adv]} : ${j.titre}` });
      else if ((j.type === "action" || j.type === "carte") && j.camp === moi) m.push({ symbole: "✓", couleur: coul(moi), titre: `Toi : ${j.titre}` });
    }
    for (const c of e.conflits.filter(c => c.iso === iso)) m.unshift({ symbole: "⚔", couleur: "#b03a2e", titre: `Conflit en cours : ${c.titre}` });
    const bord = auBord(e, iso);
    if (bord) m.push({ symbole: "⚖", couleur: bord.vers === "OCC" ? "#4f8be0" : "#dc4b3c", titre: `Au bord de la bascule : un peu d'influence ${bord.vers === "OCC" ? "américaine" : "chinoise"} le ferait passer le seuil ${avance(bord.seuil, 1, 0)}` });
    if (p.stabilite < 30) m.push({ symbole: "↯", couleur: "#9b59b6", titre: `Pays instable (stabilité ${nombre(p.stabilite, 0)})` });
    const vus = new Set<string>(), uniques = m.filter(x => { const k = x.symbole + x.couleur; if (vus.has(k)) return false; vus.add(k); return true; });
    const io = influenceTotale(p, "OCC"), ic = influenceTotale(p, "CHN"), leader = iso === "USA" || iso === "CHN";
    const pente = leader ? "leader de bloc" : Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié du bloc USA" : "penche vers le bloc USA") : (a <= -0.4 ? "allié du bloc Chine" : "penche vers le bloc Chine");
    const sig = orgs[iso] ?? [];
    out[iso] = { nom: court(iso), valeur: valeurVue(iso), marqueurs: uniques,
      valeurs: options.influence && !leader ? [nombre(io, 0), nombre(ic, 0)] : undefined,
      barres: options.categories && !leader ? { o: CANAUX.map(k => p.influence.OCC[k]), c: CANAUX.map(k => p.influence.CHN[k]) } : undefined,
      sigles: options.sigles && sig.length ? sig.join(" ") : undefined,
      info: `<strong>${esc(nomPays(iso))}</strong><div class="note">${pente}${leader ? "" : ` · alignement ${avance(a, 2, 0.005)}`}</div>
        ${leader ? "" : `<div class="barres"><span class="b-occ" style="width:${Math.min(100, io)}%"></span></div><div class="barres"><span class="b-chn" style="width:${Math.min(100, ic)}%"></span></div>
        <div class="note">Influence USA ${nombre(io, 0)} · Chine ${nombre(ic, 0)}</div>`}
        ${leader ? "" : `<table class="mini"><tr><td></td>${CANAUX.map(k => `<td>${NOM_CANAL[k].slice(0, 4)}.</td>`).join("")}</tr><tr><td class="occ-t">USA</td>${CANAUX.map(k => `<td>${nombre(p.influence.OCC[k], 0)}</td>`).join("")}</tr><tr><td class="chn-t">Chine</td>${CANAUX.map(k => `<td>${nombre(p.influence.CHN[k], 0)}</td>`).join("")}</tr></table>`}
        <div class="note">PIB ${nombre(p.pib / 1e9, 0)} Md · ${nombre(p.population / 1e6, 0)} M hab. · stabilité ${nombre(p.stabilite, 0)}</div>
        ${repartitionFlux(iso)}
        ${sig.length ? `<div class="note">${sig.map(x => `<abbr title="${esc(SIGLES[x] ?? x)}">${esc(x)}</abbr>`).join(" · ")}</div>` : ""}
        ${m.length ? `<ul>${m.map(x => `<li><span class="pastille" style="background:${x.couleur}">${x.symbole}</span> ${esc(x.titre)}</li>`).join("")}</ul>` : ""}
        <div class="note">Clic : fiche et actions</div>` };
  }
  return out;
}
// Répartition des flux d'un pays : part de chaque mode et part des échanges orientés vers chaque leader (volumes estimés).
function repartitionFlux(iso: string): string {
  const e = etat!, routes = FLUX.filter(f => f.pays.includes(iso) && fluxActif(e, f) && (!f.depuis || f.depuis <= Math.floor(e.round / 4) + 2000));
  const total = routes.reduce((t, f) => t + f.volume, 0);
  if (!total) return "";
  const parMode = (["maritime", "terrestre", "aerien"] as const).map(m => [m, routes.filter(f => f.mode === m).reduce((t, f) => t + f.volume, 0)] as const).filter(x => x[1]);
  const o = lienFlux(e, iso, "OCC"), c = lienFlux(e, iso, "CHN"), pct = (x: number) => `${Math.round(100 * x / total)} %`;
  const noms = { maritime: "maritime", terrestre: "terrestre", aerien: "aérien" };
  return `<div class="flux-pays"><div class="note">Flux (${routes.length} route${routes.length > 1 ? "s" : ""}) : ${parMode.map(([m, v]) => `${noms[m]} ${pct(v)}`).join(" · ")}</div>
    <div class="barre-flux" title="Part des volumes partagés avec chaque leader"><span class="b-occ" style="width:${100 * o / (o + c || 1)}%"></span><span class="b-chn" style="width:${100 * c / (o + c || 1)}%"></span></div>
    <div class="note">vers le bloc USA <span class="occ-t">${o}</span> · vers le bloc Chine <span class="chn-t">${c}</span>${hubsDe(iso).length ? ` · ${hubsDe(iso).map(h => (h.type === "port" ? "⚓ " : "✈ ") + h.nom.split(" (")[0]).join(", ")}` : ""}</div></div>`;
}
function marqueursHorsJeu(): Record<string, Marqueur[]> {
  const out: Record<string, Marqueur[]> = {};
  for (const c of etat!.conflits) { const id = IDS_HORS_JEU[c.iso]; if (id && !etat!.pays[c.iso]) (out[id] ??= []).push({ symbole: "⚔", couleur: "#b03a2e", titre: `Conflit en cours : ${c.titre}` }); }
  return out;
}
const COULEURS_COMMERCE: Record<Complementarite, string> = { reciproque: "#2fae6a", il_a_besoin: "#4f8be0", tu_as_besoin: "#e08a2a", normal: "#7d8290" };
const NOMS_COMMERCE: Record<Complementarite, string> = { reciproque: "besoin réciproque", il_a_besoin: "il a besoin de toi", tu_as_besoin: "tu as besoin de lui", normal: "normal" };
function legende(): string {
  const vue = $<HTMLSelectElement>("vue").value;
  const symboles = `<div class="symboles"><span><i style="background:#d9a441">★</i>historique</span><span><i style="background:#e07b2a">!</i>événement</span><span><i style="background:#b03a2e">⚔</i>conflit</span><span><i style="background:${joueur() === "OCC" ? "#dc4b3c" : "#4f8be0"}">◆</i>adversaire</span><span><i style="background:${joueur() === "OCC" ? "#4f8be0" : "#dc4b3c"}">✓</i>toi</span><span><i style="background:#9b59b6">↯</i>instable</span><span><i style="background:#8a8f98">◈</i>zone stratégique</span><span><i style="background:#6a7f9a">⚖</i>au bord de la bascule</span></div>`
    + (options.influence ? `<div class="note">Chiffres : influence totale <span class="occ-t">bloc USA</span> · <span class="chn-t">bloc Chine</span> (0-100).</div>` : "")
    + (options.categories ? `<div class="note">Pastilles par canal : ${CANAUX_CARTE.map(c => `<span class="leg-canal" style="border-color:${c.couleur}"></span><b style="color:${c.couleur}">${c.lettre}</b> ${c.nom.toLowerCase()}`).join(" · ")} ; remplissage = part <span class="occ-t">bloc USA</span> / <span class="chn-t">bloc Chine</span>.</div>` : "")
    + (options.maritime || options.terrestre || options.aerien ? `<div class="lignes">${options.maritime ? `<span><b class="l-maritime"></b>maritime</span>` : ""}${options.terrestre ? `<span><b class="l-terrestre"></b>terrestre</span>` : ""}${options.aerien ? `<span><b class="l-aerien"></b>aérien</span>` : ""}<span class="note">trait plein = mondial, pointillé = régional, épaisseur = volume ; ≋ détroit ; ⚓ port, ✈ aéroport (grand = majeur), couleur du bloc = concession</span></div>` : "")
    + (options.sigles ? `<div class="note">Sigles : ${Object.entries(SIGLES).map(([k, v]) => `<abbr title="${esc(v)}">${esc(k)}</abbr>`).join(" · ")}</div>` : "");
  if (vue === "commerce") return `<div class="symboles">${(Object.keys(NOMS_COMMERCE) as Complementarite[]).map(k => `<span><i style="background:${COULEURS_COMMERCE[k]}"></i>${NOMS_COMMERCE[k]} (actions économiques ×${String(BOOST_COMMERCE[k]).replace(".", ",")})</span>`).join("")}</div><div class="note">Avec ton leader : énergie, alimentation, métaux, produits industriels (seuils de jeu, estimation, sur données 2000).</div>${symboles}`;
  if (vue === "militaire") return `<div class="degrade"><span>Présence militaire chinoise</span><b style="background:linear-gradient(90deg,${couleurAlignement(-1)},${couleurAlignement(0)},${couleurAlignement(1)})"></b><span>américaine</span></div><div class="note">Valeurs : influence militaire USA / Chine (bases, traités, armes).</div>${symboles}`;
  if (vue === "alignement") return `<div class="degrade"><span>Bloc Chine</span><b style="background:linear-gradient(90deg,${couleurAlignement(-1)},${couleurAlignement(0)},${couleurAlignement(1)})"></b><span>Bloc USA</span></div>${symboles}`;
  const nom = { population: "Population", pib: "PIB", stabilite: "Stabilité", environnement: "Environnement local" }[vue] ?? vue;
  return `<div class="degrade"><span>${nom} faible</span><b style="background:linear-gradient(90deg,${couleurLog(1, 1, 100)},${couleurLog(100, 1, 100)})"></b><span>fort</span></div>${symboles}`;
}

function afficher() {
  if (!etat) return;
  const e = etat, c = e.camps[joueur()], b = bilan(e), monCamp = joueur();
  $("date").textContent = libelle(e.round);
  $("format").textContent = formatDe(e).nom;
  $("periode").textContent = e.round < 26 ? "Prologue 2000-2006 : le bloc rival n'existe pas encore" : e.round < 36 ? "Ère des blocs (BRIC depuis 2006)" : e.round < 80 ? "Ère 2 : l'après-crise et le monde multipolaire" : e.round < 108 ? "Ère 3 : la rivalité des blocs" : "Ère 3 : la rivalité des blocs · au-delà d'octobre 2026, tout est projection";
  $("camp").textContent = `Tu joues : ${NOM_CAMP[monCamp]}`;
  $("camp").className = monCamp === "OCC" ? "occ-t" : "chn-t";
  $("jauges").innerHTML = [
    `<span title="Bilan = moyenne des décomptes annuels du bloc en avance. Progression actuelle : ${(x => (x >= 0 ? "USA " : "Chine ") + nombre(Math.abs(x)))(progression(e))}">Bilan <strong>${avance(b)}</strong></span>`,
    `<span title="Moyenne des 5 familles (économie, population, ressources, armée, environnement) contrôlées par chaque camp">Puissance <strong class="occ-t">${nombre(100 * puissance(e, "OCC"), 0)} %</strong> / <strong class="chn-t">${nombre(100 * puissance(e, "CHN"), 0)} %</strong></span>`,
    `<span title="Tension mondiale ${nombre(e.tension, 0)} / 100">Tension <strong>${cran(e)}/5</strong></span>`,
    `<span title="Capital politique (élections, coûts)">CP <strong>${nombre(c.cp, 0)}</strong></span>`,
    `<span title="Budget versé chaque trimestre : ${nombre(budgetTrimestre(e, monCamp), 1)} (socle + racine du PIB du leader) ; épargne plafonnée à 2 trimestres">Budget <strong>${nombre(c.budget, 1)}</strong></span>`,
    `<span title="Actions du trimestre par domaine, puis points de crise (cartes jouées pour leurs points)">${LISTE_DOMAINES.map(d => `${DOMAINES[d].nom.slice(0, d === "secret" ? 6 : 4)}. <strong>${c.points?.[d] ?? 0}</strong>`).join(" · ")} · Crise <strong>${nombre(c.pa, 0)}</strong></span>`,
    c.briefing ? `<button id="btnBriefing" class="alerte-btn">Briefing en attente</button>` : "",
  ].join("");
  $("btnBriefing")?.addEventListener("click", () => proposerBriefing(true));
  carteMonde.regler(options);
  carteMonde.colorer(couleurs(), legende());
  carteMonde.tracerFlux(FLUX.filter(f => !f.depuis || f.depuis <= Math.floor(e.round / 4) + 2000).map(f => ({ id: f.id, mode: f.mode, portee: f.portee, volume: f.volume, trace: f.trace, actif: fluxActif(e, f),
    titre: `${f.nom} (${f.mode}, ${f.portee === "mondial" ? "mondial" : "régional"}, volume ${f.volume}/5 estimé)${fluxActif(e, f) ? "" : " : COUPÉ par un blocage"}` })),
    [...ZONES_STRATEGIQUES.map(z => { const p = e.zones[z.id], d = p.OCC - p.CHN; return { id: `z_${z.id}`, position: z.position, taille: 1.2, marqueur: { symbole: "◈", couleur: Math.abs(d) < 5 ? "#8a8f98" : d > 0 ? "#3d78d6" : "#d4402f", titre: `Zone stratégique : ${z.nom}. Présence bloc USA ${nombre(p.OCC, 0)}, bloc Chine ${nombre(p.CHN, 0)}. ${z.texte}` } }; }),
     ...(options.maritime ? DETROITS.map(d => { const bloque = e.blocages.some(b => b.detroit === d.id); return { id: d.id, position: d.position, marqueur: { symbole: "≋", couleur: bloque ? "#dc4b3c" : "#2f6f8f", titre: `${d.nom}${bloque ? " : BLOQUÉ" : " : ouvert"}` } }; }) : []),
     ...HUBS.filter(h => h.type === "port" ? options.maritime : options.aerien).map(h => {
       const conc = e.concessions.find(c => c.hub === h.id);
       return { id: h.id, position: h.position, taille: h.rang === "majeur" ? 1 : 0.62, marqueur: { symbole: h.type === "port" ? "⚓" : "✈", couleur: conc ? (conc.camp === "OCC" ? "#3d78d6" : "#d4402f") : h.type === "port" ? "#14506b" : "#4b4f6b",
         titre: `${h.type === "port" ? "Port" : "Aéroport"} ${h.rang} : ${h.nom}, ${nombre(h.volume)} ${h.type === "port" ? "M EVP" : "M passagers"} (estimation 2000)${conc ? ` · concession ${conc.camp === "OCC" ? "bloc USA" : "bloc Chine"} jusqu'en ${libelle(conc.fin)}` : ""}` } };
     })]);
  carteMonde.annoter(annotations(), marqueursHorsJeu());
  document.querySelectorAll<HTMLButtonElement>("[data-option]").forEach(b => b.classList.toggle("actif", options[b.dataset.option as keyof OptionsCarte]));
  carteMonde.choisir(paysChoisi);
  document.querySelectorAll<HTMLButtonElement>("[data-onglet]").forEach(x => x.classList.toggle("actif", x.dataset.onglet === onglet));
  const zone = $("contenu");
  zone.innerHTML = onglet === "main" ? panneauMain() : onglet === "pays" ? panneauPays() : onglet === "score" ? panneauScore() : panneauJournal();
  lierPanneau(zone);
  $<HTMLButtonElement>("btnFin").disabled = e.termine;
}

// Pas de confirm() : les fenêtres natives sont bloquées dans une page intégrée.
// Un duel en attente : fenêtre de jeu, puis le résultat est appliqué au plan.
function lancerDuel(id: string) {
  const d = etat?.duels?.find(x => x.id === id); if (!d || fenetreOuverte()) return;
  const p = etat!.plans?.find(x => x.id === d.plan), pays = p ? paysDuPlanUi(p) : [];
  son("ouvrir", 0.4);
  jouerDuel(d, { boite: $("boite"), ouvrir: () => { $("fenetre").hidden = false; }, fermer, son: n => son(n), noms: pays.map(court),
    titre: d.titre, sousTitre: d.attaquant === joueur() ? "Tu attaques" : "Tu défends", avantage: avantageJoueur(d, joueur()),
    enjeux: enjeuxDuel(etat!, d, joueur()),
    fin: r => { const avant = etat!; tenter(() => conclureDuel(etat!, id, r), r >= 0.6 ? "victoire" : r < 0.4 ? "defaite" : "etape");
      // bilan chiffré : ce que le duel a réellement changé dans la partie
      if (etat !== avant) ouvrir(`<h2>Conséquences du duel</h2><p class="d-fin ${r >= 0.6 ? "gagne" : r < 0.4 ? "perdu" : ""}">${r >= 0.6 ? "Victoire" : r < 0.4 ? "Défaite" : "Match nul"} · ${Math.round(100 * r)} %</p>
        <ul class="d-bilan">${bilanDuel(avant, etat!, d, joueur()).map(t => `<li>${t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))}</li>`).join("")}</ul>
        <div class="actions-fenetre"><button id="okBilan" class="principal">Continuer</button></div>`, b => { b.querySelector<HTMLButtonElement>("#okBilan")!.onclick = fermer; }); } });
}
function finTrimestre() {
  if (!etat || etat.termine || fenetreOuverte()) return;
  const c = etat.camps[joueur()];
  if (carteObligatoire(etat, joueur())) {
    son("erreur");
    ouvrir(`<h2>Carte obligatoire</h2><p>Chaque année, tu dois jouer au moins une carte de chaque type présent dans ta main. Il te reste : ${typesManquants(etat, joueur()).map(t => `carte ${NOMS_TYPES[t]}`).join(", ")}, et plus assez de trimestres pour attendre.</p>
      <div class="actions-fenetre"><button id="revenir" class="principal">Choisir une carte</button></div>`, b => { b.querySelector<HTMLButtonElement>("#revenir")!.onclick = () => { fermer(); onglet = "main"; afficher(); }; });
    return;
  }
  if (!c.carteJouee && c.main.length) {
    ouvrir(`<h2>Aucune carte jouée</h2><p>Tu n'as pas joué de carte ce trimestre. Terminer quand même ?</p>
      <div class="actions-fenetre"><button id="revenir">Revenir</button><button id="terminer" class="principal">Terminer le trimestre</button></div>`,
    b => { b.querySelector<HTMLButtonElement>("#revenir")!.onclick = fermer; b.querySelector<HTMLButtonElement>("#terminer")!.onclick = () => { fermer(); terminer(); }; });
    return;
  }
  terminer();
}
function terminer() {
  son("fin", 0.45);
  avantTour = { puissance: { OCC: puissance(etat!, "OCC"), CHN: puissance(etat!, "CHN") }, alignements: Object.fromEntries(Object.keys(etat!.pays).map(i => [i, alignement(etat!, i)])),
    budget: etat!.camps[joueur()].budget, cp: etat!.camps[joueur()].cp, tension: cran(etat!), progres: Object.fromEntries((etat!.plans ?? []).map(p => [p.id, p.progres])) };
  etat = finRound(etat!);
  carteOuverte = null;
  afficher();
  rapport(etat.termine ? "Dernier trimestre" : "Rapport du trimestre");
}

// ---------- Commandes ----------
document.querySelectorAll<HTMLButtonElement>("[data-onglet]").forEach(x => x.onclick = () => { onglet = x.dataset.onglet!; afficher(); });
$("btnFin").onclick = finTrimestre;
$("vue").onchange = afficher;
$("fenetre").addEventListener("click", ev => { if (ev.target === $("fenetre") && etat) fermer(); });
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape" && fenetreOuverte() && etat) fermer();
  if (ev.key === "Enter" && !fenetreOuverte() && (ev.target as HTMLElement).tagName !== "BUTTON") finTrimestre();
});
$("btnSauver").onclick = () => {
  if (!etat) return;
  try { localStorage.setItem(CLE_SAUVEGARDE, serialiserPartie(etat)); message(`Partie sauvegardée (${libelle(etat.round)}).`); }
  catch { message("Sauvegarde impossible dans ce navigateur : utilise Exporter."); }
};
function reprendre(texte: string, quoi: string) {
  etat = chargerPartie(texte); journalVu = etat.journal.length; briefingVuAuRound = -1; fermer(); afficher(); message(`Partie ${quoi} (${libelle(etat.round)}).`);
}
$("btnCharger").onclick = () => {
  let texte: string | null = null;
  try { texte = localStorage.getItem(CLE_SAUVEGARDE); } catch { /* stockage indisponible */ }
  if (!texte) { message("Aucune sauvegarde dans ce navigateur."); return; }
  try { reprendre(texte, "chargée"); } catch (err) { message((err as Error).message); }
};
$("btnExporter").onclick = () => {
  if (!etat) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([serialiserPartie(etat)], { type: "application/json" }));
  a.download = `occident-brics-${libelle(etat.round).replace(" ", "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$<HTMLInputElement>("fichier").onchange = async ev => {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try { reprendre(await f.text(), "importée"); } catch (err) { message((err as Error).message); }
};
$("btnNouvelle").onclick = choisirCamp;
$("btnAide").onclick = aide;
// Barre d'outils de la carte : options d'affichage (mémorisées dans ce navigateur), plein écran, panneau.
document.querySelectorAll<HTMLButtonElement>("[data-option]").forEach(b => b.onclick = () => {
  const k = b.dataset.option as keyof OptionsCarte; options[k] = !options[k];
  try { localStorage.setItem(CLE_OPTIONS, JSON.stringify(options)); } catch { /* stockage indisponible */ }
  afficher();
});
$("btnPleinEcran").onclick = () => {
  const plein = document.body.classList.toggle("plein-ecran");
  try { if (plein && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {}); else if (!plein && document.fullscreenElement) void document.exitFullscreen(); } catch { /* bloqué dans une page intégrée */ }
  window.dispatchEvent(new Event("resize"));
};
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) document.body.classList.remove("plein-ecran"); });
$("btnPanneau").onclick = () => document.body.classList.toggle("sans-panneau");
const majBoutonSon = () => { $("btnSon").textContent = sonActif() ? "🔊 Son" : "🔇 Son"; };
$("btnSon").onclick = () => { basculerSon(); majBoutonSon(); son("clic"); };
majBoutonSon();
const majBoutonMusique = () => { $("btnMusique").textContent = musiqueActivee() ? "♪ Musique" : "♪ Muette"; };
$("btnMusique").onclick = () => { basculerMusique(); majBoutonMusique(); };
majBoutonMusique();
document.addEventListener("pointerdown", relancerMusique);
document.addEventListener("click", ev => { const b = (ev.target as HTMLElement).closest<HTMLElement>("[data-hymne]"); if (b) jouerHymne(b.dataset.hymne!); });
// petit clic sur les boutons d'interface (les actions de jeu ont leur propre son)
document.addEventListener("click", ev => { const b = (ev.target as HTMLElement).closest("button"); if (b && !b.disabled && (b.dataset.option || b.dataset.onglet || b.closest(".zoom-boutons"))) son("clic", 0.3); });
document.addEventListener("keydown", ev => { if (ev.key === "?" && !fenetreOuverte()) aide(); });

function aide() {
  ouvrir(`<h2>Règles du jeu</h2>
    <h3>Le but</h3>
    <p>Deux blocs s'affrontent pour attirer le reste du monde : le bloc USA et le bloc Chine. Tu ne gouvernes pas les autres pays : tu gagnes leur <strong>influence</strong>, qui décide de leur <strong>alignement</strong>. Le score compte la part du monde que contrôle chaque bloc dans 5 familles (économie, population, matières premières, puissance militaire, environnement local), avec un décompte à chaque fin d'année. De 2000 à 2006, c'est le prologue ; le bloc BRIC naît en 2006.</p>
    <h3>Un trimestre</h3>
    <ol class="conseillers">
      <li><strong>Rapport</strong> : le trimestre des deux blocs (cartes, actions, puissance), l'histoire, ce qui frappe ton camp, ce qui frappe l'adversaire, le reste du monde.</li>
      <li><strong>Réactions</strong> (2 par trimestre) : <em>aider</em> un pays frappé par une crise ou <em>exploiter</em> celle d'un pays qui penche vers l'adversaire (2 budget) ; <em>fermeté</em> ou <em>apaisement</em> face à une crise entre les deux leaders (2 CP) ; <em>riposter</em> à une action annoncée de l'adversaire (2 budget).</li>
      <li><strong>Briefing</strong> (parfois) : une crise, l'avis des conseillers, 2 à 5 options. Les effets affichés sont des fourchettes ; certaines conséquences arrivent plus tard.</li>
      <li><strong>Une carte</strong> (onglet Main) : son <em>événement</em> ou ses <em>points d'action</em> (le chiffre rond).</li>
      <li><strong>Actions</strong> : chaque trimestre, 2 en économie, 2 en diplomatie, 2 en défense et 1 secrète ; une carte jouée pour ses points donne des points de crise utilisables partout ; le budget peut en acheter 2 de plus. 2 points au plus par pays et par trimestre.</li>
      <li><strong>Fin du trimestre</strong> : l'adversaire joue, l'économie avance, les événements tombent.</li>
    </ol>
    <h3>Conseils et plans pluriannuels</h3>
    <p>Tu ne cliques plus pays par pays : tu donnes des <strong>instructions à six conseils</strong> (affaires internationales, économie, militaire, politique et stabilité, infrastructures, éducation et culture). Chaque instruction est un <strong>plan</strong> de 1 an, 18 mois, 2 ans ou 3 ans, discret, normal ou massif, sur un pays, une région, un détroit, un front ou le rival. 5 plans au plus. La <strong>séance annuelle</strong> (1er trimestre) permet tout ; ensuite, un seul ajustement par trimestre. Un plan coûte du budget chaque trimestre, agit un peu chaque trimestre, et les ministères automatiques le suivent. Chaque chef de conseil a un trait (prudent, agressif, corrompu, brillant, loyal) ; tu peux le remplacer à la séance annuelle (2 CP).</p>
    <p><strong>Jalons et duels</strong> : à un tiers, le plan prend de l'élan (ou déclenche un duel si la cible est disputée) ; aux deux tiers, il y a toujours un <strong>duel</strong> contre l'autre bloc : 22 mini-jeux rapides de tactique, de bluff, de mémoire ou de réflexion, chacun avec sa démonstration animée. La préparation (alignement, intensité, puissance) donne un avantage de départ. Tu le joues ou tu laisses tes conseillers le régler. Gagné : le plan avance de 10 points et le rival recule ; perdu : il recule de 25. Une fois par an, tu peux <strong>riposter</strong> à un plan adverse repéré (3 CP) : duel immédiat. Une réserve d'opérations ciblées (+1 par trimestre) se dépense aux 1er et 4e trimestres.</p>
    <h3>Dirigeants</h3>
    <p>Chaque bloc a un <strong>dirigeant</strong> (nom fictif) : quatre aptitudes de 0 à 10 et deux traits parmi 24. <strong>Diplomatie</strong> : gains d'influence politique, culturelle et économique ±3 % par point autour de 5. <strong>Stratégie militaire</strong> : score de guerre +1,5 par trimestre et par point. <strong>Intendance</strong> : budget ±2 % par point. <strong>Intrigue</strong> : risque d'être démasqué −5 % par point, putschs +2 points. Les aptitudes sont tirées autour de 6 : un dirigeant vraiment faible est très rare. 24 traits possibles (belliciste, négociateur, technocrate, grand orateur…). La <strong>popularité</strong> pèse sur la réélection. La <strong>santé</strong> baisse avec l'âge et lors des maladies (plus fréquentes avec l'âge) : sous 30, le dirigeant est affaibli (aptitudes −1, −2 sous 15). À chaque alternance, fin de mandats (8 ans aux États-Unis, 10 en Chine) ou décès, tu choisis le successeur parmi 3 candidats.</p>
    <h3>Guerre, casus belli et expansion agressive</h3>
    <p>Une <strong>intervention armée</strong> a un <strong>but</strong> (changement de régime, base permanente, expédition punitive) et un <strong>score de guerre</strong> de −100 à +100, qui suit chaque trimestre ton avantage militaire dans le pays et la stratégie de ton dirigeant ; deux <strong>batailles décisives</strong> se jouent en duel (±30). Tu signes la paix quand tu veux : chaque terme se paie en points de score (régime ami 60, base 40, expédition punitive 25, démilitarisation 20, réparations 20, influence 15), la paix blanche est toujours possible. À l'échéance, tes conseillers signent pour toi, ou c'est l'enlisement si le score est négatif. Pas d'intervention chez une puissance nucléaire.</p>
    <p><strong>Régions</strong> : 30 pays clés (Ukraine, Taïwan, Irak, Iran, Syrie, Corées…) sont découpés en 2 à 5 régions (population, ressources, valeur stratégique, bases ; estimation), visibles sur leur fiche ; les autres pays sont découpés en 3 régions seulement en cas de guerre. Pendant une intervention, tu occupes des régions à mesure que le score monte (les plus stratégiques d'abord). À la paix, une région occupée peut être <strong>occupée</strong> (recettes, le pays s'agite, révolte possible s'il penche vers l'adversaire, tu peux la rendre ou, après 2 ans d'occupation, l'annexer pour 10 de capital politique si le pays ne penche pas vers l'adversaire) ou <strong>annexée</strong> d'emblée (1,5 fois plus cher, expansion agressive double, définitive : sa population compte pour ton bloc dans le score).</p>
    <p>Un <strong>casus belli</strong> justifie l'intervention : défense d'un allié (×0,25), incident frontalier ou lutte antiterroriste (×0,5), crise humanitaire ou dossier d'armes de destruction massive fabriqué (×0,75, 30 % de risque de scandale), changement de régime (×1, dirigeant belliciste), rivalité ouverte (tension 80, seule justification d'une guerre contre l'autre puissance). Sans casus belli, c'est une <strong>agression</strong> : capital politique −10 et expansion ×3.</p>
    <p>L'<strong>expansion agressive</strong> se compte par région (pleine dans la région visée, moitié dans les voisines, quart ailleurs). À 25, tes actions d'influence y perdent 15 % ; à 50, l'adversaire y gagne de l'influence. Elle nourrit la <strong>méfiance</strong> de chaque pays envers toi, avec sa rancune, la proximité d'un pays que tu attaques ou occupes et son penchant pour l'autre bloc ; un pays qui penche vers toi ou que tu as <strong>apaisé</strong> (1 budget, 2 capital politique, une fois par an) se méfie moins. Au-dessus de 50, il rejoint la <strong>coalition</strong> contre toi (au moins 3 pays pour la former), à condition que ton expansion agressive atteigne 25 dans sa région ou que tu attaques ou occupes un voisin ; il la quitte sous 35 de méfiance ou quand ton expansion dans sa région retombe sous 10. La coalition est menée par sa plus grande économie et soutenue par l'autre bloc : plus d'intervention ni de putsch chez ses membres, tes actions et plans chez eux freinés (10 % + 5 % par membre, 40 % au plus), échanges en recul au-delà de 3 membres, et elle entre dans tes guerres proches (score de guerre −3 à −10 par trimestre). Elle se dissout sous 2 membres.</p>
    <h3>Alliances</h3>
    <p>Trois niveaux : <strong>partenariat stratégique</strong> (le pays penche vers toi d'au moins 0,20 ; influence économique chaque trimestre, méfiance −15), <strong>garantie de défense</strong> (0,40 ; l'adversaire ne peut plus y intervenir, jamais de coalition contre toi), <strong>alliance militaire intégrée</strong> (0,60 après la garantie ; renforce tes guerres dans sa région, entretien 0,3 budget par trimestre ; s'il appelle à l'aide quand l'adversaire attaque un voisin et que tu ne réponds pas en 4 trimestres, capital politique −6 et confiance de tous tes alliés −1). Rompre une alliance coûte 8 de capital politique et de la confiance.</p>
    <h3>Les cartes</h3>
    <p>Chaque année, tu reçois <strong>6 cartes</strong> : 2 de ton camp, 2 du camp adverse, 2 neutres. Tu en joues une par trimestre, donc 4 par an, avec <strong>au moins une de chaque type</strong>. Les 2 restantes sont défaussées en fin d'année. Une carte adverse se joue pour ses points d'action, mais son événement se déclenche alors au profit de l'adversaire : choisis bien le moment.</p>
    <h3>Influence et alignement</h3>
    <p>Chaque pays porte, pour chaque bloc, 4 influences de 0 à 100 : <strong>économique</strong> (35 %), <strong>politique</strong> (30 %), <strong>militaire</strong> (20 %), <strong>culturelle</strong> (15 %). L'influence économique suit le poids de chaque leader et les <strong>flux d'échanges</strong> qui le relient au pays. L'<strong>alignement</strong> va de −1 (bloc Chine) à +1 (bloc USA).</p>
    <h3>Flux et détroits</h3>
    <p>Routes maritimes, terrestres (routes, rail, oléoducs) et aériennes, régionales ou mondiales. Plus un pays partage de routes avec un leader, plus l'influence économique de ce leader y monte. Un <strong>détroit bloqué</strong> (Ormuz, Malacca, Suez…) coupe les routes qui le traversent et freine la croissance des pays qui en dépendent.</p>
    <h3>Ministères et points</h3>
    <p>Chaque trimestre : <strong>2 actions en économie, 2 en diplomatie, 2 en défense, 1 pour les services secrets</strong>, non reportées. Chaque domaine se règle en <strong>automatique</strong> (le ministre joue en fin de trimestre, selon ta priorité et tes orientations), <strong>conseiller</strong> (6 options prêtes, avec leur raison) ou <strong>manuel</strong>. Une carte jouée pour ses points donne des <strong>points de crise</strong>, utilisables dans n'importe quel domaine. <strong>Orientations</strong> : chaque pays peut être à cultiver, surveiller ou contester ; une petite part réglable du budget (5 % par défaut) s'y applique toute seule chaque trimestre. Le budget se compte au dixième.</p>
    <p><strong>Échelles militaires</strong> : coopération (vente d'armes, exercices, base, garantie de défense) pour un pays ami ou neutre ; coercition (intimidation, soutien armé, intervention) pour un pays qui ne penche pas vers toi. On monte cran par cran ; un cran non entretenu 2 ans redescend. Un putsch demande d'avoir intimidé le pays ; un blocus, une base chez un riverain du détroit.</p>
    <h3>Interactions entre blocs</h3>
    <ul class="conseillers">
      <li><strong>Bras de fer</strong> : si les deux blocs dépensent des points d'action sur le même pays au même trimestre, celui qui en a mis le plus gagne +2 d'influence politique, l'autre perd 2 ; le pays perd 1 de stabilité, la tension monte de 0,5.</li>
      <li><strong>Riposte</strong> : une action annoncée de l'adversaire peut être contrée ce trimestre ou le suivant (2 budget : son influence politique −3, la tienne +2).</li>
      <li><strong>Diplomatie</strong> : une initiative par an : sommet, accord commercial (il faut l'accord de l'autre) ou sanctions.</li>
      <li><strong>Ami d'un ami</strong> : quand un pays franchit un palier d'alignement (±0,1, ±0,4), ses voisins et alliés régionaux le suivent lentement, sur 4 trimestres, avec un plafond.</li>
      <li><strong>Court et long terme</strong> : une action donne 2/3 de son effet tout de suite et le reste sur 4 trimestres ; une sur cinq a une conséquence cachée (contrecoup ou succès inattendu).</li>
    </ul>
    <h3>Stratégie et mécanismes cachés</h3>
    <ul class="conseillers">
      <li><strong>Priorité de l'année</strong> : économie, sécurité ou rayonnement ; +${Math.round(100 * (BONUS_PRIORITE - 1))} % sur la famille d'actions choisie (★).</li>
      <li><strong>Investissement durable</strong> : agir sur un même pays plusieurs trimestres de suite renforce l'effet long terme (+25 % par trimestre consécutif, jusqu'à +75 %).</li>
      <li><strong>⚖ Pays au bord de la bascule</strong> : à moins de 0,03 d'un seuil d'alignement ; un petit effort le fait changer de palier (et entraîne ses proches).</li>
      <li><strong>Mémoire des pays</strong> (cachée) : gratitude après une aide ou un projet de développement, rancune après une déstabilisation, un scandale ou une crise exploitée. Elle fait dériver lentement l'influence politique et s'efface avec le temps. Tes ambassadeurs n'en donnent qu'une estimation.</li>
      <li><strong>Renseignement</strong> : révèle les opérations secrètes adverses de l'année, sa main et son agenda probable.</li>
      <li><strong>Agenda secret</strong> : un objectif tiré chaque année pour chaque bloc, révélé en fin d'année ; atteint, il rapporte du capital politique et du budget.</li>
      <li><strong>Dépendance commerciale</strong> : plus les deux blocs échangent, plus les sanctions coûtent aussi à celui qui les impose.</li>
      <li><strong>Usure de l'opinion</strong> (cachée) : les engagements militaires répétés lassent l'opinion et rongent le capital politique ; seuls les sondages t'en avertissent.</li>
    </ul>
    <h3>Zones stratégiques</h3>
    <p>L'<strong>Arctique</strong>, l'<strong>Antarctique</strong>, la <strong>mer de Chine méridionale</strong> et le <strong>golfe de Guinée</strong> n'appartiennent à aucun pays du jeu. Chaque bloc y a une présence de 0 à 100 (missions scientifiques, déploiements navals), qui lui donne une part des ressources mondiales au score (poids : estimation). Sans entretien, la présence s'érode.</p>
    <h3>La carte</h3>
    <ul class="conseillers">
      <li><strong>Boutons</strong> : Noms, Influence (totaux USA · Chine), Catégories (une pastille par canal : É économique, P politique, M militaire, C culturel), Sigles (OTAN, UE, G7, OCS, BRIC, OPEP, ASEAN, ☢ nucléaire), routes maritimes, terrestres, aériennes, Légende, Panneau, Plein écran. Molette : zoom ; glisser : déplacer.</li>
      <li><strong>Symboles</strong> : ★ événement historique, ! événement, ⚔ conflit en cours, ◆ action de l'adversaire, ✓ ton action, ↯ pays instable, ≋ détroit (rouge = bloqué), ⚓ port, ✈ aéroport, ◈ zone stratégique (couleur du bloc le plus présent).</li>
    </ul>
    <h3>Tes ressources</h3>
    <ul class="conseillers">
      <li><strong>Budget</strong> : versé chaque trimestre (socle + racine du PIB de ton leader, estimation de jeu), de quoi financer 4 à 5 des 7 actions ; l'épargne est plafonnée à 2 trimestres de revenu. Il paie cartes, actions et réactions.</li>
      <li><strong>Capital politique (CP)</strong> : ta marge de manœuvre intérieure ; trop bas, l'alternance menace (élection américaine : sous 50 ; congrès chinois : sous 40).</li>
      <li><strong>Tension</strong> (crans 1 à 5) : monte avec les bases, embargos, guerres ; elle ouvre certaines cartes.</li>
    </ul>
    <h3>Événements</h3>
    <p><strong>Historiques</strong> : ${HISTORIQUES.filter(h => h.probabilite === undefined).length} événements réels datés de 2000 à octobre 2026, puis ${HISTORIQUES.filter(h => h.probabilite !== undefined).length} scénarios projetés jusqu'en 2035 qui n'ont lieu qu'avec une certaine probabilité ; certains n'ont pas lieu si la partie a dévié. <strong>Mondiaux</strong> : crises, catastrophes, coups d'État, tirés selon les fréquences réelles, avec leur ville et leur cause. Les événements mondiaux (récession, pétrole, climat) touchent tous les pays ; un bulletin climatique annuel pèse sur tous, davantage sur les pays exposés.</p>
    <h3>Fin de partie</h3>
    <p>Bilan = moyenne des décomptes annuels (onglet Score). Défaite immédiate en cas de banqueroute (PIB du leader à moins de 80 % de son sommet), d'effondrement démographique, ou pour les deux blocs si le réchauffement atteint 3 °C.</p>
    <p class="note">Sons d'interface : packs Kenney (CC0). Bruitages et musiques : CC0, OpenGameArt et Freesound (musiques de cynicmusic, artisticdude, yd, indieteur, eldritch-grim ; bruitages de joth, qubodup, tinyworlds et autres, liste complète dans musiques/LICENCES.md). Illustrations générées pour le jeu. Boutons 🔊 Son et ♪ Musique pour couper.</p>
    <div class="actions-fenetre"><button id="okAide" class="principal">Compris</button></div>`,
  b => { b.querySelector<HTMLButtonElement>("#okAide")!.onclick = () => { fermer(); if (etat && !etat.journal.length) rapport("Début de partie"); }; });
}

const fondPanneau = image("fond_panneau");
if (fondPanneau) document.documentElement.style.setProperty("--fond-panneau", `url(${fondPanneau})`);
choisirCamp();
