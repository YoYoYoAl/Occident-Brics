// Maquette v2 : une année jouable (2000) en 6 étapes. Interface claire, carte en plein écran.
import "./style.css";
import donnees from "../data/pays2000.json";
import { CARTES } from "../interface/images-cartes";
import genres from "./genres.json";
import chefs from "./chefs.json";
import * as M from "./moteur";
import { ZONES, ZONE_DE, ROUTES, zone } from "./zones";
import * as RS from "./ressources";
import * as EV from "./evolution";
import * as MN from "./monnaie";
import * as CR from "./crises";
import { dessinerCarteV2, type CarteV2 } from "./carte";
import { APTITUDES, LISTE_APTITUDES, TRAITS_DIRIGEANT } from "../moteur/dirigeants";

type Camp = M.Camp;
// ---------- Images (fichiers séparés au build ; jamais deux fois la même dans une partie) ----------
const FICHIERS = import.meta.glob(["../images/famille_*.webp", "../images/carte_5g.webp", "../images/carte_accord_de_paris.webp", "../images/carte_aukus.webp", "../images/carte_banque_ndb.webp", "../images/carte_brics_elargis.webp", "../images/carte_bulle_internet.webp", "../images/carte_controles_export.webp", "../images/carte_covid.webp", "../images/carte_creation_brics.webp", "../images/carte_cyberdefense.webp", "../images/carte_elargissement_otan_ue.webp", "../images/carte_fonte_des_poles.webp", "../images/carte_g20.webp", "../images/carte_gnl.webp", "../images/carte_iles_artificielles.webp", "../images/carte_immobilier_chinois.webp", "../images/carte_intelligence_artificielle.webp", "../images/carte_irak_2003.webp", "../images/carte_loups_guerriers.webp", "../images/carte_metaux_critiques.webp", "../images/carte_pivot_asie.webp", "../images/carte_quad.webp", "../images/carte_relocalisation.webp", "../images/carte_route_de_la_soie.webp", "../images/carte_tpp.webp", "../images/carte_yuan.webp", "./images/*.webp", "!./images/general_*.webp", "!./images/guerre_*.webp"], { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const IMG: Record<string, string> = Object.fromEntries(Object.entries(FICHIERS).map(([k, v]) => [k.split("/").pop()!.replace(".webp", ""), v]));
// Images écartées : texte parasite visible (règle « aucun texte dans les images »).
// Images écartées à l'audit du 2026-11-02 (faux texte ou scène irréaliste), en attente de régénération.
const EXCLUES = new Set(["famille_crise_change", "famille_nationalisation", "famille_crise_bancaire", "carte_banque_ndb", "carte_bulle_internet", "carte_metaux_critiques", "famille_choc_petrolier", "famille_guerre_commerciale", "famille_mega_incendie", "famille_panne_infrastructure", "famille_proliferation_nucleaire", "famille_cyclone", "famille_flambee_alimentaire", "famille_assassinat_dirigeant"]);
const img = (n?: string) => (n && !EXCLUES.has(n) ? IMG[n] : undefined);
const IMAGES_EVENEMENTS: Record<string, string> = { h_bulle_internet: "carte_bulle_internet" };
const imageEvenement = (id: string) => (IMG[`ev_${id}`] ? `ev_${id}` : IMAGES_EVENEMENTS[id]);
M.enregistrerChefs(Object.entries(chefs as Record<string, boolean>).map(([nom, femme]) => ({ nom, femme })));
M.enregistrerPortraits(Object.keys(IMG).filter(n => n.startsWith("conseiller2_")).map(nom => ({ nom, femme: !!(genres as Record<string, boolean>)[nom] })));

// ---------- Outils d'affichage ----------
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const h = (html: string) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const fr = (v: number, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const NOMS_PAYS: Record<string, string> = Object.fromEntries((donnees as any).pays.map((p: any) => [p.iso3, p.nom]));
const COUL = { OCC: "#2f6db5", CHN: "#c0392b" };
// Échelles de la carte : vert = amical envers toi, rouge = hostile (7 niveaux).
const PALETTE_ATT = ["#9d1c24", "#d64b3f", "#f1a37f", "#efe8d8", "#a8d5a2", "#56ae6c", "#1f7a46"];
const ECO_COURT = ["Sanctions", "Boycott", "Protectionnisme", "Neutre", "Accords", "Libre-échange", "Entraide"];
const PALETTE_ECO = ["#7a3b0c", "#c06a1f", "#efbe7d", "#efe8d8", "#9fd0d6", "#3e9fb0", "#1b6b80"];
// Vue Ressources : vert = exportateur, orange = importateur ; teinte forte = pays de ton camp.
const PALETTE_RES: Record<RS.Lecture, string> = { fournisseur_ami: "#2e8b57", fournisseur: "#a8d5a2", demandeur_ami: "#d9822b", demandeur: "#f3c99a", neutre: "#e9e4d8" };
// Libellés (retour du 2 novembre 2026 : « en a », « pas proche » jugés peu clairs). « Ton camp » = pays dont au moins 40 % des liens vont vers toi.
const NOMS_RES: Record<RS.Lecture, string> = { fournisseur_ami: "exportateur de ton camp", fournisseur: "exportateur hors de ton camp", demandeur_ami: "importateur de ton camp", demandeur: "importateur hors de ton camp", neutre: "autosuffisant" };
const ETAPES = ["Cabinet", "Briefing", "Cartes", "Opérations", "Révélation", "Bilan"];
// Infobulles (demande du 2 novembre 2026) : une phrase par étape et par mode de carte.
const AIDE_ETAPES = ["Ton dirigeant nomme 5 conseillers : chacun apporte un bonus et un malus.", "Les événements de l'année : historiques, projetés, ruptures. Clique un pays cité pour le voir.", "Écarte 2 cartes sur 6 ; les 4 autres sont jouées et donnent tes points d'opérations.", "Pose tes points dans les zones et les pays, renforce-les avec le budget (◆).", "Les plans des deux camps apparaissent ; une opération secrète peut être démasquée.", "Ce qui a changé, tes opérations et leurs effets, le décompte par zone."];
const AIDE_MODES: Record<string, string> = { zones: "Les 12 zones et leur poids au décompte.", att: "Attitude de chaque pays envers toi (de Haine à Alliance). Clique un pays pour voir ses relations.", eco: "Relations économiques de chaque pays avec toi (de Sanctions à Entraide).", res: "Qui exporte et qui importe chaque ressource ; ton camp en manque-t-il ?", ops: "Les opérations posées cette année, par zone.", routes: "Les 36 routes commerciales (mer, terre, air) et le contrôle de chaque camp.", mil: "Puissance militaire de chaque pays.", pib: "PIB de chaque pays.", pop: "Population de chaque pays." };
const MODES = [
  { id: "zones", nom: "Zones", icone: "◱" }, { id: "att", nom: "Attitude", icone: "☺" }, { id: "eco", nom: "Économie", icone: "⇄" }, { id: "res", nom: "Ressources", icone: "⛏" },
  { id: "ops", nom: "Opérations", icone: "●" }, { id: "routes", nom: "Routes", icone: "⛴" },
  { id: "mil", nom: "Militaire", icone: "🛡" }, { id: "pib", nom: "PIB", icone: "$" }, { id: "pop", nom: "Population", icone: "👥" },
] as const;
type Mode = typeof MODES[number]["id"];

let e: M.EtatV2;
let carte: CarteV2;
let etape = -1, mode: Mode = "zones", zoneChoisie: string | null = null, paysChoisi: string | null = null, paysRelation: string | null = null, bienVu: RS.Bien = "energie"; // mode Attitude : null = envers toi, sinon relations de ce pays
let revelations: M.Revelation[] = [];
let routesVues: "toutes" | "mer" | "terre" | "air" = "toutes"; // filtre de la vue Routes (cosmétique)
const ecartees = new Set<number>();
const joueur = () => e.joueur, adv = () => M.autre(e.joueur);

// ---------- Squelette ----------
// Infobulles maison : tout élément qui a un title l'affiche dans une bulle soignée, après un court délai (au lieu de la bulle du navigateur).
let infobullesPretes = false;
function infobulles() {
  if (infobullesPretes) return; infobullesPretes = true;
  let minuteur = 0, cible: HTMLElement | null = null;
  const bulle = () => document.querySelector<HTMLElement>(".v2-info");
  const cacher = () => { clearTimeout(minuteur); const b = bulle(); if (b) b.hidden = true; if (cible?.dataset.tt) { cible.title = cible.dataset.tt; delete cible.dataset.tt; } cible = null; };
  document.addEventListener("mouseover", ev => {
    const x = (ev.target as Element).closest?.("[title]") as HTMLElement | null;
    if (!x || x === cible || x.closest(".v2-svg")) return;
    cacher(); cible = x; x.dataset.tt = x.title; x.removeAttribute("title");
    minuteur = window.setTimeout(() => {
      const b = bulle(); if (!b || cible !== x) return; b.textContent = x.dataset.tt!; b.hidden = false;
      const r = x.getBoundingClientRect(), w = b.offsetWidth, hh = b.offsetHeight;
      const gauche = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), haut = r.bottom + 8 + hh > innerHeight ? r.top - hh - 8 : r.bottom + 8;
      b.style.left = gauche + "px"; b.style.top = haut + "px";
    }, 350);
  });
  document.addEventListener("mouseout", ev => { if (cible && !cible.contains(ev.relatedTarget as Node)) cacher(); });
  document.addEventListener("mousedown", cacher);
}
function squelette() {
  // L'hébergeur de l'artefact place la page dans <body> : on met d'abord styles et polices à l'abri dans <head>,
  // puis on ne retire que nos propres éléments (sinon la feuille de style disparaît et la page s'affiche brute).
  document.querySelectorAll("body style, body link").forEach(x => document.head.appendChild(x));
  Array.from(document.body.children).forEach(x => { if (x.tagName !== "SCRIPT") x.remove(); });
  document.body.appendChild(h(`<div class="v2">
    <header class="v2-haut">
      <div class="v2-marque"><span class="v2-logo"><i style="background:${COUL.OCC}"></i><i style="background:${COUL.CHN}"></i></span><span>Occident <em>contre</em> BRICS</span><span class="v2-annee">2000</span></div>
      <ol class="v2-etapes">${ETAPES.map((n, i) => `<li data-e="${i}" title="${n} : ${AIDE_ETAPES[i]}"><b>${i + 1}</b><span>${n}</span></li>`).join("")}</ol>
      <div class="v2-compteurs"></div>
      <button class="v2-plein" title="Plein écran (Échap pour sortir)" aria-label="Plein écran">⛶</button>
    </header>
    <div class="v2-carte"></div>
    <aside class="v2-equipe"></aside>
    <div class="v2-conseil" hidden></div>
    <nav class="v2-modes">${MODES.map(m => `<button data-mode="${m.id}" title="${m.nom} : ${AIDE_MODES[m.id] ?? ""}"><span>${m.icone}</span>${m.nom}</button>`).join("")}</nav>
    <div class="v2-legende"></div>
    <section class="v2-panneau" hidden></section>
    <div class="v2-voile" hidden><div class="v2-fenetre"></div></div>
    <div class="v2-bulle" hidden></div>
    <div class="v2-tresor" hidden></div>
    <div class="v2-info" hidden></div>
  </div>`));
  // Plein écran : bouton en haut à droite (si le navigateur ou l'hébergeur le refuse, le bouton est masqué).
  const plein = document.querySelector<HTMLButtonElement>(".v2-plein")!;
  if (!document.fullscreenEnabled) plein.hidden = true;
  plein.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => { plein.hidden = true; });
  document.addEventListener("fullscreenchange", () => { plein.textContent = document.fullscreenElement ? "🗗" : "⛶"; plein.title = document.fullscreenElement ? "Quitter le plein écran" : "Plein écran (Échap pour sortir)"; });
  infobulles();
  const ids = new Map<string, string>((donnees as any).pays.map((p: any) => [String(p.idCarte), p.iso3]));
  carte = dessinerCarteV2($(".v2-carte"), ids, { clicPays, clicZone: z => choisirZone(z), survol });
  document.querySelectorAll<HTMLButtonElement>(".v2-modes button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode as Mode; rafraichirCarte(); }));
  // Dépôt d'un jeton sur la carte : 1 point d'influence dans la zone visée.
  const zc = $(".v2-carte");
  zc.addEventListener("dragover", ev => { if (etape === 3) { ev.preventDefault(); const z = carte.zoneSous(ev.clientX, ev.clientY); carte.surligner(z ?? zoneChoisie); } });
  zc.addEventListener("drop", ev => {
    ev.preventDefault(); const z = carte.zoneSous(ev.clientX, ev.clientY);
    if (!z || etape !== 3) return;
    if (!M.raisonBlocage(e, joueur(), "influence", z)) M.engager(e, joueur(), "influence", z, 1);
    choisirZone(z);
  });
}

// ---------- Carte : couleurs, légende, étiquettes ----------
const pointsZone = (z: string, c: Camp, visibles = true) => M.opsActives(e).filter(o => o.camp === c && o.zone === z && (!visibles || c === joueur() || etape >= 4 && (M.op(o.type).cat !== "secret" || o.revelee || o.demasquee))).reduce((s, o) => s + o.points, 0);
function couleurPays(iso: string): string {
  const p = e.pays[iso], j = joueur();
  if (mode === "zones") return zone(p.zone).couleur;
  if (mode === "att") return !paysRelation ? PALETTE_ATT[M.niveau(p.att[j])] : iso === paysRelation ? "#f2c14e" : PALETTE_ATT[M.niveau(M.relation(e, paysRelation, iso))];
  if (mode === "eco") return PALETTE_ECO[M.niveau(p.eco[j])];
  if (mode === "res") return PALETTE_RES[RS.lecture(e, j, iso, bienVu)];
  if (mode === "ops") {
    const a = pointsZone(p.zone, j), b = pointsZone(p.zone, adv());
    if (!a && !b) return "#ece6d8";
    const t = Math.min(1, (a + b) / 8), part = a / (a + b);
    return melange(melange("#ece6d8", "#8e5ac8", t * 0.25), melange(COUL[adv()], COUL[j], part), 0.35 + 0.55 * t);
  }
  if (mode === "routes") { const r = ROUTES.filter(x => x.pays.includes(iso)); if (!r.length) return "#ece6d8"; const c = M.controleRoute(e, r[0].id); return c ? melange("#ffffff", COUL[c], 0.75) : "#c9c3b4"; }
  const v = mode === "mil" ? p.militaire / 100 : mode === "pib" ? Math.log10(p.pib / 1e8) / Math.log10(1.3e13 / 1e8) : Math.log10(p.population / 5e4) / Math.log10(1.3e9 / 5e4);
  const t = Math.max(0, Math.min(1, v));
  return mode === "mil" ? melange("#efe8f6", "#4b2a86", t) : mode === "pib" ? melange("#fbf3d6", "#a8770a", t) : melange("#f7ecef", "#8c2d59", t);
}
function melange(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((x, i) => Math.round(x + (pb[i] - x) * t).toString(16).padStart(2, "0")).join("");
}
function legende() {
  const l = $(".v2-legende"), j = M.NOM_CAMP[joueur()];
  const echelle = (titre: string, noms: string[], pal: string[]) => `<b>${titre}</b><div class="v2-ech">${noms.map((n, i) => `<span><i style="background:${pal[i]}"></i>${n}</span>`).join("")}</div>`;
  l.innerHTML = mode === "zones" ? `<b>Les 12 zones</b><p>Clique une zone pour y agir. Les traits blancs épais séparent les zones.</p>`
    : mode === "att" ? (!paysRelation ? echelle(`Attitude envers ${j === "BRICS" ? "les BRICS" : "l'Occident"} (toi)`, M.ATTITUDES, PALETTE_ATT) + `<p class="v2-note">Clique un pays pour voir ses relations avec les autres (hors phase Opérations).</p>`
      : echelle(`Attitude de ${NOMS_PAYS[paysRelation]} envers chaque pays`, M.ATTITUDES, PALETTE_ATT) + `<p class="v2-note">Estimation. <button class="v2-lien" data-att-toi>Revenir à : envers toi</button></p>`)
    : mode === "eco" ? echelle(`Économie avec ${j === "BRICS" ? "les BRICS" : "l'Occident"} (toi)`, M.ECONOMIES, PALETTE_ECO)
    : mode === "res" ? (() => { const b = RS.bilan(e, joueur(), bienVu), nomB = RS.BIENS.find(x => x.id === bienVu)!.nom.toLowerCase(), de = /^[aeéèiou]/.test(nomB) ? `d'${nomB}` : `de ${nomB}`;
        return `<div class="v2-biens">${RS.BIENS.map(x => `<button data-bien="${x.id}" class="${x.id === bienVu ? "actif" : ""}">${x.nom}</button>`).join("")}</div>
        <p class="v2-res-bilan ${b.manque ? "manque" : "ok"}">${b.manque ? `Ton camp <b>manque</b> ${de} : cherche des exportateurs (en vert).` : `Ton camp <b>a assez</b> ${de} : les importateurs (en orange) sont des clients à gagner.`}</p>
        <div class="v2-ech">${(Object.keys(NOMS_RES) as RS.Lecture[]).map(k => `<span><i style="background:${PALETTE_RES[k]}"></i>${NOMS_RES[k]}</span>`).join("")}</div>
        <p class="v2-note">Données réelles 2000 ; seuils et bilan : estimation.</p>`; })()
    : mode === "ops" ? `<b>Opérations actives</b><div class="v2-ech"><span><i style="background:${COUL[joueur()]}"></i>tes points</span><span><i style="background:${COUL[adv()]}"></i>points adverses connus</span></div><p class="v2-note">Plus la teinte est forte, plus il y a de points.</p>`
    : mode === "routes" ? `<b>${ROUTES.length} routes commerciales</b><div class="v2-biens">${(["toutes", "mer", "terre", "air"] as const).map(t => `<button data-rtype="${t}" class="${t === routesVues ? "actif" : ""}">${{ toutes: "Toutes", mer: "Maritimes", terre: "Terrestres", air: "Aériennes" }[t]} <small>${t === "toutes" ? ROUTES.length : ROUTES.filter(r => (r.mode ?? "mer") === t).length}</small></button>`).join("")}</div><p class="v2-note">Sous chaque nom : contrôle <b style="color:${COUL.OCC}">Occident</b> · <b style="color:${COUL.CHN}">BRICS</b> (part du commerce des pays de la route). Ton PIB gagne quand ton camp tient les routes, il perd sinon (jusqu'à ±0,15 % par route et par an, estimation).</p><div class="v2-ech"><span><i style="background:${COUL.OCC}"></i>tenue par l'Occident</span><span><i style="background:${COUL.CHN}"></i>tenue par les BRICS</span><span><i style="background:#c9c3b4"></i>disputée</span></div><div class="v2-ech"><span><i class="ech-trait ech-mer"></i>maritime</span><span><i class="ech-trait ech-terre"></i>terrestre (rail, route, oléoduc)</span><span><i class="ech-trait ech-air"></i>aérienne</span></div><p class="v2-note">Une route est tenue quand tous ses pays sont au moins en accords commerciaux avec un camp.</p>`
    : mode === "mil" ? `<b>Puissance militaire</b><div class="v2-grad" style="background:linear-gradient(90deg,#efe8f6,#4b2a86)"></div><div class="v2-bornes"><span>faible</span><span>forte</span></div>`
    : mode === "pib" ? `<b>PIB 2000</b><div class="v2-grad" style="background:linear-gradient(90deg,#fbf3d6,#a8770a)"></div><div class="v2-bornes"><span>100 M$</span><span>13 000 Md$</span></div>`
    : `<b>Population 2000</b><div class="v2-grad" style="background:linear-gradient(90deg,#f7ecef,#8c2d59)"></div><div class="v2-bornes"><span>50 000</span><span>1,3 milliard</span></div>`;
  l.querySelectorAll<HTMLButtonElement>("[data-rtype]").forEach(x => x.addEventListener("click", () => { routesVues = x.dataset.rtype as typeof routesVues; rafraichirCarte(); }));
  l.querySelectorAll<HTMLButtonElement>("[data-bien]").forEach(x => x.addEventListener("click", () => { bienVu = x.dataset.bien as RS.Bien; rafraichirCarte(); }));
  l.querySelector("[data-att-toi]")?.addEventListener("click", () => { paysRelation = null; rafraichirCarte(); });
}
function rafraichirCarte() {
  carte.colorer(couleurPays);
  carte.routes(mode === "routes" ? id => {
    const r = ROUTES.find(x => x.id === id)!; if (routesVues !== "toutes" && (r.mode ?? "mer") !== routesVues) return null;
    const c = M.controleRoute(e, id), k = EV.controle(e, id), v = EV.valeurRoute(id, e.annee);
    return { couleur: c ? COUL[c] : null, occ: Math.round(k.OCC * 100), chn: Math.round(k.CHN * 100),
      info: `contrôle Occident ${Math.round(k.OCC * 100)} %, BRICS ${Math.round(k.CHN * 100)} %. ${r.bonus}. Effet sur le PIB jusqu'à ±${fr(v, 2)} % par an (estimation).` };
  } : null);
  document.querySelectorAll<HTMLButtonElement>(".v2-modes button").forEach(b => b.classList.toggle("actif", b.dataset.mode === mode));
  carte.etiquettes(z => {
    const a = pointsZone(z, joueur()), b = pointsZone(z, adv()), caches = etape >= 4 ? pointsZone(z, adv(), false) - b : 0;
    const jetons = (n: number, c: Camp) => n ? `<span class="v2-jetons" style="--c:${COUL[c]}">${n <= 6 ? "<i></i>".repeat(n) : `<i></i>×`}<b>${n}</b></span>` : "";
    return `<span class="v2-etiq-nom" style="--z:${zone(z).couleur}">${zone(z).court}</span>${jetons(a, joueur())}${jetons(b, adv())}${caches > 0 ? `<span class="v2-jetons cache" title="Points secrets non révélés">?</span>` : ""}`;
  });
  legende();
}

// ---------- Survol et clics ----------
function chipNiveau(v: number, eco = false) { const n = M.niveau(v); return `<span class="v2-chip" title="${(eco ? M.ECONOMIES : M.ATTITUDES)[n]}" style="background:${(eco ? PALETTE_ECO : PALETTE_ATT)[n]};color:${n === 3 || n === 2 || n === 4 ? "#2a2a2a" : "#fff"}">${(eco ? ECO_COURT : M.ATTITUDES)[n]}</span>`; }
function survol(iso: string | null, ev: MouseEvent) {
  const b = $(".v2-bulle");
  if (!iso) { b.hidden = true; return; }
  const p = e.pays[iso];
  b.innerHTML = `<div class="v2-bulle-titre"><b>${esc(p.nom)}</b><span>${zone(p.zone).nom}</span></div>
    <table><tr><th></th><th style="color:${COUL.OCC}">Occident</th><th style="color:${COUL.CHN}">BRICS</th></tr>
    <tr><td>Attitude</td><td>${chipNiveau(p.att.OCC)}</td><td>${chipNiveau(p.att.CHN)}</td></tr>
    <tr><td>Économie</td><td>${chipNiveau(p.eco.OCC, true)}</td><td>${chipNiveau(p.eco.CHN, true)}</td></tr></table>
    <div class="v2-bulle-pied"><span>Poids <b>${fr(p.poids, 2)}</b> / 100</span><span>Stabilité <b>${Math.round(p.stabilite)}</b></span>${mode === "res" ? `<span>${RS.BIENS.find(x => x.id === bienVu)!.nom} : <b>${NOMS_RES[RS.lecture(e, joueur(), iso, bienVu)]}</b> (solde ${Math.round(RS.solde(e, iso, bienVu))} sur ±100, en 2000 : ${Math.round(RS.soldeInitial(iso)[bienVu])})</span><span>Effet des ressources sur son PIB : <b>${(x => (x > 0 ? "+" : "") + fr(x, 2))(RS.effetPib(e, iso))} %/an</b></span>` : ""}${mode === "routes" ? `<span>Effet des routes sur son PIB : <b>${(x => (x > 0 ? "+" : "") + fr(x, 2))(EV.effetRoutes(e, iso))} %/an</b></span>` : ""}${mode === "att" && paysRelation && paysRelation !== iso ? `<span>Attitude de ${esc(NOMS_PAYS[paysRelation])} : ${chipNiveau(M.relation(e, paysRelation, iso))}</span>` : ""}</div>`;
  b.hidden = false;
  const x = Math.min(window.innerWidth - b.offsetWidth - 12, ev.clientX + 16), y = Math.min(window.innerHeight - b.offsetHeight - 12, ev.clientY + 16);
  b.style.transform = `translate(${x}px, ${y}px)`;
}
function clicPays(iso: string) {
  if (mode === "att" && etape !== 3) { paysRelation = paysRelation === iso ? null : iso; rafraichirCarte(); return; }
  if (etape === 3) { paysChoisi = iso; choisirZone(ZONE_DE[iso]); return; }
}
function choisirZone(z: string | null) {
  zoneChoisie = z;
  if (z && paysChoisi && ZONE_DE[paysChoisi] !== z) paysChoisi = null;
  carte.surligner(z); carte.choisirPays(paysChoisi);
  if (etape === 3) panneauOperations();
  rafraichirCarte();
}

// ---------- Haut : étapes, points, budget, projection ----------
const JAUGE_NUL = M.JAUGE.nul;
const sg = (v: number) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v))}`;
function compteurs() {
  document.querySelectorAll<HTMLLIElement>(".v2-etapes li").forEach(li => { const i = +li.dataset.e!; li.classList.toggle("faite", i < etape); li.classList.toggle("courante", i === etape); });
  if (etape < 0) { $(".v2-compteurs").innerHTML = ""; return; }
  const g = M.progression(e), j = joueur();
  const libres = M.pointsLibres(e, j), budget = e.budget[j] - e.boostsUtilises[j];
  queueMicrotask(() => $(".v2-compteurs").querySelector(".budget")?.addEventListener("click", () => conseil("economie", `Le budget (${budget} ◆) sert à deux choses. 1) Renforcer tes opérations : à l'étape Opérations, clique sur les losanges ◆ à droite de chaque opération de ton plan (+10 % d'effet par losange, 3 au plus). 2) Le Trésor (bouton dette en haut) : rembourser la dette ou acheter de l'or coûte 1 ◆ ; emprunter, imprimer de la monnaie ou puiser dans les réserves en rapporte. Le budget non dépensé est reporté, jusqu'à 2 ans de revenu.`)));
  queueMicrotask(() => $(".v2-compteurs").querySelector(".tresor")?.addEventListener("click", () => ($(".v2-tresor").hidden ? tresor() : ($(".v2-tresor").hidden = true))));
  $(".v2-compteurs").innerHTML = `
    <div class="v2-pill points" title="Points d'opérations de l'année : somme des 4 cartes jouées + bonus du cabinet"><span>★</span><b>${etape >= 3 ? `${libres} / ${e.points[j]}` : e.points[j] || "—"}</b><small>points</small></div>
    <div class="v2-pill budget" role="button" title="Clique pour savoir comment utiliser le budget"><span>◆</span><b>${budget}</b><small>budget</small></div>
    <button class="v2-pill tresor" title="Trésor : dette, inflation et réserves de ton camp (cliquer pour décider)"><span>🏛</span><b>${Math.round(e.monnaie!.dette[j])} %</b><small>dette</small><b>${fr(e.monnaie!.inflation[j])} %</b><small>inflation</small></button>
    <div class="v2-proj" title="Jauge de progression : part du terrain disponible que chaque camp a conquis depuis 2000, plus le handicap (komi) qui compense la position de départ. Au centre : égalité.">
      <div class="v2-proj-titre">Jauge <small>${g.tete ? `avantage ${g.tete === "OCC" ? "Occident" : "BRICS"}` : "égalité"}</small></div>
      <div class="v2-jauge"><i class="v2-jauge-occ"></i><i class="v2-jauge-chn"></i><b style="left:${50 - Math.max(-50, Math.min(50, g.jauge * 50 / 15))}%"></b></div>
      <div class="v2-proj-val"><span style="color:${COUL.OCC}">Occ. ${sg(g.OCC)} %</span><span style="color:${COUL.CHN}">BRICS ${sg(g.CHN)} %</span></div>
    </div>`;
}

// ---------- Trésor : dette, inflation, réserves (version légère, choix du 2 novembre 2026) ----------
function barre(parts: [string, number, string][]) {
  return `<div class="v2-barre">${parts.map(([n, v, c]) => `<i style="width:${Math.max(0, v * 100)}%;background:${c}" title="${n} ${Math.round(v * 100)} %"></i>`).join("")}</div>
    <div class="v2-barre-leg">${parts.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} ${Math.round(v * 100)} %</span>`).join("")}</div>`;
}
function tresor() {
  const t = $(".v2-tresor"), j = joueur(), m = e.monnaie!, r = m.reserves[j], h = m.detenteurs[j], w = m.mondiales;
  const reste = MN.MON.maxDecisions - m.decisions[j];
  t.innerHTML = `<div class="v2-tresor-tete"><b>Trésor de ${j === "OCC" ? "l'Occident" : "des BRICS"}</b><small>${reste ? `${reste} décision${reste > 1 ? "s" : ""} possible${reste > 1 ? "s" : ""} cette année` : "Plus de décision possible cette année"}</small><button class="v2-x" title="Fermer">×</button></div>
    <div class="v2-tresor-grille">
      <section><h4>Dette <b>${Math.round(m.dette[j])} % du PIB</b></h4><p>Taux ${fr(MN.taux(e, j))} % · intérêts ${fr(MN.interets(e, j), 2)} budget/an · défaut au-delà de ${MN.MON.plafond} %</p>
        <p class="v2-note">Qui la détient :</p>${barre([["chez toi", h.interieur, "#7c8aa0"], ["alliés", h.allies, j === "OCC" ? COUL.OCC : COUL.CHN], ["camp adverse", h.adverses, j === "OCC" ? COUL.CHN : COUL.OCC]])}</section>
      <section><h4>Inflation <b>${fr(m.inflation[j])} %</b></h4><p>${m.inflation[j] > 4 ? `Freine ton PIB de ${fr(-MN.effetInflationPib(e, j), 2)} % par an${m.inflation[j] > 6 ? " et ta stabilité" : ""}.` : "Sans effet sous 4 %."} Elle revient d'elle-même vers 2 % (30 % par an).</p></section>
      <section><h4>Réserves <b>${fr(r.stock)} unités</b></h4><p>Amortissent ${Math.round(MN.amortisseur(e, j) * 100)} % d'une coupure de ressources.</p>${barre([["devises occidentales", r.occ, COUL.OCC], ["devises BRICS", r.brics, COUL.CHN], ["or", r.or, "#d49a1a"]])}
        <p class="v2-note">Réserves mondiales :</p>${barre([["dollar", w.dollar, "#2f6db5"], ["euro", w.euro, "#5b8fd6"], ["autres occ.", w.autresOcc, "#9db8e0"], ["BRICS", w.brics, COUL.CHN], ["or", w.or, "#d49a1a"], ...((w.crypto ?? 0) > 0.0005 ? [["cryptos", w.crypto!, "#7a5cc4"] as [string, number, string]] : [])])}</section>
    </div>
    <div class="v2-tresor-dec">${MN.DECISIONS.map(d => { const r2 = MN.possible(e, j, d.id); return `<button data-dec="${d.id}" ${r2 ? `disabled title="${esc(r2)}"` : `title="${esc(d.aide)}"`}><b>${d.nom}</b><small>${esc(d.aide)}</small></button>`; }).join("")}</div>
    <p class="v2-note">Valeurs de départ : ordres de grandeur réels de 2000 ; effets : estimation.</p>`;
  t.hidden = false;
  t.querySelector(".v2-x")!.addEventListener("click", () => (t.hidden = true));
  t.querySelectorAll<HTMLButtonElement>("[data-dec]").forEach(b => b.addEventListener("click", () => { MN.decider(e, j, b.dataset.dec as MN.Decision); compteurs(); tresor(); }));
}

