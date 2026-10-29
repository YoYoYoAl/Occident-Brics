// Tests d'acceptation des sons : chaque famille d'événements a un bruitage existant, les musiques sont présentes et créditées.
import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { bruitage, bruitagesDe, tirer, MUSIQUES, pisteMusique, type Musique } from "../src/interface/sons";
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { FAMILLES } from "../src/contenu/generiques";

describe("Sons et musiques", () => {
  it("1. chaque famille (générique et historique) a un bruitage dont le fichier existe", () => {
    const familles = new Set([...FAMILLES.map(f => f.id), ...HISTORIQUES_ERE1.map(h => h.famille)]);
    for (const f of familles) {
      const nom = bruitage(f);
      expect(nom, f).not.toBeNull();
      expect(existsSync(`src/sons/${nom}.mp3`), `${f} → ${nom}`).toBe(true);
    }
    expect(bruitage("inconnue")).toBeNull();
  });
  it("2. sept musiques de base présentes, chacune < 1,5 Mo, licences CC0 documentées ; jingles présents", () => {
    for (const m of ["menu", "carte", "calme", "tension", "guerre", "victoire", "defaite"]) {
      const p = `public/musiques/${m}.mp3`;
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size).toBeLessThan(1.5e6);
    }
    expect(readFileSync("public/musiques/LICENCES.md", "utf8")).toMatch(/CC0/);
    for (const j of ["jingle_victoire", "jingle_defaite"]) expect(existsSync(`src/sons/${j}.mp3`)).toBe(true);
  });
  it("3. variabilité : chaque bruitage possible de chaque famille existe, et la moitié des familles en a au moins 2", () => {
    const familles = [...new Set([...FAMILLES.map(f => f.id), ...HISTORIQUES_ERE1.map(h => h.famille)])];
    let multiples = 0;
    for (const f of familles) {
      const noms = bruitagesDe(f);
      for (const n of noms) expect(existsSync(`src/sons/${n}.mp3`), `${f} → ${n}`).toBe(true);
      const fichiers = noms.reduce((t, n) => t + readdirSync("src/sons").filter(x => x === `${n}.mp3` || new RegExp(`^${n}_\\d+\\.mp3$`).test(x)).length, 0);
      if (fichiers >= 2) multiples++;
    }
    expect(multiples / familles.length).toBeGreaterThanOrEqual(0.5);
  });
  it("4. listes de lecture : chaque piste existe (< 1,5 Mo), au moins 2 pistes par ambiance de carte, dossier < 20 Mo", () => {
    let total = 0;
    for (const m of Object.keys(MUSIQUES) as Musique[]) {
      if (m !== "menu") expect(MUSIQUES[m], m).toBeGreaterThanOrEqual(2);
      for (let i = 1; i <= MUSIQUES[m]; i++) {
        const p = `public/${pisteMusique(m, i)}`;
        expect(existsSync(p), p).toBe(true);
        expect(statSync(p).size, p).toBeLessThan(1.5e6); total += statSync(p).size;
      }
    }
    expect(total).toBeLessThan(20e6);
  });
  it("5. tirage sans répétition immédiate, qui couvre toutes les variantes", () => {
    const liste = ["a", "b", "c"], vus = new Set<string>();
    let precedent: string | null = null;
    for (let k = 0; k < 300; k++) { const x = tirer(liste, "test"); expect(x).not.toBe(precedent); vus.add(x!); precedent = x; }
    expect(vus.size).toBe(3);
    expect(tirer(["seul"], "test-seul")).toBe("seul"); expect(tirer(["seul"], "test-seul")).toBe("seul");
    expect(tirer([], "vide")).toBeNull();
  });
  it("6. poids : les sons intégrés au fichier unique restent sous 1,5 Mo", () => {
    const total = readdirSync("src/sons").filter(f => f.endsWith(".mp3")).reduce((t, f) => t + statSync(`src/sons/${f}`).size, 0);
    expect(total).toBeLessThan(1.5e6);
  });
});
