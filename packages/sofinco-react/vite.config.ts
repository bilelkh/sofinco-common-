import { defineConfig } from "vite";

import { sofincoReactAliases } from "./aliases.js";
import { citiesProxy } from "./citiesProxy.js";

export default defineConfig({
	esbuild: {
		jsx: "automatic",
	},
	resolve: {
		// Source de vérité : `aliases.js`, également consommé par `vitest.unit.config.ts` et
		// par le module Jahia qui compile ces sources.
		alias: { ...sofincoReactAliases },
	},
	// Proxy du référentiel des communes — cf. `citiesProxy.js`. Storybook monte son propre
	// serveur et le reçoit séparément, via `.storybook/main.ts`.
	server: { proxy: citiesProxy },
});
