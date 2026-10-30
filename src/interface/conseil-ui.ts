// Salle du conseil (refonte de l'interface, maquette 2) : le dirigeant et ses six conseillers, les orientations de chaque conseil,
// la cible choisie sur une carte colorée selon l'impact ou dans une liste (favoris épinglés, opportunités d'abord, filtre par les premières lettres),
// la durée, l'intensité, le coût et le gain estimés, la case « reconduire », puis le programme (5 orientations au plus).
// Aussi : la fenêtre de bilan d'une orientation terminée (maquette 4). Le moteur reste dans src/moteur/plans.ts.
import {
  CONSEILS, LISTE_CONSEILS, TRAITS, OBJECTIFS, LISTE_OBJECTIFS, DUREES, NOMS_INTENSITE, PLANS, ciblesPossibles, plansDe, coutPlan, chefDe, planRival,
  peutLancerPlan, lancerPlan, abandonnerPlan, remplacerChef, vitesse, iaPlans, titrePlan, nomCible, paysDuPlan, seanceOuverte, peutConvoquer, convoquerConseil,
  basculerReconduite, impactCible, gainEstime, type ObjectifPlan, type Intensite, type Conseil, type BilanPlan,
} from "../moteur/plans";
import { TRAITS_DIRIGEANT } from "../moteur/dirigeants";
import { conseillerDe, choisirConseiller, type Conseiller } from "../moteur/pouvoir";
import { portraitSvg, visageDirigeant } from "./portraits";
import { DUELS } from "../duels/catalogue";
import { alignement, budgetTrimestre, libelle, nomPays, type EtatPartie } from "../moteur/partie";
import { date } from "../moteur/temps";
import type { Camp } from "../moteur/types";
import { tracesPays } from "./carte";
import { image } from "./images";
import type { Son } from "./sons";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nb = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const sg = (x: number, d = 1) => (x >= 0 ? "+" : "−") + nb(Math.abs(x), d);
export const NOM_DUREE: Record<number, string> = { 4: "1 an", 6: "18 mois", 8: "2 ans", 12: "3 ans" };
const NOM_CANAL: Record<string, string> = { e: "économique", p: "politique", m: "militaire", c: "culturelle" };
const IMG_CONSEIL: Record<Conseil, string> = { international: "diplomate", economie: "economiste", militaire: "militaire", politique: "renseignement", infrastructures: "climat", culture: "opinion" };
// Échelle d'impact (5 crans, du plus faible au plus fort) ; gris : cible impossible.
export const ECHELLE = ["#1f3b52", "#2c6e8a", "#3fa39a", "#9bd27a", "#ffe066"], IMPOSSIBLE = "#3a4048";
const NOMS_CRANS = ["très faible", "faible", "moyen", "fort", "très fort"];

export interface HoteConseil {
  etat: () => EtatPartie; camp: () => Camp;
  tenter: (f: () => EtatPartie, s?: Son) => void; // applique et rafraîchit le jeu
  ouvrir: (html: string, lier: (b: HTMLElement) => void, classe?: string) => void; fermer: () => void;
  idsJeu: Map<string, string>; apres?: () => void; // à la clôture de la séance
}
// Choix en cours dans la salle (gardés entre deux affichages).
const sc: { conseil: Conseil; o: ObjectifPlan; cible: string; duree: number; intensite: Intensite; reconduire: boolean; filtre: string } =
  { conseil: "economie", o: "commerce", cible: "", duree: 8, intensite: 2, reconduire: false, filtre: "" };

