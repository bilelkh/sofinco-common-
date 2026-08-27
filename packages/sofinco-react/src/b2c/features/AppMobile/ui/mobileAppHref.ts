import Bowser from "bowser";

export interface MobileAppHrefUrls {
	/** URL App Store, retenue sur iPhone / iPad. */
	hrefIos?: string;
	/** URL Play Store, retenue sur Android. */
	hrefAndroid?: string;
	/** URL servie quand l'OS n'est ni iOS ni Android, ou qu'aucune URL store ne correspond. */
	fallbackHref?: string;
}

/**
 * Résout l'URL de téléchargement adaptée à un user-agent donné.
 *
 * Fonction PURE (le user-agent est passé en argument, jamais lu depuis `navigator`) : c'est
 * la seule implémentation de la détection iOS / Android du design system — les consommateurs
 * (`useMobileAppHref`, les handlers de clic côté client) se contentent de lui fournir le
 * user-agent.
 */
export function pickMobileAppHref(
	userAgent: string,
	{ hrefIos, hrefAndroid, fallbackHref }: MobileAppHrefUrls,
): string | undefined {
	// `Bowser.getParser("")` LÈVE ("UserAgent parameter can't be empty") : sans user-agent on
	// ne peut rien arbitrer, on sert le repli.
	if (!userAgent) {
		return fallbackHref;
	}

	const parser = Bowser.getParser(userAgent);
	const platformType = parser.getPlatformType();
	const osName = parser.getOSName(true);
	const isAndroid = osName === "android";
	// iPadOS se déclare en desktop Safari : on rattrape le cas via le type de plateforme.
	const isIOS = osName === "ios" || (platformType === "tablet" && /ipad/i.test(userAgent));

	if (isAndroid && hrefAndroid) {
		return hrefAndroid;
	}

	if (isIOS && hrefIos) {
		return hrefIos;
	}

	return fallbackHref;
}
