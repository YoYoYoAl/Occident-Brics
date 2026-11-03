// Choix de l'image d'un événement (retour du 3 novembre 2026 : « la plupart des cartes n'ont pas d'image »). Code cosmétique :
// aucun tirage aléatoire du jeu, seulement un hachage de l'identifiant.
import * as M from "./moteur";
export const FAMILLE_EV: Record<string, string> = Object.fromEntries(M.HISTORIQUES_V2.map(h => [h.id, (h as { famille?: string }).famille ?? ""]));
// Plusieurs images proches par type : il y a environ 5 élections et 3 coups de force par an dans le monde.
export const PAR_TYPE: [RegExp, string[]][] = [
  [/^pol_(reelection|alternance|camp|transition|succession)/, ["election_rupture", "poussee_ideologique", "manifestations", "reconciliation", "sommet_reconciliation"]],
  [/^pol_coup/, ["coup_etat", "repression", "guerre_civile", "assassinat_dirigeant"]], [/^pol_revolution/, ["revolution", "manifestations", "repression"]], [/^pol_recul/, ["repression", "scandale_dirigeant"]],
  [/^sauvetage/, ["defaut_souverain", "hyperinflation", "recession_mondiale", "krach_boursier", "bulle_immobiliere"]], [/^decouverte/, ["gisement_geant"]], [/^exode/, ["crise_migratoire", "secheresse"]],
  [/^chantage_alimentation/, ["famine", "secheresse"]], [/^chantage/, ["sanctions_embargo", "blocage_detroit", "guerre_commerciale"]],
  [/^(omc|ndb|aiib|ocs)/, ["accord_commercial", "traite_majeur", "sommet_reconciliation"]], [/^cpi/, ["traite_majeur", "massacre_memorial"]], [/^climat/, ["record_climatique", "alerte_environnementale", "canicule"]],
  [/^incident/, ["incident_militaire", "conflit_frontalier"]], [/^gen_(.+)$/, ["$1"]]];
const hache = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function imagesCandidates(id: string, dispo: (n: string) => boolean, propres: Record<string, string> = {}): string[] {
  const l: string[] = [`ev_${id}`]; if (propres[id]) l.push(propres[id]);
  if (FAMILLE_EV[id]) l.push(`famille_${FAMILLE_EV[id]}`);
  for (const [r, fs] of PAR_TYPE) { const m = id.match(r); if (m) { const n = hache(id); fs.forEach((_, k) => l.push(`famille_${fs[(n + k) % fs.length].replace("$1", m[1] ?? "")}`)); break; } }
  if (id.startsWith("guerre")) { const n = hache(id); for (let k = 0; k < 14; k++) l.push(`guerre_${(n + k) % 14 + 1}`); }
  return l.filter(dispo);
}
// Une scène dédiée (ev_) ne sert qu'une fois par partie ; une image de famille ou de guerre peut revenir d'une année à l'autre,
// jamais deux fois la même année.
export const choisirImage = (c: string[], pris: Set<string>, cetteAnnee: Set<string | undefined>) =>
  c.find(k => !pris.has(k) && !cetteAnnee.has(k)) ?? c.find(k => !k.startsWith("ev_") && !cetteAnnee.has(k));
