import Cta from "@shared/ui/Cta/Cta";
import type { MobileDownloadCtaProps } from "./MobileDownload.type";
import useMobileAppHref from "./useMobileAppHref";

export const MobileDownloadCta = ({
	mobileCtaHrefIos,
	mobileCtaHrefAndroid,
	href,
	className,
	label = "Je télécharge l'application",
}: MobileDownloadCtaProps) => {
	// Pas de `fallbackHref` : hors iOS / Android le CTA n'a pas de destination et disparaît.
	// Passer par le hook (et non par une lecture directe de `navigator`) garde le rendu
	// serveur et l'hydratation identiques.
	//
	// `href` fourni = l'appelant a déjà arbitré (cas d'`AppMobile`) : on le passe en repli sans
	// URL store, le hook le renvoie alors tel quel sans repasser par Bowser. Le hook reste
	// appelé inconditionnellement, règles des hooks obligent.
	const resolvedHref = useMobileAppHref(
		href
			? { fallbackHref: href }
			: { hrefIos: mobileCtaHrefIos, hrefAndroid: mobileCtaHrefAndroid },
	);

	if (!resolvedHref) {
		return null;
	}

	return (
		<Cta
			type="button"
			variant="accent"
			label={label}
			href={resolvedHref}
			iconLeft="download"
			props={{ target: "_blank", rel: "noopener noreferrer" }}
			className={className}
			ctaSection="mobile-download-cta"
		/>
	);
};

export default MobileDownloadCta;
