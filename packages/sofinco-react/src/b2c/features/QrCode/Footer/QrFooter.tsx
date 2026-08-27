import type { QrProps } from "../QrCode.type";
import classes from "./qr.module.css";
import useMobileAppHref from "@b2c/features/AppMobile/ui/useMobileAppHref";
import Cta from "@shared/ui/Cta/Cta";
import QrCode, { hasQrThumbnail } from "../QrCode";

export function QrFooter(props: Readonly<QrProps>) {
	// Sous le seuil `--qr-code-up` le QR code est remplacé par un CTA : la destination doit alors
	// suivre l'OS du visiteur. Hors iOS / Android (desktop étroit), on sert la page de
	// téléchargement — une URL store est un cul-de-sac sur desktop. Repli ultime sur n'importe
	// quelle URL store si aucun `fallbackNode` n'est contribué : mieux vaut une destination
	// imparfaite qu'un CTA sans href.
	const downloadHref = useMobileAppHref({
		hrefIos: props?.iosUrl,
		hrefAndroid: props?.androidUrl,
		fallbackHref: props?.fallbackUrl || props?.iosUrl || props?.androidUrl,
	});

	// Les DEUX branches partent dans le HTML, et le média CSS n'en laisse qu'une visible.
	// Un ternaire piloté par `useMediaQuery` serait figé sur l'instantané serveur (`false`)
	// dans ce sous-arbre non hydraté : le CTA serait alors la seule chose jamais servie,
	// quelle que soit la largeur de l'écran.
	//
	// La classe de masquage n'est posée que s'il y a une vignette à révéler à sa place :
	// sans `src`, `QrCode` ne rend rien et le CTA doit rester visible partout.
	return (
		<>
			<QrCode {...props} />
			<Cta
				className={hasQrThumbnail(props.src) ? classes["qr-footer__cta"] : undefined}
				href={downloadHref}
				type="button"
				variant="accent"
				size="small"
				label={props.ctaLabelFooter || "Télécharger l'application"}
				iconLeft="download"
				ctaSection="qr-code-download-cta"
			/>
		</>
	);
}
