// Affichage d'un duel dans la fenêtre du jeu : la vue générique (grille, rangées, boutons) que chaque duel décrit,
// l'animation des séquences à mémoriser, le chrono des duels d'adresse, la démonstration animée et le conseil.
// Le moteur du duel reste pur (src/duels).
import { REGLES } from "../duels/index";
import { DUELS } from "../duels/catalogue";
import { REGLES_TEXTE } from "../duels/regles-texte";
import type { Vue, Case, EtatBase } from "../duels/moteur";
import type { Duel, Enjeux } from "../moteur/plans";
import { image } from "./images";
import { IMAGE_DUEL, coupDemo, changements } from "./duel-anim";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const txt = (s: string) => esc(s).replace(/\n/g, "<br>");
export interface HoteDuel {
  boite: HTMLElement;                       // conteneur de la fenêtre
  ouvrir: () => void; fermer: () => void;   // afficher / masquer la fenêtre
  son: (nom: "action" | "erreur" | "victoire" | "defaite" | "etape") => void;
  noms?: string[];                          // noms des pays en jeu (affichage)
  titre: string; sousTitre: string; avantage: number;
  fin: (resultat: number) => void;          // résultat du joueur, 0 à 1
  enjeux?: Enjeux;                          // effets sur la partie selon l'issue (absent à l'entraînement)
}
// Enjeux du duel : trois issues, celle obtenue mise en avant à la fin (pct = résultat en %).
function enjeuxHtml(e: Enjeux | undefined, pct?: number): string {
  if (!e) return `<p class="d-enjeux-vide note">Entraînement : ce duel n'a aucun effet sur ta partie.</p>`;
  const issue = pct === undefined ? null : pct >= 60 ? "victoire" : pct < 40 ? "defaite" : "nul";
  const l = ([["victoire", "Si tu gagnes"], ["nul", "Match nul"], ["defaite", "Si tu perds"]] as const).filter(([k]) => !issue || k === issue);
  return `<div class="d-enjeux${issue ? " obtenu" : ""}"><h4>${issue ? "Effet sur la partie" : "Enjeu pour la partie"}</h4>${l.map(([k, t]) => `<p class="${k}"><strong>${issue ? "" : `${t} : `}</strong>${esc(e[k])}</p>`).join("")}</div>`;
}
const CONSEILS = 2;      // conseils par duel
const PAS_DEMO = 1900;   // ms par coup de démonstration (1 000 ms pour une simple sélection)
const TOURS_DEMO = 5, COUPS_DEMO = 30;
// Fiche de règles complète d'un duel (volet « Règles complètes »).
export function ficheRegles(type: Duel["type"]): string {
  const f = REGLES_TEXTE[type];
  return `<div class="d-fiche"><p><strong>But :</strong> ${esc(f.but)}</p><p><strong>Déroulement :</strong></p><ol>${f.tour.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
    <p><strong>Fin et résultat :</strong> ${esc(f.fin)} Au-delà de 60 %, c'est une victoire ; sous 40 %, une défaite ; entre les deux, un match nul.</p>
    <p><strong>Préparation :</strong> ${esc(f.preparation)}</p><p><strong>Conseil :</strong> ${esc(f.conseil)}</p></div>`;
}
// Bandeau illustré : image de la situation, nom du duel et contexte.
export function banniereDuel(type: Duel["type"], sousTitre: string): string {
  const src = image(IMAGE_DUEL[type]), info = DUELS[type];
  return `<header class="d-banniere"${src ? ` style="background-image:url('${src}')"` : ""}><div><small>${esc(info.situation)} · ${esc(sousTitre)}</small><h2>${esc(info.nom)}</h2></div></header>`;
}
// Décors des duels (maquette 8) : 6 ambiances, chaque duel reçoit celle de sa situation.
export const DECORS = { studio: "Soir d'élection", etatmajor: "Nuit du putsch", sonar: "Chasse sous-marine", marche: "Marché des contrats", gouffre: "Bord du gouffre", place: "Place de la révolution" } as const;
export type Decor = keyof typeof DECORS;
export const DECOR_DUEL: Record<Duel["type"], Decor> = {
  puissance4: "studio", skull: "studio", sept: "studio",
  echecs: "etatmajor", coup: "etatmajor", longhorn: "etatmajor", memoire44: "etatmajor", schotten: "etatmajor", stratego: "etatmajor", streetfighter: "etatmajor",
  bataille: "sonar", onitama: "sonar", go: "sonar", mastermind: "sonar", simon: "sonar",
  jaipur: "marche", korsar: "marche", lostcities: "marche", santorini: "marche", quarto: "marche",
  perudo: "gouffre", othello: "place",
};
const decor = (type: Duel["type"]) => `decor-${DECOR_DUEL[type] ?? "etatmajor"}`;
// Petite vignette pour les listes de duels.
export const vignette = (type: Duel["type"]) => { const src = image(IMAGE_DUEL[type]); return src ? `<i class="d-vignette" style="background-image:url('${src}')"></i>` : ""; };

