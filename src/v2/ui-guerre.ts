// Écran de la phase de guerre jouée (demandes du 2 novembre 2026). Il ne s'ouvre que pour les guerres où le camp du joueur
// participe (leader en guerre, pays garanti ou soutenu). Deux temps : préparation (général, budget, front intérieur, ONU),
// puis 4 saisons d'ordres secrets sur 3 objectifs, le ciel, la mer et l'information. Le code d'affichage ne tire jamais au sort.
import * as M from "./moteur";
import * as CR from "./crises";
import * as B from "./bataille";

export interface OutilsUI { fenetre: (html: string, large?: boolean) => HTMLElement; img: (n?: string) => string | undefined; esc: (s: string) => string }
const ICONE: Record<B.Domaine, string> = { terre: "⛰", air: "✈", mer: "⚓", cyber: "⌁", info: "◉", espace: "✦" };
const NOM_DOM: Record<B.Domaine, string> = { terre: "Terre", air: "Air", mer: "Mer", cyber: "Cyber", info: "Renseignement", espace: "Spatial" };
const IMG_OBJ: Record<B.Objectif["genre"], string[]> = { corridor: ["obj_corridor", "guerre_1"], ville: ["obj_ville", "guerre_2"], port: ["obj_port", "guerre_3"], hauteurs: ["obj_hauteurs", "guerre_4"] };
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
          <div class="gu-tranches">${[0, 1, 2, 3].map(n => `<button data-t="${n}" class="${n === tranches ? "choisi" : ""}" ${n > libre ? "disabled" : ""}>${n === 0 ? "Aucun" : `${n} ◆`}<small>${n ? `+${n} logistique, ${n} carte${n > 1 ? "s" : ""} avancée${n > 1 ? "s" : ""}` : "armée seule"}</small></button>`).join("")}</div></section>
        <section><h3>Front intérieur</h3>
          <label class="gu-case"><input type="checkbox" class="gu-mob" ${mobiliser ? "checked" : ""}> Mobiliser <small>+2 cartes d'infanterie, stabilité −5</small></label>
          <label class="gu-case"><input type="checkbox" class="gu-cens" ${censurer ? "checked" : ""}> Censurer la presse <small>lassitude −10, stabilité −3 (sinon informer : stabilité +2)</small></label>
          <div class="gu-fin"><button data-f="impots" class="${financement === "impots" ? "choisi" : ""}">Impôts de guerre<small>stabilité −4</small></button><button data-f="dette" class="${financement === "dette" ? "choisi" : ""}">Emprunt<small>dette +4</small></button><span>+1 logistique par saison</span></div></section>
      </div>
      <section class="gu-info-l"><span title="Part de l'armée engagée loin de chez elle (marine et aviation de transport)">Projection <b>${pct(proj)}</b></span><span title="Pays de la zone du front, relation ≥ 50 : +1 logistique">Base alliée <b>${base ? esc(e.pays[base].nom) : "aucune"}</b></span>
        <span>Ton armée <b>${B.paquetArmee(e, moi.iso, cote).length} cartes</b>${ren.length ? ` + <b>${ren.length}</b> en renfort (${[...new Set(ren.map(c => c.de!))].map(i => esc(e.pays[i].nom)).join(", ")})` : ""}</span><span>Armée adverse <b>${B.paquetArmee(e, lui.iso, cote === "a" ? "b" : "a").length} cartes</b></span>
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
      b.journal.push(`Préparation : ${fi.lignes.join(" ; ")}.`); bataille(b, null);
    };
  }

  // ---------- 2. Bataille : 4 saisons ----------
  function jauge(nom: string, v: number, aide: string, ic: string, images: string[]) {
    return `<div class="gu-jauge" title="${esc(aide)}" ${fond(images)}><span>${ic} ${nom}</span><div class="gu-piste">${[-3, -2, -1, 0, 1, 2, 3].map(x => `<i class="${x === v ? "ici" : ""} ${x < 0 ? "eux" : x > 0 ? "nous" : ""}"></i>`).join("")}</div><b class="${v > 0 ? "plus" : v < 0 ? "moins" : ""}">${v > 0 ? "+" : ""}${v}</b></div>`;
  }
  function carteHtml(c: B.CarteCmd, choisie: boolean, jouable: boolean) {
    const u = img(`carte_g_${c.type}`);
    return `<button class="gu-carte d-${c.domaine}${choisie ? " choisie" : ""}" data-id="${c.id}" ${jouable ? "" : "disabled"} title="${esc(c.aide)}">
      <span class="gu-carte-img" ${u ? `style="background-image:url('${u}')"` : ""}>${u ? "" : `<i>${ICONE[c.domaine]}</i>`}</span>
      <span class="gu-cout" title="Coût en logistique">${c.cout}</span><span class="gu-puis" title="Puissance">${c.puissance}</span>
      <b>${esc(c.nom)}</b><small>${NOM_DOM[c.domaine]} · ${c.cible === "objectif" ? "objectif" : c.cible === "ciel" ? "ciel" : c.cible === "mer" ? "mer" : c.cible === "info" ? "information" : "logistique"}${c.origine !== "armee" ? ` · ${c.origine === "general" ? "général" : c.origine === "allie" ? esc(e.pays[c.de!]?.nom ?? "allié") : "budget"}` : ""}</small></button>`;
  }
  function bataille(b: B.Bataille, choisie: string | null) {
    const f = b[cote], ad = cote === "a" ? "b" : "a", ap = B.apercu(b, cote), voit = B.voitPlanAdverse(b, cote), carte = f.main.find(c => c.id === choisie);
    const plan = (i?: number, cible?: B.Cible) => f.plan.filter(o => (cible ? o.carte.cible === cible : o.objectif === i));
    const puissanceNuc = B.peutNucleaire(e, g, cote) && !b.nucleaire?.strategique, risN = puissanceNuc ? B.risquesNucleaires(e, g, cote, "tactique") : null, risB = B.risquesBio(e, g, cote);
    const der = b.dernieres ?? [];
    const ff = fenetre(`<div class="gu"><header class="gu-barre"><div><small>${esc(moi.nom)} contre ${esc(lui.nom)} · général ${esc(f.general?.nom ?? "")}</small><h2>${b.finie ? "Fin de l'année de guerre" : `${B.SAISONS[b.saison - 1]} ${b.annee}`} <span>${b.finie ? "" : `saison ${b.saison} sur ${b.saisons}`}</span></h2></div>
        <div class="gu-res"><span title="Logistique restante cette saison">Logistique <b>${f.logistique}</b>/${f.base}</span><span title="Ordres possibles cette saison">Ordres <b>${f.plan.length}</b>/${B.ordresMax(b, cote)}</span><span title="Cartes perdues (attrition)">Pertes <b>${f.perdues.length}</b> · ${b[ad].perdues.length}</span></div></header>
      <div class="gu-jauges">${jauge("Ciel", B.ciel(b, cote), "Supériorité aérienne : renforce tes hélicoptères et bombardiers (+25 % par cran), un peu ton armée de terre.", "✈", ["jauge_ciel", "guerre_6"])}${jauge("Mer", B.mer(b, cote), "Maîtrise de la mer : port à +20 % par cran, débarquement possible dès +1, blocus dès +2.", "⚓", ["jauge_mer", "guerre_7"])}${jauge("Information", B.info(b, cote), "Renseignement et communications : à +2 tu vois les ordres adverses (+10 %) ; à −2 tes communications sont coupées (2 ordres).", "◉", ["jauge_info", "guerre_8"])}</div>
      <div class="gu-zones-air">${(["ciel", "mer", "info", "logistique"] as B.Cible[]).map(z => `<button class="gu-dep${carte && carte.cible === z ? " cible" : ""}" data-z="${z}" ${carte && carte.cible === z ? "" : "disabled"}><span>${z === "ciel" ? "Bataille du ciel" : z === "mer" ? "Bataille navale" : z === "info" ? "Information" : "Logistique adverse"}</span>${plan(undefined, z).map(o => `<em data-retire="${o.carte.id}" title="Retirer">${esc(o.carte.nom)} ✕</em>`).join("")}</button>`).join("")}</div>
      <div class="gu-objectifs">${b.objectifs.map((o, i) => { const c = o.controle * (cote === "a" ? 1 : -1), r = der.find(x => x.objectif === i), a = ap[i];
        return `<div class="gu-obj${carte && carte.cible === "objectif" ? " cible" : ""}" data-o="${i}" ${fond(IMG_OBJ[o.genre])}><h4>${esc(o.nom)}</h4><div class="gu-piste grand">${[-3, -2, -1, 0, 1, 2, 3].map(x => `<i class="${x === c ? "ici" : ""} ${x < 0 ? "eux" : x > 0 ? "nous" : ""}"></i>`).join("")}</div>
          <p class="gu-tenu">${c > 0 ? `tenu par toi (${c})` : c < 0 ? `tenu par l'ennemi (${-c})` : "disputé"}</p>
          <div class="gu-engage">${plan(i).map(o2 => `<em data-retire="${o2.carte.id}" title="Retirer">${ICONE[o2.carte.domaine]} ${esc(o2.carte.nom)} ✕</em>`).join("") || `<span class="gu-vide">${b.finie ? "" : "aucun ordre"}</span>`}</div>
          <p class="gu-pr">Ta puissance <b>${Math.round(a.moi)}</b>${voit ? ` · ennemi <b>${Math.round(a.lui ?? 0)}</b> · <b>${pct(a.proba ?? 0.5)}</b> de victoire` : ` · ordres ennemis inconnus`}</p>
          ${r ? `<p class="gu-der ${r.gagnant === cote ? "plus" : "moins"}">Saison passée : ${Math.round(cote === "a" ? r.pA : r.pB)} contre ${Math.round(cote === "a" ? r.pB : r.pA)} (${pct(cote === "a" ? r.proba : 1 - r.proba)}), ${r.gagnant === cote ? "victoire" : "revers"}${r.crans > 1 ? " écrasant" : ""}</p>` : ""}</div>`; }).join("")}</div>
      ${b.finie ? "" : `<div class="gu-main">${f.main.map(c => carteHtml(c, c.id === choisie, c.cout <= f.logistique && f.plan.length < B.ordresMax(b, cote))).join("") || `<p class="v2-vide">Plus de cartes en main.</p>`}</div>`}
      <div class="gu-bas"><details class="gu-journal"><summary>Journal (${b.journal.length})</summary><ol>${b.journal.slice().reverse().map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>
        ${!b.finie ? `<details class="gu-adm"><summary>☢ Armes de destruction massive</summary>
          ${puissanceNuc && risN ? `<p>Tactique : riposte ${pct(risN.riposte)}${risN.riposteur ? ` (${esc(e.pays[risN.riposteur].nom)})` : ""}, frappe préventive ${pct(risN.preventive)}, coalition de ${risN.coalition} pays, jauge mondiale ${risN.hiver} sur 10${risN.crise ? " : CRISE MONDIALE" : ""}${risN.defaite ? " : DÉFAITE du camp responsable" : ""}.</p>
            <div class="gu-adm-b"><button data-n="menace" ${b.nucleaire?.menace ? "disabled" : ""}>Menace (+15 %, tension +2)</button><button data-n="tactique">Frappe tactique…</button><button data-n="strategique">Frappe stratégique…</button></div>` : `<p>${esc(moi.nom)} n'a pas l'arme nucléaire.</p>`}
          <p>Biologique : fuite ${pct(risB.fuite)}, attribution ${pct(risB.attribution)}, jauge ${risB.jauge} sur 10${risB.crise ? " : CRISE MONDIALE" : ""}${risB.defaite ? " : DÉFAITE" : ""}.</p><div class="gu-adm-b"><button data-n="bio">Arme biologique…</button></div></details>` : ""}
      </div>
      <div class="v2-pied"><span class="v2-etat">${b.finie ? "" : carte ? `Choisis ${carte.cible === "objectif" ? "un objectif" : "la zone surlignée"} pour « ${esc(carte.nom)} ».` : "Choisis une carte, puis où l'engager. Les ordres des deux camps se révèlent ensemble."}</span>
        ${b.finie ? `<button class="v2-ok v2-prim gu-fin-b">Voir le résultat →</button>` : `<button class="v2-ok v2-prim gu-saison">Lancer la saison →</button>`}</div></div>`, true);
    ff.querySelectorAll<HTMLElement>(".gu-carte").forEach(x => (x.onclick = () => { const c = f.main.find(y => y.id === x.dataset.id)!; if (c.cible === "logistique" && c.type === "pont_logistique") { B.planifier(b, cote, c.id); bataille(b, null); } else bataille(b, x.dataset.id === choisie ? null : x.dataset.id!); }));
    ff.querySelectorAll<HTMLElement>(".gu-obj").forEach(x => (x.onclick = ev => { if ((ev.target as HTMLElement).dataset.retire || !carte || carte.cible !== "objectif") return; B.planifier(b, cote, carte.id, +x.dataset.o!); bataille(b, null); }));
    ff.querySelectorAll<HTMLElement>(".gu-dep").forEach(x => (x.onclick = ev => { if ((ev.target as HTMLElement).dataset.retire || !carte) return; B.planifier(b, cote, carte.id); bataille(b, null); }));
    ff.querySelectorAll<HTMLElement>("[data-retire]").forEach(x => (x.onclick = ev => { ev.stopPropagation(); B.annulerOrdre(b, cote, x.dataset.retire!); bataille(b, null); }));
    const s = ff.querySelector(".gu-saison") as HTMLElement | null; if (s) s.onclick = () => { B.planIA(b, ad); B.resoudreSaison(e, b); bataille(b, null); };
    const fb = ff.querySelector(".gu-fin-b") as HTMLElement | null; if (fb) fb.onclick = () => resultat(b);
    ff.querySelectorAll<HTMLElement>("[data-n]").forEach(x => (x.onclick = () => {
      const n = x.dataset.n!;
      if (n !== "menace" && !confirm(n === "bio" ? "Utiliser une arme biologique ? L'agent peut échapper à tout contrôle et frapper le monde entier, toi compris." : `Frappe ${n === "tactique" ? "tactique sur l'objectif le plus disputé" : "stratégique"} ? Les risques affichés s'appliquent immédiatement.`)) return;
      const t = n === "bio" ? B.biologique(e, b, g, cote) : B.nucleaire(e, b, g, cote, n as "menace" | "tactique" | "strategique", b.objectifs.map((o, i) => [Math.abs(o.controle), i]).sort((p, q) => p[0] - q[0])[0][1]);
      b.journal.push(t); if (e.defaite) b.finie = true; bataille(b, null);
    }));
  }

  // ---------- 3. Résultat ----------
  function resultat(b: B.Bataille) {
    const r = B.resultat(b), d = cote === "a" ? r.d : -r.d; B.enregistrer(g, b, e);
    conclusion(`${d > 0 ? "Victoire" : d < 0 ? "Défaite" : "Front figé"} sur l'année : ${r.tenusA + r.tenusB ? `${cote === "a" ? r.tenusA : r.tenusB} objectif${(cote === "a" ? r.tenusA : r.tenusB) > 1 ? "s" : ""} tenu${(cote === "a" ? r.tenusA : r.tenusB) > 1 ? "s" : ""} par toi, ${cote === "a" ? r.tenusB : r.tenusA} par l'ennemi` : "aucun objectif tenu"}, pertes ${cote === "a" ? r.pertesA : r.pertesB} contre ${cote === "a" ? r.pertesB : r.pertesA}. Le front avancera de ${Math.min(CR.SCORE.front, Math.abs(Math.round(d)))} % ${d >= 0 ? "en ta faveur" : "contre toi"} à la fin de l'année (score de guerre).`, b);
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
