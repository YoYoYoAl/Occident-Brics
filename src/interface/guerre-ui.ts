// Interface : fiche du dirigeant (et succession), guerres en cours (score, but, paix), casus belli, expansion agressive par région.
import { type Camp, adversaire } from "../moteur/types";
import { type EtatPartie, nomPays } from "../moteur/partie";
import { ZONES } from "../moteur/zones";
import { APTITUDES, LISTE_APTITUDES, TRAITS_DIRIGEANT, aptitude, ageDe, choisirSuccesseur, type Dirigeant } from "../moteur/dirigeants";
import {
  CASUS_BELLI, AE, BUTS, TERMES, LISTE_ZONES, aeDe, changerBut, signerPaix, peutSignerPaix, fabriquerCasusBelli, peutFabriquer, termesPossibles, FABRIQUER,
  type ButGuerre, type TermePaix, type Intervention,
} from "../moteur/guerre";
import { date } from "../moteur/temps";

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
    <p class="note">Survole une aptitude ou un trait pour son effet. La popularité pèse sur la réélection ; la santé baisse avec l'âge. Noms fictifs.</p></details>`;
}

function jauge(v: number): string {
  return `<span class="g-jauge" title="Expansion agressive ${Math.round(v)} / 100 (seuils 25, 50, 75)"><i style="width:${v}%" class="${v >= 75 ? "rouge" : v >= 50 ? "orange" : v >= 25 ? "jaune" : ""}"></i><u style="left:25%"></u><u style="left:50%"></u><u style="left:75%"></u></span>`;
}
function ficheIntervention(e: EtatPartie, camp: Camp, it: Intervention): string {
  const score = Math.round(it.score ?? 0), dispo = termesPossibles(e, it), reste = it.fin - e.round;
  return `<article class="plan g-guerre" data-iso="${it.iso}"><header><strong>Intervention ${esc(nomPays(it.iso))}</strong><small>${it.cb ? `casus belli : ${CASUS_BELLI[it.cb].nom.toLowerCase()}` : "agression sans casus belli"} · ${reste > 0 ? `${reste} trimestre${reste > 1 ? "s" : ""} avant l'échéance` : "échéance"}</small></header>
    <div class="g-score"><span>−100</span><span class="g-axe"><i style="left:${50 + score / 2}%"></i></span><span>+100</span><b>${score > 0 ? "+" : ""}${score}</b></div>
    <div class="p-choix">But de guerre : ${(Object.keys(BUTS) as ButGuerre[]).map(b => `<button data-but="${b}" title="${esc(BUTS[b].aide)}" class="${it.but === b ? "actif" : ""}">${BUTS[b].nom} (${BUTS[b].cout})</button>`).join("")}</div>
    <p class="note">Le score monte avec ton avantage militaire dans le pays et la stratégie de ton dirigeant, baisse avec l'usure après 4 trimestres ; deux batailles décisives (duels) le font varier de ±30. À l'échéance, tes conseillers signent selon le but, ou c'est l'enlisement si le score est négatif.</p>
    <div class="g-termes">${(Object.keys(TERMES) as TermePaix[]).map(t => `<label><input type="checkbox" data-terme="${t}" ${TERMES[t].cout > dispo ? "disabled" : ""}> ${TERMES[t].nom} <small>${TERMES[t].cout}</small></label>`).join("")}</div>
    <div class="d-boutons"><button data-signer class="principal">Signer la paix (${dispo} points de score disponibles)</button></div></article>`;
}
// Guerres en cours, casus belli, expansion agressive des deux blocs par région, coalitions, dossier fabriqué.
export function panneauGuerre(e: EtatPartie, camp: Camp): string {
  const mes = e.interventions.filter(i => i.camp === camp) as Intervention[], adv = adversaire(camp);
  const cb = (e.casusBelli ?? []).filter(c => c.camp === camp && c.fin >= e.round).sort((a, b) => CASUS_BELLI[a.type].mult - CASUS_BELLI[b.type].mult);
  const coal = e.coalitions ?? [], cibles = Object.keys(e.pays).filter(i => !peutFabriquer(e, camp, i)).sort((a, b) => nomPays(a).localeCompare(nomPays(b), "fr"));
  return `<details class="agir g-bloc" ${mes.length ? "open" : ""}><summary>Guerre, casus belli et expansion agressive${mes.length ? ` · ${mes.length} intervention${mes.length > 1 ? "s" : ""}` : ""}</summary>
    ${mes.map(it => ficheIntervention(e, camp, it)).join("")}
    ${e.interventions.filter(i => i.camp === adv).map(i => `<p class="note">Le ${nomBloc(adv)} intervient ${esc(nomPays(i.iso))} (score de guerre caché).</p>`).join("")}
    <p><strong>Tes casus belli</strong> <span class="note">(une intervention justifiée coûte moins d'expansion agressive ; sans casus belli : ×${AE.agression} et capital politique −${AE.cpAgression})</span></p>
    ${cb.length ? `<ul class="g-cb">${cb.map(c => `<li><strong>${esc(nomPays(c.iso))}</strong> : ${CASUS_BELLI[c.type].nom} <small>×${String(CASUS_BELLI[c.type].mult).replace(".", ",")} · jusqu'en ${date(c.fin).annee} T${date(c.fin).trimestre}</small></li>`).join("")}</ul>` : `<p class="note">Aucun pour l'instant. Ils naissent des attentats, incidents, crises humanitaires, attaques contre tes alliés, d'une tension à 80 ou d'un dirigeant belliciste.</p>`}
    <div class="grille-actions"><span><select id="cbCible">${cibles.map(i => `<option value="${i}">${esc(nomPays(i))}</option>`).join("")}</select><button id="cbFabriquer" ${cibles.length ? "" : "disabled"}>Monter un dossier d'armes de destruction massive<small>${FABRIQUER.budget} budget · ${FABRIQUER.cp} capital politique · un par an · ${Math.round(FABRIQUER.risque * 100)} % de risque de scandale</small></button></span></div>
    <p><strong>Expansion agressive par région</strong> <span class="note">25 : tes actions d'influence −15 % · 50 : l'adversaire y gagne de l'influence · 75 : coalition contre toi. Baisse de ${AE.declinPaix} par trimestre sans intervention dans la région.</span></p>
    <table class="g-ae"><tr><th>Région</th><th>${nomBloc(camp)}</th><th>${nomBloc(adv)}</th></tr>${LISTE_ZONES.map(z => `<tr><td>${esc(ZONES[z].nom)}</td><td>${jauge(aeDe(e, camp, z))}</td><td>${jauge(aeDe(e, adv, z))}</td></tr>`).join("")}</table>
    ${coal.map(c => `<p class="alerte">Coalition contre le ${nomBloc(c.contre)} (${esc(ZONES[c.zone].nom)}) : ${c.membres.map(nomPays).map(esc).join(", ")}.</p>`).join("")}
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
  const btn = zone.querySelector<HTMLButtonElement>("#cbFabriquer");
  if (btn) btn.onclick = () => h.tenter(() => fabriquerCasusBelli(h.etat(), h.camp(), zone.querySelector<HTMLSelectElement>("#cbCible")!.value));
}
