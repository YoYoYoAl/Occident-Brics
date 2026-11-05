import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { creerPartie, agir, peutAgir, ACTIONS, AIDES_ACTIONS, apercuAction, type TypeAction, type EtatPartie } from "../../src/moteur/partie";
const r1 = (x: number) => Math.round(x * 100) / 100;
it("effets réels des actions", () => {
  const out: string[] = [];
  for (const t of Object.keys(ACTIONS) as TypeAction[]) {
    let trouve = false;
    for (const g of [11, 12, 13]) {
      const e: EtatPartie = creerPartie(g, "OCC", { generiques: false, ia: false });
      e.camps.OCC.pa = 20; e.camps.OCC.budget = 100; e.camps.OCC.cp = 80;
      const isos = Object.keys(e.pays).filter(i => !peutAgir(e, "OCC", t, i));
      if (!isos.length) continue;
      const echant = isos.slice(0, 3);
      for (const iso of echant) {
        const x = agir(e, "OCC", t, iso), p0 = e.pays[iso], p1 = x.pays[iso];
        const d: string[] = [];
        for (const c of ["OCC", "CHN"] as const) for (const k of ["p", "e", "m", "c"] as const) { const v = p1.influence[c][k] - p0.influence[c][k]; if (Math.abs(v) > 1e-6) d.push(`${c}.${k} ${r1(v)} (de ${r1(p0.influence[c][k])})`); }
        const st = p1.stabilite - p0.stabilite; if (Math.abs(st) > 1e-6) d.push(`stab ${r1(st)}`);
        for (const [n, a, b] of [["tension", e.tension, x.tension], ["cp", e.camps.OCC.cp, x.camps.OCC.cp], ["budget", e.camps.OCC.budget, x.camps.OCC.budget], ["pa", e.camps.OCC.pa, x.camps.OCC.pa]] as [string, number, number][]) if (Math.abs(b - a) > 1e-6) d.push(`${n} ${r1(b - a)}`);
        const att = x.attente.length - e.attente.length; if (att) d.push(`différés ${att} : ` + x.attente.slice(e.attente.length).map(a => `${a.effet.type}${(a.effet as {canal?: string}).canal ?? ""} ${r1((a.effet as {valeur?: number}).valeur ?? 0)}${a.cache ? " caché" : ""}`).join(", "));
        const extra = ["interventions", "garanties", "prets", "concessions", "conflits"].map(k => [k, ((x as never)[k] as unknown[] ?? []).length - ((e as never)[k] as unknown[] ?? []).length]).filter(([, v]) => v).map(([k, v]) => `${k}+${v}`);
        const ap = apercuAction(e, "OCC", t, iso);
        out.push(`${t} ${iso}: ${d.join(" ; ")} ${extra.join(" ")} | aperçu ${JSON.stringify(ap && Object.fromEntries(Object.entries(ap).map(([k, v]) => [k, typeof v === "number" ? r1(v) : v])))}`);
      }
      out.push(`  AIDE: ${ACTIONS[t].aide ?? AIDES_ACTIONS[t] ?? "(aucune)"} | coût annoncé pa ${ACTIONS[t].pa} budget ${ACTIONS[t].budget}`);
      trouve = true; break;
    }
    if (!trouve) out.push(`${t}: AUCUNE cible possible en 2000 (ok si conditions)`);
  }
  writeFileSync("tests/audit/rapport-actions.txt", out.join("\n"));
});
