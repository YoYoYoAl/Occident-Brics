// Opérations militaires et guerre (refonte, maquette 6) : un seul écran par pays, en 4 temps :
// l'échelle d'escalade, la justification (casus belli), le but de guerre et les régions, ce que ça déclenche ; plus le suivi d'une guerre en cours.
import { type EtatPartie, nomPays, alignement, agir, peutAgir, ACTIONS, THEATRES, peutDeclarerGuerre, declarerGuerre, cran } from "../moteur/partie";
import {
  CASUS_BELLI, AE, BUTS, FRAPPE, casusBelliDe, peutFabriquer, fabriquerCasusBelli, FABRIQUER, regionsDe, coutRegion, REGION, changerBut, zoneDe, mefiance, nucleaire,
  peutFrapper, frapper, type TypeCB, type ButGuerre, type Intervention,
} from "../moteur/guerre";
import { ZONES } from "../moteur/zones";
import { date } from "../moteur/temps";
import { adversaire, type Camp } from "../moteur/types";
import { ficheIntervention, lierGuerre } from "./guerre-ui";
import { image } from "./images";
import type { Son } from "./sons";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export interface HoteOperations {
  etat: () => EtatPartie; camp: () => Camp; tenter: (f: () => EtatPartie, s?: Son) => void;
  ouvrir: (html: string, lier: (b: HTMLElement) => void, classe?: string) => void; fermer: () => void;
}
export type Niveau = 1 | 2 | 3 | 4 | 5;
export const NIVEAUX: Record<Niveau, { nom: string; texte: string; base: number }> = {
  1: { nom: "Pression", texte: "Manœuvres, démonstration de force : le pays plie s'il ne penche pas vers l'adversaire.", base: 0 },
  2: { nom: "Opération limitée", texte: `Frappe ciblée ou raid : influence militaire adverse −${FRAPPE.perte}, la tienne +${FRAPPE.gain}, stabilité −${FRAPPE.stabilite}, tension +${FRAPPE.tension}.`, base: FRAPPE.ae },
  3: { nom: "Guerre par procuration", texte: "Armer un camp, conseillers, frappes : sans soldats au sol.", base: 0 },
  4: { nom: "Intervention", texte: "Troupes au sol, but de guerre, score de guerre jusqu'à ±100, batailles décisives.", base: AE.intervention },
  5: { nom: "Guerre ouverte", texte: "Contre l'autre puissance, sur un théâtre. Seulement si la tension atteint 80.", base: AE.guerre },
};
const ORDRE_CB: TypeCB[] = ["incident", "defense", "antiterrorisme", "humanitaire", "adm", "regime", "rivalite"];
const theatreDe = (iso: string) => Object.entries(THEATRES).find(([, t]) => t.pays.includes(iso))?.[0] ?? null;
// Choix en cours (gardés entre deux affichages).
const choix: { niveau: Niveau; but: ButGuerre } = { niveau: 1, but: "regime" };

export function erreurNiveau(e: EtatPartie, camp: Camp, iso: string, n: Niveau): string | null {
  if (n === 1) return peutAgir(e, camp, "intimidation", iso);
  if (n === 2) return peutFrapper(e, camp, iso);
  if (n === 3) return peutAgir(e, camp, "soutien", iso);
  if (n === 4) return peutAgir(e, camp, "intervention", iso);
  const t = theatreDe(iso); return t ? peutDeclarerGuerre(e, camp, t) : "Pas de théâtre de guerre directe avec l'autre puissance ici.";
}
export function lancerNiveau(e: EtatPartie, camp: Camp, iso: string, n: Niveau, but: ButGuerre): EtatPartie {
  if (n === 1) return agir(e, camp, "intimidation", iso);
  if (n === 2) return frapper(e, camp, iso);
  if (n === 3) return agir(e, camp, "soutien", iso);
  if (n === 4) { const x = agir(e, camp, "intervention", iso); return (x.interventions.find(i => i.iso === iso && i.camp === camp) as Intervention | undefined)?.but === but ? x : changerBut(x, camp, iso, but); }
  return declarerGuerre(e, camp, theatreDe(iso)!);
}
const coutNiveau = (n: Niveau) => n === 1 ? `${ACTIONS.intimidation.budget} budget` : n === 2 ? `${FRAPPE.budget} budget · ${FRAPPE.cp} capital` : n === 3 ? `${ACTIONS.soutien.budget} budget` : n === 4 ? `${ACTIONS.intervention.budget} budget puis 1 par trimestre` : "capital politique 60";

