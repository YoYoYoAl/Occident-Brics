// Fenêtre « Opérations » (30/10) : les points gagnés en jouant une carte pour ses points.
// Quatre usages : accélérer une orientation, agir sur un pays choisi sur la carte (dégradé de pertinence), ou les garder (report plafonné).
import { type EtatPartie, type TypeAction, ACTIONS, AIDES_ACTIONS, EPARGNE, ACCELERATION, apercuAction, peutOperer, nomPays } from "../moteur/partie";
import type { Camp } from "../moteur/types";
import { plansDe, plansVisibles, peutAccelerer, accelerer, peutFreiner, freiner, FREIN, OBJECTIFS as OBJ_PLANS, nomCible } from "../moteur/plans";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export interface HoteOperations {
  etat: () => EtatPartie; camp: () => Camp; tenter: (f: () => EtatPartie) => void;
  ouvrir: (html: string, lier: (b: HTMLElement) => void, classe?: string) => void; fermer: () => void;
  cibler: (t: TypeAction) => void;
}
// Actions regroupées pour être lisibles (l'espionnage reste aux ministres).
export const FAMILLES_OPERATIONS: { nom: string; ico: string; actions: TypeAction[] }[] = [
  { nom: "Influence", ico: "🗣", actions: ["politique", "culturelle", "economique", "contre"] },
  { nom: "Développement", ico: "🏗", actions: ["developpement", "infrastructure"] },
  { nom: "Militaire", ico: "🎖", actions: ["armes", "exercices", "militaire"] },
  { nom: "Secret", ico: "🕶", actions: ["clandestin", "destabiliser"] },
];
const RESUME: Partial<Record<TypeAction, string>> = {
  politique: "Gagne de l'influence politique dans le pays.", culturelle: "Gagne de l'influence culturelle dans le pays.",
  economique: "Gagne de l'influence économique dans le pays.", contre: "Fait reculer l'influence de l'adversaire.",
  developpement: "Aide au développement : influence et stabilité.",
};
const resume = (t: TypeAction) => RESUME[t] ?? ACTIONS[t].aide ?? AIDES_ACTIONS[t] ?? "";

// Pertinence d'une action pour chaque pays : gain de puissance estimé (même calcul que l'aperçu d'action, sans hasard).
export function pertinence(e: EtatPartie, camp: Camp, type: TypeAction): Record<string, number> {
  const v: Record<string, number> = {};
  for (const iso of Object.keys(e.pays)) if (iso !== "USA" && iso !== "CHN") { const a = apercuAction(e, camp, type, iso); if (a) v[iso] = a.puissance; }
  return v;
}

