import donnees from "../data/pays2000.json";
import { dessinerCarte, couleurLog, couleurAlignement, type Annotation, type Marqueur } from "./carte";
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
const NOM_CAMP: Record<Camp, string> = { OCC: "Bloc USA", CHN: "Bloc Chine" };
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
  ouvrir(`<h2>Nouvelle partie</h2><p class="note">Première partie ? Le bouton <strong>Aide</strong> (ou la touche ?) explique tout en 2 minutes.</p>
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

function ligneJournal(j: EntreeJournal) {
  const classe = j.camp ? (j.camp === "OCC" ? "occ" : "chn") : "";
  const effets = j.effets?.length ? `<small class="effets">Ce que ça change : ${j.effets.map(esc).join(" · ")}</small>` : "";
  return `<li class="j-${j.type} ${classe}"><strong>${esc(j.titre)}</strong>${j.texte ? `<br><span>${esc(j.texte)}</span>` : ""}${effets}</li>`;
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

function rapport(titre: string) {
  const tout = etat!.journal.slice(journalVu);
  journalVu = etat!.journal.length;
  const moi = joueur(), adv = adversaire(moi), vu = (j: EntreeJournal) => j.visiblePour.includes(moi);
  const histoire = tout.filter(j => vu(j) && (j.type === "historique" || j.type === "politique" || j.type === "bilan"));
  const cartesAdv = tout.filter(j => vu(j) && j.type === "carte" && (j.joueParCamp ?? j.camp) === adv);
  const actionsAdv = tout.filter(j => j.type === "action" && j.camp === adv);
  const consequences = tout.filter(j => vu(j) && j.type === "cache");
  const monde = tout.filter(j => vu(j) && j.type === "generique").map(j => ({ j, n: importance(j) })).sort((a, b) => b.n - a.n);
  const retenus = monde.filter(x => x.n >= 3).slice(0, MAX_MONDE).map(x => x.j), autres = monde.map(x => x.j).filter(j => !retenus.includes(j));
  const section = (t: string, l: EntreeJournal[]) => l.length ? `<h3>${t}</h3><ul class="journal">${l.map(ligneJournal).join("")}</ul>` : "";
  const parType = new Map<string, string[]>();
  for (const a of actionsAdv) { const [nom, pays] = a.titre.split(" : "); parType.set(nom, [...(parType.get(nom) ?? []), pays]); }
  const actionsTxt = [...parType].map(([nom, pays]) => `${nom} (${pays.join(", ")})`).join(" ; ");
  ouvrir(`<h2>${titre} : ${libelle(etat!.round)}</h2>
    ${section("Histoire et politique", histoire)}
    ${cartesAdv.length || actionsTxt ? `<h3>Ce qu'a fait le ${NOM_CAMP[adv]}</h3><ul class="journal">${cartesAdv.map(ligneJournal).join("")}${actionsTxt ? `<li class="${adv === "OCC" ? "occ" : "chn"}"><strong>Actions sur la carte</strong><br><span>${esc(actionsTxt)}</span></li>` : ""}</ul>` : ""}
    ${section("Conséquences de tes choix passés", consequences)}
    ${section("Dans le monde", retenus)}
    ${autres.length ? `<details><summary>${autres.length} autre${autres.length > 1 ? "s" : ""} événement${autres.length > 1 ? "s" : ""} mineur${autres.length > 1 ? "s" : ""}, loin de ton jeu</summary><ul class="journal">${autres.map(ligneJournal).join("")}</ul></details>` : ""}
    ${!histoire.length && !cartesAdv.length && !actionsTxt && !consequences.length && !retenus.length ? `<p class="note">Trimestre calme.</p>` : ""}
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
    <p class="gros">${/Défaite|Catastrophe/.test(etat!.resultat ?? "") ? "Fin de partie anticipée" : Math.abs(b) < SEUIL_EGALITE ? "Égalité" : gagne ? "Tu l'emportes" : "Tu perds"} : bilan ${signe(b)} points (positif = bloc USA).</p>
    <p>${esc(fin?.texte ?? "")}</p>
    <p class="note">Le bilan est la moyenne des décomptes annuels : progression depuis 2000 de la puissance de chaque camp (5 familles de qualificatifs à poids égaux), plus un dixième de l'écart de capital politique, plus une compensation de ${nombre(KOMI)} points pour le bloc USA. Égalité sous ${nombre(SEUIL_EGALITE)} point. Détail dans l'onglet Score.</p>
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
  const pente = Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié du bloc USA" : "penche vers le bloc USA") : (a <= -0.4 ? "allié du bloc Chine" : "penche vers le bloc Chine");
  let h = `<h2>${esc(nomPays(iso))}</h2>
    <p class="gros">Alignement ${signe(a, 2)} <span class="note">(${pente})</span></p>
    <table><tr><td>PIB</td><td class="v">${nombre(p.pib / 1e9, 0)} Md USD <span class="note">(int-$ 2011)</span></td></tr>
    <tr><td>Population</td><td class="v">${nombre(p.population / 1e6)} millions</td></tr>
    <tr><td>Stabilité</td><td class="v">${nombre(p.stabilite, 0)} / 100</td></tr></table>`;
  if (iso !== "USA" && iso !== "CHN") {
    h += `<h3>Influence (0 à 100)</h3><p class="note">Poids : économique 35 %, politique 30 %, militaire 20 %, culturelle 15 %. Alignement = (total USA − total Chine) / 70, borné entre −1 et +1.</p><table><tr><td></td><td class="v occ-t">USA</td><td class="v chn-t">Chine</td></tr>
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
    <table><tr><td></td><td class="v occ-t">USA</td><td class="v chn-t">Chine</td></tr>`;
  for (const f of Object.keys(NOMS_FAMILLES) as (keyof typeof NOMS_FAMILLES)[])
    h += `<tr><td>${NOMS_FAMILLES[f]}</td><td class="v">${nombre(100 * partFamille(e, "OCC", f), 0)} %</td><td class="v">${nombre(100 * partFamille(e, "CHN", f), 0)} %</td></tr>`;
  h += `<tr><td><strong>Puissance</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "OCC"))} %</strong></td><td class="v"><strong>${nombre(100 * puissance(e, "CHN"))} %</strong></td></tr></table>
    <h3>Décomptes annuels (positif = bloc USA)</h3>`;
  h += e.decomptes.length ? `<table>${e.decomptes.map((d, i) => `<tr><td>Fin ${2000 + i}</td><td class="v ${d >= 0 ? "occ-t" : "chn-t"}">${signe(d)}</td></tr>`).join("")}
    <tr><td><strong>Moyenne = bilan</strong></td><td class="v"><strong>${signe(bilan(e))}</strong></td></tr></table>` : `<p class="note">Premier décompte fin 2000.</p>`;
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
    default: return iso === "USA" || iso === "CHN" ? "leader" : signe(alignement(e, iso), 2);
  }
}
function annotations(): Record<string, Annotation> {
  const e = etat!, moi = joueur(), adv = adversaire(moi), coul = (c: Camp) => c === "OCC" ? "#4f8be0" : "#dc4b3c";
  const recents = e.journal.filter(j => j.round >= e.round - 1 && j.visiblePour.includes(moi));
  const out: Record<string, Annotation> = {};
  for (const iso of Object.keys(e.pays)) {
    const p = e.pays[iso], m: Marqueur[] = [], a = alignement(e, iso);
    for (const j of recents.filter(j => j.pays?.includes(iso))) {
      if (j.type === "historique") m.push({ symbole: "★", couleur: "#d9a441", titre: j.titre });
      else if (j.type === "generique") m.push({ symbole: "!", couleur: (j.intensite ?? 1) >= 2 ? "#e07b2a" : "#8a6d3b", titre: j.titre });
      else if ((j.type === "action" || j.type === "carte") && (j.joueParCamp ?? j.camp) === adv) m.push({ symbole: "◆", couleur: coul(adv), titre: `${NOM_CAMP[adv]} : ${j.titre}` });
      else if ((j.type === "action" || j.type === "carte") && j.camp === moi) m.push({ symbole: "✓", couleur: coul(moi), titre: `Toi : ${j.titre}` });
    }
    for (const c of ["OCC", "CHN"] as Camp[]) if (iso !== "USA" && iso !== "CHN" && p.influence[c].m >= 40) m.push({ symbole: "▲", couleur: coul(c), titre: `Présence militaire forte du ${NOM_CAMP[c]} (${nombre(p.influence[c].m, 0)})` });
    if (p.stabilite < 30) m.push({ symbole: "↯", couleur: "#9b59b6", titre: `Pays instable (stabilité ${nombre(p.stabilite, 0)})` });
    const vus = new Set<string>(), uniques = m.filter(x => { const k = x.symbole + x.couleur; if (vus.has(k)) return false; vus.add(k); return true; });
    const io = influenceTotale(p, "OCC"), ic = influenceTotale(p, "CHN"), leader = iso === "USA" || iso === "CHN";
    const pente = leader ? "leader de bloc" : Math.abs(a) < 0.1 ? "neutre" : a > 0 ? (a >= 0.4 ? "allié du bloc USA" : "penche vers le bloc USA") : (a <= -0.4 ? "allié du bloc Chine" : "penche vers le bloc Chine");
    out[iso] = { nom: court(iso), valeur: valeurVue(iso), marqueurs: uniques,
      info: `<strong>${esc(nomPays(iso))}</strong><div class="note">${pente}${leader ? "" : ` · alignement ${signe(a, 2)}`}</div>
        ${leader ? "" : `<div class="barres"><span class="b-occ" style="width:${Math.min(100, io)}%"></span></div><div class="barres"><span class="b-chn" style="width:${Math.min(100, ic)}%"></span></div>
        <div class="note">Influence USA ${nombre(io, 0)} · Chine ${nombre(ic, 0)}</div>`}
        <div class="note">PIB ${nombre(p.pib / 1e9, 0)} Md · ${nombre(p.population / 1e6, 0)} M hab. · stabilité ${nombre(p.stabilite, 0)}</div>
        ${m.length ? `<ul>${m.map(x => `<li><span class="pastille" style="background:${x.couleur}">${x.symbole}</span> ${esc(x.titre)}</li>`).join("")}</ul>` : ""}
        <div class="note">Clic : fiche et actions</div>` };
  }
  return out;
}
function legende(): string {
  const vue = $<HTMLSelectElement>("vue").value;
  const symboles = `<div class="symboles"><span><i style="background:#d9a441">★</i>historique</span><span><i style="background:#e07b2a">!</i>événement</span><span><i style="background:${joueur() === "OCC" ? "#dc4b3c" : "#4f8be0"}">◆</i>adversaire</span><span><i style="background:${joueur() === "OCC" ? "#4f8be0" : "#dc4b3c"}">✓</i>toi</span><span><i style="background:#777">▲</i>bases</span><span><i style="background:#9b59b6">↯</i>instable</span></div>`;
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
    `<span title="Bilan = moyenne des décomptes annuels (positif = bloc USA). Progression actuelle : ${signe(progression(e))}">Bilan <strong class="${b >= 0 ? "occ-t" : "chn-t"}">${signe(b)}</strong></span>`,
    `<span title="Moyenne des 5 familles (économie, population, ressources, armée, environnement) contrôlées par chaque camp">Puissance <strong class="occ-t">${nombre(100 * puissance(e, "OCC"), 0)} %</strong> / <strong class="chn-t">${nombre(100 * puissance(e, "CHN"), 0)} %</strong></span>`,
    `<span title="Tension mondiale ${nombre(e.tension, 0)} / 100">Tension <strong>${cran(e)}/5</strong></span>`,
    `<span title="Capital politique (élections, coûts)">CP <strong>${nombre(c.cp, 0)}</strong></span>`,
    `<span title="Budget annuel = PIB du leader / 1 000 Md">Budget <strong>${nombre(c.budget, 0)}</strong></span>`,
    `<span title="Points d'action ce trimestre">PA <strong>${nombre(c.pa, 0)}</strong></span>`,
    c.briefing ? `<button id="btnBriefing" class="alerte-btn">Briefing en attente</button>` : "",
  ].join("");
  $("btnBriefing")?.addEventListener("click", () => proposerBriefing(true));
  carteMonde.colorer(couleurs(), legende());
  carteMonde.annoter(annotations());
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
$("btnAide").onclick = aide;
document.addEventListener("keydown", ev => { if (ev.key === "?" && !fenetreOuverte()) aide(); });

