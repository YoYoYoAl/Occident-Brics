// Déclaration minimale de node:fs pour les tests (pas de @types/node dans le projet).
declare module "node:fs" {
  export function existsSync(p: string): boolean;
  export function statSync(p: string): { size: number };
  export function readFileSync(p: string, encodage: "utf8"): string;
  export function readdirSync(p: string): string[];
}
