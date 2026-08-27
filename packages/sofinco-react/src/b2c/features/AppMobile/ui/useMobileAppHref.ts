import { useCallback, useSyncExternalStore } from "react";
import { pickMobileAppHref, type MobileAppHrefUrls } from "./mobileAppHref";

/** Store immuable : l'OS ne change pas en cours de session, il n'y a donc rien à écouter. */
const subscribe = () => () => {};

/**
 * Renvoie l'URL de téléchargement de l'app adaptée à l'OS du visiteur, avec repli sur
 * `fallbackHref`.
 *
 * SSR-safe par construction : `useSyncExternalStore` rend le snapshot SERVEUR
 * (`fallbackHref`) au SSR **et** à l'hydratation, puis bascule sur le snapshot client dans
 * un second rendu. Lire `navigator` pendant le rendu initial produirait un mismatch
 * d'hydratation (React #418).
 */
export default function useMobileAppHref({
	hrefIos,
	hrefAndroid,
	fallbackHref,
}: MobileAppHrefUrls): string | undefined {
	const getClientSnapshot = useCallback(() => {
		// Rien à arbitrer sans URL store : on évite le parse Bowser. C'est ce qui permet à un
		// appelant tenant déjà le href résolu de traverser le hook sans surcoût.
		if (typeof navigator === "undefined" || (!hrefIos && !hrefAndroid)) {
			return fallbackHref;
		}
		return pickMobileAppHref(navigator.userAgent || "", { hrefIos, hrefAndroid, fallbackHref });
	}, [hrefIos, hrefAndroid, fallbackHref]);

	const getServerSnapshot = useCallback(() => fallbackHref, [fallbackHref]);

	return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
