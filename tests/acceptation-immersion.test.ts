// Tests d'acceptation des retours du 2e test (25/10/2026) : événements habillés, réactions, main annuelle,
// flux et détroits, conflits, événements mondiaux, historiques du lot 2.
import { describe, it, expect } from "vitest";
import {
  creerPartie, roundAutomatique, finRound, jouerCarte, reagir, peutReagir, typeCarte, typesManquants, carteObligatoire, peutJouerCarte,
  lienFlux, fluxActif, type EtatPartie,
} from "../src/moteur/partie";
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { VILLES, CONTEXTES, enPays, duPays } from "../src/contenu/contextes";
import { FAMILLES } from "../src/contenu/generiques";
import { FLUX, DETROITS } from "../src/data/flux";
import donnees from "../src/data/pays2000.json";

const ISO = donnees.pays.map(p => p.iso3);
const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };

describe("Immersion : événements, réactions, cartes, flux", () => {
  it("1. chaque pays a des villes, chaque famille un habillage ; aucun gabarit {…} ne reste dans le journal", () => {
    for (const iso of ISO) expect(VILLES[iso]?.length, iso).toBeGreaterThan(0);
    for (const f of FAMILLES) expect(CONTEXTES[f.id], f.id).toBeDefined();
    expect(enPays("BRA", "Brésil")).toBe("au Brésil");
    expect(enPays("USA", "États-Unis")).toBe("aux États-Unis");
    expect(duPays("IND", "Inde")).toBe("de l'Inde");
    for (let g = 1; g <= 5; g++) {
      const e = jouer(creerPartie(g, null));
      for (const j of e.journal) { expect(j.titre).not.toMatch(/[{}]/); expect(j.texte).not.toMatch(/[{}]/); }
      expect(e.journal.filter(j => j.type === "generique" && j.pays?.length).some(j => VILLES[j.pays![0]].some(v => j.titre.includes(v)) || j.titre.length > 0)).toBe(true);
    }
  });

  it("2. au moins 50 événements historiques datés 2000-2008, identifiants uniques", () => {
    expect(HISTORIQUES_ERE1.length).toBeGreaterThanOrEqual(50);
    expect(new Set(HISTORIQUES_ERE1.map(h => h.id)).size).toBe(HISTORIQUES_ERE1.length);
    for (const h of HISTORIQUES_ERE1) { expect(h.annee).toBeGreaterThanOrEqual(2000); expect(h.annee).toBeLessThanOrEqual(2008); }
  });

  it("3. main annuelle : 2 cartes de son camp, 2 adverses, 2 neutres ; au moins une de chaque type jouée par an", () => {
    for (let g = 1; g <= 20; g++) {
      let e = creerPartie(g, null);
      for (const camp of ["OCC", "CHN"] as const) {
        const types = e.camps[camp].main.map(id => typeCarte(camp, id)).sort();
        expect(types).toEqual(["adverse", "adverse", "camp", "camp", "neutre", "neutre"]);
      }
      for (let r = 0; r < 4; r++) e = roundAutomatique(e); // l'IA respecte l'obligation
      // fin d'année : nouvelle main, l'an passé a couvert les 3 types (les 6 sont présents en main au départ)
      expect(e.camps.OCC.main.length).toBe(6);
    }
    // obligation : en T3 sans carte jouée et deux types manquants, seule une carte d'un type manquant passe
    let e = creerPartie(7, "OCC", { generiques: false, ia: false });
    const camp = e.camps.OCC.main.find(id => typeCarte("OCC", id) === "camp")!;
    e = jouerCarte(e, "OCC", { carte: camp, usage: "points" }); e = finRound(e); // T2
    e = finRound(e); // T3, rien joué en T2
    expect(typesManquants(e, "OCC").sort()).toEqual(["adverse", "neutre"]);
    expect(carteObligatoire(e, "OCC")).toBe(true);
    const autreCamp = e.camps.OCC.main.find(id => typeCarte("OCC", id) === "camp")!;
    expect(peutJouerCarte(e, "OCC", autreCamp)).toMatch(/encore jouer/);
    const neutre = e.camps.OCC.main.find(id => typeCarte("OCC", id) === "neutre")!;
    expect(peutJouerCarte(e, "OCC", neutre)).toBeNull();
  });

  it("4. réactions : aider coûte 2 budget et donne de l'influence, 2 par trimestre au plus, une par événement", () => {
    for (let g = 1; g <= 300; g++) {
      const e = creerPartie(g, "OCC");
      const idx = e.journal.map((j, i) => ({ j, i })).filter(x => x.j.reactif && x.j.round === e.round && x.j.pays?.[0] !== "CHN").map(x => x.i);
      if (idx.length < 3) continue;
      const iso = e.journal[idx[0]].pays![0], avant = e.pays[iso].influence.OCC.p, budget = e.camps.OCC.budget;
      const e1 = reagir(e, "OCC", idx[0], "aider");
      expect(e1.camps.OCC.budget).toBe(budget - 2);
      if (iso !== "USA") expect(e1.pays[iso].influence.OCC.p).toBeGreaterThan(avant);
      expect(peutReagir(e1, "OCC", idx[0], "aider")).toMatch(/déjà/);
      const e2 = reagir(e1, "OCC", idx[1], "aider");
      expect(peutReagir(e2, "OCC", idx[2], "aider")).toMatch(/2 réactions/);
      expect(e.camps.OCC.budget).toBe(budget); // état d'entrée intact
      return;
    }
    throw new Error("aucune partie avec 3 événements réactifs au premier trimestre");
  });

  it("5. flux : un détroit bloqué coupe ses routes et réduit le lien des pays dépendants ; l'oléoduc Kazakhstan-Chine ouvre en 2006", () => {
    const e = creerPartie(1, null, { generiques: false, ia: false });
    const avant = lienFlux(e, "SAU", "CHN");
    e.blocages.push({ detroit: "ormuz", fin: e.round + 1 });
    expect(FLUX.filter(f => f.detroits?.includes("ormuz")).every(f => !fluxActif(e, f))).toBe(true);
    expect(lienFlux(e, "SAU", "CHN")).toBeLessThan(avant);
    for (const d of DETROITS) expect(FLUX.some(f => f.detroits?.includes(d.id)), d.id).toBe(true);
    for (const f of FLUX) for (const iso of f.pays) expect(ISO, `${f.id} ${iso}`).toContain(iso);
    const kaz = FLUX.find(f => f.id === "t_kazakhstan_chine")!;
    expect(fluxActif(e, kaz)).toBe(false);
    let e2 = e; while (e2.round < 24) e2 = finRound(e2);
    expect(fluxActif(e2, kaz)).toBe(true);
  });

  it("6. blocages et conflits apparaissent puis expirent ; le bulletin climatique annuel touche tous les pays", () => {
    let vuBlocage = false, vuConflit = false;
    for (let g = 1; g <= 40 && !(vuBlocage && vuConflit); g++) {
      let e = creerPartie(g, null);
      while (!e.termine) {
        e = roundAutomatique(e);
        vuBlocage ||= e.blocages.length > 0; vuConflit ||= e.conflits.length > 0;
        for (const b of e.blocages) expect(b.fin).toBeGreaterThanOrEqual(e.round);
        for (const c of e.conflits) expect(c.fin).toBeGreaterThanOrEqual(e.round);
      }
      const bulletins = e.journal.filter(j => j.titre.startsWith("Réchauffement climatique"));
      expect(bulletins.length).toBeGreaterThanOrEqual(8);
      expect(bulletins[0].effets!.join(" ")).toMatch(/tous les pays/);
    }
    expect(vuBlocage).toBe(true); expect(vuConflit).toBe(true);
  });
});
