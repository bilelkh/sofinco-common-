// @ts-check
import { defineConfig } from "eslint/config";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";

export default defineConfig(
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // JS/TS recommended
  eslint.configs.recommended,
  { files: ["**/*.ts", "**/*.tsx"], extends: tseslint.configs.recommended },

  // React
  eslintReact.configs["recommended-typescript"],

  // Ignore the same files as .gitignore
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),

  /*
   * Bundles minifiés de bibliothèques tierces (vanilla-lazyload, …) : code GÉNÉRÉ, remplacé
   * tel quel à chaque mise à jour. Aucun build publié ne passe `eslint.configs.recommended`,
   * toutes variantes et toutes versions confondues. Voir le commentaire de l'eslint.config.js
   * racine. `lazyload-init.js`, écrit à la main, reste linté.
   */
  { ignores: ["**/*.min.js"] },
);
