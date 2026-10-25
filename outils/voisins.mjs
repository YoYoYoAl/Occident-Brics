// Génère src/data/voisins.json : frontières terrestres (topojson.neighbors sur world-atlas 50m),
// complétées pour les pays insulaires ou isolés (moins de 2 voisins) par les 2 pays les plus proches (centroïdes).
import { readFileSync, writeFileSync } from "node:fs";
import { neighbors, feature } from "topojson-client";
import { geoCentroid, geoDistance } from "d3-geo";
const monde = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const liste = JSON.parse(readFileSync("src/data/pays2000.json", "utf8")).pays, pays = liste.map(p => p.iso3);
const isoDe = new Map(liste.map(p => [String(p.idCarte).padStart(3, "0"), p.iso3]));
const geoms = monde.objects.countries.geometries, vois = neighbors(geoms), fc = feature(monde, monde.objects.countries);
const res = {}, cent = {};
geoms.forEach((g, k) => {
  const iso = isoDe.get(String(g.id).padStart(3, "0")); if (!iso || !pays.includes(iso)) return;
  cent[iso] = geoCentroid(fc.features[k]);
  res[iso] = [...new Set([...(res[iso] ?? []), ...vois[k].map(j => isoDe.get(String(geoms[j].id).padStart(3, "0"))).filter(x => x && x !== iso && pays.includes(x))])];
});
// la Guyane française donne à la France une frontière avec le Brésil et le Suriname : non pertinente pour la proximité politique
for (const [a, b] of [["FRA", "BRA"], ["FRA", "SUR"]]) { res[a] = res[a].filter(x => x !== b); res[b] = res[b].filter(x => x !== a); }
for (const iso of Object.keys(res)) if (res[iso].length < 2) {
  const proches = Object.keys(cent).filter(x => x !== iso && !res[iso].includes(x)).sort((a, b) => geoDistance(cent[iso], cent[a]) - geoDistance(cent[iso], cent[b]));
  for (const x of proches.slice(0, 2 - res[iso].length)) { res[iso].push(x); if (!res[x].includes(iso)) res[x].push(iso); }
}
const manquants = pays.filter(p => !res[p]);
writeFileSync("src/data/voisins.json", JSON.stringify(res));
console.log(Object.keys(res).length, "pays ; sans géométrie :", manquants.join(",") || "aucun");
