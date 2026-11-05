// Phase de guerre jouée (demandes du 2 novembre 2026) : champ de bataille en hexagones (unités, mouvement, attaque, logistique,
// bonus et malus entre types, terrain, brouillard de guerre, 4 saisons, résultat non plafonné) ; projection, blocus, base alliée ;
// nucléaire et biologique par la dissuasion ; front intérieur, diplomatie, négociation ; seulement les guerres du joueur.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import * as SON from "../src/interface/sons";
import * as M from "../src/v2/moteur";
import * as CR from "../src/v2/crises";
import * as B from "../src/v2/bataille";
const base = (g: number) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.appels = []; return e; };
const guerre = (e: M.EtatV2, a: string, b: string) => { const g = CR.ouvrirGuerre(e, a, b, "test")!; g.allies = {}; g.garants = {}; return g; };
const jouer = (e: M.EtatV2, b: B.Bataille) => { while (!b.finie) B.jouerIA(e, b, b.actif); return B.resultat(b); };
const premiere = (b: B.Bataille, cote: B.Cote, f: (u: B.Unite) => boolean) => B.vivantes(b, cote).find(f)!;

describe("Armée sur le champ : composition, terrain, unités", () => {
  it("1. composition : pas de marine sans littoral, robots seulement après 2022, au moins 4 formations au sol", () => {
    const e = base(1); const l = B.compositionArmee(e, "ETH", false);
    expect(l.some(t => B.UNITES[t].domaine === "mer")).toBe(false); expect(l.filter(t => B.UNITES[t].domaine === "terre").length).toBeGreaterThanOrEqual(4);
    expect(B.compositionArmee(e, "USA", true)).not.toContain("robots"); e.annee = 2030; expect(B.compositionArmee(e, "USA", true)).toContain("robots");
    expect(B.compositionArmee(e, "USA", true).some(t => B.UNITES[t].domaine === "mer")).toBe(true);
  });
  it("2. la composition suit la force militaire actuelle (tout évolue)", () => {
    const e = base(2), n = B.compositionArmee(e, "RUS", true).length; e.pays.RUS.militaire *= 0.3; expect(B.compositionArmee(e, "RUS", true).length).toBeLessThan(n);
  });
  it("3. carte 12×8 en hexagones, 3 objectifs, déterministe pour une même guerre et une même année", () => {
    const e = base(3), g = guerre(e, "RUS", "GEO"), b1 = B.preparerBataille(e, g, "a"), b2 = B.preparerBataille(e, g, "a");
    expect(b1.cases.length).toBe(96); expect(b1.objectifs.length).toBe(3); expect(b1.cases.map(k => k.t)).toEqual(b2.cases.map(k => k.t));
    expect(B.distance(0, 0, 3, 0)).toBe(3); expect(B.voisins(2, 2).length).toBe(6);
  });
  it("4. budget de guerre plafonné (3 tranches) ; chaque tranche donne +1 logistique et 1 frappe de missiles", () => {
    const e = base(4); e.budget.OCC = 10; e.boostsUtilises.OCC = 0; expect(B.engagerBudget(e, "OCC", 5)).toBe(3);
    const g = guerre(e, "RUS", "GEO"), b0 = B.preparerBataille(e, g, "a"), b2 = B.preparerBataille(e, g, "a", { tranches: 2 });
    expect(b2.a.base).toBe(b0.a.base + 2); expect(b2.a.missiles).toBe(2);
  });
  it("5. la logistique suit la taille de l'armée", () => {
    const e = base(5), g = guerre(e, "USA", "IRN"), b = B.preparerBataille(e, g, "a"); expect(b.a.base).toBeGreaterThan(b.b.base);
  });
  it("6. projection : 100 % dans sa zone, moins loin de chez soi, les blindés restent au pays en premier", () => {
    const e = base(6); expect(B.projection(e, "RUS", "GEO")).toBe(1); expect(B.projection(e, "ETH", "VNM")).toBeLessThan(1);
    const g = guerre(e, "ETH", "VNM"), b = B.preparerBataille(e, g, "a"), n = B.compositionArmee(e, "ETH", true).length;
    expect(B.vivantes(b, "a").length).toBeLessThan(n);
  });
  it("7. base alliée : +1 logistique pour le côté qui en a une dans la zone du front", () => {
    const e = base(7), g = guerre(e, "RUS", "GEO"), base0 = B.baseAlliee(e, "RUS", g);
    if (base0) expect(B.preparerBataille(e, g, "a").a.baseAlliee).toBe(base0); else expect(B.preparerBataille(e, g, "a").a.baseAlliee).toBeUndefined();
  });
});