function caseHtml(c: Case, i: string, anim?: string): string {
  const vide = !c.t || /\bvide\b/.test(c.c ?? ""), court = c.t.length <= 3 && !c.t.includes("\n");
  return `<button class="d-case ${c.c ?? ""} ${c.coup ? "jouable" : ""} ${anim ?? ""} ${vide ? "" : "pleine"} ${court ? "court" : ""}" ${c.coup ? `data-coup="${esc(c.coup)}"` : "disabled"} ${c.titre ? `title="${esc(c.titre)}"` : ""} data-i="${i}">${txt(c.t)}</button>`;
}
// Plateau, rangées, boutons et journal d'une vue ; anim marque les cases qui viennent de changer.
function plateauHtml(v: Vue, journal: string[], anim: Map<string, string>): string {
  let h = `<p class="d-statut">${txt(v.statut)}${v.chrono ? ` <strong class="d-chrono" id="dChrono">${Math.ceil(v.chrono)} s</strong>` : ""}</p>`;
  // une grille dont les cases portent du texte (noms, effectifs) garde des cases larges ; sinon cases carrées et pions ronds
  const texte = v.grille?.cases.some(c => c.t.length > 3 || c.t.includes("\n"));
  if (v.grille) h += `<div class="d-plateau"><div class="d-grille ${v.grille.c ?? ""} ${texte ? "texte" : ""}" style="grid-template-columns:repeat(${v.grille.cols},minmax(0,1fr));--cols:${v.grille.cols}">${v.grille.cases.map((c, i) => caseHtml(c, `g${i}`, anim.get(`g${i}`))).join("")}</div></div>`;
  // une rangée d'étiquettes de la largeur de la grille s'aligne sous ses colonnes
  const alignee = (r: { cases: Case[] }) => v.grille && r.cases.length === v.grille.cols && r.cases.every(c => /etiquette/.test(c.c ?? ""));
  for (const [k, r] of (v.rangees ?? []).entries()) if (alignee(r)) h += `<div class="d-grille d-etiquettes" style="grid-template-columns:repeat(${v.grille!.cols},minmax(0,1fr));--cols:${v.grille!.cols}">${r.cases.map((c, i) => caseHtml(c, `r${k}_${i}`)).join("")}</div>`;
  else h += `<div class="d-rangee ${r.c ?? ""}">${r.titre ? `<h4>${esc(r.titre)}</h4>` : ""}<div>${r.cases.map((c, i) => caseHtml(c, `r${k}_${i}`, anim.get(`r${k}_${i}`))).join("")}</div></div>`;
  if (v.boutons?.length) h += `<div class="d-boutons">${v.boutons.map(b => `<button ${b.coup ? `data-coup="${esc(b.coup)}"` : "disabled"} ${b.titre ? `title="${esc(b.titre)}"` : ""}>${txt(b.t)}</button>`).join("")}</div>`;
  return h + `<ul class="d-journal">${journal.slice(-4).map((l, k, t) => `<li class="${k === t.length - 1 ? "dernier" : ""}">${esc(l)}</li>`).join("")}</ul>`;
}
const scoresHtml = (v: Vue) => v.scores ? `<div class="d-scores"><span class="moi">Toi · ${esc(v.scores[0])}</span>${v.scores[1] ? `<span class="lui">Adversaire · ${esc(v.scores[1])}</span>` : ""}</div>` : "";
// Allume les cases d'une séquence à mémoriser, puis appelle suite().
function flasher(boite: HTMLElement, v: Vue, minuteurs: ReturnType<typeof setTimeout>[], suite: () => void) {
  boite.querySelectorAll<HTMLButtonElement>(".d-grille .d-case").forEach(b => b.disabled = true);
  v.flash!.sequence.forEach((n, k) => {
    minuteurs.push(setTimeout(() => boite.querySelector(`[data-i="g${n}"]`)?.classList.add("flash"), k * v.flash!.ms + 120));
    minuteurs.push(setTimeout(() => boite.querySelector(`[data-i="g${n}"]`)?.classList.remove("flash"), k * v.flash!.ms + v.flash!.ms * 0.75));
  });
  minuteurs.push(setTimeout(suite, v.flash!.sequence.length * v.flash!.ms + 300));
}
// Petit générateur pour la démo et les conseils (le hasard du duel lui-même reste à graine).
const alea = (g: number) => () => { g = (g * 1664525 + 1013904223) >>> 0; return g / 4294967296; };

