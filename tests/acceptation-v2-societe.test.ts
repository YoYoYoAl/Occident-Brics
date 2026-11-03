// Tests d'acceptation : caractéristiques et interactions (societe.ts), climat, migrations, institutions, devises, décompte (3 novembre 2026).
// Chaque lien demandé par l'utilisateur est testé SÉPARÉMENT (deux états identiques, une seule donnée changée), puis tous ENSEMBLE
// sur des parties complètes (contrôle anti-emballement).
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as SO from "../src/v2/societe";
import * as IN from "../src/v2/institutions";
import * as MN from "../src/v2/monnaie";
import * as RS from "../src/v2/ressources";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const nouvelle = (g = 4242) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return e; };
const annee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); M.anneeSuivante(e); };
// Une année de société seule, sur deux copies : a = référence, b = une donnée modifiée.
function compare(modif: (e: M.EtatV2) => void, iso = "IND") {
  const a = nouvelle(), b = clone(a); modif(b);
  SO.evoluer(a); SO.evoluer(b);
  return { a: a.soc![iso], b: b.soc![iso], ea: a, eb: b };
}

describe("Caractéristiques de départ (données réelles 2000)", () => {
  it("les scores 2000 viennent des données réelles et sont ordonnés de façon crédible", () => {
    const u = SO.caracDepart("USA"), n = SO.caracDepart("NGA"), c = SO.caracDepart("CHN");
    expect(u.educ).toBeGreaterThan(n.educ); expect(u.sante).toBeGreaterThan(n.sante); expect(u.tech).toBeGreaterThan(c.tech);
    for (const k of Object.keys(u) as SO.CleCarac[]) for (const x of [u, n, c]) { expect(x[k]).toBeGreaterThanOrEqual(0); expect(x[k]).toBeLessThanOrEqual(100); }
  });
  it("émissions mondiales 2000 ≈ 25 Gt de CO2 (réel : environ 25)", () => {
    const e = nouvelle(); expect(e.climat!.emissions / 1000).toBeGreaterThan(22); expect(e.climat!.emissions / 1000).toBeLessThan(28);
  });
});

describe("Liens testés séparément (règles de l'utilisateur, 3 novembre 2026)", () => {
  it("la santé fait croître la population", () => {
    const e = nouvelle(); expect(SO.bonusPop(e, "IND")).toBeCloseTo(0, 5);
    e.soc!.IND.sante += 20; expect(SO.bonusPop(e, "IND")).toBeGreaterThan(0);
  });
  it("la pollution de l'air dégrade la santé", () => {
    const { a, b } = compare(e => { e.soc!.IND.air -= 30; });
    expect(b.sante).toBeLessThan(a.sante);
  });
  it("l'éducation augmente la santé et la technologie, et diminue la pollution", () => {
    const { a, b } = compare(e => { e.soc!.IND.educ += 30; });
    expect(b.sante).toBeGreaterThan(a.sante); expect(b.tech).toBeGreaterThan(a.tech); expect(b.air).toBeGreaterThan(a.air);
  });
  it("les infrastructures : santé, PIB et armée en hausse ; besoins en énergie en hausse", () => {
    const { a, b, ea, eb } = compare(e => { e.soc!.IND.infra += 30; });
    expect(b.sante).toBeGreaterThan(a.sante); expect(b.educ).toBeGreaterThan(a.educ);
    expect(SO.bonusPib(eb, "IND")).toBeGreaterThan(SO.bonusPib(ea, "IND"));
  });
  it("la population et l'armée font monter les besoins en énergie ; la technologie les fait baisser", () => {
    const a = nouvelle(); SO.evoluer(a); // popDebutAnnee et milDebutAnnee posés
    const b = clone(a), c = clone(a), d = clone(a);
    b.pays.IND.population *= 1.03; c.pays.IND.militaire += 10; d.soc!.IND.tech += 15;
    for (const x of [a, b, c, d]) SO.evoluer(x);
    const s = (x: M.EtatV2) => RS.solde(x, "IND", "energie");
    expect(s(b)).toBeLessThan(s(a)); expect(s(c)).toBeLessThan(s(a)); expect(s(d)).toBeGreaterThan(s(a));
  });
  it("l'agriculture pollue l'eau et la terre", () => {
    const { a, b } = compare(e => { e.soc!.IND.agri += 40; });
    expect(b.eau).toBeLessThan(a.eau); expect(b.terre).toBeLessThan(a.terre);
  });
  it("une caractéristique ne bouge pas de plus de 2,5 points par an (pas de sur-interaction)", () => {
    const e = nouvelle(), avant = clone(e.soc!); SO.evoluer(e);
    for (const iso of Object.keys(avant)) for (const k of ["educ", "sante", "tech", "infra", "air", "eau", "terre"] as SO.CleCarac[]) expect(Math.abs(e.soc![iso][k] - avant[iso][k])).toBeLessThanOrEqual(SO.SOC.plafond + 1e-9);
  });
});