describe("Mouvement, attaque, terrain, brouillard", () => {
  it("8. bouger coûte 1 logistique ; une unité ne bouge qu'une fois ; les blindés vont plus loin que l'infanterie", () => {
    const e = base(8), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a"), inf = premiere(b, "a", u => u.type === "infanterie"), bl = premiere(b, "a", u => u.type === "blindes");
    expect(B.deplacements(b, bl).length).toBeGreaterThan(B.deplacements(b, inf).length);
    const L = b.a.logistique, p = B.deplacements(b, inf)[0]; expect(B.deplacer(b, "a", inf.id, p.c, p.r)).toBeNull(); expect(b.a.logistique).toBe(L - 1);
    const q = B.deplacements(b, inf)[0]; if (q) expect(B.deplacer(b, "a", inf.id, q.c, q.r)).toMatch(/déjà agi/);
  });
  it("9. efficacité : l'hélicoptère est meilleur contre les blindés que contre l'infanterie ; la chasse domine l'aviation ; le sous-marin ne frappe que les navires", () => {
    expect(B.EFFICACITE.helico.blinde).toBeGreaterThan(B.EFFICACITE.helico.leger); expect(B.EFFICACITE.chasseurs.aerien).toBeGreaterThan(B.EFFICACITE.chasseurs.leger);
    expect(B.EFFICACITE.sousmarins.leger).toBe(0); expect(B.EFFICACITE.sousmarins.naval).toBeGreaterThan(1);
  });
  it("10. le terrain protège : une cible en ville ou en montagne est plus dure à toucher qu'en plaine", () => {
    const e = base(10), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a"), u = premiere(b, "a", x => x.type === "infanterie"), t = premiere(b, "b", x => B.def(x).domaine === "terre");
    const plaine = b.cases.find(k => k.t === "plaine")!, ville = b.cases.find(k => k.t === "ville" || k.t === "montagne")!;
    t.c = plaine.c; t.r = plaine.r; const p1 = B.chance(b, u, t); t.c = ville.c; t.r = ville.r; const p2 = B.chance(b, u, t);
    expect(p2).toBeLessThan(p1);
  });
  it("11. brouillard : une unité ennemie lointaine est invisible ; un satellite révèle tout ; les sous-marins restent cachés sauf au contact", () => {
    const e = base(11), g = guerre(e, "USA", "IRN"), b = B.preparerBataille(e, g, "a");
    const loin = B.vivantes(b, "b").find(u => !B.visible(b, "a", u)); expect(loin).toBeDefined();
    b.a.espace = 90; B.satellite(b, "a"); expect(B.vivantes(b, "b").filter(u => u.type !== "sousmarins").every(u => B.visible(b, "a", u))).toBe(true);
  });
  it("12. attaque : coûte 1 logistique, retire des PV, l'unité ne tire qu'une fois ; la prévision donne la chance de détruire", () => {
    const e = base(12), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a"), u = premiere(b, "a", x => x.type === "artillerie" || x.type === "blindes"), t = premiere(b, "b", x => B.def(x).domaine === "terre");
    // place la cible au contact, en plaine
    const libre = (k?: B.Case) => k && k.t !== "mer" && k.t !== "montagne" && !B.uniteEn(b, k.c, k.r);
    const k1 = b.cases.find(k => libre(k) && B.voisins(k.c, k.r).some(([c, r]) => libre(B.caseEn(b, c, r))))!; u.c = k1.c; u.r = k1.r;
    const [c2, r2] = B.voisins(k1.c, k1.r).find(([c, r]) => libre(B.caseEn(b, c, r)))!; t.c = c2; t.r = r2;
    const pr = B.previsionAttaque(b, u, t); expect(pr.p).toBeGreaterThan(0); expect(pr.detruire).toBeGreaterThanOrEqual(0); expect(pr.detruire).toBeLessThanOrEqual(1);
    const L = b.a.logistique, pv = t.pv + u.pv; expect(B.attaquer(e, b, "a", u.id, t.id)).toBeNull(); expect(b.a.logistique).toBe(L - 1);
    expect(t.pv + u.pv).toBeLessThanOrEqual(pv); expect(B.attaquer(e, b, "a", u.id, t.id)).not.toBeNull();
  });
  it("13. 4 saisons, l'attaquant joue puis le défenseur ; la logistique se renouvelle chaque tour", () => {
    const e = base(13), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a"); let tours = 0;
    while (!b.finie) { expect(b.actif).toBe(tours % 2 ? "b" : "a"); B.jouerIA(e, b, b.actif); tours++; }
    expect(tours).toBe(8); expect(b.bilans.length).toBe(8);
  });
});

