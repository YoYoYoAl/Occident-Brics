// Audit des calculs par pays (194) : trajectoire de référence, population, émissions, puis parties complètes avec IA et événements.
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import trajectoires from "../../src/data/trajectoires.json";
import { creerPartie, finRound, pibReference, alignement, type EtatPartie } from "../../src/moteur/partie";
const TRAJ = trajectoires.pays as Record<string, { pib: number[]; population: number[]; co2: number[] }>;
const popRef = (iso: string, round: number) => { const t = TRAJ[iso].population; let v = t[0]; for (let r = 0; r < round; r++) { const k = Math.min(Math.floor(r / 4), t.length - 2); v *= Math.pow(t[k + 1] / t[k], 0.25); } return v; };
const pct = (x: number) => (100 * x).toFixed(2) + " %";
it("audit par pays", () => {
  const out: string[] = [];
  // 1. Référence pure : sans IA ni événements, chaque pays doit suivre sa trajectoire.
  let e: EtatPartie = creerPartie(1, null, { generiques: false, ia: false, format: "2000-2035" });
  const isos = Object.keys(e.pays); out.push(`Pays simulés : ${isos.length}`);
  const errPib: Record<string, number> = {}, errData: Record<string, number> = {}, errPop: Record<string, number> = {};
  for (let r = 0; r < 143 && !e.termine; r++) {
    for (const i of isos) {
      const p = e.pays[i]; errPib[i] = Math.max(errPib[i] ?? 0, Math.abs(p.pib / pibReference(i, e.round) - 1));
      const k = (e.round - 2) / 4; if (Number.isInteger(k) && k < 23 && Number.isFinite(TRAJ[i].pib[k])) errData[i] = Math.max(errData[i] ?? 0, Math.abs(p.pib / TRAJ[i].pib[k] - 1));
      errPop[i] = Math.max(errPop[i] ?? 0, Math.abs(p.population / popRef(i, e.round) - 1));
    }
    e = finRound(e);
  }
  const pire = (m: Record<string, number>, n = 8) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([i, v]) => `${i} ${pct(v)}`).join(", ");
  out.push(`1. Référence (sans IA ni événements), écart max PIB / trajectoire de référence : ${pire(errPib)}`);
  out.push(`   écart max PIB / données réelles (années 2000-2022, milieu d'année ; inclut le décalage d'un demi-an de croissance au départ) : ${pire(errData)}`);
  out.push(`   écart max population / données : ${pire(errPop)}`);
  out.push(`   pays au-delà de 1 % sur le PIB : ${Object.values(errPib).filter(v => v > 0.01).length}, au-delà de 1 % sur la population : ${Object.values(errPop).filter(v => v > 0.01).length}`);
  // 2. Parties complètes avec IA et événements : bande de tolérance, à-coups, bornes.
  for (const g of [3, 4, 5]) {
    let x = creerPartie(g, null, { generiques: true, ia: true, format: "2000-2035" });
    const horsBande: Record<string, number> = {}, sauts: Record<string, string> = {}, ratioMax: Record<string, number> = {}; let envHors = 0, stabExt = 0, alignHors = 0, popMin = 1;
    for (let r = 0; r < 160 && !x.termine; r++) {
      const av = structuredClone(x.pays); x = finRound(x);
      for (const i of isos) {
        const p = x.pays[i], q = av[i].pib > 0 ? p.pib / av[i].pib - 1 : 0, d = Math.log(p.pib / pibReference(i, x.round));
        if (Math.abs(d) > 0.2) horsBande[i] = (horsBande[i] ?? 0) + 1;
        ratioMax[i] = Math.max(ratioMax[i] ?? 0, Math.abs(d));
        if (Math.abs(q) > 0.12 && !sauts[i]) sauts[i] = `${pct(q)} au trimestre ${x.round}`;
        if (p.environnement < 0 || p.environnement > 100) envHors++;
        if (p.stabilite <= 0.01 || p.stabilite >= 99.99) stabExt++;
        const a = alignement(x, i); if (!(a >= -1 && a <= 1)) alignHors++;
        popMin = Math.min(popMin, p.population / popRef(i, x.round));
      }
    }
    out.push(`2. Partie ${g} (IA + événements) : ${x.resultat}. Pays à plus de 20 % (log) de la référence au moins un trimestre : ${Object.keys(horsBande).length} (${Object.entries(horsBande).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([i, n]) => `${i} ${n} trim.`).join(", ")})`);
    const fin = isos.map(i => Math.log(x.pays[i].pib / pibReference(i, x.round)));
    out.push(`   en fin de partie : |écart| > 20 % : ${fin.filter(d => Math.abs(d) > 0.2).length} pays, > 50 % : ${fin.filter(d => Math.abs(d) > 0.5).length} ; PIB / référence min ${Math.exp(Math.min(...fin)).toFixed(2)}, max ${Math.exp(Math.max(...fin)).toFixed(2)} ; USA ${(x.pays.USA.pib / pibReference("USA", x.round)).toFixed(3)}, CHN ${(x.pays.CHN.pib / pibReference("CHN", x.round)).toFixed(3)}`);
    out.push(`   écart log max au PIB de référence : ${Object.entries(ratioMax).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([i, v]) => `${i} ${v.toFixed(3)}`).join(", ")}`);
    out.push(`   à-coups trimestriels > 12 % : ${Object.keys(sauts).length} pays (${Object.entries(sauts).slice(0, 6).map(([i, s]) => `${i} ${s}`).join(" ; ")})`);
    out.push(`   environnement hors 0-100 : ${envHors} ; stabilité collée à 0 ou 100 (pays × trimestres) : ${stabExt} ; alignement hors [−1, 1] : ${alignHors} ; population min / référence : ${popMin.toFixed(4)}`);
  }
  writeFileSync("tests/audit/rapport-pays.txt", out.join("\n"));
}, 1_500_000);
