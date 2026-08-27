import type { QrMobileProps } from "sofinco-react";
import classes from "./views/qr.module.css";
import { Cta, pickMobileAppHref } from "sofinco-react";

export default function MobileAppBtn(props: QrMobileProps) {
	const handleAppClick = () => {
		// Résolution dans le handler (donc côté client, après hydratation) : aucun risque de
		// mismatch. `pickMobileAppHref` est la détection iOS / Android partagée du DS.
		const win = window as Window & { opera?: string };
		const userAgent = navigator.userAgent || navigator.vendor || win.opera || "";

		const href = pickMobileAppHref(userAgent, {
			hrefIos: props.iosUrl,
			hrefAndroid: props.androidUrl,
			fallbackHref: props.fallbackUrl,
		});

		// Aucune destination contribuée : on ne fait rien. Assigner "" à `location.href`
		// rechargerait la page courante, sans le moindre retour pour le visiteur.
		if (href) window.location.href = href;
	};

	return (
		<Cta
			onClick={handleAppClick}
			className={classes.mobileAppBtn}
			ariaLabel={props.ctaLabelHeader}
			label={props.ctaLabelHeader}
			variant="app-badge"
			iconLeft="download"
			type="button"
			ctaSection="mobile-app-cta"
		/>
	);
}
