import donnees from "../data/pays2000.json";
import { dessinerCarte, couleurLog } from "./carte";
import { ficheHtml } from "./fiche";
import { creerEtat, avancer, estTermine, type EtatJeu } from "../moteur/etat";
import { serialiser, charger } from "../moteur/sauvegarde";
import { libelle, ere } from "../moteur/temps";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const CLE_SAUVEGARDE = "occident-brics-sauvegarde";

let etat: EtatJeu = creerEtat(Date.now() % 2147483647);
let paysChoisi: string | null = null;
let minuterie: number | undefined;

const idsJeu = new Map(donnees.pays.map(p => [p.idCarte, p.iso3]));
const noms = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.nom]));
const carte = dessinerCarte($("carte"), idsJeu, iso3 => { paysChoisi = iso3; afficher(); });

function message(texte: string) {
  const m = $("message");
  m.textContent = texte;
  m.classList.add("visible");
  setTimeout(() => m.classList.remove("visible"), 2500);
}

function valeurCarte(iso3: string, cle: string): number {
  if (cle === "population") return etat.pays[iso3].population;
  const p = donnees.pays.find(x => x.iso3 === iso3)!;
  return (p.indicateurs as Record<string, number | null>)[cle] ?? 0;
}

function afficher() {
  $("date").textContent = libelle(etat.round);
  const e = ere(etat.round);
  $("ere").textContent = `Ère ${e.numero} : ${e.nom}`;
  const cle = $<HTMLSelectElement>("indicateur").value;
  const valeurs = donnees.pays.map(p => valeurCarte(p.iso3, cle)).filter(v => v > 0);
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  carte.colorer(Object.fromEntries(donnees.pays.map(p => [p.iso3, couleurLog(valeurCarte(p.iso3, cle), min, max)])), noms);
  carte.choisir(paysChoisi);
  if (paysChoisi) $("fiche").innerHTML = ficheHtml(paysChoisi, etat);
  $<HTMLButtonElement>("btnPas").disabled = estTermine(etat);
}

function pas() {
  etat = avancer(etat);
  if (estTermine(etat)) { pause(); message("Fin de la partie : 2050 T4 atteint."); }
  afficher();
}

function pause() { clearInterval(minuterie); minuterie = undefined; $("btnLecture").textContent = "▶"; }
function lecture() {
  if (estTermine(etat)) return;
  pause();
  minuterie = window.setInterval(pas, Number($<HTMLSelectElement>("vitesse").value));
  $("btnLecture").textContent = "⏸";
}

$("btnLecture").onclick = () => (minuterie ? pause() : lecture());
$("btnPas").onclick = () => { pause(); pas(); };
$("vitesse").onchange = () => { if (minuterie) lecture(); };
$("indicateur").onchange = afficher;
document.addEventListener("keydown", e => { if (e.code === "Space" && (e.target as HTMLElement).tagName !== "SELECT") { e.preventDefault(); $("btnLecture").click(); } });

$("btnSauver").onclick = () => {
  try { localStorage.setItem(CLE_SAUVEGARDE, serialiser(etat)); message(`Partie sauvegardée (${libelle(etat.round)}).`); }
  catch { message("Sauvegarde impossible dans ce navigateur : utilise Exporter."); }
};
$("btnCharger").onclick = () => {
  let texte: string | null = null;
  try { texte = localStorage.getItem(CLE_SAUVEGARDE); } catch { /* stockage indisponible */ }
  if (!texte) { message("Aucune sauvegarde dans ce navigateur."); return; }
  try { pause(); etat = charger(texte); afficher(); message(`Partie chargée (${libelle(etat.round)}).`); }
  catch (e) { message(String((e as Error).message)); }
};
$("btnExporter").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([serialiser(etat)], { type: "application/json" }));
  a.download = `occident-brics-${libelle(etat.round).replace(" ", "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$<HTMLInputElement>("fichier").onchange = async ev => {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try { pause(); etat = charger(await f.text()); afficher(); message(`Partie importée (${libelle(etat.round)}).`); }
  catch (e) { message(String((e as Error).message)); }
};
$("btnNouvelle").onclick = () => { pause(); etat = creerEtat(Date.now() % 2147483647); afficher(); message("Nouvelle partie : 2000 T1."); };

afficher();
