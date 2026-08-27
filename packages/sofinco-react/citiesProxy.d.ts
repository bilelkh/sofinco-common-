/**
 * Voir `citiesProxy.js` — proxy de développement vers le référentiel des communes.
 *
 * `bypass` est décrite par la forme dont elle a besoin, et non par `http.IncomingMessage` :
 * `@types/node` n'est pas installé dans ce projet, et la requête n'est ici lue que pour ses
 * en-têtes. Le type reste assignable à celui qu'attend Vite — `IncomingHttpHeaders` étant
 * un dictionnaire de `string | string[] | undefined`.
 */
export declare const citiesProxy: Record<
	string,
	{
		target: string;
		changeOrigin: boolean;
		rewrite: (path: string) => string;
		bypass: (req: { headers: Record<string, string | string[] | undefined> }) => undefined;
	}
>;
