import clsx from "clsx";
import type { QrCodeProps } from "./QrCode.type";
import styles from "./QrCode.module.css";
import Image from "@shared/ui/Image";
import { FootnoteText } from "@shared/footnotes";

/**
 * Vrai quand `QrCode` rendra effectivement une vignette.
 *
 * Sans image contribuée il n'y a pas de vignette à afficher : rendre le <figure> quand même
 * émettrait un <img src=""> — que les navigateurs résolvent en rechargement de la page.
 *
 * Les consommateurs qui se positionnent PAR RAPPORT à cette vignette (masquer un repli,
 * réserver la colonne) doivent passer par ce prédicat plutôt que retester `src` eux-mêmes :
 * la règle est un invariant unique, et deux expressions divergentes donneraient une zone où
 * ni la vignette ni son repli ne s'affichent.
 */
export const hasQrThumbnail = (src?: string): boolean => typeof src === "string" && src !== "";

/*
 * La bascule « vignette au-dessus du seuil / rien en dessous » est portée par le CSS
 * (`.qr-code` + `--qr-code-up`), PAS par une lecture du viewport en JS.
 *
 * Ce composant est rendu dans des sous-arbres purement serveur (le footer Jahia n'est pas
 * hydraté) : un `useMediaQuery` y resterait bloqué sur son instantané serveur — `false` — et
 * la vignette ne partirait jamais dans le HTML. Le média CSS, lui, s'évalue chez le visiteur
 * quelle que soit la quantité de JS exécutée, et laisse le QR indexable.
 */
const QrCode = ({ src, text, className, alwaysVisible }: QrCodeProps) => {
	if (!hasQrThumbnail(src)) return null;

	return (
		<figure
			className={clsx(styles["qr-code"], alwaysVisible && styles["qr-code--always"], className)}
		>
			<Image src={src} decorative width={104} height={105} />
			<figcaption>
				<FootnoteText>{text}</FootnoteText>
			</figcaption>
		</figure>
	);
};

export default QrCode;
