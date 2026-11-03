// Retour du 3 novembre 2026 : « la plupart des cartes n'ont pas d'image ». Intégration du lot ob_10 et images de repli.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import * as M from "../src/v2/moteur";
import * as IE from "../src/v2/images-ev";

const fichiers = new Set([...readdirSync("src/v2/images"), ...readdirSync("src/images")].map(f => f.replace(".webp", "")));
const ui = readFileSync("src/v2/ui.ts", "utf8");
const exclues = new Set(JSON.parse(ui.match(/const EXCLUES = new Set\((\[.*?\])\)/)![1]) as string[]);
const dispo = (n: string) => fichiers.has(n) && !exclues.has(n);
const anneeIA = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); };

describe("Images des événements", () => {
  it("1. chaque scène dédiée correspond à un événement du jeu ; au moins 450 événements écrits en ont une", () => {
    const ids = new Set(M.HISTORIQUES_V2.map(h => h.id));
    const ev = [...fichiers].filter(f => f.startsWith("ev_")).map(f => f.slice(3));
    expect(ev.filter(i => !ids.has(i))).toEqual([]);
    expect(ev.length).toBeGreaterThanOrEqual(450);
  });
  it("2. sur une partie complète, au moins 70 % des événements ont une image, jamais deux fois la même la même année", () => {
    const e = M.creerPartieV2(3, null as any), pris = new Set<string>(); let total = 0, avec = 0;
    for (let k = 0; k < 51 && !e.defaite; k++) {
      anneeIA(e); const cetteAnnee = new Set<string | undefined>();
      for (const x of e.evenements) { total++; const n = IE.choisirImage(IE.imagesCandidates(x.id, dispo), pris, cetteAnnee); if (n) { avec++; expect(cetteAnnee.has(n)).toBe(false); cetteAnnee.add(n); pris.add(n); } else if (process.env.DBG) { const p = x.id.replace(/_[A-Z]{3}.*$/, "").replace(/_?\d{4}.*$/, ""); (globalThis as any).m ??= {}; (globalThis as any).m[p] = ((globalThis as any).m[p] ?? 0) + 1; } }
      if (e.annee >= M.ANNEE_FIN) break; M.anneeSuivante(e);
    }
    if (process.env.DBG) console.log(Object.entries((globalThis as any).m).sort((a: any, b: any) => b[1] - a[1]).slice(0, 30));
    console.log(`événements : ${total}, avec image : ${avec} (${Math.round(avec / total * 100)} %)`);
    expect(avec / total).toBeGreaterThan(0.7); // 75 % : élections et coups de force (environ 8 par an) manquent encore d'images variées (lot ob_18)
  }, 60_000);
  it("3. une scène dédiée ne sert qu'une fois par partie", () => {
    const c = IE.imagesCandidates("h_afghanistan", dispo); expect(c[0]).toBe("ev_h_afghanistan");
    expect(IE.choisirImage(c, new Set(["ev_h_afghanistan"]), new Set())).not.toBe("ev_h_afghanistan");
  });
  it("4. le choix d'image ne touche pas au tirage du jeu", () => {
    const src = readFileSync("src/v2/images-ev.ts", "utf8");
    expect(src).not.toMatch(/tirer\(|Math\.random/);
  });
});
