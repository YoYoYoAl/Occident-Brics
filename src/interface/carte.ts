import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import monde from "world-atlas/countries-50m.json";

const NS = "http://www.w3.org/2000/svg";

// Dessine la carte une fois ; colorer() met à jour les couleurs sans redessiner.
export function dessinerCarte(conteneur: HTMLElement, idsJeu: Map<string, string>, surClic: (iso3: string) => void) {
  const pays = feature(monde as any, (monde as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  const largeur = 1000, hauteur = 520;
  const projection = geoNaturalEarth1().fitSize([largeur, hauteur], pays);
  const chemin = geoPath(projection);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${largeur} ${hauteur}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const parIso = new Map<string, SVGPathElement[]>(); // un pays peut avoir plusieurs formes (îles, territoires)
  for (const f of pays.features) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", chemin(f) ?? "");
    const iso3 = idsJeu.get(String(f.id));
    const titre = document.createElementNS(NS, "title");
    titre.textContent = f.properties?.name ?? "";
    p.appendChild(titre);
    if (iso3) {
      p.classList.add("jeu");
      p.addEventListener("click", () => surClic(iso3));
      parIso.set(iso3, [...(parIso.get(iso3) ?? []), p]);
    } else p.setAttribute("fill", "var(--pays-hors)");
    svg.appendChild(p);
  }
  conteneur.appendChild(svg);
  return {
    colorer(couleurs: Record<string, string>, noms: Record<string, string>) {
      for (const [iso3, formes] of parIso) for (const p of formes) {
        p.setAttribute("fill", couleurs[iso3]);
        p.querySelector("title")!.textContent = noms[iso3];
      }
    },
    choisir(iso3: string | null) {
      for (const [i, formes] of parIso) for (const p of formes) p.classList.toggle("choisi", i === iso3);
    },
  };
}

// Échelle logarithmique bleu nuit -> or, lisible sur fond sombre.
export function couleurLog(v: number, min: number, max: number): string {
  if (!(v > 0)) return "#3a444d";
  const t = Math.max(0, Math.min(1, (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))));
  const a = [50, 95, 150], b = [230, 170, 60];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c.join(",")})`;
}
