// Carte v2 : pays colorés selon le mode, frontières de zones marquées, étiquettes de zones avec jetons, routes.
// Même projection que la carte du jeu (Miller, centrée à 32° E). Molette : zoom ; glisser : déplacer.
import { geoProjection, geoPath, geoGraticule } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import monde from "world-atlas/countries-50m.json";
import { ZONES, ZONE_DE, ROUTES } from "./zones";

const NS = "http://www.w3.org/2000/svg";
const L = 1000, LON_O = -128, LON_E = 192, CENTRE = 32, LAT_S = -60, LAT_N = 80;
const GLACES = new Set(["010", "304"]);
const miller = (l: number, f: number): [number, number] => [l, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * f))];
(miller as any).invert = (x: number, y: number) => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];
const el = <K extends keyof SVGElementTagNameMap>(n: K, a: Record<string, string | number> = {}) => { const x = document.createElementNS(NS, n); for (const [k, v] of Object.entries(a)) x.setAttribute(k, String(v)); return x; };
// Position des étiquettes de zones (lon, lat), choisies à la main pour ne pas couvrir les pays clés.
export const ANCRES: Record<string, [number, number]> = {
  AMN: [-101, 47], AMC: [-73, 21], AMS: [-62, -12], EUO: [-14, 47], EUE: [30, 54], RCA: [78, 60], MOA: [37, 30], AOC: [3, 6], AEA: [33, -14], ASS: [80, 17], ASE: [108, 40], ASO: [130, -18],
};

