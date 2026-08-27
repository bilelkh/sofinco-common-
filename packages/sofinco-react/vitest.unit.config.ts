import { defineConfig } from "vitest/config";
import { sofincoReactAliases } from "./aliases.js";

// Config DÉDIÉE aux tests unitaires node (logique pure, zéro DOM/navigation).
//
// Volontairement séparée du projet vitest "navigateur" piloté par
// `@storybook/addon-vitest` (interaction tests des stories) : on ne charge NI le
// runtime Storybook NI Playwright pour exécuter de simples fonctions string.
// Lancée explicitement via `pnpm test` (voir package.json) — `vitest run --config
// vitest.unit.config.ts` — pour ne jamais entrer en collision avec l'addon.
//
// Les `.test.tsx` sont admis pour un seul usage : les tests de rendu SSR
// (`renderToString`, environnement node) qui vérifient qu'un composant consommé en
// Island Jahia ne touche ni `document` ni `window` au rendu — GraalVM n'en a pas.
export default defineConfig({
	/*
	 * Transformation JSX. `tsconfig.json` déclare `"jsx": "preserve"` (c'est le bundler qui
	 * s'en charge en temps normal) et le transformeur de Vite honore ce réglage : sans
	 * consigne explicite, un `.tsx` arrive non transformé et échoue à l'analyse. On le règle
	 * ici via `oxc` plutôt qu'avec `@vitejs/plugin-react` : le runtime automatique suffit aux
	 * tests (ni Fast Refresh ni HMR en `environment: "node"`), et cela n'entraîne ni
	 * Storybook ni Playwright — la raison d'être de cette configuration séparée reste intacte.
	 */
	oxc: { jsx: { runtime: "automatic" } },
	/*
	 * Sans alias, tout test qui rend un composant du DS échoue à l'import dès que celui-ci
	 * utilise `@shared/…`, `@common/…`, `@b2c/…` — c'est-à-dire presque tous. La carte vient
	 * de `aliases.js`, partagée avec `vite.config.ts` et les consommateurs en aval.
	 */
	resolve: {
		alias: { ...sofincoReactAliases },
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		globals: false,
	},
});
