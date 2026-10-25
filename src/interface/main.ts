import donnees from "../data/pays2000.json";
import { dessinerCarte, couleurLog, couleurAlignement } from "./carte";
import { ficheHtml } from "./fiche";
import {
  creerPartie, finRound, jouerCarte, peutJouerMode, agir, peutAgir, ACTIONS, acheterPA, peutAcheterPA, PRIX_PA,
  repondreBriefing, KOMI, SEUIL_EGALITE, SEUILS, partFamille, NOMS_FAMILLES, progression, alignement, influenceTotale, cran, bilan, puissance, carte as carteDe, briefing as briefingDe,
  decrireEffet, nomPays, serialiserPartie, chargerPartie, libelle, type EtatPartie, type TypeAction, type EntreeJournal,
} from "../moteur/partie";
import { CANAUX, adversaire, type Camp } from "../moteur/types";
import type { EtatJeu } from "../moteur/etat";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const CLE_SAUVEGARDE = "occident-brics-partie";
const NOM_CAMP: Record<Camp, string> = { OCC: "Occident", CHN: "Chine" };
const NOM_CANAL = { e: "Économique", p: "Politique", m: "Militaire", c: "Culturelle" };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nombre = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const signe = (x: number, d = 1) => (x >= 0 ? "+" : "") + nombre(x, d);

let etat: EtatPartie | null = null;
let paysChoisi: string | null = null;
let onglet = "main";
let carteOuverte: string | null = null;
let journalVu = 0;
let briefingVuAuRound = -1;

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
function tenter(f: () => EtatPartie) {
  try { etat = f(); afficher(); } catch (err) { message((err as Error).message); }
}

// ---------- Fenêtres ----------
function ouvrir(html: string, liaisons: (b: HTMLElement) => void = () => {}) {
  $("boite").innerHTML = html;
  $("fenetre").hidden = false;
  liaisons($("boite"));
}
const fermer = () => { $("fenetre").hidden = true; };
const fenetreOuverte = () => !$("fenetre").hidden;

function choisirCamp() {
  ouvrir(`<h2>Nouvelle partie</h2>
    <p>De 2000 à 2008, 36 trimestres. Chaque trimestre : joue une carte (son événement ou ses points d'action), dépense tes points d'action sur la carte, réponds aux briefings de crise. Le score compte, pour 5 familles (économie, population, ressources, armée, environnement), la part du monde que contrôle chaque camp ; un décompte a lieu chaque fin d'année.</p>
    <div class="choix-camp">
      <button data-camp="OCC" class="occ"><strong>Occident</strong><span>États-Unis et alliés. Riche et influent partout, mais l'essor chinois grignote ta position.</span></button>
      <button data-camp="CHN" class="chn"><strong>Chine</strong><span>Croissance à deux chiffres, peu d'alliés. Transforme ton poids économique en influence.</span></button>
    </div>`, b => b.querySelectorAll<HTMLButtonElement>("[data-camp]").forEach(x => x.onclick = () => {
    etat = creerPartie(Date.now() % 2147483647, x.dataset.camp as Camp);
    journalVu = 0; briefingVuAuRound = -1; paysChoisi = null; carteOuverte = null; onglet = "main";
    fermer(); rapport("Début de partie"); afficher();
  }));
}

function ligneJournal(j: EntreeJournal) {
  const classe = j.camp ? (j.camp === "OCC" ? "occ" : "chn") : "";
  return `<li class="j-${j.type} ${classe}"><strong>${esc(j.titre)}</strong><br><span>${esc(j.texte)}</span></li>`;
}
const visibles = (debut = 0) => etat!.journal.slice(debut).filter(j => j.visiblePour.includes(joueur()) && j.type !== "action");

function rapport(titre: string) {
  const neuf = visibles(journalVu);
  journalVu = etat!.journal.length;
  const majeurs = neuf.filter(j => j.type !== "generique"), mineurs = neuf.filter(j => j.type === "generique");
  ouvrir(`<h2>${titre} : ${libelle(etat!.round)}</h2>
    ${majeurs.length ? `<ul class="journal">${majeurs.map(ligneJournal).join("")}</ul>` : `<p class="note">Aucun événement majeur.</p>`}
    ${mineurs.length ? `<details><summary>${mineurs.length} événement${mineurs.length > 1 ? "s" : ""} dans le monde</summary><ul class="journal">${mineurs.map(ligneJournal).join("")}</ul></details>` : ""}
    <div class="actions-fenetre"><button id="okRapport" class="principal">Continuer</button></div>`,
  b => { b.querySelector<HTMLButtonElement>("#okRapport")!.onclick = () => { fermer(); if (etat!.termine) finDePartie(); else proposerBriefing(); }; });
}