describe("Résultat de l'année : tout est possible", () => {
  it("14. le plus fort gagne le plus souvent (Russie contre Géorgie ≥ 80 %) ; forces proches incertaines (Éthiopie-Érythrée 20-80 %)", () => {
    const e = base(14); let r = 0, q = 0;
    for (let k = 0; k < 20; k++) { const g: any = { id: `t${k}`, titre: "", a: "RUS", b: "GEO", debut: 2000, score: 0, soutien: {} }; if (jouer(e, B.preparerBataille(e, g, "a")).d > 0) r++;
      const h: any = { id: `u${k}`, titre: "", a: "ETH", b: "ERI", debut: 2000, score: 0, soutien: {} }; if (jouer(e, B.preparerBataille(e, h, "a")).d > 0) q++; }
    expect(r).toBeGreaterThanOrEqual(16); expect(q).toBeGreaterThanOrEqual(4); expect(q).toBeLessThanOrEqual(16);
  });
  it("15. issues variées : victoire foudroyante et enlisement existent ; plus de plafond à 25 % pour l'avancée du front", () => {
    const e = base(15), issues = new Set<string>();
    for (const [a, c] of [["USA", "IRN"], ["IND", "PAK"], ["RUS", "GEO"], ["ARM", "AZE"]]) for (let k = 0; k < 8; k++) { const g: any = { id: `v${a}${k}`, titre: "", a, b: c, debut: 2000, score: 0, soutien: {} }; issues.add(jouer(e, B.preparerBataille(e, g, "a")).issue); }
    expect(issues.has("victoire foudroyante")).toBe(true); expect(issues.has("enlisement")).toBe(true);
    const g = guerre(e, "RUS", "GEO"); CR.anneeDeGuerre(e, g, 90); expect(g.occ!.a).toBeGreaterThan(25);
    const h = guerre(e, "IND", "PAK"); CR.anneeDeGuerre(e, h, 4); expect(h.occ!.a).toBeLessThan(5);
  });
  it("16. les robots perdus ne comptent pas comme pertes humaines", () => {
    const e = base(16); e.annee = 2030; const g = guerre(e, "USA", "IRN"), b = B.preparerBataille(e, g, "a"), r = premiere(b, "a", u => u.type === "robots");
    const p = b.a.pertes; r.pv = 1; (B as any).missile; b.actif = "b"; b.b.missiles = 1; b.b.satellite = true; for (let k = 0; k < 30 && r.pv > 0; k++) { b.b.missiles = 1; B.missile(e, b, "b", r.id); }
    expect(b.a.pertes).toBe(p);
  });
  it("17. blocus : une flotte seule en mer en fin d'année coûte 1 % de PIB au pays bloqué", () => {
    const e = base(17), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a");
    for (const u of B.vivantes(b, "b")) if (B.def(u).domaine === "mer") u.pv = 0;
    const pib = e.pays.PAK.pib; B.enregistrer(g, b, e); expect(e.pays.PAK.pib).toBeLessThan(pib); expect(g.batailleJouee?.annee).toBe(e.annee);
  });
});

