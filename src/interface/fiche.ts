import { FAMILLES } from "../data/attributs";
import { DONNEES, SCORES, valeur, indicateursDe, formater, score } from "../data/donnees2000";
import type { EtatJeu } from "../moteur/etat";
import { libelle } from "../moteur/temps";

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function ficheHtml(iso3: string, etat: EtatJeu): string {
  const p = DONNEES.pays[iso3];
  const popActuelle = etat.pays[iso3].population;
  let html = `<h2>${p.nom}</h2><p class="note">Population au ${libelle(etat.round)} : <strong>${(popActuelle / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} millions</strong> (tendance provisoire 1995-2000)</p>`;
  html += `<p class="note">Valeurs réelles de ${DONNEES.annee} (année indiquée si elle diffère). Survolez un indicateur pour sa source.</p>`;
  for (const [cleFam, fam] of Object.entries(FAMILLES)) {
    html += `<h3>${fam.nom}</h3><table>`;
    for (const attribut of ["Ensemble", ...fam.attributs]) {
      const cles = indicateursDe(cleFam, attribut);
      if (!cles.length && !DONNEES.sansSource[attribut]) continue;
      const sc = score(iso3, attribut), def = SCORES.attributs[attribut];
      const aide = def ? echapper(`Score estimé : ${def.definition}` + (def.ajustements[iso3] ? ` — ajusté : ${def.ajustements[iso3]}` : "")) : "";
      html += attribut === "Ensemble" ? `<tr class="attribut"><td colspan="2">Ensemble de la famille</td></tr>`
        : `<tr class="attribut" title="${aide}"><td>${attribut}</td><td class="v score">${sc}/100</td></tr>`;
      if (!cles.length) html += `<tr><td colspan="2" class="note">Non sourcé : ${echapper(DONNEES.sansSource[attribut])}</td></tr>`;
      for (const c of cles) {
        const def = DONNEES.indicateurs[c], val = valeur(iso3, c);
        const src = DONNEES.sources[val?.s ?? def.source].nom + (def.note ? ` — ${def.note}` : "");
        const annee = !val ? "" : val.e ? ` <span class="note">(estimation)</span>` : val.a !== DONNEES.annee ? ` <span class="note">(${val.a})</span>` : "";
        html += `<tr title="${echapper(src)}"><td>${def.nom} <span class="note">(${def.unite})</span></td><td class="v">${val ? formater(c, val.v) + annee : "non disponible"}</td></tr>`;
      }
    }
    html += "</table>";
  }
  html += `<h3>Sources</h3><p class="note">${Object.values(DONNEES.sources).map(s => echapper(s.nom)).join("<br>")}<br>Collecte du ${DONNEES.collecte.split("-").reverse().join("/")}.</p>`;
  return html;
}