// ---------- Équipe : dirigeant et conseillers (portraits) ----------
function portraitHtml(nom: string | undefined, taille: string, alt: string) {
  const u = img(nom);
  return u ? `<img class="v2-portrait ${taille}" src="${u}" alt="${esc(alt)}">` : `<span class="v2-portrait ${taille} vide">${esc(alt.split(" ").map(x => x[0]).join("").slice(0, 2))}</span>`;
}
function equipe() {
  const a = $(".v2-equipe"), j = joueur(), d = e.dirigeants[j];
  if (etape < 1) { a.innerHTML = ""; return; }
  a.innerHTML = `<div class="v2-chef" style="--c:${COUL[j]}">${portraitHtml(d.illustre, "grand", d.nom)}<div><b>${esc(d.nom)}</b><small>${M.traitsDe(d).join(" · ")}</small></div></div>
    ${M.DOMAINES.map(x => { const c = e.cabinet[j][x.id]; return c ? `<div class="v2-cons ${avis?.dom === x.id ? "parle" : ""}" data-dom="${x.id}" title="${esc(c.nom)} — ${x.nom}\n✔ ${c.bonus.texte}\n✘ ${c.malus.texte}">${portraitHtml(c.portrait, "petit", c.nom)}<span>${COURT_DOM[x.id]}</span></div>` : ""; }).join("")}`;
}
const COURT_DOM: Record<M.Domaine, string> = { international: "Diplomatie", interieur: "Intérieur", economie: "Économie", defense: "Défense", renseignement: "Renseignement" };
// Un conseiller prend la parole (bulle) : immersion et aide à la décision.
let avis: { dom: M.Domaine; texte: string } | null = null;
// Dans les étapes à panneau (opérations, révélation), le conseiller parle en tête du panneau pour ne pas couvrir la carte.
function avisHtml() {
  const c = avis && e.cabinet[joueur()][avis.dom];
  return c && avis ? `<div class="v2-avis">${portraitHtml(c.portrait, "moyen", c.nom)}<div><b>${esc(c.nom)}</b><small>${M.DOMAINES.find(x => x.id === avis!.dom)!.nom}</small><p>${avis.texte}</p></div><button class="v2-x" data-avis title="Fermer">×</button></div>` : "";
}
function brancherAvis(p: HTMLElement) { p.querySelector<HTMLElement>("[data-avis]")?.addEventListener("click", () => { avis = null; p.querySelector(".v2-avis")?.remove(); parle(null); }); }
const parle = (dom: M.Domaine | null) => document.querySelectorAll(".v2-cons").forEach(x => x.classList.toggle("parle", (x as HTMLElement).dataset.dom === dom));
function conseil(dom: M.Domaine, texte: string) {
  const c = e.cabinet[joueur()][dom], b = $(".v2-conseil");
  avis = { dom, texte };
  if (!c) { b.hidden = true; return; }
  const p = $(".v2-panneau"), v = $(".v2-voile");
  if (!v.hidden) { b.hidden = true; const f = $(".v2-fenetre"); f.querySelector(".v2-avis")?.remove(); (f.querySelector(".v2-intro") ?? f.querySelector("h1"))!.insertAdjacentHTML("afterend", avisHtml()); brancherAvis(f); parle(dom); return; }
  if (!p.hidden) { b.hidden = true; const d = p.querySelector(".v2-defile"); if (d) { d.querySelector(".v2-avis")?.remove(); d.insertAdjacentHTML("afterbegin", avisHtml()); brancherAvis(p); } parle(dom); return; }
  const cible = document.querySelector<HTMLElement>(`.v2-cons[data-dom="${dom}"]`);
  b.style.setProperty("--fleche", `${cible ? cible.offsetLeft + cible.offsetWidth / 2 - 16 : 40}px`);
  b.innerHTML = `${portraitHtml(c.portrait, "moyen", c.nom)}<div><b>${esc(c.nom)}</b><small>${M.DOMAINES.find(x => x.id === dom)!.nom}</small><p>${texte}</p></div><button class="v2-x" title="Fermer">×</button>`;
  b.hidden = false; b.classList.remove("entre"); void b.offsetWidth; b.classList.add("entre");
  $(".v2-x", b).onclick = () => { b.hidden = true; avis = null; parle(null); };
  parle(dom);
}

