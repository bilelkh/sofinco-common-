/**
 * Proxy de développement vers le référentiel des communes — source de vérité unique.
 *
 * Consommé par `vite.config.ts` (dev du DS) et par `.storybook/main.ts` : Storybook 10
 * monte **son propre** serveur Vite et ne reprend pas la section `server` du projet, il
 * faut donc le lui poser explicitement via `viteFinal`.
 *
 * Pourquoi ce proxy : `https://api-ref.sofinco.fr` n'autorise que deux origines exactes,
 * `https://www.sofinco.fr` et `https://www.pro.sofinco.fr`, et répond **403 sans en-tête
 * CORS** à toute autre — `localhost` compris. Le champ « code postal » ne serait donc pas
 * essayable hors production. Un appel serveur→serveur passe : c'est l'en-tête `Origin`,
 * et lui seul, qui déclenche le refus.
 *
 * En production rien de tout ceci n'existe : `CITIES_ENDPOINT` est appelé en direct depuis
 * une origine autorisée.
 */
export const citiesProxy = {
	"/api-ref": {
		target: "https://api-ref.sofinco.fr",
		changeOrigin: true,
		rewrite: (path) => path.replace(/^\/api-ref/, ""),
		/*
		 * `bypass` court avant le transfert et reçoit la requête entrante : c'est là que
		 * les en-têtes se retirent. `changeOrigin` ne réécrit que `Host` — `Origin`
		 * partirait tel quel et vaudrait 403. Retourner `undefined` laisse le proxy
		 * suivre son cours.
		 */
		bypass: (req) => {
			delete req.headers.origin;
			delete req.headers.referer;
			return undefined;
		},
	},
};