export function jouerDuel(d: Duel, hote: HoteDuel) {
  const def = REGLES[d.type], info = DUELS[d.type], f = REGLES_TEXTE[d.type], av = hote.avantage;
  let s = def.creer(d.graine, av, { noms: hote.noms }), avant: Vue | null = null, conseils = CONSEILS;
  let minuteur: ReturnType<typeof setInterval> | null = null, animation: ReturnType<typeof setTimeout>[] = [];
  const arreter = () => { if (minuteur) clearInterval(minuteur); minuteur = null; animation.forEach(clearTimeout); animation = []; };
  const jouer = (coup: string) => {
    arreter(); avant = def.vue(s);
    try { s = def.jouer(s, coup); hote.son("action"); } catch { hote.son("erreur"); }
    rendre();
  };
  const conclure = (r: number) => { arreter(); hote.fermer(); hote.fin(r); };
  function rendre() {
    const v: Vue = def.vue(s), anim = changements(avant, v); avant = null;
    const pct = Math.round(100 * def.resultat(s));
    let h = `<div class="duel ${decor(d.type)}">${banniereDuel(d.type, hote.titre)}${scoresHtml(v)}
      <p class="d-regle">${esc(info.principe)}</p>${s.fini ? enjeuxHtml(hote.enjeux, pct) : `<details class="d-regles"><summary>Enjeu pour la partie</summary>${enjeuxHtml(hote.enjeux)}</details>`}
      <details class="d-regles"><summary>Règles complètes</summary>${ficheRegles(d.type)}</details>` + plateauHtml(v, s.journal, anim);
    h += s.fini
      ? `<div class="actions-fenetre"><p class="d-fin ${pct >= 60 ? "gagne" : pct < 40 ? "perdu" : ""}">${pct >= 60 ? "Victoire" : pct < 40 ? "Défaite" : "Match nul"} · ${pct} %</p><button id="dFin" class="principal">Appliquer le résultat</button></div>`
      : `<div class="actions-fenetre"><button id="dConseil" ${conseils ? "" : "disabled"} title="Montre un bon coup (${CONSEILS} par duel)">💡 Conseil (${conseils})</button><button id="dAbandon" title="Arrêter maintenant : le résultat partiel compte">Arrêter (résultat actuel ${pct} %)</button></div>`;
    hote.boite.innerHTML = h + `</div>`;
    hote.boite.querySelectorAll<HTMLButtonElement>("[data-coup]").forEach(b => b.onclick = () => jouer(b.dataset.coup!));
    hote.boite.querySelector<HTMLButtonElement>("#dFin")?.addEventListener("click", () => conclure(def.resultat(s)));
    hote.boite.querySelector<HTMLButtonElement>("#dAbandon")?.addEventListener("click", () => conclure(def.resultat(s)));
    hote.boite.querySelector<HTMLButtonElement>("#dConseil")?.addEventListener("click", e => {
      const c = coupDemo(def, s, alea(d.graine + s.tour)); if (!c || !conseils) return;
      conseils--; (e.currentTarget as HTMLButtonElement).textContent = `💡 Conseil (${conseils})`; (e.currentTarget as HTMLButtonElement).disabled = !conseils;
      hote.boite.querySelector(`[data-coup="${CSS.escape(c)}"]`)?.classList.add("conseil"); hote.son("etape");
    });
    if (s.fini) hote.son(pct >= 60 ? "victoire" : pct < 40 ? "defaite" : "etape");
    if (v.flash) flasher(hote.boite, v, animation, () => jouer("vu"));
    if (v.chrono) {
      const fin = Date.now() + v.chrono * 1000;
      minuteur = setInterval(() => { const r = (fin - Date.now()) / 1000, el = hote.boite.querySelector("#dChrono");
        if (el) el.textContent = `${Math.max(0, Math.ceil(r))} s`; if (r <= 0) jouer("temps"); }, 200);
    }
  }
  // Démonstration animée : une partie jouée seule sur une autre graine, un pointeur montre chaque coup, le journal le raconte.
  function demo() {
    arreter();
    let ds: EtatBase = def.creer((d.graine ^ 0x5bd1e995) >>> 1, 0, { noms: hote.noms }), n = 0, prec: Vue | null = null, legende = "Le pointeur montre chaque coup ; regarde ce qui change sur le plateau.";
    let pos = ""; // le pointeur repart de la dernière case visée
    const h = alea(d.graine), fin = () => ds.fini || ds.tour >= TOURS_DEMO || n >= COUPS_DEMO;
    const afficher = () => {
      const v = def.vue(ds), anim = changements(prec, v);
      hote.boite.innerHTML = `<div class="duel demo ${decor(d.type)}">${banniereDuel(d.type, "Démonstration")}<p class="d-legende" id="dLegende">${esc(legende)}</p>${scoresHtml(v)}
        <div class="d-scene">${plateauHtml(v, ds.journal, anim)}<span class="d-pointeur" id="dPointeur"${pos ? ` style="opacity:1;transform:${pos}"` : ""}></span></div>
        <div class="actions-fenetre">${fin() ? `<button id="dRevoir">Revoir la démo</button>` : `<button id="dPasser">Passer la démo</button>`}<button id="dCommencer" class="principal">Jouer</button></div></div>`;
      hote.boite.querySelectorAll<HTMLButtonElement>(".d-scene button").forEach(b => { b.disabled = true; b.removeAttribute("data-coup"); });
      hote.boite.querySelector<HTMLButtonElement>("#dCommencer")!.onclick = () => { arreter(); hote.son("etape"); rendre(); };
      hote.boite.querySelector<HTMLButtonElement>("#dPasser")?.addEventListener("click", () => { arreter(); hote.son("etape"); rendre(); });
      hote.boite.querySelector<HTMLButtonElement>("#dRevoir")?.addEventListener("click", demo);
      return v;
    };
    const etape = () => {
      const v = afficher();
      if (fin()) {
        const p = Math.round(100 * def.resultat(ds)); hote.boite.querySelector("#dLegende")!.textContent = ds.fini
          ? `Fin de la démo : résultat ${p} % pour le camp montré (victoire au-delà de 60 %). À toi de jouer !`
          : `La démo s'arrête ici (${p} % pour l'instant). Tu as vu l'essentiel : à toi de jouer !`;
        return;
      }
      const c = coupDemo(def, ds, h); if (!c) return;
      const suite = () => { prec = def.vue(ds); const j = ds.journal.length; try { ds = def.jouer(ds, c); } catch { n = COUPS_DEMO; } n++;
        legende = ds.journal.slice(Math.min(j, ds.journal.length - 1)).join(" ") || legende; hote.son("action"); animation.push(setTimeout(etape, 50)); };
      if (c === "vu" && v.flash) { legende = "Mémorise la séquence qui s'allume…"; hote.boite.querySelector("#dLegende")!.textContent = legende; flasher(hote.boite, v, animation, suite); return; }
      // le pointeur glisse jusqu'à la case ou au bouton du coup, la case s'illumine, puis le coup est joué
      const cible = Array.from(hote.boite.querySelectorAll<HTMLElement>(".d-scene [data-i], .d-scene .d-boutons button")).reverse().find(b => trouver(v, b) === c); // la dernière case du coup (le bas d'une colonne)
      const ptr = hote.boite.querySelector<HTMLElement>("#dPointeur"), scene = hote.boite.querySelector<HTMLElement>(".d-scene");
      if (cible && ptr && scene) {
        const a = cible.getBoundingClientRect(), o = scene.getBoundingClientRect();
        ptr.style.opacity = "1";
        pos = `translate(${a.left - o.left + a.width / 2 - 14}px,${a.top - o.top + a.height / 2 - 14}px)`;
        animation.push(setTimeout(() => { ptr.style.transform = pos; }, 60));
        animation.push(setTimeout(() => { cible.classList.add("vise"); ptr.classList.add("clic"); }, 750));
      } else { legende = `Coup joué : ${c}.`; }
      let pas = PAS_DEMO; try { if (def.jouer(ds, c).tour === ds.tour) pas = 1000; } catch { /* coup refusé : rythme normal */ }
      animation.push(setTimeout(suite, pas));
    };
    hote.son("etape"); etape();
  }
  // retrouve le coup porté par un élément de la scène (les data-coup y sont retirés pour bloquer les clics)
  function trouver(v: Vue, el: HTMLElement): string | undefined {
    const i = el.dataset.i;
    if (i) { if (i[0] === "g") return v.grille?.cases[+i.slice(1)]?.coup; const [k, j] = i.slice(1).split("_").map(Number); return v.rangees?.[k]?.cases[j]?.coup; }
    const l = Array.from(el.parentElement?.children ?? []); return v.boutons?.[l.indexOf(el)]?.coup;
  }
  // écran d'ouverture : la situation, l'essentiel des règles en trois blocs, la démo et la partie
  hote.boite.innerHTML = `<div class="duel ${decor(d.type)}">${banniereDuel(d.type, hote.titre)}
    <p class="d-but"><strong>But :</strong> ${esc(f.but)}</p>${enjeuxHtml(hote.enjeux)}
    <div class="d-cartes">
      <section><h4>① À ton tour</h4><ol>${f.tour.map(t => `<li>${esc(t)}</li>`).join("")}</ol></section>
      <section><h4>② Fin de partie</h4><p>${esc(f.fin)}</p><p class="note">Au-delà de 60 % : victoire ; sous 40 % : défaite ; entre les deux : match nul.</p></section>
      <section><h4>③ Astuce</h4><p>${esc(f.conseil)}</p><p class="note">Ta préparation : ${av > 0.15 ? "favorable" : av < -0.15 ? "défavorable" : "équilibrée"} (${av >= 0 ? "+" : ""}${av.toFixed(1).replace(".", ",")}). ${esc(f.preparation)}</p></section>
    </div>
    <div class="actions-fenetre"><button id="dDemo">▶ Voir la démo animée</button><button id="dCommencer" class="principal">Jouer</button></div></div>`;
  hote.ouvrir();
  hote.boite.querySelector<HTMLButtonElement>("#dCommencer")!.onclick = () => { hote.son("etape"); rendre(); };
  hote.boite.querySelector<HTMLButtonElement>("#dDemo")!.onclick = demo;
}
