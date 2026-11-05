// Campagne électorale (refonte, maquette 5) : 4 leviers, sondages projetés, fraude, puis coup d'État si le scrutin est perdu.
// Le moteur est dans src/moteur/campagnes.ts ; les formules sont une proposition à calibrer.
import { LEVIERS, LISTE_LEVIERS, CAMPAGNE, pointsCampagne, projection, reglerCampagne, peutReglerCampagne, trimestresAvantScrutin,
  conditionsCoup, peutTenterCoup, tenterCoup, type Levier } from "../moteur/campagnes";
import { libelle, nomPays, alignement, type EtatPartie } from "../moteur/partie";
import type { Camp } from "../moteur/types";
import { image } from "./images";
import type { Son } from "./sons";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nb = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const pc = (x: number) => x > 0.99 ? "plus de 99 %" : x < 0.01 && x > 0 ? "moins de 1 %" : `${Math.round(100 * x)} %`;
export interface HoteCampagne {
  etat: () => EtatPartie; camp: () => Camp; tenter: (f: () => EtatPartie, s?: Son) => void;
  ouvrir: (html: string, lier: (b: HTMLElement) => void, classe?: string) => void; fermer: () => void;
}
const campagnesDe = (e: EtatPartie, camp: Camp) => (e.plans ?? []).filter(p => p.camp === camp && p.campagne && !p.campagne.resultat);
const enPays = (iso: string) => `${/^[AEIOUÉ]/.test(nomPays(iso)) ? "en" : "au"} ${nomPays(iso)}`;

function barreSondage(x: number) {
  return `<div class="cp-sondage"><div><span>Ton candidat ${Math.round(x)} %</span><span>Candidat adverse ${100 - Math.round(x)} %</span></div><div class="cp-barre"><span style="width:${x}%"></span><i></i></div></div>`;
}
function blocCoup(e: EtatPartie, camp: Camp, iso: string): string {
  const k = conditionsCoup(e, camp, iso), err = peutTenterCoup(e, camp, iso);
  return `<div class="cp-coup"><strong>Coup d'État</strong><span>Proposé seulement au trimestre qui suit un scrutin perdu.</span>
    <ul>${k.lignes.map(l => `<li class="${l.ok ? "hausse" : "baisse"}">${l.ok ? "✓" : "✗"} ${esc(l.texte)}</li>`).join("")}</ul>
    <span>Chance de réussite : <strong>${pc(k.chance)}</strong> (stabilité du pays, intrigue de ton dirigeant).</span>
    <span>Réussi : régime ami (influence politique au moins 55, adverse au plus 20). Prix : expansion agressive +${CAMPAGNE.coup.ae} dans la région, capital politique −${CAMPAGNE.coup.cp}, tension.
      Échec : influence −${CAMPAGNE.coup.perte} partout dans le pays, capital politique −${CAMPAGNE.coup.cpEchec}.</span>
    <button data-coup="${iso}" class="danger" ${err ? `disabled title="${esc(err)}"` : ""}>Tenter le coup d'État</button>${err ? `<small class="erreur">${esc(err)}</small>` : ""}</div>`;
}
// Cartes de « Ce qui t'attend » : campagnes en cours et coup d'État possible.
export function blocCampagnesElectorales(e: EtatPartie, camp: Camp): string {
  const img = image("famille_election_rupture"), l = campagnesDe(e, camp), w = e.camps[camp].coup;
  let h = l.map(p => { const c = p.campagne!, n = trimestresAvantScrutin(e, c);
    return `<article class="cp-carte">${img ? `<img src="${img}" alt="">` : ""}<div><strong>Campagne : ${esc(c.nom)} ${enPays(p.cible)} (${c.annee})</strong>
      ${barreSondage(c.sondage)}<small>Scrutin ${n <= 1 ? "à la fin de ce trimestre" : `dans ${n} trimestres (${esc(libelle(c.scrutin))})`} · chance projetée ${pc(projection(e, p, c.leviers, c.fraude).chance)}${c.fraude ? " · <span class=\"baisse\">fraude prévue</span>" : ""}</small>
      <button data-diriger-campagne="${p.id}" class="principal">Diriger la campagne</button></div></article>`; }).join("");
  if (w && e.round <= w.fin) h += `<article class="cp-carte cp-sombre">${image("famille_coup_etat") ? `<img src="${image("famille_coup_etat")}" alt="">` : ""}<div><strong>Scrutin perdu ${enPays(w.iso)}</strong>${blocCoup(e, camp, w.iso)}</div></article>`;
  return h;
}

