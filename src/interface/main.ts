import donnees from "../data/pays2000.json";
import { dessinerCarte, couleurLog, couleurAlignement, CANAUX_CARTE, type Annotation, type Marqueur, type OptionsCarte } from "./carte";
import { image, imageEvenement, portrait, imageBriefing, imageCarte } from "./images";
import { organisations, SIGLES } from "../data/organisations";
import { HUBS, hubsDe } from "../data/hubs";
import { FLUX, DETROITS } from "../data/flux";
import { jouer as son, basculerSon, sonActif, jouerEvenement, jouerJingle, musique, basculerMusique, musiqueActivee, relancerMusique } from "./sons";
import { ficheHtml } from "./fiche";
import {
  creerPartie, finRound, jouerCarte, peutJouerMode, agir, peutAgir, ACTIONS, AIDES_ACTIONS, apercuAction, ZONES, CAMPAGNE, peutCampagne, campagne, paysEligibles, previsionAdverse, acheterPA, peutAcheterPA, PRIX_PA,
  repondreBriefing, KOMI, SEUIL_EGALITE, SEUILS, partFamille, NOMS_FAMILLES, progression, alignement, influenceTotale, cran, bilan, puissance, carte as carteDe, briefing as briefingDe,
  decrireEffet, nomPays, serialiserPartie, chargerPartie, libelle, reagir, peutReagir, REACTIONS, MAX_REACTIONS, fluxActif, lienFlux,
  peutJouerCarte, typeCarte, typesManquants, carteObligatoire, NOMS_TYPES,
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
let avantTour: { puissance: Record<Camp, number>; alignements: Record<string, number> } | null = null;
let debutRapport = 0, titreRapport = "";
const CLE_OPTIONS = "occident-brics-options-carte";
const options: OptionsCarte = (() => {
  const defaut: OptionsCarte = { noms: true, influence: false, categories: false, sigles: false, legende: true, maritime: true, terrestre: true, aerien: false };
  try { return { ...defaut, ...JSON.parse(localStorage.getItem(CLE_OPTIONS) ?? "{}") }; } catch { return defaut; }
})();
// Pays hors jeu où se déroulent des conflits historiques : code ISO numérique de la carte.
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
function tenter(f: () => EtatPartie, s: "action" | "carte" | "clic" = "action") {
  try { etat = f(); son(s); afficher(); } catch (err) { son("erreur"); message((err as Error).message); }
}

// ---------- Fenêtres ----------
function ouvrir(html: string, liaisons: (b: HTMLElement) => void = () => {}) {
  $("boite").innerHTML = html;
  $("fenetre").hidden = false;
  liaisons($("boite"));
}
const fermer = () => { if (!$("fenetre").hidden) son("fermer", 0.3); $("fenetre").hidden = true; };
const fenetreOuverte = () => !$("fenetre").hidden;

function choisirCamp() {
  musique("menu");
  const titre = image("ecran_titre");
  ouvrir(`${titre ? `<div class="bandeau titre-jeu" style="background-image:url(${titre})"><h2>Occident vs BRICS</h2><span>2000-2008 · la naissance des blocs</span></div>` : `<h2>Nouvelle partie</h2>`}<p class="note">Première partie ? Le bouton <strong>Règles</strong> (ou la touche ?) explique tout en 2 minutes.</p>
    <p>De 2000 à 2008, 36 trimestres. Chaque trimestre : joue une carte (son événement ou ses points d'action), dépense tes points d'action sur la carte, réponds aux briefings de crise. Le score compte, pour 5 familles (économie, population, ressources, armée, environnement), la part du monde que contrôle chaque camp ; un décompte a lieu chaque fin d'année.</p>
    <div class="choix-camp">
      <button data-camp="OCC" class="occ"><strong>Bloc USA</strong><span>Les États-Unis et leurs alliés. Riche et influent partout, mais l'essor chinois grignote ta position.</span></button>
      <button data-camp="CHN" class="chn"><strong>Bloc Chine</strong><span>La Chine et ses partenaires. Croissance à deux chiffres, peu d'alliés. Transforme ton poids économique en influence.</span></button>
    </div>`, b => b.querySelectorAll<HTMLButtonElement>("[data-camp]").forEach(x => x.onclick = () => {
    etat = creerPartie(Date.now() % 2147483647, x.dataset.camp as Camp);
    journalVu = 0; briefingVuAuRound = -1; paysChoisi = null; carteOuverte = null; onglet = "main";
    fermer(); rapport("Début de partie"); afficher();
  }));
}

function ligneJournal(j: EntreeJournal, avecReactions = false) {
  const classe = j.camp ? (j.camp === "OCC" ? "occ" : "chn") : "";
  const effets = j.effets?.length ? `<small class="effets">Ce que ça change : ${j.effets.map(esc).join(" · ")}</small>` : "";
  const img = j.type === "historique" || j.type === "generique" ? imageEvenement(j.source, j.famille) : undefined;
  const corps = `<strong>${esc(j.titre)}</strong>${j.texte ? `<br><span>${esc(j.texte)}</span>` : ""}${effets}${avecReactions ? boutonsReaction(j) : ""}`;
  return `<li class="j-${j.type} ${classe} ${img ? "avec-image" : ""}">${img ? `<img src="${img}" alt="" loading="lazy"><div>${corps}</div>` : corps}</li>`;
}
// Boutons « aider » / « exploiter » sous un événement de ce trimestre qui frappe un pays.
function boutonsReaction(j: EntreeJournal): string {
  const index = etat!.journal.indexOf(j);
  if (!j.reactif || index < 0 || j.round !== etat!.round) return "";
  const fait = etat!.camps[joueur()].reactions.includes(index);
  if (fait) return `<div class="reactions"><span class="note">Tu as réagi.</span></div>`;
  const b = (["aider", "exploiter", "fermete", "apaiser"] as TypeReaction[]).map(t => ({ t, err: peutReagir(etat!, joueur(), index, t) }))
    .filter(x => !/leader adverse refuse|n'exploite que|Réservé aux crises|réponds par la fermeté/.test(x.err ?? ""));
  const prix = (t: TypeReaction) => REACTIONS[t].budget ? `${REACTIONS[t].budget} budget` : `${REACTIONS[t].cp} CP`;
  return b.length ? `<div class="reactions">${b.map(x => `<button data-reagir="${x.t}" data-index="${index}" title="${esc(REACTIONS[x.t].texte)}" ${x.err ? "disabled" : ""}>${REACTIONS[x.t].nom} (${prix(x.t)})</button>`).join("")}${b.filter(x => x.err).map(x => `<small class="erreur">${REACTIONS[x.t].nom} : ${esc(x.err!)}</small>`).join("")}</div>` : "";
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
    musique(cran(etat!) >= 3 ? "tension" : etat!.round % 8 < 4 ? "carte" : "calme");
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
  ouvrir(`<h2>${titre} : ${libelle(etat!.round)}</h2>
    ${recapBlocs(tout)}
    ${section("Histoire et politique", histoire, true)}
    ${section(`Ton camp (${NOM_CAMP[moi]}) est touché`, chezMoi, true, noteReaction)}
    ${section(`Chez l'adversaire (${NOM_CAMP[adv]})`, chezAdv, true)}
    ${section("Conséquences de tes choix passés", consequences)}
    ${section("Dans le monde", retenus, true)}
    ${faitsDivers.length ? `<details><summary>${faitsDivers.length} fait${faitsDivers.length > 1 ? "s" : ""} divers et incident${faitsDivers.length > 1 ? "s" : ""} mineur${faitsDivers.length > 1 ? "s" : ""}</summary>${liste(faitsDivers)}</details>` : ""}
    ${autres.length ? `<details><summary>${autres.length} autre${autres.length > 1 ? "s" : ""} événement${autres.length > 1 ? "s" : ""} mineur${autres.length > 1 ? "s" : ""}, loin de ton jeu</summary>${liste(autres, true)}</details>` : ""}
    ${!histoire.length && !chezMoi.length && !chezAdv.length && !consequences.length && !retenus.length ? `<p class="note">Trimestre calme.</p>` : ""}
    <div class="actions-fenetre"><button id="okRapport" class="principal">Continuer</button></div>`,
  b => {
    lierReactions(b, () => { const y = b.scrollTop; rapport(titreRapport, debutRapport); $("boite").scrollTop = y; afficher(); });
    b.querySelector<HTMLButtonElement>("#okRapport")!.onclick = () => { fermer(); if (etat!.termine) finDePartie(); else proposerBriefing(); };
  });
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
    <p class="note">Budget ${nombre(c.budget, 0)} · capital politique ${nombre(c.cp, 0)}. Les effets affichés sont des fourchettes ; l'effet réel est tiré à la décision.</p>
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
  const victoire = gagne && Math.abs(b) >= SEUIL_EGALITE;
  son(victoire ? "victoire" : "defaite", 0.6); jouerJingle(victoire); musique(victoire ? "victoire" : "defaite");
  ouvrir(`<h2>${esc(etat!.resultat ?? "")}</h2>
    <p class="gros">${/Défaite|Catastrophe/.test(etat!.resultat ?? "") ? "Fin de partie anticipée" : Math.abs(b) < SEUIL_EGALITE ? "Égalité" : gagne ? "Tu l'emportes" : "Tu perds"} : avance ${avance(b)} points (bloc USA).</p>
    <p>${esc(fin?.texte ?? "")}</p>
    <p class="note">Le bilan est la moyenne des décomptes annuels : progression depuis 2000 de la puissance de chaque camp (5 familles de qualificatifs à poids égaux), plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(KOMI)} points pour le bloc USA. Égalité sous ${nombre(SEUIL_EGALITE)} point. Détail dans l'onglet Score.</p>
    <div class="actions-fenetre"><button id="rejouer" class="principal">Nouvelle partie</button><button id="voir">Voir la carte</button></div>`,
  bt => { bt.querySelector<HTMLButtonElement>("#rejouer")!.onclick = choisirCamp; bt.querySelector<HTMLButtonElement>("#voir")!.onclick = fermer; });
}

// ---------- Panneau ----------
const cout = (c: { budget?: number; cp?: number }) => [c.budget ? `${c.budget} budget` : "", c.cp ? `${c.cp} CP` : ""].filter(Boolean).join(", ") || "gratuit";

function panneauMain(): string {
  const e = etat!, c = e.camps[joueur()];
  const manque = typesManquants(e, joueur()), oblig = carteObligatoire(e, joueur());
  const suivi = (["camp", "adverse", "neutre"] as const).map(t => `<span class="${c.typesJoues.includes(t) ? "fait" : manque.includes(t) ? "manque" : ""}">${c.typesJoues.includes(t) ? "✓" : "○"} carte ${NOMS_TYPES[t]}</span>`).join("");
  let h = `<div class="suivi-cartes" title="Chaque année : 6 cartes (2 de ton camp, 2 adverses, 2 neutres). Tu en joues une par trimestre, au moins une de chaque type. Les 2 restantes sont défaussées.">Cette année : ${suivi}</div>
    ${oblig ? `<p class="alerte">Obligatoire ce trimestre : une carte ${manque.map(t => NOMS_TYPES[t]).join(" ou ")}.</p>` : ""}
    <p class="note">${c.carteJouee ? "Carte jouée ce trimestre." : "Une carte par trimestre : son événement, ou ses points d'action."} Les cartes ciblées s'appliquent au pays choisi sur la carte${paysChoisi ? ` (<strong>${esc(nomPays(paysChoisi))}</strong>)` : " (aucun choisi)"}.</p>`;
  const aReagir = e.journal.filter(j => j.reactif && j.round === e.round && j.visiblePour.includes(joueur()) && (j.type === "historique" || campTouche(j) !== null || importance(j) >= 3));
  if (aReagir.length) h += `<details class="a-reagir" ${c.reactions.length < MAX_REACTIONS ? "open" : ""}><summary>Réagir aux événements du trimestre (${c.reactions.length}/${MAX_REACTIONS})</summary><ul class="journal">${aReagir.map(j => ligneJournal(j, true)).join("")}</ul></details>`;
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
  const cibles = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN").sort((a, b) => nomPays(a).localeCompare(nomPays(b), "fr"));
  const isoA = paysAction || paysChoisi && cibles.includes(paysChoisi) && paysChoisi || "";
  h += `<details class="agir" open><summary>Agir avec tes points d'action (${nombre(c.pa, 0)} PA)</summary>
    <label class="cible">Pays : <select id="paysAction"><option value="">choisir un pays</option>${cibles.map(x => `<option value="${x}" ${x === isoA ? "selected" : ""}>${esc(nomPays(x))}</option>`).join("")}</select></label>
    ${isoA ? blocActions(isoA) : `<p class="note">Choisis un pays ici ou clique-le sur la carte : influence, actions militaires, opérations secrètes.</p>`}
    ${blocCampagnes()}</details>`;
  const errAchat = peutAcheterPA(e, joueur());
  h += `<div class="achat"><button id="acheter" ${errAchat ? `disabled title="${esc(errAchat)}"` : ""}>Acheter 1 point d'action (${PRIX_PA} budget)</button> <span class="note">2 par trimestre au plus.</span></div>`;
  return h;
}

// Actions sur un pays, groupées (influence, militaire, opérations secrètes), avec ce qu'elles rapportent.
function blocActions(iso: string): string {
  const e = etat!, c = e.camps[joueur()];
  const groupes: [string, TypeAction[]][] = [["Influence", ["politique", "economique", "culturelle", "contre", "developpement", "infrastructure"]], ["Militaire", ["militaire", "armes", "exercices"]], ["Opérations secrètes (invisibles pour l'adversaire, sauf si révélées)", ["clandestin", "destabiliser", "espionnage"]]];
  let h = `<h3>Agir sur ${esc(nomPays(iso))} (${nombre(c.pa, 0)} point${c.pa > 1 ? "s" : ""} d'action, budget ${nombre(c.budget, 0)})</h3>
    <p class="note">Sous chaque action : ce qu'elle rapporte tout de suite, en alignement du pays et en points de puissance pour ton bloc (le score).</p>`;
  for (const [titre, types] of groupes) {
    h += `<h4 class="groupe-actions">${titre}</h4><div class="grille-actions">`;
    for (const type of types) {
      const def = ACTIONS[type], err = peutAgir(e, joueur(), type, iso), ap = apercuAction(e, joueur(), type, iso);
      const gainTxt = ap ? `<em class="gain">alignement ${ap.alignement >= 0 ? "+" : "−"}${nombre(Math.abs(ap.alignement), 3)} · puissance ${ap.puissance >= 0 ? "+" : "−"}${nombre(Math.abs(ap.puissance), 3)} pt</em>` : "";
      h += `<button data-agir="${type}" data-iso="${iso}" title="${esc((def.aide ?? AIDES_ACTIONS[type] ?? "") + (err ? ` (${err})` : ""))}" ${err ? "disabled" : ""}>${def.nom}<small>${def.pa} PA${def.budget ? ` · ${def.budget} budget` : ""}</small>${gainTxt}${err ? `<small class="erreur">${esc(err)}</small>` : ""}</button>`;
    }
    h += `</div>`;
  }
  return h;
}

// Campagnes régionales : impact plus faible, mais sur toute une zone.
function blocCampagnes(): string {
  const e = etat!;
  let h = `<h3>Campagnes régionales</h3><p class="note">${CAMPAGNE.pa} PA et ${CAMPAGNE.budget} de budget : influence +${CAMPAGNE.gain.p} (politique ou économique) ou +${CAMPAGNE.gain.c} (culturelle) dans chaque pays de la zone. Moins fort qu'une action ciblée (+8), mais diffus. Une campagne par zone et par trimestre.</p>
    <div class="campagnes"><select id="zoneCampagne">${Object.entries(ZONES).map(([k, z]) => `<option value="${k}" ${k === zoneCampagne ? "selected" : ""}>${esc(z.nom)} (${z.pays.length} pays)</option>`).join("")}</select>`;
  const err = peutCampagne(e, joueur(), zoneCampagne);
  for (const [canal, nom] of [["p", "Politique"], ["e", "Économique"], ["c", "Culturelle"]] as const)
    h += `<button data-campagne="${canal}" ${err ? `disabled title="${esc(err)}"` : ""}>${nom}</button>`;
  return h + `</div>${err ? `<small class="erreur">${esc(err)}</small>` : ""}`;
}
let zoneCampagne = "afrique", paysAction = "";

function panneauPays(): string {
  if (!paysChoisi) return `<p class="aide">Clique sur un pays en couleur pour ouvrir sa fiche et y agir.</p>`;
  const e = etat!, iso = paysChoisi, p = e.pays[iso], a = alignement(e, iso);
  const pente = Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié du bloc USA" : "penche vers le bloc USA") : (a <= -0.4 ? "allié du bloc Chine" : "penche vers le bloc Chine");
  let h = `<h2>${esc(nomPays(iso))}</h2>
    <p class="gros">Alignement ${avance(a, 2, 0.005)} <span class="note">(${pente})</span></p>
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
  h += `<details class="qualificatifs"><summary>Qualificatifs du pays (données 2000)</summary>${ficheHtml(iso, etatV01).replace(/<h2>.*?<\/h2>/, "")}</details>`;
  return h;
}

function panneauScore(): string {
  const e = etat!;
  let h = `<h2>Score</h2><p class="note">Pour chaque famille, part du total des 50 pays contrôlée par chaque camp : le leader compte en entier, les autres pays au prorata de leur alignement. Les 5 familles pèsent autant.</p>
    <table><tr><td></td><td class="v occ-t">USA</td><td class="v chn-t">Chine</td></tr>`;
  for (const f of Object.keys(NOMS_FAMILLES) as (keyof typeof NOMS_FAMILLES)[])
    h += `<tr><td>${NOMS_FAMILLES[f]}</td><td class="v">${nombre(100 * partFamille(e, "OCC", f), 0)} %</td><td class="v">${nombre(100 * partFamille(e, "CHN", f), 0)} %</td></tr>`;
  h += `<tr><td><strong>Puissance</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "OCC"))} %</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "CHN"))} %</strong></td></tr></table>
    <h3>Décomptes annuels (bloc en avance)</h3>`;
  h += e.decomptes.length ? `<table>${e.decomptes.map((d, i) => `<tr><td>Fin ${2000 + i}</td><td class="v">${avance(d)}</td></tr>`).join("")}
    <tr><td><strong>Moyenne = bilan</strong></td><td class="v"><strong>${avance(bilan(e))}</strong></td></tr></table>` : `<p class="note">Premier décompte fin 2000.</p>`;
  h += `<p class="note">Chaque décompte mesure la progression depuis 2000 : écart de puissance entre les camps, plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(KOMI)} points pour le bloc USA, versée au prorata du temps. Égalité sous ${nombre(SEUIL_EGALITE)} point.</p>
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
  zone.querySelector<HTMLButtonElement>("#acheter")?.addEventListener("click", () => tenter(() => acheterPA(etat!, joueur())));
  lierReactions(zone, afficher);
  zone.querySelectorAll<HTMLButtonElement>("[data-agir]").forEach(b => b.onclick = () => tenter(() => agir(etat!, joueur(), b.dataset.agir as TypeAction, b.dataset.iso ?? paysChoisi!)));
  zone.querySelectorAll<HTMLSelectElement>("[data-cible]").forEach(sel => sel.onchange = () => { paysChoisi = sel.value || null; carteMonde.choisir(paysChoisi); afficher(); });
  zone.querySelector<HTMLSelectElement>("#paysAction")?.addEventListener("change", ev => { paysAction = (ev.target as HTMLSelectElement).value; if (paysAction) paysChoisi = paysAction; afficher(); });
  zone.querySelector<HTMLSelectElement>("#zoneCampagne")?.addEventListener("change", ev => { zoneCampagne = (ev.target as HTMLSelectElement).value; afficher(); });
  zone.querySelectorAll<HTMLButtonElement>("[data-campagne]").forEach(b => b.onclick = () => tenter(() => campagne(etat!, joueur(), zoneCampagne, b.dataset.campagne as "p" | "e" | "c")));
}

