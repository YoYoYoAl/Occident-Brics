// Écran de la phase de guerre jouée (demandes du 2 novembre 2026). Il ne s'ouvre que pour les guerres où le camp du joueur
// participe (leader en guerre, pays garanti ou soutenu). Trois temps : préparation (général, budget, front intérieur, ONU), bataille
// sur un champ en hexagones (4 saisons ; unités, terrain, brouillard de guerre), puis résultat. Le code d'affichage ne tire jamais au sort.
import * as M from "./moteur";
import * as CR from "./crises";
import * as B from "./bataille";
import * as SON from "../interface/sons";
// Sons de bataille (intégrés au HTML de la maquette) : bat_infanterie_1.mp3 → variante de « bat_infanterie ».
SON.integrerSons(Object.fromEntries(Object.entries(import.meta.glob("./sons/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>).map(([k, v]) => [k.slice(7, -4), v])));

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
  // Retour du 2 novembre 2026 (soir) : vraies images pour chaque tuile et chaque pion ; clic sur une unité → menu d'actions
  // (Déplacer, Attaquer, coût affiché, blocage expliqué) ; cases accessibles en surbrillance ; portée visible ; glisser-déposer
  // avec confirmation ; animations (glissement, tir, impact, destruction).
  const COUL_T: Record<B.Terrain, string> = { plaine: "#cfc79a", foret: "#7f9f6a", colline: "#bba774", montagne: "#9a8f80", ville: "#bdb6ae", riviere: "#8fc4bf", mer: "#4f7fb0" };
  const VARIANTES_T = 3, varianteT = (c: number, r: number) => 1 + ((c * 7 + r * 3 + c * r) % VARIANTES_T);
  const imgT = (t: B.Terrain, v: number) => img(`terrain_${t}_${v}`) ?? img(`terrain_${t}_1`);
  const imgP = (t: B.TypeUnite) => img(`pion_${t}`) ?? img(`carte_g_${t}`);
  type Confirmation = { type: "bouger"; c: number; r: number } | { type: "attaquer"; id: string };
  let sel: string | null = null, act: "" | "bouger" | "attaquer" = "", mode: "" | "recon" | "missile" = "", survol: string | null = null, avisEnnemi: string[] = [], msg = "";
  let confirmer: Confirmation | null = null, glisse: { id: string; x: number; y: number; bouge: boolean } | null = null, supprimerClic = false;
  let anim: { id: string; de: [number, number] }[] = [], impacts: { de?: [number, number]; vers: [number, number]; n: number; detruit: boolean; arme: string }[] = [];
  const pc = (x: number) => `${Math.round(100 * x)} %`;
  const unite = (b: B.Bataille) => (sel ? b.unites.find(x => x.id === sel && x.pv > 0) : undefined);
  const taille = (b: B.Bataille) => [W * (b.cols + 0.5) + 8, 1.5 * R * (b.rows - 1) + 2 * R + 8];
  function plateau(b: B.Bataille) {
    const u = unite(b), monTour = b.actif === cote && !b.finie, mien = !!u && u.cote === cote;
    const dep = mien && monTour && act !== "attaquer" && !B.blocageBouger(b, u!) ? B.deplacements(b, u!) : [];
    const cib = mien && monTour && act !== "bouger" && b[cote].logistique >= 1 ? B.ciblesDe(b, u!) : [];
    const port = u && act !== "bouger" ? B.portee(b, u) : 0;
    const vus = B.ennemisVus(b, cote), fant = Object.entries(b[cote].vus).filter(([id]) => !vus.some(v => v.id === id));
    const [largeur, hauteur] = taille(b);
    let s = `<svg class="gu-plateau" viewBox="0 0 ${largeur.toFixed(0)} ${hauteur.toFixed(0)}" role="img" aria-label="Champ de bataille"><defs>`;
    for (const k of new Set(b.cases.map(k => `${k.t}_${varianteT(k.c, k.r)}`))) { const [t, v] = k.split("_"), url = imgT(t as B.Terrain, +v); if (url) s += `<pattern id="gt-${k}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${url}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`; }
    for (const t of Object.keys(B.UNITES) as B.TypeUnite[]) { const url = imgP(t); if (url) s += `<pattern id="gp-${t}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${url}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`; }
    s += `</defs>`;
    for (const k of b.cases) { const [x, y] = pos(k.c, k.r), o = b.objectifs.find(q => q.c === k.c && q.r === k.r), d = dep.find(p => p.c === k.c && p.r === k.r), rc = mode === "recon" && monTour;
      const dansPortee = port > 0 && u && B.distance(u.c, u.r, k.c, k.r) <= port && !(k.c === u.c && k.r === u.r);
      const pourquoi = act === "bouger" && mien && !d ? B.blocageCase(b, u!, k.c, k.r) : null, v = `${k.t}_${varianteT(k.c, k.r)}`;
      s += `<g class="gu-hex${d || rc ? " jouable" : ""}" data-c="${k.c}" data-r="${k.r}"><title>${B.TERRAINS[k.t].nom}${o ? ` · ${esc(o.nom)}` : ""} : ${esc(B.TERRAINS[k.t].aide)}${d ? `\nDéplacement : 1 logistique, ${d.cout} point${d.cout > 1 ? "s" : ""} de mouvement sur ${B.UNITES[u!.type].mouvement}.` : pourquoi ? `\n${esc(pourquoi)}` : ""}</title>
        <polygon points="${hexa(x, y)}" fill="${imgT(k.t, varianteT(k.c, k.r)) ? `url(#gt-${v})` : COUL_T[k.t]}" stroke="rgba(30,30,25,.55)" stroke-width="1"/>`;
      if (k.t !== "mer") s += `<polygon points="${hexa(x, y, 0.96)}" fill="${k.tenu === cote ? "rgba(46,111,201,.12)" : "rgba(196,64,52,.12)"}" stroke="${k.tenu === cote ? "rgba(46,111,201,.6)" : "rgba(196,64,52,.6)"}" stroke-width="1.3"/>`;
      if (o) s += `<polygon points="${hexa(x, y, 0.86)}" fill="none" stroke="${o.tenu === cote ? "#2e6fc9" : "#c44034"}" stroke-width="3.5" stroke-dasharray="5 3"/>`;
      if (dansPortee) s += `<polygon class="gu-portee" points="${hexa(x, y, 0.93)}"/>`;
      if (act === "bouger" && !d && mien) s += `<polygon class="gu-voile" points="${hexa(x, y)}"/>`;
      if (d) s += `<polygon class="gu-dep${act === "bouger" ? " fort" : ""}" points="${hexa(x, y, 0.84)}"/><text x="${x}" y="${y + 4}" class="gu-cout">${d.cout}/${B.UNITES[u!.type].mouvement}</text>`;
      s += `</g>`; }
    for (const [, f] of fant) { const [x, y] = pos(f.c, f.r); s += `<g class="gu-fantome"><title>Dernière position connue (saison ${f.tour}) : ${B.UNITES[f.type].nom}</title><circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y + 5}">?</text></g>`; }
    for (const v of B.vivantes(b)) { if (v.cote !== cote && !vus.includes(v)) continue;
      const [x, y] = pos(v.c, v.r), d = B.UNITES[v.type], cible = cib.includes(v), fini = v.cote === cote && monTour && v.tire && (v.bouge || v.type === "artillerie");
      const pr = cible && u ? B.previsionAttaque(b, u, v) : null, rp = 20;
      s += `<g class="gu-u ${v.cote === cote ? "moi" : "eux"}${v.id === sel ? " sel" : ""}${cible ? " cible" : ""}${fini ? " fini" : ""} ${d.domaine}" data-u="${v.id}"><title>${esc(d.nom)}${v.de ? ` (${esc(e.pays[v.de]?.nom ?? "")})` : ""} · ${v.pv}/${v.pvMax} PV · mouvement ${d.mouvement} · portée ${d.portee} · ${d.des} dés${pr ? ` — ${pr.des} dés à ${pc(pr.p)}, ${pc(pr.detruire)} de la détruire` : ""}</title>
        <circle class="gu-ombre" cx="${x}" cy="${y + 2}" r="${rp + 1}"/><circle class="gu-pion" cx="${x}" cy="${y}" r="${rp}" fill="${imgP(v.type) ? `url(#gp-${v.type})` : "#777"}"/><circle class="gu-anneau" cx="${x}" cy="${y}" r="${rp}"/>
        <circle class="gu-badge" cx="${x + 15}" cy="${y - 14}" r="7.5"/><text x="${x + 15}" y="${y - 10.5}" class="gu-badge-t">${d.icone}</text>
        <rect x="${x - v.pvMax * 3.5 - 1.5}" y="${y + 15}" width="${v.pvMax * 7 + 1.5}" height="7" rx="3" class="gu-pvfond"/>${Array.from({ length: v.pvMax }, (_, i) => `<rect x="${x - v.pvMax * 3.5 + i * 7}" y="${y + 16.5}" width="5.5" height="4" rx="1" class="${i < v.pv ? "pv" : "pv0"}"/>`).join("")}
        ${pr ? `<rect x="${x - 25}" y="${y - 37}" width="50" height="15" rx="7" class="gu-pct"/><text x="${x}" y="${y - 26}" class="gu-pct-t">${pr.des}×${Math.round(100 * pr.p)}%</text>` : ""}</g>`; }
    for (const o of b.objectifs) { const [x, y] = pos(o.c, o.r); s += `<text x="${x}" y="${y - 23}" class="gu-obj-n ${o.tenu === cote ? "moi" : "eux"}">★ ${esc(o.nom.length > 24 ? o.nom.slice(0, 23) + "…" : o.nom)}</text>`; }
    return s + `<g class="gu-fx"></g></svg>`;
  }
  // Menu d'actions posé sur le plateau à côté de l'unité choisie (ou fenêtre de confirmation après un glisser-déposer).
  function menuActions(b: B.Bataille) {
    const u = unite(b); if (!u || u.cote !== cote || b.finie || b.actif !== cote) return "";
    const [largeur, hauteur] = taille(b), f = b[cote];
    // Barre d'actions en haut du champ (en bas si l'unité est dans le tiers haut) : elle ne masque jamais les cases voisines de l'unité.
    const place = (x: number, y: number, k: string) => k === " barre" ? `<div class="gu-menu barre ${y / hauteur < 0.36 ? "bas" : "haut"}">` : `<div class="gu-menu${k}${y / hauteur > 0.55 ? " h" : ""}" style="left:${(100 * Math.min(Math.max(x, 120), largeur - 120) / largeur).toFixed(1)}%;top:${(100 * (y / hauteur > 0.55 ? y - 1.1 * R : y + 1.1 * R) / hauteur).toFixed(1)}%">`;
    if (confirmer) {
      const c = confirmer, t = c.type === "attaquer" ? b.unites.find(x => x.id === c.id) : undefined, [x, y] = t ? pos(t.c, t.r) : pos((c as { c: number }).c, (c as { r: number }).r);
      const d = c.type === "bouger" ? B.deplacements(b, u).find(p => p.c === c.c && p.r === c.r) : undefined, pr = t ? B.previsionAttaque(b, u, t) : null;
      return `${place(x, y, " conf")}<b>${c.type === "bouger" ? `Déplacer ${esc(B.UNITES[u.type].nom.toLowerCase())} ici ?` : `Attaquer ${esc(B.UNITES[t!.type].nom.toLowerCase())} ?`}</b>
        <small>${c.type === "bouger" ? `Coût : 1 logistique (reste ${f.logistique - 1}) · ${d?.cout ?? "?"} point${(d?.cout ?? 0) > 1 ? "s" : ""} de mouvement sur ${B.UNITES[u.type].mouvement}` : `Coût : 1 logistique · ${pr!.des} dés à ${pc(pr!.p)} · ${pc(pr!.detruire)} de la détruire${pr!.riposte ? ` · riposte ${String(pr!.riposte.toFixed(1)).replace(".", ",")}` : ""}`}</small>
        <div class="gu-conf-b"><button class="v2-prim" data-conf="oui">Confirmer</button><button class="v2-sec" data-conf="non">Annuler</button></div></div>`;
    }
    if (act) return ""; // en mode Déplacer ou Attaquer, le menu s'efface pour laisser voir les cases
    const [x, y] = pos(u.c, u.r), bb = B.blocageBouger(b, u), ba = B.blocageAttaquer(b, u);
    const bouton = (k: string, ic: string, nom: string, bloc: string | null, aide: string) => `<button class="gu-act${act === k ? " on" : ""}" data-act="${k}" ${bloc ? "disabled" : ""}><span>${ic} ${nom}</span><small>${bloc ? esc(bloc) : aide}</small></button>`;
    return `${place(x, y, " barre")}<b class="gu-menu-nom"><i style="background-image:url('${img(`pion_${u.type}`) ?? ""}')"></i>${esc(B.UNITES[u.type].nom)}</b>
      ${bouton("bouger", "➜", "Déplacer", bb, `1 logistique (reste ${f.logistique}) · mouvement ${B.UNITES[u.type].mouvement}`)}
      ${bouton("attaquer", "✹", "Attaquer", ba, `1 logistique · ${B.desDe(u)} dés · portée ${B.portee(b, u)}`)}
      <button class="gu-act x" data-act="fermer"><span>✕ Fermer</span></button></div>`;
  }
  function ficheUnite(b: B.Bataille) {
    const u = unite(b); if (!u) return `<div class="gu-fiche vide"><b>Choisis une unité</b><p>1. Clique une de tes unités : ses cases de déplacement s'allument en vert (chiffre = points de mouvement utilisés sur son total) et sa portée de tir est cerclée d'orange.</p><p>2. Choisis Déplacer ou Attaquer dans le menu. Chaque action coûte 1 logistique ; si elle est impossible, le menu dit pourquoi.</p><p>3. Clique la case d'arrivée ou la cible. Tu peux aussi glisser l'unité, puis confirmer.</p></div>`;
    const d = B.UNITES[u.type], t = survol ? b.unites.find(x => x.id === survol && x.pv > 0) : undefined, pr = t && u.cote === cote && B.ciblesDe(b, u).includes(t) ? B.previsionAttaque(b, u, t) : null, ph = img(`carte_g_${u.type}`) ?? imgP(u.type);
    const eff = (Object.keys(B.EFFICACITE[u.type]) as B.Classe[]).filter(k => B.EFFICACITE[u.type][k] > 0).map(k => `${{ leger: "infanterie", blinde: "blindés", artillerie: "artillerie", aerien: "aviation", naval: "navires" }[k]} ×${String(B.EFFICACITE[u.type][k]).replace(".", ",")}`).join(" · ");
    return `<div class="gu-fiche">${ph ? `<span class="gu-fiche-img" style="background-image:url('${ph}')"></span>` : ""}<b>${d.icone} ${esc(d.nom)}${u.de ? ` <small>(${esc(e.pays[u.de]?.nom ?? "")})</small>` : ""}</b>
      <p class="gu-stats"><span>PV <b>${u.pv}/${u.pvMax}</b></span><span>Mouv. <b>${d.mouvement}</b></span><span>Portée <b>${B.portee(b, u)}</b></span><span>Dés <b>${B.desDe(u)}</b></span></p><p class="gu-aide">${esc(d.aide)}</p><p class="gu-eff">Efficacité : ${eff}</p>
      ${u.cote === cote ? `<p class="gu-etat">${u.tire ? "A déjà attaqué ce tour." : u.bouge ? (u.type === "artillerie" ? "A bougé : ne peut plus tirer." : "A bougé : peut encore attaquer.") : "Prête : peut bouger puis attaquer."}</p>` : ""}
      ${pr && t ? `<div class="gu-prev"><b>Attaque sur ${esc(B.UNITES[t.type].nom.toLowerCase())}</b><span>${pr.des} dés à ${pc(pr.p)} : ${String(pr.attendu.toFixed(1)).replace(".", ",")} touche${pr.attendu >= 2 ? "s" : ""} attendue${pr.attendu >= 2 ? "s" : ""}</span><span>Chance de la détruire : <b>${pc(pr.detruire)}</b></span>${pr.riposte ? `<span class="moins">Riposte attendue : ${String(pr.riposte.toFixed(1)).replace(".", ",")} touche</span>` : ""}</div>` : ""}</div>`;
  }
  // Animations (cosmétiques, aucun tirage du jeu) : glissement des unités, tir, impact, destruction.
  const SVGNS = "http://www.w3.org/2000/svg";
  function animer(ff: HTMLElement) {
    const svg = ff.querySelector(".gu-plateau") as SVGSVGElement | null, fx = svg?.querySelector(".gu-fx");
    const calme = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!svg || !fx || calme || typeof (svg as unknown as { animate?: unknown }).animate !== "function") { anim = []; impacts = []; return; }
    for (const a of anim) { const g0 = svg.querySelector<SVGGElement>(`.gu-u[data-u="${a.id}"]`), c = g0?.querySelector(".gu-pion"); if (!g0 || !c) continue;
      const dx = a.de[0] - +c.getAttribute("cx")!, dy = a.de[1] - +c.getAttribute("cy")!;
      g0.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "translate(0,0)" }], { duration: Math.min(750, 280 + 110 * Math.hypot(dx, dy) / W), easing: "cubic-bezier(.3,.7,.3,1)" }); }
    const el = (t: string, at: Record<string, string | number>) => { const x = document.createElementNS(SVGNS, t); for (const [k, v] of Object.entries(at)) x.setAttribute(k, String(v)); fx.appendChild(x); return x; };
    impacts.forEach((i, n) => {
      const delai = 220 * n, [tx, ty] = i.vers, vol = i.de ? 340 : 0;
      if (i.de) { const [sx, sy] = i.de, tr = el("line", { x1: sx, y1: sy, x2: sx, y2: sy, class: `gu-trace ${i.arme}` }), p = el("circle", { cx: sx, cy: sy, r: i.arme === "missile" ? 4.5 : 3.2, class: `gu-obus ${i.arme}` });
        p.animate([{ transform: "translate(0,0)" }, { transform: `translate(${tx - sx}px,${ty - sy}px)` }], { duration: vol, delay: delai, easing: "ease-in", fill: "forwards" }).onfinish = () => p.remove();
        tr.setAttribute("x2", String(tx)); tr.setAttribute("y2", String(ty));
        tr.animate([{ opacity: 0 }, { opacity: .7, offset: .3 }, { opacity: 0 }], { duration: vol + 250, delay: delai, fill: "forwards" }).onfinish = () => tr.remove(); }
      const t0 = delai + vol, flash = el("circle", { cx: tx, cy: ty, r: 6, class: `gu-eclat${i.n ? "" : " rate"}`, opacity: 0 });
      flash.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1)", opacity: .95, offset: .15 }, { transform: `scale(${i.detruit ? 5.5 : 3.6})`, opacity: 0 }], { duration: i.detruit ? 950 : 620, delay: t0, fill: "forwards" }).onfinish = () => flash.remove();
      (flash as SVGElement).style.transformOrigin = `${tx}px ${ty}px`; (flash as SVGElement).style.transformBox = "view-box";
      const txt = el("text", { x: tx, y: ty - 10, class: `gu-degat${i.n ? "" : " rate"}`, opacity: 0 }); txt.textContent = i.detruit ? "Détruite" : i.n ? `−${i.n} PV` : "Raté";
      txt.animate([{ transform: "translate(0,4px)", opacity: 0 }, { transform: "translate(0,0)", opacity: 1, offset: .15 }, { transform: "translate(0,-24px)", opacity: 0 }], { duration: 1400, delay: t0, fill: "forwards" }).onfinish = () => txt.remove();
      const cible = Array.from(svg.querySelectorAll<SVGGElement>(".gu-u")).find(gu => { const c = gu.querySelector(".gu-pion"); return !!c && +c.getAttribute("cx")! === tx && +c.getAttribute("cy")! === ty; });
      if (cible && i.n) cible.animate([{ transform: "translate(0,0)" }, { transform: "translate(-3px,0)" }, { transform: "translate(3px,0)" }, { transform: "translate(0,0)" }], { duration: 240, delay: t0, iterations: 2 });
    });
    anim = []; impacts = [];
  }
  const sonArme = (t: B.TypeUnite): SON.SonBataille => (t === "helico" ? "helico" : t === "sousmarins" ? "torpille" : t === "artillerie" ? "artillerie" : t === "croiseurs" || t === "porteavions" ? "missile" : B.UNITES[t].domaine === "air" ? "air" : B.UNITES[t].domaine === "mer" ? "mer" : t === "robots" ? "mitrailleuse" : B.UNITES[t].classe === "leger" ? "terre" : "blinde");
  // Joue une action du joueur avec son animation et son bruitage (la règle reste dans bataille.ts).
  function bougerAnime(b: B.Bataille, id: string, c: number, r: number) {
    const u = b.unites.find(x => x.id === id)!, de = pos(u.c, u.r) as [number, number], err = B.deplacer(b, cote, id, c, r);
    if (err) { msg = err; return; } anim.push({ id, de }); msg = ""; SON.jouerBataille(B.UNITES[u.type].domaine === "air" ? (u.type === "helico" ? "helico" : "air") : "mouvement");
  }
  function attaquerAnime(b: B.Bataille, id: string, cible: string) {
    const u = b.unites.find(x => x.id === id)!, t = b.unites.find(x => x.id === cible)!, pvU = u.pv, pvT = t.pv, c0 = u.c, r0 = u.r, de = pos(u.c, u.r) as [number, number], vers = pos(t.c, t.r) as [number, number];
    const err = B.attaquer(e, b, cote, id, cible); if (err) { msg = err; return; }
    msg = ""; SON.jouerBataille(sonArme(u.type));
    impacts.push({ de, vers, n: pvT - t.pv, detruit: t.pv === 0, arme: sonArme(u.type) });
    if (pvU > u.pv) impacts.push({ de: vers, vers: de, n: pvU - u.pv, detruit: u.pv === 0, arme: sonArme(t.type) }); // riposte
    if (t.pv === 0) setTimeout(() => SON.jouerBataille("destruction", 0.4), 360);
    if (u.pv > 0 && (u.c !== c0 || u.r !== r0)) anim.push({ id, de }); // terrain pris : l'unité avance sur la case
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
    const avant = new Map(b.unites.filter(u => u.pv > 0).map(u => [u.id, { c: u.c, r: u.r, pv: u.pv }]));
    const n0 = b.journal.length; B.jouerIA(e, b, ad);
    // Ce que le joueur voit du tour ennemi : déplacements visibles (glissement) et coups reçus (impacts).
    const vus = B.ennemisVus(b, cote);
    for (const u of b.unites) { const a = avant.get(u.id); if (!a) continue;
      if (u.cote === ad && vus.includes(u) && (a.c !== u.c || a.r !== u.r)) anim.push({ id: u.id, de: pos(a.c, a.r) as [number, number] });
      if (u.cote === cote && a.pv > u.pv) impacts.push({ vers: pos(u.c, u.r) as [number, number], n: a.pv - u.pv, detruit: u.pv === 0, arme: "terre" }); }
    if (impacts.length) SON.jouerBataille("impact");
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
      <div class="gu-corps"><div class="gu-carte-champ"><div class="gu-plateau-z">${plateau(b)}${menuActions(b)}${msg || act ? `<p class="gu-msg${msg ? "" : " info"}">${msg ? `⚠ ${esc(msg)}` : act === "bouger" ? "Clique une case verte (1 logistique ; chiffre = mouvement utilisé / total). Survole une case grisée pour savoir pourquoi elle est bloquée." : "Clique une cible clignotante (dés × chance par dé). Orange : portée de tir."}${act ? ` <button class="v2-sec" data-act="${act}">Annuler</button>` : ""}</p>` : ""}</div><p class="gu-legende"><i class="moi"></i>tes unités <i class="eux"></i>ennemies vues <i class="fant"></i>dernière position connue <span>Liseré : terrain tenu · ★ objectifs · vert : déplacement · orange : portée</span></p><p class="gu-credits">Sons : OpenGameArt et Kenney (CC0) ; moteur de char par nayckron, décollages de jets par dklon et lamoot (CC-BY 3.0).</p></div>
        <aside class="gu-cote">${ficheUnite(b)}${bilanSaisons(b)}</aside></div>
      <div class="gu-bas"><details class="gu-journal"><summary>Journal complet (${b.journal.length})</summary><ol>${b.journal.slice().reverse().map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>
        ${!b.finie ? `<details class="gu-adm"><summary>☢ Armes de destruction massive</summary>
          ${puissanceNuc && risN ? `<p>Tactique : riposte ${pct(risN.riposte)}${risN.riposteur ? ` (${esc(e.pays[risN.riposteur].nom)})` : ""}, frappe préventive ${pct(risN.preventive)}, coalition de ${risN.coalition} pays, jauge mondiale ${risN.hiver} sur 10${risN.crise ? " : CRISE MONDIALE" : ""}${risN.defaite ? " : DÉFAITE du camp responsable" : ""}.</p>
            <div class="gu-adm-b"><button data-n="menace" ${b.nucleaire?.menace ? "disabled" : ""}>Menace (+15 %, tension +2)</button><button data-n="tactique">Frappe tactique…</button><button data-n="strategique">Frappe stratégique…</button></div>` : `<p>${esc(moi.nom)} n'a pas l'arme nucléaire.</p>`}
          <p>Biologique : fuite ${pct(risB.fuite)}, attribution ${pct(risB.attribution)}, jauge ${risB.jauge} sur 10${risB.crise ? " : CRISE MONDIALE" : ""}${risB.defaite ? " : DÉFAITE" : ""}.</p><div class="gu-adm-b"><button data-n="bio">Arme biologique…</button></div></details>` : ""}</div>
      <div class="v2-pied"><span class="v2-etat">${b.finie ? "Les 4 saisons sont jouées." : "Chaque action coûte de la logistique : choisis où concentrer l'effort. Le terrain non vu reste dans le brouillard."}</span>
        ${b.finie ? `<button class="v2-ok v2-prim gu-fin-b">Voir le résultat →</button>` : `<button class="v2-ok v2-prim gu-tour">Fin du tour →</button>`}</div></div>`, true);
    const svg = ff.querySelector(".gu-plateau") as SVGSVGElement, rendu = () => bataille(b);
    const caseDe = (ev: { clientX: number; clientY: number }) => { const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("[data-c],[data-u]") as HTMLElement | null; return el; };
    const clicUnite = (v: B.Unite) => {
      if (mode === "missile" && v.cote !== cote) { const vers = pos(v.c, v.r) as [number, number], pv = v.pv; B.missile(e, b, cote, v.id); impacts.push({ vers, n: pv - v.pv, detruit: v.pv === 0, arme: "missile" }); SON.jouerBataille("missile"); mode = ""; return rendu(); }
      const u = unite(b);
      if (u && u.cote === cote && v.cote !== cote && monTour) {
        if (B.ciblesDe(b, u).includes(v)) { attaquerAnime(b, u.id, v.id); act = ""; survol = null; return rendu(); }
        msg = B.blocageAttaquer(b, u) ?? (B.distance(u.c, u.r, v.c, v.r) > B.portee(b, u) ? `Hors de portée : ${B.distance(u.c, u.r, v.c, v.r)} hexagones, portée ${B.portee(b, u)}.` : `${B.UNITES[u.type].nom} ne peut pas attaquer ce type d'unité.`); return rendu();
      }
      if (v.cote === cote) { sel = sel === v.id ? null : v.id; act = ""; confirmer = null; msg = ""; } else { survol = v.id; if (!sel) sel = v.id; }
      rendu();
    };
    const clicCase = (c: number, r: number) => {
      if (mode === "recon") { B.reconnaitre(b, cote, c, r); mode = ""; return rendu(); }
      const u = unite(b); if (!u || u.cote !== cote || !monTour) return;
      if (B.deplacements(b, u).some(p => p.c === c && p.r === r) && act !== "attaquer") { bougerAnime(b, u.id, c, r); act = ""; return rendu(); }
      if (act === "bouger") { msg = B.blocageBouger(b, u) ?? B.blocageCase(b, u, c, r) ?? ""; return rendu(); }
      sel = null; act = ""; msg = ""; rendu();
    };
    // Glisser-déposer : on lâche l'unité sur une case verte ou une cible, puis on confirme.
    svg.querySelectorAll<SVGGElement>(".gu-u.moi").forEach(x => x.addEventListener("pointerdown", ev => { if (!monTour) return;
      glisse = { id: x.dataset.u!, x: ev.clientX, y: ev.clientY, bouge: false };
      if (sel !== x.dataset.u) { sel = x.dataset.u!; act = ""; confirmer = null; msg = ""; supprimerClic = true; rendu(); } })); // la sélection allume tout de suite les cases vertes
    svg.addEventListener("pointermove", ev => { if (!glisse) return; const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y;
      if (!glisse.bouge && Math.hypot(dx, dy) > 8) glisse.bouge = true;
      if (glisse.bouge) { const s2 = ff.querySelector(".gu-plateau") as SVGSVGElement, k = s2.getScreenCTM(), gu = s2.querySelector<SVGGElement>(`.gu-u[data-u="${glisse.id}"]`); if (k && gu) { gu.style.transform = `translate(${dx / k.a}px,${dy / k.d}px)`; gu.classList.add("glisse"); } } });
    const lacher = (ev: PointerEvent) => { const gl = glisse; glisse = null; setTimeout(() => (supprimerClic = false), 0); if (!gl || !gl.bouge) return;
      const s2 = ff.querySelector(".gu-plateau") as SVGSVGElement, gu = s2.querySelector<SVGGElement>(`.gu-u[data-u="${gl.id}"]`); if (gu) gu.style.visibility = "hidden";
      const cible = caseDe(ev); if (gu) gu.style.visibility = "";
      const u = b.unites.find(x => x.id === gl.id)!;
      if (cible?.dataset.u) { const v = b.unites.find(x => x.id === cible.dataset.u); if (v && v.cote !== cote && B.ciblesDe(b, u).includes(v)) confirmer = { type: "attaquer", id: v.id }; else msg = v && v.cote !== cote ? (B.blocageAttaquer(b, u) ?? "Cible hors de portée ou non attaquable.") : ""; }
      else if (cible?.dataset.c) { const c = +cible.dataset.c, r = +cible.dataset.r!; if (B.deplacements(b, u).some(p => p.c === c && p.r === r)) confirmer = { type: "bouger", c, r }; else msg = B.blocageBouger(b, u) ?? B.blocageCase(b, u, c, r) ?? ""; }
      supprimerClic = true; rendu(); };
    svg.addEventListener("pointerup", lacher); svg.addEventListener("pointercancel", () => { glisse = null; rendu(); });
    svg.querySelectorAll<SVGGElement>(".gu-u").forEach(x => {
      x.addEventListener("mouseenter", () => { if (sel && x.classList.contains("cible")) { survol = x.dataset.u!; const a = ff.querySelector(".gu-fiche"); if (a) a.outerHTML = ficheUnite(b); } });
      x.addEventListener("click", ev => { ev.stopPropagation(); if (supprimerClic) { supprimerClic = false; return; } clicUnite(b.unites.find(y => y.id === x.dataset.u)!); }); });
    svg.querySelectorAll<SVGGElement>(".gu-hex").forEach(x => x.addEventListener("click", () => { if (supprimerClic) { supprimerClic = false; return; } clicCase(+x.dataset.c!, +x.dataset.r!); }));
    ff.querySelectorAll<HTMLElement>("[data-act]").forEach(x => (x.onclick = ev => { ev.stopPropagation(); const k = x.dataset.act!; msg = "";
      if (k === "fermer") { sel = null; act = ""; } else act = act === k ? "" : (k as "bouger" | "attaquer"); rendu(); }));
    ff.querySelectorAll<HTMLElement>("[data-conf]").forEach(x => (x.onclick = ev => { ev.stopPropagation(); const c = confirmer; confirmer = null;
      if (x.dataset.conf === "oui" && c && sel) { if (c.type === "bouger") bougerAnime(b, sel, c.c, c.r); else attaquerAnime(b, sel, c.id); act = ""; } rendu(); }));
    ff.querySelectorAll<HTMLElement>("[data-sp]").forEach(x => (x.onclick = () => { const k = x.dataset.sp!;
      if (k === "sat") B.satellite(b, cote); else if (k === "brou") B.brouiller(b, cote); else if (k === "annuler") mode = ""; else mode = k as "recon" | "missile"; bataille(b); }));
    animer(ff);
    const t = ff.querySelector(".gu-tour") as HTMLElement | null; if (t) t.onclick = () => { sel = null; mode = ""; act = ""; confirmer = null; msg = ""; survol = null; B.finTour(b); bataille(b); };
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
