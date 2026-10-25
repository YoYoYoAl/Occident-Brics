import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// Un seul fichier HTML autonome : le jeu s'ouvre sans serveur.
export default defineConfig({
  plugins: [viteSingleFile()],
  test: { globals: true, environment: "node" },
});
