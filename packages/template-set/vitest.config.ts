import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { sofincoReactAliases } from "sofinco-react/aliases";

// `import x from "./foo.ts?inline-script"` is resolved at build time by the Jahia
// vite-plugin (it stringifies + minifies the module into an inline <script>). Vitest
// runs in plain node and knows nothing about that query, so we stub any `?inline-script`
// import to an empty string.
const inlineScriptStub = (): Plugin => ({
	name: "inline-script-stub",
	enforce: "pre",
	resolveId(id) {
		if (id.endsWith("?inline-script")) return "\0inline-script-stub";
	},
	load(id) {
		if (id === "\0inline-script-stub") return 'export default "";';
	},
});

export default defineConfig({
	plugins: [inlineScriptStub()],
	// Mêmes alias qu'au build : dès qu'un test importe `sofinco-react` à l'exécution (et non
	// en `import type`, effacé à la compilation), les sources internes du DS doivent être
	// résolvables. Carte fournie par le DS lui-même.
	resolve: { alias: { ...sofincoReactAliases } },
	/*
	 * `tsconfig.json` déclare `"jsx": "preserve"` — c'est le bundler Jahia qui transforme en
	 * temps normal. Sans ce réglage, un test qui REND un composant serveur (par exemple le
	 * contrôle des mentions légales) reçoit du JSX non transformé et échoue sur
	 * « React is not defined ».
	 */
	esbuild: { jsx: "automatic", jsxImportSource: "react" },
	test: {
		environment: "node",
		/*
		 * `javascript/` EST INCLUS, et ce n'est pas un détail.
		 *
		 * Ce dossier porte les plugins CKEditor — des scripts navigateur chargés tels quels par
		 * l'éditeur, hors de toute chaîne de build. `sofincoPageAnchors/plugin.js` y pèse à lui
		 * seul plus de mille lignes : clé de cache par page, garde d'obsolescence par numéro de
		 * séquence, machine à états de réouverture du menu. Exactement le genre de logique qui
		 * régresse sans bruit.
		 *
		 * Tant que l'inclusion s'arrêtait à `src/`, tout cela était invérifiable PAR
		 * CONSTRUCTION : aucun test n'aurait été exécuté, même écrit.
		 */
		include: ["src/**/*.test.ts", "javascript/**/*.test.ts"],
		globals: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.ts"],
			exclude: [
				"**/*.type.ts",
				"**/*.types.ts",
				"**/*.d.ts",
				"**/*.test.ts",
				"src/test/**",
				"src/**/*.server.tsx",
				"src/**/*.client.tsx",
				// Scripts inline : évalués dans une fenêtre happy-dom, jamais importés — l outil
				// de couverture ne peut pas les instrumenter. Ils ont leurs propres tests.
				"src/**/*-bootstrap.ts",
				"src/**/*-script.ts",
			],
			thresholds: {
				statements: 50,
				lines: 50,
				functions: 50,
				branches: 50,
			},
		},
	},
});
