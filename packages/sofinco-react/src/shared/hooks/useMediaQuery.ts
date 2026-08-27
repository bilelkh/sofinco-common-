import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/*
 * Pendants TypeScript des `@custom-media` de `styles/breakpoints.css`. Un composant qui
 * branche en JS et son CSS doivent basculer au MÊME pixel ; recopier la chaîne à la main
 * laisse les deux dériver en silence.
 *
 */
export const SMALL_UP_QUERY = "(min-width: 768px)";
export const MEDIUM_UP_QUERY = "(min-width: 1024px)";
export const LARGE_UP_QUERY = "(min-width: 1440px)";

export const SMALL_DOWN_QUERY = "(max-width: 767px)";
export const MEDIUM_DOWN_QUERY = "(max-width: 1023px)";
export const LARGE_DOWN_QUERY = "(max-width: 1439px)";

interface MediaQueryStore {
	subscribe: (onStoreChange: () => void) => () => void;
	getSnapshot: () => boolean;
}

/*
 * Un store par requête, mémorisé au niveau du module.
 *
 * `useSyncExternalStore` compare `subscribe` et `getSnapshot` par IDENTITÉ : des fonctions
 * recréées à chaque rendu lui font redéfaire puis refaire l'abonnement à chaque passe —
 * `removeEventListener`, nouveau `matchMedia`, `addEventListener` — pour recalculer un
 * booléen inchangé. `Search` se re-rend à chaque frappe, ce cycle y tombait sur le chemin le
 * plus chaud du paquet.
 *
 * Effet de bord utile : deux composants qui observent la même requête (`Menu` et `Search`
 * partagent `MEDIUM_DOWN_QUERY`) se partagent désormais une seule `MediaQueryList`.
 *
 * La table est bornée par le nombre de requêtes distinctes écrites dans le code, et la
 * `MediaQueryList` reste créée PARESSEUSEMENT : rien ne touche `window` tant que le store
 * n'est pas réellement souscrit ou interrogé, donc le rendu serveur n'en approche pas.
 */
const stores = new Map<string, MediaQueryStore>();

const getServerSnapshot = () => false;

const storeFor = (query: string): MediaQueryStore => {
	const existing = stores.get(query);
	if (existing) return existing;

	let mediaQueryList: MediaQueryList | undefined;
	const list = () => (mediaQueryList ??= window.matchMedia(query));

	const store: MediaQueryStore = {
		subscribe: (onStoreChange) => {
			const mql = list();
			mql.addEventListener("change", onStoreChange);
			return () => mql.removeEventListener("change", onStoreChange);
		},
		getSnapshot: () => list().matches,
	};

	stores.set(query, store);
	return store;
};

/**
 * Returns `true` if the given media query matches (reactive, SSR-safe, hydration-safe).
 *
 * Le snapshot serveur vaut TOUJOURS `false`, et React réutilise ce même snapshot pour le
 * rendu d'hydratation avant de repasser sur `matchMedia` : serveur et premier rendu client
 * concordent donc par construction. C'est ce qui distingue ce hook d'une lecture du viewport
 * pendant le rendu (un initialiseur `useState` qui lit `window.innerWidth` ou `matchMedia`),
 * laquelle diverge dès le premier rendu client et fait jeter le sous-arbre par React.
 *
 * Corollaire à ne pas perdre de vue : la branche `false` est celle qui part dans le HTML
 * serveur. Pour un contenu qui doit être indexé, préférer un rendu des deux branches piloté
 * par CSS plutôt qu'un branchement JS.
 */
export const useMediaQuery = (query: string): boolean => {
	const { subscribe, getSnapshot } = storeFor(query);
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
