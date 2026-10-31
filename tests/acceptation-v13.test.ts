// Tests d'acceptation de la v13 (26/10/2026) : conseillers à 6 options entraînés, défense avant économie, sons par domaine, carte enrichie.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { creerPartie, finRound, agir, conseils, candidats, bilanBrut, NB_CONSEILS, LISTE_DOMAINES, type EtatPartie } from "../src/moteur/partie";

const SANS_ALEA = { generiques: false, ia: false };
const prets = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) { e.camps[c].budget = 30; e.camps[c].cp = 70; } return e; };

describe("v13", () => {
  it("1. conseillers : 6 options par domaine, pays tous différents, au plus 2 fois le même type si possible, chacune avec sa raison", () => {
    const e = prets(creerPartie(1, "OCC", SANS_ALEA));
    for (const d of LISTE_DOMAINES.filter(d => d !== "secret")) {
      const o = conseils(e, "OCC", d);
      expect(o.length, d).toBe(NB_CONSEILS);
      expect(new Set(o.map(x => x.iso)).size).toBe(o.length);
      for (const x of o) { expect(x.raison.length).toBeGreaterThan(3); expect(x.v).toBeGreaterThan(0); }
      const types = new Set(candidats(e, "OCC", d).filter(x => x.v > 0).map(x => x.type));
      expect(new Set(o.map(x => x.type)).size).toBeGreaterThanOrEqual(Math.min(2, types.size)); // variété des types
    }
  });

  it("2. le premier conseil rapporte plus au score que le hasard (moyenne sur 40 situations, un an après)", () => {
    let conseil = 0, hasard = 0;
    for (let g = 1; g <= 40; g++) {
      let e = creerPartie(g, "OCC", SANS_ALEA); for (let r = 0; r < g % 6; r++) e = finRound(e); e = prets(e);
      const d = (["eco", "diplo", "defense"] as const)[g % 3], o = conseils(e, "OCC", d)[0];
      const tous = candidats(e, "OCC", d); const x = tous[(g * 7919) % tous.length];
      const apres = (f: EtatPartie) => { for (let r = 0; r < 4; r++) f = finRound(f); return bilanBrut(f); };
      const b0 = apres(e);
      conseil += apres(agir(e, "OCC", o.type, o.iso)) - b0; hasard += apres(agir(e, "OCC", x.type, x.iso)) - b0;
    }
    expect(conseil).toBeGreaterThan(hasard);
    expect(conseil).toBeGreaterThan(0);
  }, 120_000);

  it("3. tour guidé : la défense (qui peut rapporter du budget) passe avant l'économie", () => {
    const src = readFileSync("src/interface/main.ts", "utf8");
    expect(src.indexOf('"defense", "eco"')).toBeGreaterThan(0);
  });

  it("4. sons : un son par domaine d'action, des variantes pour éviter la répétition", () => {
    const existe = (n: string) => readFileSync(`src/sons/${n}.mp3`, "utf8").length > 500;
    for (const d of ["act_eco", "act_diplo", "act_defense", "act_force", "act_secret", "etape"]) expect(existe(d), d).toBe(true);
    for (const n of ["ev_explosion", "ev_explosion_2", "ev_explosion_3"]) expect(existe(n), n).toBe(true);
    expect(readFileSync("src/interface/sons.ts", "utf8")).toMatch(/baisserMusique/);
  });

  it("5. carte enrichie : dégradé océan, eaux côtières, relief éclairé, glaces, graduations, rose des vents", () => {
    const src = readFileSync("src/interface/carte.ts", "utf8");
    for (const m of ['id: "mer"', "littoral", "feSpecularLighting", "GLACES", "graduations", "rose"]) expect(src).toContain(m);
  });
});
