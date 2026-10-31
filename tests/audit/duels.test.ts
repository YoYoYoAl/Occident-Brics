// Audit des 22 duels : 300 parties par duel (coups au hasard, avec l'aide, avantage −1 à +1).
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { REGLES } from "../../src/duels/index";
import { coupDemo } from "../../src/interface/duel-anim";
it("audit duels", () => {
  const out: string[] = [];
  for (const [id, def] of Object.entries(REGLES)) {
    const pb = new Map<string, string>(); const res: Record<string, number[]> = { hasard: [], aide: [] }; let coupsMax = 0, sansCoup = 0;
    for (let g = 1; g <= 300; g++) {
      const mode = g % 2 ? "hasard" : "aide", av = ((g % 5) - 2) / 2;
      let s; try { s = def.creer(g * 101, av, { noms: ["Alpha", "Bravo", "Charlie", "Delta"], cible: "Alpha" }); } catch (e) { pb.set("creer", (e as Error).message); continue; }
      let n = 0, r = g;
      while (!s.fini && n < 2000) {
        let cs: string[];
        try { cs = def.coups(s); def.vue(s); } catch (e) { pb.set("coups/vue:" + (e as Error).message.slice(0, 50), `g${g} t${n}`); break; }
        if (!cs.length) { sansCoup++; pb.set("aucun coup légal alors que non fini", `g${g} t${n} statut=${def.vue(s).statut}`); break; }
        r = (r * 16807) % 2147483647;
        let c = cs[r % cs.length];
        if (mode === "aide") { let k = r; const h = () => { k = (k * 48271) % 2147483647; return k / 2147483647; }; c = coupDemo(def, s, h) ?? c; }
        if (cs.includes("vu")) c = "vu";
        try { s = def.jouer(s, c); } catch (e) { pb.set("jouer:" + (e as Error).message.slice(0, 60), `g${g} t${n} coup=${c}`); break; }
        n++;
      }
      coupsMax = Math.max(coupsMax, n);
      if (!s.fini) { pb.set("ne finit pas en 2000 coups", `g${g}`); continue; }
      const x = def.resultat(s); if (!(x >= 0 && x <= 1)) pb.set("résultat hors [0,1]", `${x}`); else res[mode].push(x);
      if (def.coups(s).length) pb.set("coups proposés après la fin", `g${g}`);
    }
    const moy = (l: number[]) => l.length ? (l.reduce((a, b) => a + b, 0) / l.length).toFixed(2) : "-";
    const vic = (l: number[]) => l.length ? Math.round(100 * l.filter(x => x >= 0.6).length / l.length) + "%" : "-";
    out.push(`${id.padEnd(13)} hasard moy ${moy(res.hasard)} vict ${vic(res.hasard)} | aide moy ${moy(res.aide)} vict ${vic(res.aide)} | coups max ${coupsMax} ${pb.size ? "PROBLÈMES: " + [...pb].map(([k, v]) => `${k} (${v})`).join(" ; ") : ""}`);
  }
  writeFileSync("tests/audit/rapport-duels.txt", out.join("\n"));
}, 900_000);
