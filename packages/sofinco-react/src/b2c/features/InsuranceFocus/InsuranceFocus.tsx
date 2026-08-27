import { useId } from "react";
import clsx from "clsx";
import type { InsuranceFocusProps } from "./InsuranceFocus.type";
import Title from "@shared/ui/Title";
import Cta from "@shared/ui/Cta/Cta";
import Image from "@shared/ui/Image";
import styles from "./InsuranceFocus.module.css";
import { FootnoteText } from "@shared/footnotes";

/**
 * `<InsuranceFocus>` — "insurance focus" promo block: navy card on a sky
 * background, with title + description + CTA on the left and image on the
 * right (desktop), stacked on mobile.
 */
export function InsuranceFocus({
	title,
	description,
	imageSrc,
	imageAlt = "",
	cta,
	className,
}: InsuranceFocusProps) {
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} className={clsx(styles["insurance-focus"], className)}>
			<div className={styles["insurance-focus__card"]}>
				<div className={styles["insurance-focus__content"]}>
					<Title
						id={headingId}
						as={title.as ?? "h2"}
						visualStyle={title.visualStyle ?? "h2"}
						variant="white"
					>
						{title.children}
					</Title>

					<p className={styles["insurance-focus__description"]}>
						<FootnoteText>{description}</FootnoteText>
					</p>

					<Cta
						{...cta}
						variant="accent"
						size="large"
						ctaSection="insurance-focus"
						className={styles["insurance-focus__cta"]}
					/>
				</div>

				{imageSrc && (
					<div className={styles["insurance-focus__media"]}>
						<Image
							src={imageSrc}
							alt={imageAlt}
							width={494}
							height={282}
							className={styles["insurance-focus__image"]}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
