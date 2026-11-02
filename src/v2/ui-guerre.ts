// Écran de la phase de guerre jouée (demandes du 2 novembre 2026). Il ne s'ouvre que pour les guerres où le camp du joueur
// participe (leader en guerre, pays garanti ou soutenu). Trois temps : préparation (général, budget, front intérieur, ONU), bataille
// sur un champ en hexagones (4 saisons ; unités, terrain, brouillard de guerre), puis résultat. Le code d'affichage ne tire jamais au sort.
import * as M from "./moteur";
import * as CR from "./crises";
import * as B from "./bataille";

export interface OutilsUI { fenetre: (html: string, large?: boolean) => HTMLElement; img: (n?: string) => string | undefined; esc: (s: string) => string }
const pct = (x: number) => `${Math.round(100 * x)} %`;

export function phaseGuerre(e: M.EtatV2, g: CR.Guerre, cote: "a" | "b", fini: () => void, U: OutilsUI) {
  const { fenetre, img, esc } = U, camp = e.joueur, moi = e.pays[cote === "a" ? g.a : g.b], lui = e.pays[cote === "a" ? g.b : g.a];
  const image = (l: string[]) => l.map(n => img(n)).find(Boolean);
  const fond = (l: string[]) => { const u = image(l); return u ? `style="background-image:linear-gradient(180deg,rgba(15,22,34,.6),rgba(15,22,34,.2) 38%,rgba(15,22,34,.82)),url('${u}')"` : ""; };
  const generaux = B.candidatsGeneraux(g, camp);
  let choixGen = 0, tranches = 0, mobiliser = false, censurer = false, financement: "impots" | "dette" = "impots", onu = "";

  // ---------- 1. Préparation ----------
  function preparation() {
    const ren = B.renforts(e, g, cote), libre = Math.max(0, e.budget[camp] - e.boostsUtilises[camp]), proj = cote === "a" ? B.projection(e, moi.iso, lui.iso) : 1, base = B.baseAlliee(e, moi.iso, g);
    const f = fenetre(`<div class="gu"><header class="gu-tete" ${fond(["guerre_projection", "guerre_5"])}><div><small>Phase de guerre · ${e.annee} · année ${e.annee - g.debut + 1}</small><h1>${esc(moi.nom)} <em>contre</em> ${esc(lui.nom)}</h1>
        <p>Score de guerre ${Math.round(cote === "a" ? g.score : -g.score)} · occupation ${Math.round((cote === "a" ? g.occ?.a : g.occ?.b) ?? 0)} % chez l'ennemi, ${Math.round((cote === "a" ? g.occ?.b : g.occ?.a) ?? 0)} % chez toi · lassitude ${Math.round(g.lassitude?.[cote] ?? 0)}</p></div></header>
      <section><h3>Choisis ton général</h3><div class="gu-gens">${generaux.map((x, i) => `<button class="gu-gen${i === choixGen ? " choisi" : ""}" data-i="${i}">${img(x.portrait) ? `<img src="${img(x.portrait)}" alt="">` : `<span class="gu-sans">★</span>`}<b>${esc(x.nom)}</b><small>${esc(B.TRAITS_GENERAL[x.trait])}</small></button>`).join("")}</div></section>
      <div class="gu-deux">
        <section><h3>Budget de guerre <small>${libre} unité${libre > 1 ? "s" : ""} libre${libre > 1 ? "s" : ""}</small></h3>
          <div class="gu-tranches">${[0, 1, 2, 3].map(n => `<button data-t="${n}" class="${n === tranches ? "choisi" : ""}" ${n > libre ? "disabled" : ""}>${n === 0 ? "Aucun" : `${n} ◆`}<small>${n ? `+${n} logistique par tour, ${n} frappe${n > 1 ? "s" : ""} de missiles` : "armée seule"}</small></button>`).join("")}</div></section>
        <section><h3>Front intérieur</h3>
          <label class="gu-case"><input type="checkbox" class="gu-mob" ${mobiliser ? "checked" : ""}> Mobiliser <small>+2 divisions d'infanterie, stabilité −5</small></label>
          <label class="gu-case"><input type="checkbox" class="gu-cens" ${censurer ? "checked" : ""}> Censurer la presse <small>lassitude −10, stabilité −3 (sinon informer : stabilité +2)</small></label>
          <div class="gu-fin"><button data-f="impots" class="${financement === "impots" ? "choisi" : ""}">Impôts de guerre<small>stabilité −4</small></button><button data-f="dette" class="${financement === "dette" ? "choisi" : ""}">Emprunt<small>dette +4</small></button><span>+1 logistique par tour</span></div></section>
      </div>
      <section class="gu-info-l"><span title="Part de l'armée engagée loin de chez elle (marine et aviation de transport)">Projection <b>${pct(proj)}</b></span><span title="Pays de la zone du front, relation ≥ 50 : +1 logistique">Base alliée <b>${base ? esc(e.pays[base].nom) : "aucune"}</b></span>
        <span>Ton armée <b>${B.compositionArmee(e, moi.iso, true).length} formations</b>${ren.length ? ` + <b>${ren.length}</b> en renfort (${[...new Set(ren.map(c => c.de!))].map(i => esc(e.pays[i].nom)).join(", ")})` : ""}</span><span>Armée adverse <b>${B.compositionArmee(e, lui.iso, true).length} formations</b> (estimation du renseignement)</span>
        <button class="v2-sec gu-onu" ${onu ? "disabled" : ""}>Saisir le Conseil de sécurité</button></section>
      ${onu ? `<p class="gu-onu-r">${esc(onu)}</p>` : ""}
      <div class="v2-pied"><span class="v2-etat">Tu commandes ${esc(moi.nom)}. L'adversaire est joué par l'IA.</span><button class="v2-sec gu-cessez">Proposer un cessez-le-feu</button><button class="v2-ok v2-prim">Engager la bataille →</button></div></div>`, true);
    f.querySelectorAll<HTMLElement>(".gu-gen").forEach(x => (x.onclick = () => { choixGen = +x.dataset.i!; preparation(); }));
    f.querySelectorAll<HTMLElement>("[data-t]").forEach(x => (x.onclick = () => { tranches = +x.dataset.t!; preparation(); }));
    f.querySelectorAll<HTMLElement>("[data-f]").forEach(x => (x.onclick = () => { financement = x.dataset.f as "impots" | "dette"; preparation(); }));
    (f.querySelector(".gu-mob") as HTMLInputElement).onchange = ev => (mobiliser = (ev.target as HTMLInputElement).checked);
    (f.querySelector(".gu-cens") as HTMLInputElement).onchange = ev => (censurer = (ev.target as HTMLInputElement).checked);
    (f.querySelector(".gu-onu") as HTMLElement).onclick = () => { const v = B.voteSanctions(e, camp, lui.iso);
      if (v.adopte) B.appliquerSanctions(e, camp, lui.iso);
      onu = v.adopte ? `Sanctions adoptées contre ${lui.nom} (${v.oui} voix sur 15) : PIB −1 %, armée −10 %.` : v.veto ? `Veto de ${e.pays[v.veto].nom} : pas de sanctions.` : `Résolution rejetée : ${v.oui} voix sur 15, il en faut 9.`; preparation(); };
    (f.querySelector(".gu-cessez") as HTMLElement).onclick = () => { const ok = B.cessezLeFeu(e, g, cote);
      if (ok) return conclusion(`Cessez-le-feu accepté. Retour aux frontières d'avant-guerre, casques bleus de l'ONU déployés pour 5 ans.`);
      onu = `Cessez-le-feu refusé : l'adversaire n'est pas assez las (il faut 60 de lassitude ou 25 points de score). Ta lassitude +5.`; preparation(); };
    (f.querySelector(".v2-ok") as HTMLElement).onclick = () => {
      const k = B.engagerBudget(e, camp, tranches), fi = B.frontInterieur(e, g, cote, camp, { mobiliser, censurer, financement });
      const b = B.preparerBataille(e, g, cote, { general: generaux[choixGen], tranches: k, tranchesIA: B.tranchesIA(e, M.autre(camp)), bonus: { [cote]: fi.bonus } });
      b.journal.push(`Préparation : ${fi.lignes.join(" ; ")}.`); bataille(b);
    };
  }

  // ---------- 2. Bataille sur le champ (4 saisons ; à chaque saison l'attaquant joue, puis le défenseur) ----------
  const ad = cote === "a" ? "b" : "a";
  const R = 28, W = Math.sqrt(3) * R, pos = (c: number, r: number) => [W * (c + 0.5 * (r & 1)) + W / 2 + 4, 1.5 * R * r + R + 4];
  const hexa = (x: number, y: number, k = 1) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(x + R * k * Math.cos(a)).toFixed(1)},${(y + R * k * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const COUL_T: Record<B.Terrain, string> = { plaine: "#e9e2c4", foret: "#9fbf8a", colline: "#d4c08f", montagne: "#b4a99a", ville: "#d9d3cc", riviere: "#b9e0dc", mer: "#6f9fcf" };
  const SYMB_T: Record<B.Terrain, string> = { plaine: "", foret: "♣", colline: "⌒", montagne: "▲", ville: "▦", riviere: "≈", mer: "" };
  let sel: string | null = null, mode: "" | "recon" | "missile" = "", survol: string | null = null, avisEnnemi: string[] = [];
  const pc = (x: number) => `${Math.round(100 * x)} %`;
  function plateau(b: B.Bataille) {
    const u = sel ? b.unites.find(x => x.id === sel && x.pv > 0) : undefined, monTour = b.actif === cote && !b.finie;
    const ok = monTour && b[cote].logistique >= 1, dep = u && ok && !u.bouge && !u.tire ? B.deplacements(b, u) : [], cib = u && ok ? B.ciblesDe(b, u) : [];
    const vus = B.ennemisVus(b, cote), fant = Object.entries(b[cote].vus).filter(([id]) => !vus.some(v => v.id === id));
    const largeur = W * (b.cols + 0.5) + 8, hauteur = 1.5 * R * (b.rows - 1) + 2 * R + 8;
    let s = `<svg class="gu-plateau" viewBox="0 0 ${largeur.toFixed(0)} ${hauteur.toFixed(0)}" role="img" aria-label="Champ de bataille">`;
    for (const k of b.cases) { const [x, y] = pos(k.c, k.r), o = b.objectifs.find(q => q.c === k.c && q.r === k.r), d = dep.some(p => p.c === k.c && p.r === k.r), rc = mode === "recon" && monTour;
      s += `<g class="gu-hex${d || rc ? " jouable" : ""}" data-c="${k.c}" data-r="${k.r}"><title>${B.TERRAINS[k.t].nom}${o ? ` · ${esc(o.nom)}` : ""} : ${esc(B.TERRAINS[k.t].aide)}</title><polygon points="${hexa(x, y)}" fill="${COUL_T[k.t]}" stroke="#fff" stroke-width="1.5"/>`;
      if (k.t !== "mer") s += `<polygon points="${hexa(x, y, 0.92)}" fill="${k.tenu === cote ? "rgba(46,111,201,.2)" : "rgba(196,64,52,.2)"}" stroke="none"/>`;
      if (SYMB_T[k.t]) s += `<text x="${x}" y="${y + 18}" class="gu-symb">${SYMB_T[k.t]}</text>`;
      if (o) s += `<polygon points="${hexa(x, y, 0.86)}" fill="none" stroke="${o.tenu === cote ? "#2e6fc9" : "#c44034"}" stroke-width="3.5" stroke-dasharray="5 3"/>`;
      if (d) s += `<polygon points="${hexa(x, y, 0.8)}" fill="rgba(60,160,90,.35)" stroke="#2f8a50" stroke-width="2"/>`;
      s += `</g>`; }
    for (const [, f] of fant) { const [x, y] = pos(f.c, f.r); s += `<g class="gu-fantome"><title>Dernière position connue (saison ${f.tour}) : ${B.UNITES[f.type].nom}</title><circle cx="${x}" cy="${y}" r="16"/><text x="${x}" y="${y + 5}">?</text></g>`; }
    for (const v of B.vivantes(b)) { if (v.cote !== cote && !vus.includes(v)) continue;
      const [x, y] = pos(v.c, v.r), d = B.UNITES[v.type], cible = cib.includes(v), fini = v.cote === cote && monTour && v.tire && (v.bouge || v.type === "artillerie");
      const pr = cible && u ? B.previsionAttaque(b, u, v) : null;
      s += `<g class="gu-u ${v.cote === cote ? "moi" : "eux"}${v.id === sel ? " sel" : ""}${cible ? " cible" : ""}${fini ? " fini" : ""}${d.domaine !== "terre" ? " " + d.domaine : ""}" data-u="${v.id}"><title>${esc(d.nom)}${v.de ? ` (${esc(e.pays[v.de]?.nom ?? "")})` : ""} · ${v.pv}/${v.pvMax} PV · mouvement ${d.mouvement} · portée ${d.portee} · ${d.des} dés${pr ? ` — ${pr.des} dés à ${pc(pr.p)}, ${pc(pr.detruire)} de la détruire` : ""}</title>
        <circle cx="${x}" cy="${y}" r="19"/><text x="${x}" y="${y + 6}" class="gu-ic">${d.icone}</text>${Array.from({ length: v.pvMax }, (_, i) => `<rect x="${x - v.pvMax * 3.5 + i * 7}" y="${y + 13}" width="5.5" height="4" rx="1" class="${i < v.pv ? "pv" : "pv0"}"/>`).join("")}
        ${pr ? `<rect x="${x - 25}" y="${y - 33}" width="50" height="15" rx="7" class="gu-pct"/><text x="${x}" y="${y - 22}" class="gu-pct-t">${pr.des}×${Math.round(100 * pr.p)}%</text>` : ""}</g>`; }
    // Noms des objectifs au premier plan, au-dessus des unités.
    for (const o of b.objectifs) { const [x, y] = pos(o.c, o.r); s += `<text x="${x}" y="${y - 21}" class="gu-obj-n ${o.tenu === cote ? "moi" : "eux"}">★ ${esc(o.nom.length > 24 ? o.nom.slice(0, 23) + "…" : o.nom)}</text>`; }
    return s + `</svg>`;
  }
  function ficheUnite(b: B.Bataille) {
    const u = sel ? b.unites.find(x => x.id === sel && x.pv > 0) : undefined; if (!u) return `<div class="gu-fiche vide"><b>Choisis une unité</b><p>Clique une de tes unités : ses déplacements apparaissent en vert, ses cibles clignotent avec leurs dés et la chance de toucher par dé (survole une cible pour la chance de la détruire). Bouger coûte 1 logistique, attaquer 1 de plus.</p></div>`;
    const d = B.UNITES[u.type], t = survol ? b.unites.find(x => x.id === survol && x.pv > 0) : undefined, pr = t && B.ciblesDe(b, u).includes(t) ? B.previsionAttaque(b, u, t) : null, ph = img(`carte_g_${u.type}`);
    const eff = (Object.keys(B.EFFICACITE[u.type]) as B.Classe[]).filter(k => B.EFFICACITE[u.type][k] > 0).map(k => `${{ leger: "infanterie", blinde: "blindés", artillerie: "artillerie", aerien: "aviation", naval: "navires" }[k]} ×${String(B.EFFICACITE[u.type][k]).replace(".", ",")}`).join(" · ");
    return `<div class="gu-fiche">${ph ? `<span class="gu-fiche-img" style="background-image:url('${ph}')"></span>` : ""}<b>${d.icone} ${esc(d.nom)}${u.de ? ` <small>(${esc(e.pays[u.de]?.nom ?? "")})</small>` : ""}</b>
      <p class="gu-stats"><span>PV <b>${u.pv}/${u.pvMax}</b></span><span>Mouv. <b>${d.mouvement}</b></span><span>Portée <b>${B.portee(b, u)}</b></span><span>Dés <b>${B.desDe(u)}</b></span></p><p class="gu-aide">${esc(d.aide)}</p><p class="gu-eff">Efficacité : ${eff}</p>
      ${u.cote === cote ? `<p class="gu-etat">${u.tire ? "A déjà attaqué ce tour." : u.bouge ? (u.type === "artillerie" ? "A bougé : ne peut plus tirer." : "A bougé : peut encore attaquer.") : "Prête."}</p>` : ""}
      ${pr && t ? `<div class="gu-prev"><b>Attaque sur ${esc(B.UNITES[t.type].nom.toLowerCase())}</b><span>${pr.des} dés à ${pc(pr.p)} : ${String(pr.attendu.toFixed(1)).replace(".", ",")} touche${pr.attendu >= 2 ? "s" : ""} attendue${pr.attendu >= 2 ? "s" : ""}</span><span>Chance de la détruire : <b>${pc(pr.detruire)}</b></span>${pr.riposte ? `<span class="moins">Riposte attendue : ${String(pr.riposte.toFixed(1)).replace(".", ",")} touche</span>` : ""}</div>` : ""}</div>`;
  }
  function bilanSaisons(b: B.Bataille) {
    const lignes = b.bilans.slice(-4).reverse().map(x => `<li class="${x.cote === cote ? "moi" : "eux"}"><b>${B.SAISONS[x.tour - 1]} · ${x.cote === cote ? "ton tour" : "tour ennemi"}</b> : ${x.infligees} touche${x.infligees > 1 ? "s" : ""} infligée${x.infligees > 1 ? "s" : ""}, ${x.subies} subie${x.subies > 1 ? "s" : ""}${x.pris.length ? ` · prend ${x.pris.map(esc).join(", ")}` : ""}${x.perdus.length ? ` · détruit : ${x.perdus.map(esc).join(", ")}` : ""}</li>`).join("");
    const r = B.resultat(b), d = cote === "a" ? r.d : -r.d, av = Math.min(CR.SCORE.front, Math.abs(d) * CR.SCORE.avance);
    return `<div class="gu-estim ${d > 0 ? "plus" : d < 0 ? "moins" : ""}"><span>Si l'année s'arrêtait maintenant</span><b>${d >= 0 ? "+" : "−"}${Math.round(Math.abs(d))}</b><em>${r.issue === "enlisement" ? "enlisement" : `${d >= 0 ? "ta" : "sa"} ${r.issue}`}, front ${d >= 0 ? "+" : "−"}${Math.round(av)} %</em>
      <div class="gu-estim-d"><span>Objectifs ${cote === "a" ? r.tenusA : r.tenusB}/3</span><span>Terrain ${d >= 0 && r.terrain * (cote === "a" ? 1 : -1) >= 0 ? "+" : ""}${Math.round(100 * r.terrain * (cote === "a" ? 1 : -1))} pts</span><span>Pertes ${pc(cote === "a" ? r.partA : r.partB)} contre ${pc(cote === "a" ? r.partB : r.partA)}</span></div></div>
      ${lignes ? `<ol class="gu-saisons">${lignes}</ol>` : ""}${avisEnnemi.length ? `<div class="gu-avis-ennemi"><b>Ce que tu as vu du tour ennemi</b><ul>${avisEnnemi.slice(-6).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
  }
  // L'IA joue son tour ; le joueur ne voit que ce qui touche ses unités ou ce que son brouillard laisse voir.
  function tourIA(b: B.Bataille) {
    const n0 = b.journal.length; B.jouerIA(e, b, ad);
    avisEnnemi = b.journal.slice(n0).filter(x => /attaque|prend|missiles|satellite|brouillage|Riposte/.test(x)).map(x => x.replace(/^\S+ : /, ""));
    if (!avisEnnemi.length) avisEnnemi = ["Aucun contact : l'ennemi a manœuvré hors de ta vue."];
  }
  function bataille(b: B.Bataille) {
    if (!b.finie && b.actif !== cote) tourIA(b);
    const f = b[cote], monTour = b.actif === cote && !b.finie;
    const puissanceNuc = B.peutNucleaire(e, g, cote) && !b.nucleaire?.strategique, risN = puissanceNuc ? B.risquesNucleaires(e, g, cote, "tactique") : null, risB = B.risquesBio(e, g, cote);
    const ff = fenetre(`<div class="gu gu-champ"><header class="gu-barre"><div><small>${esc(moi.nom)} contre ${esc(lui.nom)} · général ${esc(f.general?.nom ?? "")} · ${cote === b.premier ? "tu attaques" : "tu défends"}</small><h2>${b.finie ? "Fin de l'année de guerre" : `${B.SAISONS[b.tour - 1]} ${b.annee}`} <span>${b.finie ? "" : `saison ${b.tour} sur ${b.tours}`}</span></h2></div>
        <div class="gu-res"><span title="Points de logistique : 1 par déplacement, 1 par attaque">Logistique <b>${f.logistique}</b>/${f.base}</span><span title="Formations détruites : les tiennes et celles de l'ennemi">Détruites <b>${f.detruites.length}</b> · ${b[ad].detruites.length}</span></div></header>
      ${monTour ? `<div class="gu-actions"><button class="v2-sec" data-sp="recon" ${f.logistique < 1 ? "disabled" : ""} title="1 logistique : révèle l'ennemi dans un rayon de 3 autour de la case choisie">🔭 Reconnaissance</button>
        <button class="v2-sec" data-sp="sat" ${B.peutSatellite(b, cote) && f.logistique >= 2 ? "" : "disabled"} title="2 logistique : tout le théâtre visible cette saison (spatial ≥ 40)">🛰 Satellite</button>
        <button class="v2-sec" data-sp="brou" ${B.peutBrouiller(b, cote) && f.logistique >= (f.general?.trait === "cyber" ? 0 : 2) ? "" : "disabled"} title="2 logistique : l'ennemi perd 2 logistique à son prochain tour (cyber ≥ 20)">⌁ Brouillage</button>
        <button class="v2-sec" data-sp="missile" ${f.missiles > 0 ? "" : "disabled"} title="Frappe de missiles achetée avec le budget de guerre : 3 dés sur une unité visible">🚀 Missiles (${f.missiles})</button>
        ${mode ? `<span class="gu-mode">${mode === "recon" ? "Choisis la case à reconnaître." : "Choisis une unité ennemie visible."} <button class="v2-sec" data-sp="annuler">Annuler</button></span>` : ""}</div>` : ""}
      <div class="gu-corps"><div class="gu-carte-champ">${plateau(b)}<p class="gu-legende"><i class="moi"></i>tes unités <i class="eux"></i>ennemies vues <i class="fant"></i>dernière position connue <span>Teinte : terrain tenu · ★ objectifs (pointillé de la couleur du camp qui les tient)</span></p></div>
        <aside class="gu-cote">${ficheUnite(b)}${bilanSaisons(b)}</aside></div>
      <div class="gu-bas"><details class="gu-journal"><summary>Journal complet (${b.journal.length})</summary><ol>${b.journal.slice().reverse().map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>
        ${!b.finie ? `<details class="gu-adm"><summary>☢ Armes de destruction massive</summary>
          ${puissanceNuc && risN ? `<p>Tactique : riposte ${pct(risN.riposte)}${risN.riposteur ? ` (${esc(e.pays[risN.riposteur].nom)})` : ""}, frappe préventive ${pct(risN.preventive)}, coalition de ${risN.coalition} pays, jauge mondiale ${risN.hiver} sur 10${risN.crise ? " : CRISE MONDIALE" : ""}${risN.defaite ? " : DÉFAITE du camp responsable" : ""}.</p>
            <div class="gu-adm-b"><button data-n="menace" ${b.nucleaire?.menace ? "disabled" : ""}>Menace (+15 %, tension +2)</button><button data-n="tactique">Frappe tactique…</button><button data-n="strategique">Frappe stratégique…</button></div>` : `<p>${esc(moi.nom)} n'a pas l'arme nucléaire.</p>`}
          <p>Biologique : fuite ${pct(risB.fuite)}, attribution ${pct(risB.attribution)}, jauge ${risB.jauge} sur 10${risB.crise ? " : CRISE MONDIALE" : ""}${risB.defaite ? " : DÉFAITE" : ""}.</p><div class="gu-adm-b"><button data-n="bio">Arme biologique…</button></div></details>` : ""}</div>
      <div class="v2-pied"><span class="v2-etat">${b.finie ? "Les 4 saisons sont jouées." : "Chaque action coûte de la logistique : choisis où concentrer l'effort. Le terrain non vu reste dans le brouillard."}</span>
        ${b.finie ? `<button class="v2-ok v2-prim gu-fin-b">Voir le résultat →</button>` : `<button class="v2-ok v2-prim gu-tour">Fin du tour →</button>`}</div></div>`, true);
    const svg = ff.querySelector(".gu-plateau") as SVGElement;
    svg.querySelectorAll<SVGGElement>(".gu-u").forEach(x => {
      x.addEventListener("mouseenter", () => { if (sel && x.classList.contains("cible")) { survol = x.dataset.u!; const a = ff.querySelector(".gu-fiche"); if (a) a.outerHTML = ficheUnite(b); } });
      x.addEventListener("click", ev => { ev.stopPropagation(); const v = b.unites.find(y => y.id === x.dataset.u)!;
        if (mode === "missile" && v.cote !== cote) { B.missile(e, b, cote, v.id); mode = ""; return bataille(b); }
        if (sel && v.cote !== cote && monTour) { B.attaquer(e, b, cote, sel, v.id); survol = null; return bataille(b); }
        sel = v.cote === cote ? (sel === v.id ? null : v.id) : sel; survol = v.cote !== cote ? v.id : null; bataille(b); }); });
    svg.querySelectorAll<SVGGElement>(".gu-hex").forEach(x => x.addEventListener("click", () => { const c = +x.dataset.c!, r = +x.dataset.r!;
      if (mode === "recon") { B.reconnaitre(b, cote, c, r); mode = ""; return bataille(b); }
      if (sel && x.classList.contains("jouable")) { B.deplacer(b, cote, sel, c, r); return bataille(b); } }));
    ff.querySelectorAll<HTMLElement>("[data-sp]").forEach(x => (x.onclick = () => { const k = x.dataset.sp!;
      if (k === "sat") B.satellite(b, cote); else if (k === "brou") B.brouiller(b, cote); else if (k === "annuler") mode = ""; else mode = k as "recon" | "missile"; bataille(b); }));
    const t = ff.querySelector(".gu-tour") as HTMLElement | null; if (t) t.onclick = () => { sel = null; mode = ""; survol = null; B.finTour(b); bataille(b); };
    const fb = ff.querySelector(".gu-fin-b") as HTMLElement | null; if (fb) fb.onclick = () => resultat(b);
    ff.querySelectorAll<HTMLElement>("[data-n]").forEach(x => (x.onclick = () => {
      const n = x.dataset.n!;
      if (n !== "menace" && !confirm(n === "bio" ? "Utiliser une arme biologique ? L'agent peut échapper à tout contrôle et frapper le monde entier, toi compris." : `Frappe ${n === "tactique" ? "tactique sur l'objectif ennemi le plus proche" : "stratégique"} ? Les risques affichés s'appliquent immédiatement.`)) return;
      const cible = Math.max(0, b.objectifs.findIndex(o => o.tenu !== cote));
      const txt = n === "bio" ? B.biologique(e, b, g, cote) : B.nucleaire(e, b, g, cote, n as "menace" | "tactique" | "strategique", cible);
      b.journal.push(txt); if (e.defaite) b.finie = true; bataille(b);
    }));
  }

  // ---------- 3. Résultat ----------
  function resultat(b: B.Bataille) {
    const r = B.resultat(b), d = cote === "a" ? r.d : -r.d, av = Math.min(CR.SCORE.front, Math.abs(d) * CR.SCORE.avance); B.enregistrer(g, b, e);
    const tenus = cote === "a" ? r.tenusA : r.tenusB, mesP = cote === "a" ? r.partA : r.partB, sesP = cote === "a" ? r.partB : r.partA;
    const titre = r.issue === "enlisement" ? "Enlisement" : `${d > 0 ? "Ta" : "Sa"} ${r.issue}`;
    conclusion(`${titre} (${d >= 0 ? "+" : "−"}${Math.round(Math.abs(d))}) : ${tenus} objectif${tenus > 1 ? "s" : ""} sur 3 tenu${tenus > 1 ? "s" : ""} par toi, terrain ${Math.round(100 * r.terrain * (cote === "a" ? 1 : -1))} points, pertes ${pc(mesP)} de tes forces contre ${pc(sesP)} chez l'ennemi (${b[cote].detruites.length} formation${b[cote].detruites.length > 1 ? "s" : ""} détruite${b[cote].detruites.length > 1 ? "s" : ""} contre ${b[ad].detruites.length})${r.deroute ? `, ${(r.deroute > 0) === (cote === "a") ? "l'ennemi est en déroute" : "tes forces sont en déroute"}` : ""}. Le front avancera de ${Math.round(av)} % ${d >= 0 ? "en ta faveur" : "contre toi"} à la fin de l'année.`, b);
  }
  function conclusion(texte: string, b?: B.Bataille) {
    const f = fenetre(`<div class="gu"><header class="gu-tete" ${fond(/cessez/i.test(texte) ? ["guerre_casques_bleus"] : ["guerre_9", "guerre_1"])}><div><small>Phase de guerre · ${e.annee}</small><h1>${esc(moi.nom)} <em>contre</em> ${esc(lui.nom)}</h1></div></header>
      <p class="gu-conclu">${esc(texte)}</p>${e.defaite ? `<p class="gu-conclu moins">${esc(e.defaite.raison)} : ${e.defaite.camp === camp ? "ton camp perd la partie." : "le camp adverse perd la partie."}</p>` : ""}
      ${b ? `<details class="gu-journal" open><summary>Journal de la bataille</summary><ol>${b.journal.map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>` : ""}
      <div class="v2-pied"><span class="v2-etat">La suite de la guerre se résout en fin d'année avec les autres événements.</span><button class="v2-ok v2-prim">Continuer →</button></div></div>`, true);
    (f.querySelector(".v2-ok") as HTMLElement).onclick = fini;
  }
  preparation();
}