function etatCB(e: EtatPartie, camp: Camp, iso: string, t: TypeCB): { s: "ok" | "non" | "possible"; texte: string } {
  const cb = casusBelliDe(e, camp, iso);
  if (cb?.type === t) return { s: "ok", texte: `encore ${Math.max(0, cb.fin - e.round + 1)} trimestre${cb.fin - e.round + 1 > 1 ? "s" : ""} · expansion agressive ×${String(CASUS_BELLI[t].mult).replace(".", ",")}` };
  if (t === "adm" && !peutFabriquer(e, camp, iso)) return { s: "possible", texte: `dossier à fabriquer : ${FABRIQUER.budget} budget, ${FABRIQUER.cp} capital, ${Math.round(100 * FABRIQUER.risque)} % de risque de scandale` };
  return { s: "non", texte: CASUS_BELLI[t].aide };
}
export function operationsHtml(e: EtatPartie, camp: Camp, iso: string): string {
  const n = choix.niveau, err = erreurNiveau(e, camp, iso, n), cb = casusBelliDe(e, camp, iso), adv = adversaire(camp), a = (camp === "OCC" ? 1 : -1) * alignement(e, iso);
  const mult = cb ? CASUS_BELLI[cb.type].mult : AE.agression, ae = Math.round(NIVEAUX[n].base * mult), z = zoneDe(iso);
  const voisins = (z ? ZONES[z].pays : []).filter(i => i !== iso && e.pays[i]).map(i => ({ i, m: mefiance(e, camp, i) })).sort((x, y) => y.m - x.m).slice(0, 4);
  const it = e.interventions.find(i => i.iso === iso && i.camp === camp) as Intervention | undefined, img = image("famille_incident_militaire");
  const regions = regionsDe(iso), popTot = regions.reduce((s, r) => s + r.pop, 0) || 1;
  return `<div class="op">
  <header class="op-tete" ${img ? `style="background-image:linear-gradient(90deg,rgba(10,14,18,.96),rgba(10,14,18,.6)),url(${img})"` : ""}>
    <div><span class="sc-sur">Opérations militaires</span><h2>${esc(nomPays(iso))}</h2><span>Penche ${a >= 0.05 ? "vers toi" : a <= -0.05 ? "vers l'adversaire" : "au centre"} (${a >= 0 ? "+" : "−"}${Math.abs(a).toFixed(2).replace(".", ",")}) · stabilité ${Math.round(e.pays[iso].stabilite)} · ${nucleaire(iso, date(e.round).annee) ? "puissance nucléaire" : "pas de bombe"}</span></div>
    <div class="op-compteurs"><span>Tension <strong>${cran(e)}/5</strong></span><span>Capital <strong>${Math.round(e.camps[camp].cp)}</strong></span><span>Budget <strong>${e.camps[camp].budget.toFixed(1).replace(".", ",")}</strong></span></div></header>
  ${it ? `<section class="op-suivi"><strong>Guerre en cours</strong>${ficheIntervention(e, camp, it)}</section>` : ""}
  <section><strong class="op-etape">① L'échelle d'escalade : choisis jusqu'où tu vas</strong>
    <div class="op-echelle">${([1, 2, 3, 4, 5] as Niveau[]).map(k => { const er = erreurNiveau(e, camp, iso, k);
      return `<button data-niveau="${k}" class="op-cran ${k === n ? "actif" : ""} ${er ? "bloque" : ""}"><strong>${k} · ${NIVEAUX[k].nom}</strong><span>${esc(NIVEAUX[k].texte)}</span><small>${coutNiveau(k)}</small>
        <small class="${er ? "baisse" : "hausse"}">${er ? esc(er) : "possible"}</small></button>`; }).join("")}</div></section>
  <div class="op-corps">
    <section><strong class="op-etape">② Ta justification (casus belli)</strong><span class="note">Elle réduit l'expansion agressive, donc la méfiance des voisins. Sans elle : ×${AE.agression} et capital politique −${AE.cpAgression}.</span>
      <ul class="op-cb">${ORDRE_CB.map(t => { const x = etatCB(e, camp, iso, t);
        return `<li class="${x.s}"><span>${x.s === "ok" ? "✓" : x.s === "possible" ? "◐" : "✗"}</span><div><strong>${esc(CASUS_BELLI[t].nom)}</strong><small>${esc(x.texte)}</small>${x.s === "possible" ? `<button data-fabriquer="${iso}">Monter le dossier</button>` : ""}</div></li>`; }).join("")}</ul></section>
    <section class="${n === 4 ? "" : "op-grise"}"><strong class="op-etape">③ Le but de guerre et les régions visées</strong>${n === 4 ? "" : `<span class="note">Pour une intervention (cran 4).</span>`}
      <div class="sc-choix">${(Object.keys(BUTS) as ButGuerre[]).map(b => `<button data-but-op="${b}" class="${b === choix.but ? "actif" : ""}" title="${esc(BUTS[b].aide)}">${esc(BUTS[b].nom)}</button>`).join("")}</div>
      <p class="note">${esc(BUTS[choix.but].aide)} Score de guerre exigé à la paix : ${BUTS[choix.but].cout} points.</p>
      <table class="op-regions"><tr><th>Région</th><th>Pop.</th><th>Occuper</th><th>Annexer</th></tr>${regions.map(r => `<tr><td><strong>${esc(r.nom)}</strong></td><td>${Math.round(100 * r.pop / popTot)} %</td><td>${coutRegion(r)} points</td><td>${Math.round(REGION.annexion * coutRegion(r))} points</td></tr>`).join("")}</table>
      <span class="note">Points de score de guerre exigés à la paix (estimation). Une région occupée 2 ans peut être annexée.</span></section>
    <section><strong class="op-etape">④ Ce que ça déclenche</strong>
      <div class="cp-tuiles"><div><span>Expansion agressive</span><strong>+${ae}</strong><small>${NIVEAUX[n].base} × ${String(mult).replace(".", ",")}${cb ? ` (${esc(CASUS_BELLI[cb.type].nom.toLowerCase())})` : " (sans justification)"}</small></div>
        <div><span>Coût</span><strong>${coutNiveau(n).split(" ·")[0]}</strong><small>${n >= 4 ? "+ fatigue de guerre" : n === 2 ? "+ fatigue" : ""}</small></div>
        <div><span>Tension</span><strong>${n === 1 ? "+1" : n === 2 ? `+${FRAPPE.tension}` : n === 3 ? "+2" : n === 4 ? "+10" : "100"}</strong><small>cran actuel ${cran(e)}/5</small></div></div>
      ${voisins.length && ae ? `<span><strong>${esc(ZONES[z!].nom)} :</strong> méfiance ${voisins.map(v => `${esc(nomPays(v.i))} ${Math.round(v.m)} → ${Math.round(v.m + ae)}`).join(", ")}. Au-delà de 50, ils rejoignent une coalition contre toi.</span>` : ""}
      <span><strong>${adv === "OCC" ? "Le bloc USA" : "Le bloc Chine"} :</strong> ${e.pays[iso].influence[adv].m + e.pays[iso].influence[adv].p >= 30 ? "très présent ici, il peut soutenir le pays et riposter (duel)." : "peu présent ici."}</span>
      <span><strong>Chez toi :</strong> sans victoire en 2 ans, la fatigue de guerre pèse sur la popularité de ton dirigeant.</span>
      <button id="opLancer" class="principal ${n >= 4 ? "danger" : ""}" ${err ? `disabled title="${esc(err)}"` : ""}>Lancer : ${esc(NIVEAUX[n].nom.toLowerCase())} ${/^[AEIOUÉ]/.test(nomPays(iso)) ? "en" : "au"} ${esc(nomPays(iso))}</button>
      ${err ? `<small class="erreur">${esc(err)}</small>` : ""}</section>
  </div>
  <div class="actions-fenetre"><button id="opFermer">Fermer</button></div></div>`;
}
export function ouvrirOperations(h: HoteOperations, iso: string) {
  h.ouvrir(operationsHtml(h.etat(), h.camp(), iso), b => {
    const re = () => ouvrirOperations(h, iso);
    b.querySelectorAll<HTMLButtonElement>("[data-niveau]").forEach(x => x.onclick = () => { choix.niveau = +x.dataset.niveau! as Niveau; re(); });
    b.querySelectorAll<HTMLButtonElement>("[data-but-op]").forEach(x => x.onclick = () => { choix.but = x.dataset.butOp as ButGuerre; re(); });
    b.querySelectorAll<HTMLButtonElement>("[data-fabriquer]").forEach(x => x.onclick = () => { h.tenter(() => fabriquerCasusBelli(h.etat(), h.camp(), iso), "action"); re(); });
    b.querySelector<HTMLButtonElement>("#opLancer")!.onclick = () => { h.tenter(() => lancerNiveau(h.etat(), h.camp(), iso, choix.niveau, choix.but), choix.niveau >= 2 ? "act_force" : "action"); re(); };
    b.querySelector<HTMLButtonElement>("#opFermer")!.onclick = h.fermer;
    lierGuerre(b, { etat: h.etat, camp: h.camp, tenter: f => { h.tenter(f); re(); } });
  }, "large operations");
}