// Favoris : pays épinglés en haut de la liste (mémorisés dans ce navigateur).
const CLE_FAVORIS = "occident-brics-favoris";
let favoris: string[] = (() => { try { return JSON.parse(localStorage.getItem(CLE_FAVORIS) ?? "[]"); } catch { return []; } })();
function epingler(id: string) {
  favoris = favoris.includes(id) ? favoris.filter(x => x !== id) : [...favoris, id];
  try { localStorage.setItem(CLE_FAVORIS, JSON.stringify(favoris)); } catch { /* stockage indisponible */ }
}
// Recherche par les premières lettres, sans tenir compte des accents ni de la casse (aussi au début de chaque mot).
export const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const correspond = (nom: string, filtre: string) => { const f = sansAccent(filtre.trim()); return !f || sansAccent(nom).split(/[\s'’-]+/).some(m => m.startsWith(f)) || sansAccent(nom).startsWith(f); };

// Cibles possibles classées par impact, avec leur cran (0 à 4) : rang dans la liste, en quintiles.
export function ciblesClassees(e: EtatPartie, camp: Camp, o: ObjectifPlan) {
  const l = ciblesPossibles(e, camp, o).map(x => ({ ...x, v: impactCible(e, camp, o, x.id) })).sort((a, b) => b.v - a.v);
  return l.map((x, k) => ({ ...x, cran: l.length < 2 ? 4 : 4 - Math.min(4, Math.floor(5 * k / l.length)) }));
}
// Cible (zone, théâtre, détroit…) qui contient un pays, pour le clic sur la carte.
const cibleDuPays = (o: ObjectifPlan, iso: string, ids: string[]) => OBJECTIFS[o].cible === "pays" ? (ids.includes(iso) ? iso : null) : ids.find(id => paysDuPlan({ objectif: o, cible: id }).includes(iso)) ?? null;

function silhouette(couleur: string) {
  return `<svg viewBox="0 0 90 100" aria-hidden="true"><circle cx="45" cy="34" r="20" fill="${couleur}"/><path d="M8 100 C10 70 25 60 45 60 C65 60 80 70 82 100 Z" fill="${couleur}"/></svg>`;
}

function carteImpact(e: EtatPartie, camp: Camp, h: HoteConseil, l: ReturnType<typeof ciblesClassees>): string {
  const t = tracesPays(h.idsJeu), def = OBJECTIFS[sc.o], cranDe = new Map<string, number>();
  if (def.cible !== "rival" && def.cible !== "strat") for (const x of l) for (const i of def.cible === "pays" ? [x.id] : paysDuPlan({ objectif: sc.o, cible: x.id })) if (!cranDe.has(i)) cranDe.set(i, x.cran);
  const choisis = new Set(sc.cible ? (def.cible === "pays" ? [sc.cible] : paysDuPlan({ objectif: sc.o, cible: sc.cible })) : []);
  const paths = t.pays.map(p => { const k = cranDe.get(p.iso), ch = choisis.has(p.iso);
    return `<path d="${p.d}" fill="${k === undefined ? IMPOSSIBLE : ECHELLE[k]}" ${p.iso ? `data-iso="${p.iso}"` : ""} class="${k !== undefined ? "possible" : ""} ${ch ? "choisi" : ""}"/>`; }).join("");
  return `<svg class="sc-carte" viewBox="0 0 ${t.largeur} ${t.hauteur}" role="img" aria-label="Carte du monde colorée selon l'impact de l'orientation">${paths}</svg>`;
}

function ligneCible(x: { id: string; nom: string; cran: number }, e: EtatPartie, camp: Camp): string {
  const iso = OBJECTIFS[sc.o].cible === "pays" ? x.id : "", a = iso ? alignement(e, iso) * (camp === "OCC" ? 1 : -1) : null;
  return `<div class="sc-ligne ${x.id === sc.cible ? "actif" : ""}"><button data-cible="${esc(x.id)}"><span class="sc-pastille" style="background:${ECHELLE[x.cran]}"></span>
    <span class="sc-nom">${esc(x.nom)}</span><span class="sc-info">impact ${NOMS_CRANS[x.cran]}${a !== null ? ` · ${a >= 0.05 ? "penche vers toi" : a <= -0.05 ? "penche vers l'adversaire" : "neutre"} (${sg(a, 2)})` : ""}</span></button>
    <button data-epingler="${esc(x.id)}" class="sc-etoile ${favoris.includes(x.id) ? "actif" : ""}" aria-label="${favoris.includes(x.id) ? "Retirer des favoris" : "Épingler en favori"}" title="Favori">★</button></div>`;
}
export function listeCibles(e: EtatPartie, camp: Camp, l: ReturnType<typeof ciblesClassees>): string {
  const f = l.filter(x => correspond(x.nom, sc.filtre)), fav = f.filter(x => favoris.includes(x.id));
  const opp = sc.filtre ? [] : f.filter(x => !favoris.includes(x.id)).slice(0, 6), reste = f.filter(x => !fav.includes(x) && !opp.includes(x)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const bloc = (t: string, m: typeof l) => m.length ? `<div class="sc-section">${t}</div>${m.map(x => ligneCible(x, e, camp)).join("")}` : "";
  return bloc("★ Favoris", fav) + bloc("Meilleures opportunités", opp) + bloc(sc.filtre ? "Résultats" : "Toutes les cibles (A à Z)", reste) || `<p class="note">Aucune cible ne commence par « ${esc(sc.filtre)} ».</p>`;
}

export function salleHtml(e: EtatPartie, camp: Camp, h: HoteConseil): string {
  const c = e.camps[camp], mes = plansDe(e, camp), d = e.dirigeants?.[camp], ouverte = seanceOuverte(e, camp), libre = ouverte || c.ajustement !== e.round;
  const objs = LISTE_OBJECTIFS.filter(o => OBJECTIFS[o].conseil === sc.conseil);
  if (!objs.includes(sc.o)) sc.o = objs[0];
  const l = ciblesClassees(e, camp, sc.o), def = OBJECTIFS[sc.o];
  if (!l.some(x => x.id === sc.cible)) sc.cible = l.length === 1 ? l[0].id : "";
  const err = !sc.cible ? (l.length ? "Choisis une cible sur la carte ou dans la liste." : "Aucune cible possible pour cette orientation en ce moment.") : peutLancerPlan(e, camp, sc.o, sc.cible, sc.duree, sc.intensite);
  const cout = coutPlan(e, { objectif: sc.o, intensite: sc.intensite, camp }), gain = sc.cible ? gainEstime(e, camp, sc.o, sc.cible, sc.duree, sc.intensite) : 0;
  const coutProg = mes.reduce((a, p) => a + coutPlan(e, p), 0), revenu = budgetTrimestre(e, camp), conv = peutConvoquer(e, camp);
  const mois = ["janvier", "avril", "juillet", "octobre"][date(e.round).trimestre - 1];
  const etatSeance = date(e.round).trimestre === 1 ? `Séance annuelle de ${mois} ${date(e.round).annee} : tout est libre.`
    : ouverte ? `Séance convoquée en ${mois} ${date(e.round).annee} : tout est libre ce trimestre.`
    : libre ? `Hors séance : un seul changement ce trimestre${conv ? "" : ", ou convoque le conseil (une fois par an)"}.` : "Changement du trimestre déjà fait : prochaine séance au 1er trimestre.";
  const trait = (t: string) => TRAITS_DIRIGEANT[t as keyof typeof TRAITS_DIRIGEANT]?.nom ?? t;
  return `<div class="sc">
  <header class="sc-tete">
    <div class="sc-titre"><span class="sc-sur">Salle du conseil</span><strong>${esc(libelle(e.round))}</strong><span class="note">${etatSeance} Choisis un conseiller, puis une orientation et sa cible. Au plus ${PLANS.max} orientations.</span>
      ${!ouverte && !conv ? `<button id="scConvoquer" class="principal">Convoquer le conseil (1 fois par an)</button>` : ""}</div>
    <div class="sc-dirigeant">${d ? visageDirigeant(d) : silhouette("#6b5420")}<div><strong>${esc(d?.nom ?? "Le dirigeant")}</strong><span>${d ? d.traits.map(trait).join(" · ") + ` · popularité ${nb(d.popularite, 0)}` : ""}</span></div></div>
    <div class="sc-conseillers">${LISTE_CONSEILS.map(cs => { const t = chefDe(e, camp, cs), n = mes.filter(p => OBJECTIFS[p.objectif].conseil === cs).length, k = conseillerDe(e, camp, cs);
      return `<div class="sc-conseiller ${cs === sc.conseil ? "actif" : ""}"><button data-conseil="${cs}" title="${esc(CONSEILS[cs].texte)}">${visage(k, cs)}
        <strong>${esc(CONSEILS[cs].nom)}</strong>${k ? `<em>${esc(k.nom)}</em>` : ""}<span title="${esc(TRAITS[t].texte)}">${TRAITS[t].nom}${n ? ` · ${n} en cours` : ""}</span></button>
        ${date(e.round).trimestre === 1 ? `<button data-chef="${cs}" class="sc-chef" title="2 CP : un nouveau chef, au trait tiré au hasard">Remplacer</button>` : ""}</div>`; }).join("")}</div>
  </header>
  ${camp === e.joueur && e.pouvoir?.recrutement?.length ? `<div class="sc-recrutement"><strong>Sièges à pourvoir après le changement de dirigeant</strong><span class="note">Le premier candidat est installé d'office ; tu peux en choisir un autre.</span>
    ${e.pouvoir.recrutement.map(r => `<div class="sc-siege"><span>${esc(CONSEILS[r.conseil].nom)}</span>${r.candidats.map((x, k) => `<button data-recruter="${r.conseil}:${k}" class="${conseillerDe(e, camp, r.conseil)?.nom === x.nom ? "actif" : ""}">${portraitSvg(x.portrait, r.conseil === "militaire")}<strong>${esc(x.nom)}</strong><small>${TRAITS[x.trait].nom}</small></button>`).join("")}</div>`).join("")}</div>` : ""}
  <div class="sc-corps">
    <section class="sc-gauche">
      <div class="sc-legende"><strong>${esc(def.nom)}</strong><span>Impact estimé :</span>${ECHELLE.map(x => `<i style="background:${x}"></i>`).join("")}<span>fort</span><i style="background:${IMPOSSIBLE}"></i><span>impossible</span></div>
      ${def.cible === "rival" || def.cible === "strat" ? `<p class="note sc-sans-carte">${def.cible === "rival" ? "Pas de carte : cette orientation vise directement le rival." : "Choisis la zone stratégique dans la liste."}</p>` : carteImpact(e, camp, h, l)}
      <div class="sc-survol" id="scSurvol"><span class="note">Survole un pays pour voir l'impact ; clique pour le choisir.</span></div>
    </section>
    <section class="sc-droite">
      <div class="sc-orientations"><span class="sc-sur">Orientation · ${esc(CONSEILS[sc.conseil].nom)}</span>
        <div class="sc-choix">${objs.map(o => `<button data-objectif="${o}" class="${o === sc.o ? "actif" : ""}">${esc(OBJECTIFS[o].nom)}</button>`).join("")}</div>
        <p class="note">${esc(def.texte)}${def.secret ? " Opération secrète : risque de scandale." : ""}${def.conteste ? " Cible disputée : duel dès le premier jalon." : ""}</p></div>
      ${def.cible !== "rival" ? `<label class="sc-sur" for="scFiltre">Cible : clique sur la carte, ou tape les premières lettres</label>
        <input id="scFiltre" value="${esc(sc.filtre)}" placeholder="${sc.cible ? esc(l.find(x => x.id === sc.cible)?.nom ?? "") : "ex. : bré, nig, asie…"}" autocomplete="off">
        <div class="sc-liste" id="scListe">${listeCibles(e, camp, l)}</div>` : `<p>Cible : <strong>${esc(l[0]?.nom ?? "")}</strong></p>`}
      <div class="sc-reglages"><div><span class="sc-sur">Durée</span><div class="sc-choix">${DUREES.map(x => `<button data-duree="${x}" class="${x === sc.duree ? "actif" : ""}">${NOM_DUREE[x]}</button>`).join("")}</div></div>
        <div><span class="sc-sur">Intensité</span><div class="sc-choix">${([1, 2, 3] as Intensite[]).map(i => `<button data-intensite="${i}" class="${i === sc.intensite ? "actif" : ""}" title="${i === 3 ? "Visible par l'adversaire dès le lancement" : i === 1 ? "Plus lent, moins cher, rarement repéré" : "Repéré au premier jalon"}">${NOMS_INTENSITE[i]}</button>`).join("")}</div></div></div>
      <div class="sc-chiffres">
        <div><span>Budget / trimestre</span><strong>${nb(cout)}</strong><small>${nb(cout * sc.duree)} sur ${NOM_DUREE[sc.duree]}</small></div>
        <div><span>Influence gagnée</span><strong>${def.canal && sc.cible ? `≈ +${nb(gain, 0)}` : "—"}</strong><small>${def.canal && !sc.cible ? "choisis une cible" : def.canal ? `${NOM_CANAL[def.canal]}${def.cible === "pays" ? "" : " par pays"}, hors duels` : "effet hors influence"}</small></div>
        <div><span>Duels possibles</span><small>${def.duels.map(x => esc(DUELS[x].nom)).join(", ")}</small></div>
        <p><strong>À l'arrivée :</strong> ${esc(def.recompense)} <span class="note">Valeurs pour une intensité normale : ×0,5 en discret, ×1,5 en massif, puis de ×0,5 à ×1,5 selon les duels.</span></p>
      </div>
      <div class="sc-valider"><label><input type="checkbox" id="scReconduire" ${sc.reconduire ? "checked" : ""}> Reconduire à la fin</label>
        <button id="scAjouter" class="principal" ${err ? `disabled title="${esc(err)}"` : ""}>Ajouter au programme</button></div>
      ${err && sc.cible ? `<small class="erreur">${esc(err)}</small>` : ""}
    </section>
  </div>
  <footer class="sc-programme"><strong>Programme ${mes.length}/${PLANS.max}</strong>
    ${mes.length ? mes.map(p => `<span class="sc-plan"><strong>${esc(OBJECTIFS[p.objectif].nom)}</strong><span>${esc(nomCible(p))} · ${nb(p.progres, 0)} % · ${NOM_DUREE[p.duree] ?? p.duree + " trim."}${planRival(e, p) ? " · disputée" : ""}</span>
      <span class="sc-plan-boutons"><button data-reconduire="${p.id}" class="${p.reconduire ? "actif" : ""}" title="Reconduire à l'arrivée">↻ ${p.reconduire ? "reconduite" : "s'arrête"}</button>
      <button data-abandon="${p.id}" ${libre ? "" : "disabled"} title="${p.progres >= 50 ? "Plus de la moitié : tu gardes la moitié de la récompense." : "Avant la moitié, l'effort est perdu."}">✕</button></span></span>`).join("")
      : `<span class="note">Aucune orientation.</span>${ouverte ? ` <button id="scProposer">Laisser mes conseillers proposer</button>` : ""}`}
    <span class="sc-total">Coût : <strong>${nb(coutProg)}</strong> budget / trimestre sur ${nb(revenu)} versés</span>
    <button id="scClore" class="principal">Clore la séance</button></footer>
</div>`;
}

// Portrait d'un conseiller : illustré pour les 6 premiers du joueur, généré ensuite (jamais deux fois le même).
function visage(k: Conseiller | null, cs: Conseil): string {
  const img = k?.illustre ? image(k.illustre) : k && k.portrait <= 12 ? image(`conseiller_${IMG_CONSEIL[cs]}`) : undefined;
  return img ? `<img src="${img}" alt="">` : k ? portraitSvg(k.portrait, cs === "militaire") : silhouette("#3a4b5a");
}
export function ouvrirConseil(h: HoteConseil) {
  const e = h.etat(), camp = h.camp();
  h.ouvrir(salleHtml(e, camp, h), b => lierSalle(b, h), "large");
}
function lierSalle(b: HTMLElement, h: HoteConseil) {
  const re = () => { const y = b.querySelector(".sc-liste")?.scrollTop ?? 0; ouvrirConseil(h); const l = document.querySelector(".sc-liste"); if (l) l.scrollTop = y; };
  const agir = (f: () => EtatPartie, s?: Son) => { h.tenter(f, s); re(); };
  const e = () => h.etat(), camp = () => h.camp();
  b.querySelectorAll<HTMLButtonElement>("[data-conseil]").forEach(x => x.onclick = () => { sc.conseil = x.dataset.conseil as Conseil; sc.cible = ""; sc.filtre = ""; re(); });
  b.querySelectorAll<HTMLButtonElement>("[data-objectif]").forEach(x => x.onclick = () => { sc.o = x.dataset.objectif as ObjectifPlan; sc.cible = ""; sc.filtre = ""; re(); });
  b.querySelectorAll<HTMLButtonElement>("[data-duree]").forEach(x => x.onclick = () => { sc.duree = +x.dataset.duree!; re(); });
  b.querySelectorAll<HTMLButtonElement>("[data-intensite]").forEach(x => x.onclick = () => { sc.intensite = +x.dataset.intensite! as Intensite; re(); });
  const lierListe = (zone: HTMLElement) => {
    zone.querySelectorAll<HTMLButtonElement>("[data-cible]").forEach(x => x.onclick = () => { sc.cible = x.dataset.cible!; sc.filtre = ""; re(); });
    zone.querySelectorAll<HTMLButtonElement>("[data-epingler]").forEach(x => x.onclick = () => { epingler(x.dataset.epingler!); re(); });
  };
  const liste = b.querySelector<HTMLElement>("#scListe"); if (liste) lierListe(liste);
  // le filtre ne redessine que la liste, pour garder le curseur dans le champ
  b.querySelector<HTMLInputElement>("#scFiltre")?.addEventListener("input", ev => {
    sc.filtre = (ev.target as HTMLInputElement).value;
    if (liste) { liste.innerHTML = listeCibles(e(), camp(), ciblesClassees(e(), camp(), sc.o)); lierListe(liste); }
  });
  b.querySelector<HTMLInputElement>("#scFiltre")?.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); (liste?.querySelector("[data-cible]") as HTMLButtonElement | null)?.click(); } });
  b.querySelector<HTMLInputElement>("#scReconduire")?.addEventListener("change", ev => { sc.reconduire = (ev.target as HTMLInputElement).checked; });
  b.querySelector<HTMLButtonElement>("#scAjouter")?.addEventListener("click", () => {
    const n = plansDe(e(), camp()).length; h.tenter(() => lancerPlan(e(), camp(), sc.o, sc.cible, sc.duree, sc.intensite, sc.reconduire), "action");
    if (plansDe(e(), camp()).length > n) { sc.cible = ""; sc.reconduire = false; } re(); });
  b.querySelector<HTMLButtonElement>("#scConvoquer")?.addEventListener("click", () => agir(() => convoquerConseil(e(), camp()), "action"));
  b.querySelector<HTMLButtonElement>("#scProposer")?.addEventListener("click", () => agir(() => { const x = structuredClone(e()); iaPlans(x, camp()); return x; }, "action"));
  b.querySelectorAll<HTMLButtonElement>("[data-reconduire]").forEach(x => x.onclick = () => agir(() => basculerReconduite(e(), camp(), x.dataset.reconduire!), "clic"));
  b.querySelectorAll<HTMLButtonElement>("[data-abandon]").forEach(x => x.onclick = () => agir(() => abandonnerPlan(e(), camp(), x.dataset.abandon!)));
  b.querySelectorAll<HTMLButtonElement>("[data-chef]").forEach(x => x.onclick = () => agir(() => remplacerChef(e(), camp(), x.dataset.chef as Conseil)));
  b.querySelectorAll<HTMLButtonElement>("[data-recruter]").forEach(x => x.onclick = () => { const [cs, k] = x.dataset.recruter!.split(":"); agir(() => choisirConseiller(e(), camp(), cs as Conseil, +k), "clic"); });
  b.querySelector<HTMLButtonElement>("#scClore")!.onclick = () => { h.fermer(); h.apres?.(); };
  // carte : survol (sans redessiner) et clic
  const carte = b.querySelector<SVGElement>(".sc-carte"), survol = b.querySelector<HTMLElement>("#scSurvol");
  if (carte && survol) {
    const l = ciblesClassees(e(), camp(), sc.o), ids = l.map(x => x.id);
    carte.addEventListener("mouseover", ev => {
      const iso = (ev.target as Element).getAttribute?.("data-iso"); if (!iso) return;
      const id = cibleDuPays(sc.o, iso, ids), x = id ? l.find(y => y.id === id) : null, a = alignement(e(), iso) * (camp() === "OCC" ? 1 : -1);
      survol.innerHTML = `<strong>${esc(nomPays(iso))}</strong><span>${x ? `${OBJECTIFS[sc.o].cible === "pays" ? "" : esc(x.nom) + " · "}impact ${NOMS_CRANS[x.cran]}` : "cible impossible pour cette orientation"}</span><span>penchant ${sg(a, 2)} ${a >= 0.05 ? "vers toi" : a <= -0.05 ? "vers l'adversaire" : "(neutre)"}</span>`;
    });
    carte.addEventListener("click", ev => { const iso = (ev.target as Element).getAttribute?.("data-iso"); const id = iso ? cibleDuPays(sc.o, iso, ids) : null; if (id) { sc.cible = id; sc.filtre = ""; re(); } });
  }
}

// ---------- Bilan d'une orientation terminée ----------
export function bilanHtml(b: BilanPlan): string {
  const def = OBJECTIFS[b.objectif], n = b.fin - b.debut, reussie = b.issue === "reussie";
  const duels = b.resultats.map((r, k) => `<span><span class="sc-jalon">${b.resultats.length > 1 ? `Duel ${k + 1}` : "Duel"} ·</span> ${r >= PLANS.victoire ? "gagné" : r < PLANS.defaite ? "perdu" : "nul"} (${Math.round(100 * r)} %) : ${r >= PLANS.victoire ? `l'orientation a pris ${PLANS.elan} points d'avance.` : r < PLANS.defaite ? `elle a reculé de ${PLANS.recul} points.` : "pas d'élan."}</span>`).join("");
  const dInf = b.apres.inf - b.avant.inf, dAl = b.apres.align - b.avant.align;
  const badge = reussie ? "RÉUSSIE" : b.issue === "echouee" ? "MANQUÉE" : "ABANDONNÉE";
  return `<article class="bp ${reussie ? "reussie" : "abandonnee"}">
    <header class="bp-tete"><div><span class="sc-sur">Orientation ${reussie || b.issue === "echouee" ? "terminée" : "abandonnée"} · ${esc(CONSEILS[def.conseil].nom)}</span><h2>${esc(b.titre)}</h2>
      <span class="note">${esc(libelle(b.debut))} → ${esc(libelle(b.fin))} · ${n} trimestre${n > 1 ? "s" : ""} · intensité ${NOMS_INTENSITE[b.intensite]}</span></div><span class="bp-badge">${badge}</span></header>
    <p>${reussie ? `Objectif atteint. <strong>${esc(def.recompense)}</strong>${b.facteur ? ` <span class="note">Effet réel : ×${nb(b.facteur, 2)} (intensité ${NOMS_INTENSITE[b.intensite]}, duels).</span>` : ""}` : b.issue === "echouee" ? "L'objectif n'est pas atteint : pas de récompense." : "L'orientation a été arrêtée avant son terme."}</p>
    <div class="bp-chiffres">
      <div><span>Ton influence${def.canal ? ` ${NOM_CANAL[def.canal]}` : ""}</span><strong>${nb(b.avant.inf, 0)} → ${nb(b.apres.inf, 0)}</strong><small class="${dInf >= 0 ? "hausse" : "baisse"}">${dInf >= 0 ? "▲" : "▼"} ${sg(dInf, 0)}</small></div>
      <div><span>Penchant de la cible</span><strong>${sg(b.avant.align, 2)} → ${sg(b.apres.align, 2)}</strong><small class="${dAl >= 0 ? "hausse" : "baisse"}">${dAl >= 0 ? "▲ vers toi" : "▼ vers l'adversaire"}</small></div>
      <div><span>Coût total</span><strong>${nb(b.depense)}</strong><small>budget</small></div>
      <div><span>Duels</span><strong>${b.resultats.length}</strong><small>${b.resultats.map(r => r >= PLANS.victoire ? "✔" : r < PLANS.defaite ? "✖" : "＝").join(" ") || "aucun"}</small></div>
    </div>
    <div class="bp-colonnes"><div><strong>Les moments forts</strong>${duels || `<span class="note">Aucun duel : pas de cible disputée.</span>`}${b.rival ? `<span><span class="sc-jalon">Adversaire ·</span> l'autre bloc menait une orientation rivale sur la même cible.</span>` : ""}</div>
      <div><strong>Et maintenant ?</strong><span>${b.reconduit ? "La case « Reconduire » était cochée : l'orientation <strong>repart</strong> pour la même durée." : reussie ? "L'orientation <strong>s'arrête</strong> : la case « Reconduire » n'était pas cochée. Son budget est libéré." : "Son budget est libéré."}</span>
        <span>Tu peux la relancer, en choisir une autre dans la salle du conseil, ou ne rien faire.</span></div></div>
  </article>`;
}
export const peutRelancer = (e: EtatPartie, camp: Camp, b: BilanPlan) => b.reconduit ? "Déjà reconduite." : peutLancerPlan(e, camp, b.objectif, b.cible, b.duree, b.intensite);
export const relancer = (e: EtatPartie, camp: Camp, b: BilanPlan) => lancerPlan(e, camp, b.objectif, b.cible, b.duree, b.intensite, false);
// Vitesse affichée dans la liste des orientations en cours du trimestre.
export function resteTrimestres(e: EtatPartie, id: string): number { const p = e.plans?.find(x => x.id === id); return p ? Math.max(0, Math.ceil((100 - p.progres) / Math.max(0.1, vitesse(e, p)))) : 0; }
export { titrePlan };
