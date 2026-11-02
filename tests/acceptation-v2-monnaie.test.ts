import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as MN from "../src/v2/monnaie";
import * as RS from "../src/v2/ressources";
import { effetsEco, EVENEMENTS_RELIES } from "../src/v2/evenements-eco";

const jouerAnnee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); };
const partie = (g: number, jusque = 2035) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); while (!e.fin && e.annee <= jusque) jouerAnnee(e); return e; };

describe("Monnaie légère (acceptation, choix du 2 novembre 2026)", () => {
  it("1. départ 2000 : dette 55 % / 23 %, réserves mondiales qui somment à 100 %, détenteurs qui somment à 100 %", () => {
    const e = M.creerPartieV2(21, null as any), m = e.monnaie!;
    expect(m.dette).toEqual({ OCC: 55, CHN: 23 });
    expect(Object.values(m.mondiales).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    for (const c of ["OCC", "CHN"] as const) expect(Object.values(m.detenteurs[c]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(MN.taux(e, "OCC")).toBeLessThan(MN.taux(e, "CHN")); // privilège du dollar
  });
  it("2. décisions : emprunter +1 budget +3 dette ; planche +1,5 inflation ; or ; 2 par an au plus", () => {
    const e = M.creerPartieV2(22, null as any), b = e.budget.OCC;
    MN.decider(e, "OCC", "emprunter"); expect(e.budget.OCC).toBe(b + 1); expect(e.monnaie!.dette.OCC).toBe(58);
    MN.decider(e, "OCC", "planche"); expect(e.monnaie!.inflation.OCC).toBeCloseTo(4.9);
    expect(MN.possible(e, "OCC", "or")).toMatch(/Deux décisions/);
    const c = M.creerPartieV2(23, null as any), s = c.monnaie!.reserves.CHN.stock; MN.decider(c, "CHN", "or");
    expect(c.monnaie!.reserves.CHN.stock).toBe(s + 1); expect(c.monnaie!.reserves.CHN.or).toBeGreaterThan(0.05);
  });
  it("3. intérêts : la dette ajoutée coûte du budget l'année suivante ; le taux monte avec la dette", () => {
    const e = M.creerPartieV2(24, null as any), t0 = MN.taux(e, "OCC");
    e.monnaie!.dette.OCC = 120; expect(MN.taux(e, "OCC")).toBeGreaterThan(t0); expect(MN.interets(e, "OCC")).toBeGreaterThan(0.5);
  });
  it("4. défaut au-delà de 150 % : dette réduite, inflation, budget à zéro, perte des détenteurs adverses", () => {
    const e = M.creerPartieV2(25, null as any); e.monnaie!.dette.OCC = 170; e.monnaie!.detenteurs.OCC = { interieur: 0.5, allies: 0.2, adverses: 0.3 };
    const r = e.monnaie!.reserves.CHN.stock, st = e.pays.USA.stabilite;
    const a = MN.finAnnee(e, { OCC: 2, CHN: 6 });
    expect(a.some(x => /Défaut/.test(x.titre))).toBe(true);
    expect(e.monnaie!.dette.OCC).toBeLessThan(110); expect(e.budget.OCC).toBe(0);
    expect(e.monnaie!.reserves.CHN.stock).toBeLessThan(r); expect(e.pays.USA.stabilite).toBeLessThan(st);
  });
  it("5. partie complète : valeurs finies et plausibles, dédollarisation progressive mais pas totale", () => {
    const e = partie(26), m = e.monnaie!;
    for (const c of ["OCC", "CHN"] as const) { expect(m.dette[c]).toBeGreaterThan(20); expect(m.dette[c]).toBeLessThan(160); expect(m.inflation[c]).toBeGreaterThan(-1.01); expect(m.inflation[c]).toBeLessThan(15); }
    expect(MN.partOccidentale(e)).toBeLessThan(0.86); expect(MN.partOccidentale(e)).toBeGreaterThan(0.3);
    expect(m.reserves.CHN.stock).toBeGreaterThan(3); // excédents chinois recyclés
  });
});

describe("Événements reliés aux mécanismes (acceptation)", () => {
  it("1. au moins 60 événements touchent ressources, routes, dette, inflation ou réserves", () => {
    expect(EVENEMENTS_RELIES(M.HISTORIQUES_V2).length).toBeGreaterThanOrEqual(60);
  });
  it("2. Lehman : la dette de l'Occident monte ; invasion de l'Ukraine : coupure du gaz russe, inflation, gel des réserves", () => {
    const h = (id: string) => M.HISTORIQUES_V2.find(x => x.id === id)!;
    expect(effetsEco(h("h_lehman")).some(f => f.type === "dette" && f.camp === "OCC")).toBe(true);
    const u = effetsEco(h("h_ukraine"));
    expect(u.some(f => f.type === "coupure" && f.fournisseur === "RUS")).toBe(true);
    expect(u.some(f => f.type === "mondiales")).toBe(true);
    expect(effetsEco(h("h_ever_given")).some(f => f.type === "blocage" && f.route === "suez")).toBe(true);
  });
  it("3. en jeu : l'année 2008 fait monter la dette de l'Occident ; 2010 coupe les terres rares chinoises", () => {
    const e = partie(27, 2007), d = e.monnaie!.dette.OCC; M.evenementsAnnee(e);
    expect(e.monnaie!.dette.OCC).toBeGreaterThan(d + 9);
    const f = partie(28, 2009); M.evenementsAnnee(f);
    expect(f.res!.coupures.some(c => c.fournisseur === "CHN" && c.bien === "terres" && c.camp === "OCC")).toBe(true);
  });
  it("4. une route bloquée fait perdre du PIB à tous et supprime le péage", async () => {
    const EV = await import("../src/v2/evolution");
    const e = M.creerPartieV2(29, null as any), avant = EV.effetsRoutes(e).EGY;
    e.blocages = [{ route: "suez", annee: e.annee }];
    expect(EV.effetsRoutes(e).EGY).toBeLessThan(avant);
    void RS;
  });
});
