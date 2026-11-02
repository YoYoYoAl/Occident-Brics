import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Maquette v2 : code et styles dans un seul fichier HTML ; les images restent des fichiers à part (publiées avec la page).
export default defineConfig({
  base: "./",
  publicDir: false,
  experimental: { renderBuiltUrl: (f: string) => "./" + f }, // images : chemins relatifs à la page (le script est intégré au HTML)
  plugins: [viteSingleFile({ useRecommendedBuildConfig: false, removeViteModuleLoader: true })],
  build: { outDir: "dist-maquette", emptyOutDir: true, assetsInlineLimit: 0, cssCodeSplit: false, rollupOptions: { input: "maquette.html", output: { inlineDynamicImports: true } } },
});
