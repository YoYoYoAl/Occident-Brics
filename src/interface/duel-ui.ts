// Affichage d'un duel dans la fenêtre du jeu : la vue générique (grille, rangées, boutons) que chaque duel décrit,
// l'animation des séquences à mémoriser et le chrono des duels d'adresse. Le moteur du duel reste pur (src/duels).
import { REGLES } from "../duels/index";
import { DUELS } from "../duels/catalogue";
import type { Vue, Case } from "../duels/moteur";
import type { Duel } from "../moteur/plans";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const txt = (s: string) => esc(s).replace(/\n/g, "<br>");
export interface HoteDuel {
  boite: HTMLElement;                       // conteneur de la fenêtre
  ouvrir: () => void; fermer: () => void;   // afficher / masquer la fenêtre
  son: (nom: "action" | "erreur" | "victoire" | "defaite" | "etape") => void;
  noms?: string[];                          // noms des pays en jeu (affichage)
  titre: string; sousTitre: string; avantage: number;
  fin: (resultat: number) => void;          // résultat du joueur, 0 à 1
}
function caseHtml(c: Case, i: string): string {
  return `<button class="d-case ${c.c ?? ""} ${c.coup ? "jouable" : ""}" ${c.coup ? `data-coup="${esc(c.coup)}"` : "disabled"} ${c.titre ? `title="${esc(c.titre)}"` : ""} data-i="${i}">${txt(c.t)}</button>`;
}
export function jouerDuel(d: Duel, hote: HoteDuel) {
  const def = REGLES[d.type], info = DUELS[d.type];
  let s = def.creer(d.graine, hote.avantage, { noms: hote.noms });
  let minuteur: ReturnType<typeof setInterval> | null = null, animation: ReturnType<typeof setTimeout>[] = [];
  const arreter = () => { if (minuteur) clearInterval(minuteur); minuteur = null; animation.forEach(clearTimeout); animation = []; };
  const jouer = (coup: string) => {
    arreter();
    try { s = def.jouer(s, coup); hote.son("action"); } catch { hote.son("erreur"); }
    rendre();
  };
  const conclure = (r: number) => { arreter(); hote.fermer(); hote.fin(r); };
  function rendre() {
    const v: Vue = def.vue(s);
    const pct = Math.round(100 * def.resultat(s));
    let h = `<div class="duel"><header class="d-entete"><div><h2>${esc(info.nom)}</h2><small>${esc(hote.titre)} · inspiré de ${esc(info.inspire)}</small></div>
      ${v.scores ? `<div class="d-scores"><span class="moi">Toi : ${esc(v.scores[0])}</span>${v.scores[1] ? `<span class="lui">Adversaire : ${esc(v.scores[1])}</span>` : ""}</div>` : ""}</header>
      <p class="d-regle">${esc(info.principe)}</p>
      <p class="d-statut">${txt(v.statut)}${v.chrono ? ` <strong class="d-chrono" id="dChrono">${Math.ceil(v.chrono)} s</strong>` : ""}</p>`;
    if (v.grille) h += `<div class="d-grille ${v.grille.c ?? ""}" style="grid-template-columns:repeat(${v.grille.cols},minmax(0,1fr))">${v.grille.cases.map((c, i) => caseHtml(c, `g${i}`)).join("")}</div>`;
    for (const [k, r] of (v.rangees ?? []).entries()) h += `<div class="d-rangee ${r.c ?? ""}">${r.titre ? `<h4>${esc(r.titre)}</h4>` : ""}<div>${r.cases.map((c, i) => caseHtml(c, `r${k}_${i}`)).join("")}</div></div>`;
    if (v.boutons?.length) h += `<div class="d-boutons">${v.boutons.map(b => `<button ${b.coup ? `data-coup="${esc(b.coup)}"` : "disabled"} ${b.titre ? `title="${esc(b.titre)}"` : ""}>${txt(b.t)}</button>`).join("")}</div>`;
    h += `<ul class="d-journal">${s.journal.slice(-4).map((l: string) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    h += s.fini
      ? `<div class="actions-fenetre"><p class="d-fin ${pct >= 60 ? "gagne" : pct < 40 ? "perdu" : ""}">Résultat : ${pct >= 60 ? "victoire" : pct < 40 ? "défaite" : "match nul"} (${pct} %)</p><button id="dFin" class="principal">Appliquer le résultat</button></div>`
      : `<div class="actions-fenetre"><button id="dAbandon" title="Arrêter maintenant : le résultat partiel compte">Arrêter (résultat actuel ${pct} %)</button></div>`;
    hote.boite.innerHTML = h + `</div>`;
    hote.boite.querySelectorAll<HTMLButtonElement>("[data-coup]").forEach(b => b.onclick = () => jouer(b.dataset.coup!));
    hote.boite.querySelector<HTMLButtonElement>("#dFin")?.addEventListener("click", () => conclure(def.resultat(s)));
    hote.boite.querySelector<HTMLButtonElement>("#dAbandon")?.addEventListener("click", () => conclure(def.resultat(s)));
    if (s.fini) hote.son(pct >= 60 ? "victoire" : pct < 40 ? "defaite" : "etape");
    // séquence à mémoriser : les cases de la grille s'allument une à une, puis la saisie commence
    if (v.flash) {
      hote.boite.querySelectorAll<HTMLButtonElement>(".d-grille .d-case").forEach(b => b.disabled = true);
      v.flash.sequence.forEach((n, k) => {
        animation.push(setTimeout(() => hote.boite.querySelector(`[data-i="g${n}"]`)?.classList.add("flash"), k * v.flash!.ms + 120));
        animation.push(setTimeout(() => hote.boite.querySelector(`[data-i="g${n}"]`)?.classList.remove("flash"), k * v.flash!.ms + v.flash!.ms * 0.75));
      });
      animation.push(setTimeout(() => jouer("vu"), v.flash.sequence.length * v.flash.ms + 300));
    }
    if (v.chrono) {
      const fin = Date.now() + v.chrono * 1000;
      minuteur = setInterval(() => { const r = (fin - Date.now()) / 1000, el = hote.boite.querySelector("#dChrono");
        if (el) el.textContent = `${Math.max(0, Math.ceil(r))} s`; if (r <= 0) jouer("temps"); }, 200);
    }
  }
  hote.ouvrir(); rendre();
}
