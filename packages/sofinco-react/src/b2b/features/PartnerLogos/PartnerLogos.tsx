import { useId, type CSSProperties } from "react";
import clsx from "clsx";

import Image from "@shared/ui/Image";
import Title from "@shared/ui/Title";
import type {
	PartnerLogoItem,
	PartnerLogosProps,
} from "@b2b/features/PartnerLogos/PartnerLogos.type";
import styles from "@b2b/features/PartnerLogos/PartnerLogos.module.css";

/** Durée, en secondes, qu'un logo met à traverser la bande. */
const SECONDS_PER_LOGO = 4;

/**
 * Bande de logos partenaires du site vitrine B2B : un titre, puis un défilement
 * continu des enseignes qui financent avec Sofinco.
 *
 * **Pourquoi une bande qui défile, alors que la maquette est une image fixe.** La
 * rangée Figma est plus large que le cadre qui la contient (1507 px pour 1440), elle
 * est rognée à droite, et deux logos y apparaissent deux fois (Printemps, Fnac).
 * C'est la façon habituelle de figurer un ruban infini sur une planche statique : une
 * rangée réellement fixe qui déborde serait un défaut de gabarit, pas une intention.
 *
 * **Le défilement tient en deux listes identiques**, chacune animée de `0` à `-100 %`
 * de sa propre largeur. Quand la première sort par la gauche, la seconde a pris sa
 * place au pixel près, et le retour à zéro est invisible. `min-width: 100%` sur chaque
 * liste garantit qu'elle couvre au moins le viewport : sans cela, une contribution de
 * deux ou trois logos laisserait un trou à droite à mi-cycle. Le contenu étant
 * dupliqué, le clone est retiré de l'arbre d'accessibilité (`aria-hidden`).
 *
 * **Le mouvement est interruptible** (WCAG 2.2.2) : il se met en pause au survol et
 * dès qu'un élément de la bande prend le focus, et `prefers-reduced-motion` le coupe
 * entièrement au profit d'un défilement horizontal manuel. Ces trois bascules sont en
 * CSS, jamais en JS : le rendu SSR d'une Island Jahia ne connaît ni le pointeur, ni
 * les préférences système, et une correction après hydratation ferait sauter la page.
 *
 * Sans logo, la section n'est pas rendue : le titre seul laisserait un fond de section
 * orphelin, et une bande de preuve sans preuve n'a rien à montrer.
 */
export function PartnerLogos({
	title,
	logos,
	animated = true,
	ariaLabel,
	className,
}: PartnerLogosProps) {
	const titleId = useId();

	if (!logos.length) return null;

	/* Vitesse constante quel que soit le nombre d'enseignes : la durée d'un tour est
	   proportionnelle au nombre de logos, sinon une bande de vingt logos filerait cinq
	   fois plus vite qu'une bande de quatre. */
	const style = {
		"--partner-logos-duration": `${logos.length * SECONDS_PER_LOGO}s`,
	} as CSSProperties;

	const list = (clone: boolean) => (
		<ul
			className={styles["partner-logos__list"]}
			/* Le clone n'existe que pour boucler sans couture : le lire reviendrait à
			   énumérer deux fois les mêmes enseignes. */
			aria-hidden={clone || undefined}
		>
			{logos.map((logo) => (
				<li key={logo.id} className={styles["partner-logos__item"]}>
					<PartnerLogo logo={logo} decorative={clone} />
				</li>
			))}
		</ul>
	);

	return (
		<section
			className={clsx(styles["partner-logos"], className)}
			style={style}
			aria-labelledby={title ? titleId : undefined}
			aria-label={title ? undefined : ariaLabel}
		>
			{title && (
				<div className={styles["partner-logos__header"]}>
					<Title
						as="h2"
						/* `visualStyle="none"` : le cran de la maquette (32 / 40) n'existe pas
						   dans l'échelle du DS, la typographie est posée par le module CSS. */
						visualStyle="none"
						id={titleId}
						className={styles["partner-logos__title"]}
					>
						{title}
					</Title>
				</div>
			)}

			<div
				className={clsx(
					styles["partner-logos__marquee"],
					!animated && styles["partner-logos__marquee--static"],
				)}
			>
				{list(false)}
				{animated && list(true)}
			</div>
		</section>
	);
}

/**
 * Le logo lui-même. `decorative` couvre deux cas distincts : le clone du ruban, dont
 * le contenu est déjà annoncé par la liste source, et l'enseigne contribuée sans nom.
 */
function PartnerLogo({ logo, decorative }: { logo: PartnerLogoItem; decorative: boolean }) {
	const className = styles["partner-logos__logo"];
	const shared = {
		src: logo.src,
		width: logo.width,
		height: logo.height,
		className,
	};

	return decorative || !logo.alt ? (
		<Image {...shared} decorative />
	) : (
		<Image {...shared} alt={logo.alt} />
	);
}

export default PartnerLogos;
