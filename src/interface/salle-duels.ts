// Salle des duels : jouer chacun des 22 mini-jeux hors partie, choisir la préparation, puis noter le jeu.
// Les avis restent dans le navigateur ; « Copier mes avis » produit un texte à coller dans la discussion.
import { LISTE_DUELS, DUELS, type IdDuel } from "../duels/catalogue";
import { jouerDuel, vignette } from "./duel-ui";
import type { Duel } from "../moteur/plans";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const CLE = "occident-brics-avis-duels";
export interface Avis { plaisir: number; clarte: number; duree: string; difficulte: string; commentaire: string; resultat: number; parties: number }
type Son = "action" | "erreur" | "victoire" | "defaite" | "etape";
export interface HoteSalle { boite: HTMLElement; ouvrir: () => void; fermer: () => void; son: (n: Son) => void; quitter: () => void }

const PREPARATIONS: [string, number][] = [["défavorable", -0.6], ["équilibrée", 0], ["favorable", 0.6]];
const NOMS_PAYS = ["Brésil", "Nigeria", "Indonésie", "Turquie", "Égypte", "Viêt Nam", "Mexique", "Kenya", "Pakistan"];
let preparation = 0;

export function lireAvis(): Partial<Record<IdDuel, Avis>> {
  try { return JSON.parse(localStorage.getItem(CLE) ?? "{}"); } catch { return {}; }
}
function ecrireAvis(a: Partial<Record<IdDuel, Avis>>) { try { localStorage.setItem(CLE, JSON.stringify(a)); } catch { /* stockage indisponible : l'avis reste affiché dans le texte à copier */ } }
// Texte récapitulatif à coller dans la discussion.
export function texteAvis(a: Partial<Record<IdDuel, Avis>>): string {
  const l = LISTE_DUELS.filter(id => a[id]);
  if (!l.length) return "Aucun avis pour l'instant.";
  return `Avis sur les duels (${l.length}/${LISTE_DUELS.length}) :\n` + l.map(id => { const x = a[id]!;
    return `- ${DUELS[id].nom} : plaisir ${x.plaisir}/5, clarté ${x.clarte}/5, durée ${x.duree}, difficulté ${x.difficulte}, dernier résultat ${Math.round(100 * x.resultat)} %, ${x.parties} partie${x.parties > 1 ? "s" : ""}${x.commentaire ? `. « ${x.commentaire} »` : ""}`; }).join("\n");
}