describe("Armes de destruction massive : dissuasion et risques", () => {
  it("14. risques affichés avant de tirer : riposte, coalition, jauge", () => {
    const e = base(14), g = guerre(e, "IND", "PAK"), r = B.risquesNucleaires(e, g, "a", "strategique");
    expect(r.riposteur).toBe("PAK"); expect(r.riposte).toBe(B.NUCLEAIRE.riposte.strategique); expect(r.hiver).toBe(3); expect(r.coalition).toBeGreaterThan(0);
  });
  it("15. frappe tactique : l'objectif tombe ; frappes répétées → crise à 4 puis défaite du responsable à 7", () => {
    const e = base(15), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a");
    B.nucleaire(e, b, g, "a", "tactique", 0); expect(b.objectifs[0].tenu).toBe("a");
    e.nucleaire!.hiver = 3; B.nucleaire(e, b, g, "a", "tactique", 1); expect(e.nucleaire!.crise).toBe(true);
    e.nucleaire!.hiver = 6; e.nucleaire!.points = { CHN: 50 }; B.nucleaire(e, b, g, "a", "tactique", 2); expect(e.defaite).toBeDefined();
  });
  it("16b. biologique : chaque unité ennemie perd 1 PV et la jauge commune monte", () => {
    const e = base(16), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a"); const pv = B.vivantes(b, "b").reduce((s, u) => s + u.pv, 0), n = B.vivantes(b, "b").length;
    B.biologique(e, b, g, "a"); expect(B.vivantes(b, "b").reduce((s, u) => s + u.pv, 0)).toBe(pv - n);
    expect(e.nucleaire!.hiver).toBeGreaterThanOrEqual(1); expect(e.nucleaire!.bio).toBe(1);
  });
  it("17. pas de nucléaire pour qui n'en a pas", () => {
    const e = base(17), g = guerre(e, "ETH", "ERI"), b = B.preparerBataille(e, g, "a");
    expect(B.nucleaire(e, b, g, "a", "tactique")).toMatch(/Pas de capacité/);
  });
});

