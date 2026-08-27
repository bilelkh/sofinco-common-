// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sofinco from "./eslint-rules/index.js";

export default tseslint.config(
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
	}, // JS/TS recommended
	eslint.configs.recommended,
	{ files: ["**/*.ts", "**/*.tsx"], extends: tseslint.configs.recommended }, // React
	eslintReact.configs["recommended-typescript"],
	// Accessibilité (rôles/attributs ARIA, focus clavier, alt text…)
	jsxA11y.flatConfigs.recommended,
	// Ignore the same files as .gitignore
	includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
	{ ignores: ["tests", "packages/sofinco-core"] },
	/*
	 * Bundles minifiés de bibliothèques tierces (vanilla-lazyload, …) : du code GÉNÉRÉ, que
	 * l'on ne modifie pas et que l'on remplace tel quel à chaque mise à jour. Aucun build
	 * publié ne passe `eslint.configs.recommended` — helpers Babel réaffectés
	 * (`no-func-assign`), `while ((x = y))` (`no-cond-assign`), `define` AMD (`no-undef`) —
	 * et c'est vrai de toutes les variantes (UMD, IIFE, AMD, ESM) comme de toutes les
	 * versions. Les linter n'apporte rien : le seul « correctif » possible serait d'éditer
	 * un fichier minifié, perdu à la mise à jour suivante. Les sources maison qui les
	 * pilotent (ex. `lazyload-init.js`) restent, elles, entièrement contrôlées.
	 */
	{ ignores: ["**/*.min.js"] },
	storybook.configs["flat/recommended"],
	{
		rules: {
			"@eslint-react/dom/no-dangerously-set-innerhtml": "off",
		},
	},
	/*
	 * Garde-fou des renvois de notes de bas de page. Bloquant : un texte contributeur rendu
	 * sans <FootnoteText> perd son lien vers la mention légale SANS aucune erreur — le
	 * défaut se voit seulement en preview, jamais en édition. C'est ce que cette règle
	 * remplace : une convention tenue de mémoire devient une garantie de compilation.
	 *
	 * Limité au design system : c'est lui qui rend le texte contributeur côté React. Les
	 * vues serveur du template-set passent par `str()`, qui applique la transformation en
	 * amont.
	 */
	{
		files: ["packages/sofinco-react/src/**/*.tsx"],
		ignores: ["**/*.stories.tsx", "**/*.test.tsx"],
		plugins: { sofinco },
		rules: {
			"sofinco/require-footnote-text": [
				"error",
				{
					/*
					 * Composants qui appliquent <FootnoteText> eux-mêmes à leurs enfants : les
					 * envelopper une seconde fois serait redondant. Toute entrée ajoutée ici doit
					 * réellement le faire — sinon la règle devient un tampon.
					 */
					// La règle raisonne sur le NOM de l'élément JSX : une primitive tierce
					// homonyme serait blanchie à tort, d'où l'alias des Dialog.Title/Description
					// de Radix dans les deux Modal.tsx.
					wrappingComponents: ["Title", "Subtitle", "Tag"],
					/*
					 * Noms qui déclenchent l'heuristique sans porter de texte contributeur.
					 */
					ignoreNames: [],
				},
			],
		},
	},
);
