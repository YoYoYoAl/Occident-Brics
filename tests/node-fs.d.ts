// Déclaration minimale de node:fs pour les tests (pas de @types/node dans le projet).
declare module "node:fs" {
  export function existsSync(p: string): boolean;
  export function statSync(p: string): { size: number };
  export function readFileSync(p: string, encodage: "utf8"): string;
  export function writeFileSync(p: string, contenu: string): void;
  export function readdirSync(p: string): string[];
}

declare const process: { env: Record<string, string | undefined> }; // tests/audit : AUDIT_COURT
