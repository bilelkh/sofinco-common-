import type { SectionCarteProps } from "sofinco-react";
import classes from "./sectionCarte.module.css";

/**
 * Aperçu compact du mode édition. Le rendu fidèle (fond ice, ratio 1:1,
 * pastilles capsule) est délégué au DS en live ; ici on privilégie la
 * lisibilité pour le contributeur avec des placeholders explicites.
 */
export function SectionCarteServer({
	title,
	subtitle,
	eyebrow,
	imageUrl,
	imageAlt,
	contentTitle,
	contentText,
	items,
	ctaLabel,
}: SectionCarteProps) {
	return (
		<section className={classes["section-carte-edit"]}>
			<header className={classes["section-carte-edit__header"]}>
				{eyebrow && <p className={classes["section-carte-edit__eyebrow"]}>{eyebrow}</p>}
				<p className={classes["section-carte-edit__title"]}>
					{title || <em>Section Carte — cliquez pour renseigner le titre</em>}
				</p>
				{subtitle && <p className={classes["section-carte-edit__subtitle"]}>{subtitle}</p>}
			</header>

			<div className={classes["section-carte-edit__grid"]}>
				<div className={classes["section-carte-edit__media"]}>
					{imageUrl ? (
						<img src={imageUrl} alt={imageAlt} className={classes["section-carte-edit__image"]} />
					) : (
						<p className={classes["section-carte-edit__image-placeholder"]}>
							<em>Sélectionnez une photo</em>
						</p>
					)}
				</div>

				<div className={classes["section-carte-edit__content"]}>
					<p className={classes["section-carte-edit__content-title"]}>
						{contentTitle || <em>Titre du bloc de contenu</em>}
					</p>
					<p className={classes["section-carte-edit__content-text"]}>
						{contentText || <em>Texte du bloc de contenu</em>}
					</p>

					{items.length > 0 && (
						<ul className={classes["section-carte-edit__list"]}>
							{items.map((item) => (
								<li key={item.id} className={classes["section-carte-edit__list-item"]}>
									{item.label}
								</li>
							))}
						</ul>
					)}

					<p className={classes["section-carte-edit__cta"]}>{ctaLabel || <em>CTA</em>}</p>
				</div>
			</div>
		</section>
	);
}
