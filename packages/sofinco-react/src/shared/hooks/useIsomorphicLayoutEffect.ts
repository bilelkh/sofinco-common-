import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` côté navigateur, `useEffect` côté serveur.
 *
 * React avertit (« useLayoutEffect does nothing on the server ») dès qu'un
 * `useLayoutEffect` est atteint pendant un rendu serveur — ce qui arrive ici en mode édition
 * Jahia comme à la préparation d'un Island. Le repli est sans conséquence : l'effet ne
 * s'exécute de toute façon que côté client.
 *
 * Le choix se fait UNE FOIS au chargement du module, pas à chaque rendu : alterner entre les
 * deux hooks d'un rendu à l'autre changerait l'ordre des hooks.
 */
export const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;
