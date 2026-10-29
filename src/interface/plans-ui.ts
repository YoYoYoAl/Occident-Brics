// Écran des conseils et des plans pluriannuels : séance annuelle (1er trimestre), un ajustement par trimestre ensuite,
// plans adverses repérés (riposte) et duels en attente. Le moteur reste dans src/moteur/plans.ts.
import {
  CONSEILS, LISTE_CONSEILS, TRAITS, OBJECTIFS, LISTE_OBJECTIFS, DUREES, NOMS_INTENSITE, PLANS, ciblesPossibles, plansDe, plansVisibles,
  coutPlan, chefDe, planRival, peutLancerPlan, lancerPlan, abandonnerPlan, remplacerChef, vitesse, conflitConseils, peutRiposterPlan,
  riposterPlan, conclureDuel, iaPlans, titrePlan, nomBlocPlan, RESERVE, type ObjectifPlan, type Intensite, type Conseil, type Duel,
} from "../moteur/plans";
import { DUELS } from "../duels/catalogue";
import type { EtatPartie } from "../moteur/partie";
import { date } from "../moteur/temps";
import { adversaire, type Camp } from "../moteur/types";
import type { Son } from "./sons";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nb = (x: number) => x.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const NOM_DUREE: Record<number, string> = { 4: "1 an", 6: "18 mois", 8: "2 ans", 12: "3 ans" };
export interface HotePlans {
  etat: () => EtatPartie; camp: () => Camp;
  tenter: (f: () => EtatPartie, s?: Son) => void;
  jouerDuel: (id: string) => void; // ouvre la fenêtre du duel
}
// Formulaire « nouveau plan » : gardé entre deux affichages.
const form: { o: ObjectifPlan; cible: string; duree: number; intensite: Intensite } = { o: "commerce", cible: "", duree: 8, intensite: 2 };

export const seanceAnnuelle = (e: EtatPartie) => date(e.round).trimestre === 1;
export const duelsDuJoueur = (e: EtatPartie, camp: Camp) => (e.duels ?? []).filter(d => d.attaquant === camp || d.defenseur === camp);
// Avantage du point de vue du joueur (le moteur le stocke du point de vue de l'attaquant).
export const avantageJoueur = (d: Duel, camp: Camp) => (d.attaquant === camp ? d.avantage : -d.avantage);
// Il y a quelque chose à décider à l'étape des plans : séance annuelle, ajustement libre, ou riposte possible.
export function plansUtiles(e: EtatPartie, camp: Camp): boolean {
  const c = e.camps[camp];
  return seanceAnnuelle(e) || c.ajustement !== e.round || plansVisibles(e, camp).some(p => p.camp !== camp && !peutRiposterPlan(e, camp, p.id));
}

