import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import monde from "world-atlas/countries-50m.json";

const NS = "http://www.w3.org/2000/svg";
const LARGEUR = 1000, HAUTEUR = 520, ZOOM_MAX = 24;

export interface Marqueur { symbole: string; couleur: string; titre: string }
export interface Annotation {
  nom: string; valeur?: string; marqueurs: Marqueur[]; info: string; // info : HTML de la fiche au survol
  valeurs?: [string, string];            // influence totale bloc USA / bloc Chine (bouton Influence)
  barres?: { o: number[]; c: number[] }; // influence par canal e, p, m, c (bouton Catégories)
  sigles?: string;                       // organisations (bouton Sigles)
}
export interface OptionsCarte { noms: boolean; influence: boolean; categories: boolean; sigles: boolean; legende: boolean; maritime: boolean; terrestre: boolean; aerien: boolean }
export interface TraceFlux { id: string; mode: "maritime" | "terrestre" | "aerien"; portee: "local" | "mondial"; volume: number; trace: [number, number][]; titre: string; actif: boolean }
export interface PointCarte { id: string; position: [number, number]; marqueur: Marqueur }

const el = <K extends keyof SVGElementTagNameMap>(nom: K, attrs: Record<string, string | number> = {}) => {
  const x = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, String(v));
  return x;
};

