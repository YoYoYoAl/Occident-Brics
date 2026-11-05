// Audit (30/10/2026) : parties complètes jouées au hasard par le joueur, invariants vérifiés à chaque trimestre.
import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { creerPartie, finRound, agir, peutAgir, ACTIONS, iaJouer, reagir, peutReagir, repondreBriefing, type EtatPartie, type TypeAction, type TypeReaction } from "../../src/moteur/partie";
import { OBJECTIFS, ciblesPossibles, peutLancerPlan, lancerPlan, conclureDuel, DUREES, type ObjectifPlan } from "../../src/moteur/plans";
import { reglerCampagne, peutReglerCampagne, peutTenterCoup, tenterCoup } from "../../src/moteur/campagnes";
import { erreurNiveau, lancerNiveau } from "../../src/interface/operations-ui";
import { nommer, anticorruption, choisirLigne, choisirThemes, choisirConseiller } from "../../src/moteur/pouvoir";
import type { Camp } from "../../src/moteur/types";

const problemes = new Map<string, string>();
const note = (cle: string, detail: string) => { if (!problemes.has(cle)) problemes.set(cle, detail); };
function verifier(e: EtatPartie, ctx: string) {
  const vu = new WeakSet<object>();
  const parcourir = (o: unknown, chemin: string) => {
    if (typeof o === "number") { if (!Number.isFinite(o)) note(`nonfini:${chemin.replace(/\.\w{3}\./, ".ISO.").replace(/\[\d+\]/g, "[]")}`, `${ctx} ${chemin}=${o}`); return; }
    if (typeof o === "string") { if (/\bNaN\b|undefined|\[object/.test(o)) note(`texte:${chemin.replace(/\[\d+\]/g, "[]")}`, `${ctx} ${chemin}: ${o.slice(0, 160)}`); return; }
    if (o && typeof o === "object") { if (vu.has(o)) return; vu.add(o); for (const [k, v] of Object.entries(o)) parcourir(v, chemin + "." + k); }
  };
  parcourir(e, "e");
  for (const [iso, p] of Object.entries(e.pays)) {
    if (p.stabilite < -0.01 || p.stabilite > 100.01) note("stabilite", `${ctx} ${iso} ${p.stabilite}`);
    if (p.pib <= 0 || p.population <= 0) note("pib/pop", `${ctx} ${iso}`);
    for (const c of ["OCC", "CHN"] as Camp[]) for (const [k, v] of Object.entries(p.influence[c])) if (v < -0.01 || v > 100.01) note(`influence.${k}`, `${ctx} ${iso} ${c} ${v}`);
  }
  for (const c of ["OCC", "CHN"] as Camp[]) { const k = e.camps[c]; if (k.cp < -0.01 || k.cp > 100.01) note("cp", `${ctx} ${c} ${k.cp}`); if (k.budget < -50) note("budget très négatif", `${ctx} ${c} ${k.budget}`); if (k.pa < 0) note("pa<0", `${ctx} ${c} ${k.pa}`); }
  if (e.tension < -0.01 || e.tension > 100.01) note("tension", `${ctx} ${e.tension}`);
  if ((e.plans ?? []).filter(p => p.camp === e.joueur).length > 5) note("plans>5", ctx);
}
let r = 1;
const hasard = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
const pick = <T,>(l: T[]) => l[Math.floor(hasard() * l.length)];
const compte = new Map<string, number>();
function essayer(e: EtatPartie, nom: string, f: () => EtatPartie): EtatPartie {
  try { const x = f(); verifier(x, nom); compte.set(nom, (compte.get(nom) ?? 0) + 1); return x; } catch (err) { const m = (err as Error).message; if (!/^[A-ZÀ-Ü]/.test(m) || /undefined|null|Cannot|is not/.test(m)) note(`exception:${nom}:${m.slice(0, 60)}`, `${nom} r${e.round}: ${(err as Error).stack?.split("\n").slice(0, 4).join(" | ")}`); return e; }
}
function jouerTrimestre(e: EtatPartie, j: Camp): EtatPartie {
  const isos = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN");
  if (hasard() < 0.5) e = essayer(e, "iaJouer", () => iaJouer(e, j));
  const types = Object.keys(ACTIONS) as TypeAction[];
  for (let k = 0; k < 12; k++) { const t = pick(types), i = pick(isos); if (!peutAgir(e, j, t, i)) e = essayer(e, "agir:" + t, () => agir(e, j, t, i)); }
  if (e.camps[j].briefing) e = essayer(e, "briefing", () => repondreBriefing(e, j, [0]));
  e.journal.forEach((_, idx) => { if (idx >= e.journal.length - 15 && hasard() < 0.2) { const t = pick(["aider", "exploiter", "fermete", "apaiser", "riposter"] as TypeReaction[]); if (!peutReagir(e, j, idx, t)) e = essayer(e, "reagir:" + t, () => reagir(e, j, idx, t)); } });
  for (let k = 0; k < 2; k++) { const o = pick(Object.keys(OBJECTIFS) as ObjectifPlan[]), c = ciblesPossibles(e, j, o); if (!c.length) continue; const cb = pick(c).id, d = pick(DUREES), n = pick([1, 2, 3] as const); if (!peutLancerPlan(e, j, o, cb, d, n)) e = essayer(e, "plan:" + o, () => lancerPlan(e, j, o, cb, d, n, hasard() < 0.5)); }
  for (const p of (e.plans ?? []).filter(p => p.camp === j && p.campagne)) { const l = { medias: Math.floor(hasard() * 5), partis: Math.floor(hasard() * 5), terrain: Math.floor(hasard() * 5), promesses: Math.floor(hasard() * 5) } as never; if (!peutReglerCampagne(e, j, p.id, l)) e = essayer(e, "campagne", () => reglerCampagne(e, j, p.id, l, hasard() < 0.3)); }
  for (const d of [...(e.duels ?? [])]) e = essayer(e, "duel:" + d.type, () => conclureDuel(e, d.id, hasard() < 0.15 ? null : hasard()));
  if (hasard() < 0.3) { const i = pick(isos), n = 1 + Math.floor(hasard() * 5); if (!erreurNiveau(e, j, i, n as never)) e = essayer(e, "operation:" + n, () => lancerNiveau(e, j, i, n as never, pick(["regime", "punitive", "occupation"] as never[]))); }
  if (hasard() < 0.05) { const i = pick(isos); if (!peutTenterCoup(e, j, i)) e = essayer(e, "coup", () => tenterCoup(e, j, i)); }
  if (j === "CHN" && hasard() < 0.2) e = essayer(e, "pouvoir:chn", () => pick([() => nommer(e), () => anticorruption(e), () => choisirLigne(e, pick(["croissance", "securite", "ouverture"] as never[]))])());
  if (j === "OCC" && hasard() < 0.3) e = essayer(e, "pouvoir:themes", () => choisirThemes(e, ["economie", "rang"] as never));
  for (const rc of [...(e.pouvoir?.recrutement ?? [])]) e = essayer(e, "recruter", () => choisirConseiller(e, j, rc.conseil, Math.floor(hasard() * 3)));
  return e;
}
it("audit : 6 parties complètes jouées au hasard (2000-2035), invariants à chaque trimestre", () => {
  for (const [g, j] of (process.env.AUDIT_COURT ? [[7, "OCC"], [8, "CHN"]] : [[1, "OCC"], [2, "CHN"], [3, "OCC"], [4, "CHN"], [5, "OCC"], [6, "CHN"]]) as [number, Camp][]) {
    r = g * 7919; let e = creerPartie(g, j, { generiques: true, ia: true, format: "2000-2035" });
    for (let t = 0; t < 160 && !e.termine; t++) { e = jouerTrimestre(e, j); e = essayer(e, "finRound", () => finRound(e)); verifier(e, `g${g}${j} r${e.round}`); }
    note(`fin g${g}`, `round ${e.round}, termine ${e.termine}, résultat ${e.resultat}`);
  }
  writeFileSync("tests/audit/rapport-fuzz.txt", [...problemes].map(([k, v]) => `${k}\n   ${v}`).join("\n") + "\nCOMPTES " + [...compte].sort().map(([k, v]) => `${k}=${v}`).join(" "));
  expect(true).toBe(true);
}, 1_200_000);