export function ouvrirPointsOperations(h: HoteOperations) {
  const e = h.etat(), camp = h.camp(), c = e.camps[camp], plans = plansDe(e, camp);
  const html = `<div class="op-fenetre">
    <header class="op-tete"><span>Opérations</span><h2>${c.pa} point${c.pa > 1 ? "s" : ""} d'opérations</h2>
      <p>Gagnés en jouant une carte pour ses points. Choisis un usage ci-dessous. Ce que tu n'utilises pas est gardé pour le trimestre suivant, jusqu'à ${EPARGNE.max} points.</p></header>
    <section class="op-bloc op-accel"><h3>⏩ Accélérer une orientation</h3><p class="note">Chaque point fait avancer l'orientation de ${ACCELERATION.parPoint} %.</p>
      ${plans.length ? plans.map(p => { const err1 = peutAccelerer(e, camp, p.id, 1), n = Math.min(c.pa, Math.ceil((99 - p.progres) / ACCELERATION.parPoint)), errN = n > 1 ? peutAccelerer(e, camp, p.id, n) : "x";
        return `<div class="op-plan"><div><strong>${esc(OBJ_PLANS[p.objectif].nom)} · ${esc(nomCible(p))}</strong><span class="p-barre"><span style="width:${Math.min(100, p.progres)}%"></span></span><small>${Math.round(p.progres)} %</small></div>
          <button data-accel="${p.id}" data-n="1" ${err1 ? `disabled title="${esc(err1)}"` : ""}>+1 point · +${ACCELERATION.parPoint} %</button>${errN ? "" : `<button data-accel="${p.id}" data-n="${n}">+${n} points · +${Math.min(99 - Math.round(p.progres), n * ACCELERATION.parPoint)} %</button>`}</div>`; }).join("")
      : `<p class="note">Aucune orientation en cours : donne-en une dans la salle du conseil.</p>`}</section>
    ${(() => { const adv = plansVisibles(e, camp).filter(p => p.camp !== camp); return `<section class="op-bloc op-contrer"><h3>🛑 Contrer l'adversaire</h3><p class="note">Chaque point fait reculer une orientation adverse révélée de ${FREIN.parPoint} %. Tes espions et tes ripostes révèlent ses orientations.</p>
      ${adv.length ? adv.map(p => { const err = peutFreiner(e, camp, p.id, 1); return `<div class="op-plan"><div><strong>${esc(OBJ_PLANS[p.objectif].nom)} · ${esc(nomCible(p))}</strong><span class="p-barre adv"><span style="width:${Math.min(100, p.progres)}%"></span></span><small>${Math.round(p.progres)} %</small></div>
        <button data-freiner="${p.id}" ${err ? `disabled title="${esc(err)}"` : ""}>1 point · −${FREIN.parPoint} %</button><span></span></div>`; }).join("") : `<p class="note">Aucune orientation adverse révélée pour l'instant.</p>`}</section>`; })()}
    <section class="op-bloc op-agir"><h3>🌍 Agir sur un pays</h3><p class="note">Choisis une action : la carte s'allume sur les pays où elle rapporte le plus. Clique ensuite le pays.</p>
      ${FAMILLES_OPERATIONS.map(f => `<div class="op-famille"><h4>${f.ico} ${f.nom}</h4><div class="op-actions">${f.actions.map(t => { const a = ACTIONS[t], ok = c.pa >= a.pa && c.budget >= a.budget;
        return `<button data-cibler="${t}" ${ok ? "" : `disabled title="${c.pa < a.pa ? `${a.pa} points requis` : `${a.budget} budget requis`}"`}><strong>${esc(a.nom)}</strong><span class="op-cout">${a.pa} point${a.pa > 1 ? "s" : ""}${a.budget ? ` · ${a.budget} budget` : ""}</span><small>${esc(resume(t))}</small></button>`; }).join("")}</div></div>`).join("")}</section>
    <section class="op-bloc op-garder"><h3>💾 Garder pour plus tard</h3><p class="note">Ferme simplement la fenêtre : jusqu'à ${EPARGNE.max} points passent au trimestre suivant${c.pa > EPARGNE.max ? ` (${c.pa - EPARGNE.max} au-delà seraient perdus)` : ""}.</p>
      <button id="opFermer" class="principal">Garder mes points et fermer</button></section></div>`;
  h.ouvrir(html, b => {
    b.querySelectorAll<HTMLButtonElement>("[data-accel]").forEach(x => x.onclick = () => { h.tenter(() => accelerer(h.etat(), camp, x.dataset.accel!, Number(x.dataset.n))); if (h.etat().camps[camp].pa > 0) ouvrirPointsOperations(h); else h.fermer(); });
    b.querySelectorAll<HTMLButtonElement>("[data-freiner]").forEach(x => x.onclick = () => { h.tenter(() => freiner(h.etat(), camp, x.dataset.freiner!, 1)); if (h.etat().camps[camp].pa > 0) ouvrirPointsOperations(h); else h.fermer(); });
    b.querySelectorAll<HTMLButtonElement>("[data-cibler]").forEach(x => x.onclick = () => { h.fermer(); h.cibler(x.dataset.cibler as TypeAction); });
    b.querySelector<HTMLButtonElement>("#opFermer")!.onclick = () => h.fermer();
  }, "large");
}
// Bandeau au-dessus de la carte pendant le choix du pays : action, coût, 5 meilleurs pays, annuler.
export function bandeauCible(e: EtatPartie, camp: Camp, t: TypeAction, v: Record<string, number>): string {
  const a = ACTIONS[t], top = Object.entries(v).filter(([iso]) => !peutOperer(e, camp, t, iso)).sort((x, y) => y[1] - x[1]).slice(0, 5);
  return `<div class="cible-bandeau"><div><span>🎯 Choisis un pays pour</span><strong>${esc(a.nom)}</strong><small>${a.pa} point${a.pa > 1 ? "s" : ""}${a.budget ? ` · ${a.budget} budget` : ""} · plus la couleur est foncée, plus l'action rapporte</small></div>
    <div class="cible-top">${top.map(([iso]) => `<button data-operer="${iso}">${esc(nomPays(iso))}</button>`).join("")}</div><button id="annulerCible">Annuler</button></div>`;
}
