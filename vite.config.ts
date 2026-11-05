import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// Un seul fichier HTML autonome : le jeu s'ouvre sans serveur.
export default defineConfig({
  plugins: [viteSingleFile()],
  // tests/audit : audits longs (parties complètes au hasard, 300 parties par duel), lancés à la demande : AUDIT=1 npx vitest run tests/audit
  test: { globals: true, environment: "node", exclude: process.env.AUDIT ? ["**/node_modules/**"] : ["**/node_modules/**", "tests/audit/**"] },
});
