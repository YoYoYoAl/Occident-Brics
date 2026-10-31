// Rester au pouvoir (refonte, maquette 7) : calendrier électoral américain ou Comité permanent chinois, et élections à l'étranger.
import {
  THEMES, LISTE_THEMES, effetTheme, fenetreThemes, choisirThemes, CONGRES, ELECTIONS_USA, CONGRES_CHINE, MI_MANDAT, comiteDe, COMITE, NOMS_FACTIONS, LIGNES,
  peutNommer, nommer, anticorruption, choisirLigne, peutAbolirLimite, abolirLimite, type Theme, type Ligne, type Faction,
} from "../moteur/pouvoir";
import { DIRIGEANT, maintienAvecPopularite } from "../moteur/dirigeants";
import { ELECTIONS_PAYS, nomPays, alignement, agir, peutAgir, libelle, type EtatPartie } from "../moteur/partie";
import { date } from "../moteur/temps";
import type { Camp } from "../moteur/types";
import { visageDirigeant } from "./portraits";
import type { Son } from "./sons";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const sg = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(".", ",");
export interface HotePouvoir {
  etat: () => EtatPartie; camp: () => Camp; tenter: (f: () => EtatPartie, s?: Son) => void;
  ouvrir: (html: string, lier: (b: HTMLElement) => void, classe?: string) => void; fermer: () => void;
}
let themes: Theme[] = [];
const prochain = (l: number[], annee: number) => l.find(a => a >= annee) ?? null;

// Ce qui demande une décision ce trimestre (pour « Ce qui t'attend »).
export function alertesPouvoir(e: EtatPartie, camp: Camp): string {
  if (camp !== e.joueur) return "";
  const a: string[] = [], { annee } = date(e.round);
  if (camp === "OCC" && fenetreThemes(e) && e.pouvoir?.themesAnnee !== annee) a.push(`Présidentielle ${annee} : choisis tes 2 thèmes de campagne.`);
  if (camp === "CHN" && e.pouvoir?.ligneAnnee !== annee) a.push("Plénum annuel : fixe la ligne du Parti.");
  if (camp === "CHN" && comiteDe(structuredClone(e)).loyaux < COMITE.majorite) a.push(`Comité permanent : moins de ${COMITE.majorite} sièges loyaux, ton pouvoir est menacé.`);
  if (e.pouvoir?.recrutement?.length) a.push(`${e.pouvoir.recrutement.length} siège${e.pouvoir.recrutement.length > 1 ? "s" : ""} de conseiller à pourvoir (salle du conseil).`);
  return a.length ? `<article class="pv-alerte"><strong>Pouvoir</strong>${a.map(x => `<span>${esc(x)}</span>`).join("")}<button data-pouvoir class="principal">Ouvrir l'écran du pouvoir</button></article>` : "";
}