function proposerBriefing(forcer = false) {
  const id = etat!.camps[joueur()].briefing;
  if (!id || (!forcer && briefingVuAuRound === etat!.round)) return;
  briefingVuAuRound = etat!.round;
  const b = briefingDe(id), c = etat!.camps[joueur()];
  ouvrir(`<h2>Briefing : ${esc(b.titre)}</h2>
    <p>${esc(b.dossier)}</p>
    <h3>Avis des conseillers</h3>
    <ul class="conseillers">${b.conseillers.map(x => `<li><strong>${esc(x.role)}</strong> : ${esc(x.avis)}</li>`).join("")}</ul>
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
  ouvrir(`<h2>${esc(etat!.resultat ?? "")}</h2>
    <p class="gros">${/Défaite|Catastrophe/.test(etat!.resultat ?? "") ? "Fin de partie anticipée" : Math.abs(b) < SEUIL_EGALITE ? "Égalité" : gagne ? "Tu l'emportes" : "Tu perds"} : bilan ${signe(b)} points (positif = Occident).</p>
    <p>${esc(fin?.texte ?? "")}</p>
    <p class="note">Le bilan est la moyenne des décomptes annuels : progression depuis 2000 de la puissance de chaque camp (5 familles de qualificatifs à poids égaux), plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(KOMI)} points pour l'Occident. Égalité sous ${nombre(SEUIL_EGALITE)} point. Détail dans l'onglet Score.</p>
    <div class="actions-fenetre"><button id="rejouer" class="principal">Nouvelle partie</button><button id="voir">Voir la carte</button></div>`,
  bt => { bt.querySelector<HTMLButtonElement>("#rejouer")!.onclick = choisirCamp; bt.querySelector<HTMLButtonElement>("#voir")!.onclick = fermer; });
}

// ---------- Panneau ----------
const cout = (c: { budget?: number; cp?: number }) => [c.budget ? `${c.budget} budget` : "", c.cp ? `${c.cp} CP` : ""].filter(Boolean).join(", ") || "gratuit";

function panneauMain(): string {
  const e = etat!, c = e.camps[joueur()];
  let h = `<p class="note">${c.carteJouee ? "Carte jouée ce trimestre." : "Une carte par trimestre : son événement, ou ses points d'action."} Les cartes ciblées s'appliquent au pays choisi sur la carte${paysChoisi ? ` (<strong>${esc(nomPays(paysChoisi))}</strong>)` : " (aucun choisi)"}.</p>`;
  if (!c.main.length) h += `<p class="note">Main vide : nouvelle main au premier trimestre.</p>`;
  for (const id of c.main) {
    const k = carteDe(id), adverse = k.camp === adversaire(joueur()), ouverte = carteOuverte === id;
    h += `<article class="carte-jeu ${k.camp === "OCC" ? "occ" : k.camp === "CHN" ? "chn" : "neutre"} ${ouverte ? "ouverte" : ""}" data-carte="${id}">
      <header><strong>${esc(k.titre)}</strong><span class="valeur" title="Points d'action">${k.valeur}</span></header>
      <p>${esc(k.texte)}</p>`;
    if (ouverte) {
      if (adverse) h += `<p class="alerte">Carte adverse : tu peux la jouer pour ses points, mais son événement se déclenche alors au profit de l'adversaire.</p>`;
      else k.modes.forEach((m, i) => {
        const pays = m.cible === "pays" ? paysChoisi ?? undefined : undefined;
        const err = c.carteJouee ? "Carte déjà jouée ce trimestre." : peutJouerMode(e, joueur(), id, i, pays);
        h += `<div class="mode"><div><strong>${esc(m.nom)}</strong> <em>${cout(m.cout)}${m.cible === "pays" ? " · cible un pays" : ""}</em></div>
          <small>${m.effets.map(ef => esc(decrireEffet(e, ef, joueur(), pays, 0.3))).join("<br>")}${m.caches?.length ? "<br><i>Conséquences incertaines possibles.</i>" : ""}</small>
          <button data-jouer="${i}" ${err ? `disabled title="${esc(err)}"` : ""}>Jouer l'événement</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}</div>`;
      });
      h += `<button data-points ${c.carteJouee ? "disabled" : ""}>Jouer pour ${k.valeur} point${k.valeur > 1 ? "s" : ""} d'action</button>`;
    }
    h += `</article>`;
  }
  const errAchat = peutAcheterPA(e, joueur());
  h += `<div class="achat"><button id="acheter" ${errAchat ? `disabled title="${esc(errAchat)}"` : ""}>Acheter 1 point d'action (${PRIX_PA} budget)</button> <span class="note">2 par trimestre au plus.</span></div>`;
  return h;
}

