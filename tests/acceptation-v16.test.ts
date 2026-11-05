// v16 : environ 12 événements historiques datés par an.
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { HISTORIQUES } from "../src/moteur/partie";
import { HISTORIQUES_COMPLEMENTS } from "../src/contenu/historiques4";
import donnees from "../src/data/pays2000.json";

const ISO = new Set((Array.isArray(donnees) ? donnees : (donnees as any).pays ?? Object.values(donnees)).map((p: any) => p.iso3 ?? p.iso));

describe("v16 — densité des événements historiques", () => {
  it("1. identifiants uniques, pays connus, famille illustrée, texte daté et sobre", () => {
    const ids = HISTORIQUES.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of HISTORIQUES) {
      for (const iso of h.pays) expect(ISO.has(iso), `${h.id} : ${iso}`).toBe(true);
      if (HISTORIQUES_COMPLEMENTS.includes(h)) expect(existsSync(`src/images/famille_${h.famille}.webp`), `${h.id} : ${h.famille}`).toBe(true);
      expect(h.texte.length, h.id).toBeGreaterThan(40);
      for (const c of h.conditions) if (c.type === "evenement") expect(ids, `${h.id} → ${c.id}`).toContain(c.id);
    }
  });

  it("2. entre 10 et 15 événements réels par an de 2000 à 2025", () => {
    for (let a = 2000; a <= 2025; a++) {
      const n = HISTORIQUES.filter(h => h.annee === a && h.probabilite === undefined).length;
      expect(n, String(a)).toBeGreaterThanOrEqual(10); expect(n, String(a)).toBeLessThanOrEqual(15);
    }
  });

  it("3. aucun effet de croissance sur les événements ajoutés de 2009 à 2024 (déjà dans la trajectoire de référence)", () => {
    const recents = HISTORIQUES_COMPLEMENTS.filter(h => h.annee >= 2009);
    expect(recents.flatMap(h => h.effets).filter(e => e.type === "croissance")).toEqual([]);
  });

  it("4. scénarios projetés : 10 à 14 écrits par an de 2027 à 2035, probabilité moyenne entre 0,6 et 0,9 (8 à 10 ont lieu par an)", () => {
    for (let a = 2027; a <= 2035; a++) {
      const n = HISTORIQUES.filter(h => h.annee === a && h.probabilite !== undefined).length;
      expect(n, String(a)).toBeGreaterThanOrEqual(10); expect(n, String(a)).toBeLessThanOrEqual(14);
    }
    const p = HISTORIQUES.filter(h => h.probabilite !== undefined).map(h => h.probabilite!);
    const m = p.reduce((a, b) => a + b, 0) / p.length;
    expect(m).toBeGreaterThan(0.6); expect(m).toBeLessThan(0.9);
    expect(HISTORIQUES.filter(h => h.probabilite !== undefined).every(h => h.texte.startsWith("Scénario projeté. "))).toBe(true);
  });

  it("5. illustrations du lot ob_7 : chaque image associée existe", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/interface/images.ts", "utf8"), bloc = src.slice(src.indexOf("lot ob_7"));
    const paires = [...bloc.matchAll(/\b(h_[a-z0-9_]+): "([a-z0-9_]+)"/g)];
    expect(paires.length).toBeGreaterThanOrEqual(38);
    const ids = new Set(HISTORIQUES.map(h => h.id));
    for (const [, id, img] of paires) { expect(ids.has(id), id).toBe(true); expect(existsSync(`src/images/${img}.webp`), img).toBe(true); }
  });
});
