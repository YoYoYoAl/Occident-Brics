// Interface : fiche du dirigeant (et succession), guerres en cours (score, but, paix), casus belli, expansion agressive par région.
import { type Camp, adversaire } from "../moteur/types";
import { type EtatPartie, nomPays } from "../moteur/partie";
import { ZONES } from "../moteur/zones";
import { APTITUDES, LISTE_APTITUDES, TRAITS_DIRIGEANT, aptitude, ageDe, choisirSuccesseur, type Dirigeant } from "../moteur/dirigeants";
import {
  CASUS_BELLI, AE, BUTS, TERMES, LISTE_ZONES, aeDe, changerBut, signerPaix, peutSignerPaix, fabriquerCasusBelli, peutFabriquer, termesPossibles, FABRIQUER,
  regionsDe, regionsCles, regionDe, controleur, coutTerme, nomTerme, rendreRegion, REGION, coalitionDe, mefiance, freinCoalition, peutApaiser, apaiser, COALITION, peutAnnexerRegion, annexerRegion, ANNEXION,
  type ButGuerre, type TermePaix, type Intervention,
} from "../moteur/guerre";
import { date } from "../moteur/temps";
import { NOMS_BIENS } from "../data/commerce";
import { NIVEAUX, ALLIANCE, niveauAlliance, alliesDe, peutSignerAlliance, signerAlliance, rompreAlliance } from "../moteur/alliances";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export interface HoteGuerre { etat: () => EtatPartie; camp: () => Camp; tenter: (f: () => EtatPartie) => void }
const nomBloc = (c: Camp) => c === "OCC" ? "bloc USA" : "bloc Chine";

function carteDirigeant(e: EtatPartie, camp: Camp, d: Dirigeant, complet: boolean): string {
  const apt = LISTE_APTITUDES.map(a => { const v = complet ? aptitude(e, camp, a) : d.aptitudes[a];
    return `<li title="${esc(APTITUDES[a].aide)}"><span>${APTITUDES[a].nom}</span><span class="g-barre"><i style="width:${10 * v}%"></i></span><b>${v}</b></li>`; }).join("");
  return `<div class="g-dirigeant"><div class="g-portrait" aria-hidden="true"></div><div>
    <strong>${esc(d.nom)}</strong><small>${complet ? `${ageDe(e, d)} ans · santé ${Math.round(d.sante)} · popularité ${Math.round(d.popularite)} · au pouvoir depuis ${date(d.depuis).annee}` : `${ageDe(e, d)} ans`}</small>
    <ul class="g-apt">${apt}</ul>
    <p class="g-traits">${d.traits.map(t => `<span title="${esc(TRAITS_DIRIGEANT[t].aide)}">${TRAITS_DIRIGEANT[t].nom}</span>`).join("")}</p></div></div>`;
}
// Fiche du dirigeant du joueur, aperçu du dirigeant adverse, choix du successeur s'il y a lieu.
export function panneauDirigeant(e: EtatPartie, camp: Camp): string {
  const moi = e.dirigeants?.[camp], lui = e.dirigeants?.[adversaire(camp)]; if (!moi || !lui) return "";
  const s = e.succession?.camp === camp ? e.succession : null;
  return `<details class="agir g-bloc" ${s ? "open" : ""}><summary>Dirigeants : ${esc(moi.nom)} face à ${esc(lui.nom)}</summary>
    ${s ? `<div class="alerte"><p><strong>Succession</strong> : choisis ton nouveau dirigeant avant la fin du trimestre (sinon le mieux noté reste en place).</p>
      <div class="g-candidats">${s.candidats.map((c, k) => `<button data-successeur="${k}" class="${c.nom === moi.nom ? "actif" : ""}">${carteDirigeant(e, camp, c, false)}</button>`).join("")}</div></div>` : ""}
    <div class="g-duo">${carteDirigeant(e, camp, moi, true)}${carteDirigeant(e, adversaire(camp), lui, false)}</div>
    <p class="note">Survole une aptitude ou un trait pour son effet. La popularité pèse sur la réélection ; la santé baisse avec l'âge et les maladies (affaibli sous 30). Noms fictifs.</p></details>`;
}