// ---------- Affichage ----------
function couleurs(): Record<string, string> {
  const e = etat!, vue = $<HTMLSelectElement>("vue").value, isos = Object.keys(e.pays);
  if (vue === "alignement") return Object.fromEntries(isos.map(i => [i, couleurAlignement(alignement(e, i))]));
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
  for (const c of etat!.conflits) { const id = IDS_HORS_JEU[c.iso]; if (id) (out[id] ??= []).push({ symbole: "⚔", couleur: "#b03a2e", titre: `Conflit en cours : ${c.titre}` }); }
  return out;
}
function legende(): string {
  const vue = $<HTMLSelectElement>("vue").value;
  const symboles = `<div class="symboles"><span><i style="background:#d9a441">★</i>historique</span><span><i style="background:#e07b2a">!</i>événement</span><span><i style="background:#b03a2e">⚔</i>conflit</span><span><i style="background:${joueur() === "OCC" ? "#dc4b3c" : "#4f8be0"}">◆</i>adversaire</span><span><i style="background:${joueur() === "OCC" ? "#4f8be0" : "#dc4b3c"}">✓</i>toi</span><span><i style="background:#9b59b6">↯</i>instable</span></div>`
    + (options.influence ? `<div class="note">Chiffres : influence totale <span class="occ-t">bloc USA</span> · <span class="chn-t">bloc Chine</span> (0-100).</div>` : "")
    + (options.categories ? `<div class="note">Pastilles par canal : ${CANAUX_CARTE.map(c => `<span class="leg-canal" style="border-color:${c.couleur}"></span><b style="color:${c.couleur}">${c.lettre}</b> ${c.nom.toLowerCase()}`).join(" · ")} ; remplissage = part <span class="occ-t">bloc USA</span> / <span class="chn-t">bloc Chine</span>.</div>` : "")
    + (options.maritime || options.terrestre || options.aerien ? `<div class="lignes">${options.maritime ? `<span><b class="l-maritime"></b>maritime</span>` : ""}${options.terrestre ? `<span><b class="l-terrestre"></b>terrestre</span>` : ""}${options.aerien ? `<span><b class="l-aerien"></b>aérien</span>` : ""}<span class="note">trait plein = mondial, pointillé = régional, épaisseur = volume ; ≋ détroit ; ⚓ port, ✈ aéroport (grand = majeur), couleur du bloc = concession</span></div>` : "")
    + (options.sigles ? `<div class="note">Sigles : ${Object.entries(SIGLES).map(([k, v]) => `<abbr title="${esc(v)}">${esc(k)}</abbr>`).join(" · ")}</div>` : "");
  if (vue === "militaire") return `<div class="degrade"><span>Présence militaire chinoise</span><b style="background:linear-gradient(90deg,${couleurAlignement(-1)},${couleurAlignement(0)},${couleurAlignement(1)})"></b><span>américaine</span></div><div class="note">Valeurs : influence militaire USA / Chine (bases, traités, armes).</div>${symboles}`;
  if (vue === "alignement") return `<div class="degrade"><span>Bloc Chine</span><b style="background:linear-gradient(90deg,${couleurAlignement(-1)},${couleurAlignement(0)},${couleurAlignement(1)})"></b><span>Bloc USA</span></div>${symboles}`;
  const nom = { population: "Population", pib: "PIB", stabilite: "Stabilité", environnement: "Environnement local" }[vue] ?? vue;
  return `<div class="degrade"><span>${nom} faible</span><b style="background:linear-gradient(90deg,${couleurLog(1, 1, 100)},${couleurLog(100, 1, 100)})"></b><span>fort</span></div>${symboles}`;
}