export function campagneHtml(e: EtatPartie, camp: Camp, id: string, l: Record<Levier, number>, fraude: boolean): string {
  const p = e.plans!.find(x => x.id === id)!, c = p.campagne!, pts = pointsCampagne(p), x = projection(e, p, l, fraude), t = LISTE_LEVIERS.reduce((s, k) => s + l[k], 0);
  const a = alignement(e, p.cible) * (camp === "OCC" ? 1 : -1), inf = e.pays[p.cible].influence;
  const err = peutReglerCampagne(e, camp, id, l), img = image("famille_election_rupture");
  return `<div class="cp">
  <header class="cp-tete" ${img ? `style="background-image:linear-gradient(90deg,rgba(20,12,12,.95),rgba(20,12,12,.55)),url(${img})"` : ""}>
    <span class="sc-sur">Campagne électorale</span><h2>${esc(c.nom[0].toUpperCase() + c.nom.slice(1))} ${enPays(p.cible)} · ${esc(libelle(c.scrutin))}</h2>
    <span>${esc(nomPays(p.cible))} penche ${a >= 0.05 ? "vers toi" : a <= -0.05 ? "vers l'adversaire" : "au centre"} (${a >= 0 ? "+" : "−"}${nb(Math.abs(a), 2)}) ; influence politique : toi ${Math.round(inf[camp].p)}, adversaire ${Math.round(inf[camp === "OCC" ? "CHN" : "OCC"].p)}. Départ des sondages : ${c.depart} %.</span>
    <div class="cp-etapes"><span class="fait">Lancement</span><span class="actif">Campagne : ${x.n} trimestre${x.n > 1 ? "s" : ""}</span><span>Soir d'élection</span></div></header>
  <div class="cp-corps">
    <section><div class="cp-titre"><strong>Ta campagne chaque trimestre</strong><span id="cpPoints" class="${t > pts ? "baisse" : "hausse"}">${nb(t)} / ${pts} points</span></div>
      <p class="note">Répartis jusqu'à ${pts} points (intensité de l'orientation). Chaque levier rapporte de moins en moins : mieux vaut en combiner plusieurs.</p>
      ${LISTE_LEVIERS.map(k => `<div class="cp-levier"><div><label for="cp_${k}">${esc(LEVIERS[k].nom)}</label><strong id="cpv_${k}">${nb(l[k])}</strong></div>
        <input id="cp_${k}" data-levier="${k}" type="range" min="0" max="${CAMPAGNE.maxLevier}" step="0.5" value="${l[k]}"><small>${esc(LEVIERS[k].texte)}</small></div>`).join("")}
    </section>
    <section><strong>Sondages projetés</strong><div id="cpProj">${barreSondage(x.sondage)}</div>
      <p class="note">Projection au soir du scrutin si tu gardes cette répartition. Sondage actuel : ${nb(c.sondage)} %.</p>
      <div class="cp-tuiles"><div><span>Chance de victoire</span><strong id="cpChance">${pc(x.chance)}</strong></div><div><span>Risque de scandale</span><strong id="cpScandale">${pc(x.scandale)}</strong></div>
        <div><span>Promesses à payer</span><strong id="cpDette">${nb(x.dette)}</strong><small>budget sur 1 an</small></div></div>
      <div class="cp-soir"><strong>Le soir d'élection</strong><span>Le scrutin additionne ton avance dans les sondages (un point d'écart pour 10 points de sondage), deux fois le penchant du pays et un hasard de ±1 : il faut un écart d'au moins 1.</span>
        <span class="hausse">Victoire : le vainqueur te doit sa victoire (influence politique +10, adverse −5), orientation réussie.</span>
        <span class="baisse">Défaite : orientation manquée ; un coup d'État devient possible le trimestre suivant.</span></div>
    </section>
    <section class="cp-ombre"><strong>Options sombres</strong>
      <label class="cp-fraude"><input type="checkbox" id="cpFraude" ${fraude ? "checked" : ""}> Truquer le scrutin</label>
      <span>Bourrage d'urnes, listes gonflées : <strong>+${CAMPAGNE.fraude} points</strong> le soir d'élection.</span>
      <span>Risque d'être démasqué : <strong>${pc(CAMPAGNE.risqueFraude)}</strong>. Alors : élection annulée pour toi, capital politique −10, influence politique −15, méfiance dans la région.</span>
      ${blocCoup(e, camp, p.cible)}
    </section>
  </div>
  <div class="actions-fenetre"><button id="cpAnnuler">Fermer</button><button id="cpValider" class="principal" ${err ? `disabled title="${esc(err)}"` : ""}>Valider la campagne</button></div></div>`;
}
export function ouvrirCampagne(h: HoteCampagne, id: string) {
  const e = h.etat(), camp = h.camp(), p = e.plans?.find(x => x.id === id); if (!p?.campagne) return;
  const l = { ...p.campagne.leviers }; let fraude = p.campagne.fraude;
  h.ouvrir(campagneHtml(e, camp, id, l, fraude), b => {
    const maj = () => { // sans redessiner : les curseurs restent sous la main
      const x = projection(e, p, l, fraude), t = LISTE_LEVIERS.reduce((s, k) => s + l[k], 0), pts = pointsCampagne(p), err = peutReglerCampagne(e, camp, id, l);
      const q = (s: string) => b.querySelector<HTMLElement>(s)!;
      q("#cpPoints").textContent = `${nb(t)} / ${pts} points`; q("#cpPoints").className = t > pts ? "baisse" : "hausse";
      for (const k of LISTE_LEVIERS) q(`#cpv_${k}`).textContent = nb(l[k]);
      q("#cpProj").innerHTML = barreSondage(x.sondage); q("#cpChance").textContent = pc(x.chance); q("#cpScandale").textContent = pc(x.scandale); q("#cpDette").textContent = nb(x.dette);
      const v = q("#cpValider") as HTMLButtonElement; v.disabled = !!err; v.title = err ?? "";
    };
    b.querySelectorAll<HTMLInputElement>("[data-levier]").forEach(i => i.oninput = () => { l[i.dataset.levier as Levier] = Number(i.value); maj(); });
    b.querySelector<HTMLInputElement>("#cpFraude")!.onchange = ev => { fraude = (ev.target as HTMLInputElement).checked; maj(); };
    b.querySelector<HTMLButtonElement>("#cpAnnuler")!.onclick = h.fermer;
    b.querySelector<HTMLButtonElement>("#cpValider")!.onclick = () => { h.tenter(() => reglerCampagne(h.etat(), camp, id, l, fraude), "action"); h.fermer(); };
    lierCoup(b, h);
  }, "large campagne");
}
export function lierCampagnes(zone: HTMLElement, h: HoteCampagne) {
  zone.querySelectorAll<HTMLButtonElement>("[data-diriger-campagne]").forEach(b => b.onclick = () => ouvrirCampagne(h, b.dataset.dirigerCampagne!));
  lierCoup(zone, h);
}
function lierCoup(zone: HTMLElement, h: HoteCampagne) {
  zone.querySelectorAll<HTMLButtonElement>("[data-coup]").forEach(b => b.onclick = () => { h.tenter(() => tenterCoup(h.etat(), h.camp(), b.dataset.coup!), "action"); h.fermer(); });
}