// Le monde se centre dans la partie libre de l'écran (sans le bandeau de l'équipe, le panneau et la barre des modes).
function recadrer() {
  const eq = $(".v2-equipe"), pan = $(".v2-panneau");
  carte.marges({ g: 0, d: pan.hidden ? 0 : pan.offsetWidth + 24, h: eq.offsetHeight ? eq.offsetHeight + 20 : 0, b: 64 });
}
// ---------- Fenêtre centrale ----------
function fenetre(html: string, large = false) {
  const v = $(".v2-voile"), f = $(".v2-fenetre");
  f.className = "v2-fenetre" + (large ? " large" : ""); f.innerHTML = html; v.hidden = false;
  f.classList.remove("entre"); void f.offsetWidth; f.classList.add("entre");
  return f;
}
const fermerFenetre = () => ($(".v2-voile").hidden = true);
function aller(i: number) {
  etape = i; fermerFenetre(); $(".v2-panneau").hidden = true; $(".v2-conseil").hidden = true;
  avis = null;
  equipe();
  [accueil, cabinet, evenements, cartes, operations, revelation, bilan][i + 1]();
  compteurs(); equipe(); rafraichirCarte(); recadrer();
}

// 0. Accueil : choisir son camp (les deux dirigeants se présentent).
function accueil() {
  const fiche = (c: Camp) => { const d = e.dirigeants[c]; return `<button class="v2-camp" data-camp="${c}" style="--c:${COUL[c]}">
    ${portraitHtml(d.illustre, "geant", d.nom)}<span class="v2-camp-nom">${c === "OCC" ? "Occident" : "BRICS"}<small>${c === "OCC" ? "États-Unis et alliés" : "Chine et partenaires"}</small></span>
    <b>${esc(d.nom)}</b><span class="v2-traits">${d.traits.map(t => `<i title="${esc(TRAITS_DIRIGEANT[t].aide)}">${TRAITS_DIRIGEANT[t].nom}</i>`).join("")}</span>
    <span class="v2-apts">${LISTE_APTITUDES.map(a => `<span title="${esc(APTITUDES[a].aide)}">${APTITUDES[a].nom}<b>${d.aptitudes[a]}</b></span>`).join("")}</span>
    <span class="v2-bouton">Jouer ${c === "OCC" ? "l'Occident" : "les BRICS"}</span></button>`; };
  const f = fenetre(`<h1>Une année du monde, de janvier à décembre 2000</h1>
    <p class="v2-intro">Chaque année se joue en 5 temps : un <b>briefing</b> de crise, puis tu reçois <b>6 cartes</b> et en écartes 2, les 4 autres te donnent des <b>points d'opérations</b> que tu poses sur les <b>12 zones</b> du monde, puis tout est <b>révélé</b> et les <b>événements</b> de l'année tombent avec le bilan. Tous les 5 ans, un décompte compte les pays qui te suivent.</p>
    <div class="v2-camps">${fiche("OCC")}${fiche("CHN")}</div>
    <p class="v2-note">Maquette d'une année : les chiffres sont des estimations, à calibrer par simulation.</p>`, true);
  f.querySelectorAll<HTMLButtonElement>(".v2-camp").forEach(b => b.onclick = () => {
    const camp = b.dataset.camp as Camp, g = e.graine;
    e = M.creerPartieV2(g, camp);
    aller(0);
  });
}
// 1. Cabinet : 5 conseillers, 3 candidats chacun.
function cabinet() {
  const j = joueur();
  const choix: Partial<Record<M.Domaine, string>> = {};
  const f = fenetre(`<h1>Ton cabinet</h1><p class="v2-intro">${esc(e.dirigeants[j].nom)} nomme 5 conseillers. Chacun apporte <b class="plus">un bonus</b> et <b class="moins">un malus</b> dans son domaine : ce sont des coups de pouce, pas des atouts décisifs.</p>
    <div class="v2-cabinet">${M.DOMAINES.map(d => `<div class="v2-dom"><div class="v2-dom-nom"><b>${d.nom}</b><small>${d.aide}</small></div>
      ${e.candidats[j][d.id].map(c => `<button class="v2-cand" data-dom="${d.id}" data-id="${c.id}">${portraitHtml(c.portrait, "moyen", c.nom)}<span><b>${esc(c.nom)}</b><i class="plus">✔ ${c.bonus.texte}</i><i class="moins">✘ ${c.malus.texte}</i></span></button>`).join("")}</div>`).join("")}</div>
    <div class="v2-pied"><span class="v2-etat"></span><button class="v2-auto v2-sec">Laisser le dirigeant choisir</button><button class="v2-ok v2-prim">Former le cabinet</button></div>`, true);
  const maj = () => {
    const n = Object.keys(choix).length;
    f.querySelectorAll<HTMLButtonElement>(".v2-cand").forEach(b => b.classList.toggle("choisi", choix[b.dataset.dom as M.Domaine] === b.dataset.id));
    const ok = $(".v2-ok", f) as HTMLButtonElement; ok.disabled = n < 5;
    $(".v2-etat", f).textContent = n < 5 ? `Choisis encore ${5 - n} conseiller${5 - n > 1 ? "s" : ""}.` : "Cabinet complet.";
  };
  f.querySelectorAll<HTMLButtonElement>(".v2-cand").forEach(b => b.onclick = () => { choix[b.dataset.dom as M.Domaine] = b.dataset.id; maj(); });
  $(".v2-auto", f).onclick = () => { M.cabinetIA(e, j); for (const d of M.DOMAINES) choix[d.id] = e.cabinet[j][d.id]!.id; e.cabinet[j] = {}; maj(); };
  $(".v2-ok", f).onclick = () => {
    for (const d of M.DOMAINES) M.nommerConseiller(e, j, e.candidats[j][d.id].find(c => c.id === choix[d.id])!);
    M.cabinetIA(e, adv()); M.jouerEvenements(e); if (!e.crise && e.annee === 2000) CR.tirerCrise(e, true); aller(1); // maquette d'une année : la crise est montrée
  };
  maj();
}
// 2. Briefing de début d'année : crise de tension et appels aux armes. Les événements automatiques tombent en fin d'année (bilan).
function evenements() {
  const rien = !e.crise && !(e.appels ?? []).some(a => a.camp === joueur() && !a.reponse);
  const f = fenetre(`<h1>${e.annee} : le briefing de janvier</h1><p class="v2-intro">L'année commence. Les événements automatiques tomberont au fil des mois : tu les découvriras <b>en fin d'année, avec le bilan</b>, après avoir joué tes cartes et tes opérations.</p>${blocCrise()}${blocAppels()}${rien ? `<p class="v2-vide">Aucune crise à trancher ce mois-ci.</p>` : ""}
    <div class="v2-pied"><span class="v2-etat"></span><button class="v2-ok v2-prim">Voir ma main de cartes →</button></div>`, true);
  $(".v2-ok", f).onclick = () => { M.distribuerMains(e); aller(2); };
  brancherCrise(f);
  conseil("interieur", "Personne ne sait ce que l'année nous réserve. Joue tes cartes et tes opérations : on fera les comptes en décembre.");
}
// Événements de l'année, trimestre par trimestre, montrés au bilan.
const IMG_EV = new Map<string, string | undefined>();
function evenementsBilan() {
  const pris = new Set(e.imagesPrises);
  const parT = [1, 2, 3, 4].map(t => e.evenements.filter(x => x.trimestre === t));
  return `<section class="v2-bilan-ev"><h3>Les événements de l'année <small>${e.evenements.length} événement${e.evenements.length > 1 ? "s" : ""} automatique${e.evenements.length > 1 ? "s" : ""}, tombés après tes opérations ; ils touchent les pays un par un</small></h3>
    <div class="v2-trimestres">${parT.map((l, i) => `<div class="v2-trim"><div class="v2-trim-nom">${["Janvier – mars", "Avril – juin", "Juillet – septembre", "Octobre – décembre"][i]}</div>
      ${l.map(x => { const cle = `${e.annee}:${x.id}`;
        if (!IMG_EV.has(cle)) { const n = imageEvenement(x.id); IMG_EV.set(cle, n && !pris.has(n) ? n : undefined); if (n) { pris.add(n); e.imagesPrises.push(n); } }
        const n = IMG_EV.get(cle), u = n ? img(n) : undefined; // l'image choisie reste la même si le bilan est rouvert
        return `<article class="v2-ev">${u ? `<img src="${u}" alt="">` : `<div class="v2-ev-sans">📰</div>`}<div><h3>${esc(x.titre)}</h3><p>${esc(x.texte)}</p>${x.resume ? `<div class="v2-effets">${x.resume.split(" · ").map(r => `<span>${esc(r)}</span>`).join("")}</div>` : ""}</div></article>`; }).join("") || `<p class="v2-vide">Trimestre calme.</p>`}</div>`).join("")}</div></section>`;
}
// Briefing de crise (tension) : le joueur répond sans connaître la réponse adverse ; le renseignement donne le penchant estimé.
const NOM_REP: Record<CR.Reponse, string> = { apaiser: "Apaiser", fermete: "Fermeté", escalade: "Escalade" };
function blocCrise() {
  const k = e.crise; if (!k) return "";
  const pen = k.penchant[adv()], pct = (x: number) => `${Math.round(x * 100)} %`;
  return `<section class="v2-crise"><div class="v2-crise-tete"><span class="v2-crise-badge">Briefing de crise</span><span class="v2-crise-grav" title="Gravité : multiplie les gains, les pertes et la variation de tension (×0,7, ×1, ×1,4).">gravité ${k.gravite} sur 3</span><small>tension mondiale ${fr(e.tension)} sur 10 · plus elle est haute, plus les crises sont fréquentes</small></div>
    <h2>${esc(k.titre)}</h2><p>${esc(k.texte)}</p>
    <p class="v2-crise-rens">🕵 Renseignement (estimation) : ${M.NOM_CAMP[adv()] === "BRICS" ? "les BRICS penchent" : "l'Occident penche"} pour apaiser ${pct(pen.apaiser)}, fermeté ${pct(pen.fermete)}, escalade ${pct(pen.escalade)}.</p>
    <div class="v2-crise-choix">${CR.REPONSES.map(r => `<button class="v2-crise-btn ${r.id}" data-rep="${r.id}" title="${esc(r.aide)}"><b>${r.nom}</b><small>${esc(r.aide)}</small></button>`).join("")}</div>
    <p class="v2-crise-regle">Les deux apaisent : tension −1. L'un recule, l'autre gagne la région. Les deux escaladent : tension +1,8 et une chance sur deux d'incident armé l'an prochain, qui peut tourner à la guerre.</p>
    <div class="v2-crise-issue" ${k.issue ? "" : "hidden"}>${issueCrise()}</div></section>`;
}
function issueCrise() {
  const k = e.crise!; if (!k.issue) return "";
  return `<p><b>Ta réponse : ${NOM_REP[k.reponses[joueur()]!]}</b> · <b>${M.NOM_CAMP[adv()]} : ${NOM_REP[k.reponses[adv()]!]}</b></p><div class="v2-effets">${(k.lignes ?? []).map(l => `<span>${esc(l.texte)}</span>`).join("")}</div>`;
}
const appelsJoueur = () => (e.appels ?? []).filter(a => a.camp === joueur() && a.annee === e.annee);
function blocAppels() {
  return appelsJoueur().map((a, i) => `<section class="v2-crise v2-appel" data-i="${i}"><div class="v2-crise-tete"><span class="v2-crise-badge">Appel aux armes</span><small>alliance : ${M.ATTITUDES[M.niveau(e.pays[a.allie].att[joueur()])]} avec ${esc(e.pays[a.allie].nom)}</small></div>
    <h2>${esc(e.pays[a.allie].nom)} te demande d'entrer en guerre contre ${a.contre === "rebelles" ? "les rebelles" : esc(e.pays[a.contre]?.nom ?? "")}</h2>
    <p>Accepter : ton leader soutient ${esc(e.pays[a.allie].nom)} chaque année (armée × ${fr(CR.ALLIANCE.appui, 2)}), tension +${fr(CR.ALLIANCE.tensionAn)} et PIB −${fr(CR.ALLIANCE.coutPib)} % par an, attitude de l'allié +${CR.ALLIANCE.gainAllie}. Refuser : l'allié perd confiance (attitude −${CR.ALLIANCE.perteRefus}).</p>
    <div class="v2-crise-choix deux"><button class="v2-crise-btn escalade" data-ap="1"><b>Honorer l'alliance</b><small>Entrer en guerre à ses côtés</small></button><button class="v2-crise-btn apaiser" data-ap="0"><b>Refuser</b><small>Rester en dehors du conflit</small></button></div>
    <div class="v2-crise-issue" hidden></div></section>`).join("");
}
function brancherCrise(f: HTMLElement) {
  const k = e.crise, ok = $(".v2-ok", f) as HTMLButtonElement;
  const appelsOk = () => appelsJoueur().every(a => a.reponse !== undefined);
  f.querySelectorAll<HTMLElement>(".v2-appel").forEach(sec => { const a = appelsJoueur()[+sec.dataset.i!];
    sec.querySelectorAll<HTMLButtonElement>("[data-ap]").forEach(b => b.onclick = () => { const l = CR.repondreAppel(e, a, b.dataset.ap === "1");
      sec.querySelectorAll<HTMLButtonElement>("[data-ap]").forEach(x => { x.disabled = true; x.classList.toggle("choisi", x === b); });
      const z = $(".v2-crise-issue", sec); z.innerHTML = `<div class="v2-effets">${l.map(x => `<span>${esc(x.texte)}</span>`).join("")}</div>`; z.hidden = false; majOk(); }); });
  const majOk = () => { const fait = (!k || !!k.issue) && appelsOk(); ok.disabled = !fait; $(".v2-etat", f).textContent = fait ? "" : "Réponds d'abord au briefing."; };
  majOk(); if (!k) return;
  const maj = () => { const fait = !!k.issue; majOk(); 
    f.querySelectorAll<HTMLButtonElement>(".v2-crise:not(.v2-appel) .v2-crise-btn").forEach(b => { b.disabled = fait || (b.dataset.rep === "escalade" && e.budget[joueur()] < CR.CRISE.coutEscalade); b.classList.toggle("choisi", k.reponses[joueur()] === b.dataset.rep); }); };
  f.querySelectorAll<HTMLButtonElement>(".v2-crise:not(.v2-appel) .v2-crise-btn").forEach(b => b.onclick = () => {
    CR.repondre(e, joueur(), b.dataset.rep as CR.Reponse); CR.resoudreCrise(e);
    const z = $(".v2-crise:not(.v2-appel) .v2-crise-issue", f); z.innerHTML = issueCrise(); z.hidden = false; maj(); compteurs(); });
  maj();
}
// Description lisible des effets d'une carte, du point de vue du camp qui en profite.
function decrireEffets(c: M.CarteMain): string[] {
  const benef: Camp = c.source === "adverse" ? adv() : joueur();
  const nomPays = (p: unknown) => p === "tous" ? "tous les pays" : p === "$pays" ? "un pays clé" : Array.isArray(p) ? (p.length <= 3 ? p.map(i => NOMS_PAYS[i]).join(", ") : `${p.length} pays`) : NOMS_PAYS[p as string] ?? String(p);
  return (c.carte.modes[0].effets as any[]).map(f => {
    const camp: Camp = f.camp === "$adversaire" ? M.autre(benef) : benef;
    if (f.type === "influence") return `${f.canal === "e" ? "Économie" : "Attitude"} de ${nomPays(f.pays)} envers ${M.NOM_CAMP[camp]} ${f.valeur > 0 ? "+" : ""}${fr(f.valeur * 1.5)}`;
    if (f.type === "croissance") return `PIB de ${nomPays(f.pays)} ${f.points > 0 ? "+" : ""}${fr(f.points * Math.min(4, f.duree ?? 4) / 4, 2)} %`;
    if (f.type === "stabilite") return `Stabilité de ${nomPays(f.pays)} ${f.valeur > 0 ? "+" : ""}${f.valeur}`;
    if (f.type === "tension") return `Tension mondiale ${f.valeur > 0 ? "+" : ""}${fr(f.valeur / 2)}`;
    if (f.type === "cp" || f.type === "budget") return `Budget ${M.NOM_CAMP[camp]} ${f.valeur > 0 ? "+" : ""}${Math.round(f.valeur / 2)}`;
    if (f.type === "co2") return `Émissions mondiales ${fr(f.pourcent, 1)} %`;
    return "";
  }).filter(Boolean);
}
// 3. Cartes : 6 en main, en écarter 2.
function cartes() {
  ecartees.clear();
  const j = joueur(), m = e.main[j], pris = new Set(e.imagesPrises);
  const images = m.map(c => { const n = CARTES[c.carte.id]; if (n && !pris.has(n) && img(n)) { pris.add(n); return n; } return undefined; });
  const SRC = { propre: { nom: "Ton camp", c: COUL[j] }, neutre: { nom: "Neutre", c: "#b08a2e" }, adverse: { nom: "Adverse", c: COUL[adv()] } };
  const f = fenetre(`<h1>Ta main : écarte 2 cartes</h1><p class="v2-intro">Les 4 cartes gardées sont jouées tout de suite : leur événement s'applique et elles te donnent leurs <b>points d'opérations</b>. Plus une carte t'est favorable, moins elle rapporte.</p>
    <div class="v2-main">${m.map((c, i) => `<button class="v2-carte-jeu ${c.source}" data-i="${i}" style="--c:${SRC[c.source].c}">
      <div class="v2-cj-haut"><span>${SRC[c.source].nom}</span><b>${c.points}<small>pt${c.points > 1 ? "s" : ""}</small></b></div>
      ${images[i] ? `<img src="${img(images[i])}" alt="">` : `<div class="v2-cj-sans"><span>${c.carte.camp === "OCC" ? "★" : c.carte.camp === "CHN" ? "✦" : "◎"}</span><small>${esc(c.carte.titre)}</small></div>`}
      <h3>${esc(c.carte.titre)}</h3><p>${esc(c.carte.texte)}</p>
      <div class="v2-effets">${decrireEffets(c).map(x => `<span>${esc(x)}</span>`).join("")}</div>
      <div class="v2-tampon">Écartée</div></button>`).join("")}</div>
    <div class="v2-pied"><span class="v2-etat"></span><button class="v2-ok v2-prim">Jouer les 4 cartes</button></div>`, true);
  const maj = () => {
    f.querySelectorAll<HTMLButtonElement>(".v2-carte-jeu").forEach(b => b.classList.toggle("ecartee", ecartees.has(+b.dataset.i!)));
    const gardees = m.filter((_, i) => !ecartees.has(i)), somme = gardees.reduce((s, c) => s + c.points, 0), bonus = M.bonusPoints(e, j);
    const ok = $(".v2-ok", f) as HTMLButtonElement; ok.disabled = ecartees.size !== 2;
    $(".v2-etat", f).innerHTML = ecartees.size < 2 ? `Écarte encore ${2 - ecartees.size} carte${ecartees.size === 0 ? "s" : ""}.` : `Points reçus : <b>${somme}</b> (cartes) ${bonus >= 0 ? "+" : "−"} <b>${Math.abs(bonus)}</b> (cabinet) = <b class="v2-gros">${Math.max(0, somme + bonus)}</b>`;
  };
  f.querySelectorAll<HTMLButtonElement>(".v2-carte-jeu").forEach(b => b.onclick = () => {
    const i = +b.dataset.i!;
    if (ecartees.has(i)) ecartees.delete(i); else if (ecartees.size < 2) ecartees.add(i);
    maj();
  });
  $(".v2-ok", f).onclick = () => {
    for (const n of images) if (n) e.imagesPrises.push(n);
    const lignes = M.jouerMain(e, j, [...ecartees]); M.mainIA(e, adv());
    const f2 = fenetre(`<h1>Les 4 cartes sont jouées</h1><p class="v2-intro">Tu reçois <b class="v2-gros">${e.points[j]} points d'opérations</b> pour cette année. Effets appliqués :</p>
      <ul class="v2-lignes">${lignes.map(l => `<li class="${l.signe === 1 ? "plus" : l.signe === -1 ? "moins" : ""}">${esc(l.texte)}</li>`).join("")}</ul>
      <div class="v2-pied"><span class="v2-etat"></span><button class="v2-ok v2-prim">Répartir mes ${e.points[j]} points →</button></div>`);
    $(".v2-ok", f2).onclick = () => aller(3);
    compteurs();
  };
  maj();
  conseil("economie", "Les cartes adverses rapportent 3 ou 4 points, mais leur événement aide l'autre camp. À toi de peser : un bon événement, ou beaucoup de points.");
}
// 4. Opérations : poser ses points sur les zones (glisser un jeton ou cliquer une zone).
function operations() {
  const p = $(".v2-panneau"); p.hidden = false;
  if (!zoneChoisie) choisirZone(null);
  panneauOperations();
  conseil("international", "Glisse un jeton sur une zone, ou clique-la, pour voir les opérations utiles. Si tu veux, je te propose une répartition toute faite.");
}
function panneauOperations() {
  const p = $(".v2-panneau"), j = joueur(), libres = M.pointsLibres(e, j), budget = e.budget[j] - e.boostsUtilises[j];
  const plan = e.ops.filter(o => o.camp === j && o.annee === e.annee);
  const z = zoneChoisie;
  const lignePays = (iso: string) => { const x = e.pays[iso]; return `<button class="v2-pays ${paysChoisi === iso ? "choisi" : ""}" data-iso="${iso}"><span>${esc(x.nom)}</span>${chipNiveau(x.att[j])}${chipNiveau(x.eco[j], true)}<small>${fr(x.poids, 2)}</small></button>`; };
  const zonesHtml = z ? (() => {
    const zz = zone(z), l = zz.pays.slice().sort((a, b) => e.pays[b].poids - e.pays[a].poids);
    const d = M.decompte(e).zones.find(x => x.id === z)!;
    const cats = [["dev", "Développement"], ["secret", "Opérations secrètes"], ["mil", "Militaire"]] as const;
    return `<div class="v2-zone" style="--z:${zz.couleur}">
      <div class="v2-zone-tete"><h2>${zz.nom}</h2><button class="v2-x" data-fermer title="Fermer la zone">×</button></div>
      <div class="v2-zone-poids"><span>Poids <b>${fr(d.poids)}</b></span><span style="color:${COUL.OCC}">Occident ${fr(d.OCC)}</span><span style="color:${COUL.CHN}">BRICS ${fr(d.CHN)}</span><span>Points adverses actifs : <b>${pointsZone(z, adv())}</b></span></div>
      <div class="v2-liste-pays"><div class="v2-lp-tete"><span>Pays</span><span>Attitude</span><span>Économie</span><small>poids</small></div>${l.slice(0, paysChoisi && !l.slice(0, 6).includes(paysChoisi) ? 5 : 6).map(lignePays).join("")}${paysChoisi && !l.slice(0, 6).includes(paysChoisi) ? lignePays(paysChoisi) : ""}
        ${l.length > 6 ? `<select class="v2-autres"><option value="">${l.length - 6} autres pays…</option>${l.slice(6).map(i => `<option value="${i}" ${paysChoisi === i ? "selected" : ""}>${esc(e.pays[i].nom)}</option>`).join("")}</select>` : ""}</div>
      ${cats.map(([cat, nom]) => `<h4>${nom}${cat === "secret" ? `<small>vise un pays : ${paysChoisi ? `<b>${esc(e.pays[paysChoisi].nom)}</b>` : "choisis-le dans la liste ou sur la carte"}</small>` : ""}</h4><div class="v2-ops">${M.OPERATIONS.filter(o => o.cat === cat).map(o => {
        const cible = o.cible === "pays" ? paysChoisi ?? undefined : undefined;
        const r = M.raisonBlocage(e, j, o.id, z, cible);
        const risque = o.cat === "secret" && cible ? M.risqueDemasque(e, { id: 0, camp: j, type: o.id, zone: z, pays: cible, points: 1, boost: 0, annee: e.annee }) : 0;
        return `<button class="v2-op" data-op="${o.id}" ${r ? "disabled" : ""} title="${esc(o.aide)}"><span class="v2-op-ic">${o.icone}</span><span><b>${o.nom}</b><small>${r ? esc(r) : esc(o.aide)}</small></span><span class="v2-op-cout">${risque ? `<i title="Risque d'être démasqué chaque année">${risque} %</i>` : ""}+${o.min ?? 1}</span></button>`;
      }).join("")}</div>`).join("")}
    </div>`;
  })() : `<div class="v2-astuce"><b>Choisis une zone</b><p>Glisse un jeton sur la carte, ou clique une zone ou un pays. Les zones les plus lourdes pèsent le plus au décompte.</p></div>`;
  p.innerHTML = `<div class="v2-reserve"><div class="v2-reserve-tete"><b>Tes points</b><span>${libres} libre${libres > 1 ? "s" : ""} sur ${e.points[j]}</span></div>
      <div class="v2-jetons-libres">${Array.from({ length: e.points[j] }, (_, i) => `<span class="v2-jeton ${i < libres ? "" : "pose"}" draggable="${i < libres}" style="--c:${COUL[j]}"></span>`).join("")}</div>
      <button class="v2-proposer v2-sec">💡 Proposition des conseillers</button></div>
    <div class="v2-defile">${avisHtml()}${zonesHtml}
    <div class="v2-plan"><h4>Ton plan pour ${e.annee} <small>${budget} unité${budget > 1 ? "s" : ""} de budget libre${budget > 1 ? "s" : ""}</small></h4>${plan.length ? `<p class="v2-astuce">◆ <b>Budget</b> : clique sur les losanges d'une opération pour la renforcer (+10 % d'effet par losange, 3 au plus). Le budget non dépensé est reporté.</p>` : ""}${plan.length ? plan.map(o => `<div class="v2-plan-l" data-id="${o.id}"><span class="v2-op-ic">${M.op(o.type).icone}</span><span><b>${M.op(o.type).nom}</b><small>${zone(o.zone).court}${o.pays && M.op(o.type).cible === "pays" ? " · " + esc(e.pays[o.pays].nom) : ""}</small></span>
      <span class="v2-pm"><button data-moins title="Retirer 1 point">−</button><b>${o.points}</b><button data-plus title="Ajouter 1 point" ${libres ? "" : "disabled"}>+</button></span>
      <span class="v2-boost" title="Boost : +10 % d'effet par unité de budget (3 au plus)">${[1, 2, 3].map(k => `<button data-boost="${k}" class="${o.boost >= k ? "on" : ""}" ${o.boost < k && budget < k - o.boost ? "disabled" : ""}>◆</button>`).join("")}</span><button class="v2-x" data-retirer title="Annuler l'opération">×</button></div>`).join("") : `<p class="v2-vide">Aucune opération pour l'instant.</p>`}</div></div>
    <div class="v2-panneau-pied"><span class="v2-etat">${libres ? `${libres} point${libres > 1 ? "s" : ""} encore libre${libres > 1 ? "s" : ""}` : "Tous tes points sont posés."}</span><button class="v2-ok v2-prim" ${plan.length ? "" : "disabled"}>Valider et révéler →</button></div>`;
  // Jetons : glisser vers la carte
  p.querySelectorAll<HTMLElement>(".v2-jeton[draggable=true]").forEach(t => t.addEventListener("dragstart", ev => { ev.dataTransfer!.setData("text/plain", "jeton"); ev.dataTransfer!.effectAllowed = "copy"; }));
  brancherAvis(p);
  $(".v2-proposer", p).onclick = () => {
    for (const o of e.ops.filter(o => o.camp === j && o.annee === e.annee)) M.retirer(e, o.id);
    const prop = M.propositionConseillers(e, j);
    for (const x of prop) if (!M.raisonBlocage(e, j, x.type, x.zone, x.pays)) M.engager(e, j, x.type, x.zone, x.points, x.pays);
    conseil("international", `<ul class="v2-prop">${prop.map(x => `<li><b>${x.points} pt${x.points > 1 ? "s" : ""} · ${M.op(x.type).nom}</b> — ${esc(x.raison)}</li>`).join("")}</ul>Modifie ce que tu veux dans ton plan.`);
    panneauOperations(); compteurs(); rafraichirCarte();
  };
  p.querySelector<HTMLElement>("[data-fermer]")?.addEventListener("click", () => { paysChoisi = null; choisirZone(null); });
  p.querySelectorAll<HTMLButtonElement>(".v2-pays").forEach(b => b.onclick = () => { paysChoisi = b.dataset.iso!; carte.choisirPays(paysChoisi); panneauOperations(); });
  p.querySelector<HTMLSelectElement>(".v2-autres")?.addEventListener("change", ev => { paysChoisi = (ev.target as HTMLSelectElement).value || null; carte.choisirPays(paysChoisi); panneauOperations(); });
  p.querySelectorAll<HTMLButtonElement>(".v2-op").forEach(b => b.onclick = () => {
    const t = b.dataset.op as M.TypeOp, d = M.op(t), cible = d.cible === "pays" ? paysChoisi ?? undefined : undefined;
    const existe = e.ops.find(o => o.camp === j && o.annee === e.annee && o.type === t && o.zone === z && (d.cible !== "pays" || o.pays === cible));
    if (existe && libres) existe.points++; else if (!existe) M.engager(e, j, t, z!, d.min ?? 1, cible);
    panneauOperations(); compteurs(); rafraichirCarte();
  });
  p.querySelectorAll<HTMLElement>(".v2-plan-l").forEach(l => {
    const o = e.ops.find(x => x.id === +l.dataset.id!)!;
    l.querySelector<HTMLButtonElement>("[data-moins]")!.onclick = () => { if (o.points > (M.op(o.type).min ?? 1)) o.points--; else M.retirer(e, o.id); maj(); };
    l.querySelector<HTMLButtonElement>("[data-plus]")!.onclick = () => { if (M.pointsLibres(e, j)) o.points++; maj(); };
    l.querySelector<HTMLButtonElement>("[data-retirer]")!.onclick = () => { M.retirer(e, o.id); maj(); };
    l.querySelectorAll<HTMLButtonElement>("[data-boost]").forEach(b => b.onclick = () => { const k = +b.dataset.boost!, n = o.boost === k ? k - 1 : k; e.boostsUtilises[j] += n - o.boost; o.boost = n; maj(); });
    l.addEventListener("mouseenter", () => carte.surligner(o.zone)); l.addEventListener("mouseleave", () => carte.surligner(zoneChoisie));
  });
  $(".v2-ok", p).onclick = () => {
    if (M.pointsLibres(e, j) > 0 && !confirm(`Il te reste ${M.pointsLibres(e, j)} point(s) libre(s) : ils seront perdus. Valider quand même ?`)) return;
    M.repartitionIA(e, adv()); aller(4);
  };
  function maj() { panneauOperations(); compteurs(); rafraichirCarte(); }
}
// 5. Révélation : les deux plans apparaissent, zone par zone ; la traque si une élimination est prévue.
function revelation() {
  paysChoisi = null; choisirZone(null); mode = "ops";
  const j = joueur(), p = $(".v2-panneau"); p.hidden = false;
  const traque = e.ops.find(o => o.camp === j && o.annee === e.annee && o.type === "eliminer");
  const suite = () => {
    revelations = M.resoudreAnnee(e);
    const visibles = revelations.filter(r => r.op.camp === j || M.op(r.op.type).cat !== "secret" || r.op.revelee || r.demasquee);
    const cachees = revelations.filter(r => !visibles.includes(r)).length;
    const parZone = ZONES.map(z => ({ z, l: visibles.filter(r => r.op.zone === z.id || (r.op.type === "armee" && z.id === ZONE_DE[M.LEADER[r.op.camp]])) })).filter(x => x.l.length);
    p.innerHTML = `<div class="v2-reserve"><div class="v2-reserve-tete"><b>Révélation ${e.annee}</b><span>${revelations.filter(r => r.op.camp === adv()).reduce((s, r) => s + r.op.points, 0)} points ${M.NOM_CAMP[adv()] === "BRICS" ? "des BRICS" : "de l'Occident"}</span></div>
      <p class="v2-note">${cachees ? `${cachees} opération${cachees > 1 ? "s" : ""} secrète${cachees > 1 ? "s" : ""} adverse${cachees > 1 ? "s" : ""} reste${cachees > 1 ? "nt" : ""} cachée${cachees > 1 ? "s" : ""} (un « ? » sur la carte) : une opération secrète dans la zone les révèle.` : "Toutes les opérations adverses sont connues."}</p></div>
      <div class="v2-defile">${avisHtml()}${parZone.map((x, k) => `<div class="v2-rev" style="--z:${x.z.couleur};animation-delay:${k * 140}ms" data-zone="${x.z.id}"><h4>${x.z.nom}</h4>${x.l.map(r => `<div class="v2-rev-l" style="--c:${COUL[r.op.camp]}"><span class="v2-op-ic">${M.op(r.op.type).icone}</span><span><em class="v2-qui" style="background:${COUL[r.op.camp]}">${r.op.camp === j ? "Toi" : M.NOM_CAMP[r.op.camp]}</em><b>${M.op(r.op.type).nom}</b> · ${r.op.points} pt${r.op.points > 1 ? "s" : ""}${r.op.boost ? ` · boost ${r.op.boost}` : ""}${r.op.pays && M.op(r.op.type).cible === "pays" ? `<small>${esc(e.pays[r.op.pays].nom)}${r.risque ? ` · risque ${r.risque} %` : ""}</small>` : ""}${r.demasquee ? `<small class="moins">Démasquée ! ${esc(r.lignes[r.lignes.length - 1].texte.replace("Démasqué ! ", ""))}</small>` : ""}</span></div>`).join("")}</div>`).join("")}</div>
      <div class="v2-panneau-pied"><span class="v2-etat">Survole une zone de la liste pour la voir sur la carte.</span><button class="v2-ok v2-prim">Voir le bilan →</button></div>`;
    p.querySelectorAll<HTMLElement>(".v2-rev").forEach(r => { r.onmouseenter = () => carte.surligner(r.dataset.zone!); r.onmouseleave = () => carte.surligner(null); });
    $(".v2-ok", p).onclick = () => aller(5);
    const dem = revelations.filter(r => r.op.camp === j && r.demasquee);
    conseil("renseignement", dem.length ? `Mauvaise nouvelle : ${dem.map(r => esc(e.pays[r.op.pays!].nom)).join(", ")} nous a démasqués. La tension monte.` : `Aucun de nos agents n'a été démasqué. ${cachees ? "L'adversaire cache encore des opérations secrètes." : ""}`);
    compteurs(); rafraichirCarte();
  };
  if (traque) lancerTraque(traque, suite); else suite();
}
// La traque : choisir où envoyer ses équipes, sans dé.
function lancerTraque(o: M.Operation, suite: () => void) {
  const t = M.preparerTraque(e, o), z = zone(o.zone), choix = new Set<string>();
  const f = fenetre(`<h1>La traque · ${z.nom}</h1><p class="v2-intro">${M.NOM_CAMP[adv()] === "BRICS" ? "Les BRICS ont" : "L'Occident a"} caché ses points dans certains pays de la zone, avec des leurres. Tu as <b>${t.equipes} équipe${t.equipes > 1 ? "s" : ""}</b> : choisis où chercher. Une équipe qui trouve des points en élimine jusqu'à 2 ; sur un pays vide ou un leurre, le risque d'être démasqué augmente. Limite : <b>${t.limite} point${t.limite > 1 ? "s" : ""}</b>.</p>
    <div class="v2-traque">${z.pays.slice().sort((a, b) => e.pays[b].poids - e.pays[a].poids).map(i => `<button class="v2-tuile ${t.reveles.includes(i) ? "revele" : ""}" data-iso="${i}"><b>${esc(e.pays[i].nom)}</b>${t.reveles.includes(i) ? `<small>👁 infiltré : ${t.caches[i] ?? 0} point${(t.caches[i] ?? 0) > 1 ? "s" : ""}</small>` : `<small>poids ${fr(e.pays[i].poids, 2)}</small>`}<span class="v2-tuile-res"></span></button>`).join("")}</div>
    <div class="v2-pied"><span class="v2-etat"></span><button class="v2-ok v2-prim">Lancer la traque</button></div>`, true);
  const maj = () => {
    f.querySelectorAll<HTMLButtonElement>(".v2-tuile").forEach(b => b.classList.toggle("choisie", choix.has(b.dataset.iso!)));
    ($(".v2-ok", f) as HTMLButtonElement).disabled = choix.size === 0;
    $(".v2-etat", f).textContent = `${t.equipes - choix.size} équipe${t.equipes - choix.size > 1 ? "s" : ""} à placer.`;
  };
  f.querySelectorAll<HTMLButtonElement>(".v2-tuile").forEach(b => b.onclick = () => { const i = b.dataset.iso!; if (choix.has(i)) choix.delete(i); else if (choix.size < t.equipes) choix.add(i); maj(); });
  $(".v2-ok", f).onclick = () => {
    const r = M.resoudreTraque(e, t, [...choix]);
    r.fouilles.forEach((x, k) => setTimeout(() => {
      const b = f.querySelector<HTMLElement>(`.v2-tuile[data-iso="${x.iso}"]`)!;
      b.classList.add("retournee", x.trouve ? "trouve" : "rate");
      $(".v2-tuile-res", b).textContent = x.trouve ? `−${x.trouve} point${x.trouve > 1 ? "s" : ""}` : x.leurre ? "Leurre !" : "Rien";
    }, 350 * k + 200));
    setTimeout(() => {
      $(".v2-etat", f).innerHTML = `<b>${r.elimines} point${r.elimines > 1 ? "s" : ""} adverse${r.elimines > 1 ? "s" : ""} éliminé${r.elimines > 1 ? "s" : ""}.</b> ${r.risqueAjoute ? `Risque d'être démasqué +${r.risqueAjoute}.` : ""}`;
      const b = $(".v2-ok", f) as HTMLButtonElement; b.textContent = "Continuer →"; b.disabled = false; b.onclick = () => { fermerFenetre(); suite(); };
    }, 350 * r.fouilles.length + 500);
    ($(".v2-ok", f) as HTMLButtonElement).disabled = true;
  };
  maj();
}
// Opérations de l'année dans le bilan (retour du 2 novembre 2026 : toutes les actions doivent y figurer, avec leur progression sur 3 ans).
const NOM_BIEN = Object.fromEntries(RS.BIENS.map(b => [b.id, b.nom.toLowerCase()]));
function effetsOp(r: M.Revelation, j: Camp): string[] {
  const m = r.mesure; if (!m) return []; const moi = r.op.camp === j, envers = moi ? "toi" : M.NOM_CAMP[r.op.camp] === "BRICS" ? "les BRICS" : "l'Occident";
  const l: string[] = [], seul = m.pays.length === 1 ? esc(e.pays[m.pays[0]].nom) : `${m.pays.length} pays`, d = (v: number) => `${sg(v)} degré${Math.abs(v) >= 2 ? "s" : ""}`;
  if (Math.abs(m.pib) >= 0.005) l.push(`PIB ${seul} ${Math.abs(m.pib) < 0.1 ? (m.pib > 0 ? "+" : "−") + fr(Math.abs(m.pib), 2) : sg(m.pib)} %`);
  if (Math.abs(m.stabilite) >= 0.05) l.push(`stabilité ${sg(m.stabilite)}`);
  if (Math.abs(m.degres) >= 0.05) l.push(`attitude envers ${envers} ${d(m.degres)}`);
  if (Math.abs(m.degresEco) >= 0.05) l.push(`économie avec ${envers} ${d(m.degresEco)}`);
  if (Math.abs(m.degresAdv) >= 0.05) l.push(`liens avec ${moi ? "l'adversaire" : "toi"} ${d(m.degresAdv)}`);
  if (Math.abs(m.militaire) >= 0.05) l.push(`armée ${sg(m.militaire)}`);
  for (const [b, v] of Object.entries(m.soldes)) l.push(`${NOM_BIEN[b]} ${sg(v!)}`);
  if (Math.abs(m.tension) >= 0.05) l.push(`tension mondiale ${sg(m.tension)}`);
  return l;
}
function ligneOp(r: M.Revelation, j: Camp) {
  const o = r.op, d = M.op(o.type), age = r.age ?? 0, cible = o.pays && d.cible === "pays" ? esc(e.pays[o.pays].nom) : o.type === "armee" ? "ton armée" : zone(o.zone).nom;
  const reste = M.ETALEMENT.slice(age + 1).map((x, k) => `${Math.round(x * 100)} % (${e.annee + k + 1})`).join(", ");
  const ef = effetsOp(r, j);
  return `<li class="v2-opb"><span class="v2-op-ic">${d.icone}</span><div><b>${d.nom}</b> · ${cible} · <span class="nw">${o.points} pt${o.points > 1 ? "s" : ""}</span>${o.camp !== j ? ` <em class="v2-qui" style="background:${COUL[o.camp]}">${M.NOM_CAMP[o.camp]}</em>` : ""}
    <div class="v2-opb-effets">${ef.length ? ef.map(x => `<span>${x}</span>`).join("") : `<span class="v2-gris">effet trop faible pour être mesuré cette année</span>`}${r.demasquee ? `<span class="moins">démasquée</span>` : ""}</div></div>
    <div class="v2-opb-prog" title="L'effet d'une opération s'étale sur 3 ans : 50 %, 30 %, 20 %"><div>${M.ETALEMENT.map((x, k) => `<i style="flex:${x}" class="${k < age ? "fait" : k === age ? "ici" : ""}"></i>`).join("")}</div><small>année ${age + 1} sur 3 · ${Math.round((r.cumul ?? 0) * 100)} % appliqué${reste ? `<br>reste ${reste}` : " · terminée"}</small></div></li>`;
}
function opsBilan(j: Camp) {
  const miennes = revelations.filter(r => r.op.camp === j), visibles = revelations.filter(r => r.op.camp !== j && (M.op(r.op.type).cat !== "secret" || r.op.revelee || r.demasquee));
  const cachees = revelations.filter(r => r.op.camp !== j).length - visibles.length, tOps = revelations.reduce((s, r) => s + (r.mesure?.tension ?? 0), 0);
  return `<section class="v2-bilan-ops"><h3>Opérations de l'année <small>${miennes.length} à toi, ${visibles.length} adverse${visibles.length > 1 ? "s" : ""} connue${visibles.length > 1 ? "s" : ""}${cachees ? `, ${cachees} cachée${cachees > 1 ? "s" : ""}` : ""} · tension mondiale ${fr(e.tension)} sur 10${Math.abs(tOps) >= 0.05 ? `, dont ${sg(tOps)} par les opérations` : ""}</small></h3>
    <ul class="v2-opb-liste">${[...miennes, ...visibles].map(r => ligneOp(r, j)).join("") || `<li class="v2-vide">Aucune opération cette année.</li>`}</ul></section>`;
}
function conflitsBilan() {
  const l = e.conflits ?? []; if (!l.length) return "";
  return `<section class="v2-bilan-conflits"><h3>Conflits armés <small>${l.length} en cours ou terminé${l.length > 1 ? "s" : ""} cette année · opération « Soutien dans un conflit » pour peser</small></h3>
    <ul>${l.map(x => `<li><b>⚔ ${esc(x.titre)}</b><span>${esc(x.texte)}</span><div class="v2-effets">${x.resume.split(" · ").map(r => `<span>${esc(r)}</span>`).join("")}</div></li>`).join("")}</ul></section>`;
}
// 6. Bilan de l'année.
function bilan() {
  const j = joueur(), ch = M.changementsNiveau(e), d = M.decompte(e), g = M.progression(e);
  const nom = (k: "att" | "eco", n: number) => (k === "att" ? M.ATTITUDES : ECO_COURT)[n];
  const pal = (k: "att" | "eco") => (k === "att" ? PALETTE_ATT : PALETTE_ECO);
  // Mouvements regroupés (même camp, même échelle, même passage de niveau), les plus lourds d'abord ; ton camp en premier à poids égal.
  const groupes: { camp: Camp; echelle: "att" | "eco"; avant: number; apres: number; pays: string[]; poids: number }[] = [];
  for (const c of ch) { let g = groupes.find(x => x.camp === c.camp && x.echelle === c.echelle && x.avant === c.avant && x.apres === c.apres); if (!g) groupes.push(g = { camp: c.camp, echelle: c.echelle, avant: c.avant, apres: c.apres, pays: [], poids: 0 }); g.pays.push(c.iso); g.poids += e.pays[c.iso].poids; }
  groupes.sort((a, b) => (b.camp === j ? 1.5 : 1) * b.poids - (a.camp === j ? 1.5 : 1) * a.poids);
  const f = fenetre(`<h1>Bilan de l'année ${e.annee}</h1>
    <div class="v2-bilan">${evenementsBilan()}${opsBilan(j)}${conflitsBilan()}
      <section><h3>Ce qui a changé <small>${ch.length} changement${ch.length > 1 ? "s" : ""} de niveau, regroupés</small></h3><ul class="v2-changements">${groupes.slice(0, 9).map(g => { const monte = g.apres > g.avant; const bon = (g.camp === j) === monte; return `<li><span class="v2-camp-chip" style="background:${COUL[g.camp]}">${g.camp === "OCC" ? "Occident" : "BRICS"}</span><span>${g.echelle === "att" ? "attitude" : "économie"}</span><span class="v2-chip" style="background:${pal(g.echelle)[g.avant]}">${nom(g.echelle, g.avant)}</span><i class="${bon ? "plus" : "moins"}" title="${bon ? "Bon pour toi" : "Mauvais pour toi"}">${monte ? "➜" : "➘"}</i><span class="v2-chip" style="background:${pal(g.echelle)[g.apres]}">${nom(g.echelle, g.apres)}</span><b class="v2-ch-pays">${g.pays.slice(0, 4).map(i => esc(e.pays[i].nom)).join(", ")}${g.pays.length > 4 ? ` <small>et ${g.pays.length - 4} autre${g.pays.length > 5 ? "s" : ""}</small>` : ""}</b></li>`; }).join("") || `<li class="v2-vide">Aucun pays n'a changé de niveau : les effets s'étalent sur 3 ans (50 %, 30 %, 20 %).</li>`}${groupes.length > 9 ? `<li class="v2-vide">… et ${groupes.length - 9} autres mouvements plus petits.</li>` : ""}</ul></section>
      <section><h3>Décompte <small>progression depuis 2000, puis poids par zone</small></h3><div class="v2-progres"><h4>Progression depuis 2000</h4>
          <div><span style="color:${COUL.OCC}">Occident</span><b>${sg(g.OCC)} %</b><small>du terrain disponible</small></div>
          <div><span style="color:${COUL.CHN}">BRICS</span><b>${sg(g.CHN)} %</b><small>du terrain disponible</small></div>
          <div><span>Handicap</span><b>${sg(g.komi)}</b><small>${g.komi < 0 ? "en défaveur de l'Occident" : "en faveur de l'Occident"} (estimation)</small></div>
          <div class="v2-progres-jauge"><span>Jauge</span><b>${sg(g.jauge)}</b><small>${g.tete ? `avantage ${g.tete === "OCC" ? "Occident" : "BRICS"}` : "égalité"}</small></div></div>
        <div class="v2-zones-bilan">${d.zones.slice().sort((a, b) => b.poids - a.poids).map(z => { const pz = M.partsZones(e)[z.id], a0 = e.zonesAnnee?.[z.id] ?? pz, d0 = e.zonesDepart?.[z.id] ?? pz;
          const dv = (v: number, c: Camp) => `<b style="color:${Math.abs(v) < 0.05 ? "var(--gris)" : COUL[c]}">${Math.abs(v) < 0.05 ? "=" : sg(v)}</b>`;
          return `<div class="v2-zb"><span>${zone(z.id).court}</span><div class="v2-zb-barre" title="Poids ${fr(z.poids)} : Occident ${fr(pz.OCC)} %, BRICS ${fr(pz.CHN)} %"><i style="width:${pz.OCC}%;background:${COUL.OCC}"></i><i style="width:${pz.CHN}%;background:${COUL.CHN};margin-left:auto"></i></div><small>${fr(z.poids)}</small>
            <em class="v2-zb-prog"><span>Occ. ${fr(pz.OCC, 0)} % ${dv(pz.OCC - a0.OCC, "OCC")}${e.annee > M.ANNEE_DEBUT ? ` <i>(${sg(pz.OCC - d0.OCC)} depuis ${M.ANNEE_DEBUT})</i>` : ""}</span><span>BRICS ${fr(pz.CHN, 0)} % ${dv(pz.CHN - a0.CHN, "CHN")}${e.annee > M.ANNEE_DEBUT ? ` <i>(${sg(pz.CHN - d0.CHN)} depuis ${M.ANNEE_DEBUT})</i>` : ""}</span></em></div>`; }).join("")}<p class="v2-note">Sous chaque zone : part du poids de la zone tenue par chaque camp, et sa variation cette année (en points).</p></div>
        <div class="v2-total"><span style="color:${COUL.OCC}">Occident <b>${fr(d.OCC)}</b></span><span style="color:${COUL.CHN}">BRICS <b>${fr(d.CHN)}</b></span></div>
<p class="v2-note">Chaque camp marque la part du terrain qu'il pouvait encore gagner en 2000 et qu'il a conquise. L'Occident part de très haut (${fr(e.decompteDepart!.OCC)} contre ${fr(e.decompteDepart!.CHN)}). Dans les simulations, il progresse pourtant un peu plus vite que les BRICS : un handicap en sa défaveur, qui grandit chaque année jusqu'en ${M.ANNEE_FIN}, rééquilibre la partie (calibré sur 200 parties).</p></section>
    </div>
    <div class="v2-pied"><span class="v2-etat">Fin de la maquette : dans le jeu complet, l'année 2001 commencerait ici.</span><button class="v2-sec v2-carte-voir">Voir la carte</button><button class="v2-ok v2-prim">Rejouer l'année</button></div>`, true);
  $(".v2-ok", f).onclick = () => demarrer(e.graine + 1);
  $(".v2-carte-voir", f).onclick = () => { fermerFenetre(); mode = "att"; rafraichirCarte(); const b = h(`<button class="v2-retour-bilan v2-prim">Revenir au bilan</button>`); document.body.appendChild(b); b.onclick = () => { b.remove(); bilan(); }; };
  const moi = g[j], lui = g[adv()], avance = j === "OCC" ? g.jauge : -g.jauge;
  conseil("defense", `Sur l'année, nous avons conquis ${sg(moi)} % du terrain disponible, ${M.NOM_CAMP[adv()] === "BRICS" ? "les BRICS" : "l'Occident"} ${sg(lui)} %. ${avance > JAUGE_NUL ? "La jauge penche de notre côté." : avance < -JAUGE_NUL ? "La jauge penche du côté adverse." : "La jauge reste à l'équilibre."} Les points posés agiront encore deux ans (30 % puis 20 % de leur effet).`);
}

function demarrer(graine: number) {
  e = M.creerPartieV2(graine, "OCC");
  zoneChoisie = null; paysChoisi = null; mode = "zones";
  squelette(); aller(-1);
}
demarrer(2000);