// Dessine la carte une fois ; colorer() et annoter() mettent à jour sans redessiner. Molette : zoom ; glisser : déplacer.
export function dessinerCarte(conteneur: HTMLElement, idsJeu: Map<string, string>, surClic: (iso3: string) => void) {
  const pays = feature(monde as any, (monde as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  const projection = geoNaturalEarth1().fitSize([LARGEUR, HAUTEUR], pays);
  const chemin = geoPath(projection);
  const svg = el("svg", { viewBox: `0 0 ${LARGEUR} ${HAUTEUR}`, preserveAspectRatio: "xMidYMid meet" });
  const zoom = el("g"), couchePays = el("g"), coucheFlux = el("g", { class: "flux" }), coucheNoms = el("g", { class: "noms" }), coucheMarques = el("g", { class: "marques" });
  zoom.append(couchePays, coucheFlux, coucheNoms, coucheMarques);
  svg.appendChild(zoom);
  const parIso = new Map<string, SVGPathElement[]>();
  // centre du plus grand polygone de chaque pays : clé iso3 pour les pays du jeu, « #id » (code ISO numérique) pour les autres
  const ancre = new Map<string, { x: number; y: number; aire: number }>();
  for (const f of pays.features) {
    const p = el("path", { d: chemin(f) ?? "" });
    const iso3 = idsJeu.get(String(f.id)), cle = iso3 ?? `#${f.id}`;
    if (iso3) {
      p.classList.add("jeu");
      p.dataset.iso = iso3;
      parIso.set(iso3, [...(parIso.get(iso3) ?? []), p]);
    } else p.setAttribute("fill", "var(--pays-hors)");
    const polys: Polygon[] = f.geometry?.type === "MultiPolygon" ? (f.geometry as MultiPolygon).coordinates.map(c => ({ type: "Polygon", coordinates: c }))
      : f.geometry?.type === "Polygon" ? [f.geometry as Polygon] : [];
    for (const poly of polys) {
      const g: Feature = { type: "Feature", geometry: poly, properties: {} }, aire = chemin.area(g);
      if (aire > (ancre.get(cle)?.aire ?? -1)) { const [x, y] = chemin.centroid(g); ancre.set(cle, { x, y, aire }); }
    }
    couchePays.appendChild(p);
  }
  conteneur.appendChild(svg);

  // Fiche au survol, légende, boutons de zoom
  const bulle = document.createElement("div"); bulle.className = "bulle"; bulle.hidden = true;
  const legende = document.createElement("div"); legende.className = "legende";
  const boutons = document.createElement("div"); boutons.className = "zoom-boutons";
  boutons.innerHTML = `<button data-z="1.6" title="Zoomer (molette)">+</button><button data-z="0.62" title="Dézoomer">−</button><button data-z="0" title="Vue entière">⟲</button>`;
  conteneur.append(bulle, legende, boutons);
  let annotations: Record<string, Annotation> = {};

  // Zoom et déplacement
  let k = 1, tx = 0, ty = 0, glisse: { x: number; y: number; tx: number; ty: number; bouge: boolean } | null = null;
  const echelle = () => svg.getBoundingClientRect().width / LARGEUR || 1;
  function appliquer() {
    k = Math.min(ZOOM_MAX, Math.max(1, k));
    tx = Math.min(0, Math.max(LARGEUR * (1 - k), tx)); ty = Math.min(0, Math.max(HAUTEUR * (1 - k), ty));
    zoom.setAttribute("transform", `translate(${tx},${ty}) scale(${k})`);
    svg.style.setProperty("--k", String(k));
    // Grands pays d'abord ; un nom qui chevauche un nom déjà posé est masqué (visible en zoomant).
    const poses: { x: number; y: number; l: number }[] = [];
    const noms = [...coucheNoms.children as unknown as SVGGElement[]].sort((p, q) => ancre.get(q.dataset.iso!)!.aire - ancre.get(p.dataset.iso!)!.aire);
    for (const g of noms) {
      const a = ancre.get(g.dataset.iso!)!, l = (g.firstChild?.textContent?.length ?? 6) * 3.2 / k, h = hauteurNom / k;
      g.setAttribute("transform", `translate(${a.x},${a.y}) scale(${1 / k})`);
      const libre = a.aire * k * k > 380 && !poses.some(p => Math.abs(p.x - a.x) < p.l + l && Math.abs(p.y - a.y) < 2 * h);
      g.style.display = libre ? "" : "none";
      if (libre) poses.push({ x: a.x, y: a.y, l });
    }
    for (const g of coucheMarques.children as unknown as SVGGElement[]) {
      const a = ancre.get((g as SVGGElement).dataset.cle!)!;
      g.setAttribute("transform", `translate(${a.x},${a.y}) scale(${1 / k})`);
    }
  }
  function zoomer(f: number, cx = LARGEUR / 2, cy = HAUTEUR / 2) {
    const k2 = Math.min(ZOOM_MAX, Math.max(1, k * f));
    tx = cx - (cx - tx) * (k2 / k); ty = cy - (cy - ty) * (k2 / k); k = k2; appliquer();
  }
  svg.addEventListener("wheel", ev => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect(), s = echelle();
    zoomer(ev.deltaY < 0 ? 1.25 : 0.8, (ev.clientX - r.left) / s, (ev.clientY - r.top) / s);
  }, { passive: false });
  svg.addEventListener("pointerdown", ev => { glisse = { x: ev.clientX, y: ev.clientY, tx, ty, bouge: false }; });
  window.addEventListener("pointermove", ev => {
    if (!glisse) return;
    const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) glisse.bouge = true;
    if (glisse.bouge) { const s = echelle(); tx = glisse.tx + dx / s; ty = glisse.ty + dy / s; appliquer(); }
  });
  window.addEventListener("pointerup", ev => {
    const g = glisse; glisse = null;
    if (g && !g.bouge) { const iso = (ev.target as Element).closest?.("[data-iso]") as SVGElement | null; if (iso?.dataset.iso) surClic(iso.dataset.iso); }
  });
  boutons.addEventListener("click", ev => {
    const z = Number((ev.target as HTMLElement).dataset.z);
    if (z === 0) { k = 1; tx = 0; ty = 0; appliquer(); } else if (z) zoomer(z);
  });
  svg.addEventListener("pointermove", ev => {
    const iso = (ev.target as Element).closest?.("[data-iso]") as SVGElement | null;
    const a = iso?.dataset.iso ? annotations[iso.dataset.iso] : undefined;
    if (!a || glisse?.bouge) { bulle.hidden = true; return; }
    bulle.innerHTML = a.info; bulle.hidden = false;
    const r = conteneur.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    bulle.style.left = `${Math.min(x + 14, r.width - bulle.offsetWidth - 8)}px`;
    bulle.style.top = `${Math.min(y + 14, r.height - bulle.offsetHeight - 8)}px`;
  });
  svg.addEventListener("pointerleave", () => { bulle.hidden = true; });

  let hauteurNom = 13, pointsFlux: PointCarte[] = [];
  return {
    colorer(couleurs: Record<string, string>, legendeHtml: string) {
      for (const [iso3, formes] of parIso) for (const p of formes) p.setAttribute("fill", couleurs[iso3]);
      legende.innerHTML = legendeHtml;
    },
    choisir(iso3: string | null) {
      for (const [i, formes] of parIso) for (const p of formes) p.classList.toggle("choisi", i === iso3);
    },
    // Flux d'échanges : lignes (arcs de grand cercle) d'épaisseur proportionnelle au volume, points (détroits) avec marqueur.
    tracerFlux(flux: TraceFlux[], points: PointCarte[]) {
      coucheFlux.replaceChildren();
      for (const f of flux) {
        const d = chemin({ type: "LineString", coordinates: f.trace } as any) ?? "";
        const p = el("path", { d, class: `flux-${f.mode} ${f.portee} ${f.actif ? "" : "coupe"}`, "stroke-width": (f.portee === "mondial" ? 1 : 0.6) + 0.7 * f.volume });
        const t = el("title"); t.textContent = f.titre; p.appendChild(t);
        coucheFlux.appendChild(p);
      }
      for (const pt of points) { const [x, y] = projection(pt.position) ?? [0, 0]; ancre.set(`@${pt.id}`, { x, y: y + 20, aire: 0 }); }
      pointsFlux = points;
    },
    regler(o: OptionsCarte) {
      svg.classList.toggle("sans-maritime", !o.maritime); svg.classList.toggle("sans-terrestre", !o.terrestre); svg.classList.toggle("sans-aerien", !o.aerien);
      svg.classList.toggle("sans-noms", !o.noms); svg.classList.toggle("avec-sigles", o.sigles); svg.classList.toggle("avec-barres", o.categories);
      legende.hidden = !o.legende;
      hauteurNom = 13 + (o.sigles ? 6 : 0) + (o.categories ? 12 : 0);
      appliquer();
    },
    // a : pays du jeu (clé iso3) ; hors : marqueurs sur des pays hors jeu (clé = code ISO numérique de la carte, ex. "004")
    annoter(a: Record<string, Annotation>, hors: Record<string, Marqueur[]> = {}) {
      annotations = a;
      coucheNoms.replaceChildren(); coucheMarques.replaceChildren();
      const poserMarques = (cle: string, marqueurs: Marqueur[]) => {
        if (!marqueurs.length || !ancre.has(cle)) return;
        const m = el("g", { class: "marque" }); m.dataset.cle = cle;
        const n = Math.min(5, marqueurs.length);
        marqueurs.slice(0, n).forEach((q, i) => {
          const c = el("g", { transform: `translate(${(i - (n - 1) / 2) * 15},-20)` });
          const titre = el("title"); titre.textContent = q.titre;
          const rond = el("circle", { r: 7, fill: q.couleur });
          const s = el("text", { y: 3.2 }); s.textContent = q.symbole;
          c.append(titre, rond, s); m.appendChild(c);
        });
        coucheMarques.appendChild(m);
      };
      for (const [iso, x] of Object.entries(a)) {
        if (!ancre.has(iso)) continue;
        const g = el("g", { class: "nom" }); g.dataset.iso = iso;
        const t = el("text", { y: -2, class: "nom-texte" }); t.textContent = x.nom;
        g.appendChild(t);
        let y = 10;
        if (x.valeurs) {
          const v = el("text", { y, class: "valeur" });
          const o = el("tspan", { class: "v-occ" }); o.textContent = x.valeurs[0];
          const sep = el("tspan"); sep.textContent = " · ";
          const c = el("tspan", { class: "v-chn" }); c.textContent = x.valeurs[1];
          v.append(o, sep, c); g.appendChild(v); y += 10;
        } else if (x.valeur) { const v = el("text", { y, class: "valeur" }); v.textContent = x.valeur; g.appendChild(v); y += 10; }
        if (x.sigles) { const s = el("text", { y: y - 1, class: "sigles" }); s.textContent = x.sigles; g.appendChild(s); y += 7; }
        if (x.barres) {
          const b = el("g", { class: "barres", transform: `translate(-19,${y + 12})` });
          x.barres.o.forEach((v, i) => {
            b.appendChild(el("rect", { x: i * 10, y: -Math.max(0.5, v * 0.12), width: 4, height: Math.max(0.5, v * 0.12), class: "b-o" }));
            b.appendChild(el("rect", { x: i * 10 + 4.5, y: -Math.max(0.5, x.barres!.c[i] * 0.12), width: 4, height: Math.max(0.5, x.barres!.c[i] * 0.12), class: "b-c" }));
          });
          g.appendChild(b);
        }
        coucheNoms.appendChild(g);
        poserMarques(iso, x.marqueurs);
      }
      for (const [id, m] of Object.entries(hors)) poserMarques(`#${id}`, m);
      for (const pt of pointsFlux) poserMarques(`@${pt.id}`, [pt.marqueur]);
      appliquer();
    },
  };
}

// Échelle logarithmique bleu clair -> or, lisible sur fond sombre.
export function couleurLog(v: number, min: number, max: number): string {
  if (!(v > 0)) return "#7a858f";
  const t = Math.max(0, Math.min(1, (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))));
  const a = [110, 170, 225], b = [250, 195, 70];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c.join(",")})`;
}

// Échelle divergente de l'alignement : bleu bloc USA (+1), sable neutre (0), rouge bloc Chine (-1).
export function couleurAlignement(a: number): string {
  const neutre = [214, 200, 160], occ = [70, 135, 225], chn = [220, 75, 60];
  const t = Math.min(1, Math.abs(a)), b = a >= 0 ? occ : chn;
  return `rgb(${neutre.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
}
