// Générateur pseudo-aléatoire à graine (mulberry32) : même graine, même suite.
// L'état tient dans un entier, ce qui le rend sauvegardable.
export function suivant(etat: number): { valeur: number; etat: number } {
  const e = (etat + 0x6d2b79f5) | 0;
  let t = e;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { valeur: ((t ^ (t >>> 14)) >>> 0) / 4294967296, etat: e };
}