function aide() {
  ouvrir(`<h2>Comment jouer</h2>
    <h3>Le but</h3>
    <p>Deux blocs s'affrontent pour attirer le reste du monde : le bloc USA et le bloc Chine. Tu ne gouvernes pas les autres pays : tu gagnes leur <strong>influence</strong>, qui décide de leur <strong>alignement</strong>. Le score compte la part du monde que contrôle chaque bloc dans 5 familles (économie, population, matières premières, puissance militaire, environnement local), avec un décompte chaque fin d'année.</p>
    <h3>Un trimestre en 5 étapes</h3>
    <ol class="conseillers">
      <li><strong>Rapport</strong> : ce qui s'est passé, dont la carte et les actions de l'adversaire.</li>
      <li><strong>Briefing</strong> (parfois) : une crise, l'avis des conseillers, 2 à 5 options. Les effets affichés sont des fourchettes ; certaines conséquences arrivent plus tard.</li>
      <li><strong>Une carte</strong> de ta main (onglet Main) : soit son <em>événement</em>, soit ses <em>points d'action</em> (le chiffre rond). Une carte du camp adverse ne se joue que pour ses points, et son événement profite alors à l'adversaire.</li>
      <li><strong>Points d'action</strong> : clique un pays sur la carte (onglet Pays) et agis : influence politique, culturelle, économique, présence militaire, contre-influence, développement. 2 points au plus par pays et par trimestre. Le budget peut acheter 2 points de plus.</li>
      <li><strong>Fin du trimestre</strong> : l'adversaire joue, l'économie avance, les événements tombent.</li>
    </ol>
    <h3>Influence et alignement</h3>
    <p>Chaque pays porte, pour chaque bloc, 4 influences de 0 à 100 : <strong>économique</strong> (commerce, investissements ; elle glisse vers le poids économique de chaque leader), <strong>politique</strong> (relations entre gouvernements), <strong>militaire</strong> (bases, traités, armes), <strong>culturelle</strong> (langue, médias, universités, diaspora). Elles pèsent 35, 30, 20 et 15 % et s'usent lentement vers leur niveau de départ. L'<strong>alignement</strong> va de −1 (bloc Chine) à +1 (bloc USA) : c'est l'écart d'influence totale divisé par 70. Sur la carte, bleu = bloc USA, rouge = bloc Chine, sable = neutre.</p>
    <h3>Tes ressources</h3>
    <ul class="conseillers">
      <li><strong>Budget</strong> : versé chaque année, proportionnel au PIB de ton leader ; paie les cartes et certaines actions.</li>
      <li><strong>Capital politique (CP)</strong> : ta marge de manœuvre intérieure (+1 par trimestre). Il paie les cartes risquées et décide des élections : sous 50, l'alternance menace.</li>
      <li><strong>Tension</strong> (crans 1 à 5) : monte avec les bases, les embargos, les guerres ; elle ouvre certaines cartes et rend le monde plus dangereux.</li>
    </ul>
    <h3>Événements</h3>
    <p><strong>Historiques</strong> : datés et réels. Certains peuvent ne pas avoir lieu si la partie a dévié. <strong>Mondiaux</strong> : crises, catastrophes, coups d'État, tirés selon les fréquences réelles. Seuls ceux qui touchent ton jeu sont détaillés dans le rapport. Chaque événement indique « ce que ça change ».</p>
    <h3>Fin de partie</h3>
    <p>Bilan = moyenne des décomptes annuels (onglet Score). Défaite immédiate en cas de banqueroute (PIB du leader à moins de 80 % de son sommet), d'effondrement démographique, ou pour les deux blocs si le réchauffement atteint 3 °C.</p>
    <div class="actions-fenetre"><button id="okAide" class="principal">Compris</button></div>`,
  b => { b.querySelector<HTMLButtonElement>("#okAide")!.onclick = () => { fermer(); if (etat && !etat.journal.length) rapport("Début de partie"); }; });
}

choisirCamp();
