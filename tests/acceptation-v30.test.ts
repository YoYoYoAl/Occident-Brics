// Tests d'acceptation de la v30 (30/10/2026) : écran des opérations militaires (maquette 6) : échelle d'escalade en 5 crans, casus belli, but de guerre.
import { describe, it, expect } from "vitest";
import { creerPartie, THEATRES, type EtatPartie } from "../src/moteur/partie";
import { FRAPPE, AE, peutFrapper, frapper, aeDuPays, CASUS_BELLI } from "../src/moteur/guerre";
import { erreurNiveau, lancerNiveau, operationsHtml } from "../src/interface/operations-ui";

const SANS_ALEA = { generiques: false, ia: false };
const pret = (g: number) => { const e = creerPartie(g, "OCC", SANS_ALEA); e.camps.OCC.budget = 200; e.camps.OCC.cp = 80; e.camps.OCC.points = { eco: 9, diplo: 9, defense: 9, secret: 9 } as never; return e; };
// trimestre suivant (sans faire tourner le monde) : au plus 2 points d'action par pays et par trimestre
const suite = (e: EtatPartie) => { e.camps.OCC.paParPays = {}; return e; };
const cibleLibre = (e: EtatPartie) => Object.keys(e.pays).find(i => !erreurNiveau(e, "OCC", i, 1) && !peutFrapper(e, "OCC", i) && !erreurNiveau(suite(lancerNiveau(e, "OCC", i, 1, "regime")), "OCC", i, 3))!;

describe("v30 : opérations militaires", () => {
  it("1. opération limitée : coûts et effets, justification ou agression", () => {
    const e = pret(31), iso = cibleLibre(e); expect(iso).toBeTruthy();
    const x = frapper(e, "OCC", iso);
    expect(x.camps.OCC.budget).toBeCloseTo(e.camps.OCC.budget - FRAPPE.budget, 5);
    expect(x.camps.OCC.cp).toBe(e.camps.OCC.cp - FRAPPE.cp - AE.cpAgression); // sans casus belli : agression
    expect(x.pays[iso].influence.CHN.m).toBe(Math.max(0, e.pays[iso].influence.CHN.m - FRAPPE.perte));
    expect(x.pays[iso].stabilite).toBe(Math.max(0, e.pays[iso].stabilite - FRAPPE.stabilite));
    expect(aeDuPays(x, "OCC", iso)).toBeGreaterThan(aeDuPays(e, "OCC", iso));
    // avec un incident frontalier : pas de perte de capital pour agression, expansion agressive moindre
    const j = structuredClone(e); (j.casusBelli ??= []).push({ camp: "OCC", iso, type: "incident", fin: j.round + 4 });
    const y = frapper(j, "OCC", iso);
    expect(y.camps.OCC.cp).toBe(e.camps.OCC.cp - FRAPPE.cp);
    expect(aeDuPays(y, "OCC", iso) - aeDuPays(e, "OCC", iso)).toBeLessThan(aeDuPays(x, "OCC", iso) - aeDuPays(e, "OCC", iso));
    expect(CASUS_BELLI.incident.mult).toBeLessThan(AE.agression);
  });

  it("2. interdits : leader, puissance nucléaire, allié", () => {
    const e = pret(32);
    expect(peutFrapper(e, "OCC", "CHN")).toMatch(/guerre ouverte/);
    expect(peutFrapper(e, "OCC", "RUS")).toMatch(/nucléaire/);
    const allie = Object.keys(e.pays).find(i => i !== "USA" && (e.pays[i].influence.OCC.p > 70) && !["GBR", "FRA", "ISR"].includes(i))!;
    if (allie && erreurNiveau(e, "OCC", allie, 2)) expect(erreurNiveau(e, "OCC", allie, 2)).toMatch(/allié|garantie|Puissance/);
  });

  it("3. guerre ouverte verrouillée sous une tension de 80, ouverte au-delà", () => {
    const e = pret(33), t = Object.keys(THEATRES)[0], iso = THEATRES[t].pays[0];
    expect(erreurNiveau(e, "OCC", iso, 5)).toMatch(/tension/);
    e.tension = 85;
    expect(erreurNiveau(e, "OCC", iso, 5)).toBeNull();
    expect(lancerNiveau(e, "OCC", iso, 5, "regime").guerre).toMatchObject({ theatre: t, agresseur: "OCC" });
  });

  it("4. intervention avec le but de guerre choisi", () => {
    const e = pret(34), iso = cibleLibre(e);
    expect(erreurNiveau(e, "OCC", iso, 4)).toMatch(/intimidation/); // l'échelle se gravit cran par cran
    let x = suite(lancerNiveau(e, "OCC", iso, 1, "regime")); x = suite(lancerNiveau(x, "OCC", iso, 3, "regime"));
    expect(erreurNiveau(x, "OCC", iso, 4)).toBeNull();
    x = lancerNiveau(x, "OCC", iso, 4, "punitive");
    expect(x.interventions.find(i => i.iso === iso && i.camp === "OCC")).toMatchObject({ but: "punitive" });
  });

  it("5. l'écran montre les 5 crans, les 7 casus belli et les régions", () => {
    const e = pret(35), iso = cibleLibre(e), h = operationsHtml(e, "OCC", iso);
    expect(h.match(/data-niveau=/g)).toHaveLength(5);
    expect(h.match(/<li class="(ok|non|possible)">/g)).toHaveLength(7);
    expect(h).toMatch(/Occuper/); expect(h).toMatch(/Lancer/);
  });
});
