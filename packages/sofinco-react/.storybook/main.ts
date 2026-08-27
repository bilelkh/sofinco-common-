import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { citiesProxy } from "../citiesProxy.js";
const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		getAbsolutePath("@chromatic-com/storybook"),
		getAbsolutePath("@storybook/addon-vitest"),
		getAbsolutePath("@storybook/addon-a11y"),
		getAbsolutePath("@storybook/addon-docs"),
	],
	staticDirs: ["../public"],
	framework: getAbsolutePath("@storybook/react-vite"),
	/*
	 * Storybook monte son propre serveur Vite et ne reprend pas la section `server` de
	 * `vite.config.ts` : le proxy du référentiel des communes doit lui être posé ici, sans
	 * quoi `/api-ref/...` répond 404 sur le port 6006. Cf. `citiesProxy.js` pour le motif
	 * (liste blanche d'origines côté service, qui exclut `localhost`).
	 */
	viteFinal: async (config) => ({
		...config,
		server: {
			...config.server,
			proxy: { ...config.server?.proxy, ...citiesProxy },
		},
	}),
	typescript: {
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			shouldRemoveUndefinedFromOptional: true,
			propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
		},
	},
};
export default config;

function getAbsolutePath(value: string): string {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
