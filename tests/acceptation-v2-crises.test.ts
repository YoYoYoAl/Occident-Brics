// Crises de tension et guerres (demandes du 2 novembre 2026) : « La tension peut générer des événements ou des briefings qui
// peuvent faire envenimer ou non la situation » ; « dans certains cas, générer des guerres entre pays ou entre les 2 camps
// (doit rester relativement rare) ».
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as CR from "../src/v2/crises";
import * as RS from "../src/v2/ressources";
const base = (g: number) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return e; };
const annee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); };

describe("Crises de tension et guerres (acceptation)", () => {
  it("1. la probabilité d'une crise croît avec la tension (20 % à 2, 40 % à 6, plafond 70 %)", () => {
    expect(CR.probaCrise(2)).toBeCloseTo(0.2); expect(CR.probaCrise(6)).toBeCloseTo(0.4); expect(CR.probaCrise(20)).toBe(0.7);
    expect(CR.FOYERS.length).toBeGreaterThanOrEqual(15);
  });
  it("2. deux apaisements font baisser la tension ; deux escalades l'envenimer (et coûtent 1 ◆)", () => {
    const t = (a: CR.Reponse, b: CR.Reponse) => { const e = base(3); e.tension = 5; e.budget = { OCC: 5, CHN: 5 }; CR.tirerCrise(e, true); const g = CR.CRISE.gravite[e.crise!.gravite - 1]; CR.repondre(e, "OCC", a); CR.repondre(e, "CHN", b); CR.resoudreCrise(e); return { dt: (e.tension - 5) / g, e }; };
    expect(t("apaiser", "apaiser").dt).toBeCloseTo(-1); const x = t("escalade", "escalade"); expect(x.dt).toBeCloseTo(1.8); expect(x.e.budget.OCC).toBe(4);
  });
  it("3. qui escalade face à un apaisement gagne la région, l'autre perd la face", () => {
    const e = base(5); e.budget = { OCC: 5, CHN: 5 }; CR.tirerCrise(e, true); const k = e.crise!, iso = k.pays.find(i => i !== "USA" && i !== "CHN")!;
    const avant = { ...e.pays[iso].att }; CR.repondre(e, "OCC", "apaiser"); CR.repondre(e, "CHN", "escalade"); CR.resoudreCrise(e);
    expect(e.pays[iso].att.CHN).toBeGreaterThan(avant.CHN); expect(e.pays[iso].att.OCC).toBeLessThan(avant.OCC);
  });
  it("4. le renseignement donne un penchant cohérent (somme 1, plus d'apaisement sous très forte tension)", () => {
    const e = base(9); e.tension = 2; const p1 = CR.penchant(e, "CHN"); e.tension = 9; const p2 = CR.penchant(e, "CHN");
    expect(p1.apaiser + p1.fermete + p1.escalade).toBeCloseTo(1); expect(p2.apaiser).toBeGreaterThan(p1.apaiser);
  });
  it("5. un incident armé tombe l'année suivante et peut ouvrir une guerre ; la guerre coûte et finit", () => {
    const e = base(11); e.incidents = [{ annee: e.annee, foyer: "cachemire", titre: "Test", pays: ["IND", "PAK"] }]; const pib = e.pays.PAK.pib;
    const ev = CR.incidentsAnnee(e); expect(ev[0].titre).toMatch(/Incident armé/); expect(e.pays.PAK.pib).toBeLessThan(pib);
    const g = CR.guerresEnCours(e).find(x => x.a !== x.b) ?? CR.ouvrirGuerre(e, "IND", "PAK", "test")!; expect(CR.ouvrirGuerre(e, "PAK", "IND", "doublon")).toBeUndefined();
    for (let i = 0; i < 30 && !g.fin; i++) { CR.guerresAnnee(e); e.annee++; } expect(g.fin).toBeDefined();
  });
  it("6. sur 40 parties IA (2000-2050) : environ 0,4 crise par an, guerres rares (1 à 4,5 par partie), guerre entre les deux camps très rare", { timeout: 400000 }, () => {
    let crises = 0, ans = 0, guerres = 0, directes = 0;
    for (let g = 501; g <= 540; g++) { const e = base(g); while (!e.fin) { M.jouerEvenements(e); if (e.crise) crises++; M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); ans++; M.anneeSuivante(e); }
      guerres += (e.guerres ?? []).length; directes += (e.guerres ?? []).filter(x => x.directe).length; }
    expect(crises / ans).toBeGreaterThan(0.25); expect(crises / ans).toBeLessThan(0.55);
    expect(guerres / 40).toBeGreaterThan(1); expect(guerres / 40).toBeLessThan(4.5); expect(directes / 40).toBeLessThan(0.1);
  });
  it("7. guerres hors des deux camps (Israël-Iran, Rwanda-Congo, Azerbaïdjan-Géorgie) et zones séparatistes avec soutien de l'État ou des rebelles", () => {
    const paires = CR.CONFLITS_LOCAUX.map(c => [c.a, c.b].sort().join("-"));
    for (const x of ["IRN-ISR", "COD-RWA", "AZE-GEO"]) expect(paires).toContain(x);
    expect(CR.SEPARATISMES.length).toBeGreaterThanOrEqual(15);
    const e = base(21); e.tension = 10; let n = 0; for (let i = 0; i < 300 && !n; i++) n = CR.guerresSpontanees(e).length; expect(n).toBeGreaterThan(0);
    const e2 = base(22); const g: CR.Guerre = { id: "t", titre: "t", a: "ETH", b: "ETH", debut: e2.annee, score: 0, soutien: {}, rebelles: { region: "Tigré", force: 30 } }; e2.guerres = [g];
    e2.pays.ETH.att.OCC = 80; e2.pays.ETH.att.CHN = -40; CR.soutenir(e2, "OCC", "ETH", 3); CR.soutenir(e2, "CHN", "ETH", 2);
    expect(g.soutien.ETH).toBe(3); expect(g.soutien.rebelles).toBe(2);
  });
  it("8. le risque de guerre suit la relation entre les deux pays (ennemis > neutres > amis)", () => {
    const e = base(23); expect(CR.facteurRelation(e, "ISR", "IRN")).toBeGreaterThan(CR.facteurRelation(e, "AZE", "GEO")); expect(CR.facteurRelation(e, "FRA", "DEU")).toBe(0.2);
  });
  it("9. appel aux armes : un allié en Alliance appelle son camp ; accepter le rapproche, refuser l'éloigne ; le joueur répond lui-même", () => {
    const e = base(24); e.joueur = "OCC"; e.pays.GEO.att.OCC = 95; e.pays.AZE.att.OCC = 0; e.appels = [];
    const g = CR.ouvrirGuerre(e, "AZE", "GEO", "test")!; const a = (e.appels ?? []).find(x => x.camp === "OCC" && x.allie === "GEO")!;
    expect(a).toBeDefined(); expect(a.reponse).toBeUndefined(); const v = e.pays.GEO.att.OCC;
    CR.repondreAppel(e, a, true); expect(g.garants?.OCC).toBe("GEO"); expect(e.pays.GEO.att.OCC).toBeGreaterThanOrEqual(v);
    const e2 = base(24); e2.joueur = "OCC"; e2.pays.GEO.att.OCC = 95; e2.pays.AZE.att.OCC = 0; CR.ouvrirGuerre(e2, "AZE", "GEO", "test"); const a2 = e2.appels!.find(x => x.camp === "OCC")!;
    CR.repondreAppel(e2, a2, false); expect(e2.pays.GEO.att.OCC).toBeLessThan(95);
  });
  it("10. tension haute : les réserves mondiales se diversifient (moins de dollar)", () => {
    const run = (t: number) => { const e = base(25); for (let i = 0; i < 10; i++) { e.tension = t; M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); e.tension = t; M.resoudreAnnee(e); M.anneeSuivante(e); } return e.monnaie!.mondiales.dollar; };
    expect(run(9)).toBeLessThan(run(1));
  });
  it("11. accords commerciaux : un pays en pénurie dans un bloc (Accords et plus) est mieux couvert", () => {
    const e = base(26); expect(RS.combleParAccords(e, "FRA", "OCC", 1)).toBeGreaterThan(0);
    e.pays.FRA.eco.OCC = 0; expect(RS.combleParAccords(e, "FRA", "OCC", 1)).toBe(0);
    expect(RS.COMBLE[4]).toBeLessThan(RS.COMBLE[6]);
  });
});
void annee;