function barre(progres: number): string {
  return `<div class="p-barre" title="${nb(progres)} %"><span style="width:${Math.min(100, progres)}%"></span>${PLANS.jalons.slice(0, 2).map(j => `<i style="left:${j}%"></i>`).join("")}</div>`;
}
function blocConseils(e: EtatPartie, camp: Camp): string {
  const annuel = seanceAnnuelle(e);
  return `<details class="p-conseils"><summary>Tes six conseils et leurs chefs</summary><ul>${LISTE_CONSEILS.map(cs => {
    const t = chefDe(e, camp, cs), n = plansDe(e, camp).filter(p => OBJECTIFS[p.objectif].conseil === cs).length;
    return `<li><strong>${esc(CONSEILS[cs].nom)}</strong> <span class="trait" title="${esc(TRAITS[t].texte)}">chef ${TRAITS[t].nom}</span> ${n ? `<em>${n} plan${n > 1 ? "s" : ""}</em>` : ""}
      <small>${esc(CONSEILS[cs].texte)} ${esc(TRAITS[t].texte)}</small>
      ${annuel ? `<button data-chef="${cs}" title="2 CP : un nouveau chef, au trait tiré au hasard">Remplacer le chef</button>` : ""}</li>`;
  }).join("")}</ul></details>`;
}
function cartePlan(e: EtatPartie, camp: Camp, id: string): string {
  const p = e.plans!.find(x => x.id === id)!, def = OBJECTIFS[p.objectif], mien = p.camp === camp, r = planRival(e, p), conflit = mien ? conflitConseils(e, p) : null;
  const v = vitesse(e, p), reste = Math.max(0, Math.ceil((100 - p.progres) / Math.max(0.1, v)));
  const issues = p.resultats.map(x => x >= PLANS.victoire ? "✔" : x < PLANS.defaite ? "✖" : "＝").join(" ");
  const err = mien ? null : peutRiposterPlan(e, camp, p.id);
  return `<article class="plan ${mien ? "mien" : "adverse"} ${def.secret ? "secret" : ""}">
    <header><strong>${esc(titrePlan(p))}</strong><small>${esc(CONSEILS[def.conseil].nom)} · ${NOMS_INTENSITE[p.intensite]} · ${mien ? `${nb(coutPlan(e, p))} budget/trimestre` : nomBlocPlan(p.camp)}</small></header>
    ${barre(p.progres)}
    <p class="note">${nb(p.progres)} % · jalon ${p.jalons}/3 · environ ${reste} trimestre${reste > 1 ? "s" : ""} restant${reste > 1 ? "s" : ""}${issues ? ` · duels : ${issues}` : ""}${mien && p.vuPar.length ? " · <span class=\"alerte\">repéré par l'adversaire</span>" : ""}</p>
    ${mien ? `<small>${esc(def.texte)} À l'arrivée : ${esc(def.recompense)}</small>` : `<small>${esc(def.texte)}</small>`}
    ${r ? `<p class="alerte">${mien ? "L'adversaire a un plan rival sur la même cible" : "Il affronte ton plan sur la même cible"} : les deux avancent moins vite, les jalons se disputent en duel.</p>` : ""}
    ${conflit ? `<p class="alerte">Conflit entre conseils avec « ${esc(titrePlan(conflit))} » : progression freinée.</p>` : ""}
    ${mien ? `<button data-abandon="${p.id}" title="${p.progres >= 50 ? "Plus de la moitié : tu gardes la moitié de la récompense." : "Avant la moitié, l'effort est perdu."}">Abandonner</button>`
      : `<button data-riposte="${p.id}" ${err ? `disabled title="${esc(err)}"` : ""}>Riposter (3 CP, une fois par an) : duel immédiat</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}`}
  </article>`;
}
function formulaire(e: EtatPartie, camp: Camp): string {
  const cibles = ciblesPossibles(e, camp, form.o);
  if (!cibles.some(x => x.id === form.cible)) form.cible = cibles[0]?.id ?? "";
  const err = form.cible ? peutLancerPlan(e, camp, form.o, form.cible, form.duree, form.intensite) : "Aucune cible possible pour cet objectif en ce moment.";
  const def = OBJECTIFS[form.o], cout = coutPlan(e, { objectif: form.o, intensite: form.intensite, camp });
  return `<div class="p-nouveau"><h4>Nouvelle instruction</h4>
    <label>Objectif : <select id="pObjectif">${LISTE_CONSEILS.map(cs => `<optgroup label="${esc(CONSEILS[cs].nom)}">${LISTE_OBJECTIFS.filter(o => OBJECTIFS[o].conseil === cs).map(o => `<option value="${o}" ${o === form.o ? "selected" : ""}>${esc(OBJECTIFS[o].nom)}</option>`).join("")}</optgroup>`).join("")}</select></label>
    <label>Cible : <select id="pCible">${cibles.map(x => `<option value="${esc(x.id)}" ${x.id === form.cible ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}</select></label>
    <div class="p-choix">Durée : ${DUREES.map(d => `<button data-duree="${d}" class="${d === form.duree ? "actif" : ""}">${NOM_DUREE[d]}</button>`).join("")}</div>
    <div class="p-choix">Intensité : ${([1, 2, 3] as Intensite[]).map(i => `<button data-intensite="${i}" class="${i === form.intensite ? "actif" : ""}" title="${i === 3 ? "Visible par l'adversaire dès le lancement" : i === 1 ? "Discret : plus lent, moins cher" : ""}">${NOMS_INTENSITE[i]}</button>`).join("")}</div>
    <p class="note">${esc(def.texte)} À l'arrivée : ${esc(def.recompense)} Coût : ${nb(cout)} budget par trimestre.${def.secret ? " Opération secrète : risque de scandale." : ""}${def.conteste ? " Cible disputée : duel dès le premier jalon." : ""} Duels possibles : ${def.duels.map(d => esc(DUELS[d].nom)).join(", ")}.</p>
    <button id="pLancer" class="principal" ${err ? `disabled title="${esc(err)}"` : ""}>Lancer le plan</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}
  </div>`;
}
export function panneauPlans(e: EtatPartie, camp: Camp): string {
  const c = e.camps[camp], mes = plansDe(e, camp), adv = plansVisibles(e, camp).filter(p => p.camp === adversaire(camp));
  const annuel = seanceAnnuelle(e), libre = annuel || c.ajustement !== e.round;
  let h = `<p class="note">${annuel ? "<strong>Séance annuelle des conseils</strong> : donne autant d'instructions que tu veux (5 plans au plus)." : libre ? "Hors séance annuelle : un seul ajustement ce trimestre (lancer ou abandonner un plan)." : "Ajustement du trimestre déjà fait : la prochaine séance annuelle est au 1er trimestre."}
    Tes conseils jouent seuls chaque trimestre et suivent tes plans. Réserve d'opérations ciblées : ${nb(c.reserve ?? 0)} point${(c.reserve ?? 0) > 1 ? "s" : ""} (+${RESERVE.gain} par trimestre, utilisable aux 1er et 4e trimestres).</p>`;
  h += `<details class="p-aide"><summary>Comment marchent les plans ?</summary><ol>
    <li><strong>Lancer</strong> : choisis un objectif (chaque conseil a les siens), une cible, une durée (1 an à 3 ans) et une intensité. Discret : moins cher, plus lent, rarement repéré. Normal : repéré au premier jalon. Massif : effet plus fort, mais l'adversaire le voit tout de suite.</li>
    <li><strong>Chaque trimestre</strong>, le plan coûte son budget, agit un peu sur sa cible et avance. Sans budget, il s'arrête. Il avance moins vite si l'adversaire a un plan rival sur la même cible, si les pays visés penchent vers lui, ou si deux de tes conseils se contredisent (un plan militaire et un plan commercial ou culturel sur les mêmes pays).</li>
    <li><strong>Jalons</strong> : à un tiers, le plan prend de l'élan (double effet), ou déclenche un duel si la cible est disputée. Aux deux tiers, il y a toujours un duel contre l'autre bloc. Gagner : +10 points d'avancée et le rival recule. Perdre : −25. Match nul : rien ne bouge.</li>
    <li><strong>Arrivée à 100 %</strong> : la récompense indiquée, plus forte si tu as gagné tes duels et si l'intensité est haute. Abandonner après 50 % garde la moitié de la récompense.</li>
    <li><strong>Calendrier</strong> : au 1er trimestre (séance annuelle), tu lances, abandonnes et remplaces des chefs librement (2 CP par chef). Les autres trimestres, un seul ajustement. Une fois par an, tu peux riposter à un plan adverse repéré (3 CP) : un duel immédiat qui, gagné, lui fait perdre 33 points d'avancée.</li>
    <li><strong>Plans secrets</strong> (renverser, contrer, infiltrer) : risque de scandale chaque trimestre (capital politique −4, rancune dans le pays).</li>
    <li><strong>Tes ministères</strong> jouent seuls chaque trimestre et renforcent leurs actions dans les pays visés par tes plans.</li>
  </ol></details>`;
  h += blocConseils(e, camp);
  h += `<h4>Tes plans (${mes.length}/${PLANS.max})</h4>` + (mes.length ? mes.map(p => cartePlan(e, camp, p.id)).join("")
    : `<p class="note">Aucun plan en cours. ${annuel ? `<button id="pProposer">Laisser mes conseils proposer un programme</button>` : ""}</p>`);
  if (libre && mes.length < PLANS.max) h += formulaire(e, camp);
  h += `<h4>Plans adverses repérés (${adv.length})</h4>` + (adv.length ? adv.map(p => cartePlan(e, camp, p.id)).join("")
    : `<p class="note">Aucun plan adverse repéré. Les plans massifs se voient tout de suite ; le plan « Infiltrer le rival » révèle les autres.</p>`);
  return h;
}
export function panneauDuels(e: EtatPartie, camp: Camp): string {
  const l = duelsDuJoueur(e, camp);
  if (!l.length) return `<p class="note">Aucun duel en attente. Les duels naissent aux jalons disputés de tes plans, quand l'adversaire riposte, et aux batailles décisives de tes guerres.</p>`;
  return `<p class="note">Joue le duel toi-même (2 à 4 minutes) ou laisse tes conseillers le régler (résultat selon la préparation, avec une part de hasard). Un duel non joué est réglé par tes conseillers à la fin du trimestre.</p>` +
    l.map(d => { const info = DUELS[d.type], av = avantageJoueur(d, camp), p = e.plans?.find(x => x.id === d.plan);
      return `<article class="plan duel-attente"><header><strong>${esc(info.nom)}</strong><small>inspiré de ${esc(info.inspire)} · ${d.attaquant === camp ? "tu attaques" : "tu défends"}${d.motif === "riposte" ? " · riposte" : d.motif === "bataille" ? " · bataille décisive" : ""}</small></header>
        <p>${esc(info.situation)}</p><small>${p ? esc(titrePlan(p)) : esc(d.titre)} · préparation ${av > 0.15 ? "favorable" : av < -0.15 ? "défavorable" : "équilibrée"} (${av >= 0 ? "+" : ""}${nb(av)})</small>
        <div class="d-boutons"><button data-jouer-duel="${d.id}" class="principal">Jouer le duel</button><button data-deleguer="${d.id}">Laisser faire mes conseillers</button></div></article>`; }).join("");
}
export function lierPlans(zone: HTMLElement, h: HotePlans) {
  const e = h.etat, camp = h.camp, re = () => h.tenter(() => e(), "clic");
  zone.querySelector<HTMLSelectElement>("#pObjectif")?.addEventListener("change", ev => { form.o = (ev.target as HTMLSelectElement).value as ObjectifPlan; form.cible = ""; re(); });
  zone.querySelector<HTMLSelectElement>("#pCible")?.addEventListener("change", ev => { form.cible = (ev.target as HTMLSelectElement).value; re(); });
  zone.querySelectorAll<HTMLButtonElement>("[data-duree]").forEach(b => b.onclick = () => { form.duree = +b.dataset.duree!; re(); });
  zone.querySelectorAll<HTMLButtonElement>("[data-intensite]").forEach(b => b.onclick = () => { form.intensite = +b.dataset.intensite! as Intensite; re(); });
  zone.querySelector<HTMLButtonElement>("#pLancer")?.addEventListener("click", () => h.tenter(() => lancerPlan(e(), camp(), form.o, form.cible, form.duree, form.intensite), "action"));
  zone.querySelector<HTMLButtonElement>("#pProposer")?.addEventListener("click", () => h.tenter(() => { const x = structuredClone(e()); iaPlans(x, camp()); return x; }, "action"));
  zone.querySelectorAll<HTMLButtonElement>("[data-abandon]").forEach(b => b.onclick = () => h.tenter(() => abandonnerPlan(e(), camp(), b.dataset.abandon!)));
  zone.querySelectorAll<HTMLButtonElement>("[data-chef]").forEach(b => b.onclick = () => h.tenter(() => remplacerChef(e(), camp(), b.dataset.chef as Conseil)));
  zone.querySelectorAll<HTMLButtonElement>("[data-riposte]").forEach(b => b.onclick = () => {
    const id = b.dataset.riposte!; h.tenter(() => riposterPlan(e(), camp(), id), "action");
    const d = (e().duels ?? []).find(x => x.plan === id && x.motif === "riposte" && x.attaquant === camp()); if (d) h.jouerDuel(d.id);
  });
  zone.querySelectorAll<HTMLButtonElement>("[data-jouer-duel]").forEach(b => b.onclick = () => h.jouerDuel(b.dataset.jouerDuel!));
  zone.querySelectorAll<HTMLButtonElement>("[data-deleguer]").forEach(b => b.onclick = () => h.tenter(() => conclureDuel(e(), b.dataset.deleguer!, null), "action"));
}
