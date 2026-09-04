import { useId } from "react";
import clsx from "clsx";

import Image from "@shared/ui/Image";
import Title from "@shared/ui/Title";
import Subtitle from "@shared/ui/Subtitle/Subtitle";
import Cta from "@shared/ui/Cta/Cta";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import type { ImageHeroProps } from "@b2b/features/ImageHero/ImageHero.type";
import styles from "@b2b/features/ImageHero/ImageHero.module.css";

/** Gabarit du visuel dans la maquette — transmis à `<Image>` à défaut de dimensions. */
const SLOT_WIDTH = 1440;
const SLOT_HEIGHT = 741;

/**
 * Bandeau d'ouverture à visuel plein cadre du site vitrine B2B — maquette « Hero - CR »
 * (node 6025:16073) : une photo sur toute la largeur, un voile sombre, et au centre le
 * titre, l'accroche et un bouton. Le fil d'Ariane est posé en haut à gauche.
 *
 * **Tout est contribué dans Jahia** — titre, accroche, visuel, bouton, fil d'Ariane ; le
 * composant ne fabrique aucun contenu. Seul le titre est obligatoire : c'est lui qui
 * nomme la section (`aria-labelledby`).
 *
 * **La photo est décorative.** Elle est rendue `alt=""` + `aria-hidden`, en `eager` et
 * `fetchPriority="high"` : c'est l'élément LCP de la page, le charger paresseusement
 * retarderait le premier rendu utile. Le voile qui la couvre est un simple `<div>`
 * masqué aux technologies d'assistance — il n'a d'autre rôle que le contraste du texte.
 *
 * **Le fil d'Ariane force le thème `onDark`.** Le voile rend le bandeau sombre quel que
 * soit le visuel ; laisser le `theme` contribué s'appliquer produirait un texte navy
 * illisible sur photo. Son fond navy par défaut est neutralisé dans le module CSS.
 */
export function ImageHero({
	title,
	subtitle,
	titleAs = "h1",
	image,
	cta,
	breadcrumb,
	overlay = true,
	className,
}: ImageHeroProps) {
	const titleId = useId();

	const hasBreadcrumb = Boolean(breadcrumb && breadcrumb.items.length > 0);
	const hasCta = Boolean(cta?.label && cta.href);

	return (
		<section className={clsx(styles["image-hero"], className)} aria-labelledby={titleId}>
			<Image
				src={image.src}
				sources={image.sources}
				width={image.width ?? SLOT_WIDTH}
				height={image.height ?? SLOT_HEIGHT}
				decorative
				loading="eager"
				fetchPriority="high"
				draggable={false}
				className={styles["image-hero__img"]}
				pictureClassName={styles["image-hero__picture"]}
			/>

			{overlay && <div className={styles["image-hero__overlay"]} aria-hidden="true" />}

			{hasBreadcrumb && breadcrumb && (
				<Breadcrumb
					items={breadcrumb.items}
					theme="onDark"
					className={styles["image-hero__breadcrumb"]}
				/>
			)}

			<div className={styles["image-hero__content"]}>
				<div className={styles["image-hero__heading"]}>
					<Title as={titleAs} variant="white" id={titleId} className={styles["image-hero__title"]}>
						{title}
					</Title>
					{subtitle && (
						<Subtitle variant="white" className={styles["image-hero__subtitle"]}>
							{subtitle}
						</Subtitle>
					)}
				</div>

				{hasCta && cta && (
					<Cta
						variant="accent"
						size="medium"
						iconRight="arrow-forward"
						label={cta.label}
						href={cta.href}
						target={cta.target}
						onClick={cta.onClick}
						tracking={cta.tracking}
						ctaSection="image-hero"
					/>
				)}
			</div>
		</section>
	);
}

export default ImageHero;