function jauge(v: number): string {
  return `<span class="g-jauge" title="Expansion agressive ${Math.round(v)} / 100 (seuils 25, 50, 75)"><i style="width:${v}%" class="${v >= 75 ? "rouge" : v >= 50 ? "orange" : v >= 25 ? "jaune" : ""}"></i><u style="left:25%"></u><u style="left:50%"></u><u style="left:75%"></u></span>`;
}
// Régions d'un pays : population, ressources, valeur stratégique, base, occupation ou contrôle.
export function tableauRegions(e: EtatPartie, iso: string, it?: Intervention): string {
  const l = it ? regionsDe(iso) : regionsCles(iso); if (!l) return "";
  return `<table class="g-regions"><tr><th>Région${regionsCles(iso) ? "" : " (découpage de guerre)"}</th><th>Pop.</th><th>Ressources</th><th>Strat.</th></tr>${l.map(r => { const occ = it?.occupees?.includes(r.id), ctl = controleur(e, iso, r.id);
    return `<tr class="${occ ? "occupee" : ""}"><td>${esc(r.nom)}${r.base ? `<small> · ${esc(r.base)}</small>` : ""}${occ ? `<small> · occupée</small>` : ""}${ctl ? `<small> · ${(e.controles ?? []).find(c => c.iso === iso && c.region === r.id)?.annexion ? "annexée" : "occupée"} par le ${nomBloc(ctl)}</small>` : ""}</td><td>${Math.round(100 * r.pop)} %</td><td>${r.ressources.map(b => NOMS_BIENS[b]).join(", ") || "–"}</td><td>${"★".repeat(r.strat) || "–"}</td></tr>`; }).join("")}</table>
    <p class="note">Découpage et parts de population : estimation.</p>`;
}
// Régions contrôlées par le joueur, avec la possibilité de les rendre.
export function blocControles(e: EtatPartie, camp: Camp): string {
  const l = (e.controles ?? []).filter(c => c.camp === camp); if (!l.length) return "";
  return `<p><strong>Régions que tu contrôles</strong> <span class="note">(une région occupée depuis 2 ans peut être annexée ; une région annexée compte pour ton bloc dans le score et ne se révolte pas ; recettes : ${REGION.budgetRessource} de budget par ressource et ${REGION.budgetStrat} par étoile chaque trimestre ; le pays s'agite ; révolte possible s'il penche vers l'adversaire)</span></p>
    <ul class="g-cb">${l.map(c => `<li><strong>${esc(regionDe(c.iso, c.region)?.nom ?? c.region)}</strong> (${esc(nomPays(c.iso))}, ${c.annexion ? "annexée" : "occupée"}) ${c.annexion ? "" : (() => { const err = peutAnnexerRegion(e, camp, c.iso, c.region); return `<button data-annexer="${c.iso}:${c.region}" ${err ? `disabled title="${esc(err)}"` : ""}>Annexer (${ANNEXION.cp} capital politique)</button>`; })()}<button data-rendre="${c.iso}:${c.region}">Rendre la région</button></li>`).join("")}</ul>`;
}
export function ficheIntervention(e: EtatPartie, camp: Camp, it: Intervention): string {
  const score = Math.round(it.score ?? 0), dispo = termesPossibles(e, it), reste = it.fin - e.round;
  return `<article class="plan g-guerre" data-iso="${it.iso}"><header><strong>Intervention ${esc(nomPays(it.iso))}</strong><small>${it.cb ? `casus belli : ${CASUS_BELLI[it.cb].nom.toLowerCase()}` : "agression sans casus belli"} · ${reste > 0 ? `${reste} trimestre${reste > 1 ? "s" : ""} avant l'échéance` : "échéance"}</small></header>
    <div class="g-score"><span>−100</span><span class="g-axe"><i style="left:${50 + score / 2}%"></i></span><span>+100</span><b>${score > 0 ? "+" : ""}${score}</b></div>
    <div class="p-choix">But de guerre : ${(Object.keys(BUTS) as ButGuerre[]).map(b => `<button data-but="${b}" title="${esc(BUTS[b].aide)}" class="${it.but === b ? "actif" : ""}">${BUTS[b].nom} (${BUTS[b].cout})</button>`).join("")}</div>
    <p class="note">Le score monte avec ton avantage militaire dans le pays et la stratégie de ton dirigeant, baisse avec l'usure après 4 trimestres ; deux batailles décisives (duels) le font varier de ±30. À l'échéance, tes conseillers signent selon le but, ou c'est l'enlisement si le score est négatif.</p>
    ${tableauRegions(e, it.iso, it)}
    <div class="g-termes">${[...Object.keys(TERMES) as TermePaix[], ...(it.occupees ?? []).flatMap(id => [`region:${id}`, `annexe:${id}`] as TermePaix[])].map(t => `<label><input type="checkbox" data-terme="${t}" ${coutTerme(t, it.iso) > dispo ? "disabled" : ""}> ${esc(nomTerme(t, it.iso))} <small>${coutTerme(t, it.iso)}</small></label>`).join("")}</div>
    <div class="d-boutons"><button data-signer class="principal">Signer la paix (${dispo} points de score disponibles)</button></div></article>`;
}
// Coalition contre un camp : membres, chef, frein, méfiance des pays proches d'adhérer (apaiser possible pour le camp visé).
function blocCoalition(e: EtatPartie, moi: Camp, contre: Camp): string {
  const co = coalitionDe(e, contre), m = (i: string) => mefiance(e, contre, i);
  const proches = Object.keys(e.pays).filter(i => !co?.membres.includes(i)).map(i => [i, m(i)] as const).filter(([, v]) => v >= COALITION.depart).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!co && !proches.length) return moi === contre ? `<p class="note">Aucune coalition contre toi : aucun pays n'atteint ${COALITION.depart} de méfiance.</p>` : "";
  const ligne = (i: string, v: number) => `<li><strong>${esc(nomPays(i))}</strong> <span class="g-jauge g-mini"><i style="width:${v}%" class="${v >= COALITION.adhesion ? "rouge" : "orange"}"></i></span> ${Math.round(v)}${moi === contre ? ` <button data-apaiser="${i}" ${peutApaiser(e, moi, i) ? `disabled title="${esc(peutApaiser(e, moi, i)!)}"` : ""}>Apaiser</button>` : ""}</li>`;
  return `<div class="${moi === contre && co ? "alerte" : ""}"><p><strong>${co ? `Coalition contre ${moi === contre ? "toi" : `le ${nomBloc(contre)}`}` : `Méfiance envers ${moi === contre ? "toi" : `le ${nomBloc(contre)}`}`}</strong>${co ? ` : ${co.membres.length} membres, menée par ${esc(nomPays(co.chef ?? co.membres[0]))} ; actions et plans chez eux −${Math.round(100 * freinCoalition(co))} %${co.membres.length >= COALITION.commerceDes ? ", échanges en recul" : ""}` : ""}</p>
    ${co ? `<ul class="g-cb">${co.membres.map(i => ligne(i, m(i))).join("")}</ul>` : ""}
    ${proches.length ? `<p class="note">Proches d'adhérer (adhésion à ${COALITION.adhesion}, départ sous ${COALITION.depart}) :</p><ul class="g-cb">${proches.map(([i, v]) => ligne(i, v)).join("")}</ul>` : ""}
    ${moi === contre ? `<p class="note">Apaiser : ${COALITION.apaiser.budget} budget, ${COALITION.apaiser.cp} capital politique, une fois par pays et par an ; méfiance −${COALITION.apaiser.gain}.</p>` : ""}</div>`;
}
const NOMS_NIVEAUX = ["", NIVEAUX[1].nom, NIVEAUX[2].nom, NIVEAUX[3].nom];
function blocAlliances(e: EtatPartie, camp: Camp): string {
  const l = alliesDe(e, camp).map(i => [i, niveauAlliance(e, camp, i)] as const).sort((a, b) => b[1] - a[1]);
  return `<p><strong>Tes alliances</strong> <span class="note">(signe-les depuis la fiche d'un pays)</span></p>${l.length ? `<ul class="g-cb">${l.map(([i, n]) => `<li><strong>${esc(nomPays(i))}</strong> : ${NOMS_NIVEAUX[n]} <button data-rompre="${i}">Rompre</button></li>`).join("")}</ul>` : `<p class="note">Aucune.</p>`}`;
}
// Fiche d'un pays : niveau d'alliance, signature du niveau suivant, rupture.
export function blocAlliancePays(e: EtatPartie, camp: Camp, iso: string): string {
  if (iso === "USA" || iso === "CHN") return "";
  const n = niveauAlliance(e, camp, iso), na = niveauAlliance(e, adversaire(camp), iso), m = mefiance(e, camp, iso);
  const bouton = (k: 1 | 3) => { const err = peutSignerAlliance(e, camp, iso, k); return `<button data-allier="${iso}:${k}" ${err ? `disabled title="${esc(err)}"` : ""}>${NIVEAUX[k].nom}<small>${NIVEAUX[k].budget} budget · ${NIVEAUX[k].cp} capital politique · ${esc(NIVEAUX[k].aide)}</small></button>`; };
  return `<details class="qualificatifs" ${n ? "open" : ""}><summary>Alliance : ${n ? NOMS_NIVEAUX[n] : na ? `allié du ${nomBloc(adversaire(camp))} (${NOMS_NIVEAUX[na]})` : "aucune"}</summary>
    <p class="note">Méfiance envers toi : ${Math.round(m)} / 100 (coalition à ${COALITION.adhesion}). Niveaux : 1 partenariat (penche vers toi 0,20), 2 garantie de défense (0,40, action militaire « garantie »), 3 alliance intégrée (0,60, après la garantie).</p>
    <div class="grille-actions">${n < 1 ? bouton(1) : ""}${n === 2 ? bouton(3) : ""}${n ? `<button data-rompre="${iso}">Rompre l'alliance<small>capital politique −${ALLIANCE.rupture}, rancune, confiance de tes alliés −1</small></button>` : ""}</div></details>`;
}
// Guerres en cours, casus belli, expansion agressive des deux blocs par région, coalitions, dossier fabriqué.
export function panneauGuerre(e: EtatPartie, camp: Camp): string {
  const mes = e.interventions.filter(i => i.camp === camp) as Intervention[], adv = adversaire(camp);
  const cb = (e.casusBelli ?? []).filter(c => c.camp === camp && c.fin >= e.round).sort((a, b) => CASUS_BELLI[a.type].mult - CASUS_BELLI[b.type].mult);
  const cibles = Object.keys(e.pays).filter(i => !peutFabriquer(e, camp, i)).sort((a, b) => nomPays(a).localeCompare(nomPays(b), "fr"));
  return `<details class="agir g-bloc" ${mes.length ? "open" : ""}><summary>Guerre, alliances, coalitions et expansion agressive${mes.length ? ` · ${mes.length} intervention${mes.length > 1 ? "s" : ""}` : ""}</summary>
    ${mes.map(it => ficheIntervention(e, camp, it)).join("")}
    ${blocControles(e, camp)}
    ${e.interventions.filter(i => i.camp === adv).map(i => `<p class="note">Le ${nomBloc(adv)} intervient ${esc(nomPays(i.iso))} (score de guerre caché).</p>`).join("")}
    <p><strong>Tes casus belli</strong> <span class="note">(une intervention justifiée coûte moins d'expansion agressive ; sans casus belli : ×${AE.agression} et capital politique −${AE.cpAgression})</span></p>
    ${cb.length ? `<ul class="g-cb">${cb.map(c => `<li><strong>${esc(nomPays(c.iso))}</strong> : ${CASUS_BELLI[c.type].nom} <small>×${String(CASUS_BELLI[c.type].mult).replace(".", ",")} · jusqu'en ${date(c.fin).annee} T${date(c.fin).trimestre}</small></li>`).join("")}</ul>` : `<p class="note">Aucun pour l'instant. Ils naissent des attentats, incidents, crises humanitaires, attaques contre tes alliés, d'une tension à 80 ou d'un dirigeant belliciste.</p>`}
    <div class="grille-actions"><span><select id="cbCible">${cibles.map(i => `<option value="${i}">${esc(nomPays(i))}</option>`).join("")}</select><button id="cbFabriquer" ${cibles.length ? "" : "disabled"}>Monter un dossier d'armes de destruction massive<small>${FABRIQUER.budget} budget · ${FABRIQUER.cp} capital politique · un par an · ${Math.round(FABRIQUER.risque * 100)} % de risque de scandale</small></button></span></div>
    <p><strong>Expansion agressive par région</strong> <span class="note">25 : tes actions d'influence −15 % · 50 : l'adversaire y gagne de l'influence ; elle nourrit la méfiance de chaque pays de la région. Baisse de ${AE.declinPaix} par trimestre sans intervention dans la région.</span></p>
    <table class="g-ae"><tr><th>Région</th><th>${nomBloc(camp)}</th><th>${nomBloc(adv)}</th></tr>${LISTE_ZONES.map(z => `<tr><td>${esc(ZONES[z].nom)}</td><td>${jauge(aeDe(e, camp, z))}</td><td>${jauge(aeDe(e, adv, z))}</td></tr>`).join("")}</table>
    ${blocCoalition(e, camp, camp)}${blocCoalition(e, camp, adv)}
    ${blocAlliances(e, camp)}
  </details>`;
}
export function lierGuerre(zone: HTMLElement, h: HoteGuerre) {
  zone.querySelectorAll<HTMLButtonElement>("[data-successeur]").forEach(b => b.onclick = () => h.tenter(() => choisirSuccesseur(h.etat(), h.camp(), +b.dataset.successeur!)));
  zone.querySelectorAll<HTMLElement>(".g-guerre").forEach(art => {
    const iso = art.dataset.iso!;
    art.querySelectorAll<HTMLButtonElement>("[data-but]").forEach(b => b.onclick = () => h.tenter(() => changerBut(h.etat(), h.camp(), iso, b.dataset.but as ButGuerre)));
    const termes = () => Array.from(art.querySelectorAll<HTMLInputElement>("[data-terme]:checked")).map(x => x.dataset.terme as TermePaix);
    const signer = art.querySelector<HTMLButtonElement>("[data-signer]")!;
    const maj = () => { const err = peutSignerPaix(h.etat(), h.camp(), iso, termes()); signer.disabled = !!err; signer.title = err ?? ""; };
    art.querySelectorAll<HTMLInputElement>("[data-terme]").forEach(x => x.onchange = maj); maj();
    signer.onclick = () => h.tenter(() => signerPaix(h.etat(), h.camp(), iso, termes()));
  });
  zone.querySelectorAll<HTMLButtonElement>("[data-annexer]").forEach(b => b.onclick = () => { const [iso, id] = b.dataset.annexer!.split(":"); h.tenter(() => annexerRegion(h.etat(), h.camp(), iso, id)); });
  zone.querySelectorAll<HTMLButtonElement>("[data-rendre]").forEach(b => b.onclick = () => { const [iso, id] = b.dataset.rendre!.split(":"); h.tenter(() => rendreRegion(h.etat(), h.camp(), iso, id)); });
  zone.querySelectorAll<HTMLButtonElement>("[data-apaiser]").forEach(b => b.onclick = () => h.tenter(() => apaiser(h.etat(), h.camp(), b.dataset.apaiser!)));
  zone.querySelectorAll<HTMLButtonElement>("[data-allier]").forEach(b => b.onclick = () => { const [iso, k] = b.dataset.allier!.split(":"); h.tenter(() => signerAlliance(h.etat(), h.camp(), iso, +k as 1 | 3)); });
  zone.querySelectorAll<HTMLButtonElement>("[data-rompre]").forEach(b => b.onclick = () => { if (confirm(`Rompre l'alliance avec ${nomPays(b.dataset.rompre!)} ?`)) h.tenter(() => rompreAlliance(h.etat(), h.camp(), b.dataset.rompre!)); });
  const btn = zone.querySelector<HTMLButtonElement>("#cbFabriquer");
  if (btn) btn.onclick = () => h.tenter(() => fabriquerCasusBelli(h.etat(), h.camp(), zone.querySelector<HTMLSelectElement>("#cbCible")!.value));
}
