// Tests d'acceptation des sons : chaque famille d'événements a un bruitage existant, les musiques sont présentes et créditées.
import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { bruitage, bruitagesDe, tirer, MUSIQUES, pisteMusique, musiqueEre, aUnHymne, type Musique } from "../src/interface/sons";
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { FAMILLES } from "../src/contenu/generiques";

// CSV séparé par « ; », champs entre guillemets possibles (avec « ; », sauts de ligne ou "" à l'intérieur)
function lireCsv(texte: string): string[][] {
  const lignes: string[][] = []; let ligne: string[] = [], champ = "", guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) { if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') guillemets = false; else champ += c; }
    else if (c === '"') guillemets = true;
    else if (c === ";") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && texte[i + 1] === "\n") i++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; }
    else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

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
  it("4. listes de lecture : chaque piste existe (< 1,5 Mo), au moins 2 pistes par ambiance de carte, dossier < 50 Mo", () => {
    let total = 0;
    for (const m of Object.keys(MUSIQUES) as Musique[]) {
      if (m !== "menu") expect(MUSIQUES[m], m).toBeGreaterThanOrEqual(2);
      for (let i = 1; i <= MUSIQUES[m]; i++) {
        const p = `public/${pisteMusique(m, i)}`;
        expect(existsSync(p), p).toBe(true);
        expect(statSync(p).size, p).toBeLessThan(1.5e6); total += statSync(p).size;
      }
    }
    expect(total).toBeLessThan(50e6);
  });
  it("4b. thème de carte selon l'ère", () => {
    expect([musiqueEre(2000), musiqueEre(2007), musiqueEre(2008), musiqueEre(2019), musiqueEre(2020), musiqueEre(2035)]).toEqual(["ere1", "ere1", "ere2", "ere2", "ere3", "ere3"]);
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
  it("7. hymnes : fichier présent (< 1 Mo) et licence libre pour chaque hymne, ≥ 90 % des 194 pays, les deux leaders présents", () => {
    const hymnes = JSON.parse(readFileSync("src/data/hymnes.json", "utf8")) as Record<string, string>;
    const lignes = lireCsv(readFileSync("public/hymnes/hymnes.csv", "utf8")).slice(1);
    const licences = Object.fromEntries(lignes.map(c => [c[0], c[5]]));
    for (const iso of Object.keys(hymnes)) {
      const p = `public/hymnes/${iso}.mp3`;
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size, p).toBeLessThan(1e6);
      expect(licences[iso], iso).toMatch(/public domain|cc0|cc by/i);
    }
    expect(Object.keys(hymnes).length / 194).toBeGreaterThanOrEqual(0.9);
    for (const leader of ["USA", "CHN"]) expect(aUnHymne(leader), leader).toBe(true);
  });
});
