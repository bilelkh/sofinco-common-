import { useId } from "react";
import clsx from "clsx";

import Title from "@shared/ui/Title/Title";
import Subtitle from "@shared/ui/Subtitle/Subtitle";

import type { FormHeroProps } from "@b2b/features/FormHero/formHero.types";
import styles from "@b2b/features/FormHero/formHero.module.css";

/**
 * Bandeau d'ouverture des pages formulaire B2B — maquette « Form Page »
 * (desktop node 3680:6202, mobile node 3689:9635 pour la carte chevauchante).
 *
 * Titre et accroche viennent de Jahia ; le composant ne fabrique aucun contenu.
 * Le `children` optionnel est rendu à cheval sur le bas du bandeau navy, exactement
 * comme la maquette place la carte de formulaire — d'où le `margin-top` négatif,
 * compensé par un rembourrage bas du bandeau de même ordre : c'est la seule façon
 * d'obtenir le chevauchement sans sortir la carte du flux, et donc sans figer sa
 * hauteur.
 */
export const FormHero = ({
	title,
	subtitle,
	titleAs = "h1",
	children,
	className,
}: FormHeroProps) => {
	const headingId = useId();

	return (
		<section className={clsx(styles["form-hero"], className)} aria-labelledby={headingId}>
			<div className={styles["form-hero__band"]}>
				<div className={styles["form-hero__heading"]}>
					<Title
						as={titleAs}
						variant="white"
						id={headingId}
						className={styles["form-hero__title"]}
					>
						{title}
					</Title>
					{subtitle && (
						<Subtitle variant="white" className={styles["form-hero__subtitle"]}>
							{subtitle}
						</Subtitle>
					)}
				</div>
			</div>

			{children && <div className={styles["form-hero__slot"]}>{children}</div>}
		</section>
	);
};

export default FormHero;