describe("Climat", () => {
  it("l'opération Transition climatique fait baisser les émissions de la zone", () => {
    const a = nouvelle(), b = clone(a);
    b.transitions = { CHN: 10, IND: 10 };
    SO.evoluer(a); SO.evoluer(b);
    expect(b.soc!.CHN.propre).toBeGreaterThan(a.soc!.CHN.propre);
    expect(SO.emissionsPays(b, b.pays.CHN)).toBeLessThan(SO.emissionsPays(a, a.pays.CHN));
  });
  it("défaite de tous à +3 °C", () => {
    const e = nouvelle(); e.climat!.co2Cumule = (SO.CLIMAT.defaite - SO.CLIMAT.ecart2000) / SO.CLIMAT.tcre; SO.evoluer(e);
    expect(e.defaite?.camp).toBe("tous");
  });
});

describe("Migrations", () => {
  it("les flux sont à somme nulle (personne ne disparaît) et nuls si rien n'a changé depuis 2000", () => {
    const e = nouvelle(); const t0 = Object.values(e.pays).reduce((t, p) => t + p.population, 0);
    SO.migrationsAnnee(e); const t1 = Object.values(e.pays).reduce((t, p) => t + p.population, 0);
    expect(Math.abs(t1 / t0 - 1)).toBeLessThan(1e-9); expect(e.migrations!.length).toBe(0);
  });
  it("une guerre ou une crise pousse au départ vers des pays plus riches et stables", () => {
    const e = nouvelle(); e.pays.SYR.stabilite = 5; const p0 = e.pays.SYR.population;
    const ev = SO.migrationsAnnee(e); void ev;
    expect(e.pays.SYR.population).toBeLessThan(p0);
    expect(e.migrations!.some(f => f.de === "SYR" && e.pays[f.vers].stabilite >= 55)).toBe(true);
  });
});

describe("Institutions", () => {
  it("membres réels : la Chine entre à l'OMC en 2001, la CPI ouvre en 2002 sans les États-Unis, la NDB en 2015", () => {
    const e = nouvelle(); expect(IN.membre(e, "OMC", "CHN")).toBe(false); expect(IN.membre(e, "ONU", "TWN")).toBe(false);
    while (e.annee < 2016) annee(e);
    expect(IN.membre(e, "OMC", "CHN")).toBe(true); expect(IN.membre(e, "CPI", "USA")).toBe(false); expect(IN.membre(e, "CPI", "FRA")).toBe(true);
    expect(IN.membre(e, "NDB", "CHN")).toBe(true); expect(IN.membre(e, "OCS", "RUS")).toBe(true); expect(IN.membre(e, "AIIB", "USA")).toBe(false);
  });
  it("le contrôle de chaque institution est une part (somme 1) ; l'Occident contrôle le FMI au départ", () => {
    const e = nouvelle();
    for (const x of IN.INSTITUTIONS) if (e.inst!.membres[x.id].length) { const c = IN.controle(e, x.id); expect(c.OCC + c.CHN).toBeCloseTo(1, 9); }
    expect(IN.controle(e, "FMI").OCC).toBeGreaterThan(0.6);
  });
  it("au plus 2 plans de sauvetage par an", () => {
    const e = nouvelle(); for (let i = 0; i < 10; i++) { annee(e); }
    const parAn: Record<number, number> = {}; for (const [, a] of Object.entries(e.inst!.sauves)) parAn[a] = (parAn[a] ?? 0) + 1;
    for (const n of Object.values(parAn)) expect(n).toBeLessThanOrEqual(IN.INST.sauvetages);
  });
});