function afficher() {
  if (!etat) return;
  const e = etat, c = e.camps[joueur()], b = bilan(e), monCamp = joueur();
  $("date").textContent = libelle(e.round);
  $("periode").textContent = e.round < 26 ? "Prologue 2000-2006 : le bloc rival n'existe pas encore" : "Ère des blocs (BRIC depuis 2006)";
  $("camp").textContent = `Tu joues : ${NOM_CAMP[monCamp]}`;
  $("camp").className = monCamp === "OCC" ? "occ-t" : "chn-t";
  $("jauges").innerHTML = [
    `<span title="Bilan = moyenne des décomptes annuels du bloc en avance. Progression actuelle : ${(x => (x >= 0 ? "USA " : "Chine ") + nombre(Math.abs(x)))(progression(e))}">Bilan <strong>${avance(b)}</strong></span>`,
    `<span title="Moyenne des 5 familles (économie, population, ressources, armée, environnement) contrôlées par chaque camp">Puissance <strong class="occ-t">${nombre(100 * puissance(e, "OCC"), 0)} %</strong> / <strong class="chn-t">${nombre(100 * puissance(e, "CHN"), 0)} %</strong></span>`,
    `<span title="Tension mondiale ${nombre(e.tension, 0)} / 100">Tension <strong>${cran(e)}/5</strong></span>`,
    `<span title="Capital politique (élections, coûts)">CP <strong>${nombre(c.cp, 0)}</strong></span>`,
    `<span title="Budget annuel = PIB du leader / 1 000 Md">Budget <strong>${nombre(c.budget, 0)}</strong></span>`,
    `<span title="Points d'action ce trimestre">PA <strong>${nombre(c.pa, 0)}</strong></span>`,
    c.briefing ? `<button id="btnBriefing" class="alerte-btn">Briefing en attente</button>` : "",
  ].join("");
  $("btnBriefing")?.addEventListener("click", () => proposerBriefing(true));
  carteMonde.regler(options);
  carteMonde.colorer(couleurs(), legende());
  carteMonde.tracerFlux(FLUX.filter(f => !f.depuis || f.depuis <= Math.floor(e.round / 4) + 2000).map(f => ({ id: f.id, mode: f.mode, portee: f.portee, volume: f.volume, trace: f.trace, actif: fluxActif(e, f),
    titre: `${f.nom} (${f.mode}, ${f.portee === "mondial" ? "mondial" : "régional"}, volume ${f.volume}/5 estimé)${fluxActif(e, f) ? "" : " : COUPÉ par un blocage"}` })),
    [...(options.maritime ? DETROITS.map(d => { const bloque = e.blocages.some(b => b.detroit === d.id); return { id: d.id, position: d.position, marqueur: { symbole: "≋", couleur: bloque ? "#dc4b3c" : "#2f6f8f", titre: `${d.nom}${bloque ? " : BLOQUÉ" : " : ouvert"}` } }; }) : []),
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
  avantTour = { puissance: { OCC: puissance(etat!, "OCC"), CHN: puissance(etat!, "CHN") }, alignements: Object.fromEntries(Object.keys(etat!.pays).map(i => [i, alignement(etat!, i)])) };
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
      <li><strong>Réactions</strong> (2 par trimestre, 2 budget chacune) : <em>aider</em> un pays frappé par une crise (stabilité et influence politique), ou <em>exploiter</em> la crise d'un pays qui penche vers l'adversaire.</li>
      <li><strong>Briefing</strong> (parfois) : une crise, l'avis des conseillers, 2 à 5 options. Les effets affichés sont des fourchettes ; certaines conséquences arrivent plus tard.</li>
      <li><strong>Une carte</strong> (onglet Main) : son <em>événement</em> ou ses <em>points d'action</em> (le chiffre rond).</li>
      <li><strong>Points d'action</strong> : clique un pays (onglet Pays) et agis : influence politique, culturelle, économique, présence militaire, contre-influence, développement. 2 points au plus par pays et par trimestre ; le budget peut acheter 2 points de plus.</li>
      <li><strong>Fin du trimestre</strong> : l'adversaire joue, l'économie avance, les événements tombent.</li>
    </ol>
    <h3>Les cartes</h3>
    <p>Chaque année, tu reçois <strong>6 cartes</strong> : 2 de ton camp, 2 du camp adverse, 2 neutres. Tu en joues une par trimestre, donc 4 par an, avec <strong>au moins une de chaque type</strong>. Les 2 restantes sont défaussées en fin d'année. Une carte adverse se joue pour ses points d'action, mais son événement se déclenche alors au profit de l'adversaire : choisis bien le moment.</p>
    <h3>Influence et alignement</h3>
    <p>Chaque pays porte, pour chaque bloc, 4 influences de 0 à 100 : <strong>économique</strong> (35 %), <strong>politique</strong> (30 %), <strong>militaire</strong> (20 %), <strong>culturelle</strong> (15 %). L'influence économique suit le poids de chaque leader et les <strong>flux d'échanges</strong> qui le relient au pays. L'<strong>alignement</strong> va de −1 (bloc Chine) à +1 (bloc USA).</p>
    <h3>Flux et détroits</h3>
    <p>Routes maritimes, terrestres (routes, rail, oléoducs) et aériennes, régionales ou mondiales. Plus un pays partage de routes avec un leader, plus l'influence économique de ce leader y monte. Un <strong>détroit bloqué</strong> (Ormuz, Malacca, Suez…) coupe les routes qui le traversent et freine la croissance des pays qui en dépendent.</p>
    <h3>La carte</h3>
    <ul class="conseillers">
      <li><strong>Boutons</strong> : Noms, Influence (totaux USA · Chine), Catégories (une pastille par canal : É économique, P politique, M militaire, C culturel), Sigles (OTAN, UE, G7, OCS, BRIC, OPEP, ASEAN, ☢ nucléaire), routes maritimes, terrestres, aériennes, Légende, Panneau, Plein écran. Molette : zoom ; glisser : déplacer.</li>
      <li><strong>Symboles</strong> : ★ événement historique, ! événement, ⚔ conflit en cours, ◆ action de l'adversaire, ✓ ton action, ↯ pays instable, ⚓ détroit (rouge = bloqué).</li>
    </ul>
    <h3>Tes ressources</h3>
    <ul class="conseillers">
      <li><strong>Budget</strong> : versé chaque année selon le PIB de ton leader ; paie cartes, actions, réactions.</li>
      <li><strong>Capital politique (CP)</strong> : ta marge de manœuvre intérieure ; sous 50, l'alternance menace aux élections.</li>
      <li><strong>Tension</strong> (crans 1 à 5) : monte avec les bases, embargos, guerres ; elle ouvre certaines cartes.</li>
    </ul>
    <h3>Événements</h3>
    <p><strong>Historiques</strong> : 53 événements réels datés de 2000 à 2008 ; certains n'ont pas lieu si la partie a dévié. <strong>Mondiaux</strong> : crises, catastrophes, coups d'État, tirés selon les fréquences réelles, avec leur ville et leur cause. Les événements mondiaux (récession, pétrole, climat) touchent tous les pays ; un bulletin climatique annuel pèse sur tous, davantage sur les pays exposés.</p>
    <h3>Fin de partie</h3>
    <p>Bilan = moyenne des décomptes annuels (onglet Score). Défaite immédiate en cas de banqueroute (PIB du leader à moins de 80 % de son sommet), d'effondrement démographique, ou pour les deux blocs si le réchauffement atteint 3 °C.</p>
    <p class="note">Sons d'interface : packs Kenney (CC0). Bruitages et musiques : CC0, OpenGameArt et Freesound (musiques de cynicmusic, artisticdude, yd, indieteur, eldritch-grim ; bruitages de joth, qubodup, tinyworlds et autres, liste complète dans musiques/LICENCES.md). Illustrations générées pour le jeu. Boutons 🔊 Son et ♪ Musique pour couper.</p>
    <div class="actions-fenetre"><button id="okAide" class="principal">Compris</button></div>`,
  b => { b.querySelector<HTMLButtonElement>("#okAide")!.onclick = () => { fermer(); if (etat && !etat.journal.length) rapport("Début de partie"); }; });
}

const fondPanneau = image("fond_panneau");
if (fondPanneau) document.documentElement.style.setProperty("--fond-panneau", `url(${fondPanneau})`);
choisirCamp();