export interface CarteV2 {
  colorer(f: (iso: string) => string): void;
  surligner(zone: string | null): void;
  choisirPays(iso: string | null): void;
  etiquettes(f: (zone: string) => string): void; // HTML de chaque étiquette de zone
  routes(f: ((id: string) => { couleur: string | null; occ: number; chn: number; info: string }) | null): void; // contrôle de chaque route (0-100), ou null pour les cacher
  zoneSous(x: number, y: number): string | null;
  centrerSur(zone: string | null): void;
  marges(m: { g: number; d: number; h: number; b: number }): void; // place prise par les panneaux, en pixels
}
export function dessinerCarteV2(conteneur: HTMLElement, idsJeu: Map<string, string>, rappels: { clicPays: (iso: string) => void; clicZone: (zone: string) => void; survol: (iso: string | null, ev: MouseEvent) => void }): CarteV2 {
  const topo = monde as any;
  const tous = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;
  const cadre = { type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: [[LON_O, LAT_S], [LON_E - 0.01, LAT_N]] } } as any;
  const proj = geoProjection(miller as any).rotate([-CENTRE, 0]).fitWidth(L, cadre);
  const H = Math.round(proj([0, LAT_S])![1] - proj([0, LAT_N])![1]);
  proj.translate([proj.translate()[0], proj.translate()[1] - proj([0, LAT_N])![1]]);
  const chemin = geoPath(proj);
  const svg = el("svg", { viewBox: `0 0 ${L} ${H}`, preserveAspectRatio: "xMidYMid meet", class: "v2-svg" });
  const defs = el("defs");
  defs.innerHTML = `<linearGradient id="v2mer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcecf3"/><stop offset=".55" stop-color="#cfe3ee"/><stop offset="1" stop-color="#bcd6e6"/></linearGradient>
    <filter id="v2ombre" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy=".8" stdDeviation=".9" flood-color="#33506a" flood-opacity=".28"/></filter>
    <pattern id="v2hachures" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff" fill-opacity=".0"/><line x1="0" y1="0" x2="0" y2="4" stroke="#fff" stroke-width="1.6" stroke-opacity=".75"/></pattern>`;
  const vue = el("g");
  const mer = el("rect", { x: -L, y: -H, width: 3 * L, height: 3 * H, fill: "url(#v2mer)" });
  const grat = el("path", { d: chemin(geoGraticule().step([15, 15])()) ?? "", class: "v2-grat" });
  const gPays = el("g", { class: "v2-pays", filter: "url(#v2ombre)" });
  const gZoneSel = el("g", { class: "v2-zonesel" });
  const gFront = el("g", { class: "v2-front" });
  const gRoutes = el("g", { class: "v2-routes" });
  vue.append(mer, grat, gPays, gZoneSel, gFront, gRoutes);
  svg.append(defs, vue);
  const chemins = new Map<string, SVGPathElement[]>();
  for (const f of tous.features) {
    const id = String(f.id), iso = idsJeu.get(id);
    const p = el("path", { d: chemin(f) ?? "", class: iso ? "v2-p jeu" : GLACES.has(id) ? "v2-p glace" : "v2-p hors" });
    if (iso) { p.dataset.iso = iso; chemins.set(iso, [...(chemins.get(iso) ?? []), p]); }
    gPays.appendChild(p);
  }
  // Frontières de zones : arêtes partagées entre deux pays de zones différentes.
  const zoneDeGeom = (g: any) => ZONE_DE[idsJeu.get(String(g.id)) ?? ""] ?? "";
  gFront.appendChild(el("path", { d: chemin(mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b && zoneDeGeom(a) !== zoneDeGeom(b) && !!zoneDeGeom(a) && !!zoneDeGeom(b)) as any) ?? "", class: "v2-frontiere" }));
  // Surlignage d'une zone : contour épais de ses pays.
  const contourZone = (z: string) => chemin(mesh(topo, topo.objects.countries, (a: any, b: any) => (zoneDeGeom(a) === z) !== (zoneDeGeom(b) === z) || (a === b && zoneDeGeom(a) === z)) as any) ?? "";
  const contours = new Map<string, string>();
  // Étiquettes HTML posées par-dessus la carte (suivent le zoom).
  const calque = document.createElement("div"); calque.className = "v2-calque";
  const etiq = new Map<string, HTMLDivElement>();
  for (const z of ZONES) {
    const d = document.createElement("div"); d.className = "v2-etiq"; d.dataset.zone = z.id;
    d.addEventListener("click", ev => { ev.stopPropagation(); rappels.clicZone(z.id); });
    etiq.set(z.id, d); calque.appendChild(d);
  }
  conteneur.append(svg, calque);

  // Zoom et déplacement : échelle s (pixels par unité de carte) et coin (vx, vy) ; le viewBox suit exactement les proportions du conteneur.
  // « marges » : place prise par les panneaux posés sur la carte, pour centrer le monde dans la partie libre de l'écran.
  let vx = 0, vy = 0, s = 1, sMin = 1, marges = { g: 0, d: 0, h: 0, b: 0 };
  const taille = () => { const r = conteneur.getBoundingClientRect(); return { w: Math.max(1, r.width), h: Math.max(1, r.height), x: r.left, y: r.top }; };
  const utile = () => { const t = taille(); return { x: marges.g + (t.w - marges.g - marges.d) / 2, y: marges.h + (t.h - marges.h - marges.b) / 2 }; };
  const appliquer = () => { const t = taille(); svg.setAttribute("viewBox", `${vx} ${vy} ${t.w / s} ${t.h / s}`); placer(); };
  const borner = () => { const u = utile(); const cx = Math.max(0, Math.min(L, vx + u.x / s)), cy = Math.max(0, Math.min(H, vy + u.y / s)); vx = cx - u.x / s; vy = cy - u.y / s; };
  const centrer = (x: number, y: number) => { const u = utile(); vx = x - u.x / s; vy = y - u.y / s; borner(); appliquer(); };
  function ajuster() { const t = taille(); sMin = Math.min((t.w - marges.g - marges.d) / L, (t.h - marges.h - marges.b) / H); s = sMin; centrer(L / 2, H / 2); }
  const ecranVersCarte = (cx: number, cy: number): [number, number] => { const t = taille(); return [vx + (cx - t.x) / s, vy + (cy - t.y) / s]; };
  const carteVersEcran = (x: number, y: number): [number, number] => [(x - vx) * s, (y - vy) * s];
  function placer() { for (const [z, d] of etiq) { const p = proj(ANCRES[z])!; const [x, y] = carteVersEcran(p[0], p[1]); d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; } }
  svg.addEventListener("wheel", ev => {
    ev.preventDefault();
    const [mx, my] = ecranVersCarte(ev.clientX, ev.clientY), t = taille();
    s = Math.max(sMin, Math.min(sMin * 8, s * (ev.deltaY < 0 ? 1.25 : 0.8)));
    vx = mx - (ev.clientX - t.x) / s; vy = my - (ev.clientY - t.y) / s; borner(); appliquer();
  }, { passive: false });
  let glisse: { x: number; y: number; vx: number; vy: number; bouge: boolean } | null = null;
  svg.addEventListener("pointerdown", ev => { glisse = { x: ev.clientX, y: ev.clientY, vx, vy, bouge: false }; });
  window.addEventListener("pointermove", ev => {
    if (!glisse) return;
    const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) glisse.bouge = true;
    if (glisse.bouge) { vx = glisse.vx - dx / s; vy = glisse.vy - dy / s; borner(); appliquer(); }
  });
  window.addEventListener("pointerup", () => { setTimeout(() => (glisse = null), 0); });
  gPays.addEventListener("click", ev => { if (glisse?.bouge) return; const iso = (ev.target as SVGElement).dataset?.iso; if (iso) rappels.clicPays(iso); });
  gPays.addEventListener("mousemove", ev => rappels.survol((ev.target as SVGElement).dataset?.iso ?? null, ev));
  gPays.addEventListener("mouseleave", ev => rappels.survol(null, ev));
  new ResizeObserver(() => ajuster()).observe(conteneur);

  let zoneSel: string | null = null;
  const api: CarteV2 = {
    colorer(f) { for (const [iso, l] of chemins) { const c = f(iso); for (const p of l) p.style.fill = c; } },
    surligner(z) {
      zoneSel = z; gZoneSel.innerHTML = "";
      for (const [, d] of etiq) d.classList.toggle("active", d.dataset.zone === z);
      for (const [iso, l] of chemins) for (const p of l) p.classList.toggle("estompe", !!z && ZONE_DE[iso] !== z);
      if (!z) return;
      if (!contours.has(z)) contours.set(z, contourZone(z));
      gZoneSel.append(el("path", { d: contours.get(z)!, class: "v2-zone-halo" }), el("path", { d: contours.get(z)!, class: "v2-zone-trait" }));
    },
    choisirPays(iso) { for (const [i, l] of chemins) for (const p of l) p.classList.toggle("choisi", i === iso); },
    etiquettes(f) { for (const [z, d] of etiq) d.innerHTML = f(z); placer(); },
    routes(f) {
      gRoutes.innerHTML = "";
      if (!f) return;
      for (const r of ROUTES) {
        const pts = r.trace.map(c => proj(c)!).map(p => p.join(",")).join(" ");
        const x = f(r.id), c = x.couleur;
        const g = el("g", { class: "v2-route" });
        g.append(el("polyline", { points: pts, class: "v2-route-fond" }), el("polyline", { points: pts, class: "v2-route-trait", stroke: c ?? "#8a8f98" }));
        const m = proj(r.etiq ?? r.trace[Math.floor(r.trace.length / 2)])!;
        const t = el("text", { x: m[0], y: m[1] - 8, class: "v2-route-nom" }); t.textContent = r.nom;
        const k = el("text", { x: m[0], y: m[1] - 1, class: "v2-route-ctrl" });
        const so = el("tspan", { class: "occ" }); so.textContent = `${x.occ} %`;
        const sep = el("tspan", {}); sep.textContent = " · ";
        const sc = el("tspan", { class: "chn" }); sc.textContent = `${x.chn} %`;
        k.append(so, sep, sc);
        const titre = el("title"); titre.textContent = `${r.nom} : ${x.info}`;
        g.append(t, k, titre); gRoutes.appendChild(g);
      }
    },
    zoneSous(x, y) {
      const n = document.elementsFromPoint(x, y).find(e => (e as HTMLElement).dataset?.iso || (e as HTMLElement).dataset?.zone) as HTMLElement | undefined;
      return n ? (n.dataset.zone ?? ZONE_DE[n.dataset.iso!] ?? null) : null;
    },
    centrerSur(z) {
      if (!z) { s = sMin; centrer(L / 2, H / 2); return; }
      const p = proj(ANCRES[z])!; s = sMin * 2.2; centrer(p[0], p[1]);
    },
    marges(m) { if (m.g === marges.g && m.d === marges.d && m.h === marges.h && m.b === marges.b) return; marges = m; ajuster(); },
  };
  void zoneSel;
  requestAnimationFrame(ajuster);
  return api;
}