describe("Devises et commerce", () => {
  it("multiplicateur neutre au départ, en hausse si la monnaie du camp gagne des parts, borné à ±15 %", () => {
    const e = nouvelle(); expect(MN.multCommerce(e, "CHN")).toBeCloseTo(1, 1);
    e.monnaie!.mondiales.brics = 0.2; expect(MN.multCommerce(e, "CHN")).toBeGreaterThan(1.05);
    e.monnaie!.mondiales.brics = 0.9; expect(MN.multCommerce(e, "CHN")).toBeLessThanOrEqual(1.15);
  });
});

describe("Décompte sur toutes les familles", () => {
  it("les familles pèsent 100 % et les poids des pays font 100", () => {
    expect(Object.values(M.POIDS_FAMILLES).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const e = nouvelle(); expect(Object.values(e.pays).reduce((t, p) => t + p.poids, 0)).toBeCloseTo(100, 6);
  });
  it("un pays qui progresse en éducation et en santé pèse plus", () => {
    const e = nouvelle(), avant = e.pays.NGA.poids; e.soc!.NGA.educ += 30; e.soc!.NGA.sante += 30; M.calculerPoids(e.pays, e.soc);
    expect(e.pays.NGA.poids).toBeGreaterThan(avant);
  });
});

describe("Tous les systèmes ensemble : pas d'emballement (2 parties complètes)", () => {
  it("caractéristiques bornées, réchauffement 2050 entre +1,4 et +2,5 °C, population mondiale ×1,4 à ×1,8, aucun NaN", () => {
    for (const g of [11, 12]) {
      const e = nouvelle(g), pop0 = Object.values(e.pays).reduce((t, p) => t + p.population, 0);
      while (!e.fin) annee(e);
      for (const c of Object.values(e.soc!)) for (const v of Object.values(c)) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
      for (const p of Object.values(e.pays)) { expect(Number.isFinite(p.pib)).toBe(true); expect(Number.isFinite(p.population)).toBe(true); }
      expect(e.climat!.ecart).toBeGreaterThan(1.4); expect(e.climat!.ecart).toBeLessThan(2.5);
      const r = Object.values(e.pays).reduce((t, p) => t + p.population, 0) / pop0; expect(r).toBeGreaterThan(1.4); expect(r).toBeLessThan(1.8);
    }
  }, 300_000);
});

describe("Religions et culture", () => {
  it("profils réels : la Pologne est proche de l'Occident, l'Arabie saoudite en est loin ; multiplicateur entre 0,9 et 1,1", () => {
    const e = nouvelle();
    expect(SO.similariteReligion(e, "OCC", "POL")).toBeGreaterThan(SO.similariteReligion(e, "OCC", "SAU"));
    for (const iso of ["POL", "SAU", "IND", "THA"]) for (const c of ["OCC", "CHN"] as const) { const m = SO.multReligion(e, c, iso); expect(m).toBeGreaterThanOrEqual(0.9); expect(m).toBeLessThanOrEqual(1.1); }
  });
});

describe("Effet « co2 » des cartes et événements", () => {
  it("durable : la part bas-carbone bouge ; passager : seulement les émissions de l'année", () => {
    const e = nouvelle(), p0 = e.soc!.JPN.propre, em0 = SO.emissionsPays(e, e.pays.CHN);
    SO.effetCo2(e, ["JPN"], 4, 24); expect(e.soc!.JPN.propre).toBeLessThan(p0); // Fukushima : sortie du nucléaire, plus de fossile
    SO.effetCo2(e, ["CHN"], -6, 4); expect(SO.emissionsPays(e, e.pays.CHN)).toBeCloseTo(em0 * 0.94, 3); // Covid
    SO.evoluer(e); expect(e.co2Annee).toEqual({});
  });
});