function panneauPays(): string {
  if (!paysChoisi) return `<p class="aide">Clique sur un pays en couleur pour ouvrir sa fiche et y agir.</p>`;
  const e = etat!, iso = paysChoisi, p = e.pays[iso], a = alignement(e, iso);
  const pente = Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié de l'Occident" : "penche vers l'Occident") : (a <= -0.4 ? "allié de la Chine" : "penche vers la Chine");
  let h = `<h2>${esc(nomPays(iso))}</h2>
    <p class="gros">Alignement ${signe(a, 2)} <span class="note">(${pente})</span></p>
    <table><tr><td>PIB</td><td class="v">${nombre(p.pib / 1e9, 0)} Md USD <span class="note">(int-$ 2011)</span></td></tr>
    <tr><td>Population</td><td class="v">${nombre(p.population / 1e6)} millions</td></tr>
    <tr><td>Stabilité</td><td class="v">${nombre(p.stabilite, 0)} / 100</td></tr></table>`;
  if (iso !== "USA" && iso !== "CHN") {
    h += `<h3>Influence (0 à 100)</h3><table><tr><td></td><td class="v occ-t">Occident</td><td class="v chn-t">Chine</td></tr>
      ${CANAUX.map(k => `<tr><td>${NOM_CANAL[k]}</td><td class="v">${nombre(p.influence.OCC[k], 0)}</td><td class="v">${nombre(p.influence.CHN[k], 0)}</td></tr>`).join("")}
      <tr><td><strong>Total pondéré</strong></td><td class="v"><strong>${nombre(influenceTotale(p, "OCC"))}</strong></td><td class="v"><strong>${nombre(influenceTotale(p, "CHN"))}</strong></td></tr></table>
      <h3>Agir (${nombre(e.camps[joueur()].pa, 0)} point${e.camps[joueur()].pa > 1 ? "s" : ""} d'action)</h3><div class="grille-actions">`;
    for (const [type, def] of Object.entries(ACTIONS) as [TypeAction, typeof ACTIONS[TypeAction]][]) {
      const err = peutAgir(e, joueur(), type, iso);
      h += `<button data-agir="${type}" ${err ? `disabled title="${esc(err)}"` : ""}>${def.nom}<small>${def.pa} PA${def.budget ? ` · ${def.budget} budget` : ""}</small></button>`;
    }
    h += `</div>`;
  } else h += `<p class="note">Leader de camp : pas de cible d'influence.</p>`;
  // Données 2000 et qualificatifs de la v0.1 (attributs en 5 familles)
  const etatV01 = { pays: { [iso]: { population: p.population } }, round: e.round } as unknown as EtatJeu;
  h += `<details class="qualificatifs"><summary>Qualificatifs du pays (données 2000)</summary>${ficheHtml(iso, etatV01).replace(/<h2>.*?<\/h2>/, "")}</details>`;
  return h;
}