function blocUSA(e: EtatPartie): string {
  const d = e.dirigeants!.OCC, { annee } = date(e.round), pres = prochain(ELECTIONS_USA, annee), mi = [annee, annee + 1, annee + 2, annee + 3].find(MI_MANDAT);
  const p = e.pouvoir, fen = fenetreThemes(e), choisis = p?.themesAnnee === annee ? p.themes ?? [] : [];
  if (!themes.length) themes = [...choisis];
  const base = maintienAvecPopularite(e, "OCC", 1 / (1 + Math.exp(-(e.camps.OCC.cp - 50) / 10))), mandats = Math.floor((e.round - d.depuis) / 16) + 1;
  const cg = p?.congres;
  return `<section class="pv-bloc"><h3>Bloc USA : le calendrier électoral</h3>
    <div class="cp-tuiles"><div><span>Popularité du président</span><strong>${Math.round(d.popularite)}</strong><small>croissance, guerres, scandales</small></div>
      <div><span>Présidentielle</span><strong>${pres ?? "—"}</strong><small>au 4e trimestre · mandat ${Math.min(mandats, 2)} sur 2</small></div>
      <div><span>Chance de réélection</span><strong>${Math.round(100 * base)} %</strong><small>avant thèmes (capital et popularité)</small></div></div>
    <div class="pv-themes"><strong>Thèmes de campagne</strong> <span class="note">${fen ? "Choisis-en 2 : chacun pèse selon le contexte (estimation)." : "Ils se choisissent aux 2e et 3e trimestres de l'année de la présidentielle."}</span>
      <div class="sc-choix">${LISTE_THEMES.map(t => { const w = effetTheme(e, t);
        return `<button data-theme="${t}" class="${themes.includes(t) ? "actif" : ""}" ${fen ? "" : "disabled"} title="${esc(THEMES[t].aide)}">${THEMES[t].nom} <small class="${w >= 0 ? "hausse" : "baisse"}">${sg(w)}</small></button>`; }).join("")}</div>
      ${fen ? `<button id="pvThemes" class="principal" ${themes.length === 2 ? "" : "disabled"}>Valider les 2 thèmes</button>${choisis.length ? ` <span class="note">Choisis : ${choisis.map(t => THEMES[t].nom).join(" et ")}.</span>` : ""}` : ""}</div>
    <p class="note">2 mandats au plus : ensuite ton parti choisit un successeur parmi 3. Effet des thèmes en logit, ±0,6 au plus chacun.</p>
    <div class="pv-congres"><strong>Mi-mandat ${mi ?? ""}</strong> <span class="note">Le Congrès suit la popularité : favorable au-dessus de ${CONGRES.favorable}, hostile sous ${CONGRES.hostile}.</span>
      <div class="pv-trois"><span class="${cg === "favorable" ? "actif" : ""}">Favorable · budget +${100 * CONGRES.budget} %</span><span class="${cg === "divise" ? "actif" : ""}">Divisé · sans effet sur le budget</span><span class="${cg === "hostile" ? "actif" : ""}">Hostile · budget −${100 * CONGRES.budget} %, destitution possible (≈ ${100 * CONGRES.destitution} % par scandale)</span></div></div>
  </section>`;
}
function blocChine(e: EtatPartie): string {
  const c = comiteDe(structuredClone(e)), { annee } = date(e.round), cg = prochain(CONGRES_CHINE, annee), p = e.pouvoir;
  const sieges = (["loyaux", "securitaires", "reformateurs"] as Faction[]).flatMap(f => Array.from({ length: c[f] }, () => `<i class="pv-siege ${f}" title="${NOMS_FACTIONS[f]}"></i>`)).join("");
  const errN = peutNommer(e), errA = peutAbolirLimite(e), plenum = p?.ligneAnnee === annee;
  return `<section class="pv-bloc"><h3>Bloc Chine : le Congrès du Parti</h3>
    <div class="pv-comite">${sieges}</div><p>${c.loyaux} siège${c.loyaux > 1 ? "s" : ""} loyaux sur 7 : ${c.loyaux >= COMITE.majorite ? "tu gardes la main" : `<strong class="baisse">sous ${COMITE.majorite}, la faction majoritaire imposera son successeur</strong>`}.
      <span class="note">■ ta faction ${c.loyaux} · ■ sécuritaires ${c.securitaires} · ■ réformateurs ${c.reformateurs}</span></p>
    <p class="note">Prochain Congrès : ${cg ?? "—"} (4e trimestre). Les sièges sont redistribués selon ton capital politique, la stabilité et la ligne du plénum.</p>
    <div class="pv-leviers"><button id="pvNommer" ${errN ? `disabled title="${esc(errN)}"` : ""}>Nominations · ${COMITE.nomination} capital<small>rallier 1 siège</small></button>
      <button id="pvPurge">Campagne anticorruption<small>retire 1 siège rival ; stabilité −2, ${Math.round(100 * COMITE.anticorruption)} % de crise interne</small></button>
      <button id="pvAbolir" ${errA ? `disabled title="${esc(errA)}"` : ""}>Abolir la limite des mandats · ${COMITE.abolition} capital<small>après 2017 ; méfiance occidentale</small></button></div>
    <div class="pv-themes"><strong>Plénum ${annee}</strong> <span class="note">${plenum ? `Ligne fixée : ${LIGNES[p!.ligne!].nom}.` : "Fixe la ligne de l'année."}</span>
      <div class="sc-choix">${(Object.keys(LIGNES) as Ligne[]).map(l => `<button data-ligne="${l}" class="${p?.ligne === l && plenum ? "actif" : ""}" ${plenum ? "disabled" : ""} title="${esc(LIGNES[l].aide)}">${LIGNES[l].nom}</button>`).join("")}</div></div>
  </section>`;
}
// Élections à l'étranger : les 4 prochains trimestres, un soutien en un clic ; la campagne complète passe par une orientation.
function blocEtranger(e: EtatPartie, camp: Camp): string {
  const s = camp === "OCC" ? 1 : -1, l = ELECTIONS_PAYS.map(x => ({ ...x, r: (x.annee - 2000) * 4 + x.trimestre - 1 })).filter(x => x.r >= e.round && x.r <= e.round + 4 && e.pays[x.iso]).sort((a, b) => a.r - b.r);
  return `<section class="pv-bloc"><h3>Élections à l'étranger (${l.length} dans l'année)</h3><p class="note">Réglées seules par défaut (résultat dans l'ouverture du trimestre). Un soutien en un clic ici, ou une campagne complète avec l'orientation « Peser sur une élection ».</p>
    <table class="op-regions"><tr><th>Pays</th><th>Scrutin</th><th>Penchant</th><th></th></tr>${l.map(x => { const err = peutAgir(e, camp, "electorale", x.iso), a = s * alignement(e, x.iso);
      return `<tr><td><strong>${esc(nomPays(x.iso))}</strong></td><td>${esc(x.nom)} · ${esc(libelle(x.r))}</td><td class="${a >= 0 ? "hausse" : "baisse"}">${sg(a)}</td><td><button data-soutenir="${x.iso}" ${err ? `disabled title="${esc(err)}"` : ""}>Soutenir</button></td></tr>`; }).join("") || `<tr><td colspan="4" class="note">Aucun scrutin dans l'année.</td></tr>`}</table></section>`;
}
export function pouvoirHtml(e: EtatPartie, camp: Camp): string {
  const d = e.dirigeants?.[camp];
  return `<div class="pv"><header class="pv-tete">${d ? visageDirigeant(d) : ""}<div><span class="sc-sur">Rester au pouvoir</span><h2>${esc(d?.nom ?? "")}</h2>
    <span>${d ? `Au pouvoir depuis ${date(d.depuis).annee} · popularité ${Math.round(d.popularite)} · capital politique ${Math.round(e.camps[camp].cp)} · mandats de ${camp === "OCC" ? DIRIGEANT.mandatOCC : DIRIGEANT.mandatCHN} ans au plus${camp === "CHN" && e.pouvoir?.limiteAbolie ? " (limite abolie)" : ""}` : ""}</span></div></header>
    <div class="pv-corps">${camp === "OCC" ? blocUSA(e) : blocChine(e)}${blocEtranger(e, camp)}</div>
    <p class="note">Après un changement de dirigeant : réélection, tu remanies librement (2 capital par chef, en janvier) ; successeur, 3 à 4 conseillers restent ; alternance, 0 ou 1. Chaque nouveau conseiller a un nom et un portrait jamais vus dans la partie.</p>
    <div class="actions-fenetre"><button id="pvFermer">Fermer</button></div></div>`;
}
export function ouvrirPouvoir(h: HotePouvoir) {
  h.ouvrir(pouvoirHtml(h.etat(), h.camp()), b => {
    const re = () => ouvrirPouvoir(h), act = (f: () => EtatPartie) => { h.tenter(f, "action"); re(); };
    b.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach(x => x.onclick = () => { const t = x.dataset.theme as Theme; themes = themes.includes(t) ? themes.filter(y => y !== t) : [...themes, t].slice(-2); re(); });
    b.querySelector<HTMLButtonElement>("#pvThemes")?.addEventListener("click", () => act(() => choisirThemes(h.etat(), themes)));
    b.querySelector<HTMLButtonElement>("#pvNommer")?.addEventListener("click", () => act(() => nommer(h.etat())));
    b.querySelector<HTMLButtonElement>("#pvPurge")?.addEventListener("click", () => act(() => anticorruption(h.etat())));
    b.querySelector<HTMLButtonElement>("#pvAbolir")?.addEventListener("click", () => act(() => abolirLimite(h.etat())));
    b.querySelectorAll<HTMLButtonElement>("[data-ligne]").forEach(x => x.onclick = () => act(() => choisirLigne(h.etat(), x.dataset.ligne as Ligne)));
    b.querySelectorAll<HTMLButtonElement>("[data-soutenir]").forEach(x => x.onclick = () => act(() => agir(h.etat(), h.camp(), "electorale", x.dataset.soutenir!)));
    b.querySelector<HTMLButtonElement>("#pvFermer")!.onclick = h.fermer;
  }, "large pouvoir");
}
