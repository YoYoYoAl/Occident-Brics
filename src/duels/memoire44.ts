// Front en trois secteurs (Mémoire 44 remixé) : gauche, centre, droite. Chaque camp a des unités par secteur
// (infanterie : 1 dé, blindé : 2 dés) et une main de 4 cartes d'ordre. Une carte active un secteur (ou un peu
// de chaque) : les unités activées lancent leurs dés contre l'adversaire du secteur, qui riposte avec la moitié.
// Dés : 2 faces touché, 1 face grenade (touché), 1 face drapeau (repli), 2 faces étoile (raté).
// Vider un secteur adverse prend son objectif ; 2 objectifs sur 3, et le front cède. 8 ordres chacun au plus.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, entier, choisir, distraction, noter, finir, verifier } from "./moteur";

export const SECTEURS = ["gauche", "centre", "droite"];
type Ordre = "g" | "c" | "d" | "general" | "barrage" | "renfort";
const NOMS_ORDRES: Record<Ordre, string> = { g: "Attaque à gauche", c: "Attaque au centre", d: "Attaque à droite", general: "Assaut général", barrage: "Barrage d'artillerie", renfort: "Renforts" };
const PAQUET: Ordre[] = ["g", "g", "g", "c", "c", "c", "c", "d", "d", "d", "general", "general", "barrage", "barrage", "renfort", "renfort"];
const MAX = 8;
interface Front { inf: number; bl: number }
interface S extends EtatBase { u: Front[][]; mains: Ordre[][]; pioche: Ordre[]; obj: [boolean[], boolean[]]; ordres: [number, number]; avantage: number; secteurChoisi: number | null; ordreEnCours: Ordre | null }
const forces = (f: Front) => f.inf + f.bl;
const desDe = (f: Front, max = 99) => Math.min(max, f.inf + 2 * f.bl);
function lancer(s: S, n: number): { touches: number; replis: number } {
  let touches = 0, replis = 0; for (let k = 0; k < n; k++) { const f = entier(s, 6); if (f <= 2) touches++; else if (f === 3) replis++; } return { touches, replis };
}
function perdre(f: Front, n: number) { for (let k = 0; k < n; k++) { if (f.inf) f.inf--; else if (f.bl) f.bl--; } }
function combattre(s: S, j: number, sec: number, max = 99, barrage = false) {
  const a = s.u[j][sec], d = s.u[1 - j][sec]; if (!forces(a) || !forces(d)) return;
  const r = lancer(s, barrage ? 3 : desDe(a, max)); perdre(d, r.touches);
  const qui = j === 0 ? "Tes troupes" : "L'adversaire";
  let txt = `${qui} ${barrage ? "pilonnent" : "attaquent"} ${SECTEURS[sec]} : ${r.touches} touché${r.touches > 1 ? "s" : ""}`;
  if (!barrage && forces(d)) { const rip = lancer(s, Math.ceil(desDe(d) / 2)); perdre(a, rip.touches); txt += `, riposte ${rip.touches}`; }
  noter(s, txt + ".");
  if (!forces(d) && !s.obj[j][sec]) { s.obj[j][sec] = true; noter(s, `${j === 0 ? "Tu prends" : "L'adversaire prend"} l'objectif ${SECTEURS[sec]} !`); }
}
function executer(s: S, j: number, o: Ordre, sec?: number) {
  if (o === "g" || o === "c" || o === "d") combattre(s, j, "gcd".indexOf(o));
  if (o === "general") for (let k = 0; k < 3; k++) combattre(s, j, k, 1);
  if (o === "barrage") combattre(s, j, sec ?? 1, 0, true);
  if (o === "renfort") { const k = sec ?? 1; s.u[j][k].bl++; noter(s, `${j === 0 ? "Tes renforts" : "Des renforts adverses"} arrivent ${SECTEURS[k] === "centre" ? "au centre" : `à ${SECTEURS[k]}`}.`); }
  const i = s.mains[j].indexOf(o); s.mains[j].splice(i, 1); if (s.pioche.length) s.mains[j].push(s.pioche.shift()!);
  s.ordres[j]++;
  const nb = (x: number) => s.obj[x].filter(Boolean).length;
  if (nb(j) >= 2) finir(s, j === 0 ? "Deux objectifs pris : le front adverse cède !" : "L'adversaire perce sur deux secteurs : ton front cède.");
  else if (s.ordres[0] >= MAX && s.ordres[1] >= MAX) finir(s, "Les deux armées s'épuisent : on compte objectifs et forces.");
}
const besoinSecteur = (o: Ordre) => o === "barrage" || o === "renfort";
function iaJouer(s: S) {
  const m = s.mains[1], opts: { o: Ordre; sec?: number; v: number }[] = [];
  for (const o of new Set(m)) {
    if (besoinSecteur(o)) for (let k = 0; k < 3; k++) opts.push({ o, sec: k, v: o === "barrage" ? (forces(s.u[0][k]) ? 1.5 + (forces(s.u[0][k]) <= 2 ? 2 : 0) : -9) : 1 + (forces(s.u[1][k]) < forces(s.u[0][k]) ? 1.5 : 0) });
    else if (o === "general") opts.push({ o, v: [0, 1, 2].filter(k => forces(s.u[1][k]) && forces(s.u[0][k])).length * 1.1 });
    else { const k = "gcd".indexOf(o); opts.push({ o, v: forces(s.u[0][k]) && forces(s.u[1][k]) ? desDe(s.u[1][k]) - desDe(s.u[0][k]) / 2 + (forces(s.u[0][k]) <= 2 ? 3 : 0) : -9 }); }
  }
  const x = hasard(s) < distraction(s.avantage) ? choisir(s, opts) : opts.sort((a, b) => b.v - a.v)[0];
  executer(s, 1, x.o, x.sec);
}
export const MEMOIRE44: DefDuel<S> = {
  id: "memoire44",
  creer(graine, avantage) {
    const s0 = base(graine);
    const s: S = { ...s0, u: [[{ inf: 2, bl: 1 }, { inf: 3, bl: 1 }, { inf: 2, bl: 1 }], [{ inf: 2, bl: 1 }, { inf: 3, bl: 1 }, { inf: 2, bl: 1 }]], mains: [[], []], pioche: [], obj: [[false, false, false], [false, false, false]], ordres: [0, 0], avantage, secteurChoisi: null, ordreEnCours: null };
    s.pioche = (() => { const t = [...PAQUET, ...PAQUET]; for (let i = t.length - 1; i > 0; i--) { const j = entier(s, i + 1); [t[i], t[j]] = [t[j], t[i]]; } return t; })();
    for (let k = 0; k < 4; k++) { s.mains[0].push(s.pioche.shift()!); s.mains[1].push(s.pioche.shift()!); }
    const n = bonus(s, Math.abs(avantage), 3), j = avantage > 0 ? 0 : 1;
    for (let k = 0; k < n; k++) s.u[j][entier(s, 3)].inf++;
    noter(s, n ? `Préparation : ${n} unité${n > 1 ? "s" : ""} d'infanterie en plus ${avantage > 0 ? "pour toi" : "pour l'adversaire"}.` : "Les deux armées se font face sur trois secteurs.");
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    if (s.ordreEnCours) return [0, 1, 2].map(k => `sec:${k}`).concat("annuler");
    return [...new Set(s.mains[0])].map(o => `ordre:${o}`);
  },
  jouer(s0, coup) {
    verifier(MEMOIRE44, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.ordreEnCours = null; return s; }
    const [t, v] = coup.split(":");
    if (t === "ordre" && besoinSecteur(v as Ordre)) { s.ordreEnCours = v as Ordre; return s; }
    s.tour++;
    if (t === "ordre") executer(s, 0, v as Ordre); else { executer(s, 0, s.ordreEnCours!, +v); s.ordreEnCours = null; }
    if (!s.fini) iaJouer(s);
    return s;
  },
  resultat(s) {
    const o = [0, 1].map(j => s.obj[j].filter(Boolean).length);
    if (o[0] >= 2) return 1; if (o[1] >= 2) return 0;
    const f = [0, 1].map(j => s.u[j].reduce((a, x) => a + x.inf + 2 * x.bl, 0));
    return Math.max(0, Math.min(1, 0.5 + 0.25 * (o[0] - o[1]) + 0.25 * (f[0] - f[1]) / Math.max(1, f[0] + f[1])));
  },
  vue(s) {
    const cases = [];
    for (let k = 0; k < 3; k++) cases.push({ t: `${SECTEURS[k].toUpperCase()}${s.obj[1][k] ? " ⚑ perdu" : ""}\nAdversaire : ${s.u[1][k].inf} inf · ${s.u[1][k].bl} blindé${s.u[1][k].bl > 1 ? "s" : ""}`, c: "lui" });
    for (let k = 0; k < 3; k++) cases.push({ t: `Toi : ${s.u[0][k].inf} inf · ${s.u[0][k].bl} blindé${s.u[0][k].bl > 1 ? "s" : ""}${s.obj[0][k] ? "\n⚑ objectif pris" : ""}`, c: "moi", coup: s.ordreEnCours ? `sec:${k}` : undefined });
    const o = [0, 1].map(j => s.obj[j].filter(Boolean).length);
    return {
      statut: s.fini ? s.journal[s.journal.length - 1] : s.ordreEnCours ? `${NOMS_ORDRES[s.ordreEnCours]} : choisis le secteur.` : `Joue une carte d'ordre (${MAX - s.ordres[0]} restantes). Infanterie 1 dé, blindé 2 dés, une chance sur deux de toucher.`,
      scores: [`${o[0]} objectif${o[0] > 1 ? "s" : ""}`, `${o[1]}`], grille: { cols: 3, cases },
      boutons: s.ordreEnCours ? [{ t: "Annuler", coup: "annuler" }] : [...new Set(s.mains[0])].map(x => ({ t: `${NOMS_ORDRES[x]} (×${s.mains[0].filter(y => y === x).length})`, coup: `ordre:${x}` })),
    };
  },
};
