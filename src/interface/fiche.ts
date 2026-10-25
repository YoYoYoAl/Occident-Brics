import donnees from "../data/pays2000.json";
import { FAMILLES, INDICATEURS } from "../data/attributs";
import type { EtatJeu } from "../moteur/etat";
import { libelle } from "../moteur/temps";

type Pays = (typeof donnees.pays)[number];

function valeurIndicateur(p: Pays, cle: string): number | null {
  if (cle === "croissancePop9500") return p.croissancePop9500;
  if (cle === "pibParHab") return p.indicateurs.pib && p.indicateurs.population ? p.indicateurs.pib / p.indicateurs.population : null;
  return (p.indicateurs as Record<string, number | null>)[cle] ?? null;
}

export function ficheHtml(iso3: string, etat: EtatJeu): string {
  const p = donnees.pays.find(x => x.iso3 === iso3)!;
  const popActuelle = etat.pays[iso3].population;
  let html = `<h2>${p.nom}</h2><p class="note">Population au ${libelle(etat.round)} : <strong>${(popActuelle / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} millions</strong> (tendance provisoire 1995-2000)</p>`;
  for (const fam of Object.values(FAMILLES)) {
    html += `<h3>${fam.nom}</h3>`;
    if (fam.indicateurs.length) {
      html += "<table>";
      for (const c of fam.indicateurs) {
        const def = INDICATEURS[c], v = valeurIndicateur(p, c);
        html += `<tr><td>${def.nom} <span class="note">(${def.unite}, 2000)</span></td><td class="v">${v === null ? "non disponible" : def.format(v)}</td></tr>`;
      }
      html += "</table>";
    } else html += `<p class="note">Aucun indicateur sourcé en v0.1.</p>`;
    html += `<p class="note">Attributs à calculer (v0.2) :</p><div class="attente">${fam.attributs.map(a => `<span>${a}</span>`).join("")}</div>`;
  }
  html += `<h3>Sources</h3><p class="note">${Object.values(donnees.sources).join("<br><br>")}</p>`;
  return html;
}