// Images du lot ob_13 (2 novembre 2026) : les événements de rupture et de projection 2027-2050 ont leur illustration,
// sauf 18 scènes écartées pour faux texte (à régénérer) ; les cartes de l'ère 3 ont la leur.
import { readdirSync } from "fs";
import { RUPTURES, PROJECTIONS_2050, PROJECTIONS_2050_B, PROJECTIONS_2050_C } from "../src/contenu/ruptures";
import { CARTES } from "../src/interface/images-cartes";
describe("Images des nouveaux événements (lot ob_13)", () => {
  it("au moins 145 des 164 nouveaux événements et 12 des 13 cartes de l'ère 3 ont une image, chaque image existe", () => {
    const f = new Set(readdirSync("src/v2/images").map(x => x.replace(".webp", "")));
    const ev = [...RUPTURES, ...PROJECTIONS_2050, ...PROJECTIONS_2050_B, ...PROJECTIONS_2050_C].filter(h => f.has(`ev_${h.id}`));
    expect(ev.length).toBeGreaterThanOrEqual(145);
    const c3 = Object.entries(CARTES).filter(([k]) => /^[ocn]3_/.test(k)); expect(c3.length).toBe(12); for (const [, n] of c3) expect(f.has(n), n).toBe(true);
  });
});