function panneauScore(): string {
  const e = etat!;
  let h = `<h2>Score</h2><p class="note">Pour chaque famille, part du total des 50 pays contrôlée par chaque camp : le leader compte en entier, les autres pays au prorata de leur alignement. Les 5 familles pèsent autant.</p>
    <table><tr><td></td><td class="v occ-t">Occident</td><td class="v chn-t">Chine</td></tr>`;
  for (const f of Object.keys(NOMS_FAMILLES) as (keyof typeof NOMS_FAMILLES)[])
    h += `<tr><td>${NOMS_FAMILLES[f]}</td><td class="v">${nombre(100 * partFamille(e, "OCC", f), 0)} %</td><td class="v">${nombre(100 * partFamille(e, "CHN", f), 0)} %</td></tr>`;
  h += `<tr><td><strong>Puissance</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "OCC"))} %</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "CHN"))} %</strong></td></tr></table>
    <h3>Décomptes annuels (positif = Occident)</h3>`;
  h += e.decomptes.length ? `<table>${e.decomptes.map((d, i) => `<tr><td>Fin ${2000 + i}</td><td class="v ${d >= 0 ? "occ-t" : "chn-t"}">${signe(d)}</td></tr>`).join("")}
    <tr><td><strong>Moyenne = bilan</strong></td><td class="v"><strong>${signe(bilan(e))}</strong></td></tr></table>` : `<p class="note">Premier décompte fin 2000.</p>`;
  h += `<p class="note">Chaque décompte mesure la progression depuis 2000 : écart de puissance entre les camps, plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(KOMI)} points pour l'Occident, versée au prorata du temps. Égalité sous ${nombre(SEUIL_EGALITE)} point.</p>
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
      tenter(() => jouerCarte(etat!, joueur(), { carte: id, usage: "evenement", mode, pays: m.cible === "pays" ? paysChoisi ?? undefined : undefined }));
      carteOuverte = null; afficher();
    });
    art.querySelector<HTMLButtonElement>("[data-points]")?.addEventListener("click", () => {
      tenter(() => jouerCarte(etat!, joueur(), { carte: id, usage: "points" })); carteOuverte = null; afficher();
    });
  });
  zone.querySelector<HTMLButtonElement>("#acheter")?.addEventListener("click", () => tenter(() => acheterPA(etat!, joueur())));
  zone.querySelectorAll<HTMLButtonElement>("[data-agir]").forEach(b => b.onclick = () => tenter(() => agir(etat!, joueur(), b.dataset.agir as TypeAction, paysChoisi!)));
}

// ---------- Affichage ----------
function couleurs(): Record<string, string> {
  const e = etat!, vue = $<HTMLSelectElement>("vue").value, isos = Object.keys(e.pays);
  if (vue === "alignement") return Object.fromEntries(isos.map(i => [i, couleurAlignement(alignement(e, i))]));
  const val = (i: string) => vue === "population" ? e.pays[i].population : vue === "pib" ? e.pays[i].pib : vue === "environnement" ? e.pays[i].environnement + 1 : e.pays[i].stabilite + 1;
  const vs = isos.map(val), min = Math.min(...vs), max = Math.max(...vs);
  return Object.fromEntries(isos.map(i => [i, couleurLog(val(i), min, max)]));
}

function afficher() {
  if (!etat) return;
  const e = etat, c = e.camps[joueur()], b = bilan(e), monCamp = joueur();
  $("date").textContent = libelle(e.round);
  $("camp").textContent = `Tu joues : ${NOM_CAMP[monCamp]}`;
  $("camp").className = monCamp === "OCC" ? "occ-t" : "chn-t";
  $("jauges").innerHTML = [
    `<span title="Bilan = moyenne des décomptes annuels (positif = Occident). Progression actuelle : ${signe(progression(e))}">Bilan <strong class="${b >= 0 ? "occ-t" : "chn-t"}">${signe(b)}</strong></span>`,
    `<span title="Moyenne des 5 familles (économie, population, ressources, armée, environnement) contrôlées par chaque camp">Puissance <strong class="occ-t">${nombre(100 * puissance(e, "OCC"), 0)} %</strong> / <strong class="chn-t">${nombre(100 * puissance(e, "CHN"), 0)} %</strong></span>`,
    `<span title="Tension mondiale ${nombre(e.tension, 0)} / 100">Tension <strong>${cran(e)}/5</strong></span>`,
    `<span title="Capital politique (élections, coûts)">CP <strong>${nombre(c.cp, 0)}</strong></span>`,
    `<span title="Budget annuel = PIB du leader / 1 000 Md">Budget <strong>${nombre(c.budget, 0)}</strong></span>`,
    `<span title="Points d'action ce trimestre">PA <strong>${nombre(c.pa, 0)}</strong></span>`,
    c.briefing ? `<button id="btnBriefing" class="alerte-btn">Briefing en attente</button>` : "",
  ].join("");
  $("btnBriefing")?.addEventListener("click", () => proposerBriefing(true));
  const noms = Object.fromEntries(Object.keys(e.pays).map(i => [i, `${nomPays(i)} · alignement ${signe(alignement(e, i), 2)}`]));
  carteMonde.colorer(couleurs(), noms);
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
  if (!c.carteJouee && c.main.length) {
    ouvrir(`<h2>Aucune carte jouée</h2><p>Tu n'as pas joué de carte ce trimestre. Terminer quand même ?</p>
      <div class="actions-fenetre"><button id="revenir">Revenir</button><button id="terminer" class="principal">Terminer le trimestre</button></div>`,
    b => { b.querySelector<HTMLButtonElement>("#revenir")!.onclick = fermer; b.querySelector<HTMLButtonElement>("#terminer")!.onclick = () => { fermer(); terminer(); }; });
    return;
  }
  terminer();
}
function terminer() {
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

choisirCamp();
