import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as EV from "../src/v2/evolution";
import * as RS from "../src/v2/ressources";
import { ROUTES } from "../src/v2/zones";

const jouerAnnee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); };
const partie = (g: number, jusque = 2035) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); while (!e.fin && e.annee <= jusque) jouerAnnee(e); return e; };

describe("Tout évolue (acceptation, règle du 2 novembre 2026)", () => {
  const d = M.creerPartieV2(11, null as any), f = partie(11, 2010);
  it("1. après 10 ans, PIB, population, armée, stabilité, ressources, soldes et poids ont bougé", () => {
    for (const iso of ["USA", "CHN", "IND", "BRA", "NGA"]) {
      const a = d.pays[iso], b = f.pays[iso];
      for (const k of ["pib", "population", "militaire", "stabilite", "poids"] as const) expect(b[k], `${iso} ${k}`).not.toBe(a[k]);
      expect(RS.solde(f, iso, "energie"), `${iso} énergie`).not.toBe(RS.solde(d, iso, "energie"));
    }
    expect(f.pays.CHN.pib / d.pays.CHN.pib).toBeGreaterThan(f.pays.USA.pib / d.pays.USA.pib); // la Chine croît plus vite (tendance crédible)
  });
  it("2. tendances : schiste américain et demande chinoise d'énergie", () => {
    const e = partie(12, 2020);
    expect(RS.solde(e, "USA", "energie")).toBeGreaterThan(RS.solde(d, "USA", "energie") + 20);
    expect(RS.solde(e, "CHN", "energie")).toBeLessThan(RS.solde(d, "CHN", "energie") - 15);
  });
  it("3. partie complète : valeurs finies, PIB mondial ×2 à ×4,5, tension 0-10, budget 3-9", () => {
    const e = partie(13), l = Object.values(e.pays), l0 = Object.values(d.pays);
    const x = l.reduce((s, p) => s + p.pib, 0) / l0.reduce((s, p) => s + p.pib, 0);
    expect(x).toBeGreaterThan(2); expect(x).toBeLessThan(4.5);
    expect(l.every(p => [p.pib, p.population, p.militaire, p.stabilite, p.poids, p.att.OCC, p.eco.CHN].every(Number.isFinite))).toBe(true);
    expect(e.tension).toBeGreaterThanOrEqual(0); expect(e.tension).toBeLessThanOrEqual(10);
    for (const c of ["OCC", "CHN"] as const) { expect(e.revenu![c]).toBeGreaterThanOrEqual(3); expect(e.revenu![c]).toBeLessThanOrEqual(9); }
    expect(Math.abs(l.reduce((s, p) => s + p.poids, 0) - 100)).toBeLessThan(0.01);
  });
  it("4. routes : contrôle de chaque camp entre 0 et 100 %, somme ≤ 100 %, effet centré sur le PIB", () => {
    for (const r of ROUTES) { const k = EV.controle(f, r.id); expect(k.OCC).toBeGreaterThanOrEqual(0); expect(k.CHN).toBeGreaterThanOrEqual(0); expect(k.OCC + k.CHN).toBeLessThanOrEqual(1.0001); }
    expect(EV.controle(f, "taiwan").CHN).toBeGreaterThan(0); // la Chine est sur la route
    const x = EV.effetsRoutes(f), l = Object.values(f.pays), tot = l.reduce((s, p) => s + p.poids, 0);
    const transit = ROUTES.reduce((s, r) => s + EV.valeurRoute(r.id, f.annee) * 0.3 * r.pays.reduce((a, i) => a + f.pays[i].poids, 0), 0) / tot;
    expect(Math.abs(l.reduce((s, p) => s + x[p.iso] * p.poids, 0) / tot - transit)).toBeLessThan(0.01); // hors péage, les routes redistribuent
    expect(EV.valeurRoute("arctique", 2010)).toBe(0); expect(EV.valeurRoute("arctique", 2035)).toBeGreaterThan(0);
  });
  it("5. interactions : un pays qui se rapproche d'un camp entraîne ses voisins (plafonné) et éloigne son rival", () => {
    const e = M.creerPartieV2(14, null as any); e.pibDebutAnnee = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.pib]));
    const avantPak = e.pays.PAK.att.OCC, avantNpl = e.pays.NPL.att.OCC;
    e.pays.IND.att.OCC += 30; // l'Inde se rapproche de l'Occident cette année
    EV.evoluerFinAnnee(e);
    expect(e.pays.NPL.att.OCC - avantNpl).toBeGreaterThan(0); expect(e.pays.NPL.att.OCC - avantNpl).toBeLessThanOrEqual(EV.EVO.contagionMax + 1);
    expect(e.pays.PAK.att.OCC).toBeLessThan(avantPak);
  });
  it("6. chantage : une coupure réduit l'approvisionnement du camp visé, l'année seulement", () => {
    const e = M.creerPartieV2(15, null as any);
    const avant = RS.bilan(e, "OCC", "terres").offre;
    expect(RS.chantageCarte(e, "CHN", "terres")[0].texte).toMatch(/Coupure de terres rares décidée par la Chine/); // en 2000 la Chine produit l'essentiel des terres rares
    expect(RS.bilan(e, "OCC", "terres").offre).toBeLessThan(avant);
    expect(RS.chantageCarte(e, "CHN", "energie")[0].texte).toMatch(/Aucun fournisseur/); // pas encore de grand fournisseur d'énergie assez proche des BRICS
    e.pibDebutAnnee = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.pib]));
    RS.evoluer(e); e.annee++;
    expect(e.res!.coupures.length).toBe(0);
  });
  it("7. les cartes suivent l'époque : cartes de l'ère 2 après 2008, cartes de chantage possibles", () => {
    const e = partie(16, 2010); M.distribuerMains(e);
    const ids = [...e.main.OCC, ...e.main.CHN].map(c => c.carte.id);
    expect(ids.length).toBe(12);
    const toutes = new Set<string>(); for (let g = 0; g < 30; g++) { const x = partie(100 + g, 2000); M.distribuerMains(x); [...x.main.OCC, ...x.main.CHN].forEach(c => toutes.add(c.carte.id)); }
    expect([...toutes].some(i => i.startsWith("res_"))).toBe(true);
  });
  it("8. déterminisme : même graine, même partie", () => {
    expect(JSON.stringify(partie(17, 2006).pays.BRA)).toBe(JSON.stringify(partie(17, 2006).pays.BRA));
  });
});
