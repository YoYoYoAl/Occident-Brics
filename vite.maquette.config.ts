import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Maquette v2 : code et styles dans un seul fichier HTML ; les images restent des fichiers à part (publiées avec la page).
// Bruitages (.mp3) intégrés au HTML (limite de 511 fichiers par version) ; musiques copiées dans dist-maquette/musiques (outils/musiques-maquette.sh).
export default defineConfig({
  base: "./",
  publicDir: false,
  experimental: { renderBuiltUrl: (f: string) => "./" + f }, // images : chemins relatifs à la page (le script est intégré au HTML)
  plugins: [viteSingleFile({ useRecommendedBuildConfig: false, removeViteModuleLoader: true })],
  build: { outDir: "dist-maquette", emptyOutDir: true, assetsInlineLimit: (f: string) => f.endsWith(".mp3"), cssCodeSplit: false, rollupOptions: { input: "maquette.html", output: { inlineDynamicImports: true } } },
});