export function salleDuels(h: HoteSalle) {
  const avis = lireAvis(), notes = LISTE_DUELS.filter(id => avis[id]).length;
  h.boite.innerHTML = `<h2>Salle des duels</h2>
    <p class="note">Teste les 22 mini-jeux un par un, hors partie. Choisis la préparation (l'avantage de départ), joue, puis donne ton avis. ${notes}/22 notés.</p>
    <div class="p-choix">Préparation : ${PREPARATIONS.map(([n, v]) => `<button data-prep="${v}" class="${v === preparation ? "actif" : ""}">${n}</button>`).join("")}</div>
    <div class="salle-liste">${LISTE_DUELS.map(id => { const d = DUELS[id], x = avis[id];
      return `<button data-duel="${id}" class="${x ? "note" : ""}">${vignette(id)}<strong>${esc(d.nom)}</strong><small>${esc(d.situation)}</small><span>${esc(d.principe)}</span>${x ? `<em>${"★".repeat(x.plaisir)}${"☆".repeat(5 - x.plaisir)} · ${x.parties} partie${x.parties > 1 ? "s" : ""}</em>` : ""}</button>`; }).join("")}</div>
    <div class="actions-fenetre"><button id="sCopier">Copier mes avis</button><button id="sQuitter" class="principal">Retour</button></div>
    <textarea id="sTexte" readonly hidden rows="8"></textarea>`;
  h.ouvrir();
  h.boite.querySelectorAll<HTMLButtonElement>("[data-prep]").forEach(b => b.onclick = () => { preparation = +b.dataset.prep!; salleDuels(h); });
  h.boite.querySelectorAll<HTMLButtonElement>("[data-duel]").forEach(b => b.onclick = () => lancer(h, b.dataset.duel as IdDuel));
  h.boite.querySelector<HTMLButtonElement>("#sQuitter")!.onclick = () => h.quitter();
  h.boite.querySelector<HTMLButtonElement>("#sCopier")!.onclick = () => {
    const t = texteAvis(lireAvis()), zone = h.boite.querySelector<HTMLTextAreaElement>("#sTexte")!;
    zone.value = t; zone.hidden = false; zone.select();
    navigator.clipboard?.writeText(t).then(() => h.son("etape"), () => { /* copie refusée : le texte reste sélectionné */ });
  };
}
function lancer(h: HoteSalle, id: IdDuel) {
  const d: Duel = { id: `salle_${id}`, plan: "", type: id, attaquant: "OCC", defenseur: "CHN", avantage: preparation, round: 0,
    graine: 1 + Math.floor(Math.random() * 2147483646), motif: "jalon", titre: "Salle des duels" };
  jouerDuel(d, { boite: h.boite, ouvrir: h.ouvrir, fermer: () => {}, son: h.son, noms: NOMS_PAYS, titre: "Salle des duels",
    sousTitre: "Entraînement", avantage: preparation, fin: r => formulaire(h, id, r) });
}
function formulaire(h: HoteSalle, id: IdDuel, r: number) {
  const a = lireAvis(), x = a[id], d = DUELS[id];
  const echelle = (nom: string, v: number) => `<div class="p-choix">${nom} : ${[1, 2, 3, 4, 5].map(k => `<button data-${nom === "Plaisir" ? "plaisir" : "clarte"}="${k}" class="${k === v ? "actif" : ""}">${k}</button>`).join("")}</div>`;
  const choix = (cle: string, nom: string, l: string[], v: string) => `<div class="p-choix">${nom} : ${l.map(o => `<button data-${cle}="${o}" class="${o === v ? "actif" : ""}">${o}</button>`).join("")}</div>`;
  const f = { plaisir: x?.plaisir ?? 3, clarte: x?.clarte ?? 3, duree: x?.duree ?? "bien", difficulte: x?.difficulte ?? "bien" };
  const rendre = () => {
    h.boite.innerHTML = `<h2>Ton avis : ${esc(d.nom)}</h2><p class="note">Résultat de la partie : ${Math.round(100 * r)} %.</p>
      ${echelle("Plaisir", f.plaisir)}${echelle("Clarté des règles", f.clarte)}
      ${choix("duree", "Durée", ["trop court", "bien", "trop long"], f.duree)}${choix("difficulte", "Difficulté", ["trop facile", "bien", "trop dur"], f.difficulte)}
      <label>Commentaire (ce qui plaît, ce qui gêne, une idée) :<textarea id="sCom" rows="3">${esc(x?.commentaire ?? "")}</textarea></label>
      <div class="actions-fenetre"><button id="sRejouer">Rejouer sans noter</button><button id="sOk" class="principal">Enregistrer l'avis</button></div>`;
    const lier = (attr: string, k: keyof typeof f, nombre: boolean) => h.boite.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`).forEach(b => b.onclick = () => {
      const com = h.boite.querySelector<HTMLTextAreaElement>("#sCom")!.value; (f as Record<string, unknown>)[k] = nombre ? +b.getAttribute(`data-${attr}`)! : b.getAttribute(`data-${attr}`)!; rendre(); h.boite.querySelector<HTMLTextAreaElement>("#sCom")!.value = com; });
    lier("plaisir", "plaisir", true); lier("clarte", "clarte", true); lier("duree", "duree", false); lier("difficulte", "difficulte", false);
    h.boite.querySelector<HTMLButtonElement>("#sRejouer")!.onclick = () => lancer(h, id);
    h.boite.querySelector<HTMLButtonElement>("#sOk")!.onclick = () => {
      a[id] = { ...f, commentaire: h.boite.querySelector<HTMLTextAreaElement>("#sCom")!.value.trim(), resultat: r, parties: (x?.parties ?? 0) + 1 };
      ecrireAvis(a); h.son("etape"); salleDuels(h);
    };
  };
  h.ouvrir(); rendre();
}