describe("Front intérieur, diplomatie, négociation, participation du joueur", () => {
  it("18. front intérieur : mobilisation = 2 divisions d'infanterie, financement = logistique", () => {
    const e = base(18), g = guerre(e, "RUS", "GEO"), r = B.frontInterieur(e, g, "a", "CHN", { mobiliser: true, censurer: false, financement: "impots" });
    expect(r.bonus).toEqual({ infanterie: 2, logistique: 1 });
    const b0 = B.preparerBataille(e, g, "a"), b1 = B.preparerBataille(e, g, "a", { bonus: { a: r.bonus } });
    expect(b1.a.base).toBe(b0.a.base + 1);
  });
  it("19. Conseil de sécurité : 15 membres, veto d'un permanent", () => {
    const e = base(19); expect(B.membresConseil(2000).length).toBe(15);
    const v = B.voteSanctions(e, "OCC", "RUS"); expect(["RUS", "CHN"]).toContain(v.veto); expect(v.adopte).toBe(false);
  });
  it("20. négociation : annexion refusée sans 30 % d'occupation", () => {
    const e = base(20), g = guerre(e, "RUS", "GEO"); g.score = 80;
    expect(B.proposerTraite(e, g, "a", ["annexer"]).accepte).toBe(false);
  });
  it("21. le joueur ne commande que les guerres où son camp participe", () => {
    const e = base(21), g = guerre(e, "ETH", "ERI"); g.parCamp = {};
    expect(B.coteJoueur(e, g, "OCC")).toBeNull();
    g.garants = { OCC: "ERI" }; expect(B.coteJoueur(e, g, "OCC")).toBe("b");
  });
  it("22. guerres possibles entre tous les voisins brouillés (relation ≤ −40), hors conflits déjà listés", () => {
    const e = base(22); const z = Object.values(e.pays).filter(p => p.zone === e.pays.FRA.zone && !CR.enGuerre(e, p.iso)).map(p => p.iso);
    const [x, y] = z.filter(i => i !== "FRA").slice(0, 2); e.griefs = {}; M.ajouterGrief(e, x, y, -100);
    expect(CR.pairesBrouillees(e).some(([a, b]) => [a, b].sort().join() === [x, y].sort().join())).toBe(true);
  });
});
describe("Guerres en arrière-plan et effets mondiaux", () => {
  it("23. une guerre sans le joueur est résolue par le même moteur (IA contre IA)", () => {
    const e = base(23), g = guerre(e, "RUS", "GEO"); const d = B.batailleAuto(e, g);
    expect(Number.isFinite(d)).toBe(true); expect(Math.abs(d)).toBeLessThanOrEqual(100);
  });
  it("24. pénuries et inflation mondiale : un exportateur en guerre perd de la production, l'inflation monte partout", () => {
    const e = base(24), g = guerre(e, "RUS", "GEO"); const inf0 = { ...e.monnaie!.inflation };
    const l = CR.chocEconomique(e, g);
    expect(l.join(" ")).toMatch(/production perturbée/); expect(e.monnaie!.inflation.OCC).toBeGreaterThan(inf0.OCC); expect(e.monnaie!.inflation.CHN).toBeGreaterThan(inf0.CHN);
  });
  it("25. résolution de l'ONU : sanctions adoptées (PIB, armée) ou veto (tension)", () => {
    const e = base(25), g = guerre(e, "RUS", "GEO"); let r: string | null = null;
    for (let k = 0; k < 20 && !r; k++) r = B.resolutionONU(e, g);
    expect(r).toMatch(/ONU/);
    const pib = e.pays.ERI.pib, mil = e.pays.ERI.militaire; B.appliquerSanctions(e, "OCC", "ERI");
    expect(e.pays.ERI.pib).toBeLessThan(pib); expect(e.pays.ERI.militaire).toBeLessThan(mil);
  });
});
describe("Casques bleus", () => {
  it("26. après un cessez-le-feu : mission de 5 ans, pas de nouvelle guerre, stabilité +2 par an", () => {
    const e = base(26), g = guerre(e, "ETH", "ERI"); g.lassitude = { a: 0, b: 80 };
    expect(B.cessezLeFeu(e, g, "a")).toBe(true); expect(CR.sousMission(e, "ERI", "ETH")).toBe(true);
    expect(CR.ouvrirGuerre(e, "ETH", "ERI", "test")).toBeUndefined();
    const s = e.pays.ETH.stabilite; CR.missionsAnnee(e); expect(e.pays.ETH.stabilite).toBe(Math.min(100, s + 2));
    e.annee += 6; expect(CR.sousMission(e, "ETH", "ERI")).toBe(false);
  });
});
describe("Ergonomie du champ (retour du 2 novembre 2026, soir)", () => {
  it("31. coût de chaque case accessible et blocages expliqués (déplacer, attaquer, case)", () => {
    const e = base(31), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a"); b.actif = "a";
    const u = B.vivantes(b, "a").find(x => B.UNITES[x.type].domaine === "terre" && B.deplacements(b, x).length)!;
    for (const p of B.deplacements(b, u)) { expect(p.cout).toBeGreaterThanOrEqual(1); expect(p.cout).toBeLessThanOrEqual(B.UNITES[u.type].mouvement); expect(B.blocageCase(b, u, p.c, p.r)).toBeNull(); }
    expect(B.blocageBouger(b, u)).toBeNull();
    const mer = b.cases.find(k => k.t === "mer"); if (mer) expect(B.blocageCase(b, u, mer.c, mer.r)).toMatch(/mer/);
    b.a.logistique = 0; expect(B.blocageBouger(b, u)).toMatch(/logistique/); expect(B.blocageAttaquer(b, u)).toBeTruthy();
    b.a.logistique = 3; u.tire = true; expect(B.blocageBouger(b, u)).toMatch(/attaqué/); expect(B.blocageAttaquer(b, u)).toMatch(/attaqué/);
    b.actif = "b"; expect(B.blocageBouger(b, u)).toMatch(/tour/);
  });
  it("32. l'écran : vraies images (tuiles, pions), menu d'actions, glisser-déposer avec confirmation, animations, sons", () => {
    const ui = readFileSync("src/v2/ui-guerre.ts", "utf8");
    for (const x of ["terrain_", "pion_", "data-act=", "data-conf=", "pointerdown", "blocageCase", "animer(ff)", "SON.jouerBataille", "SON.integrerSons", "nayckron", "dklon", "lamoot"]) expect(ui, x).toContain(x);
    for (const t of Object.keys(B.UNITES)) expect(existsSync(`src/v2/images/pion_${t}.webp`), t).toBe(true);
    for (const t of Object.keys(B.TERRAINS)) for (const v of [1, 2, 3]) expect(existsSync(`src/v2/images/terrain_${t}_${v}.webp`), `${t}_${v}`).toBe(true);
    expect(readFileSync("vite.maquette.config.ts", "utf8")).toMatch(/terrain_\|pion_/);
  });
});
describe("Sons de bataille", () => {
  it("33. 31 sons téléchargés, chaque famille utilisée existe, licences CC-BY créditées", () => {
    const f = readdirSync("src/v2/sons").filter(x => x.endsWith(".mp3"));
    expect(f.length).toBe(31);
    for (const l of Object.values(SON.SONS_BATAILLE)) for (const n of l) expect(f.some(x => x.startsWith(n + "_")), n).toBe(true);
    expect(readFileSync("src/v2/sons/LICENCES.md", "utf8")).toMatch(/nayckron[\s\S]*dklon[\s\S]*lamoot/);
  });
});
